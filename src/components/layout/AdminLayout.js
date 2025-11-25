import React, { useState, useEffect } from 'react';
import { Nav, Button, Offcanvas } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import styles from './AdminLayout.module.css';

const AdminLayout = ({ children }) => {
  const [showMobile, setShowMobile] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Fetch user profile from Firestore
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!currentUser) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        } else {
          setUserProfile({
            firstName: 'Admin',
            lastName: 'User',
            email: currentUser.email,
            role: 'admin'
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setUserProfile({
          firstName: 'Admin',
          lastName: 'User', 
          email: currentUser.email,
          role: 'admin'
        });
      }
    };

    fetchUserProfile();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const menuItems = [
    { path: '/admin/analytics', label: 'Analytics', icon: '📊' },
    { path: '/admin/leads', label: 'Leads Management', icon: '👥' },
    // { path: '/admin/agents', label: 'Agents', icon: '👨‍💼' },
    { path: '/admin/settings', label: 'Settings', icon: '⚙️' },
  ];

  // Get display name from user profile
  const getDisplayName = () => {
    if (userProfile) {
      if (userProfile.firstName && userProfile.lastName) {
        return `${userProfile.firstName} ${userProfile.lastName}`;
      } else if (userProfile.firstName) {
        return userProfile.firstName;
      }
    }
    return currentUser?.email?.split('@')[0] || 'User';
  };

  const SidebarContent = ({ isMobile = false }) => (
    <div className={`${styles.sidebar} ${
      !isMobile && (isHovered ? styles.expanded : styles.collapsed)
    } ${isMobile ? styles.mobileSidebar : ''}`}>
      <div className={styles.sidebarHeader}>
        <div className={styles.logo}>
          {isMobile ? 'BYTES ADMIN' : (isHovered ? 'BYTES ADMIN' : 'B')}
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
                {getDisplayName()}
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
    <div className={styles.adminLayout}>
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

      {/* Main Content */}
      <div className={`${styles.mainContent} ${
        isHovered && !showMobile ? styles.contentWithSidebarExpanded : styles.contentWithSidebarCollapsed
      }`}>
        {children}
      </div>
    </div>
  );
};

export default AdminLayout;