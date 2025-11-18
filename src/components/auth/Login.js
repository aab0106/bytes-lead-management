import React, { useState, useEffect } from 'react';
import { Form, Button, Container, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import bodlalogo from '../../login-logo.png';
import styles from '../../styles/login.module.css'

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already logged in
// Update the useEffect in Login.js:
useEffect(() => {
  if (currentUser) {
    const redirectPath = location.state?.from || (isAdmin() ? '/admin' : '/dashboard');
    navigate(redirectPath, { replace: true });
  }
}, [currentUser, isAdmin, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      // Navigation handled by useEffect
    } catch (error) {
      console.error("Login failed:", error.message);
      if (error.message.includes("blocked")) {
        setError("Your account has been blocked. Please contact admin.");
      } else {
        setError("Invalid username or password. Please try again.");
      }
    }
    setLoading(false);
  };

  if (currentUser) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Redirecting...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div className={styles.loginContainer}>
      <Container fluid className={styles.mainContainer}>
        <Row className={styles.loginRow}>
          {/* Left Side - Logo Section */}
          <Col lg={6} className={styles.logoSection}>
            <div className={styles.logoContainer}>
              <img src={bodlalogo} alt="Bytes Login" className={styles.logo} />
              <div className={styles.welcomeText}>
                <h1>Welcome Back</h1>
                <p>Please login to your account to continue managing your leads</p>
              </div>
            </div>
          </Col>

          {/* Right Side - Login Form */}
          <Col lg={6} className={styles.formSection}>
            <div className={styles.formContainer}>
              <div className={styles.formHeader}>
                <h2>Login to Your Account</h2>
                <p>Enter your credentials to access the system</p>
              </div>

              {error && <Alert variant="danger" className={styles.alert}>{error}</Alert>}
              
              <Form onSubmit={handleSubmit} className={styles.loginForm}>
                <Form.Group className={styles.formGroup}>
                  <Form.Label className={styles.formLabel}>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={styles.formControl}
                    placeholder="Enter your email"
                  />
                </Form.Group>
                
                <Form.Group className={styles.formGroup}>
                  <Form.Label className={styles.formLabel}>Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={styles.formControl}
                    placeholder="Enter your password"
                  />
                </Form.Group>

                {/* Remember Me */}
                <Form.Group className={styles.rememberMe}>
                  <Form.Check
                    type="checkbox"
                    id="remember-me"
                    label="Remember me"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className={styles.checkbox}
                  />
                </Form.Group>
                
                <Button 
                  disabled={loading} 
                  className={styles.loginButton} 
                  type="submit"
                >
                  {loading ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className={styles.spinner}
                      />
                      Logging in...
                    </>
                  ) : (
                    'Log In'
                  )}
                </Button>
              </Form>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Login;