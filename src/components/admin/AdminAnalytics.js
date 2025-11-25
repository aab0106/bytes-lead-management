import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge } from 'react-bootstrap';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../layout/AdminLayout';
import styles from './AdminAnalytics.module.css';

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agentsWorking, setAgentsWorking] = useState([]);
  const { isAdmin } = useAuth();

  useEffect(() => {
    loadAnalytics();
    loadAgentsWorking();
  }, []);

  const loadAnalytics = async () => {
    try {
      const data = await adminService.getDashboardAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAgentsWorking = async () => {
    try {
      const agents = await adminService.getAllAgents();
      const leads = await adminService.getAllLeads();
      
      const agentsWithStats = agents.map(agent => {
        const agentLeads = leads.filter(lead => lead.assignedTo === agent.uid);
        const totalLeads = agentLeads.length;
        const wonLeads = agentLeads.filter(lead => lead.status === 'Closed').length;
        const lostLeads = agentLeads.filter(lead => lead.status === 'Lost').length;
        const totalFollowups = agentLeads.reduce((sum, lead) => 
          sum + (lead.followUps?.length || 0), 0
        );
        const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads * 100).toFixed(1) : 0;

        return {
          name: `${agent.firstName} ${agent.lastName}`,
          email: agent.email,
          totalLeads,
          wonLeads,
          lostLeads,
          totalFollowups,
          conversionRate,
          isActive: agent.isActive
        };
      });

      setAgentsWorking(agentsWithStats);
    } catch (error) {
      console.error('Error loading agents working:', error);
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

  if (!isAdmin()) {
    return (
      <AdminLayout>
        <Container>
          <h2>Access Denied</h2>
          <p>Admin privileges required to view this page.</p>
        </Container>
      </AdminLayout>
    );
  }

  if (loading) {
    return (
      <AdminLayout>
        <Container className="text-center mt-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading analytics...</p>
        </Container>
      </AdminLayout>
    );
  }

  return (
  <AdminLayout>
    <Container fluid className="p-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <h2>Dashboard Analytics</h2>
          <p className="text-muted">Overview of your sales performance and team activity</p>
        </Col>
      </Row>

      {/* First Row: Key Metrics and Agent's Working */}
      <Row className="mb-4">
        {/* Key Performance Metrics */}
        <Col lg={6} className="mb-4">
          <Card className="h-100">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Key Performance Metrics</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col sm={6} className="mb-3">
                  <div className={styles.metricCard}>
                    <div className={styles.metricValue}>{analytics?.totalLeads || 0}</div>
                    <div className={styles.metricLabel}>Total Leads</div>
                  </div>
                </Col>
                <Col sm={6} className="mb-3">
                  <div className={styles.metricCard}>
                    <div className={styles.metricValue}>{analytics?.wonLeads || 0}</div>
                    <div className={styles.metricLabel}>Won Leads</div>
                  </div>
                </Col>
                <Col sm={6} className="mb-3">
                  <div className={styles.metricCard}>
                    <div className={styles.metricValue}>{analytics?.assignedLeads || 0}</div>
                    <div className={styles.metricLabel}>Assigned Leads</div>
                  </div>
                </Col>
                <Col sm={6} className="mb-3">
                  <div className={styles.metricCard}>
                    <div className={styles.metricValue}>{analytics?.totalAgents || 0}</div>
                    <div className={styles.metricLabel}>Active Agents</div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>

        {/* Agent's Working Table */}
        <Col lg={6} className="mb-4">
          <Card className="h-100">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Agent's Performance</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <div className={styles.tableContainer}>
                <Table striped hover className="mb-0">
                  <thead className={styles.tableHeader}>
                    <tr>
                      <th>Agent</th>
                      <th>Leads</th>
                      <th>Won</th>
                      <th>Lost</th>
                      <th>Follow-ups</th>
                      <th>Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentsWorking.map((agent, index) => (
                      <tr key={index}>
                        <td>
                          <div className={styles.agentInfo}>
                            <strong className={styles.agentName}>{agent.name}</strong>
                            <small className="text-muted d-block">{agent.email}</small>
                          </div>
                        </td>
                        <td>
                          <Badge bg="primary" className={styles.countBadge}>
                            {agent.totalLeads}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg="success" className={styles.countBadge}>
                            {agent.wonLeads}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg="danger" className={styles.countBadge}>
                            {agent.lostLeads}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg="info" className={styles.countBadge}>
                            {agent.totalFollowups}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg={agent.conversionRate > 30 ? 'success' : 'warning'} className={styles.rateBadge}>
                            {agent.conversionRate}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {agentsWorking.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center text-muted py-4">
                          No agents data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Second Row: Status Cards (Left) and Recent Activities (Right) - FIXED WIDTHS */}
      <Row>
        {/* Left Side: Status Cards - Made wider */}
        <Col lg={7} className="mb-4">
          <Row>
            <Col md={6} className="mb-4">
              <Card className="h-100">
                <Card.Header className="bg-white">
                  <h5 className="mb-0">Leads Status</h5>
                </Card.Header>
                <Card.Body>
                  {analytics?.leadsByStatus ? (
                    <div className={styles.statusList}>
                      {Object.entries(analytics.leadsByStatus).map(([status, count]) => (
                        <div key={status} className={styles.statusItem}>
                          <Badge bg={getStatusVariant(status)} className="me-2">
                            {count}
                          </Badge>
                          <span>{status}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted py-3">
                      No status data available
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} className="mb-4">
              <Card className="h-100">
                <Card.Header className="bg-white">
                  <h5 className="mb-0">Follow-up Status</h5>
                </Card.Header>
                <Card.Body>
                  {analytics?.followupsStats ? (
                    <div className={styles.statsList}>
                      <div className={styles.statItem}>
                        <span>Total Follow-ups</span>
                        <Badge bg="primary">{analytics.followupsStats.total}</Badge>
                      </div>
                      <div className={styles.statItem}>
                        <span>Upcoming</span>
                        <Badge bg="warning">{analytics.followupsStats.upcoming}</Badge>
                      </div>
                      <div className={styles.statItem}>
                        <span>Completed</span>
                        <Badge bg="success">{analytics.followupsStats.completed}</Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted py-3">
                      No follow-up data
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col md={12}>
              <Card>
                <Card.Header className="bg-white">
                  <h5 className="mb-0">Coming Soon</h5>
                </Card.Header>
                <Card.Body>
                  <div className="text-center text-muted py-3">
                    <p>More analytics features coming soon!</p>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>

        {/* Right Side: Recent Activities - Made smaller */}
        <Col lg={5} className="mb-4">
          <Card className="h-100">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Recent Activities</h5>
            </Card.Header>
            <Card.Body>
              <div className={styles.activitiesContainer}>
                {analytics?.recentActivities?.length > 0 ? (
                  analytics.recentActivities.slice(0, 4).map((activity, index) => (
                    <div key={index} className={styles.activityItem}>
                      <div className={styles.activityIcon}>
                        {activity.action === 'lead_created' && '📝'}
                        {activity.action === 'status_updated' && '🔄'}
                        {activity.action === 'lead_assigned' && '👥'}
                        {activity.action === 'agent_created' && '👨‍💼'}
                        {!['lead_created', 'status_updated', 'lead_assigned', 'agent_created'].includes(activity.action) && '📋'}
                      </div>
                      <div className={styles.activityContent}>
                        <p className={styles.activityText}>{activity.details}</p>
                        <small className="text-muted">
                          {activity.timestamp?.toDate?.().toLocaleString() || 'Recent'}
                        </small>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted py-4">
                    No recent activities
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  </AdminLayout>
);
};

export default AdminAnalytics;