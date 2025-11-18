import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Badge, InputGroup, Form, Dropdown, Spinner, ButtonGroup } from 'react-bootstrap';
import { leadService } from '../../services/firebaseService';
import { exportService } from '../../services/exportService';
import { useAuth } from '../../contexts/AuthContext';
import PortalStatusDropdown from './PortalStatusDropdown'; // ← Change this import
import FollowUpsPopup from './FollowUpsPopup';
import styles from './AgentLeadsTable.module.css';

const AgentLeadsTable = ({ onDataUpdate }) => {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedLeadForFollowups, setSelectedLeadForFollowups] = useState(null);
  const [showFollowupsPopup, setShowFollowupsPopup] = useState(false);

  const { currentUser } = useAuth();

  useEffect(() => {
    loadLeads();
  }, [currentUser]);

  useEffect(() => {
    filterLeads();
  }, [leads, searchTerm, statusFilter]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const agentLeads = await leadService.getAgentLeads();
      setLeads(agentLeads);
      if (onDataUpdate) onDataUpdate();
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterLeads = () => {
    let filtered = [...leads];

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.fullName?.toLowerCase().includes(searchLower) ||
        lead.email?.toLowerCase().includes(searchLower) ||
        lead.mobileNo?.includes(searchTerm) ||
        lead.propertyType?.toLowerCase().includes(searchLower)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    setFilteredLeads(filtered);
  };

  const handleStatusUpdate = async (leadId, newStatus) => {
    try {
      await leadService.updateLeadStatus(leadId, newStatus);
      await loadLeads(); // Reload to get updated data
    } catch (error) {
      console.error('Error updating status:', error);
      throw error; // Re-throw to handle in QuickStatusUpdate
    }
  };

  const handleShowFollowups = (lead) => {
    setSelectedLeadForFollowups(lead);
    setShowFollowupsPopup(true);
  };

  const handleFollowupAdded = () => {
    loadLeads();
    if (onDataUpdate) onDataUpdate();
  };

  const handleExport = async (format = 'excel') => {
    try {
      setExportLoading(true);
      const dataToExport = searchTerm || statusFilter ? filteredLeads : leads;

      if (dataToExport.length === 0) {
        alert('No leads to export');
        return;
      }

      if (format === 'excel') {
        await exportService.exportLeadsToExcel(dataToExport, 'my_leads_export');
      } else {
        await exportService.exportLeadsToCSV(dataToExport, 'my_leads_export');
      }
    } catch (err) {
      console.error('Error exporting leads:', err);
      alert('Error exporting leads: ' + err.message);
    } finally {
      setExportLoading(false);
    }
  };

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

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      if (date.seconds) {
        return new Date(date.seconds * 1000).toLocaleDateString();
      }
      return new Date(date).toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  const displayLeads = searchTerm || statusFilter ? filteredLeads : leads;

  return (
    <Card className={styles.tableCard}>
      <Card.Header className={styles.tableHeader}>
        <div className={styles.headerControls}>
          <div className={styles.headerLeft}>
            <h5 className={styles.tableTitle}>Latest Leads</h5>
            <Badge bg="primary" pill>
              {displayLeads.length} {searchTerm || statusFilter ? 'filtered' : 'total'}
            </Badge>
          </div>

          <div className={styles.headerRight}>
            {/* Search Input */}
            <div className={styles.searchInputGroup}>
              <InputGroup size="sm" className={styles.searchInput}>
                <Form.Control
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <Button
                    variant="outline-secondary"
                    onClick={() => setSearchTerm('')}
                    size="sm"
                  >
                    ✕
                  </Button>
                )}
              </InputGroup>
            </div>

            {/* Filters Row */}
            <div className={styles.filtersRow}>
              {/* Status Filter */}
              <Dropdown className={styles.statusFilter}>
                <Dropdown.Toggle
                  variant={statusFilter ? "primary" : "outline-secondary"}
                  size="sm"
                  className="w-100"
                >
                  Status: {statusFilter || 'All'}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => setStatusFilter('')}>All Statuses</Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={() => setStatusFilter('New')}>New</Dropdown.Item>
                  <Dropdown.Item onClick={() => setStatusFilter('Contacted')}>Contacted</Dropdown.Item>
                  <Dropdown.Item onClick={() => setStatusFilter('Visited')}>Visited</Dropdown.Item>
                  <Dropdown.Item onClick={() => setStatusFilter('Qualified')}>Qualified</Dropdown.Item>
                  <Dropdown.Item onClick={() => setStatusFilter('Closed')}>Closed</Dropdown.Item>
                  <Dropdown.Item onClick={() => setStatusFilter('Lost')}>Lost</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>

              {/* Export Button */}
              <Dropdown as={ButtonGroup} size="sm" className={styles.exportGroup}>
                <Button
                  variant="outline-primary"
                  disabled={exportLoading || displayLeads.length === 0}
                  onClick={() => handleExport('excel')}
                  className="text-nowrap"
                >
                  {exportLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      Exporting...
                    </>
                  ) : (
                    <>
                      📊 Export
                    </>
                  )}
                </Button>
                <Dropdown.Toggle split variant="outline-primary" />
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => handleExport('excel')}>
                    📊 Export to Excel
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleExport('csv')}>
                    📄 Export to CSV
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </div>
        </div>
      </Card.Header>

      <Card.Body className={styles.tableBody}>
        {loading ? (
          <div className={styles.loadingState}>
            <Spinner animation="border" />
            <p>Loading leads...</p>
          </div>
        ) : displayLeads.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No leads found</p>
            {searchTerm || statusFilter ? (
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                }}
              >
                Clear Filters
              </Button>
            ) : (
              <Button variant="primary" size="sm" as="a" href="/add-lead">
                Create Your First Lead
              </Button>
            )}
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <Table hover className={styles.leadsTable}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Contact #</th>
                  <th>Status</th>
                  <th>Follow-ups</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayLeads.map((lead, index) => (
                  <tr key={lead.id}>
                    <td className={styles.idColumn}>
                      <strong>{index + 1}</strong>
                    </td>
                    <td className={styles.nameColumn}>
                      <div className={styles.leadName}>{lead.fullName}</div>
                      <small className={styles.leadProperty}>
                        {lead.propertyType} • Rs.{lead.budget?.toLocaleString()}
                      </small>
                    </td>
                    <td className={styles.contactColumn}>
                      <div>{lead.mobileNo}</div>
                      <small className={styles.contactEmail}>{lead.email}</small>
                    </td>
                    <td className={styles.statusColumn}>
                      <PortalStatusDropdown // ← Use PortalStatusDropdown here
                        lead={lead}
                        onStatusUpdate={handleStatusUpdate}
                      />
                    </td>
                    <td className={styles.followupsColumn}>
                      <Button
                        variant="outline-info"
                        size="sm"
                        onClick={() => handleShowFollowups(lead)}
                        className={styles.followupsBtn}
                      >
                        📅 {lead.followUps?.length || 0}
                      </Button>
                    </td>
                    <td className={styles.actionsColumn}>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        as="a"
                        href={`/lead/${lead.id}`}
                        title="Edit Lead"
                      >
                        ✏️
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>

      <FollowUpsPopup
        show={showFollowupsPopup}
        onHide={() => setShowFollowupsPopup(false)}
        lead={selectedLeadForFollowups}
        onFollowupAdded={handleFollowupAdded}
      />
    </Card>
  );
};

export default AgentLeadsTable;