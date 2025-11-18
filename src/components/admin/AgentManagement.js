import React, { useState, useEffect } from 'react';
import { 
  Container, Table, Button, Card, Badge, Alert, Spinner, 
  Modal, Form, Row, Col 
} from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';

const AgentManagement = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const { isAdmin } = useAuth();
  const navigate = useNavigate(); // Add navigate

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/leads');
      return;
    }
    loadAgents();
  }, [isAdmin, navigate]); // Add navigate to dependencies

  const loadAgents = async () => {
    try {
      setLoading(true);
      setError('');
      const agentsData = await adminService.getAllAgents();
      setAgents(agentsData);
    } catch (err) {
      setError('Error loading agents: ' + err.message);
      console.error('Error loading agents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUnblock = async (agentId, block) => {
    try {
      await adminService.blockUnblockAgent(agentId, block);
      setAgents(agents.map(agent => 
        agent.id === agentId ? { ...agent, blocked: block } : agent
      ));
      setShowBlockModal(false);
      setSelectedAgent(null);
      setError('');
    } catch (err) {
      setError('Error updating agent: ' + err.message);
    }
  };

  const confirmBlock = (agent, block) => {
    setSelectedAgent({ ...agent, action: block });
    setShowBlockModal(true);
  };

  const handleDeleteAgent = async (agentId) => {
    if (window.confirm('Are you sure you want to delete this agent? This action cannot be undone.')) {
      try {
        await adminService.deleteAgent(agentId);
        setAgents(agents.filter(agent => agent.id !== agentId));
        setError('');
        // Reload agents to refresh the list
        loadAgents();
      } catch (err) {
        setError('Error deleting agent: ' + err.message);
      }
    }
  };

  // Redirect non-admin users immediately
  if (!isAdmin()) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Access Denied</Alert.Heading>
          <p>You don't have administrator privileges to access this page.</p>
          <Button variant="outline-danger" onClick={() => navigate('/leads')}>
            Go to Agent Dashboard
          </Button>
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p>Loading agents...</p>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>Agent Management</h2>
              <p className="text-muted mb-0">Manage agent accounts and access permissions</p>
            </div>
           </div>
        </Col>
        <Col xs="auto">
          <Button as={Link} to="/admin/create-agent" variant="primary" size="md">
            + Create New Agent
          </Button>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card>
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">All Agents</h5>
            <Badge bg="primary" pill>{agents.length} agents</Badge>
          </div>
        </Card.Header>
        <Card.Body className='px-0 pb-0'>
          {agents.length === 0 ? (
            <div className="text-center py-5">
              <Alert variant="info" className="mb-4">
                <h5>No Agents Found</h5>
                <p>Get started by creating your first agent account.</p>
              </Alert>
              <Button as={Link} to="/admin/create-agent" variant="primary" size="lg">
                Create Your First Agent
              </Button>
            </div>
          ) : (
            <Table responsive striped hover className='mb-0'>
              <thead>
                <tr>
                  <th>ID</th>
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
                        <strong>{index + 1}</strong>
                      </td>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-3" 
                             style={{ width: '40px', height: '40px', color: 'white', fontSize: '16px', fontWeight: 'bold' }}>
                          {agent.firstName?.charAt(0)}{agent.lastName?.charAt(0)}
                        </div>
                        <div>
                          <strong className="d-block">{agent.firstName} {agent.lastName}</strong>
                          <small className="text-muted">{agent.email}</small>
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
                      {agent.blocked ? (
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
              <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center p-3 mb-2">
                <i className="bi bi-person-gear fs-1 text-primary"></i>
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
  );
};

export default AgentManagement;