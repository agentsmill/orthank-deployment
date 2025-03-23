from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.extensions import db

class Municipality(db.Model):
    """Model reprezentujący gminę"""
    __tablename__ = 'municipalities'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    teryt_code = Column(String(10), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False)
    voivodeship_code = Column(String(2), nullable=False)
    voivodeship_name = Column(String(50), nullable=False)
    county_code = Column(String(4), nullable=False)
    county_name = Column(String(50))
    lat = Column(Float)
    lng = Column(Float)
    population = Column(Integer)
    area = Column(Float)
    bip_url = Column(String(255))
    official_website = Column(String(255))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relacje
    researches = relationship('Research', back_populates='municipality')
    projects = relationship('EnergyProject', back_populates='municipality')
    
    def __repr__(self):
        return f"<Municipality {self.name} ({self.teryt_code})>"
    
    @classmethod
    def get_by_teryt(cls, teryt_code):
        """Pobiera gminę na podstawie kodu TERYT"""
        return cls.query.filter_by(teryt_code=teryt_code).first()
    
    @classmethod
    def get_by_name(cls, name):
        """Pobiera gminę na podstawie nazwy"""
        return cls.query.filter(cls.name.ilike(f"%{name}%")).all()
    
    @classmethod
    def search(cls, query, limit=20):
        """Wyszukuje gminy według zapytania"""
        return cls.query.filter(
            (cls.name.ilike(f"%{query}%")) |
            (cls.teryt_code.ilike(f"%{query}%")) |
            (cls.county_name.ilike(f"%{query}%")) |
            (cls.voivodeship_name.ilike(f"%{query}%"))
        ).limit(limit).all()
    
    @property
    def coordinates(self):
        """Zwraca współrzędne jako tuple (lat, lng)"""
        if self.lat and self.lng:
            return (self.lat, self.lng)
        return None
    
    def to_dict(self):
        """Konwertuje obiekt do słownika"""
        return {
            'id': self.id,
            'teryt_code': self.teryt_code,
            'name': self.name,
            'type': self.type,
            'voivodeship_code': self.voivodeship_code,
            'voivodeship_name': self.voivodeship_name,
            'county_code': self.county_code,
            'county_name': self.county_name,
            'lat': self.lat,
            'lng': self.lng,
            'population': self.population,
            'area': self.area,
            'bip_url': self.bip_url,
            'official_website': self.official_website
        }

# Model typów gmin
class MunicipalityType(db.Model):
    """Model typów gmin"""
    __tablename__ = 'municipality_types'
    
    id = Column(Integer, primary_key=True)
    code = Column(String(5), unique=True, nullable=False)
    name = Column(String(50), nullable=False)
    
    def __repr__(self):
        return f"<MunicipalityType {self.name} ({self.code})>"