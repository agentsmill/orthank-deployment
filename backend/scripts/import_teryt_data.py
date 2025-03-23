#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import csv
import json
import requests
import sqlite3
from datetime import datetime
import logging

# Konfiguracja logowania
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('teryt_importer')

# Ścieżki plików
DB_PATH = os.environ.get('DB_PATH', '/app/data/municipalities.db')
DATA_DIR = os.environ.get('DATA_DIR', '/app/data')
TERYT_URL = "https://eteryt.stat.gov.pl/eTeryt/rejestr_teryt/udostepnianie_danych/baza_teryt/uzytkownicy_indywidualni/pobieranie/pliki_pelne.aspx"

def ensure_data_dir():
    """Upewnia się, że katalog danych istnieje"""
    os.makedirs(DATA_DIR, exist_ok=True)
    logger.info(f"Utworzono katalog danych: {DATA_DIR}")

def download_teryt_data():
    """Pobiera najnowsze dane TERYT z GUS (symulacja, w rzeczywistości trzeba by obsłużyć formularze)"""
    # W rzeczywistej implementacji należy pobrać dane z GUS TERYT API lub ich strony
    
    # Symulacja pobrania danych - w prawdziwym scenariuszu użyj requests lub Selenium
    logger.info("Pobieranie danych TERYT z GUS...")
    
    # Dla przykładu, tworzymy własny plik CSV z danymi
    sample_data = [
        ["WOJ", "POW", "GMI", "RODZ", "NAZWA", "NAZDOD", "STAN_NA"],
        ["02", "01", "01", "1", "Bolesławiec", "miasto", "2025-01-01"],
        ["02", "01", "02", "2", "Bolesławiec", "gmina wiejska", "2025-01-01"],
        ["02", "01", "03", "2", "Gromadka", "gmina wiejska", "2025-01-01"],
        ["02", "01", "04", "2", "Nowogrodziec", "miasto-gmina", "2025-01-01"],
        ["02", "01", "05", "2", "Osiecznica", "gmina wiejska", "2025-01-01"],
        ["02", "01", "06", "2", "Warta Bolesławiecka", "gmina wiejska", "2025-01-01"],
        ["12", "01", "01", "1", "Kraków", "miasto", "2025-01-01"],
        ["14", "01", "01", "1", "Warszawa", "miasto", "2025-01-01"],
        ["24", "15", "01", "1", "Katowice", "miasto", "2025-01-01"],
        ["30", "01", "01", "1", "Gdańsk", "miasto", "2025-01-01"],
    ]
    
    csv_path = os.path.join(DATA_DIR, 'teryt_sample.csv')
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        for row in sample_data:
            writer.writerow(row)
    
    logger.info(f"Zapisano przykładowe dane TERYT do: {csv_path}")
    return csv_path

