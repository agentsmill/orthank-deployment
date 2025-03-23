# Orthank - System badania regionów Polski z wykorzystaniem AI

Orthank to kompleksowy system do dogłębnego badania regionów Polski z wykorzystaniem sztucznej inteligencji oraz przetwarzania dokumentów. System przetwarza dane na temat gmin i regionów, przeprowadza badania internetowe i generuje szczegółowe raporty dzięki wykorzystaniu lokalnego modelu AI (Ollama gemma3:4b).

## Główne funkcje

- **Baza danych polskich gmin** - komponentny system zawiera pełną bazę wszystkich gmin w Polsce, wraz z kodami TERYT i dodatkowymi informacjami
- **Deep Research** - przeprowadzanie dogłębnego badania regionów z wykorzystaniem modelu AI gemma3:4b
- **Document Processor** - przetwarzanie i analiza dokumentów związanych z regionami
- **Interaktywny interfejs użytkownika** - intuicyjny panel administracyjny do zarządzania badaniami i przeglądania wyników

## Architektura systemu

System składa się z następujących komponentów:

1. **Backend (Flask)** - API RESTful do obsługi danych i zarządzania badaniami
2. **Document Processor** - serwis do przetwarzania dokumentów i przeprowadzania badań 
3. **Frontend (React)** - interfejs użytkownika
4. **Ollama** - lokalny model AI do zadań wymagających przetwarzania języka naturalnego

## Wymagania

- Docker i Docker Compose
- Minimum 8GB RAM 
- 20GB wolnego miejsca na dysku
- Dostęp do internetu dla funkcji wyszukiwania

## Instalacja

1. Sklonuj repozytorium:
   ```bash
   git clone https://github.com/agentsmill/orthank-deployment.git
   cd orthank-deployment
   ```

2. Uruchom system za pomocą Docker Compose:
   ```bash
   docker-compose up -d
   ```

3. Pobierz model gemma3:4b do Ollama:
   ```bash
   docker exec -it ollama ollama pull gemma3:4b
   ```

4. System będzie dostępny pod adresem:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Korzystanie z systemu

### Przeprowadzanie badania regionu

1. W interfejsie webowym przejdź do zakładki "Badania"
2. Kliknij przycisk "Nowe badanie"
3. Wybierz gminę z bazy danych lub wprowadź własną nazwę regionu
4. Dostosuj parametry badania (szerokość i głębokość)
5. Kliknij "Rozpocznij badanie"
6. Monitoruj postęp badania w czasie rzeczywistym
7. Po zakończeniu badania przeglądaj wygenerowany raport

### Przeglądanie wyników

1. Przejdź do zakładki "Badania"
2. Wybierz badanie z listy, aby zobaczyć szczegóły
3. Przeglądaj raport i analizę regionu

## Struktura repozytorium

- `backend/` - kod backendu Flask
- `document_processor/` - kod serwisu do przetwarzania dokumentów
- `frontend/` - kod frontendu React
- `data/` - katalog na dane (baza danych, pliki, etc.)
- `docker-compose.yml` - konfiguracja Docker Compose
- `README.md` - dokumentacja

## Baza danych gmin

System zawiera kompletną bazę danych wszystkich 2479 gmin w Polsce, z następującymi informacjami:

- Kody TERYT (identyfikatory z rejestru TERYT)
- Nazwy gmin
- Typy gmin (miejska, wiejska, miejsko-wiejska, miasto na prawach powiatu)
- Przynależność do województw i powiatów
- Dane demograficzne i geograficzne
- Adresy stron BIP

Dane są importowane do bazy danych podczas inicjalizacji systemu.

## Licencja

Ten projekt jest udostępniany na licencji MIT. Szczegóły znajdują się w pliku LICENSE.