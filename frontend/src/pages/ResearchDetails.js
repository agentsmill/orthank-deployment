import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Button, Spinner } from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { formatDistance, format } from 'date-fns';
import { pl } from 'date-fns/locale';
import axios from 'axios';
import ResearchProgress from '../components/ResearchProgress';

const ResearchDetails = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  
  const [research, setResearch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [municipality, setMunicipality] = useState(null);
  
  // Pobieranie szczegółów badania
  const fetchResearchDetails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/research/${taskId}`);
      setResearch(response.data);
      
      // Jeśli badanie ma przypisaną gminę, pobierz jej szczegóły
      if (response.data.municipality_id) {
        fetchMunicipalityDetails(response.data.municipality_id);
      }
    } catch (err) {
      console.error('Błąd podczas pobierania szczegółów badania:', err);
      setError(err.response?.data?.error || err.message || 'Wystąpił nieznany błąd');
    } finally {
      setLoading(false);
    }
  };
  
  // Pobieranie szczegółów gminy
  const fetchMunicipalityDetails = async (municipalityId) => {
    try {
      const response = await axios.get(`/api/municipalities/${municipalityId}`);
      setMunicipality(response.data);
    } catch (err) {
      console.error('Błąd podczas pobierania szczegółów gminy:', err);
      // Nie ustawiamy głównego błędu, aby nie przesłaniać głównych informacji
    }
  };
  
  // Pobierz dane po załadowaniu komponentu
  useEffect(() => {
    fetchResearchDetails();
  }, [taskId]);
  
  // Obsługa zatrzymania badania
  const handleStopResearch = async () => {
    try {
      await axios.post(`/api/research/${taskId}/stop`);
      // Odśwież dane
      fetchResearchDetails();
    } catch (err) {
      console.error('Błąd podczas zatrzymywania badania:', err);
      setError(err.response?.data?.error || err.message || 'Nie udało się zatrzymać badania');
    }
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
  
  // Formatowanie czasu (dokładna data)
  const formatExactTime = (timestamp) => {
    if (!timestamp) return 'N/D';
    try {
      return format(new Date(timestamp), 'dd.MM.yyyy HH:mm:ss', {
        locale: pl
      });
    } catch (err) {
      return timestamp;
    }
  };
  
  if (loading && !research) {
    return (
      <Container className="py-4 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Ładowanie szczegółów badania...</p>
      </Container>
    );
  }
  
  if (error && !research) {
    return (
      <Container className="py-4">
        <Alert variant="danger">
          <Alert.Heading>Wystąpił błąd</Alert.Heading>
          <p>{error}</p>
          <div className="d-flex justify-content-end">
            <Button variant="outline-danger" onClick={() => navigate('/research')}>
              Powrót do listy badań
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }
  
  if (!research) {
    return (
      <Container className="py-4">
        <Alert variant="warning">
          <Alert.Heading>Nie znaleziono badania</Alert.Heading>
          <p>Nie znaleziono badania o ID: {taskId}</p>
          <div className="d-flex justify-content-end">
            <Button variant="outline-warning" onClick={() => navigate('/research')}>
              Powrót do listy badań
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }
  
  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>{research.title}</h1>
        <div>
          <Button 
            variant="outline-secondary" 
            className="me-2"
            onClick={() => navigate('/research')}
          >
            Powrót do listy
          </Button>
          
          {research.status === 'running' && (
            <Button 
              variant="warning"
              onClick={handleStopResearch}
            >
              Zatrzymaj badanie
            </Button>
          )}
        </div>
      </div>
      
      <Row>
        <Col md={8}>
          {/* Komponent postępu badania */}
          <ResearchProgress 
            taskId={taskId} 
            onComplete={fetchResearchDetails}
            onError={(err) => setError(err.message || 'Wystąpił błąd podczas aktualizacji statusu')}
          />
          
          {/* Karta z parametrami badania */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Parametry badania</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <dl>
                    <dt>Region</dt>
                    <dd>{research.region_name}</dd>
                    
                    <dt>Identyfikator regionu</dt>
                    <dd>{research.region_id}</dd>
                    
                    <dt>Szerokość wyszukiwania</dt>
                    <dd>{research.breadth}</dd>
                    
                    <dt>Głębokość wyszukiwania</dt>
                    <dd>{research.depth}</dd>
                  </dl>
                </Col>
                <Col md={6}>
                  <dl>
                    <dt>Data rozpoczęcia</dt>
                    <dd>{formatExactTime(research.start_time)}</dd>
                    
                    {research.end_time && (
                      <>
                        <dt>Data zakończenia</dt>
                        <dd>{formatExactTime(research.end_time)}</dd>
                      </>
                    )}
                    
                    <dt>Czas trwania</dt>
                    <dd>
                      {research.duration 
                        ? `${Math.floor(research.duration / 60)} min ${research.duration % 60} s`
                        : 'N/D'}
                    </dd>
                  </dl>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          {/* Karta z informacjami o gminie */}
          {municipality && (
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">Informacje o gminie</h5>
              </Card.Header>
              <Card.Body>
                <dl>
                  <dt>Nazwa gminy</dt>
                  <dd>{municipality.name}</dd>
                  
                  <dt>Typ gminy</dt>
                  <dd>{municipality.type}</dd>
                  
                  <dt>Kod TERYT</dt>
                  <dd>{municipality.teryt_code}</dd>
                  
                  <dt>Województwo</dt>
                  <dd>{municipality.voivodeship_name}</dd>
                  
                  <dt>Powiat</dt>
                  <dd>{municipality.county_name || 'N/D'}</dd>
                  
                  {municipality.population && (
                    <>
                      <dt>Liczba mieszkańców</dt>
                      <dd>{municipality.population}</dd>
                    </>
                  )}
                  
                  {municipality.area && (
                    <>
                      <dt>Powierzchnia</dt>
                      <dd>{municipality.area} km²</dd>
                    </>
                  )}
                </dl>
                
                {municipality.bip_url && (
                  <div className="mt-3">
                    <a 
                      href={municipality.bip_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-outline-primary"
                    >
                      Strona BIP
                    </a>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}
          
          {/* Karta z akcjami */}
          <Card>
            <Card.Header>
              <h5 className="mb-0">Akcje</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                {research.status === 'completed' && (
                  <Button 
                    variant="primary"
                    as={Link}
                    to={`/research/${taskId}/report`}
                  >
                    Pobierz pełny raport
                  </Button>
                )}
                
                {research.status === 'running' && (
                  <Button 
                    variant="warning"
                    onClick={handleStopResearch}
                  >
                    Zatrzymaj badanie
                  </Button>
                )}
                
                <Button 
                  variant="outline-primary"
                  as={Link}
                  to={`/research/new`}
                >
                  Rozpocznij nowe badanie
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ResearchDetails;