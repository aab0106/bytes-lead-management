import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge, ListGroup, Row, Col } from 'react-bootstrap';
import { notificationsService } from '../../services/notificationsService';
import { useAuth } from '../../contexts/AuthContext';
import styles from './NotificationsPopup.module.css';

const NotificationsPopup = ({ show, onHide }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (show && currentUser) {
      loadNotifications();
    }
  }, [show, currentUser]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const todaysFollowUps = await notificationsService.getTodaysFollowUps(currentUser.uid);
      const upcomingFollowUps = await notificationsService.getUpcomingFollowUps(currentUser.uid);
      
      const allNotifications = [
        ...todaysFollowUps.map(notif => ({ ...notif, priority: 'high' })),
        ...upcomingFollowUps.filter(notif => notif.type === 'upcoming_followup').map(notif => ({ ...notif, priority: 'medium' }))
      ];
      
      setNotifications(allNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewLead = (leadId) => {
    window.open(`/lead/${leadId}`, '_blank');
    onHide();
  };

  const handleClearAll = async () => {
    if (currentUser) {
      await notificationsService.clearAllNotifications(currentUser.uid);
      setNotifications([]);
    }
  };

  const todayCount = notifications.filter(n => n.type === 'today_followup').length;
  const upcomingCount = notifications.filter(n => n.type === 'upcoming_followup').length;
  const totalCount = todayCount + upcomingCount;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered className={styles.notificationsModal}>
      <Modal.Header closeButton className={styles.modalHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerTitle}>
            <span className={styles.bellIcon}>🔔</span>
            <Modal.Title className={styles.modalTitle}>
              Notifications
              {totalCount > 0 && (
                <Badge bg="danger" className={styles.titleBadge}>
                  {totalCount}
                </Badge>
              )}
            </Modal.Title>
          </div>
          {notifications.length > 0 && (
            <Button 
              variant="outline-light" 
              size="sm" 
              onClick={handleClearAll}
              className={styles.clearAllBtn}
            >
              Clear All
            </Button>
          )}
        </div>
      </Modal.Header>

      <Modal.Body className={styles.modalBody}>
        {loading ? (
          <div className={styles.loadingState}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🎉</div>
            <h6>All caught up!</h6>
            <p>No follow-ups scheduled for today.</p>
          </div>
        ) : (
          <div className={styles.notificationsList}>
            {/* Today's Follow-ups Section */}
            {todayCount > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <Badge bg="danger" className={styles.sectionBadge}>
                    Today • {todayCount}
                  </Badge>
                  <span className={styles.sectionSubtitle}>Follow-ups scheduled for today</span>
                </div>
                <ListGroup variant="flush" className={styles.notificationGroup}>
                  {notifications
                    .filter(n => n.type === 'today_followup')
                    .map((notification) => (
                    <ListGroup.Item 
                      key={notification.id} 
                      className={styles.notificationItem}
                      action
                      onClick={() => handleViewLead(notification.leadId)}
                    >
                      <div className={styles.notificationContent}>
                        <div className={styles.notificationHeader}>
                          <span className={styles.priorityDot}></span>
                          <strong className={styles.leadName}>
                            {notification.leadName}
                          </strong>
                        </div>
                        <p className={styles.notificationText}>
                          {notification.notes || 'No additional notes'}
                        </p>
                        <div className={styles.notificationMeta}>
                          <small className={styles.notificationTime}>
                            Today at {notification.followUpDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </small>
                          <Badge bg="danger" className={styles.todayBadge}>
                            TODAY
                          </Badge>
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </div>
            )}

            {/* Upcoming Follow-ups Section */}
            {upcomingCount > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <Badge bg="warning" text="dark" className={styles.sectionBadge}>
                    Upcoming • {upcomingCount}
                  </Badge>
                  <span className={styles.sectionSubtitle}>Follow-ups in next 3 days</span>
                </div>
                <ListGroup variant="flush" className={styles.notificationGroup}>
                  {notifications
                    .filter(n => n.type === 'upcoming_followup')
                    .map((notification) => (
                    <ListGroup.Item 
                      key={notification.id} 
                      className={styles.notificationItem}
                      action
                      onClick={() => handleViewLead(notification.leadId)}
                    >
                      <div className={styles.notificationContent}>
                        <div className={styles.notificationHeader}>
                          <span className={`${styles.priorityDot} ${styles.upcomingDot}`}></span>
                          <strong className={styles.leadName}>
                            {notification.leadName}
                          </strong>
                        </div>
                        <p className={styles.notificationText}>
                          {notification.notes || 'No additional notes'}
                        </p>
                        <div className={styles.notificationMeta}>
                          <small className={styles.notificationTime}>
                            {notification.followUpDate.toLocaleDateString()} at {notification.followUpDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </small>
                          <Badge bg="warning" text="dark" className={styles.upcomingBadge}>
                            In {notification.daysUntil} day{notification.daysUntil !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </div>
            )}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className={styles.modalFooter}>
        <Row className="w-100 align-items-center">
          <Col>
            <small className="text-muted">
              {notifications.length === 0 
                ? 'No pending follow-ups' 
                : `${todayCount} today, ${upcomingCount} upcoming`
              }
            </small>
          </Col>
          <Col xs="auto">
            <Button variant="primary" onClick={onHide} size="sm">
              Close
            </Button>
          </Col>
        </Row>
      </Modal.Footer>
    </Modal>
  );
};

export default NotificationsPopup;