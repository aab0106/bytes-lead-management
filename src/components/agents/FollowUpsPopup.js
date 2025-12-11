import React, { useState } from 'react';
import { Modal, Button, Form, Card, Badge, Alert } from 'react-bootstrap';
import { leadService } from '../../services/firebaseService';
import styles from './FollowUpsPopup.module.css';

const FollowUpsPopup = ({ show, onHide, lead, onFollowupAdded }) => {
  const [newFollowup, setNewFollowup] = useState({ date: '', notes: '' });
  const [addingFollowup, setAddingFollowup] = useState(false);
  const [error, setError] = useState('');

  const handleAddFollowup = async (e) => {
  e.preventDefault();
  if (!newFollowup.date || !newFollowup.notes.trim()) {
    setError('Please fill in both date and notes');
    return;
  }

  setAddingFollowup(true);
  setError('');

  try {
    // Convert the datetime-local string to ISO string
    const followupData = {
      date: newFollowup.date, // This is a string like "2024-01-15T14:30"
      notes: newFollowup.notes
    };
    
    // Use leadService (which is now fixed)
    await leadService.addFollowUp(lead.id, followupData);
    
    setNewFollowup({ date: '', notes: '' });
    
    if (onFollowupAdded) {
      await onFollowupAdded();
    }
    
    onHide();
  } catch (error) {
    console.error('Full error:', error);
    setError('Error adding follow-up: ' + error.message);
  } finally {
    setAddingFollowup(false);
  }
};

  const formatFollowupDate = (date) => {
  if (!date) return 'N/A';
  try {
    // Handle ISO string
    if (typeof date === 'string') {
      return new Date(date).toLocaleString();
    }
    // Handle Firestore Timestamp
    if (date.seconds) {
      return new Date(date.seconds * 1000).toLocaleString();
    }
    // Handle Date object
    return new Date(date).toLocaleString();
  } catch {
    return 'Invalid date';
  }
};

  const isUpcomingFollowup = (followupDate) => {
    const today = new Date();
    const followup = followupDate.seconds ? 
      new Date(followupDate.seconds * 1000) : new Date(followupDate);
    return followup >= today;
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered className={styles.followupsModal}>
      <Modal.Header closeButton className={styles.modalHeader}>
        <Modal.Title>
          Follow-ups for {lead?.fullName}
          {lead?.followUps && (
            <Badge bg="primary" className="ms-2">
              {lead.followUps.length}
            </Badge>
          )}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className={styles.modalBody}>
        {error && <Alert variant="danger">{error}</Alert>}

        {/* Existing Follow-ups */}
        <div className={styles.existingFollowups}>
          <h6 className={styles.sectionTitle}>Existing Follow-ups</h6>
          {!lead?.followUps || lead.followUps.length === 0 ? (
            <p className={styles.noFollowups}>No follow-ups yet</p>
          ) : (
            <div className={styles.followupsList}>
              {lead.followUps
                .sort((a, b) => {
                  const dateA = a.date?.seconds ? a.date.seconds * 1000 : new Date(a.date);
                  const dateB = b.date?.seconds ? b.date.seconds * 1000 : new Date(b.date);
                  return dateB - dateA;
                })
                .map((followup, index) => (
                <Card key={index} className={`${styles.followupCard} ${
                  isUpcomingFollowup(followup.date) ? styles.upcoming : styles.past
                }`}>
                  <Card.Body>
                    <div className={styles.followupHeader}>
                      <Badge 
                        bg={isUpcomingFollowup(followup.date) ? 'success' : 'secondary'}
                        className={styles.followupStatus}
                      >
                        {isUpcomingFollowup(followup.date) ? 'Upcoming' : 'Past'}
                      </Badge>
                      <small className={styles.followupDate}>
                        {formatFollowupDate(followup.date)}
                      </small>
                    </div>
                    <p className={styles.followupNotes}>{followup.notes}</p>
                    <small className={styles.followupCreated}>
                      Created: {formatFollowupDate(followup.createdAt)}
                    </small>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Add New Follow-up */}
        <div className={styles.addFollowupSection}>
          <h6 className={styles.sectionTitle}>Add New Follow-up</h6>
          <Form onSubmit={handleAddFollowup}>
            <Form.Group className="mb-3">
              <Form.Label>Follow-up Date *</Form.Label>
              <Form.Control
                type="datetime-local"
                value={newFollowup.date}
                onChange={(e) => setNewFollowup({ ...newFollowup, date: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Notes *</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={newFollowup.notes}
                onChange={(e) => setNewFollowup({ ...newFollowup, notes: e.target.value })}
                placeholder="Enter follow-up notes..."
                required
              />
            </Form.Group>

            <div className={styles.formActions}>
              <Button 
                variant="outline-secondary" 
                onClick={onHide}
                disabled={addingFollowup}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                type="submit"
                disabled={addingFollowup}
              >
                {addingFollowup ? 'Adding...' : 'Add Follow-up'}
              </Button>
            </div>
          </Form>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default FollowUpsPopup;