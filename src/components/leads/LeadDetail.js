import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Card, Button, Form, Row, Col, Badge,
  Alert, Spinner, Tabs, Tab
} from 'react-bootstrap';
import { leadService } from '../../services/firebaseService';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';
import FollowUps from '../followups/FollowUps';
import DashboardLayout from '../layout/DashboardLayout';
import styles from './LeadDetail.module.css';

const LeadDetail = () => {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [error, setError] = useState('');
  const { currentUser, isAdmin } = useAuth();

  const isAdminView = isAdmin();

  useEffect(() => {
    const fetchLead = async () => {
      try {
        setLoading(true);
        setError('');

        let leadData;
        if (isAdminView) {
          leadData = await adminService.getLeadById(leadId);
        } else {
          leadData = await leadService.getLeadById(leadId);
        }

        if (!leadData) {
          throw new Error('Lead not found');
        }

        setLead(leadData);
        setStatus(leadData.status);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching lead:', err);
      } finally {
        setLoading(false);
      }
    };

    if (leadId && currentUser) {
      fetchLead();
    }
  }, [leadId, currentUser, isAdminView]);

  const updateStatus = async () => {
    try {
      if (isAdminView) {
        await adminService.updateLeadStatus(leadId, status);
      } else {
        await leadService.updateLeadStatus(leadId, status);
      }
      setLead({ ...lead, status });
      setError('');
    } catch (err) {
      setError('Error updating status: ' + err.message);
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'New': return 'primary';
      case 'Contacted': return 'info';
      case 'Visited': return 'warning';
      case 'Qualified': return 'success';
      case 'Closed': return 'dark';
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

  if (loading) {
    return (
      <DashboardLayout>
        <Container className="text-center py-5">
          <Spinner animation="border" role="status" className={styles.loadingSpinner}>
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className={styles.loadingText}>Loading lead details...</p>
        </Container>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <Container className={styles.errorContainer}>
          <Alert variant="danger" className={styles.errorAlert}>
            <Alert.Heading>Error Loading Lead</Alert.Heading>
            <p>{error}</p>
            <div className={styles.errorActions}>
              <Button variant="outline-secondary" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
              <Button variant="primary" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </Alert>
        </Container>
      </DashboardLayout>
    );
  }

  if (!lead) {
    return (
      <DashboardLayout>
        <Container className={styles.errorContainer}>
          <Alert variant="warning" className={styles.errorAlert}>
            <Alert.Heading>Lead Not Found</Alert.Heading>
            <p>The lead you're looking for doesn't exist or has been deleted.</p>
            <Button variant="outline-warning" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </Alert>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className={styles.leadDetailPage}>
        <Container>
          {/* Header Section */}
          <div className={styles.pageHeader}>
            <Button 
              variant="outline-primary" 
              onClick={() => navigate('/dashboard')}
              className={styles.backButton}
            >
              ← Back to Dashboard
            </Button>
            {isAdminView && (
              <Badge bg="info" className={styles.adminBadge}>
                Admin View
              </Badge>
            )}
          </div>

          {isAdminView && (
            <Alert variant="info" className={styles.adminAlert}>
              <strong>Admin View:</strong> You are viewing this lead as an administrator.
              {lead.assignedAgentEmail && (
                <span> Assigned Agent: <Badge bg="light" text="dark">{lead.assignedAgentEmail}</Badge></span>
              )}
            </Alert>
          )}

          {/* Lead Summary Card */}
          <Card className={styles.summaryCard}>
            <Card.Body>
              <Row className="align-items-center">
                <Col lg={8}>
                  <h3 className={styles.leadName}>{lead.fullName}</h3>
                  <p className={styles.leadContact}>{lead.email} • {lead.mobileNo}</p>
                  <div className={styles.leadMeta}>
                    <Badge bg={getStatusVariant(lead.status)} className={styles.statusBadge}>
                      {lead.status}
                    </Badge>
                    <span className={styles.metaSeparator}>•</span>
                    <span className={styles.leadInfo}>
                      {lead.propertyType} • Rs.{lead.budget?.toLocaleString()}
                    </span>
                    <span className={styles.metaSeparator}>•</span>
                    <span className={styles.leadInfo}>{lead.location}</span>
                  </div>
                </Col>
                <Col lg={4}>
                  <div className={styles.statusSection}>
                    <Form.Label className={styles.statusLabel}><strong>Update Status:</strong></Form.Label>
                    <div className={styles.statusControls}>
                      <Form.Select 
                        value={status} 
                        onChange={(e) => setStatus(e.target.value)}
                        className={styles.statusSelect}
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Visited">Visited</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Closed">Closed</option>
                        <option value="Lost">Lost</option>
                      </Form.Select>
                      <Button 
                        variant="primary" 
                        onClick={updateStatus} 
                        className={styles.updateButton}
                        disabled={status === lead.status}
                      >
                        Update
                      </Button>
                    </div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Tabs Section */}
          <Tabs
            activeKey={activeTab}
            onSelect={(tab) => setActiveTab(tab)}
            className={styles.detailTabs}
            fill
          >
            <Tab eventKey="details" title="Lead Details">
              <Card className={styles.detailsCard}>
                <Card.Header className={styles.cardHeader}>
                  <h5 className={styles.cardTitle}>Lead Information</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <div className={styles.infoSection}>
                        <h6 className={styles.sectionTitle}>Personal Information</h6>
                        <div className={styles.infoGrid}>
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Full Name:</span>
                            <span className={styles.infoValue}>{lead.fullName}</span>
                          </div>
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Email:</span>
                            <span className={styles.infoValue}>{lead.email}</span>
                          </div>
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Phone:</span>
                            <span className={styles.infoValue}>{lead.mobileNo}</span>
                          </div>
                          {isAdminView && (
                            <div className={styles.infoItem}>
                              <span className={styles.infoLabel}>Assigned Agent:</span>
                              <span className={styles.infoValue}>{lead.assignedAgentEmail || 'Not assigned'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className={styles.infoSection}>
                        <h6 className={styles.sectionTitle}>Property Requirements</h6>
                        <div className={styles.infoGrid}>
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Property Type:</span>
                            <span className={styles.infoValue}>{lead.propertyType}</span>
                          </div>
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Budget:</span>
                            <span className={styles.infoValue}>Rs.{lead.budget?.toLocaleString()}</span>
                          </div>
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Location:</span>
                            <span className={styles.infoValue}>{lead.location}</span>
                          </div>
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Source:</span>
                            <span className={styles.infoValue}>{lead.source}</span>
                          </div>
                          {lead.sector && (
                            <div className={styles.infoItem}>
                              <span className={styles.infoLabel}>Sector:</span>
                              <span className={styles.infoValue}>{lead.sector}</span>
                            </div>
                          )}
                          {lead.project && (
                            <div className={styles.infoItem}>
                              <span className={styles.infoLabel}>Project:</span>
                              <span className={styles.infoValue}>{lead.project}</span>
                            </div>
                          )}
                          {lead.floor && (
                            <div className={styles.infoItem}>
                              <span className={styles.infoLabel}>Floor:</span>
                              <span className={styles.infoValue}>{lead.floor}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Col>
                  </Row>
                  
                  {lead.notes && (
                    <div className={styles.notesSection}>
                      <h6 className={styles.sectionTitle}>Additional Notes</h6>
                      <div className={styles.notesContent}>
                        {lead.notes}
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Tab>

            <Tab eventKey="followups" title={
              <span>
                Follow-ups
                {lead.followUps && lead.followUps.length > 0 && (
                  <Badge bg="primary" className={styles.tabBadge}>
                    {lead.followUps.length}
                  </Badge>
                )}
              </span>
            }>
              <FollowUps leadId={leadId} />
            </Tab>
          </Tabs>

          {error && (
            <Alert variant="danger" dismissible onClose={() => setError('')} className={styles.errorAlert}>
              {error}
            </Alert>
          )}
        </Container>
      </div>
    </DashboardLayout>
  );
};

export default LeadDetail;