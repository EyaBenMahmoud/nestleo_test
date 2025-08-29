import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  CardBody,
  Row,
  Col,
  Card,
  Container,
  CardHeader,
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  FormGroup,
  ModalFooter,
  Label,
  Input,
  Spinner,
  Badge,
  UncontrolledTooltip,
  Alert,
  Progress
} from "reactstrap";
import { Link } from "react-router-dom";
import * as moment from "moment";
import CountUp from "react-countup";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import TableContainer from "../../Components/Common/TableContainer";
import DeleteModal from "../../Components/Common/DeleteModal";
import FeatherIcon from "feather-icons-react";
import { useSelector, useDispatch } from "react-redux";
import Loader from "../../Components/Common/Loader";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DropImage from "../../Components/Common/displayDropdown";
import {
  getInvoices as onGetInvoices,
  deleteInvoice as onDeleteInvoice,
  getInvoicesByBuilding,
  payInvoice,
} from "../../slices/invoice/slice";
import RecurringInvoiceModal from "./addScheduledInvoiceModal";
import InvoiceModal from "./InvoiceCreate";
import PayInCashModal from "./payInCashModal";
import api from "../../services/api";
import EditScheduledInvoiceModal from "./ScheduledInvoicesEditModal";
import { fetchUserChats } from "../../slices/chat/reducer";
import invoiceImage from "../../assets/images/Invoice.png";
import {
  extractFeatureValue,
  getInvoiceLimit,
  getScheduledInvoiceLimit,
  canCreateInvoice,
  canCreateScheduledInvoice
} from "../../Components/Subscriptions/SubcriptionValidator";
import { FaInfoCircle, FaFileInvoice, FaMoneyBillWave, FaClock, FaCheckCircle } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import InvoiceEditModal from "./invoiceEditModal";
import { Table } from "reactstrap";
const InvoiceList = () => {
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const invoiceState = useSelector((state) => state.Invoice);
  const { invoices = [], loading = false, error = null } = invoiceState || {};
  const { currentBuilding } = useSelector((state) => state.Building);

  // State for invoice type toggle
  const [invoiceType, setInvoiceType] = useState("regular");
  const user = useSelector(state => state.Loginn.user);

  // State for scheduled invoices
  const [scheduledInvoices, setScheduledInvoices] = useState([]);
  const [scheduledLoading, setScheduledLoading] = useState(false);

  // State for edit scheduling invoices modal 
  const [editScheduledModalOpen, setEditScheduledModalOpen] = useState(false);
  const [selectedScheduledInvoice, setSelectedScheduledInvoice] = useState(null);

  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteModalMulti, setDeleteModalMulti] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedCheckBoxDelete, setSelectedCheckBoxDelete] = useState([]);
  const [isMultiDeleteButton, setIsMultiDeleteButton] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const { buildings } = useSelector((state) => state.Building?.buildings || []);

  // Payment proof confirmation
  const [proofReviewModal, setProofReviewModal] = useState(false);
  const [selectedProofInvoice, setSelectedProofInvoice] = useState(null);
  const [proofReviewNotes, setProofReviewNotes] = useState('');
  const [isProcessingReview, setIsProcessingReview] = useState(false);


  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewScheduledInvoice, setPreviewScheduledInvoice] = useState(null);

  // Add this to your handlePreviewScheduledInvoice function right before setting the state
  const handlePreviewScheduledInvoice = async (invoice) => {
    try {
      setScheduledLoading(true);
      // Fetch the complete invoice with all relationships before showing the preview
      const response = await api.get(`/api/invoices/scheduled-invoices/${invoice._id}`);
      console.log("Fetched invoice data for preview:", response.data);

      // Create a deep copy and ensure items are properly formatted
      const invoiceWithItems = {
        ...response.data,
        items: Array.isArray(response.data.items)
          ? response.data.items.map(item => ({
            description: item.description || '',
            amount: parseFloat(item.amount || 0),
            _id: item._id
          }))
          : []
      };

      console.log("Processed invoice data:", invoiceWithItems);
      setPreviewScheduledInvoice(invoiceWithItems);
      setPreviewModalOpen(true);
    } catch (error) {
      console.error('Error fetching complete invoice data:', error);
      toast.error(t('invoices.errorFetchingDetails'));
    } finally {
      setScheduledLoading(false);
    }
  };
  // Handler for download button
  const handleDownloadScheduledInvoice = async (invoice) => {
    try {
      // Generate a preview PDF on-the-fly for the scheduled invoice template
      const response = await api.post('/api/invoices/scheduled-invoices/preview-pdf', {
        invoiceId: invoice._id
      }, {
        responseType: 'blob'  // Important to receive binary data
      });

      // Create a blob URL from the response
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `scheduled-invoice-${invoice.name}.pdf`);
      document.body.appendChild(link);
      link.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      toast.success(t('invoices.downloadSuccess'));
    } catch (error) {
      console.error('Error downloading scheduled invoice template:', error);
      toast.error(t('invoices.downloadError'));
    }
  };
  const openProofReviewModal = (invoice) => {
    setSelectedProofInvoice(invoice);
    setProofReviewNotes('');
    setProofReviewModal(true);
  };

  const toggleProofReviewModal = () => {
    setProofReviewModal(!proofReviewModal);
  };

  const handleProofReview = async (isApproved) => {
    setIsProcessingReview(true);

    try {
      const response = await api.post('/api/invoices/review-payment-proof', {
        invoiceId: selectedProofInvoice._id,
        isApproved,
        reviewNotes: proofReviewNotes
      });

      if (response.data.success) {
        toast.success(isApproved
          ? "Payment proof approved! Invoice marked as paid."
          : "Payment proof rejected."
        );
        toggleProofReviewModal();

        if (currentBuilding) {
          dispatch(getInvoicesByBuilding(currentBuilding._id));
        } else {
          dispatch(onGetInvoices());
        }
      } else {
        toast.error(response.data.message || "Failed to process review");
      }
    } catch (error) {
      console.error('Error reviewing payment proof:', error);
      toast.error(error.response?.data?.message || "Error processing review");
    } finally {
      setIsProcessingReview(false);
    }
  };

  // Fetch scheduled invoices
  const fetchScheduledInvoices = async () => {
    setScheduledLoading(true);
    try {
      const response = await api.get('/api/invoices/scheduled-invoices');
      const data = response.data;
      setScheduledInvoices(data);
    } catch (error) {
      toast.error('Failed to fetch scheduled invoices');
    } finally {
      setScheduledLoading(false);
    }
  };

  // Handle invoice type toggle
  const handleInvoiceTypeToggle = (type) => {
    setInvoiceType(type);
    if (type === 'scheduled') {
      fetchScheduledInvoices();
    }
  };

  // Function to handle edit button click
  const handleEditInvoice = (invoiceId) => {
    setEditingInvoiceId(invoiceId);
    setModalOpen(true);
  };

  const handleInvoiceSuccess = () => {
    if (currentBuilding) {
      dispatch(getInvoicesByBuilding(currentBuilding._id));
    } else {
      dispatch(onGetInvoices());
    }
  };

  // Function pay cash invoice
  const handlePayClick = (invoice) => {
    setSelectedInvoice(invoice);
    setPayModalOpen(true);
  };

  const handlePayInvoice = (invoiceId, cashPaymentDetails) => {
    const id = typeof invoiceId === 'object' ? invoiceId._id : invoiceId;
    dispatch(payInvoice({ invoiceId: id, cashPaymentDetails }))
      .unwrap()
      .then(() => {
        if (currentBuilding) {
          dispatch(getInvoicesByBuilding(currentBuilding._id));
        } else {
          dispatch(onGetInvoices());
        }
      })
      .catch(error => {
        toast.error(error.message || 'Failed to process cash payment');
      });
  };

  useEffect(() => {
    if (currentBuilding) {
      dispatch(getInvoicesByBuilding(currentBuilding._id));
    } else {
      dispatch(onGetInvoices());
    }
  }, [dispatch, currentBuilding]);

  // Calculate statistics for regular invoices
  const stats = useMemo(() => {
    let invoicesToUse = currentBuilding
      ? invoices.filter(inv => inv.building?._id === currentBuilding._id)
      : invoices;

    // Apply currency filter
    if (currencyFilter !== "all") {
      invoicesToUse = invoicesToUse.filter(invoice =>
        (invoice.currencyCode || "USD") === currencyFilter
      );
    }

    // Apply time filter
    const now = new Date();
    invoicesToUse = invoicesToUse.filter(invoice => {
      const invoiceDate = new Date(invoice.date);
      switch (dateFilter) {
        case 'today': return invoiceDate.toDateString() === now.toDateString();
        case 'week': return invoiceDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case 'month': return invoiceDate >= new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        default: return true;
      }
    });

    const totalInvoices = invoicesToUse.length;
    const paidInvoices = invoicesToUse.filter(inv => inv.status === "paid").length;
    const unpaidInvoices = invoicesToUse.filter(inv => inv.status === "unpaid").length;
    const pendingInvoices = invoicesToUse.filter(inv => inv.status === "pending").length;

    // Calculate total revenue in the filtered currency
    const totalRevenue = invoicesToUse.reduce((sum, inv) => {
      return sum + (inv.total || 0);
    }, 0);

    const paidRevenue = invoicesToUse
      .filter(inv => inv.status === "paid")
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Get currency symbol for display
    const displayCurrency = currencyFilter !== "all"
      ? currencyFilter
      : invoicesToUse[0]?.currencyCode || "USD";

    // Calculate payment rate
    const paymentRate = totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 100) : 0;

    return {
      totalInvoices,
      paidInvoices,
      unpaidInvoices,
      pendingInvoices,
      totalRevenue,
      paidRevenue,
      paymentRate,
      displayCurrency
    };
  }, [invoices, currentBuilding, dateFilter, currencyFilter]);

  // Date filtering helpers
  const isSameDay = (date1, date2) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const isThisWeek = (date) => {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    return date >= startOfWeek && date <= endOfWeek;
  };

  const isThisMonth = (date) => {
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  };

  const isThisYear = (date) => {
    return date.getFullYear() === new Date().getFullYear();
  };

  // Filter regular invoices
  // Update the filteredInvoices useMemo function to properly apply currency filter
  // Update the filteredInvoices function to enhance search capabilities

  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      //building filter 
      if (currentBuilding && invoice.building?._id !== currentBuilding._id) {
        return false;
      }

      // Currency filter
      if (currencyFilter !== "all" && invoice.currencyCode !== currencyFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && invoice.status !== statusFilter) {
        return false;
      }

      // Date filter
      const invoiceDate = new Date(invoice.date);
      const now = new Date();
      if (dateFilter === "today" && !isSameDay(invoiceDate, now)) {
        return false;
      }
      if (dateFilter === "week" && !isThisWeek(invoiceDate)) {
        return false;
      }
      if (dateFilter === "month" && !isThisMonth(invoiceDate)) {
        return false;
      }
      if (dateFilter === "year" && !isThisYear(invoiceDate)) {
        return false;
      }

      // Enhanced Search filter - check all relevant fields
      if (searchText) {
        const searchLower = searchText.toLowerCase().trim();

        // Check invoice ID/number (both with and without # prefix)
        const invoiceIdSearch = searchLower.startsWith('#')
          ? searchLower.substring(1)
          : searchLower;

        const matchesInvoiceNumber =
          invoice.invoiceNumber?.toLowerCase().includes(invoiceIdSearch) ||
          invoice._id?.toLowerCase().includes(searchLower);

        // Check customer name (first and last name, separately and combined)
        const customerFullName = `${invoice.coOwner?.firstName || ''} ${invoice.coOwner?.lastName || ''}`.toLowerCase();
        const matchesCustomerName =
          customerFullName.includes(searchLower) ||
          invoice.coOwner?.firstName?.toLowerCase().includes(searchLower) ||
          invoice.coOwner?.lastName?.toLowerCase().includes(searchLower);

        // Check email
        const matchesEmail = invoice.coOwner?.email?.toLowerCase().includes(searchLower);

        // Check status, amount, building name
        const matchesStatus = invoice.status?.toLowerCase().includes(searchLower);
        const matchesAmount = invoice.total?.toString().includes(searchText);
        const matchesBuilding = invoice.building?.name?.toLowerCase().includes(searchLower);

        // If any field matches, include this invoice in results
        return matchesInvoiceNumber ||
          matchesCustomerName ||
          matchesEmail ||
          matchesStatus ||
          matchesAmount ||
          matchesBuilding;
      }

      return true;
    });
  }, [invoices, currentBuilding, statusFilter, dateFilter, searchText, currencyFilter]);// Add currencyFilter to dependencies
  // Filter scheduled invoices
  // Update filteredScheduledInvoices to include invoice ID and email in search
  const filteredScheduledInvoices = useMemo(() => {
    return scheduledInvoices.filter(invoice => {
      // Building filter
      if (currentBuilding && invoice.building?._id !== currentBuilding._id) {
        return false;
      }

      // Search filter
      if (searchText) {
        const searchLower = searchText.toLowerCase();

        // Include invoice ID in search
        const matchesId = invoice._id?.toLowerCase().includes(searchLower);

        // Include name and frequency in search
        const matchesName = invoice.name?.toLowerCase().includes(searchLower);
        const matchesFrequency = invoice.frequency?.toLowerCase().includes(searchLower);

        // Search in recipients (apartments with co-owners)
        const matchesEmail = invoice.recipients?.some(recipient =>
          recipient.apartment?.coOwner?.email?.toLowerCase().includes(searchLower)
        );

        // Search in blocs (some implementations might have bloc names)
        const matchesBloc = invoice.blocs?.some(bloc =>
          bloc.name?.toLowerCase().includes(searchLower)
        );

        // Return true if any field matches
        return matchesId || matchesName || matchesFrequency || matchesEmail || matchesBloc;
      }

      return true;
    });
  }, [scheduledInvoices, currentBuilding, searchText]);
  // Delete functions
  const onClickDelete = (invoice) => {
    setSelectedInvoice(invoice);
    setDeleteModal(true);
  };

  const handleDeleteInvoice = () => {
    if (selectedInvoice) {
      if (invoiceType === 'regular') {
        dispatch(onDeleteInvoice(selectedInvoice._id));
      } else {
        // Handle scheduled invoice deletion
        api.delete(`/api/invoices/scheduled-invoices/${selectedInvoice._id}`)
          .then(() => {
            toast.success('Scheduled invoice deleted successfully');
            fetchScheduledInvoices();
          })
          .catch(error => {
            toast.error('Failed to delete scheduled invoice');
          });
      }
      setDeleteModal(false);
    }
  };

  const downloadInvoice = (invoiceNumber) => {
    window.open(`${process.env.REACT_APP_API_URL}/api/invoices/download/${invoiceNumber}`, '_blank');
  };

  const handleValidDate = (date) => {
    return moment(new Date(date)).format("DD MMM Y");
  };

  // Multi-delete functions
  const checkedAll = useCallback(() => {
    const checkAllBox = document.getElementById("checkBoxAll");
    const checkBoxes = document.querySelectorAll(".invoiceCheckBox");
    checkBoxes.forEach((box) => (box.checked = checkAllBox.checked));
    deleteCheckbox();
  }, []);

  const deleteMultiple = () => {
    const checkAllBox = document.getElementById("checkBoxAll");
    selectedCheckBoxDelete.forEach((element) => {
      if (invoiceType === 'regular') {
        dispatch(onDeleteInvoice(element.value));
      } else {
        // Handle scheduled invoice deletion
        api.delete(`/api/invoices/scheduled-invoices/${element.value}`)
          .then(() => {
            toast.success('Scheduled invoice deleted successfully');
            fetchScheduledInvoices();
          })
          .catch(error => {
            toast.error('Failed to delete scheduled invoice');
          });
      }
      setTimeout(() => {
        toast.clearWaitingQueue();
      }, 3000);
    });
    setIsMultiDeleteButton(false);
    checkAllBox.checked = false;
  };

  const deleteCheckbox = () => {
    const checkBoxes = document.querySelectorAll(".invoiceCheckBox:checked");
    setIsMultiDeleteButton(checkBoxes.length > 0);
    setSelectedCheckBoxDelete(Array.from(checkBoxes).map((box) => ({
      value: box.value,
      id: box.id
    })));
  };

  // Columns for regular invoices
  const regularInvoiceColumns = useMemo(
    () => [
      {
        Header: (
          <input
            type="checkbox"
            id="checkBoxAll"
            className="form-check-input"
            onClick={checkedAll}
          />
        ),
        Cell: (cellProps) => (
          <input
            type="checkbox"
            className="invoiceCheckBox form-check-input"
            value={cellProps.row.original._id}
            onChange={deleteCheckbox}
          />
        ),
        id: "#",
      },
      {
        Header: t("invoices.tableInvoiceId"),
        accessor: "invoiceNumber",
        filterable: false,
        Cell: (cell) => (
          <Link to={`/apps-invoices-details/${cell.row.original._id}`} className="fw-medium">
            #{cell.value}
          </Link>
        ),
      },
      {
        Header: t("invoices.tableBuilding"),
        accessor: "building",
        Cell: (cell) => {
          const building = cell.row.original.building;
          return <span>{building?.name || "N/A"}</span>;
        },
        filterable: false,
      },
      {
        Header: t("invoices.tableCustomer"),
        accessor: "coOwner",
        filterable: false,
        Cell: (cell) => {
          const coOwner = cell.row.original.coOwner;
          const customerName = coOwner ? `${coOwner.firstName} ${coOwner.lastName}` : "Unknown";
          const hasImage = coOwner?.avatar;
          const initials = coOwner
            ? `${coOwner.firstName?.charAt(0) || ''}${coOwner.lastName?.charAt(0) || ''}`.toUpperCase()
            : '';

          return (
            <div className="d-flex align-items-center">
              {hasImage ? (
                <DropImage
                  userId={coOwner}
                  alt={customerName}
                  className="avatar-xs rounded-circle me-2"
                />
              ) : (
                <div className="flex-shrink-0 avatar-xs me-2">
                  <div className="avatar-title bg-soft-primary text-primary rounded-circle">
                    {initials}
                  </div>
                </div>
              )}
              <span>{customerName}</span>
            </div>
          );
        },
      },
      {
        Header: t("invoices.tableEmail"),
        accessor: "coOwner.email",
        filterable: false,
        Cell: (cell) => {
          const coOwner = cell.row.original.coOwner;
          return <span className="text-muted">{coOwner?.email || "N/A"}</span>;
        },
      },
      {
        Header: t("invoices.tableIssueDate"),
        Cell: (cell) => (
          <span>{handleValidDate(cell.row.original.date)}</span>
        ),
        filterable: false,
      },
      {
        Header: t("invoices.tableDueDate"),
        Cell: (cell) => (
          <span>{handleValidDate(cell.row.original.dueDate)}</span>
        ),
        filterable: false,
      },
      {
        Header: t("invoices.tableAmount"),
        Cell: (cell) => {
          const invoice = cell.row.original;
          const currencySymbol = invoice.currencySymbol || invoice.currency?.symbol || "$";
          return (
            <span className="fw-medium">
              {currencySymbol}{invoice.total?.toFixed(2) || "0.00"}
            </span>
          );
        },
        filterable: false,
      },
      {
        Header: t("invoices.tableStatus"),
        accessor: "status",
        Cell: (cell) => {
          const status = cell.value || "unpaid";
          let badgeClass = "";

          switch (status.toLowerCase()) {
            case 'paid':
              badgeClass = "success";
              break;
            case 'pending':
              badgeClass = "warning";
              break;
            case 'rejected':
              badgeClass = "danger";
              break;
            case 'unpaid':
            default:
              badgeClass = "secondary";
              break;
          }

          return (
            <Badge color={badgeClass} >
              {status}
            </Badge>
          );
        },
      },
      {
        Header: t("invoices.tableAction"),
        Cell: (cell) => (
          <div className="d-flex gap-2">
            <Button
              color="success"
              size="sm"
              className="btn-sm"
              title="view invoice details"
              tag={Link}
              to={`/apps-invoices-details/${cell.row.original._id}`}
            >
              <i className="ri-eye-line" style={{ color: 'white' }}></i>
            </Button>

            {cell.row.original.status === "unpaid" && (
              <Button
                color="primary"
                size="sm"
                className="btn-sm"
                title="Edit invoice"
                onClick={() => handleEditInvoice(cell.row.original._id)}
              >
                <i className="ri-pencil-fill align-bottom"></i>
              </Button>
            )}

            {/* Payment actions based on status */}
            {cell.row.original.status === "pending" && cell.row.original.paymentProof && (
              <Button
                color="warning"
                size="sm"
                className="btn-sm"
                title="Review Payement Proof"
                onClick={() => openProofReviewModal(cell.row.original)}
              >
                <i className="ri-bank-card-line align-bottom"></i>
              </Button>
            )}

            {cell.row.original.status !== "paid" && cell.row.original.status !== "pending" && (
              <Button
                color="info"
                size="sm"
                className="btn-sm"
                title="Pay this invoice in cash"
                onClick={() => handlePayClick(cell.row.original)}
              >
                <i className="ri-money-dollar-circle-line align-bottom"></i>
              </Button>
            )}

            <Button
              color="primary"
              size="sm"
              className="btn-sm"
              title="Download Invoice"
              onClick={() => downloadInvoice(cell.row.original.invoiceNumber)}
            >
              <i className="ri-download-2-line align-bottom"></i>
            </Button>

            <Button
              color="danger"
              size="sm"
              className="btn-sm"
              title="Delete Invoice"
              onClick={() => onClickDelete(cell.row.original)}
            >
              <i className="ri-delete-bin-fill align-bottom"></i>
            </Button>
          </div>
        ),
      },
    ],
    [checkedAll]
  );

  // Columns for scheduled invoices
  // Update the scheduledInvoiceColumns array to include download and preview options

  const scheduledInvoiceColumns = useMemo(
    () => [
      {
        Header: (
          <input
            type="checkbox"
            id="checkBoxAll"
            className="form-check-input"
            onClick={checkedAll}
          />
        ),
        Cell: (cellProps) => (
          <input
            type="checkbox"
            className="invoiceCheckBox form-check-input"
            value={cellProps.row.original._id}
            onChange={deleteCheckbox}
          />
        ),
        id: "#",
      },
      {
        Header: t("invoices.scheduledTableName"),
        accessor: "name",
        filterable: false,
        Cell: (cell) => (
          <span className="fw-medium">{cell.value}</span>
        ),
      },
      {
        Header: t("invoices.scheduledTableBuilding"),
        accessor: "building",
        Cell: (cell) => {
          const building = cell.row.original.building;
          return <span>{building?.name || "N/A"}</span>;
        },
        filterable: false,
      },
      {
        Header: t("invoices.tableRecipients"),
        accessor: "recipientsCount",
        Cell: (cell) => {
          const invoice = cell.row.original;
          const recipientsCount = invoice.selectedApartments?.length || 0;
          const blocCount = invoice.selectedBlocs?.length || 0;

          return (
            <span className="text-muted" id={`recipients-${invoice._id}`}>
              {recipientsCount} {t('invoices.apartments')}
              {blocCount > 0 ? `, ${blocCount} ${t('invoices.blocs')}` : ''}
              <UncontrolledTooltip target={`recipients-${invoice._id}`}>
                {invoice.selectedApartments?.map(apt =>
                  apt.coOwner ? `${apt.coOwner.firstName} ${apt.coOwner.lastName}` : apt.number
                ).join(', ') || t('invoices.noRecipients')}
              </UncontrolledTooltip>
            </span>
          );
        },
        filterable: false,
      },
      {
        Header: t("invoices.scheduledTableFrequency"),
        accessor: "frequency",
        Cell: (cell) => (
          <span className="text-capitalize">{t(`invoices.recurring.${cell.value}`)}</span>
        ),
        filterable: false,
      },
      {
        Header: t("invoices.scheduledTableNextRun"),
        accessor: "nextRun",
        Cell: (cell) => (
          <span>{handleValidDate(cell.value)}</span>
        ),
        filterable: false,
      },
      {
        Header: t("invoices.scheduledTableStatus"),
        accessor: "active",
        Cell: (cell) => (
          <Badge color={cell.value ? "success" : "danger"}>
            {cell.value ? t('invoices.active') : t('invoices.inactive')}
          </Badge>
        ),
        filterable: false,
      },
      {
        Header: t("invoices.scheduledTableAction"),
        Cell: (cell) => (
          <div className="d-flex gap-2">
            {/* Preview button */}
            <Button
              color="success"
              size="sm"
              className="btn-sm"
              title={t('invoices.preview')}
              onClick={() => handlePreviewScheduledInvoice(cell.row.original)}
            >
              <i className="ri-eye-line" style={{ color: 'white' }}></i>
            </Button>

            {/* Download button */}
            <Button
              color="primary"
              size="sm"
              className="btn-sm"
              title={t('invoices.download')}
              onClick={() => handleDownloadScheduledInvoice(cell.row.original)}
            >
              <i className="ri-download-2-line align-bottom"></i>
            </Button>

            {/* Edit button */}
            <Button
              color="info"
              size="sm"
              className="btn-sm"
              title={t('invoices.edit')}
              onClick={() => {
                setSelectedScheduledInvoice(cell.row.original);
                setEditScheduledModalOpen(true);
              }}
            >
              <i className="ri-pencil-fill align-bottom"></i>
            </Button>

            {/* Toggle active button */}
            <Button
              color={cell.row.original.active ? "warning" : "success"}
              size="sm"
              className="btn-sm"
              title={cell.row.original.active ? t('invoices.deactivate') : t('invoices.activate')}
              onClick={() => {
                api.patch(`/api/invoices/scheduled-invoices/${cell.row.original._id}/toggle-active`)
                  .then(() => {
                    toast.success(`${t('invoices.scheduledInvoice')} ${!cell.row.original.active ? t('invoices.activated') : t('invoices.deactivated')}`);
                    fetchScheduledInvoices();
                  })
                  .catch(error => {
                    toast.error(t('invoices.failedToToggleStatus'));
                  });
              }}
            >
              <i className={`ri-${cell.row.original.active ? 'pause' : 'play'}-line align-bottom`}></i>
            </Button>

            {/* Delete button */}
            <Button
              color="danger"
              size="sm"
              className="btn-sm"
              title={t('invoices.delete')}
              onClick={() => onClickDelete(cell.row.original)}
            >
              <i className="ri-delete-bin-fill align-bottom"></i>
            </Button>
          </div>
        ),
      },
    ],
    [checkedAll, t]
  );

  document.title = "Invoice List | Nestleo";

  const checkInvoiceLimit = (user, invoices) => {
    if (!user?.subscription?.planId?.features) {
      console.log('No subscription features found');
      return true; // Allow if no subscription info
    }

    // Find the invoice limit feature in the subscription - note the exact name match with "Factures "
    const invoiceFeature = user.subscription.planId.features.find(f =>
      f.name.toLowerCase().includes("factures ")
    );

    console.log('Invoice feature found:', invoiceFeature);

    if (!invoiceFeature || invoiceFeature.isActive === false) {
      console.log('Invoice feature not found or inactive');
      return false; // Don't allow if feature doesn't exist or is inactive
    }

    // Extract invoice limit from feature name (e.g., "Factures : 10" -> 10)
    const valueMatch = invoiceFeature.name.match(/:\s*(\d+|Illimité)/i);
    let maxInvoices = null;

    if (valueMatch) {
      if (valueMatch[1].toLowerCase() === 'illimité') {
        maxInvoices = -1;  // unlimited
      } else {
        maxInvoices = parseInt(valueMatch[1]);
      }
    }

    console.log('Max invoices allowed:', maxInvoices);
    console.log('Current invoice count:', invoices?.length || 0);

    // If unlimited or no limit found, allow
    if (maxInvoices === -1 || maxInvoices === null) {
      return true;
    }

    // Compare the current invoice count with the maximum allowed
    return (invoices?.length || 0) < maxInvoices;
  };


  const checkScheduledInvoiceLimit = (user, scheduledInvoices) => {
    if (!user?.subscription?.planId?.features) {
      return true; // Allow if no subscription info
    }

    // Find the scheduled invoice feature
    const scheduledFeature = user.subscription.planId.features.find(f =>
      f.name.toLowerCase().includes("factures récurrentes")
    );

    if (!scheduledFeature || scheduledFeature.isActive === false) {
      return false; // Don't allow if feature doesn't exist or is inactive
    }

    // Extract limit from feature name
    const valueMatch = scheduledFeature.name.match(/:\s*(\d+|Illimité)/i);
    let maxScheduled = null;

    if (valueMatch) {
      if (valueMatch[1].toLowerCase() === 'illimité') {
        maxScheduled = -1;  // unlimited
      } else {
        maxScheduled = parseInt(valueMatch[1]);
      }
    }

    // If unlimited or no limit found, allow
    if (maxScheduled === -1 || maxScheduled === null) {
      return true;
    }

    // Compare with the current count
    return (scheduledInvoices?.length || 0) < maxScheduled;
  };

  // Get invoice limit display value
  const getInvoiceLimitDisplay = (user) => {
    if (!user?.subscription?.planId?.features) {
      return "∞";
    }

    const invoiceFeature = user.subscription.planId.features.find(f =>
      f.name.toLowerCase().includes("factures ")
    );

    if (!invoiceFeature) {
      return "∞";
    }

    const valueMatch = invoiceFeature.name.match(/:\s*(\d+|Illimité)/i);

    if (!valueMatch) {
      return "∞";
    }

    if (valueMatch[1].toLowerCase() === 'illimité') {
      return "∞";
    }

    return valueMatch[1];
  };
  const getScheduledInvoiceLimitDisplay = (user) => {
    if (!user?.subscription?.planId?.features) {
      return "∞";
    }

    const scheduledFeature = user.subscription.planId.features.find(f =>
      f.name.toLowerCase().includes("factures récurrentes")
    );

    if (!scheduledFeature) {
      return "∞";
    }

    const valueMatch = scheduledFeature.name.match(/:\s*(\d+|Illimité)/i);

    if (!valueMatch) {
      return "∞";
    }

    if (valueMatch[1].toLowerCase() === 'illimité') {
      return "∞";
    }

    return valueMatch[1];
  };
  const isApproachingInvoiceLimit = (user, invoices) => {
    if (!user?.subscription?.planId?.features) {
      return false;
    }

    const invoiceFeature = user.subscription.planId.features.find(f =>
      f.name.toLowerCase().includes("factures ")
    );

    if (!invoiceFeature) return false;

    const valueMatch = invoiceFeature.name.match(/:\s*(\d+|Illimité)/i);
    let maxInvoices = null;

    if (valueMatch) {
      if (valueMatch[1].toLowerCase() === 'illimité') {
        return false; // Unlimited invoices, not approaching limit
      } else {
        maxInvoices = parseInt(valueMatch[1]);
      }
    }

    // If feature is inactive, not applicable
    if (invoiceFeature.isActive === false) return false;

    // Check if using 80% or more of limit
    const currentCount = invoices?.length || 0;
    return maxInvoices !== null && currentCount >= (maxInvoices * 0.8) && currentCount < maxInvoices;
  };

  const isApproachingScheduledLimit = (user, scheduledInvoices) => {
    if (!user?.subscription?.planId?.features) {
      return false;
    }

    const scheduledFeature = user.subscription.planId.features.find(f =>
      f.name.toLowerCase().includes("factures récurrentes")
    );

    if (!scheduledFeature) return false;

    const valueMatch = scheduledFeature.name.match(/:\s*(\d+|Illimité)/i);
    let maxScheduled = null;

    if (valueMatch) {
      if (valueMatch[1].toLowerCase() === 'illimité') {
        return false; // Unlimited, not approaching limit
      } else {
        maxScheduled = parseInt(valueMatch[1]);
      }
    }

    // If feature is inactive, not applicable
    if (scheduledFeature.isActive === false) return false;

    // Check if using 80% or more of limit
    const currentCount = scheduledInvoices?.length || 0;
    return maxScheduled !== null && currentCount >= (maxScheduled * 0.8) && currentCount < maxScheduled;
  };


  // Calculate limits
  const canCreateInvoice = checkInvoiceLimit(user, invoices);
  const invoiceLimit = getInvoiceLimitDisplay(user);
  const approachingInvoiceLimit = isApproachingInvoiceLimit(user, invoices);

  const canCreateScheduledInvoice = checkScheduledInvoiceLimit(user, scheduledInvoices);
  const scheduledInvoiceLimit = getScheduledInvoiceLimitDisplay(user);
  const approachingScheduledLimit = isApproachingScheduledLimit(user, scheduledInvoices);

  const invoiceCount = invoices?.length || 0;
  const scheduledInvoiceCount = scheduledInvoices?.length || 0;

  const InvoiceLimitInfo = ({ isScheduled = false }) => {
    const isApproaching = isScheduled ? approachingScheduledLimit : approachingInvoiceLimit;
    const canCreate = isScheduled ? canCreateScheduledInvoice : canCreateInvoice;
    const limit = isScheduled ? scheduledInvoiceLimit : invoiceLimit;
    const count = isScheduled ? scheduledInvoiceCount : invoiceCount;

    return (
      <div className={`ms-2 d-inline-block ${isApproaching ? 'text-warning' : 'text-muted'}`}>
        <small>
          <FaInfoCircle className={`${isApproaching ? 'text-warning' : ''} me-1`} />
          {isScheduled ? 'Scheduled' : 'Regular'} Invoices: {count} / {limit === "∞" ? "∞" : limit}
          {!canCreate && (
            <span className="ms-1 text-danger">
              (Limit reached)
            </span>
          )}
          {isApproaching && canCreate && (
            <span className="ms-1 text-warning">
              (Approaching limit)
            </span>
          )}
        </small>
      </div>
    );
  };

  return (
    <React.Fragment>
      <div className="page-content" >
        {selectedInvoice && (
          <PayInCashModal
            isOpen={payModalOpen}
            toggle={() => setPayModalOpen(false)}
            invoice={selectedInvoice}
            handleSubmit={handlePayInvoice}
          />
        )}

        <EditScheduledInvoiceModal
          isOpen={editScheduledModalOpen}
          toggle={() => setEditScheduledModalOpen(false)}
          invoice={selectedScheduledInvoice}
          buildings={currentBuilding ? [currentBuilding] : buildings}
          onSuccess={async () => {
            await fetchScheduledInvoices();
          }}
        />
        <DeleteModal
          show={deleteModal}
          onDeleteClick={handleDeleteInvoice}
          onCloseClick={() => setDeleteModal(false)}
        />
        <InvoiceModal
          isOpen={modalOpen}
          toggle={() => setModalOpen(!modalOpen)}
          invoiceId={editingInvoiceId}
          onSuccess={handleInvoiceSuccess}
          currentBuilding={currentBuilding}
        />
        <DeleteModal
          show={deleteModalMulti}
          onDeleteClick={() => {
            deleteMultiple();
            setDeleteModalMulti(false);
          }}
          onCloseClick={() => setDeleteModalMulti(false)}
        />

        <RecurringInvoiceModal
          show={showRecurringModal}
          onHide={() => {
            setShowRecurringModal(false);
          }}
          buildings={currentBuilding ? [currentBuilding] : buildings}
          onSuccess={async () => {
            setShowRecurringModal(false);
            await fetchScheduledInvoices();
            setScheduledInvoices((prev) => [...prev]);
          }}
          currentBuilding={currentBuilding}
        />

        <Container fluid>
          <BreadCrumb title={t('invoices.title')} pageTitle={t('invoices.pageTitle')} />

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
                        <h4 className="fw-semibold mb-2">{t('invoices.title')}</h4>
                        <p className="text-muted mb-3">{t('invoices.welcomeCard')}</p>

                        {/* Statistics Badges */}
                        <div className="d-flex flex-wrap gap-2">
                          <div className="d-flex flex-wrap gap-2">
                            {currentBuilding ? (
                              <Badge color="info" pill className="fs-12 py-2 px-3">
                                <FaFileInvoice className="me-1" /> {t('invoices.managing')}: {currentBuilding.name}
                              </Badge>
                            ) : (
                              <Badge color="primary" pill className="fs-12 py-2 px-3">
                                <FaFileInvoice className="me-1" /> {t('invoices.allProperties')}
                              </Badge>
                            )}
                          </div>
                          <Badge color="primary" pill className="fs-12 py-2 px-3">
                            <i className="ri-file-list-3-line me-1"></i> {t('invoices.total')}: {stats.totalInvoices}
                          </Badge>
                          <Badge color="warning" pill className="fs-12 py-2 px-3">
                            <FaClock className="me-1" /> {t('invoices.pending')}: {stats.pendingInvoices}
                          </Badge>
                          <Badge color="danger" pill className="fs-12 py-2 px-3">
                            <FaMoneyBillWave className="me-1" /> {t('invoices.revenue')}: {stats.displayCurrency}{stats.paidRevenue.toFixed(2)}
                          </Badge>
                        </div>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="text-end">
                        <div className="d-flex justify-content-end">
                          <Button color="success" tag={Link} to="/calendar">
                            <i className="ri-calendar-line me-1"></i> {t('invoices.calendar')}
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
                    <Col sm={12} md={2}>
                      <div>
                        <h5 className="card-title mb-0">{t('invoices.invoiceType')}</h5>
                      </div>
                      <div className="hstack gap-2 mt-2">
                        <Button
                          color={invoiceType === 'regular' ? "primary" : "light"}
                          onClick={() => handleInvoiceTypeToggle('regular')}
                          size="sm"
                        >
                          <i className="ri-file-list-3-line align-bottom me-1"></i>
                          {t('invoices.regular')}
                        </Button>
                        <Button
                          color={invoiceType === 'scheduled' ? "primary" : "light"}
                          onClick={() => handleInvoiceTypeToggle('scheduled')}
                          size="sm"
                        >
                          <i className="ri-repeat-line align-bottom me-1"></i>
                          {t('invoices.scheduled')}
                        </Button>
                      </div>
                    </Col>

                    {invoiceType === 'regular' ? (
                      <>
                        <Col sm={6} md={2}>
                          <div>
                            <h5 className="card-title mb-0">{t('invoices.status')}</h5>
                          </div>
                          <div>
                            <Input
                              type="select"
                              className="form-select mt-2"
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value)}
                            >
                              <option value="all">{t('invoices.allStatus')}</option>
                              <option value="paid">{t('invoices.paid')}</option>
                              <option value="unpaid">{t('invoices.unpaid')}</option>
                              <option value="pending">{t('invoices.pending')}</option>
                            </Input>
                          </div>
                        </Col>
                        <Col sm={6} md={2}>
                          <div>
                            <h5 className="card-title mb-0">{t('invoices.dateRange')}</h5>
                          </div>
                          <div>
                            <Input
                              type="select"
                              className="form-select mt-2"
                              value={dateFilter}
                              onChange={(e) => setDateFilter(e.target.value)}
                            >
                              <option value="all">{t('invoices.allTime')}</option>
                              <option value="today">{t('invoices.today')}</option>
                              <option value="week">{t('invoices.thisWeek')}</option>
                              <option value="month">{t('invoices.thisMonth')}</option>
                              <option value="year">{t('invoices.thisYear')}</option>
                            </Input>
                          </div>
                        </Col>
                        <Col sm={6} md={2}>
                          <div>
                            <h5 className="card-title mb-0">{t('invoices.currency')}</h5>
                          </div>
                          <div>
                            <Input
                              type="select"
                              className="form-select mt-2"
                              value={currencyFilter}
                              onChange={(e) => setCurrencyFilter(e.target.value)}
                            >
                              <option value="all">{t('invoices.allCurrencies')}</option>
                              {Array.from(new Set(invoices.map(inv => inv.currencyCode || "USD")))
                                .map((currency) => (
                                  <option key={currency} value={currency}>
                                    {currency}
                                  </option>
                                ))}
                            </Input>
                          </div>
                        </Col>
                      </>
                    ) : null}

                    <Col sm={12} md={invoiceType === 'regular' ? 4 : 10}>
                      <div>
                        <h5 className="card-title mb-0">{t('invoices.search')}</h5>
                      </div>
                      <div className="search-box mt-2">
                        <Input
                          type="text"
                          className="form-control search"
                          placeholder={t(`invoices.search${invoiceType === 'regular' ? 'Regular' : 'Scheduled'}`)}
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
                      {invoiceType === 'regular' ? t('invoices.invoices') : t('invoices.scheduledInvoices')}
                    </h5>
                    <div className="flex-shrink-0">
                      {isMultiDeleteButton && (
                        <Button
                          color="danger"
                          onClick={() => setDeleteModalMulti(true)}
                          className="btn-soft-danger me-1"
                        >
                          <i className="ri-delete-bin-2-line"></i>
                        </Button>
                      )}
                      {invoiceType === 'regular' && (
                        <>
                          <div style={{ display: 'inline-block', marginRight: '10px' }}>
                            <InvoiceLimitInfo isScheduled={false} />
                          </div>
                          <Button
                            color="primary"
                            className={`${!currentBuilding || !canCreateInvoice ? 'disabled' : ''}`}
                            onClick={(e) => {
                              if (!currentBuilding || !canCreateInvoice) {
                                e.preventDefault();
                                if (!currentBuilding) {
                                  toast.error(t('invoices.selectBuildingFirst'));
                                } else if (!canCreateInvoice) {
                                  toast.error(t('invoices.limitReached'));
                                }
                              } else {
                                setEditingInvoiceId(null);
                                setModalOpen(true);
                              }
                            }}
                            id="createInvoiceBtn"
                          >
                            <i className="ri-add-line align-bottom me-1"></i> {t('invoices.createInvoice')}
                          </Button>
                        </>
                      )}
                      {invoiceType === 'scheduled' && (
                        <>
                          <div style={{ display: 'inline-block', marginRight: '10px' }}>
                            <InvoiceLimitInfo isScheduled={true} />
                          </div>
                          <Button
                            color="primary"
                            className={`${!canCreateScheduledInvoice ? 'disabled' : ''}`}
                            onClick={(e) => {
                              if (!canCreateScheduledInvoice) {
                                e.preventDefault();
                                toast.error(t('invoices.scheduledLimitReached'));
                              } else {
                                setShowRecurringModal(true);
                              }
                            }}
                            id="createRecurringBtn"
                          >
                            <i className="ri-repeat-line align-bottom me-1"></i> {t('invoices.createRecurring')}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardBody className="pt-0">
                  {loading || scheduledLoading ? (
                    <div className="text-center py-4">
                      <Spinner color="primary" />
                      <p className="mt-2">{t('invoices.loading')}</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <TableContainer
                        columns={invoiceType === 'regular' ? regularInvoiceColumns : scheduledInvoiceColumns}
                        data={invoiceType === 'regular' ? filteredInvoices : filteredScheduledInvoices}
                        isGlobalFilter={false}
                        isAddUserList={false}
                        customPageSize={10}
                        className="custom-header-css"
                        theadClass="table-light"
                      />
                    </div>
                  )}
                  <ToastContainer closeButton={false} limit={1} />
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      <Modal isOpen={proofReviewModal} toggle={toggleProofReviewModal} centered size="lg">
        <ModalHeader toggle={toggleProofReviewModal}>
          {t('invoices.reviewPaymentProof')}
        </ModalHeader>
        <ModalBody>
          {selectedProofInvoice && selectedProofInvoice.paymentProof && (
            <div>
              <Row className="mb-4">
                <Col md={6}>
                  <h6 className="mb-3">{t('invoices.invoiceDetails')}</h6>
                  <div className="bg-light p-3 rounded">
                    <p className="mb-1"><strong>{t('invoices.invoiceNumber')}:</strong> {selectedProofInvoice.invoiceNumber}</p>
                    <p className="mb-1">
                      <strong>{t('invoices.amount')}:</strong> {selectedProofInvoice.currency?.symbol || '$'}
                      {selectedProofInvoice.total.toFixed(2)}
                    </p>
                    <p className="mb-1"><strong>{t('invoices.coOwner')}:</strong> {
                      `${selectedProofInvoice.coOwner?.firstName || ''} ${selectedProofInvoice.coOwner?.lastName || ''}`
                    }</p>
                    <p className="mb-0"><strong>{t('invoices.dueDate')}:</strong> {handleValidDate(selectedProofInvoice.dueDate)}</p>
                  </div>
                </Col>
                <Col md={6}>
                  <h6 className="mb-3">{t('invoices.paymentInformation')}</h6>
                  <div className="bg-light p-3 rounded">
                    <p className="mb-1"><strong>{t('invoices.referenceNumber')}:</strong> {selectedProofInvoice.paymentProof.referenceNumber}</p>
                    <p className="mb-1"><strong>{t('invoices.date')}:</strong> {handleValidDate(selectedProofInvoice.paymentProof.paymentDate)}</p>
                    <p className="mb-1"><strong>{t('invoices.submitted')}:</strong> {handleValidDate(selectedProofInvoice.paymentProof.uploadDate)}</p>
                    {selectedProofInvoice.paymentProof.notes && (
                      <p className="mb-0"><strong>{t('invoices.notes')}:</strong> {selectedProofInvoice.paymentProof.notes}</p>
                    )}
                  </div>
                </Col>
              </Row>

              <div className="mb-4">
                <h6 className="mb-3">{t('invoices.paymentProofDocument')}</h6>
                <div className="text-center bg-light p-4 rounded">
                  {selectedProofInvoice.paymentProof.filePath && (
                    selectedProofInvoice.paymentProof.filePath.endsWith('.pdf') ? (
                      <div className="text-center">
                        <i className="ri-file-pdf-line" style={{ fontSize: "60px", color: "#f44336" }}></i>
                        <p className="mb-0">{selectedProofInvoice.paymentProof.fileName || 'payment-proof.pdf'}</p>
                        <Button
                          color="primary"
                          size="sm"
                          className="mt-2"
                          onClick={() => window.open(`${process.env.REACT_APP_API_URL}/public/payment_proofs/${selectedProofInvoice.paymentProof.filePath.split('/').pop()}`, '_blank')}
                        >
                          <i className="ri-download-2-line me-1"></i>
                          {t('invoices.downloadPdf')}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <img
                          src={`${process.env.REACT_APP_API_URL}/public/payment_proofs/${selectedProofInvoice.paymentProof.filePath.split('/').pop()}`}
                          alt="Payment Proof"
                          className="img-fluid"
                          style={{ maxHeight: "300px" }}
                        />
                        <Button
                          color="primary"
                          size="sm"
                          className="mt-2"
                          onClick={() => window.open(`${process.env.REACT_APP_API_URL}/public/payment_proofs/${selectedProofInvoice.paymentProof.filePath.split('/').pop()}`, '_blank')}
                        >
                          <i className="ri-download-2-line me-1"></i>
                          {t('invoices.viewImage')}
                        </Button>
                      </div>
                    )
                  )}
                </div>
              </div>

              <FormGroup>
                <Label for="reviewNotes">{t('invoices.reviewNotes')}</Label>
                <Input
                  type="textarea"
                  id="reviewNotes"
                  placeholder={t('invoices.reviewNotesPlaceholder')}
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
          <Button color="secondary" onClick={toggleProofReviewModal} disabled={isProcessingReview}>
            {t('invoices.cancel')}
          </Button>
          <Button
            color="danger"
            onClick={() => handleProofReview(false)}
            disabled={isProcessingReview}
            className="me-2"
          >
            {isProcessingReview ? <Spinner size="sm" /> : <i className="ri-close-circle-line me-1"></i>}
            {t('invoices.rejectProof')}
          </Button>
          <Button
            color="success"
            onClick={() => handleProofReview(true)}
            disabled={isProcessingReview}
          >
            {isProcessingReview ? <Spinner size="sm" /> : <i className="ri-check-line me-1"></i>}
            {t('invoices.approveMarkPaid')}
          </Button>
        </ModalFooter>
      </Modal>


      <InvoiceEditModal
        isOpen={modalOpen && !!editingInvoiceId}
        toggle={() => {
          setModalOpen(false);
          setEditingInvoiceId(null);
        }}
        invoiceId={editingInvoiceId}
        onSuccess={() => {
          handleInvoiceSuccess();
          setEditingInvoiceId(null);
        }}
        currentBuilding={currentBuilding}
      />



      <Modal isOpen={previewModalOpen} toggle={() => setPreviewModalOpen(false)} size="lg">
        <ModalHeader toggle={() => setPreviewModalOpen(false)}>
          {t('invoices.previewScheduledInvoice')}
        </ModalHeader>

        <ModalBody>
          {previewScheduledInvoice && (
            <div className="scheduled-invoice-preview">
              <div className="mb-4 text-center">
                <h4>{previewScheduledInvoice.name}</h4>
                <p className="text-muted">
                  {t('invoices.recurring.frequency')}: {t(`invoices.recurring.${previewScheduledInvoice.frequency}`)}
                </p>
                <Badge color={previewScheduledInvoice.active ? "success" : "danger"} className="mb-3">
                  {previewScheduledInvoice.active ? t('invoices.active') : t('invoices.inactive')}
                </Badge>
              </div>

              <div className="row mb-3">
                <div className="col-md-6">
                  <div className="border rounded p-3">
                    <h5 className="mb-3">{t('invoices.recurring.details')}</h5>
                    <p><strong>{t('invoices.building')}:</strong> {previewScheduledInvoice.building?.name}</p>
                    <p><strong>{t('invoices.recurring.nextRun')}:</strong> {handleValidDate(previewScheduledInvoice.nextRun)}</p>
                    <p><strong>{t('invoices.taxRate')}:</strong> {((previewScheduledInvoice.taxRate || 0) * 100).toFixed(1)}%</p>
                    <p><strong>{t('invoices.currency')}:</strong> {previewScheduledInvoice.currency?.name || previewScheduledInvoice.currency?.code}</p>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="border rounded p-3">
                    <h5 className="mb-3">{t('invoices.recurring.recipients')}</h5>
                    <p><strong>{t('invoices.blocs')}:</strong> {previewScheduledInvoice.selectedBlocs?.length || 0}</p>
                    <p><strong>{t('invoices.apartments')}:</strong> {previewScheduledInvoice.selectedApartments?.length || 0}</p>
                    {(!previewScheduledInvoice.selectedBlocs?.length && !previewScheduledInvoice.selectedApartments?.length) && (
                      <Alert color="warning" className="mt-2">
                        {t('invoices.recurring.allBuildingWarning')}
                      </Alert>
                    )}
                  </div>
                </div>
              </div>
              <div className="border rounded p-3 mb-4">
                <h5 className="mb-3">{t('invoices.recurring.items')}</h5>
                {console.log("Items before rendering:", JSON.stringify(previewScheduledInvoice.items))}

                {/* Force render with explicit mapping and key indexes */}
                <Table bordered>
                  <thead>
                    <tr>
                      <th>{t('invoices.recurring.description')}</th>
                      <th className="text-end" style={{ width: "30%" }}>{t('invoices.amount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewScheduledInvoice.items && previewScheduledInvoice.items.length > 0 ? (
                      previewScheduledInvoice.items.map((item, idx) => (
                        <tr key={`item-${idx}`}>
                          <td>{item.description || 'No description'}</td>
                          <td className="text-end">
                            {previewScheduledInvoice.currency?.symbol || '€'} {parseFloat(item.amount || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" className="text-center">
                          {t('invoices.noItemsFound')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="table-light">
                    <tr>
                      <td className="fw-medium text-end">{t('invoices.subtotal')}</td>
                      <td className="text-end fw-medium">
                        {previewScheduledInvoice.currency?.symbol || '€'}&nbsp;
                        {Array.isArray(previewScheduledInvoice.items)
                          ? previewScheduledInvoice.items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0).toFixed(2)
                          : "0.00"}
                      </td>
                    </tr>
                    <tr>
                      <td className="fw-medium text-end">
                        {t('invoices.taxRate')} ({((previewScheduledInvoice.taxRate || 0) * 100).toFixed(1)}%)
                      </td>
                      <td className="text-end fw-medium">
                        {previewScheduledInvoice.currency?.symbol || '€'}&nbsp;
                        {Array.isArray(previewScheduledInvoice.items)
                          ? (previewScheduledInvoice.items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0) *
                            (previewScheduledInvoice.taxRate || 0)).toFixed(2)
                          : "0.00"}
                      </td>
                    </tr>
                    <tr>
                      <td className="fw-bold text-end">{t('invoices.total')}</td>
                      <td className="text-end fw-bold fs-5">
                        {previewScheduledInvoice.currency?.symbol || '€'}&nbsp;
                        {Array.isArray(previewScheduledInvoice.items)
                          ? (previewScheduledInvoice.items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0) *
                            (1 + (previewScheduledInvoice.taxRate || 0))).toFixed(2)
                          : "0.00"}
                      </td>
                    </tr>
                  </tfoot>
                </Table>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setPreviewModalOpen(false)}>
            {t('invoices.close')}
          </Button>
          <Button
            color="primary"
            onClick={() => {
              setPreviewModalOpen(false);
              handleDownloadScheduledInvoice(previewScheduledInvoice);
            }}
          >
            <i className="ri-download-2-line me-1"></i> {t('invoices.download')}
          </Button>
        </ModalFooter>
      </Modal>
    </React.Fragment>
  );
};

export default InvoiceList;