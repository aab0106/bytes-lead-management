import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Container, Alert, Spinner, Button } from 'react-bootstrap';

const AdminRoute = ({ children }) => {
  const { currentUser, isAdmin, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p>Checking permissions...</p>
      </Container>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // Show access denied message if not admin
  if (!isAdmin()) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Access Denied</Alert.Heading>
          <p>You don't have administrator privileges to access this page.</p>
          <Button variant="outline-danger" onClick={() => window.location.href = '/leads'}>
            Go to Agent Dashboard
          </Button>
        </Alert>
      </Container>
    );
  }

  // User is authenticated and is admin, render the children
  return children;
};

export default AdminRoute;