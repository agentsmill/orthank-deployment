import React, { useState, useEffect, useCallback } from 'react';
import { Card, ProgressBar, Badge, Spinner, Button, Alert, Row, Col } from 'react-bootstrap';
import { formatDistance } from 'date-fns';
import { pl } from 'date-fns/locale';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const ResearchProgress = ({ taskId, onComplete, onError }) => {
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [showFullReport, setShowFullReport] = useState(false);

  // Funkcja pobierająca postęp badania
  const fetchProgress = useCallback(async () => {
    try {
      const response = await axios.get(`/api/research/${taskId}`);
      setProgress(response.data);
      setLoading(false);

      if (response.data.status === 'completed') {
        // Jeśli badanie zostało zakończone, pobierz raport
        fetchReport();
        // Wywołaj callback
        if (onComplete) onComplete(response.data);
      } else if (response.data.status === 'failed' || response.data.status === 'stopped') {
        setError(response.data.error_message || 'Badanie zakończyło się niepowodzeniem');
        if (onError) onError(response.data);
      }
    } catch (err) {
      setError(err.message || 'Wystąpił nieznany błąd');
      setLoading(false);
      if (onError) onError(err);
    }
  }, [taskId, onComplete, onError]);

  // Funkcja pobierająca raport
  const fetchReport = useCallback(async () => {
    try {
      const response = await axios.get(`/api/research/${taskId}/report`);
      setReport(response.data.report);
    } catch (err) {
      console.error('Błąd pobierania raportu:', err);
    }
  }, [taskId]);

  // Funkcja zatrzymująca badanie
  const stopResearch = async () => {
    try {
      await axios.post(`/api/research/${taskId}/stop`);
      fetchProgress(); // Odświeżamy status po zatrzymaniu
    } catch (err) {
      setError(`Nie udało się zatrzymać badania: ${err.message}`);
    }
  };

  // Pobieraj aktualizacje postępu co 5 sekund
  useEffect(() => {
    // Natychmiastowe pierwsze pobranie
    fetchProgress();
    
    // Ustaw polling tylko jeśli badanie jest w trakcie
    const intervalId = setInterval(() => {
      fetchProgress();
    }, 5000);

    // Czyszczenie przy odmontowaniu lub gdy badanie się zakończyło
    return () => clearInterval(intervalId);
  }, [fetchProgress]);

  if (loading && !progress) {
    return (
      <Card className="mb-4">
        <Card.Body className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Ładowanie informacji o badaniu...</p>
        </Card.Body>
      </Card>
    );
  }

  if (error && !progress) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Wystąpił błąd</Alert.Heading>
        <p>{error}</p>
      </Alert>
    );
  }

  if (!progress) {
    return (
      <Alert variant="warning">
        <Alert.Heading>Brak danych</Alert.Heading>
        <p>Nie znaleziono informacji o badaniu o ID: {taskId}</p>
      </Alert>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'queued':
        return <Badge bg="info">W kolejce</Badge>;
      case 'starting':
      case 'running':
        return <Badge bg="primary">W trakcie</Badge>;
      case 'completed':
        return <Badge bg="success">Zakończone</Badge>;
      case 'failed':
        return <Badge bg="danger">Błąd</Badge>;
      case 'stopped':
        return <Badge bg="warning">Zatrzymane</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    try {
      return formatDistance(new Date(timestamp), new Date(), {
        addSuffix: true,
        locale: pl
      });
    } catch (err) {
      return timestamp;
    }
  };

  const getProgressVariant = (status) => {
    switch (status) {
      case 'queued':
        return 'info';
      case 'running':
        return 'primary';
      case 'completed':
        return 'success';
      case 'failed':
        return 'danger';
      case 'stopped':
        return 'warning';
      default:
        return 'info';
    }
  };

  const renderReport = () => {
    if (!report) return null;
    
    if (!showFullReport) {
      // Pokaż tylko pierwsze 500 znaków raportu
      const previewText = report.slice(0, 500) + (report.length > 500 ? '...' : '');
      
      return (
        <div className="mt-3">
          <Card>
            <Card.Header>
              <strong>Podgląd raportu</strong>
            </Card.Header>
            <Card.Body>
              <ReactMarkdown>{previewText}</ReactMarkdown>
              <div className="text-center mt-2">
                <Button 
                  variant="primary" 
                  onClick={() => setShowFullReport(true)}
                >
                  Pokaż pełny raport
                </Button>
              </div>
            </Card.Body>
          </Card>
        </div>
      );
    }
    
    return (
      <div className="mt-3">
        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <strong>Pełny raport badania</strong>
            <Button 
              variant="outline-secondary" 
              size="sm"
              onClick={() => setShowFullReport(false)}
            >
              Zwiń raport
            </Button>
          </Card.Header>
          <Card.Body>
            <ReactMarkdown>{report}</ReactMarkdown>
          </Card.Body>
        </Card>
      </div>
    );
  };

  return (
    <div className="research-progress">
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <span>
            Badanie regionu: <strong>{progress.region_name}</strong>
          </span>
          {getStatusBadge(progress.status)}
        </Card.Header>
        <Card.Body>
          <div className="mb-3">
            <div className="d-flex justify-content-between mb-1">
              <span>{progress.current_step || 'Inicjalizacja'}</span>
              <span>{progress.progress}%</span>
            </div>
            <ProgressBar 
              variant={getProgressVariant(progress.status)}
              now={progress.progress} 
              animated={progress.status === 'running' || progress.status === 'queued'} 
            />
          </div>
          
          <Row className="mt-3">
            <Col sm={6}>
              <div className="text-muted small">
                <div>Rozpoczęto: {getTimeAgo(progress.start_time)}</div>
                <div>Ostatnia aktualizacja: {getTimeAgo(progress.updated_at)}</div>
              </div>
            </Col>
            <Col sm={6} className="text-end">
              <div className="text-muted small">
                <div>ID zadania: {progress.task_id}</div>
                {progress.end_time && (
                  <div>Zakończono: {getTimeAgo(progress.end_time)}</div>
                )}
              </div>
            </Col>
          </Row>
          
          {error && (
            <Alert variant="danger" className="mt-3">
              <Alert.Heading>Błąd podczas badania</Alert.Heading>
              <p>{error}</p>
            </Alert>
          )}
          
          {progress.status === 'running' && (
            <div className="mt-3 text-center">
              <Button variant="outline-warning" onClick={stopResearch}>
                Zatrzymaj badanie
              </Button>
            </div>
          )}
          
          {progress.status === 'completed' && renderReport()}
        </Card.Body>
      </Card>
    </div>
  );
};

export default ResearchProgress;