import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import DashboardLayout from '../layout/DashboardLayout';
import AgentLeadsTable from './AgentLeadsTable';
import AgentNotes from './AgentNotes';
import NotificationsPopup from '../notifications/NotificationsPopup';
import { leadService } from '../../services/firebaseService';
import { notificationsService } from '../../services/notificationsService';
import { useAuth } from '../../contexts/AuthContext';
import styles from './AgentDashboard.module.css';

const AgentDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    totalLeads: 0,
    wonLeads: 0,
    upcomingFollowups: 0,
    todaysFollowups: 0,
    progress: 0
  });
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [debugInfo, setDebugInfo] = useState('');
  const { currentUser } = useAuth();

  useEffect(() => {
    loadDashboardData();
    loadNotificationCount();
  }, [currentUser]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setDebugInfo(`Loading leads for agent: ${currentUser?.email}`);

      const leads = await leadService.getAgentLeads();

      setDebugInfo(`Found ${leads.length} leads for ${currentUser?.email}`);

      const totalLeads = leads.length;
      const wonLeads = leads.filter(lead => lead.status === 'Closed').length;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const threeDaysLater = new Date(today);
      threeDaysLater.setDate(today.getDate() + 3);

      let todaysFollowups = 0;
      let upcomingFollowups = 0;

     leads.forEach((lead) => {
  if (lead.followUps) {
    lead.followUps.forEach((followUp) => {
      // Handle different date formats
      let followUpDate;
      if (followUp.date?.seconds) {
        followUpDate = new Date(followUp.date.seconds * 1000);
      } else if (typeof followUp.date === 'string') {
        followUpDate = new Date(followUp.date);
      } else {
        followUpDate = new Date(followUp.date);
      }
      
      const followUpDay = new Date(followUpDate);
      followUpDay.setHours(0, 0, 0, 0);

      if (followUpDay.getTime() === today.getTime()) {
        todaysFollowups++;
      }
      if (followUpDate >= today && followUpDate <= threeDaysLater) {
        upcomingFollowups++;
      }
    });
  }
});

      const qualifiedLeads = leads.filter(lead => lead.status === 'Qualified').length;
      const visitedLeads = leads.filter(lead => lead.status === 'Visited').length;
      const contactedLeads = leads.filter(lead => lead.status === 'Contacted').length;

      const progress = totalLeads > 0 ?
        ((wonLeads + (qualifiedLeads * 0.7) + (visitedLeads * 0.4) + (contactedLeads * 0.2)) / totalLeads * 100) : 0;

      setDashboardData({
        totalLeads,
        wonLeads,
        upcomingFollowups,
        todaysFollowups,
        progress: Math.round(progress)
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setDebugInfo(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationCount = async () => {
    if (!currentUser) return;

    try {
      const todaysFollowUps = await notificationsService.getTodaysFollowUps(currentUser.uid);
      const upcomingFollowUps = await notificationsService.getUpcomingFollowUps(currentUser.uid);

      const totalCount = todaysFollowUps.length + upcomingFollowUps.length;
      setNotificationCount(totalCount);
    } catch (error) {
      console.error('Error loading notification count:', error);
    }
  };

  const handleNotificationsClose = () => {
    setShowNotifications(false);
    loadNotificationCount();
  };

  const StatCard = ({ title, value, subtitle, icon, color }) => (
    <Card className={`${styles.statCard} ${styles[color]}`}>
      <Card.Body>
        <div className={styles.statContent}>
          <div className={styles.statText}>
            <h3 className={styles.statValue}>{loading ? '...' : value}</h3>
            <p className={styles.statTitle}>{title}</p>
            {subtitle && <small className={styles.statSubtitle}>{subtitle}</small>}
          </div>
          <div className={styles.statIcon}>
            {icon}
          </div>
        </div>
      </Card.Body>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className={styles.dashboard}>
        {/* Header */}
        <div className={styles.dashboardHeader}>
          <div className={styles.headerLeft}>
            <h1>My Leads</h1>
            <p>Welcome back, {currentUser?.displayName || currentUser?.email?.split('@')[0]}</p>
            {/* {debugInfo && (
              <Alert variant="info" size="sm" className="mt-2">
                <small>Debug: {debugInfo}</small>
                <br />
                <small>UID: {currentUser?.uid}</small>
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  className="ms-2"
                  onClick={loadDashboardData}
                >
                  Refresh
                </Button>
              </Alert>
            )} */}
          </div>
          <div className={styles.headerRight}>
            <Button
              variant="outline-secondary"
              className={styles.notificationBtn}
              onClick={() => setShowNotifications(true)}
            >
              🔔
              {notificationCount > 0 && (
                <span className={styles.notificationBadge}>
                  {notificationCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <Row className={styles.statsRow}>
          <Col md={3}>
            <StatCard
              title="Total Leads"
              value={dashboardData.totalLeads}
              subtitle="All Assigned Leads"
              icon="👥"
              color="primary"
            />
          </Col>
          <Col md={3}>
            <StatCard
              title="Won Leads"
              value={dashboardData.wonLeads}
              subtitle="Closed successfully"
              icon="✅"
              color="success"
            />
          </Col>
          <Col md={3}>
            <StatCard
              title="Upcoming Follow-ups"
              value={dashboardData.upcomingFollowups}
              subtitle={`${dashboardData.todaysFollowups} today`}
              icon="📅"
              color="warning"
            />
          </Col>
          <Col md={3}>
            <StatCard
              title="Progress"
              value={`${dashboardData.progress}%`}
              subtitle="Overall performance"
              icon="📈"
              color="info"
            />
          </Col>
        </Row>

        {/* Main Content */}
        <Row className={styles.mainContentRow}>
          <Col lg={8}>
            <AgentLeadsTable onDataUpdate={loadDashboardData} />
          </Col>
          <Col lg={4}>
            <AgentNotes />
          </Col>
        </Row>

        {/* Floating Create Lead Button */}
        <Button
          className={styles.floatingButton}
          variant="primary"
          size="lg"
          as="a"
          href="/add-lead"
        >
          <span className={styles.plusIcon}>+</span>
          <span className={styles.buttonText}>Create Lead</span>
        </Button>

        {/* Notifications Popup */}
        <NotificationsPopup
          show={showNotifications}
          onHide={handleNotificationsClose}
        />
      </div>
    </DashboardLayout>
  );
};

export default AgentDashboard;