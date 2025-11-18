import React from 'react';
import { Card, Badge, Button, Row, Col } from 'react-bootstrap';

const FollowUpItem = ({ followUp, onStatusUpdate, leadId }) => {
  // Safe status getter with default value
  const getStatus = (status) => {
    return status || 'scheduled';
  };

  const getStatusVariant = (status) => {
    const safeStatus = getStatus(status);
    switch (safeStatus) {
      case 'completed': return 'success';
      case 'inprogress': return 'primary';
      case 'scheduled': return 'warning';
      case 'cancelled': return 'danger';
      default: return 'secondary';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      const dateObj = date?.toDate?.() || new Date(date);
      return dateObj.toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  // Safe data extraction
  const safeFollowUp = {
    id: followUp?.id || Date.now().toString(),
    status: getStatus(followUp?.status),
    date: followUp?.date,
    notes: followUp?.notes || 'No notes provided',
    createdAt: followUp?.createdAt,
    updatedAt: followUp?.updatedAt
  };

  return (
    <Card className="mb-3">
      <Card.Body>
        <Row>
          <Col md={8}>
            <div className="d-flex justify-content-between align-items-start mb-2">
              <h6 className="mb-0">Follow-up</h6>
              <Badge bg={getStatusVariant(safeFollowUp.status)}>
                {safeFollowUp.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-muted small mb-2">
              Scheduled: {formatDate(safeFollowUp.date)}
            </p>
            <p className="mb-2">{safeFollowUp.notes}</p>
            <p className="text-muted small mb-0">
              Created: {formatDate(safeFollowUp.createdAt)}
            </p>
            {safeFollowUp.updatedAt && (
              <p className="text-muted small">
                Updated: {formatDate(safeFollowUp.updatedAt)}
              </p>
            )}
          </Col>
          <Col md={4} className="text-end">
            <div className="d-flex flex-column gap-2">
              <small className="text-muted">Update Status:</small>
              <div className="d-flex flex-wrap gap-1 justify-content-end">
                <Button
                  size="sm"
                  variant={safeFollowUp.status === 'scheduled' ? 'warning' : 'outline-warning'}
                  onClick={() => onStatusUpdate(safeFollowUp.id, 'scheduled')}
                  disabled={safeFollowUp.status === 'scheduled'}
                >
                  Scheduled
                </Button>
                <Button
                  size="sm"
                  variant={safeFollowUp.status === 'inprogress' ? 'primary' : 'outline-primary'}
                  onClick={() => onStatusUpdate(safeFollowUp.id, 'inprogress')}
                  disabled={safeFollowUp.status === 'inprogress'}
                >
                  In Progress
                </Button>
                <Button
                  size="sm"
                  variant={safeFollowUp.status === 'completed' ? 'success' : 'outline-success'}
                  onClick={() => onStatusUpdate(safeFollowUp.id, 'completed')}
                  disabled={safeFollowUp.status === 'completed'}
                >
                  Complete
                </Button>
              </div>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default FollowUpItem;