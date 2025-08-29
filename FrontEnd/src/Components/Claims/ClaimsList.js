import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getUserClaims,
  deleteClaim,
  updateClaim,
  createClaim,
  getTasksForClaims,
  resetTasks,
  convertClaimToTask,
} from "../../slices/claim/claimsSlice";
import {
  Container, Row, Col, Card, CardHeader, CardBody,
  Button, Input, Spinner, Modal, ModalHeader, ModalBody, Form, FormGroup, ModalFooter,
  Label, Badge, Dropdown, DropdownToggle, DropdownMenu, DropdownItem,
  Alert, Nav, NavItem, NavLink, TabContent, TabPane, Progress,
  ButtonGroup
} from 'reactstrap';
import { Link } from "react-router-dom";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import SuccessModal from "../../Components/Common/SucessModal";
import claimIllustration from "../../assets/images/claims1.png";
import { FaBuilding, FaCalendarAlt, FaFileInvoice, FaExclamationCircle, FaTasks } from 'react-icons/fa';
import { withTranslation } from "react-i18next";
import './claimList.css'
const ClaimsList = ({ t }) => {
  document.title = `${t('claims.title')} | Nestleo`;

  const dispatch = useDispatch();
  const currentBuilding = useSelector(state => state.Building.currentBuilding);
  const {
    list: claimsResponse = {},
    tasks = [],
    loading,
    tasksLoading,
    error,
    convertingToTask
  } = useSelector((state) => state.claims || {});

  const claims = claimsResponse.data || claimsResponse || [];
  const { user } = useSelector((state) => state.Loginn || {});

  // State management
  const [filterText, setFilterText] = useState('');
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [alertInfo, setAlertInfo] = useState({ message: '', type: 'info' });
  const [showAlert, setShowAlert] = useState(false);

  // Modals
  const [detailsModal, setDetailsModal] = useState(false);
  const [selectedClaimDetails, setSelectedClaimDetails] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [convertToTaskModal, setConvertToTaskModal] = useState(false);

  // Filters & View
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');

  // Form data
  const [editClaimData, setEditClaimData] = useState({
    id: null,
    title: '',
    description: '',
    task: null,
    status: 'Pending',
    priority: 'Medium',
    adminNote: ''
  });
  const [newClaimData, setNewClaimData] = useState({
    title: '',
    description: '',
    taskId: null,
    buildingId: currentBuilding?._id || null,
    priority: 'Medium'
  });
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    buildingId: null,
    claimId: null
  });  
  const [taskDropdownOpen, setTaskDropdownOpen] = useState(false);

  const toggleTaskDropdown = () => setTaskDropdownOpen(!taskDropdownOpen);

  // Dropdowns
  const [dropdownStates, setDropdownStates] = useState({
    priority: false,
    status: false,
    sort: false,
    filter: false
  });

  // Statistics calculations
  const totalClaims = claims.length;
  const pendingClaims = claims.filter(claim => claim.status === 'Pending').length;
  const resolvedClaims = claims.filter(claim => claim.status === 'Resolved').length;
  const rejectedClaims = claims.filter(claim => claim.status === 'Rejected').length;

  const pendingPercentage = totalClaims ? Math.round((pendingClaims / totalClaims) * 100) : 0;
  const resolvedPercentage = totalClaims ? Math.round((resolvedClaims / totalClaims) * 100) : 0;
  const rejectedPercentage = totalClaims ? Math.round((rejectedClaims / totalClaims) * 100) : 0;

  // Fetch claims data
  const fetchClaims = useCallback(() => {
    const params = {};
    if (currentBuilding) {
      params.buildingId = currentBuilding._id;
    }
    dispatch(getUserClaims(params));
  }, [dispatch, currentBuilding]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  // Alert helpers
  const displayAlert = (message, type = 'info') => {
    setAlertInfo({ message: t(message), type });
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 5000);
  };

  // Toggle dropdowns
  const toggleDropdown = (dropdown) => {
    setDropdownStates(prev => ({
      ...prev,
      [dropdown]: !prev[dropdown]
    }));
  };

  // Style functions
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'danger';
      case 'Medium': return 'warning';
      case 'Low': return 'info';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'warning';
      case 'resolved': return 'success';
      case 'rejected': return 'danger';
      default: return 'secondary';
    }
  };

  const getFormattedDate = (dateString) => {
    if (!dateString) return t('claims.noDate');
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSortedFilteredClaims = () => {
    let result = [...claims];

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(claim => claim.status?.toLowerCase() === statusFilter.toLowerCase());
    }

    // Apply tab filter
    if (activeTab !== 'all') {
      result = result.filter(claim => claim.status?.toLowerCase() === activeTab.toLowerCase());
    }

    // Apply text search
    if (filterText) {
      const searchLower = filterText.toLowerCase();
      result = result.filter(claim =>
        claim.title?.toLowerCase().includes(searchLower) ||
        claim.description?.toLowerCase().includes(searchLower) ||
        claim.task?.title?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      if (sortBy === 'date') {
        return sortDirection === 'asc'
          ? new Date(a.createdAt) - new Date(b.createdAt)
          : new Date(b.createdAt) - new Date(a.createdAt);
      }

      if (sortBy === 'title') {
        const titleA = a.title?.toLowerCase() || '';
        const titleB = b.title?.toLowerCase() || '';
        return sortDirection === 'asc'
          ? titleA.localeCompare(titleB)
          : titleB.localeCompare(titleA);
      }

      if (sortBy === 'priority') {
        const priorityValues = { 'High': 3, 'Medium': 2, 'Low': 1, '': 0 };
        const valueA = priorityValues[a.priority || ''] || 0;
        const valueB = priorityValues[b.priority || ''] || 0;
        return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
      }

      return 0;
    });

    return result;
  };

  const filteredClaims = getSortedFilteredClaims();

  // Handle form submissions
  const handleAdd = (e) => {
    e.preventDefault();
    dispatch(createClaim({
      title: newClaimData.title,
      description: newClaimData.description,
      taskId: newClaimData.taskId,
      buildingId: currentBuilding?._id,
      priority: newClaimData.priority
    })).then((result) => {
      if (!result.error) {
        setAddModal(false);
        setSuccessMessage(t('claims.submitSuccess'));
        setSuccessModal(true);
        setNewClaimData({
          title: '',
          description: '',
          taskId: null,
          buildingId: currentBuilding?._id || null,
          priority: 'Medium'
        });
        fetchClaims();
      } else {
        displayAlert('claims.submitFailed', 'danger');
      }
    });
  };

  const handleEdit = (e) => {
    e.preventDefault();
    if (editClaimData.id) {
      let claimData = {};

      if (user?.role === 'SyndicateAdmin') {
        claimData = {
          status: editClaimData.status,
          priority: editClaimData.priority,
          adminNote: editClaimData.adminNote || null
        };
      } else {
        claimData = {
          title: editClaimData.title,
          description: editClaimData.description,
          taskId: editClaimData.task?._id || null,
          status: editClaimData.status,
          priority: editClaimData.priority
        };
      }

      dispatch(updateClaim({
        id: editClaimData.id,
        claimData
      }))
        .then((result) => {
          if (!result.error) {
            setEditModal(false);
            setSuccessMessage(t('claims.updateSuccess'));
            setSuccessModal(true);
            fetchClaims();
          } else {
            displayAlert('claims.updateFailed', 'danger');
          }
        });
    }
  };

  const handleDelete = () => {
    if (selectedClaim) {
      dispatch(deleteClaim(selectedClaim)).then((result) => {
        if (!result.error) {
          setDeleteModal(false);
          displayAlert('claims.deleteSuccess', 'success');
          fetchClaims();
        } else {
          displayAlert('claims.deleteFailed', 'danger');
        }
      });
    }
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    dispatch(convertClaimToTask({
      claimId: taskData.claimId,
      taskData: {
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        buildingId: taskData.buildingId
      }
    })).then((result) => {
      if (!result.error) {
        setConvertToTaskModal(false);
        setSuccessMessage(t('claims.convertSuccess'));
        setSuccessModal(true);
        fetchClaims();
      } else {
        displayAlert('claims.convertFailed', 'danger');
      }
    });
  };

  // Modal handlers
  const openAddModal = () => {
    dispatch(getTasksForClaims({ buildingId: currentBuilding?._id }));
    setAddModal(true);
  };

  const openEditModal = (claim) => {
    dispatch(getTasksForClaims({ buildingId: claim.building?._id }));
    setEditClaimData({
      id: claim._id,
      title: claim.title,
      description: claim.description,
      task: claim.task,
      status: claim.status || 'Pending',
      priority: claim.priority || 'Medium',
      adminNote: claim.adminNote || ''
    });
    setEditModal(true);
  };

  const openDetailsModal = (claim) => {
    setSelectedClaimDetails(claim);
    setDetailsModal(true);
  };

  const openConvertToTaskModal = (claim) => {
    setTaskData({
      title: claim.title,
      description: claim.description,
      priority: claim.priority || 'Medium',
      buildingId: claim.building?._id || currentBuilding?._id,
      claimId: claim._id
    });
    setConvertToTaskModal(true);
  };

  return (
    <React.Fragment>
      <div className="page-content">
        <Container style={{color: 'white'}} fluid>
          <BreadCrumb title={t('claims.title')} pageTitle={t('claims.pageTitle')} />

          {/* Alert for messages */}
          {showAlert && (
            <Alert color={alertInfo.type} isOpen={showAlert} toggle={() => setShowAlert(false)} className="mb-3">
              {alertInfo.message}
            </Alert>
          )}

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
                        <h4 className="fw-semibold mb-2">{t('claims.title')}</h4>
                        <p className="text-muted mb-3">{t('claims.welcomeCard')}</p>
                        
                        {/* Statistics Badges */}
                        <div className="d-flex flex-wrap gap-2">
                          <div className="d-flex flex-wrap gap-2">
                            {currentBuilding ? (
                              <Badge color="info" pill className="fs-12 py-2 px-3">
                                <FaBuilding className="me-1" /> {t('claims.managing')}: {currentBuilding.name}
                              </Badge>
                            ) : (
                              <Badge color="primary" pill className="fs-12 py-2 px-3">
                                <FaBuilding className="me-1" /> {t('claims.allProperties')}
                              </Badge>
                            )}
                          </div>
                          <Badge color="primary" pill className="fs-12 py-2 px-3">
                            <i className="ri-file-list-3-line me-1"></i> {t('claims.total')}: {totalClaims}
                          </Badge>
                          <Badge color="warning" pill className="fs-12 py-2 px-3">
                            <i className="ri-time-line me-1"></i> {t('claims.pending')}: {pendingClaims}
                          </Badge>
                          <Badge color="success" pill className="fs-12 py-2 px-3">
                            <i className="ri-check-double-line me-1"></i> {t('claims.resolved')}: {resolvedClaims}
                          </Badge>
                          <Badge color="danger" pill className="fs-12 py-2 px-3">
                            <i className="ri-close-circle-line me-1"></i> {t('claims.rejected')}: {rejectedClaims}
                          </Badge>
                        </div>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="text-end">
                        <div className="d-flex justify-content-end">
                          <Button color="success" tag={Link} to="/calendar">
                            <FaCalendarAlt className="me-1" /> {t('claims.calendar')}
                          </Button>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </CardBody>
              </Card>
            </Col>
          </Row>

          {/* Claims List Section */}
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader style={{ background: 'linear-gradient(90deg,#c1e8f0, #cbe9f3, #e0f7fa)' }} className="align-items-center d-flex">
                  <h4 className="card-title mb-0 flex-grow-1">{t('claims.claims')}</h4>
                  <div className="flex-shrink-0 d-flex gap-2">
                    <div className="search-box">
                      <Input
                        type="text"
                        className="form-control search"
                        placeholder={t('claims.search')}
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                      />
                      <i className="ri-search-line search-icon"></i>
                      {filterText && (
                        <Button
                          color="link"
                          className="btn-close btn-close-lg position-absolute end-0 top-50 translate-middle"
                          style={{ marginTop: "-2px" }}
                          onClick={() => setFilterText('')}
                        />
                      )}
                    </div>

                    <Button color="light" className="btn-icon" onClick={() => setViewMode('grid')}>
                      <i className={`ri-grid-fill ${viewMode === 'grid' ? 'text-primary' : ''}`}></i>
                    </Button>
                    <Button color="light" className="btn-icon" onClick={() => setViewMode('list')}>
                      <i className={`ri-list-check ${viewMode === 'list' ? 'text-primary' : ''}`}></i>
                    </Button>

                    <Dropdown isOpen={dropdownStates.sort} toggle={() => toggleDropdown('sort')}>
                      <DropdownToggle color="light" className="btn-icon">
                        <i className="ri-sort-asc"></i>
                      </DropdownToggle>
                      <DropdownMenu right>
                        <DropdownItem header>{t('claims.sortBy')}</DropdownItem>
                        <DropdownItem onClick={() => { setSortBy('date'); setSortDirection('desc') }}>
                          <i className={`ri-time-line me-2 ${sortBy === 'date' ? 'text-primary' : ''}`}></i>
                          {t('claims.sortDateNewest')}
                        </DropdownItem>
                        <DropdownItem onClick={() => { setSortBy('date'); setSortDirection('asc') }}>
                          <i className={`ri-time-line me-2 ${sortBy === 'date' && sortDirection === 'asc' ? 'text-primary' : ''}`}></i>
                          {t('claims.sortDateOldest')}
                        </DropdownItem>
                        <DropdownItem onClick={() => { setSortBy('title'); setSortDirection('asc') }}>
                          <i className={`ri-sort-alpha-asc me-2 ${sortBy === 'title' ? 'text-primary' : ''}`}></i>
                          {t('claims.sortTitleAZ')}
                        </DropdownItem>
                        <DropdownItem onClick={() => { setSortBy('priority'); setSortDirection('desc') }}>
                          <i className={`ri-error-warning-line me-2 ${sortBy === 'priority' ? 'text-primary' : ''}`}></i>
                          {t('claims.sortPriorityHighLow')}
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>

                    <Dropdown isOpen={dropdownStates.filter} toggle={() => toggleDropdown('filter')}>
                      <DropdownToggle color="light" className="btn-icon">
                        <i className="ri-filter-3-line"></i>
                      </DropdownToggle>
                      <DropdownMenu right>
                        <DropdownItem header>{t('claims.filterByStatus')}</DropdownItem>
                        <DropdownItem onClick={() => setStatusFilter('all')} active={statusFilter === 'all'}>
                          {t('claims.all')}
                        </DropdownItem>
                        <DropdownItem onClick={() => setStatusFilter('pending')} active={statusFilter === 'pending'}>
                          <i className="ri-time-line me-2 text-warning"></i>
                          {t('claims.pending')}
                        </DropdownItem>
                        <DropdownItem onClick={() => setStatusFilter('resolved')} active={statusFilter === 'resolved'}>
                          <i className="ri-check-double-line me-2 text-success"></i>
                          {t('claims.resolved')}
                        </DropdownItem>
                        <DropdownItem onClick={() => setStatusFilter('rejected')} active={statusFilter === 'rejected'}>
                          <i className="ri-close-circle-line me-2 text-danger"></i>
                          {t('claims.rejected')}
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                    {user.role === 'SyndicateCoowner' && (
                      <Button
                        color="primary"
                        size="sm"
                        onClick={openAddModal}
                        disabled={!currentBuilding}
                      >
                        <i className="ri-file-list-3-line me-1"></i> {t('claims.newClaim')}
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardBody>
                  <Nav tabs className="nav-tabs-custom rounded card-header-tabs border-bottom-0 mb-4">
                    <NavItem>
                      <NavLink
                        className={activeTab === 'all' ? 'active' : ''}
                        onClick={() => setActiveTab('all')}
                        style={{ cursor: 'pointer' }}
                      >
                        <i className="ri-store-2-line me-1 align-bottom"></i> {t('claims.allClaims')}
                        <span className="badge bg-primary ms-1">{claims.length}</span>
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink
                        className={activeTab === 'pending' ? 'active' : ''}
                        onClick={() => setActiveTab('pending')}
                        style={{ cursor: 'pointer' }}
                      >
                        <i className="ri-time-line me-1 align-bottom"></i> {t('claims.pending')}
                        <span className="badge bg-warning ms-1">{pendingClaims}</span>
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink
                        className={activeTab === 'resolved' ? 'active' : ''}
                        onClick={() => setActiveTab('resolved')}
                        style={{ cursor: 'pointer' }}
                      >
                        <i className="ri-checkbox-circle-line me-1 align-bottom"></i> {t('claims.resolved')}
                        <span className="badge bg-success ms-1">{resolvedClaims}</span>
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink
                        className={activeTab === 'rejected' ? 'active' : ''}
                        onClick={() => setActiveTab('rejected')}
                        style={{ cursor: 'pointer' }}
                      >
                        <i className="ri-close-circle-line me-1 align-bottom"></i> {t('claims.rejected')}
                        <span className="badge bg-danger ms-1">{rejectedClaims}</span>
                      </NavLink>
                    </NavItem>
                  </Nav>

                  <TabContent activeTab={activeTab} className="text-muted">
                    <TabPane tabId={activeTab}>
                      {loading ? (
                        <div className="text-center py-4">
                          <Spinner color="primary" />
                          <p className="mt-2">{t('claims.loading')}</p>
                        </div>
                      ) : filteredClaims.length > 0 ? (
                        viewMode === 'grid' ? (
                          <Row>
                            {filteredClaims.map(claim => (
                              <Col lg={4} md={6} key={claim._id}>
                                <Card className="claim-card">
                                  <CardBody>
                                    <div className="d-flex align-items-center mb-3">
                                      <div className="flex-grow-1">
                                        <Badge
                                          color={getStatusColor(claim.status)}
                                          className="fs-12"
                                        >
                                          {claim.status || t('claims.pending')}
                                        </Badge>

                                        {claim.priority && (
                                          <Badge
                                            color={getPriorityColor(claim.priority)}
                                            className="ms-2 fs-12"
                                          >
                                            {claim.priority}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex-shrink-0">
                                        <Dropdown
                                          isOpen={dropdownStates[`action_${claim._id}`]}
                                          toggle={() => toggleDropdown(`action_${claim._id}`)}
                                          direction="left"
                                        >
                                          <DropdownToggle tag="button" className="btn btn-ghost-secondary btn-icon btn-sm">
                                            <i className="ri-more-fill align-middle"></i>
                                          </DropdownToggle>
                                          <DropdownMenu>
                                            <DropdownItem onClick={() => openDetailsModal(claim)}>
                                              <i className="ri-eye-fill align-middle me-2"></i>{t('claims.viewDetails')}
                                            </DropdownItem>
                                            <DropdownItem
                                              onClick={() => openEditModal(claim)}
                                              disabled={user?.role === 'SyndicateCoowner' && claim.userId?._id !== user?.id}
                                            >
                                              <i className="ri-pencil-fill align-middle me-2"></i>{t('claims.edit')}
                                            </DropdownItem>
                                            {user?.role === 'SyndicateAdmin' && claim.status !== 'Resolved' && (
                                              <DropdownItem onClick={() => openConvertToTaskModal(claim)}>
                                                <i className="ri-task-line align-middle me-2"></i>{t('claims.convertToTask')}
                                              </DropdownItem>
                                            )}
                                            <DropdownItem divider />
                                            <DropdownItem
                                              onClick={() => {
                                                setSelectedClaim(claim._id);
                                                setDeleteModal(true);
                                              }}
                                              disabled={user?.role === 'SyndicateCoowner' && claim.userId?._id !== user?.id}
                                              className="text-danger"
                                            >
                                              <i className="ri-delete-bin-6-line align-middle me-2"></i>{t('claims.delete')}
                                            </DropdownItem>
                                          </DropdownMenu>
                                        </Dropdown>
                                      </div>
                                    </div>

                                    <h5 className="card-title mb-2" onClick={() => openDetailsModal(claim)} style={{ cursor: 'pointer' }}>
                                      {claim.title || t('claims.untitled')}
                                    </h5>

                                    <p className="text-muted mb-3">{claim.description?.length > 100 ?
                                      `${claim.description.substring(0, 100)}...` :
                                      claim.description || t('claims.noDescription')}
                                    </p>

                                    <div className="d-flex align-items-center">
                                      <div className="avatar-group">
                                        <div className="avatar-xs">
                                          <div className="avatar-title rounded-circle bg-light text-primary">
                                            {claim.userId?.firstName?.charAt(0) || ''}
                                            {claim.userId?.lastName?.charAt(0) || ''}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="ms-2">
                                        {user?.role === 'SyndicateAdmin' && (
                                          <p className="text-muted mb-0">
                                            {claim.userId?.firstName} {claim.userId?.lastName}
                                          </p>
                                        )}
                                        <small className="text-muted">{getFormattedDate(claim.createdAt)}</small>
                                      </div>
                                    </div>

                                    {claim.adminNote && user?.role === 'SyndicateCoowner' && (
                                      <div className="alert alert-warning mt-3 mb-0 py-1 px-2 small">
                                        <i className="ri-information-line me-1"></i> {t('claims.hasAdminNotes')}
                                      </div>
                                    )}

                                    {claim.task && (
                                      <div className="alert alert-info mt-3 mb-0 py-1 px-2 d-flex align-items-center">
                                        <i className="ri-links-line me-1"></i>
                                        <small>{t('claims.linkedToTask')}: {claim.task.title}</small>
                                      </div>
                                    )}
                                  </CardBody>
                                </Card>
                              </Col>
                            ))}
                          </Row>
                        ) : (
                          <div className="table-responsive">
                            <table className="table align-middle position-relative table-striped">
                              <thead className="table-light">
                                <tr>
                                  <th scope="col">{t('claims.tableTitle')}</th>
                                  <th scope="col">{t('claims.tableDescription')}</th>
                                  {user?.role === 'SyndicateAdmin' && (
                                    <th scope="col">{t('claims.tableCreatedBy')}</th>
                                  )}
                                  <th scope="col">{t('claims.tableStatus')}</th>
                                  <th scope="col">{t('claims.tableDate')}</th>
                                  {user?.role === 'SyndicateAdmin' && (
                                    <th scope="col">{t('claims.tableBuilding')}</th>
                                  )}
                                  <th scope="col">{t('claims.tableActions')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredClaims.map(claim => (
                                  <tr key={claim._id}>
                                    <td>
                                      <div className="d-flex align-items-center">
                                        <div className="flex-grow-1">
                                          <h5 className="mb-0 fs-14">
                                            <Link to="#" onClick={() => openDetailsModal(claim)} className="text-reset">
                                              {claim.title || t('claims.untitled')}
                                            </Link>
                                          </h5>
                                          {claim.task && (
                                            <div>
                                              <Badge color="primary" className="fs-11 mt-1">
                                                <i className="ri-links-line me-1"></i>
                                                {claim.task.title}
                                              </Badge>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td>
                                      {claim.description || t('claims.untitled')}
                                    </td>
                                    {user?.role === 'SyndicateAdmin' && (
                                      <td>
                                        <div className="d-flex align-items-center">
                                          <div className="avatar-xs me-2">
                                            <div className="avatar-title rounded-circle bg-light text-primary">
                                              {claim.userId?.firstName?.charAt(0) || ''}
                                              {claim.userId?.lastName?.charAt(0) || ''}
                                            </div>
                                          </div>
                                          <div>
                                            <h5 className="mb-0 fs-13">{claim.userId?.firstName} {claim.userId?.lastName}</h5>
                                            <small className="text-muted">{claim.userId?.email}</small>
                                          </div>
                                        </div>
                                      </td>
                                    )}

                                    <td>
                                      <Badge color={getStatusColor(claim.status)}>
                                        {claim.status || t('claims.pending')}
                                      </Badge>
                                      {claim.adminNote && user?.role === 'SyndicateCoowner' && (
                                        <Badge color="dark" className="bg-opacity-10 text-dark ms-1">
                                          <i className="ri-information-line"></i>
                                        </Badge>
                                      )}
                                    </td>

                                    <td>{getFormattedDate(claim.createdAt)}</td>

                                    {user?.role === 'SyndicateAdmin' && (
                                      <td>{claim.building?.name || t('claims.na')}</td>
                                    )}

                                    <td>
                                      <div className="d-flex gap-2">
                                        <Button
                                          color="success"
                                          size="sm"
                                          className="btn-icon"
                                          title={t('claims.viewDetails')}
                                          onClick={() => openDetailsModal(claim)}
                                        >
                                          <i className="ri-eye-line" style={{ color: 'white' }}></i>
                                        </Button>

                                        <Button
                                          color="primary"
                                          size="sm"
                                          className="btn-icon"
                                          title={t('claims.edit')}
                                          onClick={() => openEditModal(claim)}
                                          disabled={user?.role === 'SyndicateCoowner' && claim.userId?._id !== user?.id}
                                        >
                                          <i className="ri-pencil-line"></i>
                                        </Button>

                                        {user?.role === 'SyndicateAdmin' && claim.status !== 'Resolved' && (
                                          <Button
                                            color="warning"
                                            size="sm"
                                            className="btn-icon"
                                            title={t('claims.convertToTask')}
                                            onClick={() => openConvertToTaskModal(claim)}
                                          >
                                            <i className="ri-task-line"></i>
                                          </Button>
                                        )}

                                        <Button
                                          color="danger"
                                          size="sm"
                                          className="btn-icon"
                                          title={t('claims.delete')}
                                          onClick={() => {
                                            setSelectedClaim(claim._id);
                                            setDeleteModal(true);
                                          }}
                                          disabled={user?.role === 'SyndicateCoowner' && claim.userId?._id !== user?.id}
                                        >
                                          <i className="ri-delete-bin-line"></i>
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )
                      ) : (
                        <div className="text-center py-5">
                          <div className="avatar-lg mx-auto mb-4">
                            <div className="avatar-title bg-light text-primary rounded-circle fs-24">
                              <i className="ri-file-list-3-line"></i>
                            </div>
                          </div>
                          <h5>{t('claims.noClaims')}</h5>
                          {filterText && <p className="text-muted mb-0">{t('claims.noMatches')} "{filterText}"</p>}
                          {!currentBuilding && <p className="text-muted mb-0">{t('claims.selectBuilding')}</p>}

                          {user.role === 'SyndicateCoowner' && currentBuilding && (
                            <Button color="primary" className="mt-3" onClick={openAddModal}>
                              <i className="ri-add-line align-bottom me-1"></i> {t('claims.submitFirst')}
                            </Button>
                          )}
                        </div>
                      )}
                    </TabPane>
                  </TabContent>
                </CardBody>
              </Card>
            </Col>
          </Row>
<Modal isOpen={detailsModal} toggle={() => setDetailsModal(false)} size="lg" className="claim-details-modal">
        <ModalHeader toggle={() => setDetailsModal(false)}>
          <div className="d-flex align-items-center">
            <i className="ri-file-list-3-line fs-20 me-2 text-primary"></i>
            <span className="fw-semibold fs-16">{t('claims.modalDetailsTitle')}</span>
          </div>
        </ModalHeader>
        <ModalBody className="p-4">
          {selectedClaimDetails && (
            <>
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <Badge color={getStatusColor(selectedClaimDetails.status)} className="fs-13 px-3 py-2">
                      <i className={`me-1 ri-${selectedClaimDetails.status === 'Resolved' ? 'check-double-line' :
                        selectedClaimDetails.status === 'Rejected' ? 'close-circle-line' : 'time-line'}`}></i>
                      {selectedClaimDetails.status}
                    </Badge>
                    {selectedClaimDetails.priority && (
                      <Badge color={getPriorityColor(selectedClaimDetails.priority)} className="ms-2 fs-13 px-3 py-2">
                        <i className="ri-flag-line me-1"></i>
                        {selectedClaimDetails.priority}
                      </Badge>
                    )}
                  </div>
                  <div className="text-muted fs-12">
                    <i className="ri-calendar-line me-1"></i>
                    {getFormattedDate(selectedClaimDetails.createdAt)}
                  </div>
                </div>

                <h4 className="my-3 text-primary">{selectedClaimDetails.title}</h4>

                <div className="border rounded p-3 bg-light mb-4">
                  <p className="mb-0">{selectedClaimDetails.description || t('claims.noDescription')}</p>
                </div>
              </div>

              <Row className="gy-4">
                <Col lg={6}>
                  <Card className="h-100 border shadow-none">
                    <CardBody>
                      <h5 className="card-title mb-3 fs-15">
                        <i className="ri-information-line me-1 text-muted"></i>
                        {t('claims.modalDetailsClaimInformation')}
                      </h5>

                      <div className="table-responsive">
                        <table className="table table-sm table-borderless mb-0">
                          <tbody>
                            <tr>
                              <th scope="row" className="fw-medium ps-0" style={{ width: "100px" }}>{t('claims.modalDetailsCreator')}</th>
                              <td>
                                <div className="d-flex align-items-center">
                                  <div className="avatar-xs me-2">
                                    <div className="avatar-title rounded-circle bg-light text-primary">
                                      {selectedClaimDetails.userId?.firstName?.charAt(0) || ''}
                                      {selectedClaimDetails.userId?.lastName?.charAt(0) || ''}
                                    </div>
                                  </div>
                                  <span>
                                    {selectedClaimDetails.userId?.firstName} {selectedClaimDetails.userId?.lastName}
                                  </span>
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <th scope="row" className="fw-medium ps-0">{t('claims.modalDetailsBuilding')}</th>
                              <td>{selectedClaimDetails.building?.name || t('claims.na')}</td>
                            </tr>
                            <tr>
                              <th scope="row" className="fw-medium ps-0">{t('claims.modalDetailsStatus')}</th>
                              <td>
                                <Badge color={getStatusColor(selectedClaimDetails.status)} className="fs-12">
                                  {selectedClaimDetails.status || t('claims.pending')}
                                </Badge>
                              </td>
                            </tr>
                            <tr>
                              <th scope="row" className="fw-medium ps-0">{t('claims.modalDetailsPriority')}</th>
                              <td>
                                <Badge color={getPriorityColor(selectedClaimDetails.priority)} className="fs-12">
                                  {selectedClaimDetails.priority || 'Medium'}
                                </Badge>
                              </td>
                            </tr>
                            {selectedClaimDetails.task && (
                              <tr>
                                <th scope="row" className="fw-medium ps-0">{t('claims.modalDetailsRelatedTask')}</th>
                                <td>
                                  <Badge color="info" className="fs-12">
                                    <i className="ri-links-line me-1"></i> {selectedClaimDetails.task.title}
                                  </Badge>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardBody>
                  </Card>
                </Col>

                <Col lg={6}>
                  <Card className="h-100 border shadow-none">
                    <CardBody>
                      <h5 className="card-title mb-3 fs-15">
                        <i className="ri-history-line me-1 text-muted"></i>
                        {t('claims.modalDetailsTimeline')}
                      </h5>

                      <div className="timeline-clean">
                        <div className="timeline-item pb-3">
                          <div className="timeline-icon bg-light">
                            <i className="ri-file-add-line text-success"></i>
                          </div>
                          <div className="timeline-content">
                            <h6 className="fs-14 mb-0 d-flex justify-content-between">
                              <span>{t('claims.modalDetailsClaimCreated')}</span>
                              <small className="text-muted fs-12">
                                {new Date(selectedClaimDetails.createdAt).toLocaleDateString()}
                              </small>
                            </h6>
                            <p className="text-muted mb-0 fs-12 mt-1">
                              {t('claims.modalDetailsClaimCreatedDesc')}
                            </p>
                          </div>
                        </div>

                        {selectedClaimDetails.updatedAt && selectedClaimDetails.updatedAt !== selectedClaimDetails.createdAt && (
                          <div className="timeline-item">
                            <div className="timeline-icon bg-light">
                              <i className="ri-edit-line text-warning"></i>
                            </div>
                            <div className="timeline-content">
                              <h6 className="fs-14 mb-0 d-flex justify-content-between">
                                <span>{t('claims.modalDetailsClaimUpdated')}</span>
                                <small className="text-muted fs-12">
                                  {new Date(selectedClaimDetails.updatedAt).toLocaleDateString()}
                                </small>
                              </h6>
                              <p className="text-muted mb-0 fs-12 mt-1">
                                {t('claims.modalDetailsClaimUpdatedDesc')}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                </Col>
              </Row>

              {selectedClaimDetails.adminNote && (
                <div className="mt-4">
                  <Alert color="warning" className="mb-0">
                    <div className="d-flex">
                      <i className="ri-information-line fs-18 me-2 align-self-center"></i>
                      <div>
                        <h6 className="alert-heading mb-1">{t('claims.modalDetailsAdminNote')}</h6>
                        <p className="mb-0">{selectedClaimDetails.adminNote}</p>
                      </div>
                    </div>
                  </Alert>
                </div>
              )}
            </>
          )}
        </ModalBody>
        <ModalFooter className="bg-light">
          {selectedClaimDetails && user?.role === 'SyndicateAdmin' && selectedClaimDetails.status !== 'Resolved' && (
            <Button color="warning" onClick={() => {
              setDetailsModal(false);
              openConvertToTaskModal(selectedClaimDetails);
            }}>
              <i className="ri-task-line align-bottom me-1"></i> {t('claims.convertToTask')}
            </Button>
          )}
          {selectedClaimDetails && user?.role === 'SyndicateCoowner' && selectedClaimDetails.userId?._id === user?.id && (
            <Button color="primary" onClick={() => {
              setDetailsModal(false);
              openEditModal(selectedClaimDetails);
            }}>
              <i className="ri-pencil-line align-bottom me-1"></i> {t('claims.edit')}
            </Button>
          )}
          <Button color="secondary" onClick={() => setDetailsModal(false)}>{t('claims.modalEditCancel')}</Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={editModal} toggle={() => setEditModal(false)} size="lg">
        <ModalHeader toggle={() => setEditModal(false)}>
          <div className="d-flex align-items-center">
            <i className="ri-edit-line fs-20 me-2 text-primary"></i>
            <span className="fw-semibold fs-16">
              {user?.role === 'SyndicateAdmin' ? t('claims.modalEditTitleAdmin') : t('claims.modalEditTitleCoowner')}
            </span>
          </div>
        </ModalHeader>
        <ModalBody className="p-4">
          <Form onSubmit={handleEdit}>
            {user?.role === 'SyndicateCoowner' && (
              <>
                <FormGroup>
                  <Label for="title" className="form-label">
                    <i className="ri-text me-1 text-muted"></i> {t('claims.modalEditTitleLabel')} <span className="text-danger">*</span>
                  </Label>
                  <Input
                    type="text"
                    id="title"
                    className="form-control"
                    value={editClaimData.title}
                    onChange={(e) => setEditClaimData({ ...editClaimData, title: e.target.value })}
                    required
                  />
                </FormGroup>

                <FormGroup>
                  <Label for="description" className="form-label">
                    <i className="ri-file-text-line me-1 text-muted"></i> {t('claims.modalEditDescriptionLabel')} <span className="text-danger">*</span>
                  </Label>
                  <Input
                    type="textarea"
                    id="description"
                    className="form-control"
                    rows="4"
                    value={editClaimData.description}
                    onChange={(e) => setEditClaimData({ ...editClaimData, description: e.target.value })}
                    required
                  />
                </FormGroup>

                <Row>
                  <Col md={6}>
                    <FormGroup>
                      <Label className="form-label">
                        <i className="ri-flag-line me-1 text-muted"></i> {t('claims.modalEditPriorityLabel')}
                      </Label>
                      <div className="d-flex gap-2">
                        <Button
                          color={editClaimData.priority === 'Low' ? 'info' : 'light'}
                          outline={editClaimData.priority !== 'Low'}
                          onClick={() => setEditClaimData({ ...editClaimData, priority: 'Low' })}
                          className="flex-fill"
                        >
                          {t('claims.modalConvertPriorityLow')}
                        </Button>
                        <Button
                          color={editClaimData.priority === 'Medium' ? 'warning' : 'light'}
                          outline={editClaimData.priority !== 'Medium'}
                          onClick={() => setEditClaimData({ ...editClaimData, priority: 'Medium' })}
                          className="flex-fill"
                        >
                          {t('claims.modalConvertPriorityMedium')}
                        </Button>
                        <Button
                          color={editClaimData.priority === 'High' ? 'danger' : 'light'}
                          outline={editClaimData.priority !== 'High'}
                          onClick={() => setEditClaimData({ ...editClaimData, priority: 'High' })}
                          className="flex-fill"
                        >
                          {t('claims.modalConvertPriorityHigh')}
                        </Button>
                      </div>
                    </FormGroup>
                  </Col>
                  <Col md={6}>
                    <FormGroup>
                      <Label for="task" className="form-label">
                        <i className="ri-links-line me-1 text-muted"></i> {t('claims.modalEditRelatedTaskLabel')}
                      </Label>
                      <Dropdown isOpen={dropdownStates.taskEdit} toggle={() => toggleDropdown('taskEdit')}>
                        <DropdownToggle caret color="light" block className="text-start d-flex align-items-center justify-content-between">
                          <span className="text-truncate" style={{ maxWidth: "90%" }}>
                            {editClaimData.task ? editClaimData.task.title : t('claims.modalEditNoTaskSelected')}
                          </span>
                        </DropdownToggle>
                        <DropdownMenu style={{ width: '100%', maxHeight: '200px', overflowY: 'auto' }}>
                          <DropdownItem onClick={() => setEditClaimData({ ...editClaimData, task: null })}>
                            <i className="ri-close-circle-line me-1"></i> {t('claims.modalEditNoTaskSelected')}
                          </DropdownItem>
                          <DropdownItem divider />
                          {tasksLoading ? (
                            <div className="text-center p-2">
                              <Spinner size="sm" /> {t('claims.modalEditLoadingTasks')}
                            </div>
                          ) : tasks.length === 0 ? (
                            <DropdownItem disabled>{t('claims.modalEditNoTasksAvailable')}</DropdownItem>
                          ) : (
                            tasks.map(task => (
                              <DropdownItem
                                key={task._id}
                                onClick={() => setEditClaimData({ ...editClaimData, task })}
                                active={editClaimData.task?._id === task._id}
                              >
                                {task.title}
                                <Badge color="light" pill className="ms-2 text-dark">
                                  {task.status}
                                </Badge>
                              </DropdownItem>
                            ))
                          )}
                        </DropdownMenu>
                      </Dropdown>
                    </FormGroup>
                  </Col>
                </Row>

                {editClaimData.adminNote && (
                  <Alert color="warning" className="mt-3">
                    <div className="d-flex">
                      <i className="ri-information-line fs-18 me-2 align-self-center"></i>
                      <div>
                        <h6 className="alert-heading mb-1">{t('claims.modalDetailsAdminNote')}</h6>
                        <p className="mb-0">{editClaimData.adminNote}</p>
                      </div>
                    </div>
                  </Alert>
                )}
              </>
            )}

            {user?.role === 'SyndicateAdmin' && (
              <>
                <div className="d-flex align-items-center mb-3">
                  <div className="avatar-xs me-2">
                    <div className="avatar-title rounded-circle bg-light text-primary">
                      {editClaimData?.userId?.firstName?.charAt(0) || ''}
                      {editClaimData?.userId?.lastName?.charAt(0) || ''}
                    </div>
                  </div>
                  <div>
                    <h6 className="mb-0">
                      {t('claims.tableCreatedBy')} {editClaimData?.userId?.firstName} {editClaimData?.userId?.lastName}
                    </h6>
                    <p className="text-muted mb-0 small">{editClaimData?.title}</p>
                  </div>
                </div>

                <FormGroup className="mb-4">
                  <Label for="status" className="form-label">
                    <i className="ri-checkbox-multiple-line me-1 text-muted"></i> {t('claims.tableStatus')}
                  </Label>
                  <div className="d-flex gap-2">
                    <Button
                      color={editClaimData.status === 'Pending' ? 'warning' : 'light'}
                      outline={editClaimData.status !== 'Pending'}
                      onClick={() => setEditClaimData({ ...editClaimData, status: 'Pending' })}
                      className="flex-fill"
                    >
                      <i className="ri-time-line me-1"></i> {t('claims.pending')}
                    </Button>
                    <Button
                      color={editClaimData.status === 'Resolved' ? 'success' : 'light'}
                      outline={editClaimData.status !== 'Resolved'}
                      onClick={() => setEditClaimData({ ...editClaimData, status: 'Resolved' })}
                      className="flex-fill"
                    >
                      <i className="ri-check-double-line me-1"></i> {t('claims.resolved')}
                    </Button>
                    <Button
                      color={editClaimData.status === 'Rejected' ? 'danger' : 'light'}
                      outline={editClaimData.status !== 'Rejected'}
                      onClick={() => setEditClaimData({ ...editClaimData, status: 'Rejected' })}
                      className="flex-fill"
                    >
                      <i className="ri-close-circle-line me-1"></i> {t('claims.rejected')}
                    </Button>
                  </div>
                </FormGroup>

                <Row className="mb-4">
                  <Col lg={6}>
                    <FormGroup>
                      <Label className="form-label">
                        <i className="ri-flag-line me-1 text-muted"></i> {t('claims.modalEditPriorityLabel')}
                      </Label>
                      <div className="d-flex gap-2">
                        <Button
                          color={editClaimData.priority === 'Low' ? 'info' : 'light'}
                          outline={editClaimData.priority !== 'Low'}
                          onClick={() => setEditClaimData({ ...editClaimData, priority: 'Low' })}
                          className="flex-fill"
                        >
                          {t('claims.modalConvertPriorityLow')}
                        </Button>
                        <Button
                          color={editClaimData.priority === 'Medium' ? 'warning' : 'light'}
                          outline={editClaimData.priority !== 'Medium'}
                          onClick={() => setEditClaimData({ ...editClaimData, priority: 'Medium' })}
                          className="flex-fill"
                        >
                          {t('claims.modalConvertPriorityMedium')}
                        </Button>
                        <Button
                          color={editClaimData.priority === 'High' ? 'danger' : 'light'}
                          outline={editClaimData.priority !== 'High'}
                          onClick={() => setEditClaimData({ ...editClaimData, priority: 'High' })}
                          className="flex-fill"
                        >
                          {t('claims.modalConvertPriorityHigh')}
                        </Button>
                      </div>
                    </FormGroup>
                  </Col>
                </Row>

                <Card className="border mb-4">
                  <CardBody>
                    <FormGroup className="mb-0">
                      <Label for="adminNote">
                        <i className="ri-chat-1-line me-1 text-muted"></i> {t('claims.modalEditAdminNoteLabel')}
                      </Label>
                      <Input
                        type="textarea"
                        id="adminNote"
                        rows="4"
                        placeholder={t('claims.modalEditAdminNotePlaceholder')}
                        value={editClaimData.adminNote || ''}
                        onChange={(e) => setEditClaimData({ ...editClaimData, adminNote: e.target.value })}
                      />
                      <small className="text-muted">
                        {t('claims.modalEditAdminNoteHint')}
                      </small>
                    </FormGroup>
                  </CardBody>
                </Card>

                {editClaimData.status !== 'Resolved' && (
                  <Alert color="info" className="d-flex">
                    <i className="ri-lightbulb-line fs-18 me-2 align-self-center"></i>
                    <div>
                      <p className="mb-0">{t('claims.modalEditConvertHint')}</p>
                    </div>
                  </Alert>
                )}
              </>
            )}

            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button color="light" onClick={() => setEditModal(false)}>
                {t('claims.modalEditCancel')}
              </Button>
              <Button color="primary" type="submit">
                {user?.role === 'SyndicateAdmin' ? t('claims.modalEditUpdateClaim') : t('claims.modalEditSaveChanges')}
              </Button>
            </div>
          </Form>
        </ModalBody>
      </Modal>

      <Modal isOpen={convertToTaskModal} toggle={() => setConvertToTaskModal(false)} size="lg">
        <ModalHeader toggle={() => setConvertToTaskModal(false)}>
          <div className="d-flex align-items-center">
            <i className="ri-task-line fs-20 me-2 text-primary"></i>
            <span className="fw-semibold fs-16">{t('claims.modalConvertTitle')}</span>
          </div>
        </ModalHeader>
        <ModalBody className="p-4">
          {convertingToTask ? (
            <div className="text-center py-5">
              <div className="avatar-lg mx-auto mb-4">
                <div className="avatar-title bg-light text-primary rounded-circle fs-24">
                  <Spinner size="md" />
                </div>
              </div>
              <h5>{t('claims.modalConvertConverting')}</h5>
              <p className="text-muted">{t('claims.modalConvertConvertingDesc')}</p>
            </div>
          ) : (
            <Form onSubmit={handleCreateTask}>
              <Row>
                <Col lg={8}>
                  <div className="mb-4">
                    <FormGroup>
                      <Label for="taskTitle" className="form-label">
                        <i className="ri-text me-1 text-muted"></i> {t('claims.modalConvertTaskTitleLabel')} <span className="text-danger">*</span>
                      </Label>
                      <Input
                        type="text"
                        id="taskTitle"
                        value={taskData.title}
                        onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
                        required
                        className="form-control-lg"
                      />
                    </FormGroup>

                    <FormGroup>
                      <Label for="taskDescription" className="form-label">
                        <i className="ri-file-text-line me-1 text-muted"></i> {t('claims.modalConvertTaskDescriptionLabel')} <span className="text-danger">*</span>
                      </Label>
                      <Input
                        type="textarea"
                        id="taskDescription"
                        rows="4"
                        value={taskData.description}
                        onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
                        required
                      />
                    </FormGroup>
                  </div>
                </Col>

                <Col lg={4}>
                  <Card className="border h-100">
                    <CardBody>
                      <h5 className="fs-15 mb-3">{t('claims.modalConvertTaskSettings')}</h5>

                      <FormGroup>
                        <Label className="form-label">{t('claims.modalConvertPriorityLabel')}</Label>
                        <ButtonGroup vertical className="w-100">
                          <Button
                            color={taskData.priority === 'Low' ? 'info' : 'light'}
                            outline={taskData.priority !== 'Low'}
                            onClick={() => setTaskData({ ...taskData, priority: 'Low' })}
                            className="text-start"
                          >
                            <i className="ri-flag-line me-1"></i> {t('claims.modalConvertPriorityLow')}
                          </Button>
                          <Button
                            color={taskData.priority === 'Medium' ? 'warning' : 'light'}
                            outline={taskData.priority !== 'Medium'}
                            onClick={() => setTaskData({ ...taskData, priority: 'Medium' })}
                            className="text-start"
                          >
                            <i className="ri-flag-line me-1"></i> {t('claims.modalConvertPriorityMedium')}
                          </Button>
                          <Button
                            color={taskData.priority === 'High' ? 'danger' : 'light'}
                            outline={taskData.priority !== 'High'}
                            onClick={() => setTaskData({ ...taskData, priority: 'High' })}
                            className="text-start"
                          >
                            <i className="ri-flag-line me-1"></i> {t('claims.modalConvertPriorityHigh')}
                          </Button>
                        </ButtonGroup>
                      </FormGroup>

                      <FormGroup className="mb-0">
                        <Label className="form-label">{t('claims.modalConvertBuildingLabel')}</Label>
                        <div className="form-control bg-light">
                          <span className="fw-medium">
                            {currentBuilding?.name || t('claims.modalConvertBuildingDefault')}
                          </span>
                        </div>
                      </FormGroup>
                    </CardBody>
                  </Card>
                </Col>
              </Row>

              <Alert color="warning" className="mt-3">
                <div className="d-flex">
                  <i className="ri-information-line fs-18 me-2 align-self-center"></i>
                  <div>
                    <h6 className="alert-heading mb-1">{t('claims.modalConvertInfoTitle')}</h6>
                    <p className="mb-0">{t('claims.modalConvertInfoDesc')}</p>
                  </div>
                </div>
              </Alert>

              <div className="d-flex justify-content-between align-items-center mt-4">
                <Button color="light" onClick={() => setConvertToTaskModal(false)}>
                  {t('claims.modalConvertCancel')}
                </Button>
                <Button color="primary" type="submit" className="px-4">
                  <i className="ri-task-line align-bottom me-1"></i> {t('claims.convertToTask')}
                </Button>
              </div>
            </Form>
          )}
        </ModalBody>
      </Modal>

      <Modal isOpen={addModal} centered toggle={() => {
        setAddModal(false);
        dispatch(resetTasks());
      }} size="lg" className="claims-custom-modal">
        <ModalHeader toggle={() => {
          setAddModal(false);
          dispatch(resetTasks());
        }} className="claims-modal-header">{t('claims.modalAddTitle')}</ModalHeader>
        <ModalBody className="claims-modal-body">
          <Form onSubmit={handleAdd}>
            <FormGroup className="claims-form-group">
              <Label for="title" className="claims-form-label">{t('claims.modalAddTitleLabel')} <span className="claims-required-field">*</span></Label>
              <Input
                type="text"
                id="title"
                className="claims-custom-input"
                value={newClaimData.title}
                onChange={(e) => setNewClaimData({ ...newClaimData, title: e.target.value })}
                required
              />
            </FormGroup>
            <FormGroup className="claims-form-group">
              <Label for="description" className="claims-form-label">{t('claims.modalAddDescriptionLabel')} <span className="claims-required-field">*</span></Label>
              <Input
                type="textarea"
                id="description"
                className="claims-custom-textarea"
                rows="3"
                value={newClaimData.description}
                onChange={(e) => setNewClaimData({ ...newClaimData, description: e.target.value })}
                required
              />
            </FormGroup>
            <FormGroup className="claims-form-group">
              <Label for="task" className="claims-form-label">{t('claims.modalAddRelatedTaskLabel')}</Label>
              {tasksLoading ? (
                <Spinner size="sm" color="primary" />
              ) : (
                <Dropdown isOpen={taskDropdownOpen} toggle={toggleTaskDropdown}>
                  <DropdownToggle caret color="light" block className="claims-custom-dropdown">
                    {newClaimData.taskId ?
                      tasks.find(t => t._id === newClaimData.taskId)?.title :
                      t('claims.modalAddNoTaskSelected')}
                  </DropdownToggle>
                  <DropdownMenu className="claims-dropdown-menu" style={{ width: '100%' }}>
                    <DropdownItem className="claims-dropdown-item" onClick={() => setNewClaimData({ ...newClaimData, taskId: null })}>
                      {t('claims.modalAddNoTaskSelected')}
                    </DropdownItem>
                    {tasks.map(task => (
                      <DropdownItem
                        key={task._id}
                        className="claims-dropdown-item"
                        onClick={() => setNewClaimData({ ...newClaimData, taskId: task._id })}
                      >
                        {task.title} ({task.status})
                      </DropdownItem>
                    ))}
                  </DropdownMenu>
                </Dropdown>
              )}
            </FormGroup>
            <ModalFooter className="claims-modal-footer">
              <Button color="primary" type="submit" className="claims-submit-btn">{t('claims.modalAddSubmit')}</Button>
              <Button outline color="warning" onClick={() => {
                setAddModal(false);
                dispatch(resetTasks());
              }} className="claims-cancel-btn">{t('claims.modalAddCancel')}</Button>
            </ModalFooter>
          </Form>
        </ModalBody>
      </Modal>
      <style jsx>{`
  .btn-icon {
    opacity: 1 !important;
    visibility: visible !important;
    width: 32px;
    height: 32px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  
  .claim-card {
    transition: all 0.2s;
  }
  
  .claim-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.08);
  }
  
  .progress-container {
    max-width: 100%;
  }
  
  @media (max-width: 576px) {
    .progress-container {
      padding-top: 15px;
    }
  }
  
  /* Modal Fixes */
  .modal-header, .modal-footer {
    padding: 1rem;
  }
  
  /* Timeline Styling */
  .timeline-clean {
    position: relative;
    padding-left: 0;
    margin-left: 20px;
  }
  
  .timeline-clean .timeline-item {
    position: relative;
    padding-left: 30px;
    padding-bottom: 15px;
    border-left: 2px solid #e9ecef;
  }
  
  .timeline-clean .timeline-item:last-child {
    padding-bottom: 0;
  }
  
  .timeline-clean .timeline-icon {
    position: absolute;
    left: -12px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 12px;
  }
  
  .timeline-clean .timeline-content {
    padding-left: 15px;
  }

  /* Form improvements */
  .form-label {
    font-weight: 500;
    color: #495057;
  }
`}</style>
          {/* Delete Modal */}
          <DeleteModal
            show={deleteModal}
            onCloseClick={() => setDeleteModal(false)}
            onDeleteClick={handleDelete}
          />

          {/* Success Modal */}
          <SuccessModal
            isOpen={successModal}
            toggle={() => setSuccessModal(false)}
            message={successMessage}
            messageLowerCase={successMessage.toLowerCase()}
          />
        </Container>
      </div>
    </React.Fragment>
  );
};

export default withTranslation()(ClaimsList);