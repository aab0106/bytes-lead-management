import React from 'react';
import { Card, Container, Row, Col, Button } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layout/DashboardLayout';
import styles from './AgentProfile.module.css';

const AgentProfile = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Get display name (fallback to email prefix if not set)
  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';

  return (
    <DashboardLayout>
      <div className={styles.profilePage}>
        <Container>
          <Row className="justify-content-center">
            <Col lg={8} xl={6}>
              {/* Header with Back Button */}
              <div className={styles.pageHeader}>
                <Button 
                  variant="outline-primary" 
                  onClick={() => navigate('/dashboard')}
                  className={styles.backButton}
                >
                  ← Back to Dashboard
                </Button>
                <h2 className={styles.pageTitle}>My Profile</h2>
                <p className={styles.pageSubtitle}>Your account information and details</p>
              </div>

              <Card className={styles.profileCard}>
                <Card.Body className={styles.cardBody}>
                  <div className={styles.profileHeader}>
                    <div className={styles.avatar}>
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.profileInfo}>
                      <h3 className={styles.userName}>{displayName}</h3>
                      <p className={styles.userEmail}>{currentUser?.email}</p>
                    </div>
                  </div>

                  <div className={styles.profileDetails}>
                    <div className={styles.detailSection}>
                      <h6 className={styles.sectionTitle}>Account Information</h6>
                      <div className={styles.detailGrid}>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>User ID:</span>
                          <span className={styles.detailValue}>{currentUser.uid}</span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Email Verified:</span>
                          <span className={styles.detailValue}>
                            {currentUser.emailVerified ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Account Created:</span>
                          <span className={styles.detailValue}>
                            {new Date(currentUser.metadata.creationTime).toLocaleString()}
                          </span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Last Login:</span>
                          <span className={styles.detailValue}>
                            {new Date(currentUser.metadata.lastSignInTime).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.detailSection}>
                      <h6 className={styles.sectionTitle}>Activity Summary</h6>
                      <div className={styles.activityGrid}>
                        <div className={styles.activityItem}>
                          <div className={styles.activityIcon}>📊</div>
                          <div className={styles.activityInfo}>
                            <span className={styles.activityLabel}>Member Since</span>
                            <span className={styles.activityValue}>
                              {new Date(currentUser.metadata.creationTime).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className={styles.activityItem}>
                          <div className={styles.activityIcon}>🔐</div>
                          <div className={styles.activityInfo}>
                            <span className={styles.activityLabel}>Last Active</span>
                            <span className={styles.activityValue}>
                              {new Date(currentUser.metadata.lastSignInTime).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    </DashboardLayout>
  );
};

export default AgentProfile;