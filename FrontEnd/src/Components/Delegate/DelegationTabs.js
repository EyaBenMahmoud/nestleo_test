import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Card, CardBody, Button, Row, Col, Nav, NavItem, NavLink, TabContent, TabPane,
  Spinner, Alert, Badge, Modal, ModalBody, ModalHeader, ModalFooter
} from 'reactstrap';
import DelegateComponent from './DelegateComponent';
import { useSelector } from "react-redux";
import { withTranslation } from 'react-i18next';

const DelegationTabs = ({ t }) => {
  const [activeTab, setActiveTab] = useState('1');
  const [myDelegations, setMyDelegations] = useState([]);
  const [pendingDelegations, setPendingDelegations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [acceptModal, setAcceptModal] = useState(false);
  const [declineModal, setDeclineModal] = useState(false);
  const [selectedDelegation, setSelectedDelegation] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const { user } = useSelector((state) => state.Loginn || {});

  useEffect(() => {
    if (user && activeTab === '2') {
      fetchMyDelegations();
    }
    if (user && activeTab === '3') {
      fetchPendingDelegations();
    }
  }, [user, activeTab]);

  const fetchMyDelegations = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/delegate/delegations/${user.id}`);
      console.log('My delegations response:', response);
      console.log('My delegations data:', response.data);
      setMyDelegations(response || []);
    } catch (error) {
      console.error('Error fetching my delegations:', error);
      setError(t('delegation.fetchError'));
      setMyDelegations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingDelegations = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/delegate/delegations/${user.id}`);
      console.log('Pending delegations response:', response);
      // Filter only non-active delegations (pending) - includes meeting and payment types
      const pending = (response || []).filter(delegation => {
        // For meeting delegations, check if not active
        if (delegation.type === 'meeting') {
          return !delegation.meetingDelegation?.isActive;
        }
        // For payment delegations, they are usually active immediately, but check if there's any pending status
        if (delegation.type === 'payment') {
          return !delegation.paymentDelegation?.isActive;
        }
        // For both types, check meeting delegation status (main indicator)
        if (delegation.type === 'both') {
          return !delegation.meetingDelegation?.isActive;
        }
        return false;
      });
      setPendingDelegations(pending);
    } catch (error) {
      console.error('Error fetching pending delegations:', error);
      setError(t('delegation.fetchError'));
      setPendingDelegations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptDelegation = async () => {
    if (!selectedDelegation) return;
    
    setLoading(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/delegate/accept`, {
        delegationId: selectedDelegation._id,
        delegatorId: selectedDelegation.delegator._id
      });
      
      setSuccessMessage(t('delegation.acceptSuccess'));
      setAcceptModal(false);
      
      // Refresh all tabs data
      await Promise.all([
        fetchMyDelegations(),
        fetchPendingDelegations()
      ]);
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error accepting delegation:', error);
      setError(t('delegation.acceptError'));
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineDelegation = async () => {
    if (!selectedDelegation) return;
    
    setLoading(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/delegate/decline`, {
        delegationId: selectedDelegation._id,
        delegatorId: selectedDelegation.delegator._id
      });
      
      setSuccessMessage(t('delegation.declineSuccess'));
      setDeclineModal(false);
      
      // Refresh all tabs data
      await Promise.all([
        fetchMyDelegations(),
        fetchPendingDelegations()
      ]);
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error declining delegation:', error);
      setError(t('delegation.declineError'));
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const getDelegateTypeLabel = (type) => {
    switch (type) {
      case 'meeting': return t('delegation.meetingDelegate');
      case 'payment': return t('delegation.paymentDelegate');
      case 'both': return t('delegation.bothDelegate');
      default: return type;
    }
  };

  const getDelegationStatusBadge = (delegation) => {
    // All delegations now require activation
    return delegation.meetingDelegation?.isActive ? 
      <Badge color="success" className="ms-2">{t('delegation.active')}</Badge> : 
      <Badge color="warning" className="ms-2">{t('delegation.awaitingAcceptance')}</Badge>;
  };

  const toggleTab = (tab) => {
    if (activeTab !== tab) setActiveTab(tab);
  };

  return (
    <div>
      {error && (
        <Alert 
          color="danger" 
          isOpen={!!error} 
          toggle={() => setError(null)}
          className="alert-dismissible"
        >
          <i className="ri-error-warning-line me-2"></i>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert 
          color="success" 
          isOpen={!!successMessage} 
          toggle={() => setSuccessMessage('')}
          className="alert-dismissible"
        >
          <i className="ri-check-circle-line me-2"></i>
          {successMessage}
        </Alert>
      )}

      <Nav tabs>
        <NavItem>
          <NavLink
            className={activeTab === '1' ? 'active' : ''}
            onClick={() => toggleTab('1')}
            style={{ cursor: 'pointer' }}
          >
            {t('delegation.myDelegates')}
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            className={activeTab === '2' ? 'active' : ''}
            onClick={() => toggleTab('2')}
            style={{ cursor: 'pointer' }}
          >
            {t('delegation.delegationsForMe')}
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            className={activeTab === '3' ? 'active' : ''}
            onClick={() => toggleTab('3')}
            style={{ cursor: 'pointer' }}
          >
            {t('delegation.pendingApprovals')}
            {pendingDelegations.length > 0 && (
              <Badge color="warning" className="ms-1">{pendingDelegations.length}</Badge>
            )}
          </NavLink>
        </NavItem>
      </Nav>

      <TabContent activeTab={activeTab}>
        <TabPane tabId="1">
          <DelegateComponent />
        </TabPane>
        
        <TabPane tabId="2">
          <div className="mt-3">
            <div className="d-flex align-items-center mb-4">
              <div className="flex-grow-1">
                <h5 className="card-title mb-0">{t('delegation.delegationsAssignedToMe')}</h5>
                <p className="text-muted">{t('delegation.peopleDelegatedToYou')}</p>
              </div>
              <Button 
                color="secondary" 
                size="sm"
                onClick={fetchMyDelegations}
                disabled={loading}
              >
                <i className="ri-refresh-line me-1"></i>
                {t('delegation.refresh')}
              </Button>
            </div>

            {loading ? (
              <div className="text-center">
                <Spinner />
              </div>
            ) : (
              <>
                {myDelegations.length > 0 ? (
                  myDelegations.map(delegation => (
                    <Card key={delegation._id} className="mb-3">
                      <CardBody>
                        <Row className="align-items-center">
                          <Col>
                            <h5>
                              {delegation.delegator.firstName} {delegation.delegator.lastName}
                              {getDelegationStatusBadge(delegation)}
                            </h5>
                            <p className="text-muted mb-1">
                              {t('delegation.type')}: {getDelegateTypeLabel(delegation.type)}
                            </p>
                            <p className="text-muted mb-0">
                              {t('delegation.email')}: {delegation.delegator.email}
                            </p>
                            {delegation.meetingDelegation?.activatedAt && (
                              <small className="text-success d-block">
                                {t('delegation.activatedOn')}: {new Date(delegation.meetingDelegation.activatedAt).toLocaleDateString()}
                              </small>
                            )}
                          </Col>
                          <Col className="text-end">
                            {!delegation.meetingDelegation?.isActive && (
                              <Badge color="warning" pill>{t('delegation.pendingApproval')}</Badge>
                            )}
                            {delegation.meetingDelegation?.isActive && (
                              <Badge color="success" pill>{t('delegation.activeDelegate')}</Badge>
                            )}
                          </Col>
                        </Row>
                      </CardBody>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <i className="ri-user-settings-line display-4 text-muted"></i>
                    <h5 className="mt-3">{t('delegation.noDelegationsForYou')}</h5>
                    <p className="text-muted">{t('delegation.notAssignedAsDelegate')}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </TabPane>
        
        <TabPane tabId="3">
          <div className="mt-3">
            <div className="d-flex align-items-center mb-4">
              <div className="flex-grow-1">
                <h5 className="card-title mb-0">{t('delegation.pendingDelegationApprovals')}</h5>
                <p className="text-muted">{t('delegation.delegationsAwaitingApproval')}</p>
              </div>
              <Button 
                color="secondary" 
                size="sm"
                onClick={fetchPendingDelegations}
                disabled={loading}
              >
                <i className="ri-refresh-line me-1"></i>
                {t('delegation.refresh')}
              </Button>
            </div>

            {loading ? (
              <div className="text-center">
                <Spinner />
              </div>
            ) : (
              <>
                {pendingDelegations.length > 0 ? (
                  pendingDelegations.map(delegation => (
                    <Card key={delegation._id} className="mb-3 border-warning">
                      <CardBody>
                        <Row className="align-items-center">
                          <Col>
                            <div className="d-flex align-items-center mb-2">
                              <h5 className="mb-0">
                                {delegation.delegator.firstName} {delegation.delegator.lastName}
                              </h5>
                              <Badge color="warning" className="ms-2">{t('delegation.needsYourApproval')}</Badge>
                            </div>
                            <p className="text-muted mb-1">
                              <i className="ri-user-line me-1"></i>
                              {t('delegation.type')}: {getDelegateTypeLabel(delegation.type)}
                            </p>
                            <p className="text-muted mb-0">
                              <i className="ri-mail-line me-1"></i>
                              {t('delegation.email')}: {delegation.delegator.email}
                            </p>
                            <small className="text-muted d-block mt-1">
                              <i className="ri-time-line me-1"></i>
                              {t('delegation.requestedOn')}: {new Date(delegation.createdAt || delegation._id.toString().substring(0,8) + '000').toLocaleDateString()}
                            </small>
                          </Col>
                          <Col md="auto" className="text-end">
                            <div className="d-flex flex-column gap-2">
                              <Button 
                                color="success" 
                                size="sm" 
                                className="d-flex align-items-center"
                                onClick={() => {
                                  setSelectedDelegation(delegation);
                                  setAcceptModal(true);
                                }}
                                disabled={loading}
                              >
                                <i className="ri-check-line me-1"></i> {t('delegation.accept')}
                              </Button>
                              <Button 
                                color="outline-danger" 
                                size="sm"
                                className="d-flex align-items-center"
                                onClick={() => {
                                  setSelectedDelegation(delegation);
                                  setDeclineModal(true);
                                }}
                                disabled={loading}
                              >
                                <i className="ri-close-line me-1"></i> {t('delegation.decline')}
                              </Button>
                            </div>
                          </Col>
                        </Row>
                      </CardBody>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <i className="ri-checkbox-circle-line display-4 text-success"></i>
                    <h5 className="mt-3">{t('delegation.noPendingApprovals')}</h5>
                    <p className="text-muted">{t('delegation.allDelegationsProcessed')}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </TabPane>
      </TabContent>

      {/* Accept Modal */}
      <Modal isOpen={acceptModal} toggle={() => setAcceptModal(false)} centered>
        <ModalHeader toggle={() => setAcceptModal(false)}>
          <i className="ri-check-circle-line text-success me-2"></i>
          {t('delegation.acceptDelegationModal')}
        </ModalHeader>
        <ModalBody>
          {selectedDelegation && (
            <div>
              <div className="mb-3">
                <h6 className="mb-2">{t('delegation.delegationDetails')}:</h6>
                <p className="mb-1"><strong>{t('delegation.from')}:</strong> {selectedDelegation.delegator.firstName} {selectedDelegation.delegator.lastName}</p>
                <p className="mb-1"><strong>{t('delegation.email')}:</strong> {selectedDelegation.delegator.email}</p>
                <p className="mb-2"><strong>{t('delegation.type')}:</strong> {getDelegateTypeLabel(selectedDelegation.type)}</p>
              </div>
              
              {(selectedDelegation.type === 'payment' || selectedDelegation.type === 'both') && (
                <div className="mb-3">
                  <h6 className="mb-2">{t('delegation.paymentDetails')}:</h6>
                  {selectedDelegation.paymentDelegation?.sharedPercentage > 0 && (
                    <p className="mb-1">
                      <strong>{t('delegation.sharedPercentage')}:</strong> {selectedDelegation.paymentDelegation.sharedPercentage}%
                    </p>
                  )}
                  {selectedDelegation.paymentDelegation?.delegateAmount > 0 && (
                    <p className="mb-1">
                      <strong>{t('delegation.amountToPay')}:</strong> €{selectedDelegation.paymentDelegation.delegateAmount}
                    </p>
                  )}
                </div>
              )}

              <div className="alert alert-info">
                <i className="ri-information-line me-2"></i>
                <strong>{t('delegation.byAcceptingDelegation')}</strong>
                <ul className="mb-0 mt-2">
                  {(selectedDelegation.type === 'meeting' || selectedDelegation.type === 'both') && (
                    <li>{t('delegation.receiveInvitations')}</li>
                  )}
                  {(selectedDelegation.type === 'payment' || selectedDelegation.type === 'both') && (
                    <li>{t('delegation.responsibleForPayments')}</li>
                  )}
                  <li>{t('delegation.receiveNotifications')}</li>
                </ul>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setAcceptModal(false)}>
            <i className="ri-close-line me-1"></i> {t('delegation.cancel')}
          </Button>
          <Button 
            color="success" 
            onClick={handleAcceptDelegation}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                {t('delegation.processing')}
              </>
            ) : (
              <>
                <i className="ri-check-line me-1"></i> {t('delegation.acceptDelegation')}
              </>
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Decline Modal */}
      <Modal isOpen={declineModal} toggle={() => setDeclineModal(false)} centered>
        <ModalHeader toggle={() => setDeclineModal(false)}>
          <i className="ri-close-circle-line text-danger me-2"></i>
          {t('delegation.declineDelegationModal')}
        </ModalHeader>
        <ModalBody>
          {selectedDelegation && (
            <div>
              <div className="mb-3">
                <h6 className="mb-2">{t('delegation.delegationDetails')}:</h6>
                <p className="mb-1"><strong>{t('delegation.from')}:</strong> {selectedDelegation.delegator.firstName} {selectedDelegation.delegator.lastName}</p>
                <p className="mb-1"><strong>{t('delegation.email')}:</strong> {selectedDelegation.delegator.email}</p>
                <p className="mb-2"><strong>{t('delegation.type')}:</strong> {getDelegateTypeLabel(selectedDelegation.type)}</p>
              </div>

              <div className="alert alert-warning">
                <i className="ri-alert-line me-2"></i>
                <strong>{t('delegation.importantDecline')}</strong> {t('delegation.confirmDeclineMessage')}
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setDeclineModal(false)}>
            <i className="ri-arrow-left-line me-1"></i> {t('delegation.goBack')}
          </Button>
          <Button 
            color="danger" 
            onClick={handleDeclineDelegation}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                {t('delegation.processing')}
              </>
            ) : (
              <>
                <i className="ri-close-line me-1"></i> {t('delegation.declineDelegation')}
              </>
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default withTranslation()(DelegationTabs);
