import React from "react";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import { useNavigate } from "react-router-dom";

const ConflictAlertModal = ({ isOpen, toggle, conflictDetails, t }) => {
  // Initialisation correcte du hook useNavigate
  const navigate = useNavigate();

  return (
    <Modal isOpen={isOpen} toggle={toggle} centered>
      <ModalHeader toggle={toggle}>
        <i className="fas fa-exclamation-triangle text-warning me-2"></i>
        {t('calendar.conflictDetected')}
      </ModalHeader>
      <ModalBody>
        <div className="text-center mb-4">
          <i className="fas fa-calendar-times fa-3x text-warning mb-3"></i>
          <p>{conflictDetails?.message}</p>
        </div>

        {conflictDetails?.event && (
          <div className="border rounded p-3 bg-light">
            <h5 className="fw-bold">{t('calendar.conflictingEventDetails')}</h5>
            <p><strong>{t('calendar.title')}:</strong> {conflictDetails.event.title}</p>
            <p><strong>{t('calendar.time')}:</strong> {conflictDetails.event.time}</p>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={toggle}>
          {t('common.close')}
        </Button>
  
      </ModalFooter>
    </Modal>
  );
};

// Exportation par défaut du composant
export default ConflictAlertModal;