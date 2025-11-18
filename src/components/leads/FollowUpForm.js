import React, { useState } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../services/firebase';

const FollowUpForm = ({ show, handleClose, leadId, lead, onFollowUpAdded }) => {
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const newFollowUp = {
        date: new Date(followUpDate),
        notes: notes,
        createdAt: new Date()
      };

      // ✅ Save in Firestore
      await updateDoc(doc(db, 'leads', leadId), {
        followUps: arrayUnion(newFollowUp)
      });

      // ✅ Update UI instantly
      if (onFollowUpAdded) {
        onFollowUpAdded(newFollowUp);
      }

      setNotes('');
      setFollowUpDate('');
      handleClose();
    } catch (error) {
      setError('Error adding follow-up: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Add Follow-up</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form.Group className="mb-3">
            <Form.Label>Follow-up Date</Form.Label>
            <Form.Control
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Notes</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            Add Follow-up
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default FollowUpForm;
