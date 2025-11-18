import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Row, Col, Modal } from 'react-bootstrap';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const CreateAgent = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdAgent, setCreatedAgent] = useState(null);
  const { isAdmin, currentUser } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await adminService.createAgent(formData);
      
      if (result.success) {
        setCreatedAgent(result.agent);
        setShowSuccess(true);
        
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          password: '',
          confirmPassword: ''
        });
      }
    } catch (err) {
      setError('Error creating agent: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    setCreatedAgent(null);
  };

  const handleViewAgents = () => {
    setShowSuccess(false);
    navigate('/admin/agents');
  };

  const handleCreateAnother = () => {
    setShowSuccess(false);
    setCreatedAgent(null);
  };

  if (!isAdmin()) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">Access denied. Admin privileges required.</Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      {/* Success Modal */}
      <Modal show={showSuccess} onHide={handleSuccessClose} centered>
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title>✅ Agent Created Successfully</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center">
            <h5>Agent Account Created!</h5>
            <div className="bg-light p-3 rounded mt-3">
              <p><strong>Name:</strong> {createdAgent?.firstName} {createdAgent?.lastName}</p>
              <p><strong>Email:</strong> {createdAgent?.email}</p>
              <p><strong>Status:</strong> <span className="text-success">Active</span></p>
            </div>
            <p className="text-muted small mt-2">
              The agent can now login using the provided credentials.
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={handleCreateAnother}>
            Create Another Agent
          </Button>
          <Button variant="primary" onClick={handleViewAgents}>
            View All Agents
          </Button>
        </Modal.Footer>
      </Modal>

      <Row className="justify-content-center">
        <Col md={8}>
          <Card>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="mb-0">Create New Agent</h2>
                <Button 
                  variant="outline-primary" 
                  onClick={() => navigate('/admin/agents')}
                >
                  ← Back to Agents
                </Button>
              </div>
              
              <Alert variant="info">
                <strong>Admin:</strong> {currentUser?.email}
              </Alert>
              
              {error && <Alert variant="danger">{error}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>First Name *</Form.Label>
                      <Form.Control
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
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
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
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
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="Enter email address"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Phone Number</Form.Label>
                  <Form.Control
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter phone number (optional)"
                  />
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Password *</Form.Label>
                      <Form.Control
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
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
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        placeholder="Confirm password"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="d-grid gap-2">
                  <Button 
                    variant="primary" 
                    type="submit" 
                    disabled={loading}
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Creating Agent...
                      </>
                    ) : (
                      'Create Agent'
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CreateAgent;