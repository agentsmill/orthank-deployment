import React, { useState, useEffect } from 'react';
import { Form, InputGroup, Dropdown, Spinner, Badge } from 'react-bootstrap';
import axios from 'axios';
import { debounce } from 'lodash';

const MunicipalitySelector = ({ 
  onSelect, 
  initialValue = null, 
  placeholder = "Wyszukaj gminę...",
  disabled = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [municipalities, setMunicipalities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState(initialValue);

  // Funkcja debouncująca wyszukiwanie dla zmniejszenia liczby zapytań
  const debouncedSearch = debounce(async (query) => {
    if (!query || query.length < 2) {
      setMunicipalities([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`/api/municipalities/search?q=${encodeURIComponent(query)}&limit=15`);
      setMunicipalities(response.data);
    } catch (error) {
      console.error('Błąd podczas wyszukiwania gmin:', error);
      setMunicipalities([]);
    } finally {
      setLoading(false);
    }
  }, 300);

  // Obsługa zmiany wartości wyszukiwania
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
    
    if (value) {
      setShow(true);
    } else {
      setShow(false);
    }
    
    // Jeśli wyczyścimy pole wyszukiwania, to również czyścimy wybraną gminę
    if (!value && selected) {
      setSelected(null);
      if (onSelect) onSelect(null);
    }
  };

  // Obsługa wyboru gminy z listy
  const handleSelect = (municipality) => {
    setSelected(municipality);
    setSearchTerm(municipality.name);
    setShow(false);
    if (onSelect) onSelect(municipality);
  };

  // Obsługa kliknięcia na pole wyszukiwania
  const handleFocus = () => {
    if (searchTerm.length >= 2) {
      setShow(true);
    }
  };

  // Przeprowadź wyszukiwanie, jeśli jest ustawiona wartość początkowa
  useEffect(() => {
    if (initialValue && initialValue.id) {
      setSelected(initialValue);
      setSearchTerm(initialValue.name);
    }
  }, [initialValue]);

  // Renderowanie typu gminy
  const renderMunicipalityType = (type) => {
    let variant = 'secondary';
    
    if (type.includes('miejska')) variant = 'primary';
    else if (type.includes('wiejska')) variant = 'success';
    else if (type.includes('miejsko-wiejska')) variant = 'info';
    
    return (
      <Badge bg={variant} className="ms-1" style={{ fontSize: '0.7rem' }}>
        {type}
      </Badge>
    );
  };
  
  // Renderowanie województwa
  const renderVoivodeship = (voivodeship) => {
    return (
      <small className="text-muted ms-1">
        (woj. {voivodeship})
      </small>
    );
  };

  return (
    <div className="municipality-selector">
      <InputGroup>
        <Form.Control
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleSearchChange}
          onFocus={handleFocus}
          disabled={disabled}
        />
        {loading && (
          <InputGroup.Text>
            <Spinner animation="border" size="sm" />
          </InputGroup.Text>
        )}
      </InputGroup>
      
      <Dropdown show={show && !disabled}>
        <Dropdown.Menu className="w-100">
          {municipalities.length === 0 ? (
            <Dropdown.Item disabled>
              {loading ? 'Wyszukiwanie...' : 'Brak wyników'}
            </Dropdown.Item>
          ) : (
            municipalities.map((municipality) => (
              <Dropdown.Item
                key={municipality.id}
                onClick={() => handleSelect(municipality)}
                active={selected && selected.id === municipality.id}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>{municipality.name}</strong>
                    {renderMunicipalityType(municipality.type)}
                    {renderVoivodeship(municipality.voivodeship_name)}
                  </div>
                  <small className="text-muted">{municipality.teryt_code}</small>
                </div>
              </Dropdown.Item>
            ))
          )}
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
};

export default MunicipalitySelector;