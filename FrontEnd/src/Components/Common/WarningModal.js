import React from 'react';
import { Modal, ModalBody } from 'reactstrap';

const WarningModal = ({ isOpen, toggle, message, messageLowerCase }) => {
  return (
    <Modal isOpen={isOpen} toggle={toggle} centered>
      <ModalBody className="text-center p-5">
        <div className="text-end">
          <button 
            type="button" 
            onClick={toggle} 
            className="btn-close text-end" 
            data-bs-dismiss="modal" 
            aria-label="Close">
          </button>
        </div>
        <div className="mt-2">
          <lord-icon 
            src="https://cdn.lordicon.com/ifclergl.json" 
            trigger="hover" 
            colors="primary:#f7b84b,secondary:#f06548" 
            style={{ width: "150px", height: "150px" }}>
          </lord-icon>
          <h4 className="mb-3 mt-4">{message} </h4>
          <p className="text-muted fs-15 mb-4">
            {messageLowerCase.toLowerCase()} 
          </p>
          <div className="hstack gap-2 justify-content-center">
            <button className="btn btn-warning" onClick={toggle}>Close</button>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
};

export default WarningModal;