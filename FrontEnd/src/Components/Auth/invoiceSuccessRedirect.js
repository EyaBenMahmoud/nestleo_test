// InvoiceSuccess.js
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const InvoiceSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const sessionId = query.get('session_id');
  const invoiceId = query.get('invoice_id');

  useEffect(() => {
    const confirmPayment = async () => {
      try {
        // Confirm payment with backend
        const response = await fetch(
          `

${process.env.REACT_APP_API_URL}/api/invoices/confirm-invoice?session_id=${sessionId}&invoice_id=${invoiceId}`
        );
        const result = await response.json();

        if (result.success) {
          toast.success('Payment successful! Invoice status updated.');
          navigate(`/apps-invoices-list-coOwners`);
        } else {
          toast.error(result.error || 'Payment verification failed');
          navigate('/connect');
        }
      } catch (error) {
        toast.error(`Error confirming payment: ${error.message}`);
        navigate('/invoices');
      }
    };

    if (sessionId && invoiceId) {
      confirmPayment();
    } else {
      navigate('/invoices');
    }
  }, [sessionId, invoiceId, navigate]);

  return (
    <div className="container mt-5">
      <div className="text-center">
        <h2>Processing your payment...</h2>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    </div>
  );
};

export default InvoiceSuccess;



