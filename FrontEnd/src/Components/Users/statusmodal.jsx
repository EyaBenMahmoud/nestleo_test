import React from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from "reactstrap";
import { FaCheckCircle, FaBan } from "react-icons/fa"; // Icons for status

const StatusModal = ({ show, onCloseClick, onConfirmClick, user, isActive }) => {
  return (
    <Modal isOpen={show} toggle={onCloseClick} fade={true} centered={true}>
      <ModalHeader toggle={onCloseClick}>Change User Status</ModalHeader>
      <ModalBody>
        <div className="text-center">
          {/* Icon displayed on top */}
          <div className="mb-3">
            {isActive ? (
              <FaBan size={50} className="text-danger" /> 
            ) : (
              <FaCheckCircle size={50} className="text-success" /> 

            )}
          </div>
          
          {/* Message below the icon */}
          <div>
            Are you sure you want to {isActive ? "deactivate" : "activate"} this user?
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={onCloseClick}>
          Cancel
        </Button>
        <Button
          color="primary"
          onClick={() => {
            onConfirmClick(user._id); // Confirm the status change for this user
            onCloseClick(); // Close modal after confirmation
          }}
        >
          {isActive ? "Deactivate" : "Activate"}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default StatusModal;
