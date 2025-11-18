import React from 'react';
import { Card, Badge, Button, Row, Col, Alert } from 'react-bootstrap';

const FollowUpList = ({ followUps = [], onStatusUpdate, leadId }) => {
  // Safe status getter with default value
  const getStatus = (status) => {
    return status || 'scheduled';
  };

  const getStatusVariant = (status) => {
    const safeStatus = getStatus(status);
    switch (safeStatus) {
      case 'completed':
        return 'success';
      case 'inprogress':
        return 'primary';
      case 'scheduled':
        return 'warning';
      case 'cancelled':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Not scheduled';
    try {
      const dateObj = date?.toDate?.() || new Date(date);
      return dateObj.toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  // Validate and filter out invalid follow-ups
  const validFollowUps = followUps.filter(followUp => 
    followUp && typeof followUp === 'object' && followUp.id
  );

  if (!validFollowUps || validFollowUps.length === 0) {
    return (
      <Card>
        <Card.Body className="text-center text-muted">
          <i className="bi bi-calendar-x fs-1 text-muted"></i>
          <p className="mt-2 mb-0">No follow-ups added yet.</p>
          <small>Add your first follow-up to track progress.</small>
        </Card.Body>
      </Card>
    );
  }

  // Sort follow-ups by date (newest first) with safe date comparison
  const sortedFollowUps = [...validFollowUps].sort((a, b) => {
    try {
      const dateA = a.date?.toDate?.() || a.date;
      const dateB = b.date?.toDate?.() || b.date;
      return new Date(dateB || 0) - new Date(dateA || 0);
    } catch (error) {
      console.error('Error sorting follow-ups:', error);
      return 0;
    }
  });

  // Handle status update with validation
  const handleStatusUpdate = (followUpId, newStatus) => {
    if (!followUpId || !newStatus) {
      console.error('Invalid follow-up ID or status');
      return;
    }
    
    if (onStatusUpdate) {
      onStatusUpdate(followUpId, newStatus);
    }
  };

  return (
    <div className="follow-ups-list">
      {sortedFollowUps.map((followUp, index) => {
        // Safe data extraction with fallbacks
        const safeFollowUp = {
          id: followUp.id || `followup-${index}`,
          status: getStatus(followUp.status),
          date: followUp.date,
          notes: followUp.notes || 'No notes provided',
          createdAt: followUp.createdAt,
          updatedAt: followUp.updatedAt
        };

        return (
          <Card key={safeFollowUp.id} className="mb-3 shadow-sm">
            <Card.Body>
              <Row>
                <Col md={8}>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h6 className="mb-0 text-primary">Follow-up</h6>
                    <Badge bg={getStatusVariant(safeFollowUp.status)} className="fs-7">
                      {safeFollowUp.status.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="mb-2">
                    <small className="text-muted d-block">
                      <strong>Scheduled:</strong> {formatDate(safeFollowUp.date)}
                    </small>
                  </div>

                  <div className="mb-3">
                    <p className="mb-1"><strong>Notes:</strong></p>
                    <div className="bg-light p-2 rounded">
                      {safeFollowUp.notes}
                    </div>
                  </div>

                  <div className="timeline-info">
                    <small className="text-muted d-block">
                      <strong>Created:</strong> {formatDate(safeFollowUp.createdAt)}
                    </small>
                    {safeFollowUp.updatedAt && safeFollowUp.updatedAt !== safeFollowUp.createdAt && (
                      <small className="text-muted d-block">
                        <strong>Updated:</strong> {formatDate(safeFollowUp.updatedAt)}
                      </small>
                    )}
                  </div>
                </Col>

                <Col md={4} className="border-start">
                  <div className="d-flex flex-column h-100">
                    <div className="mb-3">
                      <small className="text-muted fw-bold">Update Status:</small>
                    </div>
                    
                    <div className="d-flex flex-column gap-2 flex-grow-1">
                      <Button
                        size="sm"
                        variant={safeFollowUp.status === 'scheduled' ? 'warning' : 'outline-warning'}
                        onClick={() => handleStatusUpdate(safeFollowUp.id, 'scheduled')}
                        disabled={safeFollowUp.status === 'scheduled'}
                        className="text-start"
                      >
                        📅 Scheduled
                      </Button>
                      
                      <Button
                        size="sm"
                        variant={safeFollowUp.status === 'inprogress' ? 'primary' : 'outline-primary'}
                        onClick={() => handleStatusUpdate(safeFollowUp.id, 'inprogress')}
                        disabled={safeFollowUp.status === 'inprogress'}
                        className="text-start"
                      >
                        🔄 In Progress
                      </Button>
                      
                      <Button
                        size="sm"
                        variant={safeFollowUp.status === 'completed' ? 'success' : 'outline-success'}
                        onClick={() => handleStatusUpdate(safeFollowUp.id, 'completed')}
                        disabled={safeFollowUp.status === 'completed'}
                        className="text-start"
                      >
                        ✅ Complete
                      </Button>

                      <Button
                        size="sm"
                        variant={safeFollowUp.status === 'cancelled' ? 'danger' : 'outline-danger'}
                        onClick={() => handleStatusUpdate(safeFollowUp.id, 'cancelled')}
                        disabled={safeFollowUp.status === 'cancelled'}
                        className="text-start"
                      >
                        ❌ Cancelled
                      </Button>
                    </div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        );
      })}
    </div>
  );
};

export default FollowUpList;