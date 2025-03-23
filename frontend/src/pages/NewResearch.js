import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import MunicipalitySelector from '../components/MunicipalitySelector';

const NewResearch = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    title: '',
    region_name: '',
    region_id: '',
    breadth: 4,
    depth: 2,
    municipality_id: null
  });
  
  const [selectedMunicipality, setSelectedMunicipality] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Obsługa zmiany pól formularza
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Obsługa wyboru gminy
  const handleMunicipalitySelect = (municipality) => {
    setSelectedMunicipality(municipality);
    
    if (municipality) {
      // Aktualizuj formularz z danymi gminy
      setFormData(prev => ({
        ...prev,
        municipality_id: municipality.id,
        region_name: municipality.name,
        region_id: municipality.teryt_code,
        title: `Badanie regionu: ${municipality.name}`
      }));
    } else {
      // Wyczyść pola powiązane z gminą
      setFormData(prev => ({
        ...prev,
        municipality_id: null
      }));
    }
  };
  
  // Obsługa przesyłania formularza
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Sprawdzanie, czy wymagane pola są wypełnione
      if (!formData.region_name || !formData.region_id) {
        throw new Error('Nazwa regionu i identyfikator są wymagane');
      }
      
      // Przygotowanie danych do wysłania
      const payload = {
        ...formData,
        breadth: parseInt(formData.breadth),
        depth: parseInt(formData.depth)
      };
      
      // Wysłanie żądania utworzenia nowego badania
      const response = await axios.post('/api/research', payload);
      
      // Przekierowanie do strony badania
      navigate(`/research/${response.data.task_id}`);
    } catch (err) {
      console.error('Błąd podczas tworzenia badania:', err);
      setError(err.response?.data?.error || err.message || 'Wystąpił nieznany błąd');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container className="py-4">
      <h1 className="mb-4">Nowe badanie regionu</h1>
      
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          <Alert.Heading>Wystąpił błąd</Alert.Heading>
          <p>{error}</p>
        </Alert>
      )}
      
      <Row>
        <Col lg={8}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Parametry badania</h5>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Wybierz gminę z bazy danych</Form.Label>
                  <MunicipalitySelector 
                    onSelect={handleMunicipalitySelect}
                    placeholder="Wyszukaj gminę (min. 2 znaki)..."
                    disabled={loading}
                  />
                  <Form.Text className="text-muted">
                    Wyszukaj gminę, aby automatycznie wypełnić dane regionu.
                  </Form.Text>
                </Form.Group>
                
                <hr className="my-4" />
                
                <Form.Group className="mb-3">
                  <Form.Label>Tytuł badania</Form.Label>
                  <Form.Control
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Wprowadź tytuł badania..."
                    disabled={loading}
                    required
                  />
                </Form.Group>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nazwa regionu</Form.Label>
                      <Form.Control
                        type="text"
                        name="region_name"
                        value={formData.region_name}
                        onChange={handleChange}
                        placeholder="Wprowadź nazwę regionu..."
                        disabled={loading}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Identyfikator regionu</Form.Label>
                      <Form.Control
                        type="text"
                        name="region_id"
                        value={formData.region_id}
                        onChange={handleChange}
                        placeholder="Wprowadź ID regionu..."
                        disabled={loading}
                        required
                      />
                      <Form.Text className="text-muted">
                        Może to być kod TERYT lub inny unikalny identyfikator.
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Szerokość wyszukiwania ({formData.breadth})</Form.Label>
                      <Form.Range
                        name="breadth"
                        value={formData.breadth}
                        onChange={handleChange}
                        min={2}
                        max={8}
                        disabled={loading}
                      />
                      <Form.Text className="text-muted">
                        Określa liczbę zapytań wyszukiwania dla każdej iteracji (2-8).
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Głębokość wyszukiwania ({formData.depth})</Form.Label>
                      <Form.Range
                        name="depth"
                        value={formData.depth}
                        onChange={handleChange}
                        min={1}
                        max={5}
                        disabled={loading}
                      />
                      <Form.Text className="text-muted">
                        Określa liczbę iteracji wyszukiwania (1-5).
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
                
                <div className="d-flex justify-content-between mt-4">
                  <Button 
                    variant="outline-secondary" 
                    onClick={() => navigate(-1)}
                    disabled={loading}
                  >
                    Anuluj
                  </Button>
                  <Button 
                    type="submit"
                    variant="primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        Tworzenie badania...
                      </>
                    ) : 'Rozpocznij badanie'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={4}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Informacje</h5>
            </Card.Header>
            <Card.Body>
              <h6>Co to jest badanie regionu?</h6>
              <p>
                Badanie regionu to dogłębna analiza wybranego obszaru, która wykorzystuje
                sztuczną inteligencję do wyszukiwania i analizy informacji o:
              </p>
              <ul>
                <li>Demografii i geografii regionu</li>
                <li>Infrastrukturze energetycznej</li>
                <li>Projektach OZE (Odnawialnych Źródeł Energii)</li>
                <li>Magazynach energii</li>
                <li>Potencjale inwestycyjnym</li>
                <li>Lokalnych przepisach i planach zagospodarowania</li>
              </ul>
              
              <h6 className="mt-4">Jak działa badanie?</h6>
              <p>
                System wykorzystuje lokalny model AI (gemma3:4b) do przeprowadzenia
                iteracyjnego procesu wyszukiwania i analizy informacji z różnych źródeł
                internetowych. Parametry:
              </p>
              <ul>
                <li><strong>Szerokość</strong> - liczba zapytań w każdej iteracji</li>
                <li><strong>Głębokość</strong> - liczba iteracji wyszukiwania</li>
              </ul>
              <p className="text-muted">
                Większe wartości zapewniają dokładniejsze wyniki, ale wydłużają czas badania.
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default NewResearch;