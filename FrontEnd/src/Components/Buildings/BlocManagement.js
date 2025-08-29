import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createBloc, deleteBloc, fetchallBlocs, fetchBuildingBlocs, SetCurrentBuilding, updateBloc, fetchBuildingById } from '../../slices/buildings/building';
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
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  Pagination,
  PaginationItem,
  PaginationLink,
  InputGroup,
  InputGroupText
} from 'reactstrap';
import { FaLayerGroup, FaPlus, FaSearch, FaEdit, FaTrash, FaBuilding, FaHome, FaUsers, FaFilter, FaCalendarAlt, FaIdCard, FaInfoCircle } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import BreadCrumb from '../Common/BreadCrumb';
import DeleteModal from '../Common/DeleteModal';
import { Outlet } from 'react-router-dom';
import blocImage from "../../assets/images/blocs-hero.png";
import PropertyNavigation from './tabnavigarion';
import { withTranslation } from "react-i18next";

const BuildingBlocs = ({ t }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector(state => state.Building);
  const { buildings = [] } = useSelector(state => state.Building.buildings);
  const blocs = useSelector(state => state.Building.blocs || []);
  const currentBuilding = useSelector(state => state.Building.currentBuilding);
  const [openEditModal, setOpenEditModal] = useState(false);
  // State for UI controls
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedBloc, setSelectedBloc] = useState(null);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [buildingDropdownOpen, setBuildingDropdownOpen] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState(currentBuilding?._id || '');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [confirmDeleteModal, setConfirmDeleteModal] = useState(false);
  const [blocToDelete, setBlocToDelete] = useState(null);

  // Add this inside openDeleteConfirmation function
  const openDeleteConfirmation = (blocId, e) => {
    e.stopPropagation();
    console.log("Opening deletion modal for bloc ID:", blocId);
    setBlocToDelete(blocId);
    setConfirmDeleteModal(true);
  };

  const openEditModalBloc = (bloc) => {
    // Fill form with bloc data
    setFormData({
      _id: bloc._id,
      name: bloc.name,
      building: bloc.building?._id || currentBuilding?._id || ''
    });
    setOpenEditModal(true);
  };

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    building: currentBuilding?._id || ''
  });

  // Fetch blocs based on filter
  useEffect(() => {
    if (selectedBuildingFilter) {
      dispatch(fetchBuildingBlocs(selectedBuildingFilter));
    } else {
      dispatch(fetchallBlocs());
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

  // Filter blocs based on search term (client-side filtering)
  const filteredBlocs = blocs.filter(bloc => {
    return bloc.name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredBlocs.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBlocs = filteredBlocs.slice(indexOfFirstItem, indexOfLastItem);

  const toggleBuildingDropdown = () => setBuildingDropdownOpen(!buildingDropdownOpen);
  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  // Calculate stats
  const totalBlocsCount = blocs.length;
  const totalBlocsApartments = blocs.reduce((sum, bloc) => sum + (bloc.apartments?.length || 0), 0);
  const averageApartmentsPerBloc = totalBlocsCount ? (totalBlocsApartments / totalBlocsCount).toFixed(1) : 0;

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

  // Update your handleDelete function to use blocToDelete instead of selectedBloc
  const handleDelete = async () => {
    if (blocToDelete) {
      try {
        await dispatch(deleteBloc(blocToDelete)).unwrap();
        toast.success(t('blocWelcome.modal.deleteSuccess'));
        setConfirmDeleteModal(false);

        // Refresh the current building with fresh data
        if (currentBuilding?._id) {
          const refreshAction = await dispatch(fetchBuildingById(currentBuilding._id));
          if (fetchBuildingById.fulfilled.match(refreshAction)) {
            dispatch(SetCurrentBuilding(refreshAction.payload.building));
          }
        }

        // Refresh the list
        if (selectedBuildingFilter) {
          dispatch(fetchBuildingBlocs(selectedBuildingFilter));
        } else {
          dispatch(fetchallBlocs());
        }

        // Clear the blocToDelete state
        setBlocToDelete(null);
      } catch (error) {
        toast.error(error?.message || t('blocWelcome.modal.deleteError'));
      }
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.building) {
      toast.error(t('blocWelcome.modal.required'));
      return;
    }

    try {
      await dispatch(createBloc(formData)).unwrap();
      toast.success(t('blocWelcome.modal.createSuccess'));
      setOpenCreateModal(false);
      setFormData({
        name: '',
        building: currentBuilding?._id || ''
      });

      // Refresh the current building with fresh data (same approach as handleEdit)
      if (currentBuilding?._id) {
        const refreshAction = await dispatch(fetchBuildingById(currentBuilding._id));
        if (fetchBuildingById.fulfilled.match(refreshAction)) {
          dispatch(SetCurrentBuilding(refreshAction.payload.building));
        }
      }

      // Fetch blocs
      if (selectedBuildingFilter) {
        dispatch(fetchBuildingBlocs(selectedBuildingFilter));
      } else {
        dispatch(fetchallBlocs());
      }
    } catch (error) {
      toast.error(error?.message || t('blocWelcome.modal.createError'));
    }
  };

  const handleEdit = async () => {
    if (!formData._id) {
      toast.error(t('blocWelcome.modal.updateError'));
      console.error("Missing bloc ID in form data:", formData);
      return;
    }

    if (!formData.name) {
      toast.error(t('blocWelcome.modal.required'));
      return;
    }

    try {
      console.log("Updating bloc with data:", formData);

      await dispatch(updateBloc({
        blocId: formData._id,
        blocData: formData
      })).unwrap();

      toast.success(t('blocWelcome.modal.updateSuccess'));
      setOpenEditModal(false);

      // Refresh the list
      if (selectedBuildingFilter) {
        dispatch(fetchBuildingBlocs(selectedBuildingFilter));
      } else {
        dispatch(fetchallBlocs());
      }
    } catch (err) {
      console.error("Error updating bloc:", err);
      toast.error(err.message || t('blocWelcome.modal.updateError'));
    }
  };

  const handleBlocDetails = (blocId) => {
    // Placeholder for bloc details view navigation
    console.log("View bloc details for:", blocId);
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
        <div className="text-center py-5">
          <div className="avatar-lg mx-auto mb-4">
            <div className="avatar-title bg-light text-danger display-3 rounded-circle">
              <i className="ri-error-warning-line"></i>
            </div>
          </div>
          <h4>Error loading blocs</h4>
          <p className="text-muted">{error.message || 'An error occurred'}</p>
          <Button color="primary" onClick={() => {
            if (selectedBuildingFilter) {
              dispatch(fetchBuildingBlocs(selectedBuildingFilter));
            } else {
              dispatch(fetchallBlocs());
            }
          }}>
            <i className="ri-refresh-line me-1"></i> Retry
          </Button>
        </div>
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
                    <h4 className="fw-semibold mb-2">{t('blocWelcome.title')}</h4>
                    <p className="text-muted mb-3">{t('blocWelcome.description')}</p>
                    {/* Statistics Badges */}
                    <div className="d-flex flex-wrap gap-2">
                      <Badge color="primary" pill className="fs-12 py-2 px-3">
                        <FaLayerGroup className="me-1" /> {t('blocWelcome.stats.totalBlocs')}: {totalBlocsCount || 0}
                      </Badge>
                      <Badge color="success" pill className="fs-12 py-2 px-3">
                        <FaHome className="me-1" /> {t('blocWelcome.stats.totalApartments')}: {totalBlocsApartments || 0}
                      </Badge>
                      <Badge color="danger" pill className="fs-12 py-2 px-3">
                        <FaBuilding className="me-1" /> {t('blocWelcome.stats.avgPerBloc')}: {averageApartmentsPerBloc || 0}
                      </Badge>
                      <Badge color="purple" pill className="fs-12 py-2 px-3" style={{ background: '#f3eafe', color: '#6f42c1' }}>
                        <FaInfoCircle className="me-1" /> {t('blocWelcome.stats.currentBuilding')}: {currentBuilding?.name || t('blocWelcome.stats.allBuildings')}
                      </Badge>
                    </div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="text-end">
                    <Button
                      color="primary"
                      onClick={() => setOpenCreateModal(true)}
                      disabled={!currentBuilding}
                      title={!currentBuilding ? t('blocWelcome.actions.selectBuildingFirst') : t('blocWelcome.actions.addBloc')}
                    >
                      <i className="ri-add-line align-bottom me-1"></i> {t('blocWelcome.actions.addBloc')}
                    </Button>
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>
      {/* End Welcome Card */}

      {/* Filters Card */}
      <Card className="bloc-filters-card shadow-sm mb-4">
        <CardBody>
          <Row className="g-3 align-items-end">
            {/* Search Blocs */}
            <Col sm={6} lg={3}>
              <FormGroup>
                <Label className="form-label">{t('blocWelcome.filters.searchBlocs')}</Label>
                <InputGroup>
                  <InputGroupText>
                    <FaSearch />
                  </InputGroupText>
                  <Input
                    type="text"
                    placeholder={t('blocWelcome.filters.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <Button
                      color="link"
                      className="p-0 px-2"
                      onClick={() => setSearchTerm("")}
                      title={t('blocWelcome.filters.clearSearch')}
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
                <Label className="form-label">{t('blocWelcome.filters.filterByBuilding')}</Label>
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

            {/* Blocs per page */}
            <Col sm={6} lg={3}>
              <FormGroup>
                <Label className="form-label">{t('blocWelcome.filters.blocsPerPage')}</Label>
                <Input
                  type="select"
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                >
                  <option value={6}>6</option>
                  <option value={16}>16</option>
                  <option value={32}>32</option>
                </Input>
              </FormGroup>
            </Col>

            {/* Add Bloc Button */}
            <Col sm={6} lg={3}>
              <FormGroup>
                <Label className="form-label invisible">{t('blocWelcome.actions.addBloc')}</Label>
                <Button
                  color="primary"
                  className="w-100"
                  onClick={() => setOpenCreateModal(true)}
                  disabled={!currentBuilding}
                  title={!currentBuilding ? t('blocWelcome.actions.selectBuildingFirst') : t('blocWelcome.actions.addBloc')}
                >
                  <FaPlus className="me-2" /> {t('blocWelcome.actions.addBloc')}
                </Button>
              </FormGroup>
            </Col>
          </Row>
        </CardBody>
      </Card>

   {/* Main Content - Bloc Grid */}
<div className="mt-4 mb-5" style={{ paddingLeft: "15px" }}>
  {currentBlocs.length > 0 ? (
    <Row>
      {currentBlocs.map((bloc) => (
        bloc && bloc._id ? (
          <Col xl={4} md={6} key={bloc._id} className="mb-4">
            <Card className="bloc-card card-height-100">
              <div className="card-header align-items-center d-flex bg-light bg-opacity-75 border-bottom-0">
                <h4 className="card-title mb-0 flex-grow-1">
                  Bloc: {bloc.name || "N/A"}
                </h4>
                <div className="flex-shrink-0">
                  <div className="d-flex gap-1">
                    <button
                      type="button"
                      className="btn btn-sm btn-icon btn-soft-primary bloc-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModalBloc(bloc);
                      }}
                    >
                      <i className="ri-pencil-fill"></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-icon btn-soft-danger bloc-action-btn"
                      onClick={(e) => openDeleteConfirmation(bloc._id, e)}
                    >
                      <i className="ri-delete-bin-fill"></i>
                    </button>
                  </div>
                </div>
              </div>

              <CardBody className="p-4">
                <div className="d-flex mb-4 bloc-info">
                  <div className="flex-shrink-0">
                    <div className="avatar-md rounded-circle bg-light bloc-icon-wrapper" color='white'>
                      <div className="avatar-title text-primary rounded-circle" color='white'>
                        <FaLayerGroup size={24} color='white'/>
                      </div>
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    {!currentBuilding && bloc.building && (
                      <div className="d-flex align-items-center mb-1">
                        <FaBuilding className="text-muted me-1" size={14} />
                        <span className="text-muted">{bloc.building.name}</span>
                      </div>
                    )}
                    {bloc.createdAt && (
                      <div className="d-flex align-items-center mb-1">
                        <FaCalendarAlt className="text-muted me-1" size={14} />
                        <span className="text-muted fs-12">
                          Created: {new Date(bloc.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-light p-3 rounded-3 bloc-stats">
                  <Row className="g-0 text-center">
                    <Col xs={6} className="border-end">
                      <div className="py-3">
                        <h5 className="mb-0 fw-semibold">{bloc.apartments?.length || 0}</h5>
                        <p className="text-muted mb-0">
                          <FaHome className="text-primary me-1" size={12} /> {t('blocWelcome.stats.totalApartments')}
                        </p>
                      </div>
                    </Col>
                    <Col xs={6}>
                      <div className="py-3">
                        <h5 className="mb-0 fw-semibold">
                          {bloc.apartments?.filter(apt => apt.coOwner).length || 0}
                        </h5>
                        <p className="text-muted mb-0">
                          <FaUsers className="text-success me-1" size={12} /> {t('apartmentWelcome.stats.assigned')}
                        </p>
                      </div>
                    </Col>
                  </Row>
                </div>
              </CardBody>
            </Card>
          </Col>
        ) : null
      ))}
    </Row>
  ) : (
    <div className="noresult" style={{ display: "block" }}>
      <div className="text-center">
        <lord-icon
          src="https://cdn.lordicon.com/msoeawqm.json"
          trigger="loop"
          colors="primary:#121331,secondary:#08a88a"
          style={{ width: "75px", height: "75px" }}>
        </lord-icon>
        <h5 className="mt-2">{t('blocWelcome.emptyState.noBlocsFound')}</h5>
        <p className="text-muted mb-0">
          {searchTerm ? (
            <>{t('blocWelcome.emptyState.noMatchingBlocs')}</>
          ) : selectedBuildingFilter ? (
            <>{t('blocWelcome.emptyState.noBlocsFound')}</>
          ) : (
            t('blocWelcome.actions.selectBuildingFirst')
          )}
        </p>

        {searchTerm && (
          <Button color="light" className="mt-3" onClick={() => setSearchTerm('')}>
            <i className="ri-delete-bin-line me-1 align-bottom"></i> {t('blocWelcome.filters.clearSearch')}
          </Button>
        )}

        {selectedBuildingFilter && !searchTerm && (
          <Button color="primary" className="mt-3" onClick={() => setOpenCreateModal(true)}>
            <i className="ri-add-line me-1 align-bottom"></i> {t('blocWelcome.emptyState.addFirstBloc')}
          </Button>
        )}
      </div>
    </div>
  )}
</div>

      {/* Pagination */}
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
      {/* Create Bloc Modal */}
      <Modal isOpen={openCreateModal} toggle={() => setOpenCreateModal(false)} centered>
        <ModalHeader toggle={() => setOpenCreateModal(false)} className="bg-soft-info p-3">
          {t('blocWelcome.modal.createTitle')}
        </ModalHeader>
        <ModalBody className="py-3 px-5">
          <Form>
            <FormGroup className="mb-3">
              <Label className="form-label">{t('blocWelcome.modal.blocName')} <span className="text-danger">*</span></Label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('blocWelcome.modal.blocNamePlaceholder')}
                className="form-control"
              />
            </FormGroup>

            {!currentBuilding && (
              <FormGroup>
                <Label className="form-label">{t('blocWelcome.modal.building')} <span className="text-danger">*</span></Label>
                <select
                  className="form-select"
                  value={formData.building}
                  onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                >
                  <option value="">{t('blocWelcome.modal.selectBuilding')}</option>
                  {buildings.map(building => (
                    <option key={building._id} value={building._id}>{building.name}</option>
                  ))}
                </select>
              </FormGroup>
            )}
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setOpenCreateModal(false)}>{t('blocWelcome.modal.cancel')}</Button>
          <Button
            color="primary"
            onClick={handleCreate}
            disabled={!formData.name || (!currentBuilding && !formData.building)}
          >
            {t('blocWelcome.modal.create')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit Bloc Modal */}
      <Modal isOpen={openEditModal} toggle={() => setOpenEditModal(false)} centered>
        <ModalHeader toggle={() => setOpenEditModal(false)} className="bg-soft-success p-3">
          {t('blocWelcome.modal.editTitle')}: {formData.name}
        </ModalHeader>
        <ModalBody className="py-3 px-5">
          <Form>
            <FormGroup className="mb-3">
              <Label className="form-label">{t('blocWelcome.modal.blocName')} <span className="text-danger">*</span></Label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('blocWelcome.modal.blocNamePlaceholder')}
              />
            </FormGroup>

            {!currentBuilding && (
              <FormGroup>
                <Label className="form-label">{t('blocWelcome.modal.building')} <span className="text-danger">*</span></Label>
                <select
                  className="form-select"
                  value={formData.building}
                  onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                >
                  <option value="">{t('blocWelcome.modal.selectBuilding')}</option>
                  {buildings.map(building => (
                    <option key={building._id} value={building._id}>{building.name}</option>
                  ))}
                </select>
              </FormGroup>
            )}
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setOpenEditModal(false)}>{t('blocWelcome.modal.cancel')}</Button>
          <Button
            color="success"
            onClick={handleEdit}
            disabled={!formData.name}
          >
            {t('blocWelcome.modal.update')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={confirmDeleteModal} toggle={() => setConfirmDeleteModal(false)} centered>
        <ModalHeader toggle={() => setConfirmDeleteModal(false)} className="bg-soft-danger p-3">
          {t('blocWelcome.modal.delete')}
        </ModalHeader>
        <ModalBody className="py-3 px-5">
          <div className="text-center">
            <div className="avatar-lg mx-auto mb-4">
              <div className="avatar-title bg-light text-danger display-3 rounded-circle">
                <i className="ri-delete-bin-5-line"></i>
              </div>
            </div>
            <h4>{t('blocWelcome.modal.confirmDelete')}</h4>
            <p className="text-muted mx-4">
              {t('blocWelcome.modal.deleteWarning')}
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setConfirmDeleteModal(false)}>{t('blocWelcome.modal.cancel')}</Button>
          <Button color="danger" onClick={handleDelete}>{t('blocWelcome.modal.delete')}</Button>
        </ModalFooter>
      </Modal>
  <style jsx>{`
      /* Bloc Card Styling */
.bloc-card {
  transition: all 0.3s ease;
  border: 1px solid #e9e9ef;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
  overflow: hidden;
  cursor: pointer;
}

.bloc-card:hover {
  transform: translateX(8px);
  box-shadow: 0 5px 15px rgba(58, 87, 232, 0.15);
  border-color: rgba(58, 87, 232, 0.1);
}

.bloc-card:hover .card-header {
  background-color: rgba(58, 87, 232, 0.05) !important;
}

.bloc-card:hover .card-title {
  color: #3a57e8;
}

.bloc-icon-wrapper {
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.bloc-card:hover .bloc-icon-wrapper {
  transform: scale(1.05);
  box-shadow: 0 0 0 4px rgba(58, 87, 232, 0.1);
  background-color: #ffffff !important;
}

.bloc-card:hover .avatar-title {
  background-color: #3a57e8;
  color: #ffffff !important;
}

.bloc-stats {
  transition: all 0.3s ease;
}

.bloc-card:hover .bloc-stats {
  background-color: #f8f9fa !important;
  border: 1px solid rgba(58, 87, 232, 0.1);
}

.bloc-card:hover .bloc-stats h5 {
  color: #3a57e8;
}

.bloc-action-btn {
  transition: all 0.2s ease;
}

.bloc-card:hover .btn-soft-primary {
  background-color: rgba(58, 87, 232, 0.2);
  color: #3a57e8;
}

.bloc-card:hover .btn-soft-danger {
  background-color: rgba(244, 106, 106, 0.2);
  color: #f46a6a;
}

/* Add a subtle glow effect on hover */
.bloc-card:hover {
  box-shadow: 0 8px 24px rgba(58, 87, 232, 0.15), 0 0 0 1px rgba(58, 87, 232, 0.08);
}

@media (max-width: 767.98px) {
  .bloc-card:hover {
    transform: translateX(5px);
  }
}
    `}</style>
    </div>
  );
};

export default withTranslation()(BuildingBlocs);