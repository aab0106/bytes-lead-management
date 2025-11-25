import React, { useState, useEffect } from 'react';
import { Card, Spinner, Alert } from 'react-bootstrap';
import { adminService } from '../../services/adminService';
import styles from './ActivityLog.module.css';

const ActivityLog = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const data = await adminService.getActivityLog(10);
      setActivities(data);
    } catch (err) {
      setError('Error loading activities: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Invalid time';
    }
  };

  const getActionIcon = (action) => {
    const icons = {
      'lead_assigned': '👤',
      'bulk_lead_assigned': '👥',
      'leads_imported': '📥',
      'agent_deleted': '❌',
      'status_changed': '🔄',
      'lead_created': '➕',
      'default': '📝'
    };
    return icons[action] || icons.default;
  };

  return (
    <Card className={styles.activityLogCard}>
      <Card.Header>
        <h5>Recent Activities</h5>
      </Card.Header>
      <Card.Body className={styles.activityBody}>
        {error && <Alert variant="danger" className={styles.errorAlert}>{error}</Alert>}
        
        {loading ? (
          <div className={styles.loadingState}>
            <Spinner animation="border" size="sm" />
            <span>Loading activities...</span>
          </div>
        ) : activities.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No activities yet</p>
          </div>
        ) : (
          <div className={styles.activitiesList}>
            {activities.map((activity) => (
              <div key={activity.id} className={styles.activityItem}>
                <div className={styles.activityIcon}>
                  {getActionIcon(activity.action)}
                </div>
                <div className={styles.activityContent}>
                  <p className={styles.activityText}>{activity.details}</p>
                  <small className={styles.activityTime}>
                    {formatTime(activity.timestamp)}
                  </small>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default ActivityLog;