import React, { useState } from 'react';
import { Card, Button, Alert } from 'react-bootstrap';
import FollowUpStats from './FollowUpStats';
import FollowUpList from './FollowUpList';
import FollowUpForm from './FollowUpForm';
import { useFollowUps } from '../../hooks/useFollowUps';

const FollowUps = ({ leadId }) => {
  const [showForm, setShowForm] = useState(false);
  const { followUps = [], loading, error, updateFollowUpStatus } = useFollowUps(leadId);

  if (loading) {
    return (
      <Card>
        <Card.Body className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2 mb-0">Loading follow-ups...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="follow-ups-container">
      {error && (
        <Alert variant="danger" dismissible>
          {error}
        </Alert>
      )}
      
      <FollowUpStats followUps={followUps} />
      
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Follow-up History</h5>
        <Button variant="primary" onClick={() => setShowForm(true)}>
          + Add Follow-up
        </Button>
      </div>

      <FollowUpList 
        followUps={followUps} 
        onStatusUpdate={updateFollowUpStatus}
        leadId={leadId}
      />

      <FollowUpForm
        show={showForm}
        handleClose={() => setShowForm(false)}
        leadId={leadId}
      />
    </div>
  );
};

export default FollowUps;