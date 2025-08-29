import React, { useEffect, useState } from 'react';
import { Formik } from 'formik';
import * as yup from 'yup';
import { 
  Container, Button, Input, FormGroup, Label, Card, CardBody, CardHeader, 
  Modal, ModalBody, Row, Col, Alert, Spinner, InputGroup, Nav, NavItem, NavLink, TabContent, TabPane, Badge
} from 'reactstrap';
import { useTranslation } from 'react-i18next';

// Form validation schema
const validationSchema = yup.object({
  WebsiteUrl: yup.string().url("Invalid URL").required("Website URL is required"),
  phone: yup.string()
    .matches(
      /^((\+[1-9]{1,4}[ -]?)|(\([0-9]{2,3}\)[ -]?)|([0-9]{2,4})[ -]?)*?[0-9]{3,4}[ -]?[0-9]{3,4}$/, 
      "Phone number is not valid"
    )
    .required("Phone number is required"),
  address: yup.string().required("Address is required"),
  email: yup.string().email("Invalid email").required("Email is required"),
  socialMedia: yup.object({
    facebook: yup.string().url("Invalid Facebook URL").nullable(),
    twitter: yup.string().url("Invalid Twitter URL").nullable(),
    instagram: yup.string().url("Invalid Instagram URL").nullable(),
    linkedin: yup.string().url("Invalid LinkedIn URL").nullable()
  })
});

