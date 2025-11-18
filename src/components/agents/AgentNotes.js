import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import styles from './AgentNotes.module.css';

const AgentNotes = () => {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const { currentUser } = useAuth();

  useEffect(() => {
    loadNotes();
  }, [currentUser]);

  const loadNotes = async () => {
    if (!currentUser) return;
    
    try {
      const notesRef = doc(collection(db, 'agent_notes'), currentUser.uid);
      const notesSnap = await getDoc(notesRef);
      
      if (notesSnap.exists()) {
        setNotes(notesSnap.data().content || '');
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const saveNotes = async () => {
    if (!currentUser) return;
    
    setSaving(true);
    setMessage('');

    try {
      const notesRef = doc(collection(db, 'agent_notes'), currentUser.uid);
      await setDoc(notesRef, {
        content: notes,
        agentId: currentUser.uid,
        updatedAt: new Date()
      }, { merge: true });
      
      setMessage('Notes saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving notes:', error);
      setMessage('Error saving notes: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAutoSave = () => {
    clearTimeout(window.notesAutoSaveTimeout);
    window.notesAutoSaveTimeout = setTimeout(saveNotes, 2000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const { selectionStart, selectionEnd } = e.target;
      const currentValue = e.target.value;
      
      const lines = currentValue.substring(0, selectionStart).split('\n');
      const currentLine = lines[lines.length - 1];
      
      if (currentLine.trim().startsWith('-') || currentLine.trim().startsWith('*')) {
        setNotes(currentValue.substring(0, selectionStart) + '\n- ' + currentValue.substring(selectionEnd));
        setTimeout(() => {
          e.target.selectionStart = selectionStart + 3;
          e.target.selectionEnd = selectionStart + 3;
        }, 0);
      } else {
        setNotes(currentValue.substring(0, selectionStart) + '\n' + currentValue.substring(selectionEnd));
      }
    }
  };

  return (
    <Card className={styles.notesCard}>
      <Card.Header className={styles.notesHeader}>
        <h5 className={styles.notesTitle}>My Notes & Tasks</h5>
        <small className={styles.notesSubtitle}>Private notes for your reference</small>
      </Card.Header>
      
      <Card.Body className={styles.notesBody}>
        {message && (
          <Alert variant={message.includes('Error') ? 'danger' : 'success'} className={styles.messageAlert}>
            {message}
          </Alert>
        )}

        <Form.Group>
          <Form.Control
            as="textarea"
            rows={8}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              handleAutoSave();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Write your personal notes, tasks, reminders... Use '-' or '*' for bullet points. Press Enter for new bullet."
            className={styles.notesTextarea}
          />
        </Form.Group>

        <div className={styles.notesFooter}>
          <small className={styles.autoSaveText}>
            {saving ? 'Saving...' : 'Auto-saves as you type'}
          </small>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={saveNotes}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Now'}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default AgentNotes;