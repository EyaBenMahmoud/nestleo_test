import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Card, CardBody, Button, Dropdown, DropdownToggle, DropdownMenu, DropdownItem, 
  FormGroup, Label, Row, Col, Modal, ModalBody, ModalHeader, ModalFooter, 
  Spinner, Alert, Input, Badge
} from 'reactstrap';
import DeleteModal from "../Common/DeleteModal";
import SuccessModal from "../Common/SucessModal";
import { useSelector } from "react-redux";
import { withTranslation } from 'react-i18next';

const DelegateComponent = ({ t }) => {
  const [delegates, setDelegates] = useState([]);
  const [allCoowners, setAllCoowners] = useState([]);
  const [filteredCoowners, setFilteredCoowners] = useState([]);
  const [selectedDelegate, setSelectedDelegate] = useState('');
  const [delegateEmail, setDelegateEmail] = useState('');
  const [delegationType, setDelegationType] = useState('both');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmModal, setConfirmModal] = useState(false);
  const [delegateToRemove, setDelegateToRemove] = useState(null);
  const [duplicateModal, setDuplicateModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { user } = useSelector((state) => state.Loginn || {});
  const currentBuilding = useSelector(state => state.Building.currentBuilding);

  useEffect(() => {
    if (user) {
      fetchDelegates();
      fetchAllCoowners();
    }
  }, [user]);

  useEffect(() => {
    if (currentBuilding?.id && allCoowners.length > 0) {
      const filtered = allCoowners.filter(coowner => 
        coowner.buildings?.includes(currentBuilding.id)
      );
      setFilteredCoowners(filtered);
    } else {
      setFilteredCoowners(allCoowners);
    }
  }, [currentBuilding, allCoowners]);

  // Auto-refresh for pending delegations
  useEffect(() => {
    const hasPendingDelegations = delegates.some(delegate => 
      !delegate.meetingDelegation?.isActive // Now all delegations require activation
    );

    if (hasPendingDelegations && user?.id) {
      const interval = setInterval(() => {
        fetchDelegates();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [delegates, user]);

  const fetchDelegates = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/delegate/user/${user.id}`);
      console.log('Fetched delegates:', response); // Debug log
      setDelegates(response || []);
    } catch (error) {
      console.error('Error fetching delegates:', error);
      setError(t('delegation.fetchError'));
      setDelegates([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCoowners = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/delegate/coowners/${user.id}`);
      setAllCoowners(response || []);
    } catch (error) {
      console.error('Error fetching coowners:', error);
      setError(t('delegation.fetchError'));
      setAllCoowners([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignDelegate = async () => {
    if (!selectedDelegate || !user?.id) {
      setError(t('delegation.errorSelectDelegate'));
      return;
    }

    const selectedCoowner = filteredCoowners.find(co => co._id === selectedDelegate);
    if (!selectedCoowner) {
      setError(t('delegation.coownerNotFound', 'Selected co-owner not found'));
      return;
    }

    const email = selectedCoowner.email;

    // Check for duplicates
    const existingDelegate = delegates.some(delegate => delegate.email === email);
    if (existingDelegate) {
      setDuplicateModal(true);
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/delegate/assign`, { 
        delegateEmail: email,
        delegationType
      });
      
      setSuccessMessage(t('delegation.assignSuccess', 'Assigned'));
      setSuccessModal(true);
      setSelectedDelegate('');
      setDelegateEmail('');
      setDelegationType('both');
      setAssignModal(false);
      await fetchDelegates();
    } catch (error) {
      console.error('Error assigning delegate:', error);
      setError(t('delegation.assignError'));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDelegate = async () => {
    if (!user?.id || !delegateToRemove) return;
    setLoading(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/delegate/remove`, { delegateId: delegateToRemove });
      setSuccessMessage(t('delegation.deleteSuccess', 'Removed'));
      setSuccessModal(true);
      await fetchDelegates();
    } catch (error) {
      console.error('Error removing delegate:', error);
      setError(t('delegation.deleteError'));
    } finally {
      setLoading(false);
      setConfirmModal(false);
    }
  };

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  const getDelegateTypeLabel = (type) => {
    switch (type) {
      case 'meeting': return t('delegation.meetingDelegate');
      case 'payment': return t('delegation.paymentDelegate');
      case 'both': return t('delegation.bothDelegate');
      default: return type;
    }
  };

  const getDelegateStatusBadge = (delegate) => {
    console.log('Delegate data:', delegate); // Debug log
    
    // All delegations now require activation (meeting delegations are the main indicator)
    return delegate.meetingDelegation?.isActive ? 
      <Badge color="success" className="ms-2">{t('delegation.active')}</Badge> : 
      <Badge color="warning" className="ms-2">{t('delegation.awaitingAcceptance')}</Badge>;
  };

  return (
    <div>
      {error && <Alert color="danger">{error}</Alert>}

      {currentBuilding ? (
        <>
          {/* Display the list of delegates */}
          {loading ? (
            <div className="text-center">
              <Spinner />
            </div>
          ) : (
            <>
              {delegates.length > 0 ? (
                delegates.map(delegate => (
                  <Card key={delegate._id} className="mb-3">
                    <CardBody>
                      <Row className="align-items-center">
                        <Col>
                          <h5>
                            {delegate.user ? 
                              `${delegate.user.firstName} ${delegate.user.lastName}` : 
                              delegate.email}
                            {getDelegateStatusBadge(delegate)}
                          </h5>
                          <p className="text-muted mb-1">
                            {t('delegation.type')}: {getDelegateTypeLabel(delegate.type)}
                          </p>
                          <p className="text-muted mb-0">{t('delegation.delegateEmail')}: {delegate.email}</p>
                        </Col>
                        <Col className="text-end">
                          <Button 
                            color="outline-danger" 
                            size="sm" 
                            onClick={() => { 
                              setDelegateToRemove(delegate._id); 
                              setConfirmModal(true); 
                            }}
                            disabled={loading}
                          >
                            <i className="ri-user-delete-line align-middle"></i> {t('delegation.delete')}
                          </Button>
                        </Col>
                      </Row>
                    </CardBody>
                  </Card>
                ))
              ) : (
                <p>{t('delegation.noDelegationsAssigned')}</p>
              )}
            </>
          )}

          {/* Assign Delegate Button */}
          <div className="d-flex align-items-center mb-4">
            <div className="flex-grow-1">
              <h5 className="card-title mb-0">{t('delegation.assignDelegate')}</h5>
            </div>
            <Button 
              color="secondary" 
              size="sm"
              className="me-2"
              onClick={fetchDelegates}
              disabled={loading}
            >
              <i className="ri-refresh-line me-1"></i>
              {t('delegation.refresh', 'Refresh')}
            </Button>
            <Button 
              color="primary" 
              onClick={() => setAssignModal(true)}
              disabled={loading}
            >
              <i className="ri-user-add-line me-1"></i>
              {t('delegation.assignDelegateButton', 'Assign New Delegate')}
            </Button>
          </div>
        </>
      ) : (
        <Alert color="info" className="mt-3">
          {t('buildings.selectBuilding', 'Please select a building to view or manage delegates')}
        </Alert>
      )}

      {/* Assign Delegate Modal */}
      <Modal isOpen={assignModal} toggle={() => setAssignModal(false)} centered size="lg">
        <ModalHeader toggle={() => setAssignModal(false)}>
          {t('delegation.assignDelegateButton', 'Assign New Delegate')}
        </ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>{t('delegation.delegateType')}</Label>
            <Input 
              type="select" 
              value={delegationType} 
              onChange={(e) => setDelegationType(e.target.value)}
            >
              <option value="meeting">{t('delegation.meetingDelegate')}</option>
              <option value="payment">{t('delegation.paymentDelegate')}</option>
              <option value="both">{t('delegation.bothDelegate')}</option>
            </Input>
          </FormGroup>

          <FormGroup>
            <Label>{t('delegation.selectDelegate')}</Label>
            <Dropdown isOpen={dropdownOpen} toggle={toggleDropdown}>
              <DropdownToggle caret disabled={loading}>
                {selectedDelegate ? 
                  `${filteredCoowners.find(co => co._id === selectedDelegate)?.firstName} ${filteredCoowners.find(co => co._id === selectedDelegate)?.lastName}` : 
                  t('delegation.selectDelegateOption', 'Choose a co-owner')}
              </DropdownToggle>
              <DropdownMenu>
                <DropdownItem onClick={() => setSelectedDelegate('')}>
                  {t('delegation.selectDelegateOption', '-- Select a co-owner --')}
                </DropdownItem>
                {filteredCoowners.length > 0 ? (
                  filteredCoowners.map(coowner => (
                    <DropdownItem 
                      key={coowner._id} 
                      onClick={() => {
                        setSelectedDelegate(coowner._id);
                        setDelegateEmail(coowner.email);
                      }}
                    >
                      {coowner.firstName} {coowner.lastName} ({coowner.email})
                    </DropdownItem>
                  ))
                ) : (
                  <DropdownItem disabled>
                    {t('buildings.noCoowners', 'No co-owners available in this building')}
                  </DropdownItem>
                )}
              </DropdownMenu>
            </Dropdown>
            <small className="text-muted">
              {t('buildings.selectCoownerHelp', 'Select a registered co-owner from your building to assign as delegate')}
            </small>
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setAssignModal(false)}>
            {t('delegation.cancel')}
          </Button>
          <Button 
            color="primary" 
            onClick={handleAssignDelegate}
            disabled={!selectedDelegate || loading}
          >
            {loading ? t('delegation.processing') : t('delegation.assignDelegateButton')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modals */}
      <SuccessModal
        isOpen={successModal}
        toggle={() => setSuccessModal(false)}
        message={`User ${successMessage} Successfully`}
        messageLowerCase={`The Delegate has been ${successMessage.toLowerCase()} successfully.`}
      />

      <DeleteModal
        show={confirmModal}
        onDeleteClick={handleRemoveDelegate}
        onCloseClick={() => setConfirmModal(false)}
      />

      <Modal isOpen={duplicateModal} toggle={() => setDuplicateModal(false)} centered>
        <ModalBody className='text-center p-5'>
          <h4 className="mb-3 text-primary">{t('delegation.emailAlreadyAssigned', 'Email Already Assigned')}</h4>
          <p className="text-muted fs-15 mb-4">{t('delegation.emailAlreadyAssignedMessage', 'This email is already assigned as a delegate. Please use a different email address.')}</p>
          <div className="hstack gap-2 justify-content-center">
            <Button color="primary" onClick={() => setDuplicateModal(false)}>{t('delegation.okay', 'Okay')}</Button>
          </div>
        </ModalBody>
      </Modal>
    </div>
  );
};

export default withTranslation()(DelegateComponent);