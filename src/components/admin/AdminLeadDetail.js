import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Card, Button, Form, Row, Col, Badge,
  Alert, Spinner, Tabs, Tab, Table
} from 'react-bootstrap';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';
import FollowUps from '../followups/FollowUps';

const AdminLeadDetail = () => {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [error, setError] = useState('');
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const { isAdmin } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        // Check admin permissions
        if (!isAdmin()) {
          throw new Error('Access denied: Admin privileges required');
        }

        // Fetch lead data
        const leadData = await adminService.getLeadById(leadId);
        if (!leadData) {
          throw new Error('Lead not found');
        }

        setLead(leadData);
        setStatus(leadData.status);
        setSelectedAgent(leadData.assignedAgentEmail || '');

        // Fetch agents for assignment
        const agentsData = await adminService.getAllAgents();
        setAgents(agentsData);

      } catch (err) {
        setError(err.message);
        console.error('Error fetching lead details:', err);
      } finally {
        setLoading(false);
      }
    };

    if (leadId) {
      fetchData();
    }
  }, [leadId, isAdmin]);

  const updateStatus = async () => {
    try {
      await adminService.updateLeadStatus(leadId, status);
      setLead(prev => ({ ...prev, status }));
      setError('');
    } catch (err) {
      setError('Error updating status: ' + err.message);
    }
  };

  const assignToAgent = async () => {
    try {
      if (!selectedAgent) {
        setError('Please select an agent');
        return;
      }

      await adminService.assignLeadToAgent(leadId, selectedAgent);
      setLead(prev => ({ ...prev, assignedAgentEmail: selectedAgent }));
      setError('');
      
      // Show success message
      setError(''); // Clear any existing errors
      // You could add a success toast here
    } catch (err) {
      setError('Error assigning agent: ' + err.message);
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

  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    try {
      if (date.seconds) {
        return new Date(date.seconds * 1000).toLocaleString();
      }
      return new Date(date).toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      if (date.seconds) {
        return new Date(date.seconds * 1000).toLocaleDateString();
      }
      return new Date(date).toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  const getTimeAgo = (date) => {
    if (!date) return 'N/A';
    try {
      const dateObj = date?.toDate?.() || new Date(date);
      const now = new Date();
      const diffMs = now - dateObj;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return `${Math.floor(diffDays / 30)} months ago`;
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <Container className="text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p>Loading lead details...</p>
      </Container>
    );
  }

  if (error && error.includes('Access denied')) {
    return (
      <Container>
        <Alert variant="danger">
          <Alert.Heading>Access Denied</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={() => navigate('/admin')}>
            Back to Admin Dashboard
          </Button>
        </Alert>
      </Container>
    );
  }

  if (!lead) {
    return (
      <Container>
        <Alert variant="warning">
          <Alert.Heading>Lead Not Found</Alert.Heading>
          <p>The lead you're looking for doesn't exist or has been deleted.</p>
          <Button variant="outline-warning" onClick={() => navigate('/admin')}>
            Back to Admin Dashboard
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid>
      {/* Header */}
      <Row className="mb-3">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <Button variant="outline-primary" onClick={() => navigate('/admin')}>
                ← Back to Admin Dashboard
              </Button>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <Badge bg="info" className="fs-6">
                Admin View
              </Badge>
              <Badge bg={getStatusVariant(lead.status)} className="fs-6">
                {lead.status}
              </Badge>
            </div>
          </div>
        </Col>
      </Row>

      {error && !error.includes('Access denied') && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Quick Stats */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title className="text-primary">
                {lead.followUps?.length || 0}
              </Card.Title>
              <Card.Text>Total Follow-ups</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title className="text-success">
                {lead.followUps?.filter(f => f.status === 'completed').length || 0}
              </Card.Title>
              <Card.Text>Completed</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title className="text-warning">
                {lead.followUps?.filter(f => f.status === 'scheduled').length || 0}
              </Card.Title>
              <Card.Text>Scheduled</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title className="text-info">
                {getTimeAgo(lead.createdAt)}
              </Card.Title>
              <Card.Text>Created</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Tabs
        activeKey={activeTab}
        onSelect={(tab) => setActiveTab(tab)}
        className="mb-3"
        fill
      >
        {/* Lead Details Tab */}
        <Tab eventKey="details" title="Lead Details">
          <Row>
            <Col md={8}>
              <Card className="mb-4">
                <Card.Header>
                  <h5 className="mb-0">Lead Information</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <h6>Personal Information</h6>
                      <hr />
                      <p><strong>Full Name:</strong> {lead.fullName}</p>
                      <p><strong>Email:</strong> {lead.email}</p>
                      <p><strong>Phone:</strong> {lead.mobileNo}</p>
                      <p><strong>Assigned Agent:</strong> 
                        {lead.assignedAgentEmail ? (
                          <Badge bg="success" className="ms-2">{lead.assignedAgentEmail}</Badge>
                        ) : (
                          <Badge bg="secondary" className="ms-2">Not assigned</Badge>
                        )}
                      </p>
                    </Col>
                    <Col md={6}>
                      <h6>Property Requirements</h6>
                      <hr />
                      <p><strong>Property Type:</strong> {lead.propertyType}</p>
                      <p><strong>Budget:</strong> Rs.{lead.budget?.toLocaleString()}</p>
                      <p><strong>Location:</strong> {lead.location}</p>
                      <p><strong>Source:</strong> {lead.source}</p>
                    </Col>
                  </Row>
                  
                  {lead.notes && (
                    <Row className="mt-3">
                      <Col>
                        <h6>Additional Notes</h6>
                        <hr />
                        <Card className="bg-light">
                          <Card.Body>
                            {lead.notes}
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col md={4}>
              {/* Status Update Card */}
              <Card className="mb-4">
                <Card.Header>
                  <h6 className="mb-0">Update Lead Status</h6>
                </Card.Header>
                <Card.Body>
                  <Form.Group className="mb-3">
                    <Form.Label>Current Status</Form.Label>
                    <div>
                      <Badge bg={getStatusVariant(lead.status)} className="fs-6">
                        {lead.status}
                      </Badge>
                    </div>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Change Status</Form.Label>
                    <Form.Select 
                      value={status} 
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Visited">Visited</option>
                      <option value="Qualified">Qualified</option>
                      <option value="Closed">Closed</option>
                      <option value="Lost">Lost</option>
                    </Form.Select>
                  </Form.Group>
                  <Button 
                    variant="primary" 
                    onClick={updateStatus} 
                    className="w-100"
                    disabled={status === lead.status}
                  >
                    Update Status
                  </Button>
                </Card.Body>
              </Card>

              {/* Agent Assignment Card */}
              <Card>
                <Card.Header>
                  <h6 className="mb-0">Assign to Agent</h6>
                </Card.Header>
                <Card.Body>
                  <Form.Group className="mb-3">
                    <Form.Label>Select Agent</Form.Label>
                    <Form.Select 
                      value={selectedAgent} 
                      onChange={(e) => setSelectedAgent(e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {agents.map(agent => (
                        <option key={agent.id} value={agent.email}>
                          {agent.name} ({agent.email})
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  <Button 
                    variant="warning" 
                    onClick={assignToAgent} 
                    className="w-100"
                    disabled={selectedAgent === lead.assignedAgentEmail}
                  >
                    {selectedAgent === lead.assignedAgentEmail ? 'Already Assigned' : 'Assign Agent'}
                  </Button>
                </Card.Body>
              </Card>

              {/* Timeline Card */}
              <Card className="mt-4">
                <Card.Header>
                  <h6 className="mb-0">Timeline</h6>
                </Card.Header>
                <Card.Body>
                  <p><strong>Created:</strong> {formatDateTime(lead.createdAt)}</p>
                  {lead.assignedAt && (
                    <p><strong>Assigned:</strong> {formatDateTime(lead.assignedAt)}</p>
                  )}
                  {lead.updatedAt && (
                    <p><strong>Last Updated:</strong> {formatDateTime(lead.updatedAt)}</p>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        {/* Follow-ups Tab */}
        <Tab eventKey="followups" title={
          <span>
            Follow-ups
            {lead.followUps && lead.followUps.length > 0 && (
              <Badge bg="primary" className="ms-2">
                {lead.followUps.length}
              </Badge>
            )}
          </span>
        }>
          <FollowUps leadId={leadId} />
        </Tab>

        {/* Raw Data Tab (for debugging) */}
        <Tab eventKey="rawdata" title="Raw Data">
          <Card>
            <Card.Header>
              <h5 className="mb-0">Raw Lead Data</h5>
            </Card.Header>
            <Card.Body>
              <pre className="bg-light p-3 rounded">
                {JSON.stringify(lead, null, 2)}
              </pre>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default AdminLeadDetail;