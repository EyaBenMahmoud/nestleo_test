import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, CardHeader, CardBody, Input, Spinner,
  Button, Badge, Modal, ModalBody, ModalFooter, FormGroup, Label, Form,
  UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem,
  Alert, Nav, NavItem, NavLink
} from 'reactstrap';
import DataTable from 'react-data-table-component';
import { FaEnvelope, FaTrash, FaSearch, FaFilter, FaSync } from 'react-icons/fa';
import { withTranslation } from 'react-i18next';

const ContactList = ({ t }) => {
  const [contacts, setContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [emailDetails, setEmailDetails] = useState({ to: '', subject: '', message: '' });
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteSingleModal, setDeleteSingleModal] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);
  const [successModal, setSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('sent');
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/contact/contact/messages`);
      const data = await response.json();
      setContacts(data);
    } catch (error) {
      setError(t('contactList.errors.loadFailed'));
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (contact) => {
    setSelectedContact(contact);
    setEmailDetails({ 
      to: contact.email,
      subject: t('contactList.replySubject', { subject: contact.subject }),
      message: t('contactList.replyMessage', { name: contact.name, subject: contact.subject })
    });
    setModal(true);
  };

  const closeModal = () => {
    setModal(false);
    setSelectedContact(null);
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/contact/sendEmail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          to: emailDetails.to, 
          subject: emailDetails.subject, 
          message: emailDetails.message 
        }),
      });

      const data = await response.json();
      if (data.message) {
        setContacts(contacts.map(c => {
          if (c._id === selectedContact._id) {
            return { ...c, responded: true };
          }
          return c;
        }));
        setSuccessMessage('sent');
        setSuccessModal(true);
        closeModal();
      } else {
        setError(t('contactList.errors.emailFailed'));
      }
    } catch (error) {
      setError(t('contactList.errors.emailError'));
    } finally {
      setSending(false);
    }
  };

  const handleSelectContact = (state) => {
    setSelectedContacts(state.selectedRows.map(row => row._id));
  };

  const confirmDelete = (contact = null) => {
    if (contact) {
      setContactToDelete(contact._id);
      setDeleteSingleModal(true);
    } else {
      setDeleteModal(true);
    }
  };

  const deleteContacts = async () => {
    try {
      setLoading(true);
      const idsToDelete = contactToDelete ? [contactToDelete] : selectedContacts;

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/contact/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: idsToDelete }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMessage(contactToDelete ? 'deletedSingle' : 'deletedMultiple');
        setSuccessModal(true);
        loadContacts();
        setSelectedContacts([]);
        setContactToDelete(null);
      } else {
        setError(t('contactList.errors.deleteFailed'));
      }
    } catch (error) {
      setError(t('contactList.errors.deleteError'));
    } finally {
      setLoading(false);
      setDeleteModal(false);
      setDeleteSingleModal(false);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = 
      contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.message?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'responded') {
      return matchesSearch && contact.responded;
    } else if (filter === 'unresponded') {
      return matchesSearch && !contact.responded;
    }
    
    return matchesSearch;
  });

  const contactStats = {
    all: contacts.length,
    responded: contacts.filter(contact => contact.responded).length,
    unresponded: contacts.filter(contact => !contact.responded).length
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const columns = [
    {
      name: <span className='font-weight-bold fs-13'>{t('contactList.columns.from')}</span>,
      selector: row => row.name,
      sortable: true,
      cell: row => (
        <div className="d-flex align-items-center">
          <div className="avatar-sm me-2 flex-shrink-0">
            <div className="avatar-title rounded-circle bg-soft-primary text-primary">
              {row.name?.charAt(0).toUpperCase()}
            </div>
          </div>
          <div>
            <h5 className="fs-14 mb-0">{row.name}</h5>
            <p className="text-muted mb-0 fs-12">{row.email}</p>
          </div>
        </div>
      ),
      width: '220px'
    },
    {
      name: <span className='font-weight-bold fs-13'>{t('contactList.columns.subject')}</span>,
      selector: row => row.subject,
      sortable: true,
      cell: row => (
        <div>
          <div className="d-flex align-items-center">
            <h5 className="fs-14 mb-0 text-truncate" style={{maxWidth: "350px"}} title={row.subject}>
              {row.subject}
            </h5>
            {row.responded && (
              <Badge color="light" className="text-success ms-2">
                {t('contactList.responded')}
              </Badge>
            )}
          </div>
          <p className="text-muted mb-0 fs-12">{formatDate(row.createdAt || new Date())}</p>
        </div>
      ),
      width: '350px'
    },
    {
      name: <span className='font-weight-bold fs-13'>{t('contactList.columns.message')}</span>,
      selector: row => row.message,
      cell: row => (
        <div className="overflow-hidden text-truncate" style={{maxWidth: "400px"}}>
          <span title={row.message}>{row.message}</span>
        </div>
      ),
      width: '400px'
    },
    {
      name: <span className='font-weight-bold fs-13'>{t('contactList.columns.actions')}</span>,
      cell: (row) => (
        <div className="d-flex gap-2">
          <Button color="primary" size="sm" className="btn-icon" onClick={() => openModal(row)} title={t('contactList.actions.respond')}>
            <i className="ri-mail-line"></i>
          </Button>
          <Button color="danger" size="sm" className="btn-icon" onClick={() => confirmDelete(row)} title={t('contactList.actions.delete')}>
            <i className="ri-delete-bin-line"></i>
          </Button>
        </div>
      ),
      width: '120px',
      center: true
    },
  ];

  const customStyles = {
    table: {
      style: {
        minWidth: '100%',
      },
    },
    headRow: {
      style: {
        backgroundColor: '#f8f9fa',
        borderBottomWidth: '1px',
        borderBottomStyle: 'solid',
        borderBottomColor: '#e9ecef',
      },
    },
    rows: {
      style: {
        fontSize: '14px',
        minHeight: '60px',
        '&:not(:last-of-type)': {
          borderBottomStyle: 'solid',
          borderBottomWidth: '1px',
          borderBottomColor: '#f1f1f1',
        },
        backgroundColor: row => row.responded ? '#f8f9fa' : 'white',
      },
      highlightOnHoverStyle: {
        backgroundColor: 'rgba(230, 72, 92, 0.04)',
        cursor: 'pointer',
      },
    },
    pagination: {
      style: {
        borderTopStyle: 'solid',
        borderTopWidth: '1px',
        borderTopColor: '#f1f1f1',
      },
    },
  };

  return (
    <Container fluid style={{ marginTop: "90px" }}>
      
      {/* Welcome Card with Statistics Badges */}
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
                    <h4 className="fw-semibold mb-2">{t('contactList.welcome.title')}</h4>
                    <p className="text-muted mb-3">{t('contactList.welcome.description')}</p>
                    {/* Statistics Badges */}
                    <div className="d-flex flex-wrap gap-2">
                      <Badge color="primary" pill className="fs-12 py-2 px-3">
                        <i className="ri-message-3-line me-1"></i> {t('contactList.stats.total')}: {contactStats.all || 0}
                      </Badge>
                      <Badge color="success" pill className="fs-12 py-2 px-3">
                        <i className="ri-mail-check-line me-1"></i> {t('contactList.stats.responded')}: {contactStats.responded || 0}
                      </Badge>
                      <Badge color="warning" pill className="fs-12 py-2 px-3">
                        <i className="ri-mail-open-line me-1"></i> {t('contactList.stats.pending')}: {contactStats.unresponded || 0}
                      </Badge>
                    </div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="text-end">
                    <Button
                      color="primary"
                      onClick={loadContacts}
                      title={t('contactList.actions.refresh')}
                    >
                      <i className="ri-refresh-line align-bottom me-1"></i> {t('contactList.actions.refresh')}
                    </Button>
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>
      {/* End Welcome Card */}

      <Row>
        <Col lg={12}>
          <Card>
            <CardHeader className="border-0">
              <div className="d-flex align-items-center justify-content-between">
                <h5 className="card-title mb-0">{t('contactList.cardTitle')}</h5>
                <Nav pills className="nav-pills-custom">
                  <NavItem>
                    <NavLink 
                      className={filter === 'all' ? "active" : ""} 
                      onClick={() => setFilter('all')}
                      style={{ cursor: "pointer" }}
                    >
                      {t('contactList.filters.all')}
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink 
                      className={filter === 'unresponded' ? "active" : ""} 
                      onClick={() => setFilter('unresponded')}
                      style={{ cursor: "pointer" }}
                    >
                      {t('contactList.filters.unresponded')}
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink 
                      className={filter === 'responded' ? "active" : ""} 
                      onClick={() => setFilter('responded')}
                      style={{ cursor: "pointer" }}
                    >
                      {t('contactList.filters.responded')}
                    </NavLink>
                  </NavItem>
                </Nav>
              </div>
            </CardHeader>

            <CardBody>
              {error && (
                <Alert color="danger" className="mb-4">
                  <i className="ri-error-warning-line me-2 align-middle fs-16"></i>
                  {error}
                </Alert>
              )}

              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="search-box">
                  <div className="position-relative">
                    <Input
                      type="text"
                      placeholder={t('contactList.searchPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="form-control search"
                      style={{ minWidth: "250px" }}
                    />
                    <i className="ri-search-line search-icon"></i>
                  </div>
                </div>
                
                <div className="d-flex gap-2">
                  <Button
                    color="light"
                    onClick={loadContacts}
                    className="btn-sm"
                    title={t('contactList.actions.refresh')}
                  >
                    <i className="ri-refresh-line"></i> {t('contactList.actions.refresh')}
                  </Button>
                  
                  {selectedContacts.length > 0 && (
                    <Button color="danger" className="btn-sm" onClick={() => confirmDelete()}>
                      <i className="ri-delete-bin-line me-1"></i> {t('contactList.actions.deleteSelected', { count: selectedContacts.length })}
                    </Button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="text-center py-4">
                  <Spinner color="primary" />
                  <p className="mt-2">{t('contactList.loading')}</p>
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={filteredContacts}
                  pagination
                  paginationPerPage={10}
                  paginationRowsPerPageOptions={[5, 10, 20, 50]}
                  highlightOnHover
                  customStyles={customStyles}
                  responsive
                  selectableRows
                  selectableRowsHighlight
                  onSelectedRowsChange={handleSelectContact}
                  fixedHeader
                  fixedHeaderScrollHeight="500px"
                  persistTableHead
                  noDataComponent={
                    <div className="p-4 text-center">
                      <div className="avatar-md mx-auto mb-3">
                        <div className="avatar-title bg-light text-secondary rounded-circle fs-24">
                          <i className="ri-mail-open-line"></i>
                        </div>
                      </div>
                      <h5>{t('contactList.noMessages.title')}</h5>
                      <p className="text-muted">
                        {searchTerm 
                          ? t('contactList.noMessages.search') 
                          : t('contactList.noMessages.empty')}
                      </p>
                    </div>
                  }
                />
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Modal isOpen={modal} toggle={closeModal} centered size="lg">
        <ModalBody className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="modal-title">{t('contactList.replyModal.title')}</h5>
            <Button close onClick={closeModal} />
          </div>

          {selectedContact && (
            <div className="bg-light rounded p-3 mb-3">
              <h6>{t('contactList.replyModal.originalMessage')}</h6>
              <div className="mb-2">
                <strong>{t('contactList.replyModal.from')}:</strong> {selectedContact.name} ({selectedContact.email})
              </div>
              <div className="mb-2">
                <strong>{t('contactList.replyModal.subject')}:</strong> {selectedContact.subject}
              </div>
              <div className="mb-0">
                <strong>{t('contactList.replyModal.message')}:</strong>
                <p className="text-muted mt-1 mb-0">{selectedContact.message}</p>
              </div>
            </div>
          )}

          <Form onSubmit={handleEmailSubmit}>
            <FormGroup>
              <Label for="to">{t('contactList.replyModal.to')}</Label>
              <Input
                type="email"
                id="to"
                value={emailDetails.to}
                disabled
                className="bg-light"
              />
            </FormGroup>
            <FormGroup>
              <Label for="subject">{t('contactList.replyModal.subject')}</Label>
              <Input
                type="text"
                id="subject"
                value={emailDetails.subject}
                onChange={(e) => setEmailDetails({ ...emailDetails, subject: e.target.value })}
                required
              />
            </FormGroup>
            <FormGroup>
              <Label for="message">{t('contactList.replyModal.message')}</Label>
              <Input
                type="textarea"
                id="message"
                value={emailDetails.message}
                onChange={(e) => setEmailDetails({ ...emailDetails, message: e.target.value })}
                rows={6}
                required
              />
            </FormGroup>
            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button color="light" onClick={closeModal} disabled={sending}>
                {t('contactList.replyModal.cancel')}
              </Button>
              <Button color="primary" type="submit" disabled={sending}>
                {sending ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    {t('contactList.replyModal.sending')}
                  </>
                ) : (
                  <>
                    <i className="ri-send-plane-line me-1"></i> {t('contactList.replyModal.send')}
                  </>
                )}
              </Button>
            </div>
          </Form>
        </ModalBody>
      </Modal>

      <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)} centered>
        <ModalBody className="p-4 text-center">
          <div className="avatar-xl mx-auto mb-3">
            <div className="avatar-title bg-light text-danger display-5 rounded-circle">
              <i className="ri-delete-bin-5-line"></i>
            </div>
          </div>
          <h4 className="mb-3">{t('contactList.deleteModalMultiple.title')}</h4>
          <p className="text-muted mb-4">{t('contactList.deleteModalMultiple.message', { count: selectedContacts.length })}</p>
          <div className="d-flex justify-content-center gap-2">
            <Button color="light" onClick={() => setDeleteModal(false)}>
              {t('contactList.deleteModalMultiple.cancel')}
            </Button>
            <Button color="danger" onClick={deleteContacts}>
              {t('contactList.deleteModalMultiple.delete')}
            </Button>
          </div>
        </ModalBody>
      </Modal>

      <Modal isOpen={deleteSingleModal} toggle={() => setDeleteSingleModal(false)} centered>
        <ModalBody className="p-4 text-center">
          <div className="avatar-xl mx-auto mb-3">
            <div className="avatar-title bg-light text-danger display-5 rounded-circle">
              <i className="ri-delete-bin-5-line"></i>
            </div>
          </div>
          <h4 className="mb-3">{t('contactList.deleteModalSingle.title')}</h4>
          <p className="text-muted mb-4">{t('contactList.deleteModalSingle.message')}</p>
          <div className="d-flex justify-content-center gap-2">
            <Button color="light" onClick={() => setDeleteSingleModal(false)}>
              {t('contactList.deleteModalSingle.cancel')}
            </Button>
            <Button color="danger" onClick={deleteContacts}>
              {t('contactList.deleteModalSingle.delete')}
            </Button>
          </div>
        </ModalBody>
      </Modal>

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
            <h4 className="mb-3 mt-4">{t('contactList.success.title', { action: t(`contactList.success.actions.${successMessage}`) })}</h4>
            <p className="text-muted fs-15 mb-4">{t('contactList.success.message')}</p>
            <div className="hstack gap-2 justify-content-center">
              <Button 
                color="primary" 
                onClick={() => setSuccessModal(false)}
                className="btn-sm"
              >
                {t('contactList.success.close')}
              </Button>
            </div>
          </div>
        </ModalBody>
      </Modal>
    </Container>
  );
};

export default withTranslation()(ContactList);