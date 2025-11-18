import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (!isAdmin()) {
      setError('Access denied: Admin privileges required');
      setLoading(false);
      return;
    }

    loadStats();
  }, [isAdmin]);

  const loadStats = async () => {
    try {
      const statsData = await adminService.getDashboardStats();
      setStats(statsData);
    } catch (err) {
      setError('Error loading dashboard: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="text-center ">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p>Loading admin dashboard...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <h2>Admin Dashboard</h2>
          <p className="text-muted">Manage your real estate CRM system</p>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <h5>Quick Actions</h5>
              <div className="d-flex gap-2 flex-wrap">
                <Button as={Link} to="/admin/leads" variant="primary">
                  Manage Leads
                </Button>
                <Button as={Link} to="/admin/agents" variant="success">
                  Manage Agents
                </Button>
                <Button as={Link} to="/admin/create-agent" variant="warning">
                  Create New Agent
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Statistics */}
      {stats && (
        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center bg-primary text-white">
              <Card.Body>
                <Card.Title>{stats.totalLeads}</Card.Title>
                <Card.Text className='text-white'>Total Leads</Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center bg-success text-white">
              <Card.Body>
                <Card.Title>{stats.totalAgents}</Card.Title>
                <Card.Text className='text-white'>Total Agents</Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center bg-info text-white">
              <Card.Body>
                <Card.Title>{stats.recentLeads}</Card.Title>
                <Card.Text className='text-white'>Recent Leads (7 days)</Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center bg-warning text-white">
              <Card.Body>
                <Card.Title>{stats.activeAgents}</Card.Title>
                <Card.Text className='text-white'>Active Agents</Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Lead Status Breakdown */}
      {stats && stats.leadsByStatus && (
        <Row>
          <Col>
            <Card>
              <Card.Header>
                <h5 className="mb-0">Leads by Status</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  {Object.entries(stats.leadsByStatus).map(([status, count]) => (
                    <Col md={2} key={status} className="text-center">
                      <div className="border rounded p-3">
                        <h4>{count}</h4>
                        <small className="text-muted">{status}</small>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default AdminDashboard;