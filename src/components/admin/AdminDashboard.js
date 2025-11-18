import React, { useState, useEffect } from 'react';
import {
  Container, Row, Col, Card, Button, Alert, Spinner,
  Badge, Table, Form, InputGroup, Tab, Tabs
} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [allFollowUps, setAllFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followUpsLoading, setFollowUpsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (!isAdmin()) {
      setError('Access denied: Admin privileges required');
      setLoading(false);
      return;
    }

    loadDashboardData();
  }, [isAdmin]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, followUpsData] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getAllFollowUps()
      ]);
      setStats(statsData);
      setAllFollowUps(followUpsData || []);
    } catch (err) {
      setError('Error loading dashboard: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFollowUps = async () => {
    try {
      setFollowUpsLoading(true);
      const followUpsData = await adminService.getAllFollowUps();
      setAllFollowUps(followUpsData || []);
    } catch (err) {
      setError('Error loading follow-ups: ' + err.message);
    } finally {
      setFollowUpsLoading(false);
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'inprogress': return 'primary';
      case 'scheduled': return 'warning';
      case 'cancelled': return 'danger';
      default: return 'secondary';
    }
  };

  const getLeadStatusVariant = (status) => {
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

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      const dateObj = date?.toDate?.() || new Date(date);
      return dateObj.toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  const formatRelativeTime = (date) => {
    if (!date) return 'N/A';
    try {
      const dateObj = date?.toDate?.() || new Date(date);
      const now = new Date();
      const diffMs = now - dateObj;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return dateObj.toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  // Filter follow-ups based on search and filters
  const filteredFollowUps = allFollowUps.filter(followUp => {
    const matchesSearch =
      followUp.leadName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      followUp.agentEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      followUp.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || followUp.status === statusFilter;

    const matchesDate = dateFilter === 'all' ||
      (dateFilter === 'today' && isToday(followUp.date)) ||
      (dateFilter === 'upcoming' && isUpcoming(followUp.date)) ||
      (dateFilter === 'overdue' && isOverdue(followUp.date));

    return matchesSearch && matchesStatus && matchesDate;
  });

  const isToday = (date) => {
    const dateObj = date?.toDate?.() || new Date(date);
    const today = new Date();
    return dateObj.toDateString() === today.toDateString();
  };

  const isUpcoming = (date) => {
    const dateObj = date?.toDate?.() || new Date(date);
    const today = new Date();
    return dateObj > today && !isToday(date);
  };

  const isOverdue = (date) => {
    const dateObj = date?.toDate?.() || new Date(date);
    const today = new Date();
    return dateObj < today && !isToday(date);
  };

  if (loading) {
    return (
      <Container className="text-center">
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
    <Container fluid>
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
                <Button
                  variant="info"
                  onClick={loadFollowUps}
                  disabled={followUpsLoading}
                >
                  {followUpsLoading ? 'Refreshing...' : 'Refresh Follow-ups'}
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
                <Card.Text>Total Leads</Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center bg-success text-white">
              <Card.Body>
                <Card.Title>{stats.totalAgents}</Card.Title>
                <Card.Text>Total Agents</Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center bg-info text-white">
              <Card.Body>
                <Card.Title>{stats.recentLeads}</Card.Title>
                <Card.Text>Recent Leads (7 days)</Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center bg-warning text-white">
              <Card.Body>
                <Card.Title>{stats.activeAgents}</Card.Title>
                <Card.Text>Active Agents</Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Main Content with Tabs */}
      <Tabs defaultActiveKey="overview" className="mb-3">
        {/* Overview Tab */}
        <Tab eventKey="overview" title="Overview">
          <Row>
            {/* Lead Status Breakdown */}
            {stats && stats.leadsByStatus && (
              <Col md={6}>
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">Leads by Status</h5>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      {Object.entries(stats.leadsByStatus).map(([status, count]) => (
                        <Col md={6} key={status} className="mb-2">
                          <div className="d-flex justify-content-between align-items-center p-2 border rounded">
                            <Badge bg={getLeadStatusVariant(status)}>
                              {status}
                            </Badge>
                            <strong>{count}</strong>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
            )}

            {/* Follow-up Statistics */}
            <Col md={6}>
              <Card>
                <Card.Header>
                  <h5 className="mb-0">Follow-up Statistics</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6} className="mb-2">
                      <div className="text-center p-3 border rounded">
                        <h4 className="text-primary">{allFollowUps.length}</h4>
                        <small className="text-muted">Total Follow-ups</small>
                      </div>
                    </Col>
                    <Col md={6} className="mb-2">
                      <div className="text-center p-3 border rounded">
                        <h4 className="text-warning">
                          {allFollowUps.filter(f => f.status === 'scheduled').length}
                        </h4>
                        <small className="text-muted">Scheduled</small>
                      </div>
                    </Col>
                    <Col md={6} className="mb-2">
                      <div className="text-center p-3 border rounded">
                        <h4 className="text-success">
                          {allFollowUps.filter(f => f.status === 'completed').length}
                        </h4>
                        <small className="text-muted">Completed</small>
                      </div>
                    </Col>
                    <Col md={6} className="mb-2">
                      <div className="text-center p-3 border rounded">
                        <h4 className="text-danger">
                          {allFollowUps.filter(f => f.status === 'overdue').length}
                        </h4>
                        <small className="text-muted">Overdue</small>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        {/* All Follow-ups Tab */}
        <Tab eventKey="followups" title={
          <span>
            All Follow-ups
            {allFollowUps.length > 0 && (
              <Badge bg="primary" className="ms-2">
                {allFollowUps.length}
              </Badge>
            )}
          </span>
        }>
          <Card>
            <Card.Header>
              <Row className="align-items-center">
                <Col md={6}>
                  <h5 className="mb-0">All Follow-ups</h5>
                  <small className="text-muted">
                    Monitor all follow-ups across all leads and agents
                  </small>
                </Col>
                <Col md={6}>
                  <InputGroup size="sm">
                    <Form.Control
                      placeholder="Search by lead, agent, or notes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </InputGroup>
                </Col>
              </Row>
            </Card.Header>
            <Card.Body>
              {/* Filters */}
              <Row className="mb-3">
                <Col md={4}>
                  <Form.Label>Status Filter</Form.Label>
                  <Form.Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    size="sm"
                  >
                    <option value="all">All Statuses</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="inprogress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </Form.Select>
                </Col>
                <Col md={4}>
                  <Form.Label>Date Filter</Form.Label>
                  <Form.Select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    size="sm"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="overdue">Overdue</option>
                  </Form.Select>
                </Col>
                <Col md={4} className="d-flex align-items-end">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setDateFilter('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                </Col>
              </Row>

              {/* Follow-ups Table */}
              {followUpsLoading ? (
                <div className="text-center">
                  <Spinner animation="border" size="sm" />
                  <p>Loading follow-ups...</p>
                </div>
              ) : filteredFollowUps.length === 0 ? (
                <Alert variant="info" className="text-center">
                  No follow-ups found matching your criteria.
                </Alert>
              ) : (
                <div className="table-responsive">
                  <Table striped hover>
                    <thead>
                      <tr>
                        <th>Lead</th>
                        <th>Agent</th>
                        <th>Scheduled Date</th>
                        <th>Status</th>
                        <th>Notes</th>
                        <th>Lead Status</th>
                        <th>Last Updated</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFollowUps.map((followUp, index) => (
                        <tr key={followUp.id || index}>
                          <td>
                            <div>
                              <strong>{followUp.leadName || 'N/A'}</strong>
                              <br />
                              <small className="text-muted">
                                {followUp.leadPhone || followUp.leadEmail || ''}
                              </small>
                            </div>
                          </td>
                          <td>
                            <Badge bg="light" text="dark">
                              {followUp.agentEmail || 'Unassigned'}
                            </Badge>
                          </td>
                          <td>
                            <div>
                              {formatDate(followUp.date)}
                              <br />
                              <small className={
                                isOverdue(followUp.date) ? 'text-danger' : 'text-muted'
                              }>
                                {formatRelativeTime(followUp.date)}
                              </small>
                            </div>
                          </td>
                          <td>
                            <Badge bg={getStatusVariant(followUp.status)}>
                              {followUp.status?.toUpperCase() || 'N/A'}
                            </Badge>
                          </td>
                          <td>
                            <small>
                              {followUp.notes ?
                                (followUp.notes.length > 50
                                  ? `${followUp.notes.substring(0, 50)}...`
                                  : followUp.notes
                                )
                                : 'No notes'
                              }
                            </small>
                          </td>
                          <td>
                            <Badge bg={getLeadStatusVariant(followUp.leadStatus)}>
                              {followUp.leadStatus || 'N/A'}
                            </Badge>
                          </td>
                          <td>
                            <small className="text-muted">
                              {formatRelativeTime(followUp.updatedAt || followUp.createdAt)}
                            </small>
                          </td>
                          <td>
                            <Button
                              as={Link}
                              to={`/admin/leads/${followUp.leadId}`}
                              variant="outline-primary"
                              size="sm"
                            >
                              View Lead
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default AdminDashboard;