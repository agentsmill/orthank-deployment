from flask import Blueprint, jsonify, request, current_app, send_file
from app.models.research import Research, ResearchReport
from app.models.municipality import Municipality
from app.extensions import db
from datetime import datetime
import os
import json
import uuid
import requests

bp = Blueprint('research', __name__, url_prefix='/api/research')

@bp.route('/', methods=['GET'])
def get_all_research():
    """Pobieranie listy wszystkich badań z możliwością filtrowania"""
    # Parametry filtrowania
    status = request.args.get('status')
    region_name = request.args.get('region_name')
    municipality_id = request.args.get('municipality_id')
    
    # Parametry paginacji
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    
    # Przygotowanie zapytania
    query = Research.query
    
    # Filtrowanie
    if status:
        query = query.filter(Research.status == status)
    if region_name:
        query = query.filter(Research.region_name.ilike(f'%{region_name}%'))
    if municipality_id:
        query = query.filter(Research.municipality_id == municipality_id)
    
    # Sortowanie - od najnowszych
    query = query.order_by(Research.created_at.desc())
    
    # Paginacja
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    
    # Przygotowanie odpowiedzi
    response = {
        'items': [r.to_dict() for r in paginated.items],
        'total': paginated.total,
        'pages': paginated.pages,
        'page': page,
        'per_page': per_page
    }
    
    return jsonify(response)

@bp.route('/<task_id>', methods=['GET'])
def get_research(task_id):
    """Pobieranie szczegółów badania na podstawie ID zadania"""
    research = Research.query.filter_by(task_id=task_id).first_or_404()
    return jsonify(research.to_dict())

@bp.route('/', methods=['POST'])
def create_research():
    """Tworzenie nowego badania"""
    data = request.json
    
    # Sprawdzanie wymaganych pól
    required_fields = ['region_name', 'region_id']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Brak wymaganego pola: {field}'}), 400
    
    # Tworzenie identyfikatora zadania
    task_id = data.get('task_id', f"region_{data['region_id']}_{uuid.uuid4().hex[:8]}")
    
    # Pobieranie gminy, jeśli zdefiniowano
    municipality = None
    if 'municipality_id' in data:
        municipality = Municipality.query.get(data['municipality_id'])
        if not municipality:
            return jsonify({'error': f'Nie znaleziono gminy o ID: {data["municipality_id"]}'}), 404
    
    # Tworzenie nowego badania
    research = Research(
        task_id=task_id,
        title=data.get('title', f"Badanie regionu: {data['region_name']}"),
        status='queued',
        progress=0,
        region_name=data['region_name'],
        region_id=data['region_id'],
        breadth=data.get('breadth', 4),
        depth=data.get('depth', 2),
        config=data.get('config', {}),
        municipality_id=data.get('municipality_id')
    )
    
    # Zapisywanie do bazy danych
    db.session.add(research)
    db.session.commit()
    
    # Zlecanie zadania do document_processor
    try:
        # Adres document_processor definiowany w zmiennych środowiskowych
        processor_url = os.environ.get('DOCUMENT_PROCESSOR_URL', 'http://document_processor:5000')
        response = requests.post(
            f"{processor_url}/api/deep_research/start",
            json={
                'task_id': task_id,
                'region_name': data['region_name'],
                'region_id': data['region_id'],
                'options': {
                    'breadth': research.breadth,
                    'depth': research.depth,
                    'config': research.config
                }
            },
            timeout=5
        )
        
        if response.status_code == 200:
            # Aktualizacja statusu na "running"
            research.status = 'running'
            research.start_time = datetime.utcnow()
            db.session.commit()
        else:
            current_app.logger.error(f"Błąd podczas zlecania zadania: {response.text}")
            research.status = 'failed'
            research.error_message = f"Błąd podczas zlecania zadania: {response.text}"
            db.session.commit()
            
    except Exception as e:
        current_app.logger.error(f"Wyjątek podczas zlecania zadania: {str(e)}")
        research.status = 'failed'
        research.error_message = f"Wyjątek podczas zlecania zadania: {str(e)}"
        db.session.commit()
        return jsonify({'error': str(e)}), 500
    
    return jsonify(research.to_dict()), 201

