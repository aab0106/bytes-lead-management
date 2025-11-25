import React, { useState } from 'react';
import { Nav, Button, Offcanvas } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './AdminSidebar.module.css';

const AdminSidebar = () => {
  const [showMobile, setShowMobile] = useState(false);
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const adminMenuItems = [
    { path: '/admin/analytics', icon: '📊', label: 'Analytics' },
    { path: '/admin/leads', icon: '👥', label: 'Leads' },
    { path: '/admin/settings', icon: '⚙️', label: 'Settings' },
    { path: '/admin/teams', icon: '👨‍💼', label: 'Teams', comingSoon: true },
    { path: '/admin/roles', icon: '🎭', label: 'Roles', comingSoon: true },
  ];

  const SidebarContent = ({ isMobile = false }) => (
    <div className={`${styles.sidebar} ${isMobile ? styles.mobileSidebar : ''}`}>
      <div className={styles.sidebarHeader}>
        <div className={styles.logo}>
          {isMobile ? 'BYTES ADMIN' : 'BA'}
        </div>
        {isMobile && (
          <Button 
            variant="link" 
            className={styles.closeBtn}
            onClick={() => setShowMobile(false)}
          >
            ✕
          </Button>
        )}
      </div>

      <Nav className={`flex-column ${styles.nav}`}>
        {adminMenuItems.map((item) => (
          <Nav.Link
            key={item.path}
            as={Link}
            to={item.comingSoon ? '#' : item.path}
            className={`${styles.navLink} ${
              location.pathname === item.path ? styles.active : ''
            } ${item.comingSoon ? styles.comingSoon : ''}`}
            title={item.label}
            onClick={() => {
              if (isMobile) setShowMobile(false);
              if (item.comingSoon) {
                alert('Feature coming soon!');
              }
            }}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navText}>{item.label}</span>
            {item.comingSoon && (
              <span className={styles.comingSoonBadge}>Soon</span>
            )}
          </Nav.Link>
        ))}
      </Nav>

      <div className={styles.sidebarFooter}>
        <div className={styles.userInfo}>
          <span className={styles.userIcon}>👑</span>
          <div className={styles.userDetails}>
            <div className={styles.userName}>
              {currentUser?.displayName || currentUser?.email?.split('@')[0]}
            </div>
            <div className={styles.userRole}>Administrator</div>
          </div>
        </div>
        
        <Button 
          variant="outline-light" 
          size="sm" 
          className={styles.logoutBtn}
          onClick={handleLogout}
          title="Logout"
        >
          <span>🚪</span>
          <span>Logout</span>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Hamburger Button */}
      {!showMobile && (
        <Button 
          variant="outline-dark" 
          className={styles.mobileMenuBtn}
          onClick={() => setShowMobile(true)}
        >
          <span className={styles.hamburgerIcon}>☰</span>
        </Button>
      )}

      {/* Desktop Sidebar */}
      <div className={styles.desktopSidebar}>
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Offcanvas 
        show={showMobile} 
        onHide={() => setShowMobile(false)}
        className={styles.mobileOffcanvas}
        placement="start"
      >
        <Offcanvas.Body className={styles.offcanvasBody}>
          <SidebarContent isMobile={true} />
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

export default AdminSidebar;