import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Table, Badge, Modal, Form } from 'react-bootstrap';
import AdminLayout from '../layout/AdminLayout';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './AdminSettings.module.css';

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState('agents');
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const tab = searchParams.get('tab') || 'agents';
    setActiveTab(tab);
    
    if (tab === 'agents') {
      loadAgents();
    }
  }, [searchParams]);

  useEffect(() => {
    const create = searchParams.get('create');
    if (create === 'true') {
      setShowCreateModal(true);
      // Remove the create parameter from URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('create');
      setSearchParams(newParams);
    }
  }, [searchParams, setSearchParams]);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const agentsData = await adminService.getAllAgents();
      setAgents(agentsData);
    } catch (err) {
      setError('Error loading agents: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const newParams = new URLSearchParams();
    newParams.set('tab', tab);
    setSearchParams(newParams);
  };

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setCreateLoading(true);
    setError('');

    try {
      await adminService.createAgent(formData, currentUser.uid);
      
      // Reset form and close modal
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
      });
      setShowCreateModal(false);
      
      // Reload agents list
      await loadAgents();
      
      // Show success message
      setError('');
    } catch (err) {
      setError('Error creating agent: ' + err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleBlockUnblock = async (agentId, block) => {
    try {
      await adminService.blockUnblockAgent(agentId, block, currentUser.uid);
      await loadAgents();
      setShowBlockModal(false);
      setSelectedAgent(null);
      setError('');
    } catch (err) {
      setError('Error updating agent: ' + err.message);
    }
  };

  const handleDeleteAgent = async (agentId) => {
    if (window.confirm('Are you sure you want to delete this agent? This action cannot be undone.')) {
      try {
        await adminService.deleteAgent(agentId, currentUser.uid);
        await loadAgents();
        setError('');
      } catch (err) {
        setError('Error deleting agent: ' + err.message);
      }
    }
  };

  const confirmBlock = (agent, block) => {
    setSelectedAgent({ ...agent, action: block });
    setShowBlockModal(true);
  };

  const TabButton = ({ tab, label, icon }) => (
    <Button
      variant={activeTab === tab ? "primary" : "outline-primary"}
      onClick={() => handleTabChange(tab)}
      className={styles.tabButton}
    >
      <span className={styles.tabIcon}>{icon}</span>
      {label}
    </Button>
  );

  const renderAgentsTab = () => {
    if (loading) {
      return (
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-2">Loading agents...</p>
        </div>
      );
    }

    return (
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Agent Management</h5>
          <Button 
            variant="primary" 
            onClick={() => setShowCreateModal(true)}
            className={styles.createButton}
          >
            <i className="bi bi-plus-circle me-2"></i>
            Create New Agent
          </Button>
        </Card.Header>
        <Card.Body className="p-0">
          {agents.length === 0 ? (
            <div className="text-center py-5">
              <Alert variant="info" className="mb-4">
                <h5>No Agents Found</h5>
                <p>Get started by creating your first agent account.</p>
              </Alert>
              <Button 
                variant="primary" 
                onClick={() => setShowCreateModal(true)}
                size="lg"
              >
                Create Your First Agent
              </Button>
            </div>
          ) : (
            <Table responsive striped hover className="mb-0">
              <thead>
                <tr>
                  <th>Agent Information</th>
                  <th>Contact Details</th>
                  <th>Account Status</th>
                  <th>Date Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent, index) => (
                  <tr key={agent.id}>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className={styles.agentAvatar}>
                          {agent.firstName?.charAt(0)}{agent.lastName?.charAt(0)}
                        </div>
                        <div>
                          <strong className="d-block">{agent.firstName} {agent.lastName}</strong>
                          <small className="text-muted">{agent.email}</small>
                          <div>
                            <Badge bg="light" text="dark" className="me-1">
                              {agent.role || 'agent'}
                            </Badge>
                            {agent.team && (
                              <Badge bg="outline-secondary">
                                {agent.team}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong>Email:</strong> {agent.email}
                        <br />
                        <strong>Phone:</strong> {agent.phone || 'Not provided'}
                      </div>
                    </td>
                    <td>
                      {agent.blocked || !agent.isActive ? (
                        <Badge bg="danger" className="fs-6">
                          <i className="bi bi-slash-circle me-1"></i>
                          Blocked
                        </Badge>
                      ) : (
                        <Badge bg="success" className="fs-6">
                          <i className="bi bi-check-circle me-1"></i>
                          Active
                        </Badge>
                      )}
                    </td>
                    <td>
                      {agent.createdAt ? (
                        <div>
                          <div>{new Date(agent.createdAt.seconds * 1000).toLocaleDateString()}</div>
                          <small className="text-muted">
                            {new Date(agent.createdAt.seconds * 1000).toLocaleTimeString()}
                          </small>
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td>
                      <div className="d-flex gap-2 flex-wrap">
                        {agent.blocked ? (
                          <Button 
                            variant="outline-success" 
                            size="sm"
                            onClick={() => confirmBlock(agent, false)}
                            title="Unblock agent account"
                          >
                            <i className="bi bi-unlock me-1"></i>
                            Unblock
                          </Button>
                        ) : (
                          <Button 
                            variant="outline-warning" 
                            size="sm"
                            onClick={() => confirmBlock(agent, true)}
                            title="Block agent account"
                          >
                            <i className="bi bi-lock"></i>
                          </Button>
                        )}
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          onClick={() => handleDeleteAgent(agent.id)}
                          title="Delete agent account"
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
        </Card.Body>
      </Card>
    );
  };

  const renderTeamsTab = () => (
    <Card>
      <Card.Header>
        <h5 className="mb-0">Team Management</h5>
      </Card.Header>
      <Card.Body className="text-center py-5">
        <div className={styles.comingSoon}>
          <h4>👥 Team Management</h4>
          <p className="text-muted mb-3">Organize your agents into teams for better management and reporting.</p>
          <Badge bg="info" className="fs-6">Coming Soon</Badge>
        </div>
      </Card.Body>
    </Card>
  );

  const renderRolesTab = () => (
    <Card>
      <Card.Header>
        <h5 className="mb-0">Role Management</h5>
      </Card.Header>
      <Card.Body className="text-center py-5">
        <div className={styles.comingSoon}>
          <h4>🔐 Role Management</h4>
          <p className="text-muted mb-3">Define roles and permissions for different user types in your organization.</p>
          <Badge bg="info" className="fs-6">Coming Soon</Badge>
        </div>
      </Card.Body>
    </Card>
  );

  return (
    <AdminLayout>
      <Container>
        <Row className="mb-4">
          <Col>
            <h2>System Settings</h2>
            <p className="text-muted">Manage agents, teams, and roles</p>
          </Col>
        </Row>

        {/* Tab Navigation */}
        <Card className="mb-4">
          <Card.Body>
            <div className={styles.tabNavigation}>
              <TabButton tab="agents" label="Agents" icon="👤" />
              <TabButton tab="teams" label="Teams" icon="👥" />
              <TabButton tab="roles" label="Roles" icon="🔐" />
            </div>
          </Card.Body>
        </Card>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Tab Content */}
        {activeTab === 'agents' && renderAgentsTab()}
        {activeTab === 'teams' && renderTeamsTab()}
        {activeTab === 'roles' && renderRolesTab()}

        {/* Create Agent Modal */}
        <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Create New Agent</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleCreateAgent}>
            <Modal.Body>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>First Name *</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      required
                      placeholder="Enter first name"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Last Name *</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      required
                      placeholder="Enter last name"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Email Address *</Form.Label>
                <Form.Control
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  placeholder="Enter email address"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Phone Number</Form.Label>
                <Form.Control
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number (optional)"
                />
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Password *</Form.Label>
                    <Form.Control
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      required
                      minLength={6}
                      placeholder="Enter password (min 6 characters)"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Confirm Password *</Form.Label>
                    <Form.Control
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                      placeholder="Confirm password"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                type="submit" 
                disabled={createLoading}
              >
                {createLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Creating Agent...
                  </>
                ) : (
                  'Create Agent'
                )}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* Block/Unblock Confirmation Modal */}
        <Modal show={showBlockModal} onHide={() => setShowBlockModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title className="d-flex align-items-center">
              <i className={`bi ${selectedAgent?.action ? 'bi-exclamation-triangle text-warning' : 'bi-check-circle text-success'} me-2`}></i>
              {selectedAgent?.action ? 'Block Agent' : 'Unblock Agent'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="text-center">
              <div className="mb-3">
                <div className={styles.modalAvatar}>
                  {selectedAgent?.firstName?.charAt(0)}{selectedAgent?.lastName?.charAt(0)}
                </div>
              </div>
              <h5>
                {selectedAgent?.action ? 'Block' : 'Unblock'} {selectedAgent?.firstName} {selectedAgent?.lastName}?
              </h5>
              <p className="text-muted">
                {selectedAgent?.action 
                  ? 'This agent will no longer be able to access the system. They will be logged out immediately.'
                  : 'This agent will regain access to the system and can login normally.'
                }
              </p>
              <div className="bg-light p-3 rounded">
                <strong>Agent Details:</strong><br />
                Name: {selectedAgent?.firstName} {selectedAgent?.lastName}<br />
                Email: {selectedAgent?.email}<br />
                Status: {selectedAgent?.blocked ? 'Currently Blocked' : 'Currently Active'}
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowBlockModal(false)}>
              <i className="bi bi-x-circle me-1"></i>
              Cancel
            </Button>
            <Button 
              variant={selectedAgent?.action ? "warning" : "success"} 
              onClick={() => handleBlockUnblock(selectedAgent?.id, selectedAgent?.action)}
            >
              <i className={`bi ${selectedAgent?.action ? 'bi-lock' : 'bi-unlock'} me-1`}></i>
              {selectedAgent?.action ? 'Confirm Block' : 'Confirm Unblock'}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </AdminLayout>
  );
};

export default AdminSettings; // Fixed: Changed to default export