@bp.route('/<task_id>/status', methods=['PUT'])
def update_research_status(task_id):
    """Aktualizowanie statusu badania"""
    research = Research.query.filter_by(task_id=task_id).first_or_404()
    data = request.json
    
    # Aktualizacja pól statusu
    if 'status' in data:
        research.status = data['status']
        
        # Jeśli status zmienił się na "completed" lub "failed", ustawiamy czas zakończenia
        if data['status'] in ['completed', 'failed']:
            research.end_time = datetime.utcnow()
    
    if 'progress' in data:
        research.progress = data['progress']
    
    if 'current_step' in data:
        research.current_step = data['current_step']
    
    if 'error_message' in data:
        research.error_message = data['error_message']
    
    # Zapisywanie raportu, jeśli jest dostępny
    if 'report' in data and data['report']:
        report = ResearchReport(
            research_id=research.id,
            type='markdown',
            title=f"Raport z badania regionu: {research.region_name}",
            content=data['report']
        )
        db.session.add(report)
    
    db.session.commit()
    return jsonify(research.to_dict())

@bp.route('/<task_id>/stop', methods=['POST'])
def stop_research(task_id):
    """Zatrzymywanie badania"""
    research = Research.query.filter_by(task_id=task_id).first_or_404()
    
    if research.status not in ['running', 'queued']:
        return jsonify({'error': 'Badanie nie jest w trakcie wykonywania'}), 400
    
    try:
        # Adres document_processor definiowany w zmiennych środowiskowych
        processor_url = os.environ.get('DOCUMENT_PROCESSOR_URL', 'http://document_processor:5000')
        response = requests.post(
            f"{processor_url}/api/deep_research/stop",
            json={'task_id': task_id},
            timeout=5
        )
        
        if response.status_code == 200:
            # Aktualizacja statusu na "stopped"
            research.status = 'stopped'
            research.end_time = datetime.utcnow()
            db.session.commit()
            return jsonify(research.to_dict())
        else:
            return jsonify({'error': f"Błąd podczas zatrzymywania badania: {response.text}"}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<task_id>/report', methods=['GET'])
def get_research_report(task_id):
    """Pobieranie raportu z badania"""
    research = Research.query.filter_by(task_id=task_id).first_or_404()
    
    # Pobieranie najnowszego raportu danego typu
    report_type = request.args.get('type', 'markdown')
    report = ResearchReport.query.filter_by(
        research_id=research.id,
        type=report_type
    ).order_by(ResearchReport.created_at.desc()).first()
    
    if not report:
        return jsonify({'error': 'Raport nie jest dostępny'}), 404
    
    # Jeśli raport to plik, zwracamy go
    if report.file_path and os.path.exists(report.file_path):
        return send_file(report.file_path, as_attachment=True)
    
    # W przeciwnym razie zwracamy treść
    return jsonify({
        'report': report.content,
        'title': report.title,
        'type': report.type,
        'created_at': report.created_at.isoformat()
    })

@bp.route('/register', methods=['POST'])
def register_research_task():
    """Rejestracja zadania badawczego z document_processor"""
    data = request.json
    
    # Sprawdzanie wymaganych pól
    required_fields = ['task_id', 'region_name', 'region_id', 'status']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Brak wymaganego pola: {field}'}), 400
    
    # Sprawdzamy, czy zadanie już istnieje
    existing = Research.query.filter_by(task_id=data['task_id']).first()
    if existing:
        return jsonify({'message': 'Zadanie już istnieje', 'research': existing.to_dict()}), 200
    
    # Tworzenie nowego zadania
    research = Research(
        task_id=data['task_id'],
        title=data.get('title', f"Badanie regionu: {data['region_name']}"),
        status=data['status'],
        progress=data.get('progress', 0),
        current_step=data.get('current_step'),
        region_name=data['region_name'],
        region_id=data['region_id'],
        start_time=datetime.fromisoformat(data['start_time']) if 'start_time' in data else datetime.utcnow()
    )
    
    db.session.add(research)
    db.session.commit()
    
    return jsonify(research.to_dict()), 201

@bp.route('/pending', methods=['GET'])
def get_pending_research():
    """Pobieranie zadań oczekujących na przetworzenie (dla document_processor)"""
    # Pobieranie zadań w statusie "queued"
    pending = Research.query.filter_by(status='queued').order_by(Research.created_at).all()
    
    return jsonify([r.to_dict() for r in pending])