from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.extensions import db

class Research(db.Model):
    """Model reprezentujący badanie regionu"""
    __tablename__ = 'researches'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(String(100), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False, default='queued')  # queued, running, completed, failed, stopped
    progress = Column(Integer, default=0)  # Procent ukończenia (0-100)
    current_step = Column(String(255))
    error_message = Column(Text)
    region_name = Column(String(100), nullable=False)
    region_id = Column(String(100), nullable=False)
    
    # Parametry badania
    breadth = Column(Integer, default=4)
    depth = Column(Integer, default=2)
    config = Column(JSON)
    
    # Relacje
    municipality_id = Column(Integer, ForeignKey('municipalities.id'))
    municipality = relationship('Municipality', back_populates='researches')
    reports = relationship('ResearchReport', back_populates='research', cascade='all, delete-orphan')
    
    # Śledzenie czasu
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<Research {self.task_id} ({self.status})>"
    
    @property
    def duration(self):
        """Zwraca czas trwania badania w sekundach"""
        if not self.start_time:
            return 0
        
        end = self.end_time or func.now()
        return (end - self.start_time).total_seconds()
    
    def to_dict(self):
        """Konwertuje obiekt do słownika"""
        return {
            'id': self.id,
            'task_id': self.task_id,
            'title': self.title,
            'status': self.status,
            'progress': self.progress,
            'current_step': self.current_step,
            'error_message': self.error_message,
            'region_name': self.region_name,
            'region_id': self.region_id,
            'breadth': self.breadth,
            'depth': self.depth,
            'config': self.config,
            'municipality_id': self.municipality_id,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'duration': self.duration
        }

class ResearchReport(db.Model):
    """Model reprezentujący raport badania"""
    __tablename__ = 'research_reports'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    research_id = Column(Integer, ForeignKey('researches.id'), nullable=False)
    type = Column(String(50), nullable=False)  # 'markdown', 'pdf', 'excel', etc.
    title = Column(String(255), nullable=False)
    content = Column(Text)
    file_path = Column(String(255))
    
    # Relacje
    research = relationship('Research', back_populates='reports')
    
    # Śledzenie czasu
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<ResearchReport {self.id} ({self.type})>"
    
    def to_dict(self):
        """Konwertuje obiekt do słownika"""
        return {
            'id': self.id,
            'research_id': self.research_id,
            'type': self.type,
            'title': self.title,
            'content': self.content if self.type == 'markdown' else None,
            'file_path': self.file_path,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }