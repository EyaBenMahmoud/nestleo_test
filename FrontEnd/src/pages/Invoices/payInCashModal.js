import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Form, FormGroup, Label, Input } from 'reactstrap';

const PayInCashModal = ({ isOpen, toggle, invoice, handleSubmit }) => {
  const [cashPaymentDetails, setCashPaymentDetails] = useState({
    receivedBy: invoice?.coOwner ? `${invoice.coOwner.firstName} ${invoice.coOwner.lastName}` : '',
    receiptNumber: generateReceiptNumber(),
    paymentDate: new Date().toISOString().split('T')[0]
  });

  function generateReceiptNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `REC-${year}-${randomNum}`;
  }

  useEffect(() => {
    if (invoice?.coOwner) {
      setCashPaymentDetails(prev => ({
        ...prev,
        receivedBy: `${invoice.coOwner.firstName} ${invoice.coOwner.lastName}`
      }));
    }
  }, [invoice]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCashPaymentDetails(prev => ({ ...prev, [name]: value }));
  };

  const submit = () => {
    handleSubmit(invoice._id, cashPaymentDetails);
    toggle();
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle}>
      <ModalHeader toggle={toggle}>Record Cash Payment</ModalHeader>
      <ModalBody>
        <Form>
          <FormGroup>
            <Label>Invoice # {invoice.invoiceNumber}</Label>
          </FormGroup>
          <FormGroup>
            <Label>Amount: {invoice.total} {invoice.currencyCode}</Label>
          </FormGroup>
          <FormGroup>
            <Label for="receivedBy">Received From</Label>
            <Input
              type="text"
              name="receivedBy"
              id="receivedBy"
              value={cashPaymentDetails.receivedBy}
              disabled
            />
          </FormGroup>

          <FormGroup>
            <Label for="receiptNumber">Receipt Number</Label>
            <Input
              type="text"
              name="receiptNumber"
              id="receiptNumber"
              value={cashPaymentDetails.receiptNumber}
              disabled
            />
          </FormGroup>

          <FormGroup>
            <Label for="paymentDate">Payment Date</Label>
            <Input
              type="date"
              name="paymentDate"
              id="paymentDate"
              value={cashPaymentDetails.paymentDate}
              disabled
            />
          </FormGroup>

        </Form>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={toggle}>Cancel</Button>
        <Button color="primary" onClick={submit}>Confirm Payment</Button>
      </ModalFooter>
    </Modal>
  );
};

export default PayInCashModal;