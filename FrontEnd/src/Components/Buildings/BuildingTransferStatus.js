import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardBody,
  CardTitle,
  Alert,
  Button,
  Badge,
  Spinner,
  ListGroup,
  ListGroupItem,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter
} from 'reactstrap';
import { 
  FaExchangeAlt, 
  FaEnvelope, 
  FaClock, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaExclamationTriangle,
  FaUser,
  FaBuilding
} from 'react-icons/fa';
import { finalizeBuildingTransfer, cancelBuildingTransfer, clearAllBuildingState, clearCurrentBuilding } from '../../slices/buildings/building';
import { logout } from '../../slices/login/loginSlice';
import { withTranslation } from 'react-i18next';

const BuildingTransferStatus = ({ building, t }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { transfer } = useSelector((state) => state.Building);
  const user = useSelector((state) => state.Loginn.user || {});
  
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Check if current user is the owner of the building
  const isOwner = building?.user === user._id || 
                  building?.user?._id === user._id ||
                  building?.user?.toString() === user._id?.toString();

  const handleFinalizeTransfer = async () => {
    try {
      const result = await dispatch(finalizeBuildingTransfer({ buildingId: building._id }));
      
      // If transfer was successful, perform logout
      if (result.type.includes('fulfilled')) {
        // First determine redirect path based on user role (same logic as in Logout.js)
        const currentUserRole = user?.role || JSON.parse(localStorage.getItem('user'))?.role;
        const targetPath = currentUserRole === 'SuperAdmin' ? "/super-admin" : "/connect";
        
        // Close the modal
        setShowFinalizeModal(false);
        
        // Dispatch logout actions
        dispatch(clearCurrentBuilding());
        dispatch(clearAllBuildingState());
        dispatch(logout());
        
        // Navigate to login page
        navigate(targetPath);
      }
    } catch (error) {
      console.error('Error finalizing transfer:', error);
    }
  };

  const handleCancelTransfer = async () => {
    try {
      const result = await dispatch(cancelBuildingTransfer({ buildingId: building._id }));
      setShowCancelModal(false);
      
      // If cancellation was successful, refresh the page to show updated status
      if (result.type.includes('fulfilled')) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error canceling transfer:', error);
    }
  };

  const renderTransferStatus = () => {
    if (!building.transferStatus || building.transferStatus === 'none') {
      return (
        <Alert color="info" className="text-center">
          <FaCheckCircle className="me-2" />
          {t('buildingTransfer.noTransfersPending')}
        </Alert>
      );
    }

    switch (building.transferStatus) {
      case 'pending_email_confirmation':
        return (
          <Card className="border-warning">
            <CardBody>
              <div className="d-flex align-items-center mb-3">
                <FaEnvelope className="text-warning me-2" size={24} />
                <div className="flex-grow-1">
                  <h6 className="mb-1 text-warning">{t('buildingTransfer.transferRequested')}</h6>
                  <small className="text-muted">
                    {t('buildingTransfer.emailConfirmationRequired')}
                  </small>
                </div>
                <Badge color="warning" pill>
                  <FaClock className="me-1" />
                  {t('common.pending')}
                </Badge>
              </div>
              
              <ListGroup flush>
                <ListGroupItem className="border-0 px-0 py-2">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">{t('buildingTransfer.targetEmail')}:</span>
                    <span className="fw-bold">{building.pendingTransferEmail}</span>
                  </div>
                </ListGroupItem>
                <ListGroupItem className="border-0 px-0 py-2">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">{t('buildingTransfer.currentOwner')}:</span>
                    <span>{building.currentOwnerEmail || user.email}</span>
                  </div>
                </ListGroupItem>
              </ListGroup>

              <Alert color="warning" className="mt-3 mb-3">
                <FaClock className="me-2" />
                <small>{t('buildingTransfer.emailExpiry')}</small>
              </Alert>

              {isOwner && (
                <div className="d-flex gap-2 justify-content-end">
                  <Button 
                    color="outline-danger" 
                    size="sm"
                    onClick={() => setShowCancelModal(true)}
                    disabled={transfer?.loading}
                  >
                    {transfer?.loading ? (
                      <Spinner size="sm" className="me-1" />
                    ) : (
                      <FaTimesCircle className="me-1" />
                    )}
                    {t('buildingTransfer.cancelTransfer')}
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        );

      case 'pending_final_approval':
        return (
          <Card className="border-success">
            <CardBody>
              <div className="d-flex align-items-center mb-3">
                <FaCheckCircle className="text-success me-2" size={24} />
                <div className="flex-grow-1">
                  <h6 className="mb-1 text-success">{t('buildingTransfer.emailConfirmed')}</h6>
                  <small className="text-muted">
                    {t('buildingTransfer.nextStepsMessage')}
                  </small>
                </div>
                <Badge color="success" pill>
                  <FaCheckCircle className="me-1" />
                  {t('common.confirmed')}
                </Badge>
              </div>

              <ListGroup flush>
                <ListGroupItem className="border-0 px-0 py-2">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">{t('buildingTransfer.newOwner')}:</span>
                    <span className="fw-bold text-success">{building.pendingTransferEmail}</span>
                  </div>
                </ListGroupItem>
                <ListGroupItem className="border-0 px-0 py-2">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">{t('buildingTransfer.currentOwner')}:</span>
                    <span>{building.currentOwnerEmail || user.email}</span>
                  </div>
                </ListGroupItem>
              </ListGroup>

              <Alert color="success" className="mt-3 mb-3">
                <FaCheckCircle className="me-2" />
                <small>{t('buildingTransfer.readyToFinalize')}</small>
              </Alert>

              {isOwner && (
                <div className="d-flex gap-2 justify-content-end">
                  <Button 
                    color="outline-secondary" 
                    size="sm"
                    onClick={() => setShowCancelModal(true)}
                    disabled={transfer?.loading}
                  >
                    {transfer?.loading ? (
                      <Spinner size="sm" className="me-1" />
                    ) : (
                      <FaTimesCircle className="me-1" />
                    )}
                    {t('buildingTransfer.cancelTransfer')}
                  </Button>
                  <Button 
                    color="success" 
                    size="sm"
                    onClick={() => setShowFinalizeModal(true)}
                    disabled={transfer?.loading}
                  >
                    {transfer?.loading ? (
                      <Spinner size="sm" className="me-1" />
                    ) : (
                      <FaExchangeAlt className="me-1" />
                    )}
                    {t('buildingTransfer.finalizeTransfer')}
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        );

      case 'completed':
        return (
          <Alert color="info" className="text-center">
            <FaCheckCircle className="me-2" />
            {t('buildingTransfer.transferCompleted')}
          </Alert>
        );

      case 'failed':
        return (
          <Alert color="danger" className="text-center">
            <FaTimesCircle className="me-2" />
            {t('buildingTransfer.transferFailed')}
          </Alert>
        );

      default:
        return (
          <Alert color="info" className="text-center">
            <FaCheckCircle className="me-2" />
            {t('buildingTransfer.noTransfersPending')}
          </Alert>
        );
    }
  };

  return (
    <>
      <Card className="shadow-sm border-0">
        <CardBody>
          <CardTitle tag="h5" className="border-bottom pb-2 mb-3">
            <FaExchangeAlt className="me-2" />
            {t('buildingTransfer.pendingTransfers')}
          </CardTitle>

          {renderTransferStatus()}

          {transfer?.error && (
            <Alert color="danger" className="mt-3">
              <FaExclamationTriangle className="me-2" />
              {transfer.error}
            </Alert>
          )}

          {transfer?.message && !transfer?.error && (
            <Alert color="success" className="mt-3">
              <FaCheckCircle className="me-2" />
              {transfer.message}
            </Alert>
          )}
        </CardBody>
      </Card>

      {/* Finalize Transfer Modal */}
      <Modal isOpen={showFinalizeModal} toggle={() => setShowFinalizeModal(false)} centered>
        <ModalHeader toggle={() => setShowFinalizeModal(false)}>
          <FaExchangeAlt className="me-2 text-success" />
          {t('buildingTransfer.finalizeTransfer')}
        </ModalHeader>
        <ModalBody>
          <div className="text-center">
            <FaExclamationTriangle size={48} className="text-warning mb-3" />
            <h5 className="mb-3">{t('buildingTransfer.finalizeConfirmation')}</h5>
            <p className="text-muted mb-4">
              {t('buildingTransfer.finalizeWarning', {
                buildingName: building.name,
                targetEmail: building.pendingTransferEmail
              })}
            </p>
            <Alert color="danger">
              <FaExclamationTriangle className="me-2" />
              <strong>{t('buildingTransfer.irreversibleAction')}</strong>
            </Alert>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowFinalizeModal(false)}>
            {t('common.cancel')}
          </Button>
          <Button 
            color="success" 
            onClick={handleFinalizeTransfer}
            disabled={transfer?.loading}
          >
            {transfer?.loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                {t('buildingTransfer.finalizing')}
              </>
            ) : (
              <>
                <FaExchangeAlt className="me-2" />
                {t('buildingTransfer.finalizeTransfer')}
              </>
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Cancel Transfer Modal */}
      <Modal isOpen={showCancelModal} toggle={() => setShowCancelModal(false)} centered>
        <ModalHeader toggle={() => setShowCancelModal(false)}>
          <FaTimesCircle className="me-2 text-danger" />
          {t('buildingTransfer.cancelTransfer')}
        </ModalHeader>
        <ModalBody>
          <div className="text-center">
            <FaTimesCircle size={48} className="text-danger mb-3" />
            <h5 className="mb-3">{t('buildingTransfer.cancelConfirmation')}</h5>
            <p className="text-muted">
              {t('buildingTransfer.cancelWarning', {
                buildingName: building.name,
                targetEmail: building.pendingTransferEmail
              })}
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowCancelModal(false)}>
            {t('common.cancel')}
          </Button>
          <Button 
            color="danger" 
            onClick={handleCancelTransfer}
            disabled={transfer?.loading}
          >
            {transfer?.loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                {t('buildingTransfer.canceling')}
              </>
            ) : (
              <>
                <FaTimesCircle className="me-2" />
                {t('buildingTransfer.cancelTransfer')}
              </>
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default withTranslation()(BuildingTransferStatus);
