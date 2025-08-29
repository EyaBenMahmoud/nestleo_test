import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as moment from "moment";
import { toast } from "react-toastify";
import CountUp from "react-countup";
import FeatherIcon from "feather-icons-react";
import {
  CardBody,
  Row,
  Col,
  Card,
  Container,
  CardHeader,
  Button,
  Badge,
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  Spinner,
  Pagination,
  PaginationItem,
  PaginationLink,
  Dropdown,
  Modal,
  ModalHeader,
  ModalBody,
  FormGroup,
  Form,
  Alert,
  ModalFooter,
  Label,
  Input,
  Table,
  Progress
} from "reactstrap";
import { useSelector, useDispatch } from "react-redux";
import Loader from "../../Components/Common/Loader";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import {
  getInvoicesByCoOwner,
  getInvoicesByCoOwnerAndBuilding,
  payInvoice,
  clearCurrentInvoice,
  applyCouponToInvoice
} from "../../slices/invoice/slice";
import invoiceImage from "../../assets/images/Invoice.png";
import api from "../../services/api";
import { FaInfoCircle, FaFileInvoice, FaMoneyBillWave, FaClock, FaCheckCircle } from "react-icons/fa";
import { useTranslation } from "react-i18next";

const CoOwnerInvoiceList = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { invoices = [], loading = false, error } = useSelector((state) => state.Invoice);
  const currentBuilding = useSelector((state) => state.Building.currentBuilding);
  const user = useSelector((state) => state.Loginn.user);
  const [timeFilter, setTimeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  // Payment proof modal states
  const [paymentModal, setPaymentModal] = useState(false);
  const [selectedPaymentInvoice, setSelectedPaymentInvoice] = useState(null);
  const [paymentProof, setPaymentProof] = useState(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [paymentNotes, setPaymentNotes] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  // Coupon modal states
  const [couponModal, setCouponModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [applying, setApplying] = useState(false);
  const [couponSuccess, setCouponSuccess] = useState('');

  const openPaymentModal = (invoice) => {
    setSelectedPaymentInvoice(invoice);
    setPaymentReference("");
    setPaymentDate(new Date());
    setPaymentNotes("");
    setPaymentProof(null);
    setUploadProgress(0);
    setPaymentModal(true);
  };

  const togglePaymentModal = () => {
    setPaymentModal(!paymentModal);
  };

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('invoiceCowner.fileTooLarge'));
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast.error(t('invoiceCowner.fileTypeNotAllowed'));
        return;
      }

      setPaymentProof(file);
    }
  };

  const submitPaymentProof = async () => {
    if (!paymentProof) {
      toast.error(t('invoiceCowner.uploadPaymentProof'));
      return;
    }

    if (!paymentReference.trim()) {
      toast.error(t('invoiceCowner.providePaymentReference'));
      return;
    }

    setIsSubmittingProof(true);

    try {
      const formData = new FormData();
      formData.append("proof", paymentProof);
      formData.append("invoiceId", selectedPaymentInvoice._id);
      formData.append("referenceNumber", paymentReference);
      formData.append("paymentDate", paymentDate.toISOString());
      formData.append("notes", paymentNotes);

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
        toast.success(t('invoiceCowner.paymentProofSubmitted'));
        togglePaymentModal();

        if (user?.id) {
          if (currentBuilding) {
            dispatch(getInvoicesByCoOwnerAndBuilding({
              coOwnerId: user.id,
              buildingId: currentBuilding._id
            }));
          } else {
            dispatch(getInvoicesByCoOwner(user.id));
          }
        }
      } else {
        toast.error(response.data.message || t('invoiceCowner.failedSubmitPaymentProof'));
      }
    } catch (error) {
      console.error("Error submitting payment proof:", error);
      toast.error(error.response?.data?.message || t('invoiceCowner.errorSubmitPaymentProof'));
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const toggleCouponModal = () => {
    setCouponModal(!couponModal);
    if (!couponModal) {
      setCouponCode('');
      setCouponError('');
      setCouponSuccess('');
    }
  };

  const openCouponModal = (invoice) => {
    setSelectedInvoice(invoice);
    toggleCouponModal();
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError(t('invoiceCowner.enterCouponCode'));
      return;
    }

    try {
      setApplying(true);
      setCouponError('');

      await dispatch(applyCouponToInvoice({
        invoiceId: selectedInvoice._id,
        couponCode: couponCode.trim()
      })).unwrap();

      setCouponSuccess(t('invoiceCowner.couponAppliedSuccess'));
      setTimeout(() => {
        toggleCouponModal();
      }, 2000);

    } catch (error) {
      setCouponError(typeof error === 'string' ? error : t('invoiceCowner.failedApplyCoupon'));
    } finally {
      setApplying(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      if (currentBuilding) {
        dispatch(getInvoicesByCoOwnerAndBuilding({
          coOwnerId: user.id,
          buildingId: currentBuilding._id
        }));
      } else {
        dispatch(getInvoicesByCoOwner(user.id));
      }
    }
  }, [dispatch, user, currentBuilding]);

  // Calculate statistics
  const stats = useMemo(() => {
    let invoicesToUse = currentBuilding
      ? invoices.filter(inv => inv.building?._id === currentBuilding._id)
      : invoices;

    // Apply time filter
    const now = new Date();
    invoicesToUse = invoicesToUse.filter(invoice => {
      const invoiceDate = new Date(invoice.date);
      switch (timeFilter) {
        case 'today':
          return invoiceDate.toDateString() === now.toDateString();
        case 'week':
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return invoiceDate >= oneWeekAgo;
        case 'month':
          const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          return invoiceDate >= oneMonthAgo;
        default:
          return true;
      }
    });

    const totalInvoices = invoicesToUse.length;
    const paidInvoices = invoicesToUse.filter(inv => inv.status === "paid").length;
    const unpaidInvoices = invoicesToUse.filter(inv => inv.status === "unpaid" || inv.status === "rejected").length;
    const pendingInvoices = invoicesToUse.filter(inv => inv.status === "pending").length;
    const totalRevenue = invoicesToUse.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const paidRevenue = invoicesToUse
      .filter(inv => inv.status === "paid")
      .reduce((sum, inv) => sum + (inv.total || 0), 0);
    const paymentRate = totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 100) : 0;

    return {
      totalInvoices,
      paidInvoices,
      unpaidInvoices,
      pendingInvoices,
      totalRevenue,
      paidRevenue,
      paymentRate
    };
  }, [invoices, currentBuilding, timeFilter]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredInvoices = useMemo(() => {
    const now = new Date();
    let result = [...invoices];

    if (sortConfig.key) {
      result.sort((a, b) => {
        if (sortConfig.key === 'date' || sortConfig.key === 'dueDate') {
          const dateA = new Date(a[sortConfig.key]).getTime();
          const dateB = new Date(b[sortConfig.key]).getTime();
          return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }

        const valueA = a[sortConfig.key] || '';
        const valueB = b[sortConfig.key] || '';

        if (valueA < valueB) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (valueA > valueB) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result.filter(invoice => {
      if (statusFilter !== "all" && invoice.status !== statusFilter) {
        return false;
      }

      const invoiceDate = new Date(invoice.date);
      switch (timeFilter) {
        case 'today':
          if (invoiceDate.toDateString() !== now.toDateString()) return false;
          break;
        case 'week':
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (invoiceDate < oneWeekAgo) return false;
          break;
        case 'month':
          const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          if (invoiceDate < oneMonthAgo) return false;
          break;
        default:
          break;
      }

      if (searchText) {
        const searchLower = searchText.toLowerCase();
        return (
          invoice.invoiceNumber?.toLowerCase().includes(searchLower) ||
          invoice.total?.toString().includes(searchText) ||
          invoice.building?.name?.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [invoices, statusFilter, searchText, timeFilter, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentInvoices = filteredInvoices.slice(indexOfFirstItem, indexOfLastItem);

  const downloadInvoice = (invoiceNumber) => {
    window.open(`${process.env.REACT_APP_API_URL}/api/invoices/download/${invoiceNumber}`, '_blank');
  };

  const handleValidDate = (date) => {
    return moment(new Date(date)).format("DD MMM Y");
  };

  document.title = t('invoiceCowner.myInvoicesTitle') + " | Nestleo";

  return (
    <React.Fragment>
      <div className="page-content">
        {/* Payment Proof Modal */}
        <Modal isOpen={paymentModal} toggle={togglePaymentModal} centered size="lg">
          <ModalHeader toggle={togglePaymentModal}>
            {t('invoiceCowner.submitPaymentProof')}
          </ModalHeader>
          <ModalBody>
            {selectedPaymentInvoice && (
              <div>
                <Row className="mb-4">
                  <Col md={6}>
                    <h6 className="mb-3">{t('invoiceCowner.invoiceDetails')}</h6>
                    <div className="bg-light p-3 rounded">
                      <p className="mb-1"><strong>{t('invoiceCowner.invoiceNumber')}:</strong> {selectedPaymentInvoice.invoiceNumber}</p>
                      <p className="mb-1">
                        <strong>{t('invoiceCowner.amount')}:</strong> {selectedPaymentInvoice.currency?.symbol || '$'}
                        {selectedPaymentInvoice.total.toFixed(2)}
                      </p>
                      <p className="mb-0"><strong>{t('invoiceCowner.dueDate')}:</strong> {handleValidDate(selectedPaymentInvoice.dueDate)}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <h6 className="mb-3">{t('invoiceCowner.paymentInstructions')}</h6>
                    <div className="bg-light p-3 rounded">
                      <p className="text-muted small mb-2">
                        {t('invoiceCowner.paymentInstructionsText')}
                      </p>
                      <p className="mb-1"><strong>{t('invoiceCowner.bankAccount')}:</strong> Nestleo Syndicate</p>
                      <p className="mb-1"><strong>{t('invoiceCowner.accountNumber')}:</strong> 123456789</p>
                      <p className="mb-0"><strong>{t('invoiceCowner.reference')}:</strong> INV-{selectedPaymentInvoice.invoiceNumber}</p>
                    </div>
                  </Col>
                </Row>

                <hr className="my-4" />

                <Form>
                  <Row>
                    <Col md={6}>
                      <FormGroup>
                        <Label for="paymentReference">{t('invoiceCowner.paymentReference')} <span className="text-danger">*</span></Label>
                        <Input
                          type="text"
                          id="paymentReference"
                          placeholder={t('invoiceCowner.paymentReferencePlaceholder')}
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          required
                          disabled={isSubmittingProof}
                        />
                        <small className="text-muted">{t('invoiceCowner.paymentReferenceHelp')}</small>
                      </FormGroup>
                    </Col>
                    <Col md={6}>
                      <FormGroup>
                        <Label for="paymentDate">{t('invoiceCowner.paymentDate')} <span className="text-danger">*</span></Label>
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
                    <Label for="paymentNotes">{t('invoiceCowner.notesOptional')}</Label>
                    <Input
                      type="textarea"
                      id="paymentNotes"
                      placeholder={t('invoiceCowner.additionalPaymentInfo')}
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      rows={2}
                      disabled={isSubmittingProof}
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label for="paymentProof">{t('invoiceCowner.uploadPaymentProof')} <span className="text-danger">*</span></Label>
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
                            <p className="mb-2">{t('invoiceCowner.dragDropFile')}</p>
                            <p className="text-muted mb-0"><small>{t('invoiceCowner.fileTypes')}</small></p>
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
            <Button color="light" onClick={togglePaymentModal} disabled={isSubmittingProof}>
              {t('invoiceCowner.cancel')}
            </Button>
            <Button
              color="primary"
              onClick={submitPaymentProof}
              disabled={isSubmittingProof || !paymentProof || !paymentReference.trim()}
            >
              {isSubmittingProof ? (
                <><Spinner size="sm" className="me-1" /> {t('invoiceCowner.submitting')}...</>
              ) : (
                t('invoiceCowner.submitPaymentProof')
              )}
            </Button>
          </ModalFooter>
        </Modal>

        {/* Coupon Modal */}
        <Modal isOpen={couponModal} toggle={toggleCouponModal} centered>
          <ModalHeader toggle={toggleCouponModal}>
            {t('invoiceCowner.applyCouponCode')}
          </ModalHeader>
          <ModalBody>
            {selectedInvoice && (
              <>
                <div className="border rounded p-3 mb-3">
                  <h6>{t('invoiceCowner.invoiceDetails')}</h6>
                  <p className="mb-1">
                    <strong>{t('invoiceCowner.invoiceNumber')}:</strong> {selectedInvoice.invoiceNumber}
                  </p>
                  <p className="mb-1">
                    <strong>{t('invoiceCowner.amount')}:</strong> {selectedInvoice.currency?.symbol || '$'}
                    {selectedInvoice.total.toFixed(2)}
                  </p>
                  <p className="mb-0">
                    <strong>{t('invoiceCowner.dueDate')}:</strong> {handleValidDate(selectedInvoice.dueDate)}
                  </p>
                </div>
                <Form>
                  <FormGroup>
                    <Label for="couponCode">{t('invoiceCowner.enterCouponCode')}</Label>
                    <Input
                      type="text"
                      id="couponCode"
                      placeholder={t('invoiceCowner.couponCodePlaceholder')}
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      disabled={applying}
                    />
                    <small className="text-muted">{t('invoiceCowner.couponCodeHelp')}</small>
                  </FormGroup>

                  {couponError && (
                    <Alert color="danger" className="mt-2">
                      {couponError}
                    </Alert>
                  )}

                  {couponSuccess && (
                    <Alert color="success" className="mt-2">
                      {couponSuccess}
                    </Alert>
                  )}
                </Form>
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="light" onClick={toggleCouponModal}>
              {t('invoiceCowner.cancel')}
            </Button>
            <Button
              color="primary"
              onClick={applyCoupon}
              disabled={applying || !couponCode.trim()}
            >
              {applying ? (
                <><Spinner size="sm" /> {t('invoiceCowner.applying')}...</>
              ) : (
                t('invoiceCowner.applyCoupon')
              )}
            </Button>
          </ModalFooter>
        </Modal>

        <Container fluid>
          <BreadCrumb title={t('invoiceCowner.myInvoicesTitle')} pageTitle={t('invoiceCowner.pageTitle')} />

          {/* Welcome Back Card with Statistics Badges */}
          <Row className="mb-4">
            <Col>
              <Card className="welcome-card overflow-hidden">
                <div className="position-absolute end-0 start-0 top-0 z-0"
                  style={{ height: '100%', background: 'linear-gradient(90deg,#c1e8f0, #cbe9f3, #e0f7fa)' }}>
                  <div className="position-absolute end-0 top-0 z-0">
                    <svg width="250" height="250" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="opacity-25">
                      <path fill="#4B79CF" d="M44.3,-76.4C58.6,-69.7,72.2,-59.3,79.6,-45.3C87,-31.2,88.3,-13.5,85.2,2.7C82.1,19,74.7,33.8,64.7,45.9C54.8,58,42.3,67.4,28.4,72.7C14.5,78,0.1,79.2,-15,77.4C-30.1,75.7,-46,71.1,-59.6,61.6C-73.2,52.2,-84.6,38,-86.2,23C-87.8,8.1,-79.6,-7.6,-74.1,-24.6C-68.5,-41.6,-65.5,-59.8,-54.8,-69.7C-44.1,-79.7,-25.6,-81.4,-7.7,-79.5C10.2,-77.6,30,-83,44.3,-76.4Z" transform="translate(100 100)" />
                    </svg>
                  </div>
                </div>
                <CardBody className="p-4 position-relative">
                  <Row className="align-items-center">
                    <Col md={8}>
                      <div className="text-start">
                        <h4 className="fw-semibold mb-2">{t('invoiceCowner.myInvoicesTitle')}</h4>
                        <p className="text-muted mb-3">{t('invoiceCowner.welcomeCardCoOwner')}</p>
                        
                        {/* Statistics Badges */}
                        <div className="d-flex flex-wrap gap-2">
                          <div className="d-flex flex-wrap gap-2">
                            {currentBuilding ? (
                              <Badge color="info" pill className="fs-12 py-2 px-3">
                                <FaFileInvoice className="me-1" /> {t('invoiceCowner.managing')}: {currentBuilding.name}
                              </Badge>
                            ) : (
                              <Badge color="primary" pill className="fs-12 py-2 px-3">
                                <FaFileInvoice className="me-1" /> {t('invoiceCowner.allProperties')}
                              </Badge>
                            )}
                          </div>
                          <Badge color="primary" pill className="fs-12 py-2 px-3">
                            <i className="ri-file-list-3-line me-1"></i> {t('invoiceCowner.total')}: {stats.totalInvoices}
                          </Badge>
                          <Badge color="success" pill className="fs-12 py-2 px-3">
                            <FaCheckCircle className="me-1" /> {t('invoiceCowner.paid')}: {stats.paidInvoices}
                          </Badge>
                          <Badge color="warning" pill className="fs-12 py-2 px-3">
                            <FaClock className="me-1" /> {t('invoiceCowner.pending')}: {stats.pendingInvoices}
                          </Badge>
                          <Badge color="danger" pill className="fs-12 py-2 px-3">
                            <FaMoneyBillWave className="me-1" /> {t('invoiceCowner.totalRevenue')}: ${stats.totalRevenue.toFixed(2)}
                          </Badge>
                        </div>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="text-end">
                        <div className="d-flex justify-content-end">
                          <Button color="success" tag={Link} to="/calendar">
                            <i className="ri-calendar-line me-1"></i> {t('invoiceCowner.calendar')}
                          </Button>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </CardBody>
              </Card>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col lg={12}>
              <Card>
                <CardHeader className="border-bottom-dashed" style={{ background: 'linear-gradient(90deg,#c1e8f0, #cbe9f3, #e0f7fa)' }}>
                  <Row className="g-3 align-items-center">
                    <Col sm={12} md={4}>
                      <div>
                        <h5 className="card-title mb-0">{t('invoiceCowner.search')}</h5>
                      </div>
                      <div className="search-box mt-2">
                        <Input
                          type="text"
                          className="form-control search"
                          placeholder={t('invoiceCowner.searchPlaceholder')}
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                        />
                        <i className="ri-search-line search-icon"></i>
                        {searchText && (
                          <Button
                            color="link"
                            className="btn-close btn-close-lg"
                            style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)" }}
                            onClick={() => setSearchText("")}
                          ></Button>
                        )}
                      </div>
                    </Col>

                    <Col sm={6} md={4}>
                      <div>
                        <h5 className="card-title mb-0">{t('invoiceCowner.status')}</h5>
                      </div>
                      <div>
                        <Input
                          type="select"
                          className="form-select mt-2"
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                        >
                          <option value="all">{t('invoiceCowner.allStatus')}</option>
                          <option value="paid">{t('invoiceCowner.paid')}</option>
                          <option value="pending">{t('invoiceCowner.pending')}</option>
                          <option value="unpaid">{t('invoiceCowner.unpaid')}</option>
                          <option value="rejected">{t('invoiceCowner.rejected')}</option>
                        </Input>
                      </div>
                    </Col>

                    <Col sm={6} md={4}>
                      <div>
                        <h5 className="card-title mb-0">{t('invoiceCowner.dateRange')}</h5>
                      </div>
                      <div>
                        <Input
                          type="select"
                          className="form-select mt-2"
                          value={timeFilter}
                          onChange={(e) => setTimeFilter(e.target.value)}
                        >
                          <option value="all">{t('invoiceCowner.allTime')}</option>
                          <option value="today">{t('invoiceCowner.today')}</option>
                          <option value="week">{t('invoiceCowner.thisWeek')}</option>
                          <option value="month">{t('invoiceCowner.thisMonth')}</option>
                          <option value="year">{t('invoiceCowner.thisYear')}</option>
                        </Input>
                      </div>
                    </Col>
                  </Row>
                </CardHeader>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col lg={12}>
              <Card id="invoiceList">
                <CardHeader className="border-0" style={{ background: 'linear-gradient(90deg,#c1e8f0, #cbe9f3, #e0f7fa)' }}>
                  <div className="d-flex align-items-center">
                    <h5 className="card-title mb-0 flex-grow-1">
                      {t('invoiceCowner.myInvoicesTitle')}
                      <span className="text-muted ms-2">
                        ({filteredInvoices.length} {t('invoiceCowner.records')})
                      </span>
                    </h5>
                  </div>
                </CardHeader>
                <CardBody className="p-0">
                  {loading ? (
                    <div className="text-center py-4">
                      <Spinner color="primary" />
                      <p className="mt-2">{t('invoiceCowner.loading')}</p>
                    </div>
                  ) : (
                    <>
                      <div className="table-responsive">
                        <Table className="align-middle table-nowrap mb-0">
                          <thead className="table-light">
                            <tr>
                              <th
                                scope="col"
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleSort('invoiceNumber')}
                              >
                                {t('invoiceCowner.tableInvoiceId')}
                                <i className={`ri-arrow-${sortConfig.key === 'invoiceNumber' ? (sortConfig.direction === 'asc' ? 'up' : 'down') : 'down'}-line ms-1 align-bottom`}></i>
                              </th>
                              <th
                                scope="col"
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleSort('building.name')}
                              >
                                {t('invoiceCowner.tableBuilding')}
                                <i className={`ri-arrow-${sortConfig.key === 'building.name' ? (sortConfig.direction === 'asc' ? 'up' : 'down') : 'down'}-line ms-1 align-bottom`}></i>
                              </th>
                              <th
                                scope="col"
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleSort('date')}
                              >
                                {t('invoiceCowner.tableIssueDate')}
                                <i className={`ri-arrow-${sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? 'up' : 'down') : 'down'}-line ms-1 align-bottom`}></i>
                              </th>
                              <th
                                scope="col"
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleSort('dueDate')}
                              >
                                {t('invoiceCowner.tableDueDate')}
                                <i className={`ri-arrow-${sortConfig.key === 'dueDate' ? (sortConfig.direction === 'asc' ? 'up' : 'down') : 'down'}-line ms-1 align-bottom`}></i>
                              </th>
                              <th
                                scope="col"
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleSort('total')}
                              >
                                {t('invoiceCowner.tableAmount')}
                                <i className={`ri-arrow-${sortConfig.key === 'total' ? (sortConfig.direction === 'asc' ? 'up' : 'down') : 'down'}-line ms-1 align-bottom`}></i>
                              </th>
                              <th
                                scope="col"
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleSort('status')}
                              >
                                {t('invoiceCowner.tableStatus')}
                                <i className={`ri-arrow-${sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? 'up' : 'down') : 'down'}-line ms-1 align-bottom`}></i>
                              </th>
                              <th scope="col">{t('invoiceCowner.tableAction')}</th>
                              <th scope="col">{t('invoiceCowner.paymentStatus')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentInvoices.map(invoice => (
                              <tr key={invoice._id}>
                                <td>
                                  <Link to={`/apps-invoices-details/${invoice._id}`} className="fw-medium">
                                    #{invoice.invoiceNumber}
                                  </Link>
                                </td>
                                <td>{invoice.building?.name || 'N/A'}</td>
                                <td>{handleValidDate(invoice.date)}</td>
                                <td>{handleValidDate(invoice.dueDate)}</td>
                                <td className="fw-medium">
                                  {invoice.currency?.symbol || '$'}{invoice.total?.toFixed(2) || "0.00"}
                                </td>
                                <td>
                                  <Badge
                                    color={
                                      invoice.status === 'paid' ? 'success' :
                                        invoice.status === 'pending' ? 'warning' :
                                          invoice.status === 'rejected' ? 'danger' :
                                            'secondary'
                                    }
                                  >
                                    {t(`invoices.${invoice.status}`)}
                                  </Badge>
                                </td>
                                <td>
                                  <div className="d-flex gap-2">
                                    <Button
                                      color="success"
                                      size="sm"
                                      className="btn-sm"
                                      title={t('invoiceCowner.viewDetails')}
                                      tag={Link}
                                      to={`/apps-invoices-details/${invoice._id}`}
                                    >
                                      <i className="ri-eye-line" style={{color:'white'}}></i>
                                    </Button>
                                    <Button
                                      color="info"
                                      size="sm"
                                      className="btn-sm"
                                      title={t('invoiceCowner.download')}
                                      onClick={() => downloadInvoice(invoice.invoiceNumber)}
                                    >
                                      <i className="ri-download-2-line align-bottom"></i>
                                    </Button>
                                    {(invoice.status === 'unpaid' || invoice.status === 'rejected') && (
                                      <Button
                                        color="warning"
                                        size="sm"
                                        className="btn-sm"
                                        title={t('invoiceCowner.uploadPaymentProof')}
                                        onClick={() => openPaymentModal(invoice)}
                                      >
                                        <i className="ri-secure-payment-line align-bottom"></i>
                                      </Button>
                                    )}
                                    {invoice.status === 'unpaid' && (
                                      <Button
                                        color="primary"
                                        size="sm"
                                        className="btn-sm"
                                        title={t('invoiceCowner.applyCoupon')}
                                        onClick={() => openCouponModal(invoice)}
                                      >
                                        <i className="ri-coupon-3-line align-bottom"></i>
                                      </Button>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  {invoice.status === 'rejected' && invoice.paymentProof && (
                                    <div className="d-flex flex-column gap-1">
                                      <Badge color="danger" className="w-md">
                                        <i className="ri-information-line me-1"></i> {t('invoiceCowner.paymentRejected')}
                                      </Badge>
                                      {invoice.paymentProof.reviewNotes && (
                                        <small className="text-danger">
                                          <strong>{t('invoiceCowner.reason')}:</strong> {invoice.paymentProof.reviewNotes}
                                        </small>
                                      )}
                                      <Button
                                        color="info"
                                        size="sm"
                                        className="btn-sm mt-1"
                                        onClick={() => openPaymentModal(invoice)}
                                      >
                                        <i className="ri-restart-line me-1"></i>
                                        {t('invoiceCowner.retryPayment')}
                                      </Button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>

                      {filteredInvoices.length === 0 && (
                        <div className="text-center p-4">
                          <div className="avatar-md mx-auto mb-4">
                            <div className="avatar-title bg-light text-secondary rounded-circle fs-24">
                              <i className="ri-file-list-3-line"></i>
                            </div>
                          </div>
                          <h5>{t('invoiceCowner.noInvoicesFound')}</h5>
                          {searchText && <p className="text-muted mb-0">{t('invoiceCowner.noMatchesFor')} "{searchText}"</p>}
                          {!currentBuilding && <p className="text-muted mb-0">{t('invoiceCowner.selectBuildingToView')}</p>}
                        </div>
                      )}

                      {/* Pagination Controls */}
                      <div className="d-flex justify-content-end border-top border-top-dashed p-3">
                        <div className="d-flex align-items-center">
                          <div className="text-muted me-2">
                            {t('invoiceCowner.show')}
                          </div>
                          <UncontrolledDropdown className="me-2">
                            <DropdownToggle
                              color="primary"
                              className="btn btn-sm"
                              caret
                            >
                              {itemsPerPage} <i className="mdi mdi-chevron-down"></i>
                            </DropdownToggle>
                            <DropdownMenu>
                              <DropdownItem onClick={() => { setItemsPerPage(5); setCurrentPage(1); }}>5</DropdownItem>
                              <DropdownItem onClick={() => { setItemsPerPage(10); setCurrentPage(1); }}>10</DropdownItem>
                              <DropdownItem onClick={() => { setItemsPerPage(20); setCurrentPage(1); }}>20</DropdownItem>
                            </DropdownMenu>
                          </UncontrolledDropdown>
                          <div className="text-muted me-3">
                            {t('invoiceCowner.entries')}
                          </div>

                          <Pagination className="mb-0">
                            <PaginationItem disabled={currentPage === 1}>
                              <PaginationLink
                                previous
                                onClick={() => setCurrentPage(currentPage - 1)}
                              />
                            </PaginationItem>
                            {Array.from({ length: totalPages }, (_, i) => (
                              <PaginationItem active={currentPage === i + 1} key={i}>
                                <PaginationLink onClick={() => setCurrentPage(i + 1)}>
                                  {i + 1}
                                </PaginationLink>
                              </PaginationItem>
                            ))}
                            <PaginationItem disabled={currentPage === totalPages || totalPages === 0}>
                              <PaginationLink
                                next
                                onClick={() => setCurrentPage(currentPage + 1)}
                              />
                            </PaginationItem>
                          </Pagination>
                        </div>
                      </div>
                    </>
                  )}
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    </React.Fragment>
  );
};

export default CoOwnerInvoiceList;