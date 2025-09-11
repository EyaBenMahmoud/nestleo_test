import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Form, FormGroup, Label, Input, FormFeedback } from 'reactstrap';
import { useTranslation } from 'react-i18next';

const PayInCashModal = ({ isOpen, toggle, invoice, handleSubmit }) => {
  const { t } = useTranslation();
  const [cashPaymentDetails, setCashPaymentDetails] = useState({
    receivedBy: invoice?.coOwner ? `${invoice.coOwner.firstName} ${invoice.coOwner.lastName}` : '',
    receiptNumber: generateReceiptNumber(),
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const validateForm = () => {
    const newErrors = {};
    
    // Validate receivedBy - ensure it has valid characters (letters, numbers, spaces)
    if (!cashPaymentDetails.receivedBy || cashPaymentDetails.receivedBy.trim() === '') {
      newErrors.receivedBy = t('invoices.cash.errors.receivedByRequired', 'Received by is required');
    } else if (!/^[a-zA-Z0-9\s.'-]+$/.test(cashPaymentDetails.receivedBy)) {
      newErrors.receivedBy = t('invoices.cash.errors.receivedByInvalid', 'Invalid characters in name');
    }
    
    // Validate receiptNumber
    if (!cashPaymentDetails.receiptNumber || cashPaymentDetails.receiptNumber.trim() === '') {
      newErrors.receiptNumber = t('invoices.cash.errors.receiptNumberRequired', 'Receipt number is required');
    } else if (!/^[A-Z0-9-]+$/.test(cashPaymentDetails.receiptNumber)) {
      newErrors.receiptNumber = t('invoices.cash.errors.receiptNumberInvalid', 'Receipt number can only contain uppercase letters, numbers, and hyphens');
    }
    
    // Validate paymentDate
    if (!cashPaymentDetails.paymentDate) {
      newErrors.paymentDate = t('invoices.cash.errors.paymentDateRequired', 'Payment date is required');
    } else {
      // Check if payment date is not in the future
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const paymentDate = new Date(cashPaymentDetails.paymentDate);
      paymentDate.setHours(0, 0, 0, 0);
      
      if (paymentDate > today) {
        newErrors.paymentDate = t('invoices.cash.errors.futureDateNotAllowed', 'Future dates are not allowed');
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCashPaymentDetails(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const submit = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      await handleSubmit(invoice._id, cashPaymentDetails);
      toggle();
    } catch (error) {
      console.error("Error processing cash payment:", error);
      setErrors(prev => ({ 
        ...prev, 
        form: t('invoices.cash.errors.processingError', 'Error processing payment. Please try again.')
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle}>
      <ModalHeader toggle={toggle}>{t('invoices.cash.recordCashPayment', 'Record Cash Payment')}</ModalHeader>
      <ModalBody>
        {errors.form && (
          <div className="alert alert-danger" role="alert">
            {errors.form}
          </div>
        )}
        
        <Form>
          <FormGroup>
            <Label>Invoice # {invoice?.invoiceNumber}</Label>
          </FormGroup>
          <FormGroup>
            <Label>Amount: {invoice?.total} {invoice?.currencyCode}</Label>
          </FormGroup>
          <FormGroup>
            <Label for="receivedBy">{t('invoices.cash.receivedFrom', 'Received From')}</Label>
            <Input
              type="text"
              name="receivedBy"
              id="receivedBy"
              value={cashPaymentDetails.receivedBy}
              onChange={handleChange}
              invalid={!!errors.receivedBy}
            />
            {errors.receivedBy && <FormFeedback>{errors.receivedBy}</FormFeedback>}
            <small className="text-muted">Only letters, numbers and basic punctuation are allowed.</small>
          </FormGroup>

          <FormGroup>
            <Label for="receiptNumber">{t('invoices.cash.receiptNumber', 'Receipt Number')}</Label>
            <Input
              type="text"
              name="receiptNumber"
              id="receiptNumber"
              value={cashPaymentDetails.receiptNumber}
              onChange={handleChange}
              disabled
              invalid={!!errors.receiptNumber}
            />
            {errors.receiptNumber && <FormFeedback>{errors.receiptNumber}</FormFeedback>}
          </FormGroup>

          <FormGroup>
            <Label for="paymentDate">{t('invoices.cash.paymentDate', 'Payment Date')}</Label>
            <Input
              type="date"
              name="paymentDate"
              id="paymentDate"
              value={cashPaymentDetails.paymentDate}
              onChange={handleChange}
              max={new Date().toISOString().split('T')[0]} // Prevent future dates
              invalid={!!errors.paymentDate}
            />
            {errors.paymentDate && <FormFeedback>{errors.paymentDate}</FormFeedback>}
          </FormGroup>

          
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={toggle} disabled={isSubmitting}>
          {t('invoices.cash.cancel', 'Cancel')}
        </Button>
        <Button 
          color="primary" 
          onClick={submit} 
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              {t('invoices.cash.processing', 'Processing...')}
            </>
          ) : (
            t('invoices.cash.confirmPayment', 'Confirm Payment')
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default PayInCashModal;