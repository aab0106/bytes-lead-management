// AgentLeads.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button } from 'react-bootstrap';
import { leadService } from '../../services/firebaseService';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

const AgentLeads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchAgentLeads = async () => {
      if (currentUser) {
        try {
          const agentLeads = await leadService.getAgentLeads(currentUser.uid);
          setLeads(agentLeads);
        } catch (error) {
          console.error('Error fetching leads:', error);
        }
      }
      setLoading(false);
    };

    fetchAgentLeads();
  }, [currentUser]);

  const getStatusVariant = (status) => {
    const variants = {
      'New': 'primary',
      'Contacted': 'info',
      'Visited': 'warning',
      'Qualified': 'success',
      'Closed': 'dark',
      'Lost': 'danger'
    };
    return variants[status] || 'secondary';
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Container>
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>My Leads({leads.length})</h2>
            <Button as={Link} to="/add-lead" variant="primary">
              Add New Lead
            </Button>
          </div>

          <Card>
            <Card.Body>
              <Table responsive striped hover>
                <thead className="table-dark">
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Contact Information</th>
                    <th>Status</th>
                    <th>Property Type</th>
                    <th>Budget</th>
                    <th>Created Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead, index) => (
                    <tr key={lead.id}>
                      <td>
                        <strong>Lead {index + 1}</strong>
                      </td>
                      <td>
                        <strong>{lead.firstName} {lead.lastName}</strong>
                      </td>
                      <td>
                        <div>{lead.email}</div>
                        <small className="text-muted">{lead.mobileNo || 'No mobileNo'}</small>
                      </td>
                      <td>
                        <Badge bg={getStatusVariant(lead.status)} className="fs-6">
                          {lead.status}
                        </Badge>
                      </td>
                      <td>{lead.propertyType || '-'}</td>
                      <td>{lead.budget ? `Rs. ${lead.budget.toLocaleString()}` : '-'}</td>
                      <td>
                        {lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleDateString() : 'N/A'}
                      </td>
                      <td>
                        <Button 
                          as={Link} 
                          to={`/lead/${lead.id}`} 
                          variant="outline-primary" 
                          size="sm"
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AgentLeads;