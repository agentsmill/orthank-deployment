from flask import Blueprint, jsonify, request
from app.models.municipality import Municipality
from sqlalchemy import desc, asc

bp = Blueprint('municipalities', __name__, url_prefix='/api/municipalities')

@bp.route('/', methods=['GET'])
def get_municipalities():
    """Pobieranie listy gmin z możliwością filtrowania i sortowania"""
    # Parametry filtrowania
    name = request.args.get('name')
    voivodeship = request.args.get('voivodeship')
    county = request.args.get('county')
    municipality_type = request.args.get('type')
    
    # Parametry paginacji
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)  # Maksymalnie 100 na stronę
    
    # Parametry sortowania
    sort_by = request.args.get('sort_by', 'name')
    sort_dir = request.args.get('sort_dir', 'asc')
    
    # Przygotowanie zapytania
    query = Municipality.query
    
    # Filtrowanie
    if name:
        query = query.filter(Municipality.name.ilike(f'%{name}%'))
    if voivodeship:
        query = query.filter(Municipality.voivodeship_name.ilike(f'%{voivodeship}%'))
    if county:
        query = query.filter(Municipality.county_name.ilike(f'%{county}%'))
    if municipality_type:
        query = query.filter(Municipality.type == municipality_type)
    
    # Sortowanie
    if sort_by not in ['name', 'voivodeship_name', 'county_name', 'type', 'population', 'area']:
        sort_by = 'name'  # Domyślne sortowanie
    
    if sort_dir == 'desc':
        query = query.order_by(desc(getattr(Municipality, sort_by)))
    else:
        query = query.order_by(asc(getattr(Municipality, sort_by)))
    
    # Paginacja
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    
    # Przygotowanie odpowiedzi
    response = {
        'items': [m.to_dict() for m in paginated.items],
        'total': paginated.total,
        'pages': paginated.pages,
        'page': page,
        'per_page': per_page
    }
    
    return jsonify(response)

@bp.route('/<int:id>', methods=['GET'])
def get_municipality(id):
    """Pobieranie szczegółów gminy na podstawie ID"""
    municipality = Municipality.query.get_or_404(id)
    return jsonify(municipality.to_dict())

@bp.route('/teryt/<teryt_code>', methods=['GET'])
def get_municipality_by_teryt(teryt_code):
    """Pobieranie szczegółów gminy na podstawie kodu TERYT"""
    municipality = Municipality.query.filter_by(teryt_code=teryt_code).first_or_404()
    return jsonify(municipality.to_dict())

@bp.route('/search', methods=['GET'])
def search_municipalities():
    """Wyszukiwanie gmin"""
    query = request.args.get('q', '')
    limit = min(request.args.get('limit', 20, type=int), 100)
    
    if not query or len(query) < 2:
        return jsonify({'error': 'Zapytanie musi zawierać co najmniej 2 znaki'}), 400
    
    results = Municipality.search(query, limit)
    return jsonify([m.to_dict() for m in results])

@bp.route('/voivodeships', methods=['GET'])
def get_voivodeships():
    """Pobieranie listy wszystkich województw"""
    voivodeships = Municipality.query.with_entities(
        Municipality.voivodeship_code, 
        Municipality.voivodeship_name
    ).distinct().order_by(Municipality.voivodeship_name).all()
    
    return jsonify([
        {'code': v[0], 'name': v[1]} 
        for v in voivodeships
    ])

@bp.route('/counties', methods=['GET'])
def get_counties():
    """Pobieranie listy wszystkich powiatów"""
    voivodeship_code = request.args.get('voivodeship_code')
    
    query = Municipality.query.with_entities(
        Municipality.county_code, 
        Municipality.county_name,
        Municipality.voivodeship_code,
        Municipality.voivodeship_name
    ).distinct()
    
    if voivodeship_code:
        query = query.filter(Municipality.voivodeship_code == voivodeship_code)
    
    counties = query.order_by(Municipality.county_name).all()
    
    return jsonify([
        {
            'code': c[0], 
            'name': c[1],
            'voivodeship_code': c[2],
            'voivodeship_name': c[3]
        } 
        for c in counties if c[1]  # Filtruje puste nazwy powiatów
    ])

@bp.route('/types', methods=['GET'])
def get_municipality_types():
    """Pobieranie listy wszystkich typów gmin"""
    types = Municipality.query.with_entities(
        Municipality.type
    ).distinct().order_by(Municipality.type).all()
    
    return jsonify([t[0] for t in types])