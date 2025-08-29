import React from 'react';
import { Modal, ModalBody } from 'reactstrap';
import { useTranslation } from 'react-i18next';

const SuccessModal = ({ isOpen, toggle, message, messageLowerCase }) => {
  const { t } = useTranslation();

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        toggle={toggle} 
        centered
        fade={true}
        className="success-modal"
        size="md"
      >
        <div className="modal-header-custom">
          {t("Common.successModal.title")}
          <button
            type="button"
            className="btn-close"
            onClick={toggle}
            aria-label={t("Common.close")}
          >
            <span>×</span>
          </button>
        </div>

        <ModalBody className="p-4 text-center">
          <div className="circle-icon mb-4">
            <i className="ri-check-line"></i>
          </div>

          <h4 className="mb-3 success-title">
            {message || t("Common.successModal.defaultMessage")}
          </h4>

          <p className="mb-4 success-message">
            {messageLowerCase || t("Common.successModal.defaultDescription")}
          </p>

          <button
            className="btn continue-btn"
            onClick={toggle}
          >
            {t("Common.close")}
          </button>
        </ModalBody>
      </Modal>

      <style jsx>{`
        /* Success Modal Styling - matching the red theme from image */
        .success-modal .modal-content {
          border: none;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          overflow: hidden;
        }
        
        /* Modal header - red theme matching the image */
        .modal-header-custom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #E53E3E;
          color: white;
          padding: 15px 20px;
          font-size: 18px;
          font-weight: 600;
          border-bottom: none;
        }
        
        .modal-header-custom .btn-close {
          padding: 0;
          margin: 0;
          font-size: 28px;
          font-weight: 300;
          color: white;
          background: transparent;
          border: 0;
          opacity: 0.8;
          cursor: pointer;
          transition: opacity 0.2s ease;
        }
        
        .modal-header-custom .btn-close:hover {
          opacity: 1;
        }
        
        /* Circle icon for success - matching the red theme */
        .circle-icon {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background-color: #E53E3E;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px auto;
          box-shadow: 0 4px 15px rgba(229, 62, 62, 0.3);
        }
        
        .circle-icon i {
          font-size: 50px;
          color: white;
          font-weight: bold;
        }
        
        /* Success title - larger and bolder */
        .success-title {
          font-size: 24px;
          font-weight: 700;
          color: #2D3748;
          margin-bottom: 8px;
        }
        
        /* Success message - updated styling */
        .success-message {
          color: #718096;
          font-size: 16px;
          line-height: 1.5;
          margin-bottom: 30px;
        }
        
        /* Continue button - red theme matching header */
        .continue-btn {
          background-color: #E53E3E;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 30px;
          font-weight: 600;
          font-size: 16px;
          min-width: 120px;
          transition: all 0.2s ease;
          text-transform: capitalize;
        }
        
        .continue-btn:hover {
          background-color: #C53030;
          color: white;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(229, 62, 62, 0.3);
        }
        
        /* Modal body padding adjustment */
        .success-modal .modal-body {
          padding: 40px 30px;
        }
        
        /* Dark mode support */
        [data-layout-mode="dark"] .success-title {
          color: #F7FAFC;
        }
        
        [data-layout-mode="dark"] .success-message {
          color: #A0AEC0;
        }
        
        [data-layout-mode="dark"] .success-modal .modal-content {
          background-color: #2D3748;
        }
      `}</style>
    </>
  );
};

export default SuccessModal;
