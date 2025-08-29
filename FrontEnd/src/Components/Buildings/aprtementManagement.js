import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { assignCoOwnerToApartment, createApartment, deleteApartment, fetchallApartments, fetchallApartmentsPerBuilding, fetchCoOwners, removeCoOwnerFromApartment, SetCurrentBuilding, updateApartment } from '../../slices/buildings/building';
import {
  Button,
  Card,
  CardBody,
  Container,
  Row,
  Col,
  Badge,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Label,
  Input,
  InputGroup,
  InputGroupText,
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  Pagination,
  PaginationItem,
  PaginationLink,
  Alert
} from 'reactstrap';
import {
  FaHome, FaPlus, FaSearch, FaEdit, FaTrash, FaBuilding, FaLayerGroup,
  FaUsers, FaUserMinus, FaUserPlus, FaBed, FaRulerVertical
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import DeleteModal from '../Common/DeleteModal';
import { Outlet } from 'react-router-dom';
import { getAllCoowners } from '../../slices/users/userSlice';
import apartmentImage from "../../assets/images/hero-pngg.png"; // Add this image to your assets
import PropertyNavigation from './tabnavigarion';
import { current } from '@reduxjs/toolkit';
import { isInTrialPeriod, extractFeatureValue } from '../Subscriptions/SubcriptionValidator';
import { withTranslation } from "react-i18next";

const BuildingApartments = ({ t }) => {
  const dispatch = useDispatch();
  const { apartments = [], loading, error } = useSelector(state => state.Building);
  const { buildings = [] } = useSelector(state => state.Building.buildings || {});
  const currentBuilding = useSelector(state => state.Building.currentBuilding);
  const { user } = useSelector((state) => state.Loginn || {});

  // State for UI controls
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState(null);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [buildingDropdownOpen, setBuildingDropdownOpen] = useState(false);
  const toggleBuildingDropdown = () => setBuildingDropdownOpen(!buildingDropdownOpen);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState(currentBuilding?._id || '');

  // Co-owner modal state
  const [coOwnerModal, setCoOwnerModal] = useState(false);
  const [availableCoOwners, setAvailableCoOwners] = useState([]);
  const [selectedCoOwner, setSelectedCoOwner] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    number: '',
    floor: '',
    bedrooms: '',
    bloc: '',
    building: currentBuilding?._id || ''
  });

  // Calculate stats
  const totalApartmentsCount = (apartments || []).length;
  const assignedApartments = (apartments || []).filter(apt => apt && apt.coOwner).length;
  const averageFloor = (apartments || []).length > 0
    ? ((apartments || []).reduce((sum, apt) => sum + (parseInt(apt?.floor) || 0), 0) / (apartments || []).length).toFixed(1)
    : 0;

  // Fetch apartments based on filter
  useEffect(() => {
    if (selectedBuildingFilter) {
      dispatch(fetchallApartmentsPerBuilding(selectedBuildingFilter));
    } else {
      dispatch(fetchallApartments());
    }
  }, [selectedBuildingFilter, dispatch]);

  // Update building filter when currentBuilding changes
  useEffect(() => {
    if (currentBuilding) {
      setSelectedBuildingFilter(currentBuilding._id);
      setFormData(prev => ({ ...prev, building: currentBuilding._id }));
    } else {
      setSelectedBuildingFilter('');
    }
  }, [currentBuilding]);

  // Reset to first page when search term, items per page, or building filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage, selectedBuildingFilter]);

  // Filter apartments based on search term (client-side filtering)
  const filteredApartments = (apartments || []).filter(apartment => {
    if (!apartment) return false;

    return (apartment.number?.toString() || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (apartment.floor?.toString() || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (apartment.bedrooms?.toString() || '').toLowerCase().includes(searchTerm.toLowerCase());
  });
  const [coOwnerSearchTerm, setCoOwnerSearchTerm] = useState('');
  // Add this function to filter co-owners
  const filteredCoOwners = useMemo(() => {
    if (!coOwnerSearchTerm.trim()) return availableCoOwners;

    return availableCoOwners.filter(user => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const email = user.email.toLowerCase();
      const search = coOwnerSearchTerm.toLowerCase();

      return fullName.includes(search) || email.includes(search);
    });
  }, [availableCoOwners, coOwnerSearchTerm]);
  // Pagination logic
  const totalPages = Math.ceil(filteredApartments.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentApartments = filteredApartments.slice(indexOfFirstItem, indexOfLastItem);

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  // Handle building filter change
  const handleBuildingFilterChange = (buildingId) => {
    setSelectedBuildingFilter(buildingId);
    if (buildingId) {
      const building = buildings.find(b => b._id === buildingId);
      dispatch(SetCurrentBuilding(building));
    } else {
      dispatch(SetCurrentBuilding(null));
    }
  };

  const fetchAvailableCoOwners = async () => {
    try {
      const response = await dispatch(fetchCoOwners(currentBuilding._id)).unwrap();
      setAvailableCoOwners(response);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to fetch co-owners');
    }
  };

  const checkApartmentLimit = () => {
    console.log('Checking apartment limit for building:', currentBuilding);

    // If user is in trial period, allow unlimited apartments
    if (isInTrialPeriod(user)) {
      console.log('User is in trial period - unlimited apartments allowed');
      return true;
    }

    if (!user?.subscription?.planId?.features) {
      console.log('No subscription features found');
      return true; // Allow if no subscription info
    }

    // Use centralized validator to get apartment limit
    const maxApartments = extractFeatureValue(user.subscription.planId.features, "Appartements par immeuble");

    console.log('Max apartments allowed per building:', maxApartments);

    // If unlimited or no limit found, allow
    if (maxApartments === -1 || maxApartments === null) {
      return true;
    }

    // If no building is selected, we can't check the apartment count
    if (!currentBuilding) {
      return false;
    }

    // Count apartments in the current building
    const currentApartmentCount = apartments.filter(
      apt => apt.building?._id === currentBuilding._id
    ).length;

    console.log('Current apartment count for building:', currentApartmentCount);

    return currentApartmentCount < maxApartments;
  };

  const getApartmentLimitDisplay = () => {
    // If user is in trial period, show unlimited
    if (isInTrialPeriod(user)) {
      return "Unlimited";
    }

    if (!user?.subscription?.planId?.features) {
      return "Unlimited";
    }

    const maxApartments = extractFeatureValue(user.subscription.planId.features, "Appartements par immeuble");
    return maxApartments === -1 ? "Unlimited" : maxApartments;
  };

  // Add this function to check if approaching the limit
  const isApproachingApartmentLimit = () => {
    // If user is in trial period, never approaching limit
    if (isInTrialPeriod(user)) {
      return false;
    }

    // Only check if we can still create apartments
    if (!canAddApartment) return false;

    if (!user?.subscription?.planId?.features) {
      return false;
    }

    const maxApartments = extractFeatureValue(user.subscription.planId.features, "Appartements par immeuble");

    // If unlimited, never approaching limit
    if (maxApartments === -1 || maxApartments === null) {
      return false;
    }

    if (!currentBuilding) {
      return false;
    }

    // Count apartments in the current building
    const currentApartmentCount = apartments.filter(
      apt => apt.building?._id === currentBuilding._id
    ).length;

    // Consider approaching limit if using 80% or more of the limit
    return currentApartmentCount >= (maxApartments * 0.8);
  };

  // Add these near the beginning of your component, after loading state
  const canAddApartment = checkApartmentLimit();
  const apartmentLimit = getApartmentLimitDisplay();
  const currentApartmentCount = currentBuilding ? apartments.filter(
    apt => apt.building?._id === currentBuilding._id
  ).length : 0;
  const approachingLimit = isApproachingApartmentLimit();

  const handleAssignCoOwner = async () => {
    if (!selectedApartment?._id || !selectedCoOwner) {
      toast.error('Missing apartment or co-owner information');
      return;
    }

    try {
      await dispatch(assignCoOwnerToApartment({
        apartmentId: selectedApartment._id,
        coOwnerId: selectedCoOwner
      })).unwrap();
      setCoOwnerModal(false);
      setSelectedCoOwner(null);

      // Refresh apartments
      if (selectedBuildingFilter) {
        dispatch(fetchallApartmentsPerBuilding(selectedBuildingFilter));
      } else {
        dispatch(fetchallApartments());
      }
    } catch (error) {
      toast.error(error.response?.data?.error || t('apartmentWelcome.modal.assignError'));
    }
  };

  const handleRemoveCoOwner = async (apartmentId) => {
    if (!apartmentId) {
      toast.error(t('apartmentWelcome.modal.removeError'));
      return;
    }

    try {
      await dispatch(removeCoOwnerFromApartment(apartmentId)).unwrap();
      toast.success(t('apartmentWelcome.modal.removeSuccess'));
      window.location.reload();
      // Refresh apartments
      if (selectedBuildingFilter) {
        dispatch(fetchallApartmentsPerBuilding(selectedBuildingFilter));
      } else {
        dispatch(fetchallApartments());
      }
    } catch (error) {
      toast.error(error.response?.data?.error || t('apartmentWelcome.modal.removeError'));
    }
  };

  // Add this function to validate apartment fields
  const validateApartmentFields = (data) => {
    const errors = {};

    if (!data.number) {
      errors.number = t('createBuildingModal.apartmentNumberRequired');
    } else if (!/^(0|[1-9]\d*)$/.test(data.number)) {
      errors.number = t('createBuildingModal.numericOnly');
    }

    if (data.floor === '') {
      errors.floor = t('createBuildingModal.floorRequired');
    } else if (!/^-?(0|[1-9]\d*)$/.test(data.floor)) {
      errors.floor = t('createBuildingModal.numericOnly');
    }

    if (!data.bloc) {
      errors.bloc = t('apartmentWelcome.modal.blocRequired');
    }
    if (!data.bedrooms) {
      errors.bedrooms = t('apartmentWelcome.modal.bedroomsRequired');
    }
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };

  // Update handleCreate with validation
  const handleCreate = async () => {
    const validation = validateApartmentFields(formData);

    if (!validation.isValid) {
      Object.values(validation.errors).forEach(error => toast.error(error));
      return;
    }

    if (!formData.building) {
      toast.error(t('apartmentWelcome.modal.required'));
      return;
    }

    try {
      await dispatch(createApartment(formData)).unwrap();
      toast.success(t('apartmentWelcome.modal.createSuccess'));
      setOpenCreateModal(false);
      // Reset form data completely
      setFormData({
        number: '',
        floor: '',
        bloc: '',
        bedrooms: '',
        building: currentBuilding?._id || ''
      });

      // Refresh the apartments list
      if (selectedBuildingFilter) {
        dispatch(fetchallApartmentsPerBuilding(selectedBuildingFilter));
      } else {
        dispatch(fetchallApartments());
      }
    } catch (err) {
      toast.error(err.message || t('apartmentWelcome.modal.createError'));
    }
  };

  // Update handleEdit with validation
  const handleEdit = async () => {
    const validation = validateApartmentFields(formData);

    if (!validation.isValid) {
      Object.values(validation.errors).forEach(error => toast.error(error));
      return;
    }

    if (!formData._id) {
      toast.error(t('apartmentWelcome.modal.updateError'));
      return;
    }

    // Ensure building is a string ID
    let buildingId = formData.building;
    if (typeof buildingId === 'object' && buildingId._id) {
      buildingId = buildingId._id;
    }

    // Clean up the form data to ensure proper format
    const apartmentData = {
      ...formData,
      bloc: formData.bloc || null,  // Convert empty string to null
      building: buildingId,
      bedrooms: formData.bedrooms || '',
      // Format other fields as needed
    };

    try {
      await dispatch(updateApartment({
        id: formData._id,
        apartmentData
      })).unwrap();

      toast.success(t('apartmentWelcome.modal.updateSuccess'));
      setOpenEditModal(false);

      // Reset form completely
      setFormData({
        number: '',
        floor: '',
        bloc: '',
        bedrooms: '',
        building: currentBuilding?._id || ''
      });

      // Refresh the list
      if (selectedBuildingFilter) {
        dispatch(fetchallApartmentsPerBuilding(selectedBuildingFilter));
      } else {
        dispatch(fetchallApartments());
      }
    } catch (err) {
      console.error('Update error:', err);
      toast.error(err?.error || t('apartmentWelcome.modal.updateError'));
    }
  };

  // Add these functions to handle modal opening and closing
  const openCreateApartmentModal = () => {
    // Reset form before opening
    setFormData({
      number: '',
      floor: '',
      bloc: '',
      bedrooms: '',
      building: currentBuilding?._id || ''
    });
    setOpenCreateModal(true);
  };

  const openEditApartmentModal = (apartment) => {
    // Set form data with apartment details
    setFormData({
      _id: apartment._id,
      number: apartment.number || '',
      floor: apartment.floor || '',
      bedrooms: apartment.bedrooms || '',
      bloc: apartment.bloc?._id || '',
      building: apartment.building?._id || currentBuilding?._id || ''
    });
    setOpenEditModal(true);
  };


  // Handle delete apartment
  const handleDelete = async () => {
    if (selectedApartment) {
      try {
        await dispatch(deleteApartment(selectedApartment._id)).unwrap();
        toast.success(t('apartmentWelcome.modal.deleteSuccess'));
        setDeleteModal(false);

        // Refresh the apartments list
        if (selectedBuildingFilter) {
          dispatch(fetchallApartmentsPerBuilding(selectedBuildingFilter));
        } else {
          dispatch(fetchallApartments());
        }
      } catch (err) {
        toast.error(err.message || t('apartmentWelcome.modal.deleteError'));
      }
    }
  };

  if (loading) return (
    <div className="page-content">
      <Container fluid>
        <PropertyNavigation isLoading={loading} />
        <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "400px" }}>
          <div className="spinner-border avatar-lg text-primary" role="status"></div>
        </div>
      </Container>
    </div>
  );

  if (error) return (
    <div className="page-content">
      <Container fluid>
        <PropertyNavigation isLoading={loading} />
        <Alert color="danger" className="my-4">
          <div className="d-flex">
            <i className="ri-error-warning-line display-5 me-3"></i>
            <div>
              <h4 className="alert-heading">Error loading apartments!</h4>
              <p className="mb-2">{error.message || 'An error occurred'}</p>
              <Button color="danger" onClick={() => {
                if (selectedBuildingFilter) {
                  dispatch(fetchallApartmentsPerBuilding(selectedBuildingFilter));
                } else {
                  dispatch(fetchallApartments());
                }
              }}>
                <i className="ri-refresh-line me-1"></i> Retry
              </Button>
            </div>
          </div>
        </Alert>
      </Container>
    </div>
  );

  return (
    <div style={{ marginTop: "71px" }}>

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
                    <h4 className="fw-semibold mb-2">{t('apartmentWelcome.title')}</h4>
                    <p className="text-muted mb-3">{t('apartmentWelcome.description')}</p>
                    {/* Statistics Badges */}
                    <div className="d-flex flex-wrap gap-2">
                      <Badge color="primary" pill className="fs-12 py-2 px-3">
                        <FaHome className="me-1" /> {t('apartmentWelcome.stats.totalApartments')}: {totalApartmentsCount || 0}
                      </Badge>
                      <Badge color="success" pill className="fs-12 py-2 px-3">
                        <FaUsers className="me-1" /> {t('apartmentWelcome.stats.assigned')}: {assignedApartments || 0}
                      </Badge>
                      <Badge color="danger" pill className="fs-12 py-2 px-3">
                        <FaRulerVertical className="me-1" /> {t('apartmentWelcome.stats.avgFloor')}: {averageFloor || 0}
                      </Badge>
                      <Badge color="purple" pill className="fs-12 py-2 px-3" style={{ background: '#f3eafe', color: '#6f42c1' }}>
                        <FaBuilding className="me-1" /> {t('apartmentWelcome.stats.plan')}: {apartmentLimit === "Unlimited"
                          ? t('apartmentWelcome.stats.unlimited')
                          : `${currentApartmentCount || 0}/${apartmentLimit || 0}`}
                      </Badge>
                    </div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="text-end">
                    <Button
                      color="primary"
                      disabled={!canAddApartment}
                      title={!canAddApartment ? t('apartmentWelcome.actions.limitReached', { limit: apartmentLimit }) : ""}
                      onClick={openCreateApartmentModal}
                    >
                      <i className="ri-add-line align-bottom me-1"></i> {t('apartmentWelcome.actions.addApartment')}
                    </Button>
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>
      {/* End Welcome Card */}

      {/* Approaching Limit Alert */}
      {approachingLimit && (
        <Alert color="warning" className="mb-4">
          <div className="d-flex">
            <i className="ri-alert-line fs-3 me-3"></i>
            <div>
              <h5>Approaching Apartment Limit</h5>
              <p className="mb-0">
                You're close to reaching your apartment limit for this building.
                Consider upgrading your subscription plan for more capacity.
              </p>
            </div>
          </div>
        </Alert>
      )}

      {/* Filters Card */}
      <Card className="apartment-filters-card shadow-sm mb-4" >
        <CardBody>
          <Row className="g-3 align-items-end">

            {/* Search Apartments */}
            <Col sm={6} lg={3}>
              <FormGroup>
                <Label className="form-label">{t('apartmentWelcome.filters.searchApartments')}</Label>
                <InputGroup>
                  <InputGroupText>
                    <FaSearch />
                  </InputGroupText>
                  <Input
                    type="text"
                    placeholder={t('apartmentWelcome.filters.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <Button
                      color="link"
                      className="p-0 px-2"
                      onClick={() => setSearchTerm("")}
                      title={t('apartmentWelcome.filters.clearSearch')}
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
            <Col sm={6} lg={3}>
              <FormGroup>
                <Label className="form-label">{t('apartmentWelcome.filters.filterByBuilding')}</Label>
                <Input
                  type="select"
                  value={selectedBuildingFilter}
                  onChange={(e) => handleBuildingFilterChange(e.target.value)}
                >
                  {buildings.map(building => (
                    <option key={building._id} value={building._id}>
                      {building.name}
                    </option>
                  ))}
                </Input>
              </FormGroup>
            </Col>

            {/* Apartments per page */}
            <Col sm={6} lg={3}>
              <FormGroup>
                <Label className="form-label">{t('apartmentWelcome.filters.apartmentsPerPage')}</Label>
                <Input
                  type="select"
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                >
                  <option value={8}>8</option>
                  <option value={16}>16</option>
                  <option value={32}>32</option>
                </Input>
              </FormGroup>
            </Col>

            {/* Add Apartment Button */}
            <Col sm={6} lg={3}>
              <FormGroup>
                <Label className="form-label invisible">{t('apartmentWelcome.actions.addApartment')}</Label>
                <Button
                  color="primary"
                  className="w-100"
                  onClick={openCreateApartmentModal}
                  disabled={!currentBuilding || !canAddApartment}
                  title={
                    !currentBuilding
                      ? t('apartmentWelcome.actions.selectBuildingFirst')
                      : !canAddApartment
                        ? t('apartmentWelcome.actions.limitReached', { limit: apartmentLimit })
                        : approachingLimit
                          ? "Approaching apartment limit"
                          : ""
                  }
                >
                  <FaPlus className="me-2" /> {t('apartmentWelcome.actions.addApartment')}
                </Button>
              </FormGroup>
            </Col>

          </Row>
        </CardBody>
      </Card>


      {/* Main Content - Cards */}
      <div className="mt-4 mb-5" style={{ paddingLeft: "15px" }}>
        {currentApartments.length > 0 ? (
          <>
            <Row style={{ paddingLeft: "15px" }}>
              {currentApartments.map(apartment => (
                apartment && apartment._id ? (
                  <Col xl={3} md={6} key={apartment._id} className="mb-4">
                    <Card className="apartment-card card-height-100">
                      <div className="card-header align-items-center d-flex bg-light bg-opacity-75 border-bottom-0">
                        <h4 className="card-title mb-0 flex-grow-1">
                          Apartment #{apartment.number}
                        </h4>
                        <div className="flex-shrink-0">
                          <div className="dropdown card-header-dropdown">
                            <div className="dropdown-menu dropdown-menu-end">
                              <button
                                className="dropdown-item"
                                onClick={() => openEditApartmentModal(apartment)}
                              >
                                <i className="ri-pencil-fill align-bottom me-2 text-muted"></i> Edit
                              </button>
                              <button
                                className="dropdown-item text-danger"
                                onClick={() => {
                                  setSelectedApartment(apartment);
                                  setDeleteModal(true);
                                }}
                              >
                                <i className="ri-delete-bin-fill align-bottom me-2 text-danger"></i> Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <CardBody>
                        <div className="badge position-absolute top-0 end-0 m-3 apartment-badge"
                          style={{
                            background: apartment.coOwner ? "rgba(10, 179, 156, 0.1)" : "rgba(241, 180, 76, 0.1)",
                            color: apartment.coOwner ? "#0ab39c" : "#f1b44c",
                            borderRadius: "4px",
                            padding: "5px 10px",
                            fontSize: "12px",
                            fontWeight: "500"
                          }}
                        >
                          {apartment.coOwner ? "Assigned" : "Unassigned"}
                        </div>

                        <div className="d-flex mb-4">
                          <div className="flex-shrink-0">
                            <div className="avatar-md rounded-circle bg-light apartment-icon-wrapper">
                              <div className="avatar-title text-primary rounded-circle">
                                <FaHome size={24} color='white' />
                              </div>
                            </div>
                          </div>
                          <div className="flex-grow-1 ms-3">
                            <h5 className="fs-16">{t('apartmentWelcome.modal.floor')} {apartment.floor}</h5>
                            {!currentBuilding && apartment.building && (
                              <p className="text-muted mb-0">{apartment.building.name}</p>
                            )}
                            {apartment.bloc?.name && (
                              <p className="text-muted mb-0">
                                <FaLayerGroup className="me-1" size={12} />
                                {apartment.bloc.name}
                              </p>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            <div className="d-flex gap-1">
                              <button
                                type="button"
                                className="btn btn-sm btn-icon btn-soft-primary apartment-action-btn"
                                onClick={() => openEditApartmentModal(apartment)}
                              >
                                <i className="ri-pencil-fill"></i>
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-icon btn-soft-danger apartment-action-btn"
                                onClick={() => {
                                  setSelectedApartment(apartment);
                                  setDeleteModal(true);
                                }}
                              >
                                <i className="ri-delete-bin-fill"></i>
                              </button>
                            </div>
                          </div>
                        </div>

                        <Row className="g-0 text-center apartment-stats">
                          <Col xs={6} className="border-end">
                            <div className="py-3">
                              <h5 className="mb-0">{apartment.bedrooms || "-"}</h5>
                              <p className="text-muted mb-0">
                                <FaBed className="me-1" size={12} /> {t('apartmentWelcome.modal.bedrooms')}
                              </p>
                            </div>
                          </Col>
                          <Col xs={6}>
                            <div className="py-3">
                              <h5 className="mb-0">
                                {apartment.bloc?.name || "-"}
                              </h5>
                              <p className="text-muted mb-0">
                                <FaLayerGroup className="me-1" size={12} /> {t('apartmentWelcome.modal.bloc')}
                              </p>
                            </div>
                          </Col>
                        </Row>

                        <div className="border-top border-top-dashed mt-2 apartment-owner-section">
                          <div className="pt-3">
                            <h5 className="fs-15 mb-3">
                              <FaUsers className="me-1" /> {t('apartmentWelcome.modal.coOwner')}
                            </h5>
                            {apartment.coOwner ? (
                              <div className="d-flex align-items-center apartment-owner">
                                <div className="flex-shrink-0">
                                  <div className="avatar-xs">
                                    <div className="avatar-title bg-soft-success text-success rounded-circle">
                                      {apartment.coOwner.firstName && apartment.coOwner.lastName ?
                                        `${apartment.coOwner.firstName[0] || ''}${apartment.coOwner.lastName[0] || ''}` :
                                        'CO'}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex-grow-1 ms-2">
                                  <h6 className="mb-0">
                                    {apartment.coOwner.firstName || ''} {apartment.coOwner.lastName || ''}
                                  </h6>
                                  <button
                                    type="button"
                                    className="btn btn-sm py-0 text-danger px-0 apartment-remove-btn"
                                    onClick={() => handleRemoveCoOwner(apartment._id)}
                                  >
                                    <FaUserMinus className="me-1" size={12} /> {t('apartmentWelcome.modal.removeCoOwner')}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-sm btn-soft-primary apartment-assign-btn"
                                onClick={() => {
                                  setSelectedApartment(apartment);
                                  fetchAvailableCoOwners();
                                  setCoOwnerModal(true);
                                }}
                              >
                                <FaUserPlus className="me-1" /> {t('apartmentWelcome.modal.assignCoOwner')}
                              </button>
                            )}
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </Col>
                ) : null
              ))}
            </Row>

            <div style={{ marginBottom: "50px" }}>
              {totalPages > 1 && (
                <Row>
                  <Col lg={12}>
                    <div className="pagination-wrap hstack justify-content-center gap-2 mb-4">
                      <Button
                        color="light"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                      >
                        <i className="mdi mdi-chevron-left"></i>
                      </Button>
                      <ul className="pagination listjs-pagination mb-0">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <li key={i} className={pageNum === currentPage ? "active" : ""}>
                              <Button
                                color={pageNum === currentPage ? "primary" : "light"}
                                onClick={() => setCurrentPage(pageNum)}
                              >
                                {pageNum}
                              </Button>
                            </li>
                          );
                        })}
                      </ul>
                      <Button
                        color="light"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                      >
                        <i className="mdi mdi-chevron-right"></i>
                      </Button>
                    </div>
                  </Col>
                </Row>
              )}
            </div>
          </>
        ) : (
          <div className="noresult" style={{ display: "block" }}>
            <div className="text-center">
              <lord-icon
                src="https://cdn.lordicon.com/msoeawqm.json"
                trigger="loop"
                colors="primary:#121331,secondary:#08a88a"
                style={{ width: "75px", height: "75px" }}>
              </lord-icon>
              <h5 className="mt-2">{t('apartmentWelcome.emptyState.noApartmentsFound')}</h5>
              <p className="text-muted mb-0">
                {searchTerm ? (
                  <>{t('apartmentWelcome.emptyState.noMatchingApartments')}</>
                ) : selectedBuildingFilter ? (
                  <>{t('apartmentWelcome.emptyState.noApartmentsFound')}</>
                ) : (
                  t('apartmentWelcome.actions.selectBuildingFirst')
                )}
              </p>

              {searchTerm && (
                <Button color="light" className="mt-3" onClick={() => setSearchTerm('')}>
                  <i className="ri-delete-bin-line me-1 align-bottom"></i> {t('apartmentWelcome.filters.clearSearch')}
                </Button>
              )}

              {selectedBuildingFilter && canAddApartment && !searchTerm && (
                <Button color="primary" className="mt-3" onClick={() => setOpenCreateModal(true)}>
                  <i className="ri-add-line me-1 align-bottom"></i> {t('apartmentWelcome.emptyState.addFirstApartment')}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Confirmation Modal */}
      <Modal isOpen={openCreateModal} toggle={() => setOpenCreateModal(false)} centered size="lg">
        <ModalHeader toggle={() => setOpenCreateModal(false)} className="bg-soft-info p-3">
          {t('apartmentWelcome.modal.createTitle')}
        </ModalHeader>
        <ModalBody className="py-3 px-5">
          {canAddApartment && approachingLimit && (
            <Alert color="warning" className="border-0 mb-4">
              <i className="ri-alert-line me-2 fs-15 align-middle"></i>
              <strong>{t('apartmentWelcome.modal.warning')}</strong> - {t('apartmentWelcome.modal.limitWarning', { limit: apartmentLimit })}
            </Alert>
          )}
          <Form>
            <Row className="mb-3">
              <Col md={6}>
                <FormGroup>
                  <Label className="form-label">{t('apartmentWelcome.modal.apartmentNumber')} <span className="text-danger">*</span></Label>
                  <Input
                    type="text"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    placeholder={t('apartmentWelcome.modal.apartmentNumberPlaceholder')}
                    invalid={!formData.number || !/^\d+$/.test(formData.number)}
                  />
                  {!formData.number && (
                    <div className="invalid-feedback">{t('apartmentWelcome.modal.numberRequired')}</div>
                  )}
                  {formData.number && !/^\d+$/.test(formData.number) && (
                    <div className="invalid-feedback">{t('apartmentWelcome.modal.numberRequired')}</div>
                  )}
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label className="form-label">{t('apartmentWelcome.modal.floor')} <span className="text-danger">*</span></Label>
                  <Input
                    type="text"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    placeholder={t('apartmentWelcome.modal.floorPlaceholder')}
                    invalid={!formData.floor || !/^-?\d+$/.test(formData.floor)}
                  />
                  {!formData.floor && (
                    <div className="invalid-feedback">{t('apartmentWelcome.modal.floorRequired')}</div>
                  )}
                  {formData.floor && !/^-?\d+$/.test(formData.floor) && (
                    <div className="invalid-feedback">{t('apartmentWelcome.modal.floorNumeric')}</div>
                  )}
                </FormGroup>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <FormGroup>
                  <Label className="form-label">{t('apartmentWelcome.modal.bedrooms')} <span className="text-danger">*</span></Label>
                  <select
                    className={`form-select ${!formData.bedrooms ? 'is-invalid' : ''}`}
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  >
                    <option value="">{t('apartmentWelcome.modal.bedroomsPlaceholder')}</option>
                    <option value="Studio">{t('apartmentWelcome.modal.studio')}</option>
                    <option value="1">{t('apartmentWelcome.modal.oneBedroom')}</option>
                    <option value="2">{t('apartmentWelcome.modal.twoBedrooms')}</option>
                    <option value="3">{t('apartmentWelcome.modal.threeBedrooms')}</option>
                    <option value="4">{t('apartmentWelcome.modal.fourBedrooms')}</option>
                    <option value="5+">{t('apartmentWelcome.modal.fivePlusBedrooms')}</option>
                  </select>
                  {!formData.bedrooms && (
                    <div className="invalid-feedback">{t('apartmentWelcome.modal.bedroomsRequired')}</div>
                  )}
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label className="form-label">{t('apartmentWelcome.modal.bloc')} <span className="text-danger">*</span></Label>
                  <select
                    className={`form-select ${!formData.bloc ? 'is-invalid' : ''}`}
                    value={formData.bloc}
                    onChange={(e) => setFormData({ ...formData, bloc: e.target.value })}
                  >
                    <option value="">{t('apartmentWelcome.modal.selectBloc')}</option>
                    {currentBuilding?.blocs?.map(bloc => (
                      <option key={bloc._id} value={bloc._id}>{bloc.name}</option>
                    ))}
                  </select>
                  {!formData.bloc && (
                    <div className="invalid-feedback">{t('apartmentWelcome.modal.blocRequired')}</div>
                  )}
                </FormGroup>
              </Col>
            </Row>

            {!currentBuilding && (
              <FormGroup>
                <Label className="form-label">{t('apartmentWelcome.modal.building')} <span className="text-danger">*</span></Label>
                <select
                  className="form-select"
                  value={formData.building}
                  onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                  invalid={!formData.building}
                >
                  <option value="">{t('apartmentWelcome.modal.selectBuilding')}</option>
                  {buildings.map(building => (
                    <option key={building._id} value={building._id}>{building.name}</option>
                  ))}
                </select>
                {!formData.building && (
                  <div className="invalid-feedback">{t('apartmentWelcome.modal.required')}</div>
                )}
              </FormGroup>
            )}
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setOpenCreateModal(false)}>{t('apartmentWelcome.modal.cancel')}</Button>
          <Button
            color="primary"
            onClick={handleCreate}
            disabled={!formData.number || !formData.floor || !formData.bedrooms || !formData.bloc || !/^\d+$/.test(formData.number) || !/^-?\d+$/.test(formData.floor) || (!currentBuilding && !formData.building)}
          >
            {t('apartmentWelcome.modal.create')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit Apartment Modal */}
      <Modal isOpen={openEditModal} toggle={() => setOpenEditModal(false)} centered size="lg">
        <ModalHeader toggle={() => setOpenEditModal(false)} className="bg-soft-success p-3">
          {t('apartmentWelcome.modal.editTitle')} #{formData.number || ''}
        </ModalHeader>
        <ModalBody className="py-3 px-5">
          <Form>
            <Row className="mb-3">
              <Col md={6}>
                <FormGroup>
                  <Label className="form-label">{t('apartmentWelcome.modal.apartmentNumber')} <span className="text-danger">*</span></Label>
                  <Input
                    type="text"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    placeholder={t('apartmentWelcome.modal.apartmentNumberPlaceholder')}
                    invalid={!formData.number || !/^\d+$/.test(formData.number)}
                  />
                  {!formData.number && (
                    <div className="invalid-feedback">{t('apartmentWelcome.modal.numberRequired')}</div>
                  )}
                  {formData.number && !/^\d+$/.test(formData.number) && (
                    <div className="invalid-feedback">{t('apartmentWelcome.modal.numberNumeric')}</div>
                  )}
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label className="form-label">{t('apartmentWelcome.modal.floor')} <span className="text-danger">*</span></Label>
                  <Input
                    type="text"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    placeholder={t('apartmentWelcome.modal.floorPlaceholder')}
                    invalid={!formData.floor || !/^-?\d+$/.test(formData.floor)}
                  />
                  {!formData.floor && (
                    <div className="invalid-feedback">{t('apartmentWelcome.modal.floorRequired')}</div>
                  )}
                  {formData.floor && !/^-?\d+$/.test(formData.floor) && (
                    <div className="invalid-feedback">{t('apartmentWelcome.modal.floorNumeric')}</div>
                  )}
                </FormGroup>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <FormGroup>
                  <Label className="form-label">{t('apartmentWelcome.modal.bedrooms')} <span className="text-danger">*</span></Label>
                  <select
                    className={`form-select ${!formData.bedrooms ? 'is-invalid' : ''}`}
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  >
                    <option value="">{t('apartmentWelcome.modal.bedroomsPlaceholder')}</option>
                    <option value="Studio">{t('apartmentWelcome.modal.studio')}</option>
                    <option value="1">{t('apartmentWelcome.modal.oneBedroom')}</option>
                    <option value="2">{t('apartmentWelcome.modal.twoBedrooms')}</option>
                    <option value="3">{t('apartmentWelcome.modal.threeBedrooms')}</option>
                    <option value="4">{t('apartmentWelcome.modal.fourBedrooms')}</option>
                    <option value="5+">{t('apartmentWelcome.modal.fivePlusBedrooms')}</option>
                  </select>
                  {!formData.bedrooms && (
                    <div className="invalid-feedback">{t('apartmentWelcome.modal.bedroomsRequired')}</div>
                  )}
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label className="form-label">{t('apartmentWelcome.modal.bloc')} <span className="text-danger">*</span></Label>
                  <select
                    className={`form-select ${!formData.bloc ? 'is-invalid' : ''}`}
                    value={formData.bloc}
                    onChange={(e) => setFormData({ ...formData, bloc: e.target.value })}
                  >
                    <option value="">{t('apartmentWelcome.modal.selectBloc')}</option>
                    {currentBuilding?.blocs?.map(bloc => (
                      <option key={bloc._id} value={bloc._id}>{bloc.name}</option>
                    ))}
                  </select>
                  {!formData.bloc && (
                    <div className="invalid-feedback">{t('apartmentWelcome.modal.blocRequired')}</div>
                  )}
                </FormGroup>
              </Col>
            </Row>

            {!currentBuilding && (
              <FormGroup>
                <Label className="form-label">{t('apartmentWelcome.modal.building')} <span className="text-danger">*</span></Label>
                <select
                  className="form-select"
                  value={formData.building}
                  onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                  invalid={!formData.building}
                >
                  <option value="">{t('apartmentWelcome.modal.selectBuilding')}</option>
                  {buildings.map(building => (
                    <option key={building._id} value={building._id}>{building.name}</option>
                  ))}
                </select>
                {!formData.building && (
                  <div className="invalid-feedback">{t('apartmentWelcome.modal.required')}</div>
                )}
              </FormGroup>
            )}
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setOpenEditModal(false)}>{t('apartmentWelcome.modal.cancel')}</Button>
          <Button
            color="success"
            onClick={handleEdit}
            disabled={!formData.number || !formData.floor || !formData.bedrooms || !formData.bloc || !/^\d+$/.test(formData.number) || !/^-?\d+$/.test(formData.floor)}
          >
            {t('apartmentWelcome.modal.update')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Assign Co-Owner Modal */}
      <Modal isOpen={coOwnerModal} toggle={() => setCoOwnerModal(false)} centered>
        <ModalHeader toggle={() => setCoOwnerModal(false)} className="bg-soft-primary p-3">
          {t('apartmentWelcome.coOwnerModal.title')} #{selectedApartment?.number}
        </ModalHeader>
        <ModalBody>
          <div className="mb-3">
            <Label className="form-label">{t('apartmentWelcome.modal.coOwner')}</Label>
            <div className="search-box">
              <Input
                type="text"
                className="form-control search"
                placeholder={t('apartmentWelcome.coOwnerModal.searchPlaceholder')}
                value={coOwnerSearchTerm}
                onChange={(e) => setCoOwnerSearchTerm(e.target.value)}
              />
              <i className="ri-search-line search-icon"></i>
            </div>
          </div>

          <div className="mx-n3">
            {filteredCoOwners.length > 0 ? (
              <div style={{ maxHeight: "260px", overflowY: "auto" }} className="px-3">
                {filteredCoOwners.map(user => (
                  <div
                    key={user._id}
                    className={`d-flex align-items-center p-2 rounded mb-2 ${selectedCoOwner === user._id ? 'bg-soft-primary' : 'bg-light'}`}
                    role="button"
                    onClick={() => setSelectedCoOwner(user._id)}
                  >
                    <div className="avatar-xs me-3">
                      <div className={`avatar-title rounded-circle ${selectedCoOwner === user._id ? 'bg-primary text-white' : 'bg-light text-primary'}`}>
                        {user.firstName[0]}{user.lastName[0]}
                      </div>
                    </div>
                    <div className="flex-grow-1">
                      <h5 className="fs-13 mb-0">{user.firstName} {user.lastName}</h5>
                      <p className="fs-12 text-muted mb-0">{user.email}</p>
                    </div>
                    {selectedCoOwner === user._id && (
                      <div className="flex-shrink-0">
                        <i className="ri-checkbox-circle-fill text-primary fs-16"></i>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center">
                <i className="ri-user-search-line display-5 text-muted"></i>
                <h5 className="mt-2">No co-owners found</h5>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setCoOwnerModal(false)}>Cancel</Button>
          <Button
            color="primary"
            onClick={handleAssignCoOwner}
            disabled={!selectedCoOwner}
          >
            Assign
          </Button>
        </ModalFooter>
      </Modal>

      <DeleteModal
        show={deleteModal}
        onDeleteClick={handleDelete}
        onCloseClick={() => setDeleteModal(false)}
        message={`Are you sure you want to delete Apartment #${selectedApartment?.number}?`}
      />


      <style jsx>{`
      /* Apartment Card Styling */
.apartment-card {
  transition: all 0.3s ease;
  border: 1px solid #e9e9ef;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
  overflow: hidden;
  cursor: pointer;
}

.apartment-card:hover {
  transform: translateX(8px);
  box-shadow: 0 5px 15px rgba(58, 87, 232, 0.15);
  border-color: rgba(58, 87, 232, 0.1);
}

.apartment-card:hover .card-header {
  background-color: rgba(58, 87, 232, 0.05) !important;
}

.apartment-card:hover .card-title {
  color: #3a57e8;
}

.apartment-icon-wrapper {
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.apartment-card:hover .apartment-icon-wrapper {
  transform: scale(1.05);
  box-shadow: 0 0 0 4px rgba(58, 87, 232, 0.1);
  background-color: #ffffff !important;
}

.apartment-card:hover .avatar-title {
  background-color: #3a57e8;
  `} </style>
    </div>
  );
};

export default withTranslation()(BuildingApartments);