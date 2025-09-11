import React, { useState, useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  Input,
  Row,
  Badge,
  UncontrolledDropdown,
  Spinner,
  FormGroup,
  InputGroup,
  InputGroupText,
  Label,
  Modal,    // Added this
  ModalHeader,  // Added this
  ModalBody,    // Added this 
  ModalFooter   // Added this
} from 'reactstrap';
import DeleteModal from "../../../Components/Common/DeleteModal";
import { toast } from 'react-toastify';
import { useSelector, useDispatch } from 'react-redux';
import { deleteUser, toggleUserStatus } from '../../../slices/users/userSlice';
import AddMemberModal from './Addmembermodal';
import StatusModal from '../../../Components/Users/statusmodal';
import DropImage from '../../../Components/Common/displayDropdown';
import { fetchCoOwners, getAllCoowners, removeCoownerFromBuilding, resetCoOwners, SetCurrentBuilding } from '../../../slices/buildings/building';
import { FaBuilding, FaHome, FaLayerGroup, FaUsers, FaSearch, FaFilter, FaUserPlus, FaAward, FaUserCircle, FaCreditCard, FaKey, FaIdCard, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCalendarAlt } from 'react-icons/fa';
import coownerImage from '../../../assets/images/Tenants.png'; // Import a co-owner/tenant image
import PropertyNavigation from '../../../Components/Buildings/tabnavigarion';
import UserProfileModal from './coOwnerProfileModal';
import api from '../../../services/api';
import BreadCrumb from '../../../Components/Common/BreadCrumb';
import { withTranslation } from "react-i18next";

