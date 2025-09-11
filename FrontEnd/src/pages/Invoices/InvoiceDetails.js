import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CardBody, Row, Modal, ModalHeader,
  ModalBody, FormGroup, ModalFooter, Label, Input, Col, Card, Table, CardHeader, Container, Spinner, Alert, Button, Badge,
  Form
} from "reactstrap";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { clearCurrentInvoice, getInvoiceById } from "../../slices/invoice/slice";
import moment from "moment";
import logoDark from "../../assets/images/elitecomm.png";
import logoLight from "../../assets/images/idw1MjGaM1_logos.png";
import { useTranslation } from "react-i18next";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../../services/api";

const InvoiceDetails = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // State variables for proof review
  const [proofReviewModal, setProofReviewModal] = useState(false);
  const [proofReviewNotes, setProofReviewNotes] = useState('');
  const [isProcessingReview, setIsProcessingReview] = useState(false);

  // State variables for submitting payment proof
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentProof, setPaymentProof] = useState(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [paymentNotes, setPaymentNotes] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  // Get invoice details from Redux store
  const { currentInvoice, loading, error } = useSelector((state) => state.Invoice);
  const user = useSelector((state) => state.Loginn.user);
  const role = user.role;
  const [link, setLink] = useState("");

  useEffect(() => {
    if (role === 'SyndicateCoowner') {
      setLink("/apps-invoices-list-coOwners");
    } else if (role === 'SyndicateAdmin') {
      setLink("/apps-invoices-list");
    }
  }, [role]);

  useEffect(() => {
    if (id) {
      dispatch(getInvoiceById(id));
    }
    return () => {
      dispatch(clearCurrentInvoice());
    };
  }, [dispatch, id]);

  const downloadInvoice = (invoiceNumber) => {
    window.open(`${process.env.REACT_APP_API_URL}/api/invoices/download/${invoiceNumber}`, '_blank');
  };

  // Print the Invoice
  const printInvoice = () => {
    if (!currentInvoice) {
      toast.error(t("invoices.details.noInvoiceData"));
      return;
    }
    window.print();
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t("invoices.details.fileTooLarge"));
        return;
      }

      // Check file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast.error(t("invoices.details.invalidFileType"));
        return;
      }

      setPaymentProof(file);
    }
  };

  const submitPaymentProof = async () => {
    if (!paymentProof) {
      toast.error(t("invoices.details.noPaymentProof"));
      return;
    }

    if (!paymentReference.trim()) {
      toast.error(t("invoices.details.noReference"));
      return;
    }

    setIsSubmittingProof(true);

    try {
      // Create form data
      const formData = new FormData();
      formData.append("proof", paymentProof);
      formData.append("invoiceId", currentInvoice._id);
      formData.append("referenceNumber", paymentReference);
      formData.append("paymentDate", paymentDate.toISOString());
      formData.append("notes", paymentNotes);

      // Upload with progress tracking
      const response = await api.post("/api/invoices/submit-payment-proof", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        },
      });
      if (response.data.success) {
        toast.success(t("invoices.details.paymentProofSubmitted"));
        setPaymentModal(false);
        dispatch(getInvoiceById(id));
      } else {
        toast.error(response.data.message || t("invoices.details.failedSubmitProof"));
      }
    } catch (error) {
      console.error("Error submitting payment proof:", error);
      toast.error(error.response?.data?.message || t("invoices.details.failedSubmitProof"));
    } finally {
      setIsSubmittingProof(false);
    }
  };

  // Handle proof review
  const handleProofReview = async (isApproved) => {
    setIsProcessingReview(true);

    try {
      const response = await api.post('/api/invoices/review-payment-proof', {
        invoiceId: currentInvoice._id,
        isApproved,
        reviewNotes: proofReviewNotes
      });

      if (response.data.success) {
        toast.success(isApproved
          ? t("invoices.details.paymentApproved")
          : t("invoices.details.paymentRejected")
        );
        setProofReviewModal(false);
        dispatch(getInvoiceById(id));
      } else {
        toast.error(response.data.message || t("invoices.details.failedReview"));
      }
    } catch (error) {
      console.error('Error reviewing payment proof:', error);
      toast.error(error.response?.data?.message || t("invoices.details.failedReview"));
    } finally {
      setIsProcessingReview(false);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="page-content">
        <Container fluid>
          <div className="invoice-loading">
            <Spinner color="primary" className="invoice-loading-spinner" />
            <p>{t("invoices.details.loading")}</p>
          </div>
        </Container>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="page-content">
        <Container fluid>
          <Alert color="danger" className="invoice-error">
            <i className="ri-error-warning-line me-2"></i>
            {t("invoices.details.error", { message: error.message || error.toString() })}
          </Alert>
        </Container>
      </div>
    );
  }

  // Render not found state
  if (!currentInvoice) {
    return (
      <div className="page-content">
        <Container fluid>
          <div className="invoice-not-found">
            <div className="invoice-not-found-icon">
              <i className="ri-file-search-line"></i>
            </div>
            <h3>{t("invoices.details.notFound")}</h3>
            <p>{t("invoices.details.notFoundMessage")}</p>
            <Button color="primary" tag={Link} to={link}>
              {t("invoices.details.backToInvoices")}
            </Button>
          </div>
        </Container>
      </div>
    );
  }

  const {
    invoiceNumber,
    syndicateName,
    buildingAddress,
    city,
    postalCode,
    date,
    dueDate,
    status,
    coOwner,
    apartmentNumber,
    items,
    subtotal,
    tax,
    total,
    building
  } = currentInvoice;

  document.title = t("invoices.details.title", { invoiceNumber });

  // Get formatted date and due date
  const formattedDate = date ? moment(date).format('DD MMM YYYY') : t("invoices.details.na");
  const formattedDueDate = dueDate ? moment(dueDate).format('DD MMM YYYY') : t("invoices.details.na");

  // Determine if invoice is overdue
  const isOverdue = dueDate && moment().isAfter(moment(dueDate)) && status !== 'paid';

  // Calculate days remaining/overdue
  let daysText = '';
  if (dueDate) {
    const today = moment();
    const due = moment(dueDate);
    const daysDiff = due.diff(today, 'days');

    if (status === 'paid') {
      daysText = ''; // No need to show days if paid
    } else if (daysDiff > 0) {
      daysText = `${daysDiff} days remaining`;
    } else if (daysDiff === 0) {
      daysText = `Due today`;
    } else {
      daysText = `${Math.abs(daysDiff)} days overdue`;
    }
  }

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title={t("invoices.details.title", { invoiceNumber })} pageTitle={t("invoices.details.pageTitle")} />

        <Row className="justify-content-center">
          <Col xl={9} lg={10}>
            <Card className="invoice-card">
              {/* Invoice Header */}
              <div className="invoice-header">
                <div className="invoice-brand">
                  <img
                    src={logoDark}
                    alt={t("invoices.details.logoAlt")}
                    className="invoice-logo"
                  />
                  <div className="invoice-title">
                    <h4>{t("invoices.details.invoice")}</h4>
                    <h2>#{invoiceNumber}</h2>
                  </div>
                </div>

                <div className="invoice-status-container">
                  <Badge
                    color={status === 'paid' ? 'success' : status === 'pending' ? 'warning' : isOverdue ? 'danger' : 'info'}
                    pill
                    className="invoice-status-badge"
                  >
                    {status === 'paid' ? t("invoices.details.paid") :
                      status === 'pending' ? t("invoices.details.pending") :
                        isOverdue ? t("invoices.details.overdue") : t("invoices.details.unpaid")}
                  </Badge>

                  {daysText && (
                    <div className={`invoice-days ${isOverdue ? 'text-danger' : ''}`}>
                      <i className={`ri-${isOverdue ? 'alarm-warning' : 'time'}-line me-1`}></i>
                      {daysText}
                    </div>
                  )}
                </div>
              </div>

              {/* Invoice Meta */}
              <div className="invoice-meta">
                <div className="invoice-meta-item">
                  <span className="invoice-meta-label">{t("invoices.details.issueDate")}</span>
                  <span className="invoice-meta-value">{formattedDate}</span>
                </div>
                <div className="invoice-meta-item">
                  <span className="invoice-meta-label">{t("invoices.details.dueDate")}</span>
                  <span className={`invoice-meta-value ${isOverdue ? 'text-danger' : ''}`}>
                    {formattedDueDate}
                  </span>
                </div>
                <div className="invoice-meta-item">
                  <span className="invoice-meta-label">{t("invoices.details.amount")}</span>
                  <span className="invoice-meta-value invoice-amount">€{(total || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="invoice-divider"></div>

              {/* Invoice Parties */}
              <div className="invoice-parties">
                <div className="invoice-party">
                  <h6 className="invoice-section-title">{t("invoices.details.from")}</h6>
                  <div className="invoice-party-details">
                    <h5 className="invoice-party-name">{syndicateName || t("invoices.details.defaultSyndicate")}</h5>
                    <p className="invoice-party-address">
                      {buildingAddress || t("invoices.details.noAddress")} <br />
                      {city ? `${city}, ${postalCode || ''}` : t("invoices.details.noCity")}
                    </p>
                  </div>
                </div>

                <div className="invoice-party">
                  <h6 className="invoice-section-title">{t("invoices.details.to")}</h6>
                  <div className="invoice-party-details">
                    <h5 className="invoice-party-name">
                      {coOwner?.firstName} {coOwner?.lastName}
                    </h5>
                    <p className="invoice-party-address mb-0">
                      {coOwner?.email || t("invoices.details.noEmail")}
                    </p>
                    <p className="invoice-party-info">
                      <span className="invoice-property-label">{t("invoices.details.building")}:</span> {building?.name || t("invoices.details.na")} <br />
                      <span className="invoice-property-label">{t("invoices.details.apartment")}:</span> {apartmentNumber || t("invoices.details.na")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Invoice Items */}
              <div className="invoice-items">
                <h6 className="invoice-section-title">{t("invoices.details.invoiceDetails")}</h6>
                <div className="invoice-table-container">
                  <table className="invoice-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>{t("invoices.details.description")}</th>
                        <th className="text-end">{t("invoices.details.amount")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items?.map((item, index) => (
                        <tr key={index}>
                          <td className="invoice-item-number">{index + 1}</td>
                          <td className="invoice-item-desc">{item?.description || t("invoices.details.noDescription")}</td>
                          <td className="invoice-item-amount">€{(item?.amount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                      {(!items || items.length === 0) && (
                        <tr>
                          <td colSpan="3" className="text-center py-4 text-muted">{t("invoices.details.noItems")}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="invoice-summary">
                  <div className="invoice-summary-row">
                    <span>{t("invoices.details.subtotal")}</span>
                    <span>€{(subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="invoice-summary-row">
                    <span>{t("invoices.details.tax")} ({subtotal ? ((tax / subtotal) * 100).toFixed(0) : 0}%)</span>
                    <span>€{(tax || 0).toFixed(2)}</span>
                  </div>
                  <div className="invoice-summary-row invoice-summary-total">
                    <span>{t("invoices.details.total")}</span>
                    <span>€{(total || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Instructions */}
              <div className="invoice-payment">
                <h6 className="invoice-section-title">{t("invoices.details.paymentInstructions")}</h6>
                <div className="invoice-payment-info">
                  <div className="invoice-payment-method">
                    <div className="invoice-payment-icon">
                      <i className="ri-bank-line"></i>
                    </div>
                    <div className="invoice-payment-details">
                      <p className="mb-1"><strong>{t("invoices.details.bankTransfer")}</strong></p>
                      <p className="mb-1">{t("invoices.details.bankName")}: <strong>Your Bank Name</strong></p>
                      <p className="mb-1">{t("invoices.details.accountNumber")}: <strong>1234567890</strong></p>
                      <p className="mb-0">{t("invoices.details.reference")}: <strong>INV-{invoiceNumber}</strong></p>
                    </div>
                  </div>
                  <div className="invoice-payment-notes">
                    <p className="mb-0">
                      <i className="ri-information-line me-1"></i>
                      <span>{t("invoices.details.paymentNote")}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment History Section */}
              <div className="invoice-history">
                <h6 className="invoice-section-title">
                  <i className="ri-history-line me-2"></i>
                  {t("invoices.details.paymentHistory")}
                </h6>

                {currentInvoice.paymentProof && (
                  <div className="invoice-history-item">
                    <div className="invoice-history-header">
                      <div className="invoice-history-badge-container">
                        {currentInvoice.status === 'paid' ? (
                          <div className="invoice-history-badge invoice-history-badge-success">
                            <i className="ri-checkbox-circle-fill"></i>
                            <span>{t("invoices.details.paymentConfirmed")}</span>
                          </div>
                        ) : currentInvoice.status === 'pending' ? (
                          <div className="invoice-history-badge invoice-history-badge-warning">
                            <i className="ri-time-line"></i>
                            <span>{t("invoices.details.pendingVerification")}</span>
                          </div>
                        ) : (
                          <div className="invoice-history-badge invoice-history-badge-danger">
                            <i className="ri-close-circle-line"></i>
                            <span>{t("invoices.details.paymentRejected")}</span>
                          </div>
                        )}
                      </div>
                      <div className="invoice-history-date">
                        {currentInvoice.status === 'paid' && currentInvoice.paymentProof.reviewDate && (
                          <span>{t("invoices.details.confirmedOn", { date: moment(currentInvoice.paymentProof.reviewDate).format('DD MMM YYYY') })}</span>
                        )}
                        {currentInvoice.status === 'pending' && (
                          <span>{t("invoices.details.submittedOn", { date: moment(currentInvoice.paymentProof.uploadDate).format('DD MMM YYYY') })}</span>
                        )}
                        {currentInvoice.status === 'rejected' && currentInvoice.paymentProof.reviewDate && (
                          <span>{t("invoices.details.rejectedOn", { date: moment(currentInvoice.paymentProof.reviewDate).format('DD MMM YYYY') })}</span>
                        )}
                      </div>
                    </div>

                    <div className="invoice-history-content">
                      <div className="invoice-history-info">
                        <div className="invoice-history-detail">
                          <span className="invoice-history-label">{t("invoices.details.referenceNumber")}</span>
                          <span className="invoice-history-value">{currentInvoice.paymentProof.referenceNumber}</span>
                        </div>
                        <div className="invoice-history-detail">
                          <span className="invoice-history-label">{t("invoices.details.paymentDate")}</span>
                          <span className="invoice-history-value">
                            {moment(currentInvoice.paymentProof.paymentDate).format('DD MMM YYYY')}
                          </span>
                        </div>
                      </div>

                      {currentInvoice.paymentProof.filePath && (
                        <div className="invoice-history-proof">
                          <Button
                            color="light"
                            size="sm"
                            className="invoice-history-proof-btn"
                            onClick={() => window.open(
                              `${process.env.REACT_APP_API_URL}/public/payment_proofs/${currentInvoice.paymentProof.filePath.split('/').pop()}`,
                              '_blank'
                            )}
                          >
                            <i className={`ri-${currentInvoice.paymentProof.filePath.endsWith('.pdf') ? 'file-pdf' : 'image'}-line me-1`}></i>
                            {t("invoices.details.viewPaymentProof")}
                          </Button>
                        </div>
                      )}

                      {currentInvoice.status === 'rejected' && currentInvoice.paymentProof.reviewNotes && (
                        <div className="invoice-history-rejection">
                          <div className="invoice-history-rejection-header">
                            <i className="ri-error-warning-line me-1"></i>
                            {t("invoices.details.rejectionReason")}
                          </div>
                          <div className="invoice-history-rejection-content">
                            {currentInvoice.paymentProof.reviewNotes}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {currentInvoice.paymentReceipts && currentInvoice.paymentReceipts.length > 0 && (
                  <div className="invoice-receipt-list">
                    <h6 className="invoice-receipt-title">{t("invoices.details.paymentReceipts")}</h6>
                    <div className="table-responsive">
                      <table className="invoice-receipt-table">
                        <thead>
                          <tr>
                            <th>{t("invoices.details.date")}</th>
                            <th>{t("invoices.details.amount")}</th>
                            <th>{t("invoices.details.method")}</th>
                            <th>{t("invoices.details.referenceNumber")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentInvoice.paymentReceipts.map((receipt, idx) => (
                            <tr key={idx}>
                              <td>{moment(receipt.date).format('DD MMM YYYY')}</td>
                              <td>€{receipt.amount.toFixed(2)}</td>
                              <td className="text-capitalize">{receipt.method}</td>
                              <td>{receipt.transactionId || receipt.receiptNumber || t("invoices.details.na")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {(!currentInvoice.paymentProof && (!currentInvoice.paymentReceipts || currentInvoice.paymentReceipts.length === 0)) && (
                  <div className="invoice-history-empty">
                    <div className="invoice-history-empty-icon">
                      <i className="ri-bank-card-line"></i>
                    </div>
                    <p>{t("invoices.details.noPaymentHistory")}</p>
                  </div>
                )}
              </div>

              <div className="invoice-footer">
                <p>
                  <i className="ri-shield-check-line me-1"></i>
                  {t("invoices.details.footerNote")}
                </p>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Invoice Actions Bar */}
        <div className="invoice-actions-bar">
          <div className="invoice-actions-left">
            <Button
              color="light"
              className="invoice-action-btn"
              onClick={() => {
                navigate(link);
                dispatch(clearCurrentInvoice());
              }}
            >
              <i className="ri-arrow-left-line me-1"></i>
              {t("invoices.details.backToInvoices")}
            </Button>
          </div>

          <div className="invoice-actions-right">
            <Button
              color="light"
              onClick={printInvoice}
              className="invoice-action-btn"
            >
              <i className="ri-printer-line me-1"></i>
              {t("invoices.details.print")}
            </Button>
            <Button
              color="primary"
              onClick={() => downloadInvoice(invoiceNumber)}
              className="invoice-action-btn"
            >
              <i className="ri-download-2-line me-1"></i>
              {t("invoices.details.download")}
            </Button>
            {role === 'SyndicateAdmin' && currentInvoice.status === 'pending' && (
              <Button
                color="warning"
                className="invoice-action-btn"
                onClick={() => setProofReviewModal(true)}
              >
                <i className="ri-bank-card-line me-1"></i>
                {t("invoices.details.reviewPayment")}
              </Button>
            )}
            {role === 'SyndicateCoowner' && (currentInvoice.status === 'unpaid' || currentInvoice.status === 'rejected') && (
              <Button
                color="success"
                className="invoice-action-btn"
                onClick={() => setPaymentModal(true)}
              >
                <i className="ri-secure-payment-line me-1"></i>
                {t("invoices.details.uploadPaymentProof")}
              </Button>
            )}
          </div>
        </div>

        {/* Payment Proof Modal */}
        <Modal isOpen={paymentModal} toggle={() => setPaymentModal(!paymentModal)} centered size="lg">
          <ModalHeader toggle={() => setPaymentModal(!paymentModal)}>
            {t("invoices.details.submitPaymentProof")}
          </ModalHeader>
          <ModalBody>
            {currentInvoice && (
              <div>
                <Row className="mb-4">
                  <Col md={6}>
                    <h6 className="mb-3">{t("invoices.details.invoiceDetails")}</h6>
                    <div className="bg-light p-3 rounded">
                      <p className="mb-1"><strong>{t("invoices.details.invoiceNumber")}:</strong> {currentInvoice.invoiceNumber}</p>
                      <p className="mb-1">
                        <strong>{t("invoices.details.amount")}:</strong> €
                        {currentInvoice.total.toFixed(2)}
                      </p>
                      <p className="mb-0"><strong>{t("invoices.details.dueDate")}:</strong> {formattedDueDate}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <h6 className="mb-3">{t("invoices.details.paymentInstructions")}</h6>
                    <div className="bg-light p-3 rounded">
                      <p className="text-muted small mb-2">
                        {t("invoices.details.paymentInstructionsNote")}
                      </p>
                      <p className="mb-1"><strong>{t("invoices.details.bankAccount")}:</strong> {t("invoices.details.defaultSyndicate")}</p>
                      <p className="mb-1"><strong>{t("invoices.details.accountNumber")}:</strong> 1234567890</p>
                      <p className="mb-0"><strong>{t("invoices.details.reference")}:</strong> INV-{currentInvoice.invoiceNumber}</p>
                    </div>
                  </Col>
                </Row>

                <hr className="my-4" />

                <Form>
                  <Row>
                    <Col md={6}>
                      <FormGroup>
                        <Label for="paymentReference">{t("invoices.details.paymentReference")} <span className="text-danger">*</span></Label>
                        <Input
                          type="text"
                          id="paymentReference"
                          placeholder={t("invoices.details.transactionIdOrReference")}
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          required
                          disabled={isSubmittingProof}
                        />
                        <small className="text-muted">{t("invoices.details.paymentReferenceNote")}</small>
                      </FormGroup>
                    </Col>
                    <Col md={6}>
                      <FormGroup>
                        <Label for="paymentDate">{t("invoices.details.paymentDate")} <span className="text-danger">*</span></Label>
                        <Input
                          type="date"
                          id="paymentDate"
                          value={paymentDate.toISOString().split('T')[0]}
                          onChange={(e) => setPaymentDate(new Date(e.target.value))}
                          required
                          disabled={isSubmittingProof}
                        />
                      </FormGroup>
                    </Col>
                  </Row>

                  <FormGroup>
                    <Label for="paymentNotes">{t("invoices.details.notesOptional")}</Label>
                    <Input
                      type="textarea"
                      id="paymentNotes"
                      placeholder={t("invoices.details.notesPlaceholder")}
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      rows={2}
                      disabled={isSubmittingProof}
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label for="paymentProof">{t("invoices.details.uploadPaymentProof")} <span className="text-danger">*</span></Label>
                    <div className="border rounded p-2 position-relative">
                      {paymentProof ? (
                        <div className="d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center">
                            <div className="avatar-sm me-2 flex-shrink-0">
                              <div className="avatar-title bg-soft-primary text-primary rounded fs-24">
                                <i className={`ri-${paymentProof.type.includes('pdf') ? 'file-pdf' : 'image'}-line`}></i>
                              </div>
                            </div>
                            <div>
                              <h5 className="fs-14 mb-0">{paymentProof.name}</h5>
                              <p className="text-muted mb-0">{(paymentProof.size / (1024 * 1024)).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <Button
                            color="danger"
                            size="sm"
                            onClick={() => setPaymentProof(null)}
                            disabled={isSubmittingProof}
                          >
                            <i className="ri-delete-bin-line"></i>
                          </Button>
                        </div>
                      ) : (
                        <div className="dropzone-container">
                          <div
                            className="text-center p-4"
                            onClick={() => document.getElementById('paymentProofInput').click()}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="avatar-sm mx-auto mb-2">
                              <div className="avatar-title bg-light text-secondary rounded-circle fs-24">
                                <i className="ri-upload-cloud-2-line"></i>
                              </div>
                            </div>
                            <p className="mb-2">{t("invoices.details.dragDropFile")}</p>
                            <p className="text-muted mb-0"><small>{t("invoices.details.fileTypes")}</small></p>
                          </div>
                          <Input
                            type="file"
                            id="paymentProofInput"
                            onChange={handleFileChange}
                            accept=".jpg,.jpeg,.png,.pdf"
                            disabled={isSubmittingProof}
                            style={{ display: 'none' }}
                          />
                        </div>
                      )}
                    </div>
                  </FormGroup>

                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="mt-3">
                      <div className="progress animated-progress">
                        <div
                          className="progress-bar bg-success"
                          role="progressbar"
                          style={{ width: `${uploadProgress}%` }}
                          aria-valuenow={uploadProgress}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        >
                          {uploadProgress}%
                        </div>
                      </div>
                    </div>
                  )}
                </Form>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="light" onClick={() => setPaymentModal(false)} disabled={isSubmittingProof}>
              {t("invoices.details.cancel")}
            </Button>
            <Button
              color="primary"
              onClick={submitPaymentProof}
              disabled={isSubmittingProof || !paymentProof || !paymentReference.trim()}
            >
              {isSubmittingProof ? (
                <><Spinner size="sm" className="me-1" /> {t("invoices.details.submitting")}</>
              ) : (
                t("invoices.details.submitPaymentProof")
              )}
            </Button>
          </ModalFooter>
        </Modal>

        {/* Payment Proof Review Modal */}
        <Modal isOpen={proofReviewModal} toggle={() => setProofReviewModal(!proofReviewModal)} centered size="lg">
          <ModalHeader toggle={() => setProofReviewModal(!proofReviewModal)}>
            {t("invoices.details.reviewPaymentProof")}
          </ModalHeader>
          <ModalBody>
            {currentInvoice && currentInvoice.paymentProof && (
              <div>
                <Row className="mb-4">
                  <Col md={6}>
                    <h6 className="mb-3">{t("invoices.details.invoiceDetails")}</h6>
                    <div className="bg-light p-3 rounded">
                      <p className="mb-1"><strong>{t("invoices.details.invoiceNumber")}:</strong> {currentInvoice.invoiceNumber}</p>
                      <p className="mb-1">
                        <strong>{t("invoices.details.amount")}:</strong> €
                        {currentInvoice.total.toFixed(2)}
                      </p>
                      <p className="mb-1"><strong>{t("invoices.details.coOwner")}:</strong> {
                        `${currentInvoice.coOwner?.firstName || ''} ${currentInvoice.coOwner?.lastName || ''}`
                      }</p>
                      <p className="mb-0"><strong>{t("invoices.details.dueDate")}:</strong> {formattedDueDate}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <h6 className="mb-3">{t("invoices.details.paymentInformation")}</h6>
                    <div className="bg-light p-3 rounded">
                      <p className="mb-1"><strong>{t("invoices.details.referenceNumber")}:</strong> {currentInvoice.paymentProof.referenceNumber}</p>
                      <p className="mb-1"><strong>{t("invoices.details.paymentDate")}:</strong> {
                        moment(currentInvoice.paymentProof.paymentDate).format('DD MMM YYYY')
                      }</p>
                      <p className="mb-1"><strong>{t("invoices.details.submitted")}:</strong> {
                        moment(currentInvoice.paymentProof.uploadDate).format('DD MMM YYYY')
                      }</p>
                      {currentInvoice.paymentProof.notes && (
                        <p className="mb-0"><strong>{t("invoices.details.notes")}:</strong> {currentInvoice.paymentProof.notes}</p>
                      )}
                    </div>
                  </Col>
                </Row>

                <div className="mb-4">
                  <h6 className="mb-3">{t("invoices.details.paymentProofDocument")}</h6>
                  <div className="text-center bg-light p-4 rounded">
                    {currentInvoice.paymentProof.filePath && (
                      currentInvoice.paymentProof.filePath.endsWith('.pdf') ? (
                        <div className="text-center">
                          <i className="ri-file-pdf-line" style={{ fontSize: "60px", color: "#f44336" }}></i>
                          <p className="mb-0">{currentInvoice.paymentProof.fileName || t("invoices.details.defaultProofName")}</p>
                          <Button
                            color="primary"
                            size="sm"
                            className="mt-2"
                            onClick={() => window.open(`${process.env.REACT_APP_API_URL}/public/payment_proofs/${currentInvoice.paymentProof.filePath.split('/').pop()}`, '_blank')}
                          >
                            <i className="ri-download-2-line me-1"></i>
                            {t("invoices.details.viewPDF")}
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <img
                            src={`${process.env.REACT_APP_API_URL}/public/payment_proofs/${currentInvoice.paymentProof.filePath.split('/').pop()}`}
                            alt={t("invoices.details.paymentProofAlt")}
                            className="img-fluid"
                            style={{ maxHeight: "300px" }}
                          />
                          <Button
                            color="primary"
                            size="sm"
                            className="mt-2"
                            onClick={() => window.open(`${process.env.REACT_APP_API_URL}/public/payment_proofs/${currentInvoice.paymentProof.filePath.split('/').pop()}`, '_blank')}
                          >
                            <i className="ri-download-2-line me-1"></i>
                            {t("invoices.details.viewFullImage")}
                          </Button>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <FormGroup>
                  <Label for="reviewNotes">{t("invoices.details.reviewNotes")}</Label>
                  <Input
                    type="textarea"
                    id="reviewNotes"
                    placeholder={t("invoices.details.reviewNotesPlaceholder")}
                    value={proofReviewNotes}
                    onChange={(e) => setProofReviewNotes(e.target.value)}
                    rows={3}
                    disabled={isProcessingReview}
                  />
                </FormGroup>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={() => setProofReviewModal(false)} disabled={isProcessingReview}>
              {t("invoices.details.cancel")}
            </Button>
            <Button
              color="danger"
              onClick={() => handleProofReview(false)}
              disabled={isProcessingReview}
              className="me-2"
            >
              {isProcessingReview ? <Spinner size="sm" /> : <i className="ri-close-circle-line me-1"></i>}
              {t("invoices.details.rejectProof")}
            </Button>
            <Button
              color="success"
              onClick={() => handleProofReview(true)}
              disabled={isProcessingReview}
            >
              {isProcessingReview ? <Spinner size="sm" /> : <i className="ri-check-line me-1"></i>}
              {t("invoices.details.approveMarkPaid")}
            </Button>
          </ModalFooter>
        </Modal>
      </Container>
      <ToastContainer closeButton={false} limit={1} />
      <style jsx>{`
        /* Main Invoice Styling */
        .page-content {
          background-color: #f8f9fa;
          padding: 20px 0;
          min-height: 85vh;
        }
        
        /* Loading & Error States */
        .invoice-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 100px 0;
        }
        
        .invoice-loading-spinner {
          margin-bottom: 16px;
        }
        
        .invoice-error {
          max-width: 600px;
          margin: 80px auto;
          text-align: center;
          padding: 30px;
        }
        
        .invoice-not-found {
          text-align: center;
          padding: 80px 0;
          max-width: 400px;
          margin: 0 auto;
        }
        
        .invoice-not-found-icon {
          font-size: 3rem;
          color: #6c757d;
          margin-bottom: 24px;
        }
        
        /* Invoice Actions Bar */
        .invoice-actions-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 50px;
        }
        
        /* Force all action buttons to look the same */
        .invoice-actions-bar .btn {
          min-width: 140px;
          height: 40px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }
        
        /* Align right-side buttons in a row with spacing */
        .invoice-actions-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        
        /* Main Invoice Card */
        .invoice-card {
          border: none;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
          margin-bottom: 30px;
          background-color: white;
        }
        
        /* Invoice Header */
        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 30px;
          background-color: #f9fbfd;
          border-bottom: 1px solid #eff0f2;
          flex-wrap: wrap;
          gap: 20px;
        }
        
        .invoice-brand {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .invoice-logo {
          height: 60px;
          object-fit: contain;
        }
        
        .invoice-title {
          display: flex;
          flex-direction: column;
        }
        
        .invoice-title h4 {
          color: #6c757d;
          margin-bottom: 2px;
          font-size: 15px;
          font-weight: 500;
        }
        
        .invoice-title h2 {
          font-size: 24px;
          margin: 0;
          color: #495057;
          font-weight: 700;
        }
        
        .invoice-status-container {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }
        
        .invoice-status-badge {
          font-size: 14px;
          padding: 8px 16px;
          font-weight: 600;
        }
        
        .invoice-days {
          font-size: 13px;
          color: #6c757d;
          display: flex;
          align-items: center;
        }
        
        /* Invoice Meta */
        .invoice-meta {
          display: flex;
          gap: 20px;
          padding: 20px 30px;
          background-color: #fff;
          flex-wrap: wrap;
        }
        
        .invoice-meta-item {
          display: flex;
          flex-direction: column;
          min-width: 140px;
        }
        
        .invoice-meta-label {
          color: #6c757d;
          font-size: 13px;
          margin-bottom: 4px;
          font-weight: 500;
        }
        
        .invoice-meta-value {
          color: #212529;
          font-weight: 600;
          font-size: 15px;
        }
        
        .invoice-amount {
          color: #0d6efd;
        }
        
        .invoice-divider {
          height: 1px;
          background-color: #eff0f2;
          margin: 0 30px;
        }
        
        /* Invoice Parties */
        .invoice-parties {
          display: flex;
          justify-content: space-between;
          padding: 24px 30px;
          gap: 30px;
          flex-wrap: wrap;
        }
        
        .invoice-party {
          flex: 1;
          min-width: 200px;
        }
        
        .invoice-section-title {
          color: #495057;
          font-size: 14px;
          margin-bottom: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          position: relative;
          padding-bottom: 8px;
          display: inline-block;
        }
        
        .invoice-section-title:after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 40px;
          height: 2px;
          background-color: #0d6efd;
        }
        
        .invoice-party-details {
          margin-top: 12px;
        }
        
        .invoice-party-name {
          font-weight: 600;
          font-size: 15px;
          margin-bottom: 8px;
          color: #212529;
        }
        
        .invoice-party-address {
          color: #6c757d;
          font-size: 14px;
          line-height: 1.6;
        }
        
        .invoice-party-info {
          font-size: 14px;
          color: #495057;
          margin-top: 10px;
          line-height: 1.6;
        }
        
        .invoice-property-label {
          font-weight: 600;
          color: #495057;
          display: inline-block;
          width: 80px;
        }
        
        /* Invoice Items */
        .invoice-items {
          padding: 24px 30px;
          border-top: 1px solid #eff0f2;
          border-bottom: 1px solid #eff0f2;
        }
        
        .invoice-table-container {
          overflow-x: auto;
          margin-top: 16px;
        }
        
        .invoice-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        
        .invoice-table thead th {
          background-color: #f9fbfd;
          color: #495057;
          padding: 12px 16px;
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          border-top: 1px solid #eff0f2;
          border-bottom: 1px solid #eff0f2;
        }
        
        .invoice-table tbody td {
          padding: 14px 16px;
          vertical-align: middle;
          border-bottom: 1px solid #eff0f2;
          color: #495057;
          font-size: 14px;
        }
        
        .invoice-item-number {
          width: 50px;
          font-weight: 600;
        }
        
        .invoice-item-desc {
          font-weight: 500;
        }
        
        .invoice-item-amount {
          text-align: right;
          font-weight: 600;
        }
        
        .invoice-summary {
          margin-top: 20px;
          margin-left: auto;
          max-width: 300px;
        }
        
        .invoice-summary-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          color: #495057;
        }
        
        .invoice-summary-total {
          border-top: 2px solid #eff0f2;
          margin-top: 8px;
          padding-top: 12px;
          font-weight: 700;
          font-size: 16px;
          color: #212529;
        }
        
        /* Payment Instructions */
        .invoice-payment {
          padding: 24px 30px;
        }
        
        .invoice-payment-info {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
          margin-top: 12px;
        }
        
        .invoice-payment-method {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
        }
        
        .invoice-payment-icon {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #e9ecef;
          border-radius: 50%;
          color: #495057;
          font-size: 20px;
          flex-shrink: 0;
        }
        
        .invoice-payment-details {
          font-size: 14px;
          color: #495057;
        }
        
        .invoice-payment-notes {
          font-size: 13px;
          color: #6c757d;
          display: flex;
          align-items: center;
          background-color: rgba(13, 110, 253, 0.08);
          padding: 10px 12px;
          border-radius: 4px;
        }
        
        /* Payment History Section */
        .invoice-history {
          padding: 24px 30px;
          border-top: 1px solid #eff0f2;
        }
        
        .invoice-history-item {
          background-color: #f9fbfd;
          border-radius: 8px;
          overflow: hidden;
          margin-top: 16px;
        }
        
        .invoice-history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid #eff0f2;
          gap: 10px;
          flex-wrap: wrap;
        }
        
        .invoice-history-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 14px;
        }
        
        .invoice-history-badge-success {
          color: rgb(27, 141, 73);
        }
        
        .invoice-history-badge-warning {
          color: #ffc107;
        }
        
        .invoice-history-badge-danger {
          color: #dc3545;
        }
        
        .invoice-history-date {
          color: #6c757d;
          font-size: 13px;
        }
        
        .invoice-history-content {
          padding: 16px;
        }
        
        .invoice-history-info {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }
        
        .invoice-history-detail {
          display: flex;
          flex-direction: column;
        }
        
        .invoice-history-label {
          font-size: 13px;
          color: #6c757d;
          margin-bottom: 4px;
        }
        
        .invoice-history-value {
          font-weight: 600;
          color: #495057;
        }
        
        .invoice-history-proof {
          margin-top: 16px;
        }
        
        .invoice-history-proof-btn {
          background-color: #f8f9fa;
          border-color: #e9ecef;
        }
        
        .invoice-history-rejection {
          margin-top: 16px;
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid #f8d7da;
        }
        
        .invoice-history-rejection-header {
          background-color: #f8d7da;
          color: #842029;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
        }
        
        .invoice-history-rejection-content {
          padding: 12px;
          color: #842029;
          background-color: #fff8f8;
          font-size: 14px;
        }
        
        .invoice-receipt-list {
          margin-top: 24px;
        }
        
        .invoice-receipt-title {
          font-size: 15px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #495057;
          display: flex;
          align-items: center;
        }
        
        .invoice-receipt-title::before {
          content: '';
          display: inline-block;
          width: 4px;
          height: 14px;
          background-color: #0d6efd;
          margin-right: 8px;
          border-radius: 2px;
        }
        
        .invoice-receipt-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          border: 1px solid #eff0f2;
          border-radius: 6px;
          overflow: hidden;
        }
        
        .invoice-receipt-table th {
          background-color: #f9fbfd;
          color: #495057;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 600;
          text-align: left;
          border-bottom: 1px solid #eff0f2;
        }
        
        .invoice-receipt-table td {
          padding: 10px 16px;
          font-size: 13px;
          border-bottom: 1px solid #eff0f2;
          color: #495057;
        }
        
        .invoice-receipt-table tr:last-child td {
          border-bottom: none;
        }
        
        .invoice-history-empty {
          text-align: center;
          padding: 40px 0;
          color: #6c757d;
        }
        
        .invoice-history-empty-icon {
          font-size: 36px;
          margin-bottom: 16px;
          color: #adb5bd;
        }
        
        /* Invoice Footer */
        .invoice-footer {
          padding: 16px 30px;
          border-top: 1px solid #eff0f2;
          text-align: center;
        }
        
        .invoice-footer p {
          color: #6c757d;
          font-size: 13px;
          margin: 0;
        }
        
        /* Responsive Adjustments */
        @media (max-width: 768px) {
          .invoice-header, 
          .invoice-parties {
            flex-direction: column;
          }
          
          .invoice-status-container {
            align-items: flex-start;
            margin-top: 16px;
          }
          
          .invoice-meta {
            flex-direction: column;
            gap: 12px;
          }
          
          .invoice-party {
            margin-bottom: 24px;
          }
          
          .invoice-summary {
            max-width: 100%;
          }
          
          .invoice-history-header {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .invoice-history-date {
            margin-top: 8px;
          }
        }
        
        /* Print Styles */
        @media print {
          body {
            background-color: white !important;
          }
          
          .page-content {
            padding: 0 !important;
          }
          
          .invoice-card {
            box-shadow: none !important;
          }
          
          .invoice-actions-bar,
          .breadcrumb-item,
          .navbar {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default InvoiceDetails;