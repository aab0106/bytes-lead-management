import React, { useState, useEffect } from 'react';
import {
  Container, Table, Button, Card, Badge, Alert, Spinner,
  Modal, Form, Row, Col, Dropdown, ButtonGroup, InputGroup,
  Pagination
} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { adminService } from '../../services/adminService';
import { exportService } from '../../services/exportService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../layout/AdminLayout';
import styles from './LeadManagement.module.css';

const LeadManagement = () => {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [importMethod, setImportMethod] = useState('csv');
  const [importFile, setImportFile] = useState(null);
  const [importData, setImportData] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [bulkAssignLoading, setBulkAssignLoading] = useState(false);
  const [assignOnImport, setAssignOnImport] = useState(false);
  const [importAgent, setImportAgent] = useState('');
  const [lastUpdatedTime, setLastUpdatedTime] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    source: ''
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [leadsPerPage, setLeadsPerPage] = useState(10);

  const { isAdmin, currentUser } = useAuth();
  const navigate = useNavigate();

  // Helper functions
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
    setSelectedLeads(new Set());
  };

  const displayLeads = (searchTerm || hasActiveFilters()) ? filteredLeads : leads;

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/leads');
      return;
    }
    loadLeads();
    loadAgents();
  }, [isAdmin, navigate]);

  useEffect(() => {
    filterLeads();
    setCurrentPage(1);
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

  const loadAgents = async () => {
    try {
      const agentsData = await adminService.getAllAgents();
      setAgents(agentsData.filter(agent => !agent.blocked && agent.isActive));
    } catch (err) {
      console.error('Error loading agents:', err);
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

  // Selection handlers
  const handleSelectLead = (leadId) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedLeads.size === currentLeads.length) {
      setSelectedLeads(new Set());
    } else {
      const allIds = new Set(currentLeads.map(lead => lead.id));
      setSelectedLeads(allIds);
    }
  };

  // Bulk assignment
  const handleBulkAssign = async () => {
    if (!selectedAgent) {
      setError('Please select an agent to assign leads');
      return;
    }

    if (selectedLeads.size === 0) {
      setError('Please select at least one lead to assign');
      return;
    }

    try {
      setBulkAssignLoading(true);
      const agent = agents.find(a => a.id === selectedAgent);
      await adminService.bulkAssignLeads(
        Array.from(selectedLeads), 
        selectedAgent, 
        agent.email,
        currentUser.uid
      );
      
      setSelectedLeads(new Set());
      setSelectedAgent('');
      setShowBulkAssignModal(false);
      await loadLeads();
      setError('');
    } catch (err) {
      setError('Error assigning leads: ' + err.message);
    } finally {
      setBulkAssignLoading(false);
    }
  };

 const handleImportLeads = async () => {
  try {
    setImportLoading(true);
    setError('');
    setImportResult(null);
    
    let leadsData = [];

    if (importMethod === 'csv' && importData.trim()) {
      // Parse CSV data
      const lines = importData.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      leadsData = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const lead = {};
        headers.forEach((header, index) => {
          lead[header] = values[index] || '';
        });
        return lead;
      });
    } else if (importMethod === 'excel' && importFile) {
      // Parse Excel file
      const reader = new FileReader();
      const promise = new Promise((resolve, reject) => {
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            resolve(jsonData);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
      });

      reader.readAsArrayBuffer(importFile);
      leadsData = await promise;
    } else {
      setError('Please provide data to import');
      return;
    }

    if (leadsData.length === 0) {
      setError('No valid data found to import');
      return;
    }

    // Process import with assignment if selected
    let importResult;
    if (assignOnImport && importAgent) {
      const agent = agents.find(a => a.id === importAgent);
      if (!agent) {
        setError('Selected agent not found');
        return;
      }
      
      // Import and assign in batch
      importResult = await adminService.importAndAssignLeads(
        leadsData, 
        importAgent, 
        agent.email,
        currentUser.uid
      );
    } else {
      // Regular import
      importResult = await adminService.importLeads(leadsData, currentUser.uid);
    }

    setImportResult(importResult);
    setImportData('');
    setImportFile(null);
    setImportAgent('');
    setAssignOnImport(false);
    
    await loadLeads();
    
  } catch (err) {
    setError('Error importing leads: ' + err.message);
  } finally {
    setImportLoading(false);
  }
};

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check if file is Excel
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        setError('Please upload a valid Excel file (.xlsx or .xls)');
        return;
      }
      
      setImportFile(file);
      setError('');
    }
  };

  // Pagination logic
  const indexOfLastLead = currentPage * leadsPerPage;
  const indexOfFirstLead = indexOfLastLead - leadsPerPage;
  const currentLeads = (searchTerm || hasActiveFilters()) 
    ? filteredLeads.slice(indexOfFirstLead, indexOfLastLead)
    : leads.slice(indexOfFirstLead, indexOfLastLead);
  
  const totalLeads = (searchTerm || hasActiveFilters()) ? filteredLeads.length : leads.length;
  const totalPages = Math.ceil(totalLeads / leadsPerPage);

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
      await adminService.updateLeadStatus(leadId, newStatus, currentUser.uid);
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
      await adminService.deleteLead(selectedLead.id, currentUser.uid);
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
      <AdminLayout>
        <Container>
          <Alert variant="danger">Access denied. Admin privileges required.</Alert>
        </Container>
      </AdminLayout>
    );
  }

  if (loading) {
    return (
      <AdminLayout>
        <Container className="text-center mt-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p>Loading leads...</p>
        </Container>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
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
              {/* Left Side - Stats */}
              <Col md={6}>
                <div className="d-flex flex-column">
                  <div className="mb-1">
                    <strong className="fs-6">Total Leads: {leads.length}</strong>
                    {(searchTerm || hasActiveFilters()) && (
                      <span className="text-primary ms-2">
                        • Showing: {filteredLeads.length}
                      </span>
                    )}
                    {selectedLeads.size > 0 && (
                      <span className="text-success ms-2">
                        • Selected: {selectedLeads.size}
                      </span>
                    )}
                  </div>
                  {lastUpdatedTime && (
                    <div>
                      <small className="text-muted">
                        Last updated: {lastUpdatedTime.toLocaleTimeString()} {lastUpdatedTime.toLocaleDateString()}
                      </small>
                    </div>
                  )}
                </div>
              </Col>

              {/* Right Side - Actions */}
              <Col md={6}>
                <div className="d-flex gap-2 justify-content-end flex-wrap">
                  {/* Search */}
                  <InputGroup size="sm" style={{ width: '200px' }}>
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

                  {/* Bulk Actions */}
                  {selectedLeads.size > 0 && (
                    <Button
                      variant="warning"
                      size="sm"
                      onClick={() => setShowBulkAssignModal(true)}
                    >
                      <i className="bi bi-person-plus me-1"></i>
                      Assign Selected ({selectedLeads.size})
                    </Button>
                  )}

                  {/* Import Button */}
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => setShowImportModal(true)}
                  >
                    <i className="bi bi-upload me-1"></i>
                    Import Leads
                  </Button>

                  {/* Export Button */}
                  <Dropdown as={ButtonGroup}>
                    <Button
                      variant="success"
                      disabled={exportLoading || displayLeads.length === 0}
                      onClick={() => handleExport('excel')}
                      size="sm"
                    >
                      {exportLoading ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        <>
                          <i className="bi bi-download me-1"></i>
                          Export
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

            {/* Filters Row */}
            <Row className="mt-3">
              <Col>
                <div className="d-flex gap-2 flex-wrap">
                  {/* Status Filter */}
                  <Dropdown>
                    <Dropdown.Toggle
                      variant={filters.status ? "primary" : "outline-secondary"}
                      size="sm"
                    >
                      <i className="bi bi-funnel me-1"></i>
                      Status
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item onClick={() => setFilters(prev => ({ ...prev, status: '' }))}>
                        All Statuses
                      </Dropdown.Item>
                      <Dropdown.Divider />
                      {['New', 'Contacted', 'Visited', 'Qualified', 'Closed', 'Lost'].map(status => (
                        <Dropdown.Item
                          key={status}
                          onClick={() => setFilters(prev => ({ ...prev, status }))}
                          active={filters.status === status}
                        >
                          {status}
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Menu>
                  </Dropdown>

                  {/* Source Filter */}
                  <Dropdown>
                    <Dropdown.Toggle
                      variant={filters.source ? "primary" : "outline-secondary"}
                      size="sm"
                    >
                      <i className="bi bi-funnel me-1"></i>
                      Source
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item onClick={() => setFilters(prev => ({ ...prev, source: '' }))}>
                        All Sources
                      </Dropdown.Item>
                      <Dropdown.Divider />
                      {['Website', 'Referral', 'Social Media', 'Walk-in', 'Call', 'Other'].map(source => (
                        <Dropdown.Item
                          key={source}
                          onClick={() => setFilters(prev => ({ ...prev, source }))}
                          active={filters.source === source}
                        >
                          {source}
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Menu>
                  </Dropdown>

                  {/* Clear All */}
                  {(searchTerm || hasActiveFilters() || selectedLeads.size > 0) && (
                    <Button variant="outline-danger" size="sm" onClick={clearAll}>
                      Clear All
                    </Button>
                  )}
                </div>
              </Col>
            </Row>
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
                </Form.Select>
              </div>
            </div>
          </Card.Header>

          {displayLeads.length === 0 ? (
            <Alert variant="info" className="m-3">
              {(searchTerm || hasActiveFilters()) ? 'No leads found matching your search criteria.' : 'No leads found in the system.'}
              {(searchTerm || hasActiveFilters()) && (
                <Button variant="outline-primary" className="ms-2" onClick={clearAll}>
                  Clear Filters
                </Button>
              )}
            </Alert>
          ) : (
            <>
              <Table responsive striped hover className="mb-0">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <Form.Check
                        type="checkbox"
                        checked={selectedLeads.size === currentLeads.length && currentLeads.length > 0}
                        onChange={handleSelectAll}
                        indeterminate={selectedLeads.size > 0 && selectedLeads.size < currentLeads.length}
                      />
                    </th>
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
                          <Form.Check
                            type="checkbox"
                            checked={selectedLeads.has(lead.id)}
                            onChange={() => handleSelectLead(lead.id)}
                          />
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
                          {lead.assignedAgentEmail ? (
                            <Badge bg="success">
                              {lead.assignedAgentEmail}
                            </Badge>
                          ) : (
                            <Badge bg="secondary">Unassigned</Badge>
                          )}
                        </td>
                        <td>
                          <Form.Select
                            size="sm"
                            value={lead.status}
                            onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                            style={{ width: '120px' }}
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
                              to={`/admin/leads/${lead.id}`}
                              variant="outline-primary"
                              size="sm"
                              title="View Lead"
                            >
                              <i className="bi bi-eye"></i>
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => confirmDelete(lead)}
                              title="Delete Lead"
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
                <div className="d-flex justify-content-between align-items-center p-3 border-top">
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
                    
                    {[...Array(totalPages)].map((_, index) => (
                      <Pagination.Item
                        key={index + 1}
                        active={index + 1 === currentPage}
                        onClick={() => setCurrentPage(index + 1)}
                      >
                        {index + 1}
                      </Pagination.Item>
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

        {/* Import Leads Modal */}
        <Modal show={showImportModal} onHide={() => {
  setShowImportModal(false);
  setImportResult(null);
}} size="lg">
  <Modal.Header closeButton>
    <Modal.Title>Import Leads</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    {/* Show import results if available */}
    {importResult && (
      <Alert variant={importResult.summary.duplicates > 0 ? "warning" : "success"}>
        <strong>Import Summary:</strong>
        <br />
        ✅ Imported: {importResult.summary.imported} leads
        <br />
        {importResult.summary.duplicates > 0 && (
          <>
            ⚠️ Skipped: {importResult.summary.duplicates} duplicates
            <br />
            <small className="text-muted">
              Duplicate leads were skipped to maintain data integrity.
            </small>
          </>
        )}
      </Alert>
    )}

    {/* Import Method Selection */}
    <Form.Group className="mb-3">
      <Form.Label>Import Method</Form.Label>
      <div>
        <Form.Check
          inline
          type="radio"
          label="CSV Text"
          name="importMethod"
          value="csv"
          checked={importMethod === 'csv'}
          onChange={(e) => setImportMethod(e.target.value)}
        />
        <Form.Check
          inline
          type="radio"
          label="Excel File"
          name="importMethod"
          value="excel"
          checked={importMethod === 'excel'}
          onChange={(e) => setImportMethod(e.target.value)}
        />
      </div>
    </Form.Group>

    {/* CSV Input */}
    {importMethod === 'csv' && (
      <Form.Group className="mb-3">
        <Form.Label>Paste CSV Data</Form.Label>
        <Form.Control
          as="textarea"
          rows={8}
          placeholder="Paste CSV data with headers: fullName,email,mobileNo,propertyType,budget,location,source,notes"
          value={importData}
          onChange={(e) => setImportData(e.target.value)}
        />
        <Form.Text className="text-muted">
          Format: CSV with headers on first line. Example:<br />
          fullName,email,mobileNo,propertyType,budget,location,source,notes<br />
          John Doe,john@example.com,1234567890,Apartment,5000000,New York,Website,Interested in 2BHK
        </Form.Text>
      </Form.Group>
    )}

    {/* Excel File Input */}
    {importMethod === 'excel' && (
      <Form.Group className="mb-3">
        <Form.Label>Upload Excel File</Form.Label>
        <Form.Control
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
        />
        <Form.Text className="text-muted">
          Upload Excel file with columns: fullName, email, mobileNo, propertyType, budget, location, source, notes
        </Form.Text>
        {importFile && (
          <div className="mt-2">
            <Badge bg="success">Selected: {importFile.name}</Badge>
          </div>
        )}
      </Form.Group>
    )}

    {/* Assignment Option */}
    <Form.Group className="mb-3">
      <Form.Check
        type="checkbox"
        label="Assign imported leads to agent"
        checked={assignOnImport}
        onChange={(e) => setAssignOnImport(e.target.checked)}
      />
    </Form.Group>

    {assignOnImport && (
      <Form.Group className="mb-3">
        <Form.Label>Select Agent</Form.Label>
        <Form.Select 
          value={importAgent} 
          onChange={(e) => setImportAgent(e.target.value)}
        >
          <option value="">Choose an agent...</option>
          {agents.map(agent => (
            <option key={agent.id} value={agent.id}>
              {agent.firstName} {agent.lastName} ({agent.email})
            </option>
          ))}
        </Form.Select>
      </Form.Group>
    )}
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={() => {
      setShowImportModal(false);
      setImportResult(null);
    }}>
      Cancel
    </Button>
    <Button 
      variant="primary" 
      onClick={handleImportLeads}
      disabled={importLoading || 
        (importMethod === 'csv' && !importData.trim()) || 
        (importMethod === 'excel' && !importFile) ||
        (assignOnImport && !importAgent)
      }
    >
      {importLoading ? (
        <>
          <Spinner animation="border" size="sm" className="me-2" />
          Importing...
        </>
      ) : (
        'Import Leads'
      )}
    </Button>
  </Modal.Footer>
</Modal>

        {/* Bulk Assign Modal */}
        <Modal show={showBulkAssignModal} onHide={() => setShowBulkAssignModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Bulk Assign Leads</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group>
              <Form.Label>Select Agent</Form.Label>
              <Form.Select 
                value={selectedAgent} 
                onChange={(e) => setSelectedAgent(e.target.value)}
              >
                <option value="">Choose an agent...</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.firstName} {agent.lastName} ({agent.email})
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Assigning {selectedLeads.size} selected leads to the chosen agent.
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowBulkAssignModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="warning" 
              onClick={handleBulkAssign}
              disabled={bulkAssignLoading || !selectedAgent}
            >
              {bulkAssignLoading ? 'Assigning...' : `Assign ${selectedLeads.size} Leads`}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </AdminLayout>
  );
};

export default LeadManagement;