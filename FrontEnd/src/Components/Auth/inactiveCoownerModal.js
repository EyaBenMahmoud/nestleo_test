import React from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from "reactstrap";
import { FaExclamationTriangle } from "react-icons/fa";
import { useTranslation } from "react-i18next";

const AccountInactiveModal = ({ isOpen, onClose, onLogout }) => {
  const { t } = useTranslation();
  return (
    <Modal isOpen={isOpen} toggle={onClose} centered className="account-inactive-modal">
      <ModalHeader toggle={onClose} className="border-0 pb-0">
        <div className="d-flex align-items-center">
          <div className="modal-icon-container warning-icon me-3">
            <FaExclamationTriangle size={20} />
          </div>
          <h5 className="modal-title mb-0">{t('buildingInput.accountPendingApproval')}</h5>
        </div>
      </ModalHeader>
      <ModalBody className="pt-3 pb-4">
        <div className="text-center mb-4">
          <div className="waiting-animation">
            <div className="circle-pulse"></div>
          </div>
        </div>
        <div className="account-inactive-message p-3">
          <p className="mb-3">{t('buildingInput.accountInactiveMessage')}</p>
          <p className="mb-3">{t('buildingInput.emailNotification')}</p>
          <p className="mb-0 fw-medium">{t('buildingInput.thankYouPatience')}</p>
        </div>
      </ModalBody>
      <ModalFooter className="border-0 pt-0">
        <Button color="primary" onClick={onLogout} className="px-4 nestly-btn-primary">
          {t('buildingInput.iUnderstand')}
        </Button>
      </ModalFooter>
      <style jsx>{`
        .modal-icon-container.warning-icon {
          background: rgba(255, 152, 0, 0.1);
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ff9800;
        }
        .waiting-animation {
          position: relative;
          width: 120px;
          height: 120px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .circle-pulse {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background-color: rgba(230, 72, 92, 0.7);
          position: absolute;
          animation: pulse-animation 2s infinite;
        }
        .circle-pulse:after {
          content: "";
          position: absolute;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background-color: white;
          top: 10px;
          left: 10px;
          z-index: 1;
        }
        .account-inactive-message {
          background-color: rgba(230, 72, 92, 0.05);
          border-radius: 8px;
        }
        @keyframes pulse-animation {
          0% {
            box-shadow: 0 0 0 0 rgba(230, 72, 92, 0.4);
          }
          70% {
            box-shadow: 0 0 0 25px rgba(230, 72, 92, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(230, 72, 92, 0);
          }
        }
      `}</style>
    </Modal>
  );
};

export default AccountInactiveModal;