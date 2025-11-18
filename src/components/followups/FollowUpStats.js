import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';

const FollowUpStats = ({ followUps = [] }) => {
  // Safe filtering with default values
  const validFollowUps = followUps.filter(followUp => 
    followUp && typeof followUp === 'object'
  );

  const stats = {
    total: validFollowUps.length,
    completed: validFollowUps.filter(f => (f.status || 'scheduled') === 'completed').length,
    inProgress: validFollowUps.filter(f => (f.status || 'scheduled') === 'inprogress').length,
    scheduled: validFollowUps.filter(f => (f.status || 'scheduled') === 'scheduled').length,
    cancelled: validFollowUps.filter(f => (f.status || 'scheduled') === 'cancelled').length,
  };

  if (stats.total === 0) {
    return null; // Don't show stats if no follow-ups
  }

  return (
    <Row className="mb-4">
      <Col md={2}>
        <Card className="text-center">
          <Card.Body className="py-3">
            <Card.Title className="mb-1">{stats.total}</Card.Title>
            <Card.Text className="small mb-0">Total</Card.Text>
          </Card.Body>
        </Card>
      </Col>
      <Col md={2}>
        <Card className="text-center border-success">
          <Card.Body className="py-3">
            <Card.Title className="mb-1 text-success">{stats.completed}</Card.Title>
            <Card.Text className="small mb-0">Completed</Card.Text>
          </Card.Body>
        </Card>
      </Col>
      <Col md={2}>
        <Card className="text-center border-primary">
          <Card.Body className="py-3">
            <Card.Title className="mb-1 text-primary">{stats.inProgress}</Card.Title>
            <Card.Text className="small mb-0">In Progress</Card.Text>
          </Card.Body>
        </Card>
      </Col>
      <Col md={2}>
        <Card className="text-center border-warning">
          <Card.Body className="py-3">
            <Card.Title className="mb-1 text-warning">{stats.scheduled}</Card.Title>
            <Card.Text className="small mb-0">Scheduled</Card.Text>
          </Card.Body>
        </Card>
      </Col>
      <Col md={2}>
        <Card className="text-center border-danger">
          <Card.Body className="py-3">
            <Card.Title className="mb-1 text-danger">{stats.cancelled}</Card.Title>
            <Card.Text className="small mb-0">Cancelled</Card.Text>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default FollowUpStats;