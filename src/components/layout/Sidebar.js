import React, { useState } from 'react';
import { Nav, Button, Offcanvas } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Sidebar.module.css';

const Sidebar = () => {
  const [showMobile, setShowMobile] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
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

  const menuItems = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/leads', icon: '👥', label: 'My Leads' },
    { path: '/profile', icon: '👤', label: 'Profile' },
  ];

  const SidebarContent = ({ isMobile = false }) => (
    <div className={`${styles.sidebar} ${
      !isMobile && (isHovered ? styles.expanded : styles.collapsed)
    } ${isMobile ? styles.mobileSidebar : ''}`}>
      <div className={styles.sidebarHeader}>
        <div className={styles.logo}>
          {isMobile ? 'BYTES LMS' : (isHovered ? 'BYTES LMS' : 'B')}
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
        {menuItems.map((item) => (
          <Nav.Link
            key={item.path}
            as={Link}
            to={item.path}
            className={`${styles.navLink} ${
              location.pathname === item.path ? styles.active : ''
            }`}
            title={item.label}
            onClick={() => isMobile && setShowMobile(false)}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            {(isMobile || isHovered) && (
              <span className={styles.navText}>{item.label}</span>
            )}
          </Nav.Link>
        ))}
      </Nav>

      <div className={styles.sidebarFooter}>
        <div className={styles.userInfo}>
          <span className={styles.userIcon}>👤</span>
          {(isMobile || isHovered) && (
            <div className={styles.userDetails}>
              <div className={styles.userName}>
                {currentUser?.displayName || currentUser?.email?.split('@')[0]}
              </div>
              <div className={styles.userEmail}>{currentUser?.email}</div>
            </div>
          )}
        </div>
        
        <Button 
          variant="outline-light" 
          size="sm" 
          className={styles.logoutBtn}
          onClick={handleLogout}
          title="Logout"
        >
          <span>🚪</span>
          {(isMobile || isHovered) && <span>Logout</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Hamburger Button - Always visible when sidebar is closed */}
      {!showMobile && (
        <Button 
          variant="outline-dark" 
          className={styles.mobileMenuBtn}
          onClick={() => setShowMobile(true)}
        >
          <span className={styles.hamburgerIcon}>☰</span>
        </Button>
      )}

      {/* Desktop Sidebar with Hover */}
      <div 
        className={styles.desktopSidebar}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
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

export default Sidebar;