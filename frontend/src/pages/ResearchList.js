import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Spinner, Alert, Form, Pagination } from 'react-bootstrap';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { formatDistance } from 'date-fns';
import { pl } from 'date-fns/locale';
import axios from 'axios';

const ResearchList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [researches, setResearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: parseInt(searchParams.get('page') || '1'),
    perPage: parseInt(searchParams.get('perPage') || '10'),
    total: 0,
    pages: 0
  });
  
  // Filtry
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    region: searchParams.get('region') || ''
  });
  
  // Pobieranie badań
  const fetchResearches = async () => {
    setLoading(true);
    setError(null);
    
    // Budowanie parametrów zapytania
    const params = new URLSearchParams();
    params.append('page', pagination.page);
    params.append('per_page', pagination.perPage);
    
    if (filters.status) params.append('status', filters.status);
    if (filters.region) params.append('region_name', filters.region);
    
    try {
      const response = await axios.get(`/api/research?${params.toString()}`);
      setResearches(response.data.items);
      setPagination({
        ...pagination,
        total: response.data.total,
        pages: response.data.pages
      });
    } catch (err) {
      console.error('Błąd podczas pobierania listy badań:', err);
      setError(err.response?.data?.error || err.message || 'Wystąpił nieznany błąd');
    } finally {
      setLoading(false);
    }
  };
  
  // Pobierz dane po załadowaniu komponentu lub zmianie filtrów/paginacji
  useEffect(() => {
    fetchResearches();
    
    // Aktualizuj parametry URL
    const params = new URLSearchParams();
    params.set('page', pagination.page.toString());
    params.set('perPage', pagination.perPage.toString());
    
    if (filters.status) params.set('status', filters.status);
    if (filters.region) params.set('region', filters.region);
    
    setSearchParams(params);
  }, [pagination.page, pagination.perPage, filters.status, filters.region]);
  
  // Obsługa zmiany filtrów
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    // Resetuj stronę przy zmianie filtrów
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
  };
  
  // Obsługa zmiany strony
  const handlePageChange = (newPage) => {
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
  };
  
  // Renderowanie etykiety statusu
  const renderStatusBadge = (status) => {
    let variant = 'secondary';
    let label = status;
    
    switch (status) {
      case 'queued':
        variant = 'info';
        label = 'W kolejce';
        break;
      case 'running':
        variant = 'primary';
        label = 'W trakcie';
        break;
      case 'completed':
        variant = 'success';
        label = 'Zakończone';
        break;
      case 'failed':
        variant = 'danger';
        label = 'Błąd';
        break;
      case 'stopped':
        variant = 'warning';
        label = 'Zatrzymane';
        break;
    }
    
    return <Badge bg={variant}>{label}</Badge>;
  };
  
  // Formatowanie czasu
  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/D';
    try {
      return formatDistance(new Date(timestamp), new Date(), {
        addSuffix: true,
        locale: pl
      });
    } catch (err) {
      return timestamp;
    }
  };
  
  // Renderowanie paginacji
  const renderPagination = () => {
    const pages = [];
    
    // Dodaj pierwszy element
    pages.push(
      <Pagination.First 
        key="first" 
        disabled={pagination.page === 1}
        onClick={() => handlePageChange(1)}
      />
    );
    
    // Dodaj przycisk "Poprzednia"
    pages.push(
      <Pagination.Prev 
        key="prev" 
        disabled={pagination.page === 1}
        onClick={() => handlePageChange(pagination.page - 1)}
      />
    );
    
    // Dodaj numery stron
    const startPage = Math.max(1, pagination.page - 2);
    const endPage = Math.min(pagination.pages, pagination.page + 2);
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Pagination.Item
          key={i}
          active={i === pagination.page}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Pagination.Item>
      );
    }
    
    // Dodaj przycisk "Następna"
    pages.push(
      <Pagination.Next 
        key="next" 
        disabled={pagination.page === pagination.pages}
        onClick={() => handlePageChange(pagination.page + 1)}
      />
    );
    
    // Dodaj ostatni element
    pages.push(
      <Pagination.Last 
        key="last" 
        disabled={pagination.page === pagination.pages}
        onClick={() => handlePageChange(pagination.pages)}
      />
    );
    
    return <Pagination>{pages}</Pagination>;
  };
  
  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Badania regionów</h1>
        <Button 
          variant="primary"
          onClick={() => navigate('/research/new')}
        >
          Nowe badanie
        </Button>
      </div>
      
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          <Alert.Heading>Wystąpił błąd</Alert.Heading>
          <p>{error}</p>
        </Alert>
      )}
      
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">Filtry</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                >
                  <option value="">Wszystkie statusy</option>
                  <option value="queued">W kolejce</option>
                  <option value="running">W trakcie</option>
                  <option value="completed">Zakończone</option>
                  <option value="failed">Błąd</option>
                  <option value="stopped">Zatrzymane</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Region</Form.Label>
                <Form.Control
                  type="text"
                  name="region"
                  value={filters.region}
                  onChange={handleFilterChange}
                  placeholder="Wyszukaj po nazwie regionu..."
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      
      <Card>
        <Card.Header>
          <h5 className="mb-0">Lista badań</h5>
        </Card.Header>
        <div className="table-responsive">
          <Table striped hover>
            <thead>
              <tr>
                <th>Tytuł</th>
                <th>Region</th>
                <th>Status</th>
                <th>Postęp</th>
                <th>Data rozpoczęcia</th>
                <th>Ostatnia aktualizacja</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-4">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-2 mb-0">Ładowanie badań...</p>
                  </td>
                </tr>
              ) : researches.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4">
                    <p className="mb-0">Brak badań spełniających kryteria.</p>
                  </td>
                </tr>
              ) : (
                researches.map(research => (
                  <tr key={research.task_id}>
                    <td>
                      <Link to={`/research/${research.task_id}`}>
                        {research.title}
                      </Link>
                    </td>
                    <td>{research.region_name}</td>
                    <td>{renderStatusBadge(research.status)}</td>
                    <td>
                      {research.progress}%
                    </td>
                    <td>{formatTime(research.start_time)}</td>
                    <td>{formatTime(research.updated_at)}</td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => navigate(`/research/${research.task_id}`)}
                      >
                        Szczegóły
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
        
        {pagination.pages > 1 && (
          <Card.Footer>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                Strona {pagination.page} z {pagination.pages} (łącznie {pagination.total} badań)
              </div>
              {renderPagination()}
            </div>
          </Card.Footer>
        )}
      </Card>
    </Container>
  );
};

export default ResearchList;