const Coowners = ({ t }) => {
  document.title = `${t('team.pageTitle')} | Nestleo`;
  const dispatch = useDispatch();
  const user = useSelector(state => state.Loginn?.user || {});
  // Get state from Redux with proper fallbacks

  const { buildings = [] } = useSelector(state => state.Building?.buildings || {});
  const coOwners = useSelector(state => state.Building?.coOwners || []);
  const currentBuilding = useSelector(state => state.Building?.currentBuilding || null);
  const loading = useSelector(state => state.Building?.loading);
  const error = useSelector(state => state.Building?.error);
  const [paymentStatuses, setPaymentStatuses] = useState({});

  // Local state
  const [coownersList, setCoownersList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState('');
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedCoowner, setSelectedCoowner] = useState(null);
  const [modal, setModal] = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userStatus, setUserStatus] = useState(false);
  const [viewType, setViewType] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('name'); // 'name', 'apartments', 'status'

  // Dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);


  const [pendingRequests, setPendingRequests] = useState([]);
  const [accessRequestModal, setAccessRequestModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [processingRequest, setProcessingRequest] = useState(false);
  // Add this state variable at the top with your other state declarations
  const [pendingRequestsModalOpen, setPendingRequestsModalOpen] = useState(false);

  // Replace the renderPendingRequests function with this:
  const renderPendingRequestsButton = () => {
    // Only show the button for SyndicateAdmin when a building is selected
    if (user.role !== "SyndicateAdmin" || !currentBuilding) {
      return null;
    }

    return (
      <div className="mb-4 text-end">
        <Button
          color="warning"
          className="d-flex align-items-center ms-auto"
          onClick={() => setPendingRequestsModalOpen(true)}
        >
          <i className="ri-user-received-line me-2"></i>
          {t('team.pendingRequests')}
          {pendingRequests.length > 0 && (
            <Badge color="light" pill className="ms-2">
              {pendingRequests.length}
            </Badge>
          )}
        </Button>
      </div>
    );
  };

  // Replace your renderPendingRequestsModal function with this one
  const renderPendingRequestsModal = () => {
    return (
      <Modal
        isOpen={pendingRequestsModalOpen}
        toggle={() => setPendingRequestsModalOpen(!pendingRequestsModalOpen)}
        size="lg"
      >
        <ModalHeader toggle={() => setPendingRequestsModalOpen(false)}>
          <i className="ri-user-received-line me-2"></i>
          {t('team.pendingRequests')}
          {pendingRequests.length > 0 && (
            <Badge color="warning" pill className="ms-2">
              {pendingRequests.length}
            </Badge>
          )}
        </ModalHeader>
        <ModalBody>
          {pendingRequests.length === 0 ? (
            <div className="text-center p-4">
              <div className="avatar-lg mx-auto mb-4">
                <div className="avatar-title rounded-circle bg-light text-primary">
                  <i className="ri-check-double-line fs-1"></i>
                </div>
              </div>
              <h5>{t('team.noPendingRequests')}</h5>
              <p className="text-muted">{t('team.allRequestsProcessed')}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-nowrap mb-0">
                <thead className="table-light">
                  <tr>
                    <th scope="col">{t('team.name')}</th>
                    <th scope="col">{t('team.email')}</th>
                    <th scope="col">{t('team.dateRequested')}</th>
                    <th scope="col" className="text-end">{t('team.actionss')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map(request => (
                    <tr key={request._id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="avatar-sm me-3">
                            {request.coOwner?.avatar ? (
                              <img
                                src={request.coOwner.avatar}
                                alt={`${request.coOwner.firstName} ${request.coOwner.lastName}`}
                                className="img-fluid rounded-circle"
                              />
                            ) : (
                              <div className="avatar-title rounded-circle bg-primary text-white">
                                {request.coOwner?.firstName?.charAt(0)}{request.coOwner?.lastName?.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div>
                            <h6 className="mb-0">{request.coOwner?.firstName} {request.coOwner?.lastName}</h6>
                            <small className="text-muted">{t('team.requestedOn')} {new Date(request.createdAt).toLocaleDateString()}</small>
                          </div>
                        </div>
                      </td>
                      <td>{request.coOwner?.email}</td>
                      <td>{new Date(request.createdAt).toLocaleDateString()}</td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end">
                          <Button
                            color="success"
                            size="sm"
                            className="me-2"
                            onClick={() => handleDirectAccessRequest(request._id, true)}
                            disabled={processingRequest}
                          >
                            {processingRequest === request._id + '-approve' && (
                              <span className="spinner-border spinner-border-sm me-1"></span>
                            )}
                            <i className="ri-check-line me-1"></i>
                            {t('team.approve')}
                          </Button>
                          <Button
                            color="danger"
                            size="sm"
                            onClick={() => handleDirectAccessRequest(request._id, false)}
                            disabled={processingRequest}
                          >
                            {processingRequest === request._id + '-reject' && (
                              <span className="spinner-border spinner-border-sm me-1"></span>
                            )}
                            <i className="ri-close-line me-1"></i>
                            {t('team.reject')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setPendingRequestsModalOpen(false)}>
            {t('team.close')}
          </Button>
        </ModalFooter>
      </Modal>
    );
  };
  const fetchPendingRequests = async () => {
    if (!currentBuilding?._id) {
      console.log('No current building selected');
      return;
    }

    try {
      console.log('Calling API to fetch associations for building:', currentBuilding._id);
      const response = await api.get(`/api/Building/${currentBuilding._id}/associations`);
      console.log('API response:', response.data);

      // Only show associations that are inactive AND were never approved before
      const requests = response.data.filter(assoc => !assoc.isActive && !assoc.wasEverApproved);
      console.log('Filtered pending requests:', requests);

      setPendingRequests(requests);
    } catch (error) {
      console.error('Error fetching pending access requests:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      toast.error(t('team.errorFetchingRequests') || 'Error fetching requests');
    }
  };


  // Replace the current useEffect blocks with this single simplified useEffect
  useEffect(() => {
    if (currentBuilding?._id) {
      dispatch(fetchCoOwners(currentBuilding._id));
      fetchPendingRequests(); // Call the function to fetch pending requests
    } else {
      dispatch(getAllCoowners());
    }
  }, [currentBuilding, dispatch]);



  // Call fetchPendingRequests on component mount and when building changes
  useEffect(() => {
    // Only run this if user is SyndicateAdmin
    if (user.role === "SyndicateAdmin" && currentBuilding?._id) {
      console.log('Fetching pending requests for building:', currentBuilding._id);
      fetchPendingRequests();
    }
  }, [currentBuilding?._id, user.role]);



  // Fonction pour ouvrir la modal de demande d'accès
  const openAccessRequestModal = (request) => {
    setSelectedRequest(request);
    setAccessRequestModal(true);
  };

  // Update the handleAccessRequest function
  const handleAccessRequest = async (approved) => {
    if (!selectedRequest) return;

    setProcessingRequest(true);

    try {
      const response = await api.post(`/api/Building/associations/${selectedRequest._id}/handle-request`, {
        approved
      });

      // Refresh data
      fetchPendingRequests();


      if (currentBuilding?._id) {
        dispatch(fetchCoOwners(currentBuilding._id));
      }

      toast.success(approved
        ? t('team.requestApproved') || 'Request approved successfully'
        : t('team.requestRejected') || 'Request rejected');

      setAccessRequestModal(false);
    } finally {
      setProcessingRequest(false);
    }
  };
  // Fonction pour activer/désactiver l'accès d'un copropriétaire
  const toggleCoOwnerAccess = async (associationId, currentStatus) => {
    try {
      const response = await api.patch(`/api/Building/associations/${associationId}/toggle-access`);

      // Actualiser les données
      if (currentBuilding?._id) {
        dispatch(fetchCoOwners(currentBuilding._id));
        fetchPendingRequests();
      }

      toast.success(currentStatus
        ? t('team.accessDeactivated')
        : t('team.accessActivated'));

      return response.data;
    } catch (error) {
      console.error('Error toggling access:', error);
      toast.error(t('team.errorTogglingAccess'));
    }
  };
  const fetchPaymentStatus = async (coownerId) => {
    try {
      const response = await api.get(`/api/invoices/${coownerId}/payment-status`);
      if (response.data && response.data.success) {
        console.log(`Payment status for ${coownerId}:`, response.data.data);
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error(`Error fetching payment status for user ${coownerId}:`, error);
      return null;
    }
  };
  // Ajouter une section pour afficher les demandes d'accès en attente
  const renderPendingRequests = () => {
    if (!pendingRequests || pendingRequests.length === 0) {
      return null;
    }

    return (
      <Card className="mb-4">
        <CardBody>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="card-title">
              <i className="ri-user-received-line me-2"></i>
              {t('team.pendingRequests')}
            </h4>
            <Badge color="warning" pill>
              {pendingRequests.length}
            </Badge>
          </div>

          <div className="table-responsive">
            <table className="table table-hover table-nowrap mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col">{t('team.name')}</th>
                  <th scope="col">{t('team.email')}</th>
                  <th scope="col">{t('team.dateRequested')}</th>
                  <th scope="col" className="text-end">{t('team.actionss')}</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map(request => (
                  <tr key={request._id}>
                    <td>
                      {request.coOwner?.firstName} {request.coOwner?.lastName}
                    </td>
                    <td>{request.coOwner?.email}</td>
                    <td>{new Date(request.createdAt).toLocaleDateString()}</td>
                    <td className="text-end">
                      <Button
                        color="primary"
                        size="sm"
                        className="me-2"
                        onClick={() => openAccessRequestModal(request)}
                      >
                        {t('team.reviewRequest')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    );
  };

  useEffect(() => {
    const getPaymentStatuses = async () => {
      if (!coownersList.length) return;

      const statusMap = {};

      for (const coowner of coownersList) {
        const status = await fetchPaymentStatus(coowner._id);
        if (status) {
          statusMap[coowner._id] = status;
        }
      }

      setPaymentStatuses(statusMap);
    };

    getPaymentStatuses();
  }, [coownersList]);

  // Update the displayed list when coOwners or filters change
  // Update the displayed list when coOwners or filters change
  useEffect(() => {
    const safeCoOwners = Array.isArray(coOwners) ? coOwners : [];

    const loadAssociationStatusesAsync = async () => {
      let filtered = [...safeCoOwners];

      // If we have a current building, get the association status for each co-owner
      if (currentBuilding?._id) {
        try {
          // Fetch all associations for the current building
          const associationsResponse = await api.get(`/api/Building/${currentBuilding._id}/associations`);
          const associations = associationsResponse.data || [];
          console.log('Fetched associations for filtering:', associations);

          // Map the association data to each co-owner
          filtered = filtered.map(coowner => {
            // Find the association for this co-owner
            const association = associations.find(assoc =>
              assoc.coOwner && assoc.coOwner._id === coowner._id
            );

            return {
              ...coowner,
              // Add association data to the co-owner object
              associationId: association?._id,
              associationActive: association ? association.isActive : false,
              hasAssociation: !!association
            };
          });
        } catch (error) {
          console.error('Error fetching associations for status display:', error);
        }
      }

      // Apply search filter
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        filtered = filtered.filter(coowner =>
          coowner.firstName?.toLowerCase().includes(query) ||
          coowner.lastName?.toLowerCase().includes(query) ||
          coowner.email?.toLowerCase().includes(query)
        );
      }

      // Apply sorting
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
          case 'apartments':
            return (b.apartments?.length || 0) - (a.apartments?.length || 0);
          case 'status':
            // Sort by association active status instead of user active status
            return a.associationActive === b.associationActive ? 0 : a.associationActive ? -1 : 1;
          default:
            return 0;
        }
      });

      setCoownersList(filtered);
    };

    loadAssociationStatusesAsync();
  }, [coOwners, selectedBuildingFilter, searchTerm, sortBy, currentBuilding]);

  // Handle building filter change
  const handleBuildingFilterChange = (buildingId) => {
    // Clear search when changing buildings
    setSearchTerm('');

    if (buildingId) {
      // If a building is selected, set it as current
      const building = buildings.find(b => b._id === buildingId);
      dispatch(SetCurrentBuilding(building));
    } else {
      // If "All Buildings" is selected, clear current building
      dispatch(SetCurrentBuilding(null));
    }
  };

  // In the Coowners component, add these states:
  const [profileModal, setProfileModal] = useState(false);
  const [selectedCoownerId, setSelectedCoownerId] = useState(null);

  // Function to open the profile modal
  const openProfileModal = (coownerId) => {
    setSelectedCoownerId(coownerId);
    setProfileModal(true);
  };

  // Handle co-owner deletion
  const handleDeleteCoowner = () => {
    if (selectedCoowner && currentBuilding) {
      dispatch(removeCoownerFromBuilding({
        buildingId: currentBuilding._id,
        userId: selectedCoowner._id
      }))
        .unwrap()
        .then(() => {
          if (selectedBuildingFilter) {
            dispatch(fetchCoOwners(selectedBuildingFilter));
          }
          toast.success(t('team.messages.coOwnerRemovedSuccess'));
        })
        .catch((error) => {
          toast.error(t('team.messages.coOwnerRemoveFailed') + ": " + error.message);
        });
      setDeleteModal(false);
    }
  };

  // Modifier la fonction existante handleStatusToggle pour utiliser la nouvelle fonction
  const handleStatusToggle = async (coowner) => {
    // Trouver l'association correspondant à ce copropriétaire
    try {
      const associationsResponse = await api.get(`/api/Building/${currentBuilding._id}/associations`);
      const association = associationsResponse.data.find(
        assoc => assoc.coOwner?._id === coowner._id
      );

      if (association) {
        // Utiliser la nouvelle fonction avec l'ID de l'association
        await toggleCoOwnerAccess(association._id, association.isActive);
      } else {
        toast.error(t('team.coownerAssociationNotFound'));
      }
    } catch (error) {
      console.error('Error finding coowner association:', error);
      toast.error(t('team.errorFindingAssociation'));
    }
  };
  // Update your handleStatusChange function
  const handleStatusChange = (userId) => {
    if (userId) {
      dispatch(toggleUserStatus(userId))
        .unwrap()
        .then(() => {
          toast.success(t('team.messages.userStatusChanged', {
            action: userStatus ? t('team.status.deactivated') : t('team.status.activated')
          }));
          // Re-fetch user list to show updated status
          if (currentBuilding?._id) {
            dispatch(fetchCoOwners(currentBuilding._id));
          }
        })
        .catch((error) => {
          toast.error(t('team.messages.userStatusChangeFailed') + ": " + (error.message || t('team.messages.unknownError')));
        });
    } else {
      toast.error(t('team.messages.invalidUserId'));
    }
    setStatusModal(false);
  };
  // Ajouter cette modal pour gérer les demandes d'accès
  const renderAccessRequestModal = () => {
    if (!selectedRequest) return null;

    return (
      <Modal
        isOpen={accessRequestModal}
        toggle={() => setAccessRequestModal(!accessRequestModal)}
        centered
      >
        <ModalHeader toggle={() => setAccessRequestModal(!accessRequestModal)}>
          {t('team.reviewAccessRequest')}
        </ModalHeader>
        <ModalBody>
          <div className="text-center mb-4">
            <div className="avatar-lg mx-auto mb-3">
              {selectedRequest.coOwner?.avatar ? (
                <img
                  src={selectedRequest.coOwner.avatar}
                  alt={`${selectedRequest.coOwner.firstName} ${selectedRequest.coOwner.lastName}`}
                  className="img-thumbnail rounded-circle"
                />
              ) : (
                <div className="avatar-title rounded-circle bg-primary">
                  {selectedRequest.coOwner?.firstName?.charAt(0)}{selectedRequest.coOwner?.lastName?.charAt(0)}
                </div>
              )}
            </div>
            <h5>{selectedRequest.coOwner?.firstName} {selectedRequest.coOwner?.lastName}</h5>
            <p className="text-muted">{selectedRequest.coOwner?.email}</p>
          </div>

          <div className="border-top border-bottom py-3 mb-3">
            <Row>
              <Col xs="6">
                <div className="text-muted mb-1">{t('team.requestDate')}</div>
                <h6>{new Date(selectedRequest.createdAt).toLocaleDateString()}</h6>
              </Col>
              <Col xs="6">
                <div className="text-muted mb-1">{t('team.building')}</div>
                <h6>{selectedRequest.building?.name}</h6>
              </Col>
            </Row>
          </div>

          <p className="text-center">{t('team.reviewRequestText')}</p>
        </ModalBody>
        <ModalFooter>
          <Button
            color="danger"
            onClick={() => handleAccessRequest(false)}
            disabled={processingRequest}
          >
            {processingRequest ? <span className="spinner-border spinner-border-sm me-1" /> : null}
            {t('team.reject')}
          </Button>
          <Button
            color="success"
            onClick={() => handleAccessRequest(true)}
            disabled={processingRequest}
          >
            {processingRequest ? <span className="spinner-border spinner-border-sm me-1" /> : null}
            {t('team.approve')}
          </Button>
        </ModalFooter>
      </Modal>
    );
  };
  // Refetch co-owners after adding a new member
  const handleAddMemberSuccess = () => {
    // Fetch the updated list after adding a new co-owner
    if (selectedBuildingFilter) {
      dispatch(fetchCoOwners(selectedBuildingFilter));
    }
  };
  // Add this function to handle direct approval/rejection from the modal
  const handleDirectAccessRequest = async (requestId, approved) => {
    // Set specific loading state for this request
    setProcessingRequest(requestId + (approved ? '-approve' : '-reject'));

    try {
      const response = await api.post(`/api/Building/associations/${requestId}/handle-request`, {
        approved
      });

      // Refresh data
      fetchPendingRequests();

      if (currentBuilding?._id) {
        dispatch(fetchCoOwners(currentBuilding._id));
      }

      toast.success(approved
        ? t('team.requestApproved') || 'Request approved successfully'
        : t('team.requestRejected') || 'Request rejected');

    } catch (error) {
      console.error('Error handling access request:', error);
      toast.error(t('team.errorHandlingRequest') || 'Error processing request');
    } finally {
      setProcessingRequest(false);
    }
  };
  // Calculate stats for co-owners
  const coOwnerStats = {
    total: coownersList.length,
    active: coownersList.filter(co => co.isActive).length,
    paid: coownersList.filter(co => co.paymentStatus).length,
    withApartments: coownersList.filter(co => co.apartments?.length > 0).length
  };

  return (
    <React.Fragment>

      <UserProfileModal
        isOpen={profileModal}
        toggle={() => setProfileModal(!profileModal)}
        userId={selectedCoownerId}
        t={t}
      />
      <DeleteModal
        show={deleteModal}
        onDeleteClick={handleDeleteCoowner}
        onCloseClick={() => setDeleteModal(false)}
      />
      <AddMemberModal
        isOpen={modal}
        toggle={() => setModal(!modal)}
        buildingId={currentBuilding?._id}
        onSuccess={handleAddMemberSuccess}
        t={t}
      />
      <StatusModal
        show={statusModal}
        onCloseClick={() => setStatusModal(false)}
        onConfirmClick={handleStatusChange} // Pass the function reference
        user={selectedUser}
        isActive={userStatus}
      />
      <div className="page-content" style={{ marginTop: "71px" }}>
        <Container fluid>
          <BreadCrumb title={t('team.breadcrumb.buildings')} pageTitle={t('team.breadcrumb.coOwners')} />
          <PropertyNavigation isLoading={loading} />
          <Outlet />


          {/* Welcome Card with Statistics Badges */}
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
                        <h4 className="fw-semibold mb-2">{t('teamWelcome.title')}</h4>
                        <p className="text-muted mb-3">{t('teamWelcome.description')}</p>
                        {/* Statistics Badges */}
                        <div className="d-flex flex-wrap gap-2">
                          <Badge color="primary" pill className="fs-12 py-2 px-3">
                            <FaUsers className="me-1" /> {t('teamWelcome.stats.totalCoOwners')}: {coOwnerStats.total || 0}
                          </Badge>
                          <Badge color="success" pill className="fs-12 py-2 px-3">
                            <FaUserCircle className="me-1" /> {t('teamWelcome.stats.activeMembers')}: {coOwnerStats.active || 0}
                          </Badge>
                          <Badge color="danger" pill className="fs-12 py-2 px-3">
                            <FaCreditCard className="me-1" /> {t('teamWelcome.stats.paidMembers')}: {coOwnerStats.paid || 0}
                          </Badge>
                          <Badge color="purple" pill className="fs-12 py-2 px-3" style={{ background: '#f3eafe', color: '#6f42c1' }}>
                            <FaHome className="me-1" /> {t('teamWelcome.stats.withApartments')}: {coOwnerStats.withApartments || 0}
                          </Badge>
                        </div>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="text-end d-flex justify-content-end gap-2">
                        {/* Pending Requests Button - Only show for SyndicateAdmin with current building */}
                        {user.role === "SyndicateAdmin" && currentBuilding && (
                          <Button
                            color="warning"
                            className="d-flex align-items-center"
                            onClick={() => setPendingRequestsModalOpen(true)}
                            title={t('team.pendingRequestsTitle')}
                          >
                            <i className="ri-user-received-line me-1"></i>
                            {pendingRequests.length > 0 && (
                              <Badge color="primary" pill className="ms-1 me-1">
                                {pendingRequests.length}
                              </Badge>
                            )}
                            {t('team.pendingRequests')}
                          </Button>
                        )}

                        {/* Original Add Member Button */}
                        <Button
                          color="primary"
                          onClick={() => setModal(true)}
                          disabled={!currentBuilding}
                          title={!currentBuilding ? t('teamWelcome.actions.selectBuildingFirst') : t('team.actions.addNewCoOwner')}
                        >
                          <i className="ri-add-line align-bottom me-1"></i> {t('teamWelcome.actions.addMember')}
                        </Button>
                      </div>
                    </Col>
                  </Row>
                </CardBody>
              </Card>
            </Col>
          </Row>
          {/* End Welcome Card */}

          {/* Filter Card */}
          <Card className="coowner-filters-card shadow-sm mb-4">
            <CardBody>
              <Row className="g-3 align-items-end">

                {/* Search Co-owners */}
                <Col sm={12} md={4}>
                  <FormGroup>
                    <Label className="form-label">{t('team.filters.searchCoOwners')}</Label>
                    <InputGroup>
                      <InputGroupText>
                        <FaSearch />
                      </InputGroupText>
                      <Input
                        type="text"
                        placeholder={t('team.filters.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      {searchTerm && (
                        <Button
                          color="link"
                          className="p-0 px-2"
                          onClick={() => setSearchTerm("")}
                          title={t('team.filters.clearSearch')}
                          style={{
                            position: 'absolute',
                            right: '0',
                            top: '0',
                            height: '100%',
                            zIndex: 10
                          }}
                        >
                          <i className="ri-close-line"></i>
                        </Button>
                      )}
                    </InputGroup>
                  </FormGroup>
                </Col>

                {/* Filter by Building */}
                <Col sm={6} md={3}>
                  <FormGroup>
                    <Label className="form-label">{t('team.filters.filterByBuilding')}</Label>
                    <Dropdown
                      isOpen={dropdownOpen}
                      toggle={toggleDropdown}
                      className="w-100"
                    >
                      <DropdownToggle
                        caret
                        color="light"
                        className="w-100 text-start"
                      >
                        <FaBuilding className="me-2" />
                        {selectedBuildingFilter
                          ? buildings.find(b => b._id === selectedBuildingFilter)?.name || t('team.filters.filterByBuilding')
                          : "select a building"}
                      </DropdownToggle>
                      <DropdownMenu className="w-100">

                        <DropdownItem divider />
                        {buildings.map(building => (
                          <DropdownItem
                            key={building._id}
                            onClick={() => handleBuildingFilterChange(building._id)}
                          >
                            {building.name}
                          </DropdownItem>
                        ))}
                      </DropdownMenu>
                    </Dropdown>
                  </FormGroup>
                </Col>

                {/* Sort By */}
                <Col sm={6} md={3}>
                  <FormGroup>
                    <Label className="form-label">{t('team.filters.sortBy')}</Label>
                    <Input
                      type="select"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="name">{t('team.filters.sortOptions.nameAZ')}</option>
                      <option value="apartments">{t('team.filters.sortOptions.mostApartments')}</option>
                      <option value="status">{t('team.filters.sortOptions.statusActiveFirst')}</option>
                    </Input>
                  </FormGroup>
                </Col>

                {/* View Type + Add Button */}
                <Col sm={12} md={2}>
                  <FormGroup>
                    <Label className="form-label invisible">{t('team.filters.actions')}</Label>
                    <div className="d-flex gap-2">
                      <button
                        className={`coowner-view-btn ${viewType === 'grid' ? 'active' : ''}`}
                        onClick={() => setViewType('grid')}
                        title={t('team.viewTypes.gridView')}
                      >
                        <i className="ri-grid-fill"></i>
                      </button>
                      <button
                        className={`coowner-view-btn ${viewType === 'list' ? 'active' : ''}`}
                        onClick={() => setViewType('list')}
                        title={t('team.viewTypes.listView')}
                      >
                        <i className="ri-list-check"></i>
                      </button>
                      <Button
                        color="primary"
                        className="coowner-add-btn"
                        onClick={() => setModal(true)}
                        disabled={!currentBuilding}
                        title={!currentBuilding ? t('team.actions.selectBuildingFirst') : t('team.actions.addNewCoOwner')}
                      >
                        <FaUserPlus className="me-2" />
                        {t('team.actions.add')}
                      </Button>
                    </div>
                  </FormGroup>
                </Col>

              </Row>
            </CardBody>
          </Card>

          {/* Co-owners List */}
          <Card className="coowner-list-card">
            <CardHeader className="coowner-list-header">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="coowner-list-title">
                  {currentBuilding ?
                    t('team.list.coOwnersInBuilding', { buildingName: currentBuilding.name }) :
                    t('team.list.allCoOwners')
                  }
                  <Badge color="info" pill className="ms-2">{coownersList.length}</Badge>
                </h5>
                <div className="coowner-list-actions">
                  {selectedBuildingFilter && (
                    <Button color="light" size="sm" onClick={() => handleBuildingFilterChange('')}>
                      <i className="ri-filter-off-line me-1"></i>
                      {t('team.actions.clearFilter')}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardBody className="coowner-list-body">
              {loading ? (
                <div className="coowner-loader">
                  <Spinner color="primary" />
                  <p>{t('team.loading.coOwners')}</p>
                </div>
              ) : coownersList.length === 0 ? (
                <div className="coowner-empty-state">
                  <div className="coowner-empty-icon">
                    <FaUsers />
                  </div>
                  <h5>{t('team.emptyState.noCoOwnersFound')}</h5>
                  <p>
                    {searchTerm ? (
                      <>
                        {t('team.emptyState.noMatchingCoOwners')}
                        <Button
                          color="link"
                          onClick={() => setSearchTerm('')}
                          className="p-0 ms-1"
                        >
                          {t('team.actions.clearSearch')}
                        </Button>
                      </>
                    ) : selectedBuildingFilter ? (
                      <>
                        {t('team.emptyState.noCoOwnersInBuilding')}
                        {currentBuilding && (
                          <div className="mt-2">
                            <Button
                              color="primary"
                              size="sm"
                              onClick={() => setModal(true)}
                            >
                              <FaUserPlus className="me-1" /> {t('team.actions.addFirstCoOwner')}
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      t('team.emptyState.noCoOwnersAvailable')
                    )}
                  </p>
                </div>
              ) : viewType === 'grid' ? (
                <div className="coowner-grid" style={{ marginBottom: '50px' }}>
                  <Row className="g-4">
                    {coownersList.map((coowner, index) => (
                      <Col lg={4} md={6} key={coowner._id || index}>
                        <div className="coowner-card">
                          <div className="coowner-card-header">
                            <div className="coowner-status">
                              {coowner.hasAssociation ? (
                                coowner.associationActive ? (
                                  <Badge color="success" pill className="status-badge">
                                    <i className="ri-checkbox-circle-line me-1"></i> {t('team.status.active')}
                                  </Badge>
                                ) : (
                                  <Badge color="danger" pill className="status-badge">
                                    <i className="ri-close-circle-line me-1"></i> {t('team.status.inactive')}
                                  </Badge>
                                )
                              ) : (
                                <Badge color="warning" pill className="status-badge">
                                  <i className="ri-question-line me-1"></i> {t('team.status.noAssociation')}
                                </Badge>
                              )}
                              {coowner.paymentStatus || (paymentStatuses[coowner._id]?.fullyPaid) ? (
                                <Badge color="success" pill className="payment-badge">
                                  <i className="ri-shield-check-line me-1"></i> {t('team.paymentStatus.paid')}
                                </Badge>
                              ) : paymentStatuses[coowner._id]?.overdueInvoices > 0 ? (
                                <Badge color="danger" pill className="payment-badge">
                                  <i className="ri-error-warning-line me-1"></i> {t('team.paymentStatus.overdue')}
                                </Badge>
                              ) : paymentStatuses[coowner._id]?.unpaidInvoices > 0 ? (
                                <Badge color="warning" pill className="payment-badge">
                                  <i className="ri-time-line me-1"></i> {t('team.paymentStatus.pending')}
                                </Badge>
                              ) : (
                                <Badge color="info" pill className="payment-badge">
                                  <i className="ri-information-line me-1"></i> {t('team.paymentStatus.noInvoices')}
                                </Badge>
                              )}
                            </div>
                            <div className="coowner-actions">
                              <UncontrolledDropdown>
                                <DropdownToggle tag="button" className="btn btn-ghost-secondary btn-icon btn-sm">
                                  <i className="ri-more-2-fill"></i>
                                </DropdownToggle>
                                <DropdownMenu end>
                                  <DropdownItem onClick={() => handleStatusToggle(coowner)}>
                                    <i className={`ri-${coowner.associationActive ? 'user-unfollow' : 'user-follow'}-line me-2`}></i>
                                    {coowner.associationActive ? t('team.actions.deactivate') : t('team.actions.activate')}
                                  </DropdownItem>
                                  {currentBuilding && (
                                    <DropdownItem divider />
                                  )}
                                  {currentBuilding && (
                                    <DropdownItem onClick={() => {
                                      setSelectedCoowner(coowner);
                                      setDeleteModal(true);
                                    }} className="text-danger">
                                      <i className="ri-delete-bin-line me-2"></i>
                                      {t('team.actions.removeFromBuilding')}
                                    </DropdownItem>
                                  )}
                                </DropdownMenu>
                              </UncontrolledDropdown>
                            </div>
                          </div>

                          <div className="coowner-card-body">
                            <div className="coowner-avatar">
                              {coowner.avatar ? (
                                <DropImage userId={coowner} className="coowner-img" alt={`${coowner.firstName} ${coowner.lastName}`} />
                              ) : (
                                <div className="coowner-initials">
                                  {coowner.firstName?.charAt(0) || ''}{coowner.lastName?.charAt(0) || ''}
                                </div>
                              )}
                            </div>
                            <div className="coowner-info">
                              <h4 className="coowner-name">
                                {coowner.firstName} {coowner.lastName}
                              </h4>
                              <p className="coowner-role">{coowner.role || t('team.defaultRole')}</p>

                              <div className="coowner-contact">
                                {coowner.email && (
                                  <div className="coowner-contact-item">
                                    <FaEnvelope className="coowner-contact-icon" />
                                    <span>{coowner.email}</span>
                                  </div>
                                )}
                                {coowner.phone && (
                                  <div className="coowner-contact-item">
                                    <FaPhone className="coowner-contact-icon" />
                                    <span>{coowner.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="coowner-card-footer">
                            <div className="coowner-apartments">
                              <h6 className="apartments-title">
                                <FaHome className="me-1" />
                                {t('team.apartments.associated')}
                              </h6>
                              {coowner.apartments?.length > 0 ? (
                                <div className="apartments-list">
                                  {coowner.apartments
                                    .filter(apartment => !currentBuilding || apartment?.building?._id === currentBuilding?._id)
                                    .map((apartment, i) => (
                                      apartment && apartment._id && (
                                        <Badge color="light" key={apartment._id} className="apartment-badge">
                                          <FaKey className="me-1" />
                                          {apartment.building?.name ? `${apartment.building.name} - ` : ''}
                                          #{apartment.number} ({t('team.apartments.floor', { floor: apartment.floor })})
                                        </Badge>
                                      )
                                    ))
                                  }
                                  {currentBuilding &&
                                    coowner.apartments?.filter(apartment => apartment?.building?._id === currentBuilding?._id).length === 0 && (
                                      <p className="no-apartments">{t('team.apartments.noneInBuilding')}</p>
                                    )
                                  }
                                </div>
                              ) : (
                                <p className="no-apartments">{t('team.apartments.noneAssigned')}</p>
                              )}
                            </div>
                            <span title={!currentBuilding ? t('team.actions.selectBuildingFirst') : ""}>
                              <button
                                onClick={() => openProfileModal(coowner._id)}
                                disabled={!currentBuilding}
                                className="btn btn-primary btn-sm view-profile-btn"
                              >
                                <i className="ri-user-3-line me-1"></i>
                                {t('team.actions.viewFullProfile')}
                              </button>
                            </span>
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </div>
              ) : (
                <div className="coowner-table-container" style={{ marginBottom: '50px' }}>
                  <table className="coowner-table">
                    <thead>
                      <tr>
                        <th className="coowner-col-profile">{t('team.table.coOwner')}</th>
                        <th className="coowner-col-contact">{t('team.table.contactInformation')}</th>
                        <th className="coowner-col-apartments">{t('team.table.apartments')}</th>
                        <th className="coowner-col-status">{t('team.table.status')}</th>
                        <th className="coowner-col-actions">{t('team.table.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coownersList.map((coowner, index) => (
                        <tr key={coowner._id || index} className="coowner-table-row">
                          <td className="coowner-col-profile">
                            <div className="coowner-list-profile">
                              {coowner.avatar ? (
                                <DropImage userId={coowner} className="coowner-list-img" alt={`${coowner.firstName} ${coowner.lastName}`} />
                              ) : (
                                <div className="coowner-list-initials">
                                  {coowner.firstName?.charAt(0) || ''}{coowner.lastName?.charAt(0) || ''}
                                </div>
                              )}
                              <div className="coowner-list-info">
                                <h6 className="coowner-list-name">
                                  {coowner.firstName} {coowner.lastName}
                                </h6>
                                <span className="coowner-list-role">{coowner.role || t('team.defaultRole')}</span>
                              </div>
                            </div>
                          </td>
                          <td className="coowner-col-contact">
                            <div className="coowner-list-contact">
                              {coowner.email && (
                                <div className="coowner-list-contact-item">
                                  <FaEnvelope className="coowner-list-contact-icon" />
                                  <span>{coowner.email}</span>
                                </div>
                              )}
                              {coowner.phone && (
                                <div className="coowner-list-contact-item">
                                  <FaPhone className="coowner-list-contact-icon" />
                                  <span>{coowner.phone}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="coowner-col-apartments">
                            {coowner.apartments?.length > 0 ? (
                              <div className="coowner-list-apartments">
                                {coowner.apartments
                                  .filter(apartment => !currentBuilding || apartment?.building?._id === currentBuilding?._id)
                                  .slice(0, 2)
                                  .map((apartment, i) => (
                                    apartment && apartment._id && (
                                      <Badge color="light" key={apartment._id} className="apartment-badge-list">
                                        <FaKey className="me-1" />
                                        {apartment.building?.name ? `${apartment.building.name.substring(0, 10)}... - ` : ''}
                                        #{apartment.number}
                                      </Badge>
                                    )
                                  ))
                                }
                                {coowner.apartments.length > 2 && (
                                  <Badge color="info" pill className="apartment-count">
                                    {t('team.apartments.moreCount', { count: coowner.apartments.length - 2 })}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="coowner-list-no-apartments">{t('team.apartments.none')}</span>
                            )}
                          </td>
                          <td className="coowner-col-status">
                            <div className="coowner-list-status">
                              {coowner.hasAssociation ? (
                                coowner.associationActive ? (
                                  <Badge color="success" pill className="status-badge-list">
                                    <i className="ri-checkbox-circle-line me-1"></i> {t('team.status.active')}
                                  </Badge>
                                ) : (
                                  <Badge color="danger" pill className="status-badge-list">
                                    <i className="ri-close-circle-line me-1"></i> {t('team.status.inactive')}
                                  </Badge>
                                )
                              ) : (
                                <Badge color="warning" pill className="status-badge-list">
                                  <i className="ri-question-line me-1"></i> {t('team.status.noAssociation')}
                                </Badge>
                              )}
                              <div className="mt-2">
                                {coowner.paymentStatus ? (
                                  <Badge color="success" pill className="payment-badge-list">
                                    <i className="ri-shield-check-line me-1"></i> {t('team.paymentStatus.paid')}
                                  </Badge>
                                ) : (
                                  <Badge color="warning" pill className="payment-badge-list">
                                    <i className="ri-time-line me-1"></i> {t('team.paymentStatus.pending')}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="coowner-col-actions">
                            <div className="coowner-list-actions">
                              {/* <Link
                                to={`/pages-profile/${coowner._id}`}
                                className="btn btn-sm btn-soft-primary coowner-action-btn"
                                title={t('team.actions.viewProfile')}
                              >
                                <i className="ri-eye-line"></i>
                              </Link> */}
                              <button
                                className="btn btn-sm btn-soft-info coowner-action-btn"
                                onClick={() => handleStatusToggle(coowner)}
                                title={coowner.isActive ? t('team.actions.deactivate') : t('team.actions.activate')}
                              >
                                <i className={`ri-${coowner.isActive ? 'user-unfollow' : 'user-follow'}-line`}></i>
                              </button>
                              {currentBuilding && (
                                <button
                                  className="btn btn-sm btn-soft-danger coowner-action-btn"
                                  onClick={() => {
                                    setSelectedCoowner(coowner);
                                    setDeleteModal(true);
                                  }}
                                  title={t('team.actions.removeFromBuilding')}
                                >
                                  <i className="ri-delete-bin-line"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
          {renderPendingRequestsModal()}
          {/* CSS for Co-owners styling */}
          <style jsx>{`
            /* Co-owners Styling - matching Calendar & Invoice style */
            .page-content {
              margin-top: 5px;
              padding: 15px;
              font-family: 'Poppins', sans-serif;
              font-size: 0.9rem;
            }

            /* Header Section */
            .coowners-header {
              background-color: #fff;
              border-radius: 12px;
              padding: 5px;
              box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
              margin-bottom: 25px;
              position: relative;
              overflow: hidden;
            }

            .coowners-header-content {
              display: flex;
              justify-content: space-between;
              align-items: center;
            }

            .coowners-text-content {
              flex: 1;
            }

            .coowners-header-image {
              max-width: 180px;
              margin-left: 20px;
            }

            .coowners-header-img {
              max-width: 100%;
              height: auto;
            }

            .coowners-main-title {
              font-size: 2rem;
              font-weight: 800;
              color: #607D8B;
              margin-bottom: 5px;
              font-family: 'Montserrat', sans-serif;
              letter-spacing: 0.8px;
            }

            .coowners-secondary-title {
              font-size: 2.4rem;
              font-weight: 800;
              margin-top: -10px;
              color: #03A9F4;
              font-family: 'Montserrat', sans-serif;
              letter-spacing: 1.2px;
            }

            .coowners-tag-container {
              margin-bottom: 14px;
            }

            .coowners-tag {
              background-color: #607D8B;
              color: white;
              padding: 5px 14px;
              border-radius: 25px;
              font-weight: 600;
              font-size: 0.85rem;
              display: inline-block;
            }

            .coowners-subtitle {
              font-weight: 500;
              color: #607D8B;
              font-size: 1.1rem;
              margin-top: 10px;
            }

            /* Stats Cards */
            .coowner-stat-card {
              background-color: #fff;
              border-radius: 12px;
              padding: 18px;
              display: flex;
              align-items: center;
              box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
              min-height: 130px;
              position: relative;
              overflow: hidden;
              transition: transform 0.3s ease, box-shadow 0.3s ease;
            }

            .coowner-stat-card:hover {
              transform: translateY(-3px);
              box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
            }

            .coowner-stat-icon {
              background-color: rgba(3, 169, 244, 0.1);
              height: 45px;
              width: 45px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-right: 18px;
              font-size: 20px;
              color: #03A9F4;
            }

            .coowner-stat-icon.active-icon {
              background-color: rgba(76, 175, 80, 0.1);
              color: #4CAF50;
            }

            .coowner-stat-icon.apartment-icon {
              background-color: rgba(255, 152, 0, 0.1);
              color: #FF9800;
            }

            .coowner-stat-icon.payment-icon {
              background-color: rgba(156, 39, 176, 0.1);
              color: #9C27B0;
            }

            .coowner-stat-content {
              flex: 1;
            }

            .coowner-stat-content h4 {
              color: #607D8B;
              margin-bottom: 5px;
              font-weight: 600;
              font-size: 0.95rem;
            }

            .coowner-stat-content p {
              color: #757575;
              margin-bottom: 0;
              font-size: 0.8rem;
            }

            .coowner-stat-number {
              font-size: 1.8rem;
              font-weight: 700;
              color: #607D8B;
            }

            /* Filter styles */
            .coowner-filters-card {
              border: none;
              border-radius: 12px;
              box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
            }

            .coowner-filter-label {
              font-size: 0.8rem;
              color: #607D8B;
              font-weight: 500;
            }

            .coowner-filter-select {
              width: 100%;
              border-radius: 8px;
              border: 1px solid #e0e0e0;
              padding: 8px 12px;
              font-size: 0.85rem;
              color: #333;
              transition: all 0.2s ease;
            }

            .coowner-filter-select:focus {
              border-color: #03A9F4;
              box-shadow: 0 0 0 3px rgba(3, 169, 244, 0.1);
              outline: none;
            }

            .coowner-search {
              position: relative;
              width: 100%;
            }

            .coowner-search .search-icon {
              position: absolute;
              left: 12px;
              top: 50%;
              transform: translateY(-50%);
              color: #aaa;
            }

            .coowner-search-input {
              width: 100%;
              border-radius: 8px;
              border: 1px solid #e0e0e0;
              padding: 8px 12px 8px 35px;
              font-size: 0.85rem;
              transition: all 0.2s ease;
            }

            .coowner-search-input:focus {
              border-color: #03A9F4;
              box-shadow: 0 0 0 3px rgba(3, 169, 244, 0.1);
              outline: none;
            }

            .coowner-search-clear {
              position: absolute;
              right: 8px;
              top: 50%;
              transform: translateY(-50%);
              background: none;
              border: none;
              color: #aaa;
              padding: 5px;
              font-size: 16px;
              cursor: pointer;
              transition: all 0.2s ease;
            }

            .coowner-search-clear:hover {
              color: #607D8B;
            }

            .coowner-view-btn {
              border: 1px solid #e0e0e0;
              background: white;
              color: #607D8B;
              width: 38px;
              height: 38px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1rem;
              cursor: pointer;
              transition: all 0.2s ease;
            }

            .coowner-view-btn:hover {
              background: #f5f5f5;
            }

            .coowner-view-btn.active {
              background: #03A9F4;
              color: white;
              border-color: #03A9F4;
            }

            .coowner-add-btn {
              border-radius: 8px;
              font-weight: 600;
              height: 38px;
              display: flex;
              align-items: center;
            }

            /* Co-owner List Card */
            .coowner-list-card {
              border: none;
              border-radius: 12px;
              box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
              overflow: hidden;
            }

            .coowner-list-header {
              background-color: #f8f9fa;
              border-bottom: 1px solid #eee;
              padding: 16px 20px;
            }

            .coowner-list-title {
              font-size: 1.1rem;
              font-weight: 600;
              color: #607D8B;
              margin: 0;
              display: flex;
              align-items: center;
            }

            .coowner-list-body {
              padding: 0;
            }

            /* Grid View */
            .coowner-grid {
              padding: 20px;
            }

            .coowner-card {
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
              transition: transform 0.3s ease, box-shadow 0.3s ease;
              height: 100%;
              display: flex;
              flex-direction: column;
            }

            .coowner-card:hover {
              transform: translateY(-5px);
              box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
            }

            .coowner-card-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 12px 15px;
              border-bottom: 1px solid #f5f5f5;
            }

            .coowner-status {
              display: flex;
              gap: 6px;
            }

            .status-badge {
              font-size: 0.75rem;
              font-weight: 600;
            }

            .payment-badge {
              font-size: 0.75rem;
              font-weight: 600;
            }

            .coowner-card-body {
              padding: 20px 15px;
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
            }

            .coowner-avatar {
              width: 90px;
              height: 90px;
              border-radius: 50%;
              margin-bottom: 15px;
              overflow: hidden;
              box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
            }

            .coowner-img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }

            .coowner-initials {
              width: 100%;
              height: 100%;
              background-color: #03A9F4;
              color: white;
              font-size: 2rem;
              font-weight: 700;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .coowner-info {
              width: 100%;
            }

            .coowner-name {
              font-size: 1.15rem;
              font-weight: 700;
              color: #263238;
              margin-bottom: 3px;
            }

            .coowner-role {
              color: #607D8B;
              font-size: 0.9rem;
              margin-bottom: 12px;
            }

            .coowner-contact {
              display: flex;
              flex-direction: column;
              gap: 8px;
              margin-top: 15px;
            }

            .coowner-contact-item {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 0.85rem;
              color: #607D8B;
            }

            .coowner-contact-icon {
              color: #03A9F4;
              font-size: 0.9rem;
            }

            .coowner-card-footer {
              padding: 15px;
              border-top: 1px solid #f5f5f5;
              margin-top: auto;
            }

            .coowner-apartments {
              margin-bottom: 15px;
            }

            .apartments-title {
              font-size: 0.95rem;
              color: #607D8B;
              margin-bottom: 10px;
              font-weight: 600;
            }

            .apartments-list {
              display: flex;
              flex-wrap: wrap;
              gap: 6px;
              margin-bottom: 10px;
            }

            .apartment-badge {
              background: #e3f2fd;
              color: #0277bd;
              border: none;
              font-size: 0.8rem;
              font-weight: 500;
              padding: 5px 10px;
            }

            .no-apartments {
              font-size: 0.85rem;
              color: #9e9e9e;
              font-style: italic;
              margin-top: 5px;
            }

            .view-profile-btn {
              width: 100%;
              border-radius: 8px;
            }

            /* List View */
            .coowner-table-container {
              width: 100%;
              overflow-x: auto;
            }

            .coowner-table {
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
            }

            .coowner-table th {
              background-color: #f8f9fa;
              color: #607D8B;
              font-weight: 600;
              font-size: 0.85rem;
              text-transform: uppercase;
              padding: 15px 20px;
              border-bottom: 1px solid #eee;
              text-align: left;
            }

            .coowner-table td {
              padding: 15px 20px;
              border-bottom: 1px solid #f5f5f5;
              vertical-align: middle;
            }

            .coowner-table-row {
              transition: background-color 0.2s;
            }

            .coowner-table-row:hover {
              background-color: #f8f9fa;
            }

            .coowner-col-profile {
              width: 20%;
            }

            .coowner-col-contact {
              width: 25%;
            }

            .coowner-col-apartments {
              width: 25%;
            }

            .coowner-col-status {
              width: 15%;
            }

            .coowner-col-actions {
              width: 15%;
            }

            .coowner-list-profile {
              display: flex;
              align-items: center;
              gap: 12px;
            }

            .coowner-list-img {
              width: 45px;
              height: 45px;
              border-radius: 50%;
              object-fit: cover;
            }

            .coowner-list-initials {
              width: 45px;
              height: 45px;
              border-radius: 50%;
              background-color: #03A9F4;
              color: white;
              font-size: 1.1rem;
              font-weight: 700;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .coowner-list-info {
              display: flex;
              flex-direction: column;
            }

            .coowner-list-name {
              font-size: 0.95rem;
              font-weight: 600;
              color: #263238;
              margin-bottom: 3px;
            }

            .coowner-list-role {
              color: #607D8B;
              font-size: 0.8rem;
            }

            .coowner-list-contact {
              display: flex;
              flex-direction: column;
              gap: 6px;
            }

            .coowner-list-contact-item {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 0.85rem;
              color: #607D8B;
            }

            .coowner-list-contact-icon {
              color: #03A9F4;
              font-size: 0.9rem;
            }

            .coowner-list-apartments {
              display: flex;
              flex-wrap: wrap;
              gap: 6px;
            }

            .apartment-badge-list {
              background: #e3f2fd;
              color: #0277bd;
              border: none;
              font-size: 0.8rem;
              font-weight: 500;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 150px;
            }

            .apartment-count {
              font-size: 0.75rem;
              font-weight: 500;
            }

            .coowner-list-no-apartments {
              font-size: 0.85rem;
              color: #9e9e9e;
              font-style: italic;
            }

            .coowner-list-status {
              display: flex;
              flex-direction: column;
            }

            .status-badge-list, .payment-badge-list {
              font-size: 0.75rem;
              font-weight: 600;
              padding: 5px 10px;
              width: fit-content;
            }

            .coowner-list-actions {
              display: flex;
              gap: 5px;
            }

            .coowner-action-btn {
              width: 30px;
              height: 30px;
              padding: 0;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            /* Empty State */
            .coowner-empty-state {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 60px 0;
              color: #9e9e9e;
            }

            .coowner-empty-icon {
              font-size: 3rem;
              color: #03A9F4;
              margin-bottom: 15px;
              opacity: 0.7;
            }

            .coowner-empty-state h5 {
              font-weight: 600;
              color: #607D8B;
              margin-bottom: 10px;
            }

            .coowner-empty-state p {
              text-align: center;
              max-width: 400px;
            }

            /* Loader & Error */
            .coowner-loader {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 60px 0;
              color: #607D8B;
            }

            .coowner-loader p {
              margin-top: 15px;
            }

            .coowner-error {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 60px 0;
              color: #f44336;
            }

            .error-icon {
              font-size: 3rem;
              margin-bottom: 15px;
            }

            /* Responsive adjustments */
            @media (max-width: 991px) {
              .coowners-header-content {
                flex-direction: column;
              }

              .coowners-header-image {
                margin-left: 0;
                margin-top: 20px;
              }
            }

            @media (max-width: 767px) {
              .coowners-main-title {
                font-size: 1.6rem;
              }
              
              .coowners-secondary-title {
                font-size: 1.8rem;
              }
              
              .coowner-stat-card {
                margin-bottom: 15px;
              }

              .coowner-col-contact, .coowner-col-apartments {
                display: none;
              }
            }
          `}</style>
          {renderAccessRequestModal()}

        </Container>
      </div>
    </React.Fragment>
  );
};

export default withTranslation()(Coowners);