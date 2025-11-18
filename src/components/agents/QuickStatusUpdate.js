import React, { useState, useRef, useEffect } from 'react';
import { Badge } from 'react-bootstrap';
import styles from './QuickStatusUpdate.module.css';

const QuickStatusUpdate = ({ lead, onStatusUpdate }) => {
  const [updating, setUpdating] = useState(false);
  const [show, setShow] = useState(false);
  const dropdownRef = useRef(null);

  const statusOptions = [
    { value: 'New', label: 'New', variant: 'primary' },
    { value: 'Contacted', label: 'Contacted', variant: 'info' },
    { value: 'Visited', label: 'Visited', variant: 'warning' },
    { value: 'Qualified', label: 'Qualified', variant: 'success' },
    { value: 'Closed', label: 'Closed', variant: 'dark' },
    { value: 'Lost', label: 'Lost', variant: 'danger' }
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShow(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleStatusChange = async (newStatus) => {
    if (newStatus === lead.status) {
      setShow(false);
      return;
    }
    
    setUpdating(true);
    try {
      await onStatusUpdate(lead.id, newStatus);
      setShow(false);
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const currentStatus = statusOptions.find(opt => opt.value === lead.status);

  return (
    <div className={styles.dropdownContainer} ref={dropdownRef}>
      <button
        className={styles.dropdownToggle}
        onClick={() => setShow(!show)}
        disabled={updating}
        type="button"
      >
        {updating ? (
          <span className={styles.updatingText}>Updating...</span>
        ) : (
          <Badge bg={currentStatus?.variant || 'secondary'} className={styles.statusBadge}>
            {lead.status}
          </Badge>
        )}
      </button>

      {show && (
        <div className={styles.dropdownMenu}>
          {statusOptions.map((option) => (
            <button
              key={option.value}
              className={`${styles.dropdownItem} ${
                lead.status === option.value ? styles.active : ''
              }`}
              onClick={() => handleStatusChange(option.value)}
              type="button"
            >
              <Badge bg={option.variant} className={styles.optionBadge}>
                {option.label}
              </Badge>
              {lead.status === option.value && (
                <span className={styles.selectedIcon}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuickStatusUpdate;