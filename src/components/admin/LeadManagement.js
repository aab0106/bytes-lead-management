import React, { useState, useEffect } from 'react';
import {
  Container, Table, Button, Card, Badge, Alert, Spinner,
  Modal, Form, Row, Col, Dropdown, ButtonGroup, InputGroup,
  Pagination
} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { exportService } from '../../services/exportService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const LeadManagement = () => {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    source: ''
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [leadsPerPage, setLeadsPerPage] = useState(10);

  const { isAdmin, currentUser } = useAuth();
  const navigate = useNavigate();

  // Helper functions - moved before their usage
  const hasActiveFilters = () => {
    return Object.values(filters).some(value => value !== '');
  };

  const getActiveFilterCount = () => {
    return Object.values(filters).filter(value => value !== '').length;
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      source: ''
    });
  };

  const clearAll = () => {
    clearSearch();
    clearFilters();
    setCurrentPage(1);
  };

  const displayLeads = (searchTerm || hasActiveFilters()) ? filteredLeads : leads;

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/leads');
      return;
    }
    loadLeads();
  }, [isAdmin, navigate]);

  useEffect(() => {
    filterLeads();
    setCurrentPage(1); // Reset to first page when filters change
  }, [leads, searchTerm, filters]);

  const loadLeads = async () => {
    try {
      const leadsData = await adminService.getAllLeads();
      setLeads(leadsData);
      calculateLastUpdatedTime(leadsData);
    } catch (err) {
      setError('Error loading leads: ' + err.message);
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
        lead.assignedAgentEmail?.toLowerCase().includes(searchLower) ||
        lead.propertyType?.toLowerCase().includes(searchLower) ||
        lead.budget?.toString().includes(searchTerm) ||
        lead.id?.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(lead => lead.status === filters.status);
    }

    // Apply source filter
    if (filters.source) {
      filtered = filtered.filter(lead => lead.source === filters.source);
    }

    setFilteredLeads(filtered);
  };

  // Pagination logic
  const indexOfLastLead = currentPage * leadsPerPage;
  const indexOfFirstLead = indexOfLastLead - leadsPerPage;
  const currentLeads = (searchTerm || hasActiveFilters()) 
    ? filteredLeads.slice(indexOfFirstLead, indexOfLastLead)
    : leads.slice(indexOfFirstLead, indexOfLastLead);
  
  const totalLeads = (searchTerm || hasActiveFilters()) ? filteredLeads.length : leads.length;
  const totalPages = Math.ceil(totalLeads / leadsPerPage);

  // Generate page numbers for pagination
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  // Get visible page numbers (max 5 pages shown)
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const calculateLastUpdatedTime = (leadsData) => {
    if (!leadsData || leadsData.length === 0) {
      setLastUpdatedTime(null);
      return;
    }

    let latestTime = null;

    leadsData.forEach(lead => {
      let leadTime = null;

      if (lead.lastModified && lead.lastModified.seconds) {
        leadTime = new Date(lead.lastModified.seconds * 1000);
      }
      else if (lead.updatedAt && lead.updatedAt.seconds) {
        leadTime = new Date(lead.updatedAt.seconds * 1000);
      }
      else if (lead.createdAt && lead.createdAt.seconds) {
        leadTime = new Date(lead.createdAt.seconds * 1000);
      }

      if (leadTime && (!latestTime || leadTime > latestTime)) {
        latestTime = leadTime;
      }
    });

    setLastUpdatedTime(latestTime);
  };

  const handleExport = async (format = 'excel') => {
    try {
      setExportLoading(true);

      const dataToExport = (searchTerm || hasActiveFilters()) ? filteredLeads : leads;

      if (dataToExport.length === 0) {
        setError('No leads to export');
        return;
      }

      if (format === 'excel') {
        await exportService.exportLeadsToExcel(dataToExport, 'leads_export');
      } else {
        await exportService.exportLeadsToCSV(dataToExport, 'leads_export');
      }

      setError('');
    } catch (err) {
      setError('Error exporting leads: ' + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await adminService.updateLeadStatus(leadId, newStatus);
      await loadLeads();
      setError('');
    } catch (err) {
      setError('Error updating status: ' + err.message);
    }
  };

  const confirmDelete = (lead) => {
    setSelectedLead(lead);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    try {
      await adminService.deleteLead(selectedLead.id);
      await loadLeads();
      setShowDeleteModal(false);
      setSelectedLead(null);
      setError('');
    } catch (err) {
      setError('Error deleting lead: ' + err.message);
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

  const getSourceVariant = (source) => {
    switch (source) {
      case 'Website': return 'primary';
      case 'Referral': return 'success';
      case 'Social Media': return 'info';
      case 'Walk-in': return 'warning';
      case 'Call': return 'secondary';
      case 'Other': return 'dark';
      default: return 'dark';
    }
  };

  const formatLeadTime = (lead) => {
    if (lead.lastModified && lead.lastModified.seconds) {
      return new Date(lead.lastModified.seconds * 1000);
    }
    if (lead.updatedAt && lead.updatedAt.seconds) {
      return new Date(lead.updatedAt.seconds * 1000);
    }
    if (lead.createdAt && lead.createdAt.seconds) {
      return new Date(lead.createdAt.seconds * 1000);
    }
    return null;
  };

  if (!isAdmin()) {
    return (
      <Container>
        <Alert variant="danger">Access denied. Admin privileges required.</Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p>Loading leads...</p>
      </Container>
    );
  }

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <h2>Lead Management</h2>
          <p className="text-muted">View and manage all leads in the system</p>
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
                  {lastUpdatedTime && (
                  <div>
                    <small className="text-muted">
                      Last updated: {lastUpdatedTime.toLocaleTimeString()} {lastUpdatedTime.toLocaleDateString()}
                    </small>
                  </div>
                )}
                </div>
              </div>
            </Col>

            {/* Right Side - Search, Filters, Export (6 columns) */}
            <Col md={6}>
              <div className="d-flex gap-2 justify-content-end">
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
                    {/* Filter Dropdowns */}
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

                    {/* Source Filter */}
                    <Dropdown>
                      <Dropdown.Toggle
                        variant={filters.source ? "primary" : "outline-secondary"}
                        size="sm"
                        className="d-flex align-items-center"
                      >
                        <i className="bi bi-funnel me-1"></i>
                        Source
                      </Dropdown.Toggle>
                      <Dropdown.Menu>
                        <Dropdown.Item
                          onClick={() => setFilters(prev => ({ ...prev, source: '' }))}
                          className={!filters.source ? 'active' : ''}
                        >
                          All Sources
                        </Dropdown.Item>
                        <Dropdown.Divider />
                        <Dropdown.Item
                          onClick={() => setFilters(prev => ({ ...prev, source: 'Website' }))}
                          className={filters.source === 'Website' ? 'active' : ''}
                        >
                          Website
                        </Dropdown.Item>
                        <Dropdown.Item
                          onClick={() => setFilters(prev => ({ ...prev, source: 'Referral' }))}
                          className={filters.source === 'Referral' ? 'active' : ''}
                        >
                          Referral
                        </Dropdown.Item>
                        <Dropdown.Item
                          onClick={() => setFilters(prev => ({ ...prev, source: 'Social Media' }))}
                          className={filters.source === 'Social Media' ? 'active' : ''}
                        >
                          Social Media
                        </Dropdown.Item>
                        <Dropdown.Item
                          onClick={() => setFilters(prev => ({ ...prev, source: 'Walk-in' }))}
                          className={filters.source === 'Walk-in' ? 'active' : ''}
                        >
                          Walk-in
                        </Dropdown.Item>
                        <Dropdown.Item
                          onClick={() => setFilters(prev => ({ ...prev, source: 'Call' }))}
                          className={filters.source === 'Call' ? 'active' : ''}
                        >
                          Call
                        </Dropdown.Item>
                        <Dropdown.Item
                          onClick={() => setFilters(prev => ({ ...prev, source: 'Other' }))}
                          className={filters.source === 'Other' ? 'active' : ''}
                        >
                          Other
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                    {/* Export Button */}
                    <Dropdown as={ButtonGroup}>
                      <Button
                        variant="success"
                        disabled={exportLoading || displayLeads.length === 0}
                        onClick={() => handleExport('excel')}
                        size="sm"
                        className='d-flex gap-1'
                      >Export
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
                      <Dropdown.Toggle split variant="success" size="sm" />
                      <Dropdown.Menu>
                        <Dropdown.Item onClick={() => handleExport('excel')}>
                          <i className="bi bi-file-earmark-excel me-2"></i>
                          Export to Excel
                        </Dropdown.Item>
                        <Dropdown.Item onClick={() => handleExport('csv')}>
                          <i className="bi bi-file-earmark-text me-2"></i>
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

                  {filters.source && (
                    <Badge bg="secondary" className="d-flex align-items-center px-2 py-1">
                      Source: {filters.source}
                      <Button
                        variant="link"
                        className="text-white p-0 ms-2 border-0"
                        style={{ fontSize: '0.7em' }}
                        onClick={() => setFilters(prev => ({ ...prev, source: '' }))}
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

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Leads Table Card */}
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            {(searchTerm || hasActiveFilters()) ? 'Filtered Leads' : 'All Leads'}
          </h5>
          <div className="d-flex align-items-center gap-3">
            <Badge bg={(searchTerm || hasActiveFilters()) ? 'info' : 'primary'} pill>
              {displayLeads.length} {(searchTerm || hasActiveFilters()) ? 'filtered' : 'total'} leads
            </Badge>
            
            {/* Items per page selector */}
            <div className="d-flex align-items-center">
              <small className="text-muted me-2">Show:</small>
              <Form.Select 
                size="sm" 
                style={{ width: '80px' }}
                value={leadsPerPage}
                onChange={(e) => {
                  setLeadsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </Form.Select>
            </div>
          </div>
        </Card.Header>
          {displayLeads.length === 0 ? (
            <Alert variant="info">
              {(searchTerm || hasActiveFilters()) ? 'No leads found matching your search criteria.' : 'No leads found in the system.'}
              {(searchTerm || hasActiveFilters()) && (
                <Button variant="outline-primary" className="ms-2" onClick={clearAll}>
                  Clear Filters
                </Button>
              )}
              {!searchTerm && !hasActiveFilters() && (
                <Button variant="outline-primary" className="ms-2" as="a" href="/add-lead">
                  Create First Lead
                </Button>
              )}
            </Alert>
          ) : (
            <>
              <Table responsive striped hover>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Lead Info</th>
                    <th>Contact</th>
                    <th>Source</th>
                    <th>Assigned Agent</th>
                    <th>Status</th>
                    <th>Last Action</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentLeads.map((lead, index) => {
                    const leadTime = formatLeadTime(lead);
                    const actualIndex = indexOfFirstLead + index;

                    return (
                      <tr key={lead.id}>
                        <td>
                          <strong>{actualIndex + 1}</strong>
                        </td>
                        <td>
                          <strong>{lead.fullName}</strong>
                          <br />
                          <small className="text-muted">{lead.propertyType} • Rs.{lead.budget?.toLocaleString()}</small>
                        </td>
                        <td>
                          <div>{lead.email}</div>
                          <small className="text-muted">{lead.mobileNo}</small>
                        </td>
                        <td>
                          <Badge bg={getSourceVariant(lead.source)}>
                            {lead.source || 'Unknown'}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg="light" text="dark">
                            {lead.assignedAgentEmail || 'Unassigned'}
                          </Badge>
                        </td>
                        <td>
                          <Form.Select
                            size="sm"
                            value={lead.status}
                            onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          >
                            <option value="New">New</option>
                            <option value="Contacted">Contacted</option>
                            <option value="Visited">Visited</option>
                            <option value="Qualified">Qualified</option>
                            <option value="Closed">Closed</option>
                            <option value="Lost">Lost</option>
                          </Form.Select>
                        </td>
                        <td>
                          {leadTime ? (
                            <small className="text-muted">
                              {leadTime.toLocaleTimeString()}
                              <br />
                              {leadTime.toLocaleDateString()}
                            </small>
                          ) : (
                            <small className="text-muted">N/A</small>
                          )}
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <Button
                              as={Link}
                              to={`/lead/${lead.id}`}
                              variant="outline-primary"
                              size="sm"
                            >
                              <i className="bi bi-eye"></i>
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => confirmDelete(lead)}
                            >
                              <i className="bi bi-trash"></i>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-4">
                  <div>
                    <small className="text-muted">
                      Showing {indexOfFirstLead + 1} to {Math.min(indexOfLastLead, totalLeads)} of {totalLeads} entries
                    </small>
                  </div>
                  
                  <Pagination className="mb-0">
                    <Pagination.First 
                      onClick={() => setCurrentPage(1)} 
                      disabled={currentPage === 1}
                    />
                    <Pagination.Prev 
                      onClick={() => setCurrentPage(currentPage - 1)} 
                      disabled={currentPage === 1}
                    />
                    
                    {getVisiblePages().map((page, index) => (
                      page === '...' ? (
                        <Pagination.Ellipsis key={index} disabled />
                      ) : (
                        <Pagination.Item
                          key={index}
                          active={page === currentPage}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Pagination.Item>
                      )
                    ))}
                    
                    <Pagination.Next 
                      onClick={() => setCurrentPage(currentPage + 1)} 
                      disabled={currentPage === totalPages}
                    />
                    <Pagination.Last 
                      onClick={() => setCurrentPage(totalPages)} 
                      disabled={currentPage === totalPages}
                    />
                  </Pagination>
                </div>
              )}
            </>
          )}
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete lead for <strong>{selectedLead?.fullName}</strong>?
          This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete Lead
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default LeadManagement;