const Crmsetting = () => {
  const { t, i18n } = useTranslation();
  
  const [initialValues, setInitialValues] = useState({
    WebsiteUrl: "",
    phone: "",
    address: "",
    email: "",
    socialMedia: {
      facebook: "",
      twitter: "",
      instagram: "",
      linkedin: ""
    }
  });
  const [activeTab, setActiveTab] = useState('general');
  const [successModal, setSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState({
    termsAndConditions: { content: '', lastUpdated: new Date() },
    cookiePolicy: { content: '', lastUpdated: new Date() },
    privacyPolicy: { content: '', lastUpdated: new Date() }
  });
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [policySuccessMessage, setPolicySuccessMessage] = useState('');
  const [policyErrorMessage, setPolicyErrorMessage] = useState('');
  
  // Policy language settings
  const [policyLanguage, setPolicyLanguage] = useState(i18n.language || 'en');
  const [supportedLanguages, setSupportedLanguages] = useState(['en']);
  const [languageChanged, setLanguageChanged] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/crm/settings`);
        const data = await response.json();
        
        if (response.ok) {
          setInitialValues({
            WebsiteUrl: data.WebsiteUrl || "",
            phone: data.phoneNumber || "",
            address: data.address || "",
            email: data.email || "",
            socialMedia: {
              facebook: data.socialMedia?.facebook || "",
              twitter: data.socialMedia?.twitter || "",
              instagram: data.socialMedia?.instagram || "",
              linkedin: data.socialMedia?.linkedin || ""
            }
          });
          
          // Set supported languages
          if (data.supportedLanguages && Array.isArray(data.supportedLanguages)) {
            setSupportedLanguages(data.supportedLanguages);
          }
          
          setErrorMessage("");
        } else {
          console.error('Failed to fetch settings:', data.error);
          setErrorMessage("Failed to load settings. Please try again.");
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        setErrorMessage("Network error. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Fetch policy content whenever language or tab changes
  useEffect(() => {
    if (activeTab === 'terms') {
      fetchPolicyByType('termsAndConditions');
    } else if (activeTab === 'cookies') {
      fetchPolicyByType('cookiePolicy');
    } else if (activeTab === 'privacy') {
      fetchPolicyByType('privacyPolicy');
    }
  }, [activeTab, policyLanguage, languageChanged]);

  const fetchPolicyByType = async (policyType) => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/crm/policy/${policyType}?lang=${policyLanguage}`);
      
      if (response.ok) {
        const data = await response.json();
        setPolicies(prev => ({
          ...prev,
          [policyType]: data
        }));
      } else {
        console.error(`Failed to fetch ${policyType}`);
      }
    } catch (error) {
      console.error(`Error fetching ${policyType}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (values, { setSubmitting }) => {
    const settingsData = {
      WebsiteUrl: values.WebsiteUrl,
      phoneNumber: values.phone,
      address: values.address,
      email: values.email,
      socialMedia: values.socialMedia
    };

    try {
      setErrorMessage("");
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/crm/updateSettings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update settings');
      }

      const data = await response.json();
      console.log('Settings updated successfully:', data);

      // Show success modal on successful update
      setSuccessMessage("Updated");
      setSuccessModal(true);
    } catch (error) {
      console.error('Failed to update settings:', error.message || 'Unknown error');
      setErrorMessage(error.message || 'Failed to update settings. Please try again.');
    }

    setSubmitting(false);
  };

  const handlePolicyUpdate = async (policyType) => {
    setSavingPolicy(true);
    setPolicyErrorMessage('');
    setPolicySuccessMessage('');
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/crm/policy/${policyType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: policies[policyType].content,
          language: policyLanguage // Include the selected language
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update ${policyType}`);
      }

      const data = await response.json();
      
      setPolicies(prev => ({
        ...prev,
        [policyType]: data
      }));
      
      // Display language-specific success message
      const policyDisplayName = policyType
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase());
        
      setPolicySuccessMessage(
        `${policyDisplayName} updated successfully in ${getLanguageDisplayName(policyLanguage)}`
      );
      
      // Clear success message after 5 seconds
      setTimeout(() => setPolicySuccessMessage(''), 5000);
      
    } catch (error) {
      console.error(`Failed to update ${policyType}:`, error);
      setPolicyErrorMessage(error.message || `Failed to update ${policyType}. Please try again.`);
    } finally {
      setSavingPolicy(false);
    }
  };

  const toggleTab = (tab) => {
    if (activeTab !== tab) {
      setActiveTab(tab);
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString(policyLanguage, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const handlePolicyChange = (policyType, content) => {
    setPolicies(prev => ({
      ...prev,
      [policyType]: { ...prev[policyType], content }
    }));
  };

  // Handle policy language change
  const handlePolicyLanguageChange = (event) => {
    const newLanguage = event.target.value;
    setPolicyLanguage(newLanguage);
    setLanguageChanged(prev => !prev);
  };

  // Get display name for a language code
  const getLanguageDisplayName = (code) => {
    switch (code) {
      case 'en': return 'English';
      case 'fr': return 'French';
      case 'sp': return 'Spanish';
      case 'es': return 'Spanish';
      case 'it': return 'Italian';
      case 'ar': return 'Arabic';
      case 'zh': return 'Chinese';
      case 'ru': return 'Russian';
      case 'pt': return 'Portuguese';
      case 'ja': return 'Japanese';
      default: return code;
    }
  };

  return (
    <Container fluid style={{ marginTop: "90px" }}>


      {/* Welcome Card */}
      <Row className="mb-4">
        <Col>
          <Card className="welcome-card overflow-hidden">
            <div className="position-absolute end-0 start-0 top-0 z-0"
                style={{ height: '100%', background: 'linear-gradient(90deg,#c1e8f0, #cbe9f3, #e0f7fa)' }}>
              <div className="position-absolute end-0 top-0 z-0">
                <svg width="250" height="250" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="opacity-25">
                  <path fill="#4B79CF" d="M44.3,-76.4C58.6,-69.7,72.2,-59.3,79.6,-45.3C87,-31.2,88.3,-13.5,85.2,2.7C82.1,19,74.7,33.8,64.7,45.9C54.8,58,42.3,67.4,28.4,72.7C14.5,78,0.1,79.2,-15,77.4C-30.1,75.7,-46,71.1,-59.6,61.6C-73.2,52.2,-84.6,38,-86.2,23C-87.8,8.1,-79.6,-7.6,-74.1,-24.6C-68.5,-41.6,-65.5,-59.8,-54.8,-69.7C-44.1,-79.7,-25.6,-81.4,-7.7,-79.5C10.2,-77.6,30,-83,44.3,-76.4Z" transform="translate(100 100)" />
                </svg>
              </div>
            </div>
            <CardBody className="p-4 position-relative">
              <Row className="align-items-center">
                <Col md={8}>
                  <div className="text-start">
                    <h4 className="fw-semibold mb-2">{t('crmSettings.welcome.title')}</h4>
                    <p className="text-muted mb-3">{t('crmSettings.welcome.description')}</p>
                    {/* Statistics Badges */}
                    <div className="d-flex flex-wrap gap-2">
                      <Badge color="primary" pill className="fs-12 py-2 px-3">
                        <i className="ri-settings-3-line me-1"></i> {t('crmSettings.stats.configurations')}: 4
                      </Badge>
                      <Badge color="warning" pill className="fs-12 py-2 px-3">
                        <i className="ri-file-list-3-line me-1"></i> {t('crmSettings.stats.policies')}: 3
                      </Badge>
                      <Badge color="success" pill className="fs-12 py-2 px-3">
                        <i className="ri-global-line me-1"></i> {t('crmSettings.stats.languages')}: {supportedLanguages.length}
                      </Badge>
                    </div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="text-end">
                    <Button
                      color="primary"
                      onClick={() => toggleTab('general')}
                      title="Configure Settings"
                    >
                      <i className="ri-settings-line align-bottom me-1"></i> Configure Settings
                    </Button>
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col lg={12} className="mb-4">
          <Card>
            <CardHeader className="border-0">
              <Nav tabs className="nav-tabs-custom card-header-tabs border-bottom-0">
                <NavItem>
                  <NavLink
                    className={activeTab === 'general' ? 'active' : ''}
                    onClick={() => toggleTab('general')}
                    style={{ cursor: 'pointer' }}
                  >
                    <i className="ri-settings-3-line me-1 align-middle"></i> General Settings
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink
                    className={activeTab === 'terms' ? 'active' : ''}
                    onClick={() => toggleTab('terms')}
                    style={{ cursor: 'pointer' }}
                  >
                    <i className="ri-file-list-3-line me-1 align-middle"></i> Terms & Conditions
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink
                    className={activeTab === 'cookies' ? 'active' : ''}
                    onClick={() => toggleTab('cookies')}
                    style={{ cursor: 'pointer' }}
                  >
                    <i className="ri-bookmark-3-line me-1 align-middle"></i> Cookie Policy
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink
                    className={activeTab === 'privacy' ? 'active' : ''}
                    onClick={() => toggleTab('privacy')}
                    style={{ cursor: 'pointer' }}
                  >
                    <i className="ri-lock-2-line me-1 align-middle"></i> Privacy Policy
                  </NavLink>
                </NavItem>
              </Nav>
            </CardHeader>

            <CardBody>
              {errorMessage && (
                <Alert color="danger" className="mb-4">
                  <i className="ri-error-warning-line me-2 align-middle fs-16"></i>
                  {errorMessage}
                </Alert>
              )}

              <TabContent activeTab={activeTab}>
                <TabPane tabId="general">
                  {loading ? (
                    <div className="text-center py-5">
                      <Spinner size="lg" color="primary" />
                      <p className="mt-3">Loading settings...</p>
                    </div>
                  ) : (
                    <Formik
                      enableReinitialize
                      initialValues={initialValues}
                      validationSchema={validationSchema}
                      onSubmit={handleFormSubmit}
                    >
                      {({
                        values,
                        errors,
                        touched,
                        handleChange,
                        handleBlur,
                        handleSubmit,
                        isSubmitting,
                        setFieldValue
                      }) => (
                        <form onSubmit={handleSubmit}>
                          {/* Your existing form fields */}
                          <Row>
                        <Col md={6}>
                          <FormGroup className="mb-4">
                            <Label for="WebsiteUrl" className="fw-medium">Website URL</Label>
                            <InputGroup>
                              <span className="input-group-text bg-light text-muted">
                                <i className="ri-global-line"></i>
                              </span>
                              <Input
                                type="text"
                                name="WebsiteUrl"
                                id="WebsiteUrl"
                                placeholder="https://your-website.com"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                value={values.WebsiteUrl}
                                invalid={touched.WebsiteUrl && Boolean(errors.WebsiteUrl)}
                              />
                            </InputGroup>
                            {touched.WebsiteUrl && errors.WebsiteUrl && <div className="text-danger small mt-1">{errors.WebsiteUrl}</div>}
                          </FormGroup>
                        </Col>
                        <Col md={6}>
                          <FormGroup className="mb-4">
                            <Label for="email" className="fw-medium">Email Address</Label>
                            <InputGroup>
                              <span className="input-group-text bg-light text-muted">
                                <i className="ri-mail-line"></i>
                              </span>
                              <Input
                                type="email"
                                name="email"
                                id="email"
                                placeholder="contact@yourcompany.com"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                value={values.email}
                                invalid={touched.email && Boolean(errors.email)}
                              />
                            </InputGroup>
                            {touched.email && errors.email && <div className="text-danger small mt-1">{errors.email}</div>}
                          </FormGroup>
                        </Col>
                      </Row>

                      <Row>
                        <Col md={6}>
                          <FormGroup className="mb-4">
                            <Label for="phone" className="fw-medium">Phone Number</Label>
                            <InputGroup>
                              <span className="input-group-text bg-light text-muted">
                                <i className="ri-phone-line"></i>
                              </span>
                              <Input
                                type="tel"
                                name="phone"
                                id="phone"
                                placeholder="+1 (555) 123-4567"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                value={values.phone}
                                invalid={touched.phone && Boolean(errors.phone)}
                              />
                            </InputGroup>
                            {touched.phone && errors.phone && <div className="text-danger small mt-1">{errors.phone}</div>}
                          </FormGroup>
                        </Col>
                      </Row>

                          <div className="d-flex justify-content-end mt-4">
                            <Button type="submit" color="primary" className="btn-label" disabled={isSubmitting}>
                              {isSubmitting ? (
                                <>
                                  <span className="d-flex align-items-center">
                                    <Spinner size="sm" className="me-2" />
                                    Updating Settings...
                                  </span>
                                </>
                              ) : (
                                <>
                                  <i className="ri-save-line label-icon align-middle fs-16 me-2"></i>
                                  Save Settings
                                </>
                              )}
                            </Button>
                          </div>
                        </form>
                      )}
                    </Formik>
                  )}
                </TabPane>

                {/* Policy Tabs with Language Selection */}
                {['terms', 'cookies', 'privacy'].map(tab => {
                  const policyType = 
                    tab === 'terms' ? 'termsAndConditions' :
                    tab === 'cookies' ? 'cookiePolicy' : 'privacyPolicy';
                    
                  const policyTitle = 
                    tab === 'terms' ? 'Terms and Conditions' :
                    tab === 'cookies' ? 'Cookie Policy' : 'Privacy Policy';
                    
                  return (
                    <TabPane key={tab} tabId={tab}>
                      {loading ? (
                        <div className="text-center py-5">
                          <Spinner size="lg" color="primary" />
                          <p className="mt-3">Loading policy...</p>
                        </div>
                      ) : (
                        <div>
                          <div className="d-flex justify-content-between align-items-center mb-4">
                            <div>
                              <h5 className="card-title">{policyTitle}</h5>
                              <p className="text-muted mb-0">
                                Last updated: {formatDate(policies[policyType].lastUpdated)}
                              </p>
                            </div>
                            <div>
                              <Button 
                                color="primary" 
                                className="btn-sm"
                                onClick={() => handlePolicyUpdate(policyType)}
                                disabled={savingPolicy}
                              >
                                {savingPolicy ? (
                                  <>
                                    <Spinner size="sm" className="me-2" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <i className="ri-save-line me-1"></i> Save Changes
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>

                          {policySuccessMessage && activeTab === tab && (
                            <Alert color="success" className="mb-4">
                              <i className="ri-checkbox-circle-line me-2 align-middle"></i>
                              {policySuccessMessage}
                            </Alert>
                          )}

                          {policyErrorMessage && activeTab === tab && (
                            <Alert color="danger" className="mb-4">
                              <i className="ri-error-warning-line me-2 align-middle"></i>
                              {policyErrorMessage}
                            </Alert>
                          )}

                          {/* Language Selector */}
                          <div className="mb-4">
                            <Label for="policyLanguage" className="form-label fw-medium">
                              Policy Language
                            </Label>
                            <Input
                              type="select"
                              id="policyLanguage"
                              value={policyLanguage}
                              onChange={handlePolicyLanguageChange}
                              className="form-select"
                              style={{ maxWidth: "200px" }}
                            >
                              {supportedLanguages.map(lang => (
                                <option key={lang} value={lang}>
                                  {getLanguageDisplayName(lang)}
                                </option>
                              ))}
                            </Input>
                            <small className="text-muted d-block mt-1">
                              Select the language for editing policy content
                            </small>
                          </div>

                          <div className="mb-3">
                            <Label for={`${policyType}Content`} className="form-label">
                              Edit {policyTitle} Content
                            </Label>
                            <small className="d-block text-muted mb-2">
                              You can use HTML tags like &lt;h5&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt; for formatting
                            </small>
                            <Input
                              type="textarea"
                              id={`${policyType}Content`}
                              value={policies[policyType].content}
                              onChange={(e) => handlePolicyChange(policyType, e.target.value)}
                              rows="15"
                              className="policy-editor"
                            />
                          </div>

                          <div className="policy-preview mt-4">
                            <div className="d-flex align-items-center mb-2">
                              <h6 className="mb-0">Preview:</h6>
                              <div className="ms-3 badge bg-info">
                                {getLanguageDisplayName(policyLanguage)}
                              </div>
                            </div>
                            <div className="policy-preview-content p-3 border rounded bg-light">
                              <div dangerouslySetInnerHTML={{ __html: policies[policyType].content }}></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </TabPane>
                  );
                })}
              </TabContent>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Success Modal */}
      <Modal isOpen={successModal} toggle={() => setSuccessModal(false)} centered className="success-modal">
        <ModalBody className='text-center p-5'>
          <div className="text-end">
            <button 
              type="button" 
              onClick={() => setSuccessModal(false)} 
              className="btn-close text-end" 
              aria-label="Close"
            ></button>
          </div>
          <div className="mt-2">
            <div className="avatar-lg mx-auto">
              <div className="avatar-title rounded-circle bg-light text-success display-3">
                <i className="ri-checkbox-circle-fill"></i>
              </div>
            </div>
            <h4 className="mb-3 mt-4">Settings {successMessage} Successfully</h4>
            <p className="text-muted fs-15 mb-4">
              Your contact information and settings have been updated.
            </p>
            <div className="hstack gap-2 justify-content-center">
              <Button 
                color="primary" 
                onClick={() => setSuccessModal(false)}
                className="btn-sm"
              >
                Close
              </Button>
            </div>
          </div>
        </ModalBody>
      </Modal>

      <style jsx>{`
        .policy-editor {
          font-family: monospace;
          min-height: 300px;
        }
        
        .policy-preview-content {
          max-height: 300px;
          overflow-y: auto;
        }
        
        .policy-preview-content h5 {
          font-size: 1.1rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        
        .policy-preview-content p {
          margin-bottom: 0.75rem;
        }
        
        .policy-preview-content ul {
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }
      `}</style>
    </Container>
  );
};

export default Crmsetting;