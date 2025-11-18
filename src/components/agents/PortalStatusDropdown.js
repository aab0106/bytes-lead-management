import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Badge } from 'react-bootstrap';
import styles from './PortalStatusDropdown.module.css';

const PortalStatusDropdown = ({ lead, onStatusUpdate }) => {
  const [updating, setUpdating] = useState(false);
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef(null);

  const statusOptions = [
    { value: 'New', label: 'New', variant: 'primary' },
    { value: 'Contacted', label: 'Contacted', variant: 'info' },
    { value: 'Visited', label: 'Visited', variant: 'warning' },
    { value: 'Qualified', label: 'Qualified', variant: 'success' },
    { value: 'Closed', label: 'Closed', variant: 'dark' },
    { value: 'Lost', label: 'Lost', variant: 'danger' }
  ];

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 5, // Add small gap
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  const handleToggle = () => {
    if (!show) {
      updatePosition();
    }
    setShow(!show);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside the dropdown and outside the button
      const dropdowns = document.querySelectorAll('.portal-dropdown-menu');
      const isClickInsideDropdown = Array.from(dropdowns).some(dropdown => 
        dropdown.contains(event.target)
      );
      
      const isClickInsideButton = buttonRef.current?.contains(event.target);

      if (!isClickInsideDropdown && !isClickInsideButton) {
        setShow(false);
      }
    };

    if (show) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [show]);

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
    <>
      <div className={styles.dropdownContainer}>
        <button
          ref={buttonRef}
          className={styles.dropdownToggle}
          onClick={handleToggle}
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
      </div>

      {show && createPortal(
        <div 
          className={`${styles.portalDropdownMenu} portal-dropdown-menu`}
          style={{
            position: 'absolute',
            top: `${position.top}px`,
            left: `${position.left}px`,
            minWidth: `${position.width}px`,
            zIndex: 9999
          }}
        >
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
        </div>,
        document.body
      )}
    </>
  );
};

export default PortalStatusDropdown;