import React, { useState, useEffect } from 'react';
import {
  Table, Button, Card, Container, Row, Col, Badge, Spinner, Alert, 
  Dropdown, ButtonGroup, InputGroup, Form
} from 'react-bootstrap';
import { leadService } from '../../services/firebaseService';
import { exportService } from '../../services/exportService';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const LeadList = () => {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: ''
  });
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Helper functions
  const hasActiveFilters = () => {
    return Object.values(filters).some(value => value !== '');
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const clearFilters = () => {
    setFilters({
      status: ''
    });
  };

  const clearAll = () => {
    clearSearch();
    clearFilters();
  };

  const displayLeads = (searchTerm || hasActiveFilters()) ? filteredLeads : leads;

  useEffect(() => {
    if (isAdmin()) {
      navigate('/admin/leads');
      return;
    }
    loadLeads();
  }, [currentUser, isAdmin, navigate]);

  useEffect(() => {
    filterLeads();
  }, [leads, searchTerm, filters]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      setError('');
      const agentLeads = await leadService.getAgentLeads();
      setLeads(agentLeads);
    } catch (err) {
      setError('Error loading leads: ' + err.message);
      console.error('Error loading leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterLeads = () => {
    let filtered = [...leads];

    // Apply text search
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(lead =>
        lead.fullName?.toLowerCase().includes(searchLower) ||
        lead.email?.toLowerCase().includes(searchLower) ||
        lead.mobileNo?.includes(searchTerm) ||
        lead.source?.toLowerCase().includes(searchLower) ||
        lead.propertyType?.toLowerCase().includes(searchLower) ||
        lead.budget?.toString().includes(searchTerm) ||
        lead.id?.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(lead => lead.status === filters.status);
    }

    setFilteredLeads(filtered);
  };

  // Export functionality for agents
  const handleExport = async (format = 'excel') => {
    try {
      setExportLoading(true);

      const dataToExport = (searchTerm || hasActiveFilters()) ? filteredLeads : leads;

      if (dataToExport.length === 0) {
        setError('No leads to export');
        return;
      }

      if (format === 'excel') {
        await exportService.exportLeadsToExcel(dataToExport, 'my_leads_export');
      } else {
        await exportService.exportLeadsToCSV(dataToExport, 'my_leads_export');
      }

      setError('');
    } catch (err) {
      setError('Error exporting leads: ' + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'New': return 'primary';
      case 'Contacted': return 'info';
      case 'Visited': return 'secondary';
      case 'Qualified': return 'warning';
      case 'Closed': return 'success';
      case 'Lost': return 'danger';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <Container className="text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p>Loading your leads...</p>
      </Container>
    );
  }

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>My Leads</h2>
              <p className="text-muted mb-0">Leads assigned to you</p>
            </div>
            <Button as={Link} to="/add-lead" variant="primary">
              + Add New Lead
            </Button>
          </div>
        </Col>
      </Row>

      {/* Combined Controls Card */}
      <Card className="mb-4">
        <Card.Body>
          {/* Main Controls Row */}
          <Row>
            {/* Left Side - Stats (6 columns) */}
            <Col md={6}>
              <div className="d-flex flex-column">
                <div className="mb-1">
                  <strong className="fs-6">Total Leads: {leads.length}</strong>
                  {(searchTerm || hasActiveFilters()) && (
                    <span className="text-primary ms-2">
                      • Showing: {filteredLeads.length}
                    </span>
                  )}
                </div>
              </div>
            </Col>

            {/* Right Side - Search, Filters, Export (6 columns) */}
            <Col md={6}>
              <div className="d-flex gap-2 justify-content-end">
                {/* Search Bar */}
                <InputGroup size="sm">
                  <InputGroup.Text>
                    <i className="bi bi-search"></i>
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search leads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <Button variant="outline-secondary" onClick={clearSearch}>
                      <i className="bi bi-x"></i>
                    </Button>
                  )}
                </InputGroup>

                {/* Status Filter */}
                <Dropdown>
                  <Dropdown.Toggle
                    variant={filters.status ? "primary" : "outline-secondary"}
                    size="sm"
                    className="d-flex align-items-center"
                  >
                    <i className="bi bi-funnel me-1"></i>
                    Status
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item
                      onClick={() => setFilters(prev => ({ ...prev, status: '' }))}
                      className={!filters.status ? 'active' : ''}
                    >
                      All Statuses
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item
                      onClick={() => setFilters(prev => ({ ...prev, status: 'New' }))}
                      className={filters.status === 'New' ? 'active' : ''}
                    >
                      New
                    </Dropdown.Item>
                    <Dropdown.Item
                      onClick={() => setFilters(prev => ({ ...prev, status: 'Contacted' }))}
                      className={filters.status === 'Contacted' ? 'active' : ''}
                    >
                      Contacted
                    </Dropdown.Item>
                    <Dropdown.Item
                      onClick={() => setFilters(prev => ({ ...prev, status: 'Visited' }))}
                      className={filters.status === 'Visited' ? 'active' : ''}
                    >
                      Visited
                    </Dropdown.Item>
                    <Dropdown.Item
                      onClick={() => setFilters(prev => ({ ...prev, status: 'Qualified' }))}
                      className={filters.status === 'Qualified' ? 'active' : ''}
                    >
                      Qualified
                    </Dropdown.Item>
                    <Dropdown.Item
                      onClick={() => setFilters(prev => ({ ...prev, status: 'Closed' }))}
                      className={filters.status === 'Closed' ? 'active' : ''}
                    >
                      Closed
                    </Dropdown.Item>
                    <Dropdown.Item
                      onClick={() => setFilters(prev => ({ ...prev, status: 'Lost' }))}
                      className={filters.status === 'Lost' ? 'active' : ''}
                    >
                      Lost
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>

                {/* Export Button */}
                <Dropdown as={ButtonGroup}>
                  <Button
                    variant="outline-primary"
                    disabled={exportLoading || displayLeads.length === 0}
                    onClick={() => handleExport('excel')}
                    size="sm"
                    className='d-flex gap-1'
                  >
                    Export
                    {exportLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1"></span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-file-earmark-excel"></i>
                      </>
                    )}
                  </Button>
                  <Dropdown.Toggle split variant="outline-primary" size="sm" />
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => handleExport('excel')}>
                      <i className="bi bi-file-earmark-excel me-2 text-primary"></i>
                      Export to Excel
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleExport('csv')}>
                      <i className="bi bi-file-earmark-text me-2 text-primary"></i>
                      Export to CSV
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            </Col>
          </Row>

          {/* Active Filters Display */}
          {(searchTerm || hasActiveFilters()) && (
            <Row className="mt-3">
              <Col>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <small className="text-muted">Active filters:</small>

                  {searchTerm && (
                    <Badge bg="info" className="d-flex align-items-center px-2 py-1">
                      Search: "{searchTerm}"
                      <Button
                        variant="link"
                        className="text-white p-0 ms-2 border-0"
                        style={{ fontSize: '0.7em' }}
                        onClick={clearSearch}
                      >
                        <i className="bi bi-x"></i>
                      </Button>
                    </Badge>
                  )}

                  {filters.status && (
                    <Badge bg="secondary" className="d-flex align-items-center px-2 py-1">
                      Status: {filters.status}
                      <Button
                        variant="link"
                        className="text-white p-0 ms-2 border-0"
                        style={{ fontSize: '0.7em' }}
                        onClick={() => setFilters(prev => ({ ...prev, status: '' }))}
                      >
                        <i className="bi bi-x"></i>
                      </Button>
                    </Badge>
                  )}
                </div>
              </Col>
            </Row>
          )}
          {(searchTerm || hasActiveFilters()) && (
            <div className="mt-2">
              <Button variant="outline-danger" size="sm" onClick={clearAll}>
                Clear Filters
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            {(searchTerm || hasActiveFilters()) ? 'Filtered Leads' : 'My Leads'}
          </h5>
          <Badge bg={(searchTerm || hasActiveFilters()) ? 'info' : 'primary'} pill>
            {displayLeads.length} {(searchTerm || hasActiveFilters()) ? 'filtered' : 'total'} leads
          </Badge>
        </Card.Header>
        <Card.Body>
          {displayLeads.length === 0 ? (
            <div className="text-center py-5">
              {(searchTerm || hasActiveFilters()) ? (
                <>
                  <p className="text-muted fs-5">No leads found matching your search criteria.</p>
                  <Button variant="outline-primary" onClick={clearAll}>
                    Clear Filters
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-muted fs-5">No leads assigned to you yet.</p>
                  <Button as={Link} to="/add-lead" variant="primary" size="lg">
                    Create Your First Lead
                  </Button>
                </>
              )}
            </div>
          ) : (
            <>
              <Table responsive striped hover>
                <thead className="table-dark">
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Contact Information</th>
                    <th>Status</th>
                    <th>Last Follow-up</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayLeads.map((lead, index) => (
                    <tr key={lead.id}>
                      <td>
                        <strong>{index + 1}</strong>
                      </td>
                      <td>
                        <strong>{lead.fullName}</strong>
                        {lead.propertyType && (
                          <div>
                            <small className="text-muted">{lead.propertyType}</small>
                          </div>
                        )}
                      </td>
                      <td>
                        <div>{lead.email}</div>
                        <small className="text-muted">{lead.mobileNo || 'No Mobile No'}</small>
                      </td>
                      <td>
                        <Badge bg={getStatusVariant(lead.status)} className="fs-6">
                          {lead.status}
                        </Badge>
                      </td>
                      <td>
                        {lead.followUps && lead.followUps.length > 0 ? (
                          new Date(lead.followUps[lead.followUps.length - 1].date.seconds * 1000).toLocaleDateString()
                        ) : (
                          <span className="text-muted">No follow-ups</span>
                        )}
                      </td>
                      <td>
                        <Button
                          as={Link}
                          to={`/lead/${lead.id}`}
                          variant="outline-primary"
                          size="sm"
                        >
                          <i className="bi bi-eye"></i>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
        </Card.Body>
      </Card>

      <Alert variant="warning">
        <Alert.Heading>Lead Entry Policy:</Alert.Heading>
        <p>
          Dear Team, please make sure every lead is added in the Lead CMS. Leads not entered in the system will not be considered for commission or follow-up. Keeping leads updated helps us track progress, ensure fairness, and avoid any disputes later. Thank you for your cooperation!
        </p>
      </Alert>
    </Container>
  );
};

export default LeadList;