def create_database():
    """Tworzy bazę danych SQLite z tabelą municipalities"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Tworzenie tabeli gmin
    c.execute('''
    CREATE TABLE IF NOT EXISTS municipalities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teryt_code TEXT UNIQUE,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        voivodeship_code TEXT NOT NULL,
        voivodeship_name TEXT NOT NULL,
        county_code TEXT NOT NULL,
        county_name TEXT,
        lat REAL,
        lng REAL,
        population INTEGER,
        area REAL,
        bip_url TEXT,
        official_website TEXT,
        created_at TEXT,
        updated_at TEXT
    )
    ''')
    
    # Tworzymy tabelę dla typów gmin
    c.execute('''
    CREATE TABLE IF NOT EXISTS municipality_types (
        id INTEGER PRIMARY KEY,
        code TEXT UNIQUE,
        name TEXT NOT NULL
    )
    ''')
    
    # Wstawiamy standardowe typy gmin
    municipality_types = [
        (1, '1', 'gmina miejska'),
        (2, '2', 'gmina wiejska'),
        (3, '3', 'gmina miejsko-wiejska'),
        (4, '4', 'miasto na prawach powiatu')
    ]
    
    c.executemany('INSERT OR REPLACE INTO municipality_types (id, code, name) VALUES (?, ?, ?)', 
                 municipality_types)
    
    conn.commit()
    conn.close()
    
    logger.info(f"Utworzono bazę danych: {DB_PATH}")

def map_voivodeship_code(code):
    """Mapuje kod województwa na pełną nazwę"""
    voivodeships = {
        '02': 'dolnośląskie',
        '04': 'kujawsko-pomorskie',
        '06': 'lubelskie',
        '08': 'lubuskie',
        '10': 'łódzkie',
        '12': 'małopolskie',
        '14': 'mazowieckie',
        '16': 'opolskie',
        '18': 'podkarpackie',
        '20': 'podlaskie',
        '22': 'pomorskie',
        '24': 'śląskie',
        '26': 'świętokrzyskie',
        '28': 'warmińsko-mazurskie',
        '30': 'wielkopolskie',
        '32': 'zachodniopomorskie'
    }
    return voivodeships.get(code, 'nieznane')

def import_teryt_data(csv_path):
    """Importuje dane z pliku CSV TERYT do bazy danych"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    now = datetime.now().isoformat()
    count = 0
    
    # Pobieranie danych powiatów (w prawdziwym przypadku pobralibyśmy też dane powiatów)
    county_names = {
        '0201': 'bolesławiecki',
        '1201': 'krakowski',
        '1401': 'warszawski',
        '2415': 'katowicki',
        '3001': 'gdański'
    }
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader)  # Pomijamy nagłówek
        
        for row in reader:
            woj_code = row[0]
            pow_code = row[1]
            gmi_code = row[2]
            rodz_code = row[3]
            name = row[4]
            type_suffix = row[5]
            
            # Tworzenie kodu TERYT
            teryt_code = f"{woj_code}{pow_code}{gmi_code}{rodz_code}"
            
            # Ustalanie typu gminy
            if rodz_code == '1':
                municipality_type = 'gmina miejska'
            elif rodz_code == '2' and 'miasto-gmina' in type_suffix:
                municipality_type = 'gmina miejsko-wiejska'
            elif rodz_code == '2':
                municipality_type = 'gmina wiejska'
            elif rodz_code == '3':
                municipality_type = 'gmina miejsko-wiejska'
            elif rodz_code == '4':
                municipality_type = 'miasto na prawach powiatu'
            else:
                municipality_type = 'nieznany'
            
            # Pobieranie nazwy województwa
            voivodeship_name = map_voivodeship_code(woj_code)
            
            # Pobieranie nazwy powiatu
            county_code = f"{woj_code}{pow_code}"
            county_name = county_names.get(county_code, '')
            
            # Generowanie przykładowego URL BIP (w rzeczywistym przypadku trzeba pobrać prawdziwe adresy)
            bip_url = f"https://bip.{name.lower().replace(' ', '')}.pl"
            
            # Wstawianie danych do bazy
            c.execute('''
            INSERT OR REPLACE INTO municipalities 
            (teryt_code, name, type, voivodeship_code, voivodeship_name, county_code, county_name, 
             bip_url, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                teryt_code, name, municipality_type, woj_code, voivodeship_name, county_code, 
                county_name, bip_url, now, now
            ))
            
            count += 1
    
    conn.commit()
    conn.close()
    
    logger.info(f"Zaimportowano {count} rekordów gmin do bazy danych")

def get_geolocation_data():
    """
    W rzeczywistej implementacji pobralibyśmy dane geolokalizacyjne gmin
    np. z API GUGiK lub Geoportal.gov.pl
    """
    logger.info("Aktualizacja danych geolokalizacyjnych - symulacja")
    
    # W rzeczywistej implementacji należy pobrać dane z API
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Przykładowe dane geolokalizacyjne dla kilku miast
    geo_data = [
        ('0201011', 51.2639, 15.5670),  # Bolesławiec
        ('1201011', 50.0614, 19.9366),  # Kraków
        ('1401011', 52.2297, 21.0122),  # Warszawa
        ('2415011', 50.2649, 19.0238),  # Katowice
        ('3001011', 54.3520, 18.6466),  # Gdańsk
    ]
    
    for teryt, lat, lng in geo_data:
        c.execute('''
        UPDATE municipalities SET lat = ?, lng = ? WHERE teryt_code = ?
        ''', (lat, lng, teryt))
    
    conn.commit()
    conn.close()
    
    logger.info("Zaktualizowano dane geolokalizacyjne")

def export_to_json():
    """Eksportuje dane z bazy do pliku JSON"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    # Pobieranie wszystkich gmin
    c.execute('SELECT * FROM municipalities')
    rows = c.fetchall()
    
    # Konwersja do słowników
    municipalities = []
    for row in rows:
        municipality = {key: row[key] for key in row.keys()}
        municipalities.append(municipality)
    
    # Zapisywanie do pliku JSON
    json_path = os.path.join(DATA_DIR, 'municipalities.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(municipalities, f, ensure_ascii=False, indent=2)
    
    conn.close()
    
    logger.info(f"Wyeksportowano dane do JSON: {json_path}")
    logger.info(f"Łącznie wyeksportowano {len(municipalities)} rekordów gmin")

def main():
    """Główna funkcja importująca dane"""
    logger.info("Rozpoczęcie importu danych TERYT")
    
    # Upewniamy się, że katalog danych istnieje
    ensure_data_dir()
    
    # Pobieramy dane TERYT
    csv_path = download_teryt_data()
    
    # Tworzymy bazę danych
    create_database()
    
    # Importujemy dane TERYT
    import_teryt_data(csv_path)
    
    # Aktualizujemy dane geolokalizacyjne
    get_geolocation_data()
    
    # Eksportujemy dane do JSON
    export_to_json()
    
    logger.info("Import danych TERYT zakończony pomyślnie")

if __name__ == "__main__":
    main()