import React, { useState } from 'react';
import { Form, Button, Card, Container, Row, Col, Alert } from 'react-bootstrap';
import { leadService } from '../../services/firebaseService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layout/DashboardLayout';
import styles from './LeadForm.module.css';

const LeadForm = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobileNo: '',
    source: '',
    budget: '',
    notes: '',
    leadType: '',
    propertyType: '',
    sector: '',
    project: '',
    floor: '',
    status: 'New'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [phoneValidation, setPhoneValidation] = useState({ isValid: true, message: '' });
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Phone validation functions (keeping your existing validation logic)
  const isValidPhone = (phone) => {
    if (!phone || typeof phone !== 'string') return false;
    const cleaned = phone.trim();
    if (!cleaned) return false;
    const internationalPattern = /^\+?[1-9]\d{0,2}[\s\-]?\(?\d{1,4}\)?[\s\-]?\d{1,4}[\s\-]?\d{1,4}[\s\-]?\d{1,9}$/;
    const digitsOnly = cleaned.replace(/\D/g, '');
    if (digitsOnly.length < 7) return false;
    if (digitsOnly.length > 15) return false;
    if (!internationalPattern.test(cleaned)) return false;
    return validateSpecificCountries(cleaned);
  };

  const validateSpecificCountries = (phone) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('92') || phone.includes('+92') || (digits.startsWith('0') && digits.length === 11)) {
      return isValidPakistaniNumber(phone);
    }
    if (digits.startsWith('1') || phone.includes('+1')) {
      return digits.length === 11;
    }
    if (digits.startsWith('44') || phone.includes('+44')) {
      const ukDigits = digits.startsWith('44') ? digits.substring(2) : digits.substring(3);
      return ukDigits.length >= 9 && ukDigits.length <= 10;
    }
    if (digits.startsWith('971') || phone.includes('+971')) {
      const uaeDigits = digits.startsWith('971') ? digits.substring(3) : digits.substring(4);
      return uaeDigits.length === 9;
    }
    const totalDigits = digits.length;
    return totalDigits >= 7 && totalDigits <= 15;
  };

  const isValidPakistaniNumber = (phone) => {
    if (!phone) return false;
    const digits = phone.replace(/\D/g, '');
    let pakistaniDigits;
    
    if (digits.startsWith('92') && digits.length === 12) {
      pakistaniDigits = digits.substring(2);
    } else if (digits.startsWith('0') && digits.length === 11) {
      pakistaniDigits = digits.substring(1);
    } else if (digits.length === 10) {
      pakistaniDigits = digits;
    } else {
      return false;
    }
    
    if (pakistaniDigits.length !== 10) return false;
    
    const validPrefixes = [
      '30', '31', '32', '33', '34', '35', '36', '37',
      '40', '41', '42', '43', '44', '45', '46', '47',
      '50', '51', '52', '53', '54', '55', '56', '57',
      '60', '61', '62', '63', '64', '65', '66', '67',
      '70', '71', '72', '73', '74', '75', '76', '77',
      '90', '91', '92', '93', '94', '95', '96', '97'
    ];
    
    const prefix = pakistaniDigits.substring(0, 2);
    if (!validPrefixes.includes(prefix)) return false;
    if (/^(\d)\1+$/.test(pakistaniDigits)) return false;
    if (/^0+$/.test(pakistaniDigits)) return false;
    
    return true;
  };

  const normalizePhone = (phone) => {
    if (!phone) return '';
    let cleaned = phone.trim();
    if (cleaned.startsWith('+')) {
      const plus = '+';
      const rest = cleaned.substring(1).replace(/\D/g, '');
      cleaned = plus + rest;
    } else {
      cleaned = cleaned.replace(/\D/g, '');
      if (cleaned.length > 10 && !cleaned.startsWith('0')) {
        cleaned = '+' + cleaned;
      }
    }
    return cleaned;
  };

  const validatePhoneInRealTime = (phone) => {
    if (!phone) {
      setPhoneValidation({ isValid: true, message: '' });
      return true;
    }
    
    const cleaned = phone.trim();
    if (!cleaned) {
      setPhoneValidation({ isValid: false, message: 'Please enter a mobile number' });
      return false;
    }
    
    if (!isValidPhone(phone)) {
      setPhoneValidation({ 
        isValid: false, 
        message: 'Please enter a valid international mobile number\n\nExamples:\n• +1-555-123-4567 (USA/Canada)\n• +44 20 7946 0958 (UK)\n• +971 50 123 4567 (UAE)\n• +92 334 7600608 (Pakistan)' 
      });
      return false;
    }
    
    setPhoneValidation({ isValid: true, message: '' });
    return true;
  };

  const isMobileNumberExists = async (mobileNo) => {
    if (!mobileNo) return { exists: false, existingLead: null };
    
    try {
      const normalizedPhone = normalizePhone(mobileNo);
      if (!isValidPhone(normalizedPhone)) {
        return { exists: false, existingLead: null, normalizedPhone, error: 'Invalid phone number format' };
      }
      
      const leads = await leadService.getLeadsByMobileNumber(normalizedPhone);
      if (leads && leads.length > 0) {
        return { exists: true, existingLead: leads[0], normalizedPhone };
      }
      
      return { exists: false, existingLead: null, normalizedPhone };
    } catch (error) {
      console.error('Error checking mobile number:', error);
      return { exists: false, existingLead: null, normalizedPhone: normalizePhone(mobileNo) };
    }
  };

  // Project options
  const projects = {
    'one-Project': 'One Project',
    'two-project': 'Two Project',
    'three': 'THREE',
    'four-project': 'Four Project'
  };

  const floorOptions = [
    'Ground Floor', 'First Floor', 'Second Floor', 'Third Floor', 'Fourth Floor', 'Fifth Floor'
  ];

  const dhaSectors = [
    "Rumanza", "Sector A", "Sector B1", "Sector D", "Sector E", "Sector E1", "Sector E2", 
    "Sector F", "Sector G", "Sector H", "Sector I", "Sector K", "Sector L", "Sector M", 
    "Sector N", "Sector O", "Sector P", "Sector Q", "Sector R", "Sector S", "Sector T", 
    "Sector U", "Sector V", "Sector W1", "Sector W2", "Sector X", "Sector Y", "Other"
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));

    if (name === 'mobileNo') {
      validatePhoneInRealTime(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentUser) {
      setError('You must be logged in to create a lead');
      return;
    }

    // Validate required fields
    if (!formData.fullName?.trim()) {
      setError('Full Name is required');
      return;
    }

    if (!formData.mobileNo) {
      setError('Mobile number is required');
      return;
    }

    if (!isValidPhone(formData.mobileNo)) {
      setError('Please enter a valid international mobile number');
      return;
    }

    if (!formData.leadType) {
      setError('Lead Type is required');
      return;
    }

    if (!formData.propertyType) {
      setError('Property Type is required');
      return;
    }

    if (formData.propertyType === 'plot' && !formData.sector) {
      setError('Sector is required for Plot property type');
      return;
    }

    if (formData.propertyType === 'project-unit' && !formData.project) {
      setError('Project is required for Project Unit property type');
      return;
    }

    setLoading(true);

    try {
      const { exists, existingLead, normalizedPhone, error } = await isMobileNumberExists(formData.mobileNo);
      
      if (error) {
        setError(`Invalid mobile number format: ${error}`);
        setLoading(false);
        return;
      }
      
      if (exists && existingLead) {
        setError(`This mobile number is already associated with another lead: ${existingLead.fullName}`);
        setLoading(false);
        return;
      }

      const leadData = {
        ...formData,
        mobileNo: normalizedPhone,
        agentId: currentUser.uid,
        agentName: currentUser.displayName || currentUser.email,
        createdAt: new Date()
      };

      await leadService.createLead(leadData);
      
      setSuccess('Lead added successfully! Redirecting to dashboard...');
      
      // Reset form
      setFormData({
        fullName: '',
        email: '',
        mobileNo: '',
        source: '',
        budget: '',
        notes: '',
        leadType: '',
        propertyType: '',
        sector: '',
        project: '',
        floor: '',
        status: 'New'
      });

      setPhoneValidation({ isValid: true, message: '' });

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (err) {
      setError('Error adding lead: ' + err.message);
    }

    setLoading(false);
  };

  const showFloor = formData.propertyType === 'project-unit' &&
    formData.project &&
    ['one-destination', 'business-hub', 'gvr'].includes(formData.project);

  return (
    <DashboardLayout>
      <div className={styles.leadFormPage}>
        <Container>
          <Row className="justify-content-center">
            <Col lg={10} xl={8}>
              {/* Header with Back Button */}
              <div className={styles.pageHeader}>
                <Button 
                  variant="outline-primary" 
                  onClick={() => navigate('/dashboard')}
                  className={styles.backButton}
                >
                  ← Back to Dashboard
                </Button>
                <h2 className={styles.pageTitle}>Create New Lead</h2>
                <p className={styles.pageSubtitle}>Add a new lead to your profile</p>
              </div>

              <Card className={styles.formCard}>
                <Card.Body className={styles.cardBody}>
                  {error && <Alert variant="danger">{error}</Alert>}
                  {success && <Alert variant="success">{success}</Alert>}

                  <Form onSubmit={handleSubmit}>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className={styles.formLabel}>Full Name *</Form.Label>
                          <Form.Control
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            required
                            placeholder="Enter full name"
                            className={styles.formControl}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className={styles.formLabel}>Email</Form.Label>
                          <Form.Control
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Enter email address (optional)"
                            className={styles.formControl}
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className={styles.formLabel}>Mobile No *</Form.Label>
                          <Form.Control
                            type="tel"
                            name="mobileNo"
                            value={formData.mobileNo}
                            onChange={handleChange}
                            required
                            placeholder="Enter international mobile number"
                            className={styles.formControl}
                            isInvalid={!phoneValidation.isValid && formData.mobileNo.length > 0}
                          />
                          {!phoneValidation.isValid && formData.mobileNo.length > 0 && (
                            <Form.Control.Feedback type="invalid">
                              <span style={{ whiteSpace: 'pre-line' }}>{phoneValidation.message}</span>
                            </Form.Control.Feedback>
                          )}
                          <Form.Text className="text-muted">
                            Mobile number must be unique across all leads. 
                          </Form.Text>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className={styles.formLabel}>Source</Form.Label>
                          <Form.Select 
                            name="source" 
                            value={formData.source} 
                            onChange={handleChange}
                            className={styles.formControl}
                          >
                            <option value="">Select Source</option>
                            <option value="Website">Website</option>
                            <option value="Referral">Referral</option>
                            <option value="Walk-in">Walk-in</option>
                            <option value="Advertisement">Advertisement</option>
                            <option value="Social Media">Social Media</option>
                            <option value="Import">Import</option>
                            <option value="International">International</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className={styles.formLabel}>Budget</Form.Label>
                          <Form.Control
                            type="number"
                            name="budget"
                            value={formData.budget}
                            onChange={handleChange}
                            placeholder="Enter budget amount"
                            className={styles.formControl}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className={styles.formLabel}>Lead Type *</Form.Label>
                          <Form.Select
                            name="leadType"
                            value={formData.leadType}
                            onChange={handleChange}
                            required
                            className={styles.formControl}
                          >
                            <option value="">Select Lead Type</option>
                            <option value="property-sale">Property Sale</option>
                            <option value="property-purchase">Property Purchase</option>
                            <option value="construction">Construction</option>
                            <option value="rent">Rent</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className={styles.formLabel}>Property Type *</Form.Label>
                          <Form.Select
                            name="propertyType"
                            value={formData.propertyType}
                            onChange={handleChange}
                            required
                            className={styles.formControl}
                          >
                            <option value="">Select Property Type</option>
                            <option value="plot">Plot</option>
                            <option value="project-unit">Project Unit</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        {formData.propertyType === 'plot' && (
                          <Form.Group className="mb-3">
                            <Form.Label className={styles.formLabel}>Sector *</Form.Label>
                            <Form.Select
                              name="sector"
                              value={formData.sector}
                              onChange={handleChange}
                              required
                              className={styles.formControl}
                            >
                              <option value="">Select Sector</option>
                              {dhaSectors.map((sector, index) => (
                                <option key={index} value={sector}>{sector}</option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                        )}

                        {formData.propertyType === 'project-unit' && (
                          <Form.Group className="mb-3">
                            <Form.Label className={styles.formLabel}>Project *</Form.Label>
                            <Form.Select
                              name="project"
                              value={formData.project}
                              onChange={handleChange}
                              required
                              className={styles.formControl}
                            >
                              <option value="">Select Project</option>
                              {Object.entries(projects).map(([key, value]) => (
                                <option key={key} value={key}>{value}</option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                        )}
                      </Col>
                    </Row>

                    {showFloor && (
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className={styles.formLabel}>Floor</Form.Label>
                            <Form.Select
                              name="floor"
                              value={formData.floor}
                              onChange={handleChange}
                              className={styles.formControl}
                            >
                              <option value="">Select Floor</option>
                              {floorOptions.map((floor, index) => (
                                <option key={index} value={floor.toLowerCase().replace(' ', '-')}>
                                  {floor}
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                        </Col>
                      </Row>
                    )}

                    <Form.Group className="mb-4">
                      <Form.Label className={styles.formLabel}>Notes / Requirements</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        placeholder="Enter any additional notes or requirements..."
                        className={styles.formControl}
                      />
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label className={styles.formLabel}>Status</Form.Label>
                      <Form.Select 
                        name="status" 
                        value={formData.status} 
                        onChange={handleChange}
                        className={styles.formControl}
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Visited">Visited</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Closed">Closed</option>
                        <option value="Lost">Lost</option>
                      </Form.Select>
                    </Form.Group>

                    <Button 
                      disabled={loading || !phoneValidation.isValid} 
                      type="submit" 
                      className={`w-100 ${styles.submitButton}`}
                      variant="primary"
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Adding Lead...
                        </>
                      ) : (
                        'Add to My Leads'
                      )}
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    </DashboardLayout>
  );
};

export default LeadForm;