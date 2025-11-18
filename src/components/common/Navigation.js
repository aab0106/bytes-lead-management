import React, { useEffect } from 'react';
import { Navbar, Nav, Container, Badge, Dropdown, Image } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import bodlalogo from '../../header-logo.png'
const Navigation = () => {
  const { currentUser, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Prevent non-admin users from accessing admin routes via URL
  useEffect(() => {
    if (currentUser && location.pathname.startsWith('/admin') && !isAdmin()) {
      navigate('/leads', { replace: true });
    }
  }, [currentUser, location, isAdmin, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const getDashboardPath = () => {
    return isAdmin() ? '/admin' : '/leads';
  };

  // Hide navigation on auth pages
  const hideNavigationPages = ['/login', '/register', '/forgot-password'];
  if (hideNavigationPages.includes(location.pathname)) {
    return null;
  }

  // Get display name (fallback to email prefix if no name)
  const displayName =
    currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';

  // Get user image or fallback
  const userImage = currentUser?.photoURL;

  return (
    <Navbar expand="lg" fixed="top">
      <Container>
        <Navbar.Brand as={Link} to={getDashboardPath()}>
          <Image src={bodlalogo} /> CRM {isAdmin() && <Badge bg="primary">Admin</Badge>}
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {currentUser && (
              <>
                {isAdmin() ? (
                  <>
                    <Nav.Link as={Link} to="/admin">Dashboard</Nav.Link>
                    <Nav.Link as={Link} to="/admin/leads">Leads</Nav.Link>
                    <Nav.Link as={Link} to="/admin/agents">Agents</Nav.Link>
                  </>
                ) : (
                  <>
                    <Nav.Link as={Link} to="/leads">My Leads</Nav.Link>
                    <Nav.Link as={Link} to="/profile">Profile</Nav.Link>
                  </>
                )}
              </>
            )}
          </Nav>

          <Nav>
            {currentUser ? (
              <div className="d-flex align-items-center">
                <span className="me-2">Welcome, {displayName}</span>
                <Dropdown align="end">
                  <Dropdown.Toggle
                    as="div"
                    id="dropdown-user"
                    className="d-flex align-items-center"
                    style={{ cursor: 'pointer' }}
                  >
                    {userImage ? (
                      <img
                        src={userImage}
                        alt="User"
                        className="rounded-circle"
                        style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center"
                        style={{ width: '40px', height: '40px', fontSize: '18px' }}
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Dropdown.Toggle>

                  <Dropdown.Menu>
                    <Dropdown.Header>{displayName}</Dropdown.Header>
                    <Dropdown.Item as={Link} to="/profile">Profile</Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={handleLogout}>Logout</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            ) : (
              <Nav.Link as={Link} to="/login">Login</Nav.Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Navigation;
