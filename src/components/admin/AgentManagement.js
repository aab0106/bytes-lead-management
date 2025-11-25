import React, { useState, useEffect } from 'react';
import {
  Container, Table, Button, Card, Badge, Alert, Spinner,
  Modal, Form, Row, Col, Dropdown
} from 'react-bootstrap';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../layout/AdminLayout';
import styles from './AgentManagement.module.css';

const AgentManagement = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState(''); // FIXED: Separate error for modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'agent'
  });

  const { isAdmin } = useAuth();

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const agentsData = await adminService.getAllAgents();
      setAgents(agentsData);
    } catch (err) {
      setError('Error loading agents: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setModalError(''); // FIXED: Clear modal error before new attempt

    try {
      await adminService.createAgent(formData);
      
      // Reset form and close modal
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'agent'
      });
      setShowCreateModal(false);
      setModalError('');
      
      // Reload agents list
      await loadAgents();
    } catch (err) {
      // FIXED: Set modal error instead of main error
      setModalError('Error creating agent: ' + err.message);
      console.error('Agent creation error:', err);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteAgent = async () => {
    try {
      await adminService.deleteAgent(selectedAgent.id);
      setShowDeleteModal(false);
      setSelectedAgent(null);
      await loadAgents();
      setError('');
    } catch (err) {
      setError('Error deleting agent: ' + err.message);
    }
  };

  const handleToggleBlock = async (agentId, currentStatus) => {
    try {
      await adminService.updateAgentStatus(agentId, !currentStatus);
      await loadAgents();
      setError('');
    } catch (err) {
      setError('Error updating agent: ' + err.message);
    }
  };

  const openDeleteModal = (agent) => {
    setSelectedAgent(agent);
    setShowDeleteModal(true);
  };

  const openCreateModal = () => {
    setModalError(''); // FIXED: Clear previous modal errors when opening
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setModalError(''); // FIXED: Clear errors when closing modal
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'agent'
    });
  };

  const getStatusVariant = (status) => {
    return status ? 'success' : 'danger';
  };

  const getStatusText = (status) => {
    return status ? 'Active' : 'Blocked';
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

  return (
    <AdminLayout>
      <Container>
        <Row className="mb-4">
          <Col>
            <h2>Agent Management</h2>
            <p className="text-muted">Manage your sales agents and their permissions</p>
          </Col>
          <Col xs="auto">
            <Button variant="primary" onClick={openCreateModal}>
              <i className="bi bi-person-plus me-2"></i>
              Create New Agent
            </Button>
          </Col>
        </Row>

        {error && <Alert variant="danger">{error}</Alert>}

        <Card>
          <Card.Header>
            <h5 className="mb-0">All Agents ({agents.length})</h5>
          </Card.Header>
          
          {loading ? (
            <div className="text-center p-4">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
              <p className="mt-2">Loading agents...</p>
            </div>
          ) : agents.length === 0 ? (
            <Alert variant="info" className="m-3">
              No agents found. Create your first agent to get started.
            </Alert>
          ) : (
            <Table responsive striped hover>
              <thead>
                <tr>
                  <th>Agent Info</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id}>
                    <td>
                      <strong>{agent.firstName} {agent.lastName}</strong>
                      <br />
                      <small className="text-muted">{agent.email}</small>
                    </td>
                    <td>
                      {agent.phone || 'N/A'}
                    </td>
                    <td>
                      <Badge bg={getStatusVariant(agent.isActive)}>
                        {getStatusText(agent.isActive)}
                      </Badge>
                      {agent.blocked && (
                        <Badge bg="danger" className="ms-1">
                          Blocked
                        </Badge>
                      )}
                    </td>
                    <td>
                      <Badge bg="secondary">{agent.role || 'agent'}</Badge>
                    </td>
                    <td>
                      <small className="text-muted">
                        {agent.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}
                      </small>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <Button
                          variant={agent.isActive ? "warning" : "success"}
                          size="sm"
                          onClick={() => handleToggleBlock(agent.id, agent.isActive)}
                          title={agent.isActive ? "Block Agent" : "Activate Agent"}
                        >
                          <i className={`bi bi-${agent.isActive ? 'lock' : 'unlock'}`}></i>
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => openDeleteModal(agent)}
                          title="Delete Agent"
                        >
                          <i className="bi bi-trash"></i>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        {/* Create Agent Modal - FIXED: Error display inside modal */}
        <Modal show={showCreateModal} onHide={closeCreateModal}>
          <Form onSubmit={handleCreateAgent}>
            <Modal.Header closeButton>
              <Modal.Title>Create New Agent</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {/* FIXED: Error displayed inside modal */}
              {modalError && (
                <Alert variant="danger" className="mb-3">
                  {modalError}
                </Alert>
              )}
              
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>First Name *</Form.Label>
                    <Form.Control
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        firstName: e.target.value 
                      }))}
                      placeholder="Enter first name"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Last Name *</Form.Label>
                    <Form.Control
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        lastName: e.target.value 
                      }))}
                      placeholder="Enter last name"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Email Address *</Form.Label>
                <Form.Control
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    email: e.target.value 
                  }))}
                  placeholder="Enter email address"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Phone Number</Form.Label>
                <Form.Control
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    phone: e.target.value 
                  }))}
                  placeholder="Enter phone number"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Role</Form.Label>
                <Form.Select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    role: e.target.value 
                  }))}
                >
                  <option value="agent">Agent</option>
                  <option value="senior-agent">Senior Agent</option>
                  <option value="team-lead">Team Lead</option>
                </Form.Select>
              </Form.Group>

              <Alert variant="info" className="mb-0">
                <small>
                  The agent will receive an email with instructions to set up their password and access the system.
                </small>
              </Alert>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={closeCreateModal}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                type="submit"
                disabled={createLoading}
              >
                {createLoading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Creating...
                  </>
                ) : (
                  'Create Agent'
                )}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Delete</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Are you sure you want to delete agent <strong>{selectedAgent?.firstName} {selectedAgent?.lastName}</strong>?
            This action cannot be undone and will remove all associated data.
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteAgent}>
              Delete Agent
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </AdminLayout>
  );
};

export default AgentManagement;