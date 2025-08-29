import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Outlet, useNavigate } from 'react-router-dom';
import { FaTrash, FaEdit, FaPlus, FaSearch, FaBuilding, FaMapMarkerAlt, FaIdCard, FaHome, FaLayerGroup, FaUsers, FaFilter } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import { fetchBuildings, deleteBuilding } from '../../slices/buildings/building';
import buildingImage from "../../assets/images/build3.jpg";
import buildingHeaderImage from "../../assets/images/buildings-hero.png";
import "./buildingstyle.css";
import {
    Button,
    Card,
    CardBody,
    Container,
    Row,
    Col,
    Badge,
    FormGroup,
    Label,
    Input,
    InputGroup,
    InputGroupText,
    Pagination,
    PaginationItem,
    PaginationLink,
    CardFooter
} from 'reactstrap';
import DeleteModal from '../Common/DeleteModal';
import PropertyNavigation from './tabnavigarion';
import EditBuildingModal from './EditBuildingModal';
import CreateBuildingModal from './CreateBuildingModal';
import BreadCrumb from '../Common/BreadCrumb';
import { withTranslation } from "react-i18next";
import { canAddBuilding, getBuildingLimit, canAddApartment, isInTrialPeriod, extractFeatureValue } from '../Subscriptions/SubcriptionValidator';

const BuildingInterface = ({ t }) => {
    document.title = `${t('buildings.title')} | Nestleo`;
    const currentBuilding = useSelector(state => state.Building.currentBuilding);

    const user = useSelector(state => state.Loginn.user || {})
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { buildings = [] } = useSelector((state) => state.Building.buildings || []);
    const loading = useSelector((state) => state.Building.loading);
    const error = useSelector((state) => state.Building.error);

    const [deleteModal, setDeleteModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [openCreateModal, setOpenCreateModal] = useState(false);
    const [openEditModal, setOpenEditModal] = useState(false);
    const [itemsPerPage, setItemsPerPage] = useState(6);
    const [currentPage, setCurrentPage] = useState(1);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
    const [cityFilter, setCityFilter] = useState('all');
    const [editFormData, setEditFormData] = useState(null);

    // Building limit functions
    const checkBuildingLimit = () => {
        return canAddBuilding(user);
    };

    const getBuildingLimitDisplay = () => {
        return getBuildingLimit(user);
    };

    const isApproachingBuildingLimit = () => {
        if (!canCreate) return false;

        // If user is in trial period, never approaching limit
        if (isInTrialPeriod(user)) {
            return false;
        }

        if (!user?.subscription?.planId?.features) {
            return false;
        }

        const maxBuildings = extractFeatureValue(user.subscription.planId.features, "Nombre d'immeubles");

        // If unlimited, never approaching limit
        if (maxBuildings === -1 || maxBuildings === null) {
            return false;
        }

        return buildings.length >= (maxBuildings * 0.8);
    };

    const canCreate = checkBuildingLimit();
    const buildingLimit = getBuildingLimitDisplay();
    const buildingCount = buildings?.length || 0;
    const approachingLimit = isApproachingBuildingLimit();

    // Apartment limit functions
    const checkApartmentLimit = (building = null) => {
        // If user is in trial period, allow unlimited apartments
        if (isInTrialPeriod(user)) {
            return true;
        }

        return canAddApartment(user, building?._id);
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

    const isApproachingApartmentLimit = (building = null) => {
        // If user is in trial period, never approaching limit
        if (isInTrialPeriod(user)) {
            return false;
        }

        if (!user?.subscription?.planId?.features || !building) {
            return false;
        }

        const maxApartments = extractFeatureValue(user.subscription.planId.features, "Appartements par immeuble");

        // If unlimited, never approaching limit
        if (maxApartments === -1 || maxApartments === null) {
            return false;
        }

        const apartmentCount = building.blocs?.reduce(
            (total, bloc) => total + (bloc.apartments?.length || 0), 0
        ) || 0;

        return apartmentCount >= (maxApartments * 0.8);
    };

    const apartmentLimit = getApartmentLimitDisplay();
    const canAddApartmentsToBuilding = checkApartmentLimit(editFormData);
    const buildingApartmentCount = editFormData ? editFormData.blocs?.reduce(
        (total, bloc) => total + (bloc.apartments?.length || 0), 0
    ) || 0 : 0;
    const approachingApartmentLimit = isApproachingApartmentLimit(editFormData);

    // Get unique cities from buildings
    const cities = [...new Set(buildings.map(building => building.address_city).filter(Boolean))];

    // Filter buildings based on search term and other filters
    const filteredBuildings = buildings.filter(building => {
        // City filter
        if (cityFilter !== 'all' && building.address_city !== cityFilter) {
            return false;
        }

        // Search term filter
        if (searchTerm) {
            return (
                building.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                building.matricule?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                building.address_street?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                building.address_city?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return true;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredBuildings.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentBuildings = filteredBuildings.slice(indexOfFirstItem, indexOfLastItem);

    const toggleDropdown = () => setDropdownOpen(!dropdownOpen);
    const toggleFilterDropdown = () => setFilterDropdownOpen(!filterDropdownOpen);

    // Calculate building statistics
    const totalBuildings = buildings.length;
    const totalBlocs = buildings.reduce((acc, building) => acc + (building.blocs?.length || 0), 0);
    const totalApartments = buildings.reduce((acc, building) =>
        acc + building.blocs?.reduce((blocAcc, bloc) => blocAcc + (bloc.apartments?.length || 0), 0), 0) || 0;

    // Fetch buildings on mount and after changes
    useEffect(() => {
        dispatch(fetchBuildings());
    }, [dispatch]);

    // Reset to first page when search term or items per page changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, itemsPerPage, cityFilter]);

    // Handle delete building
    const handleDelete = () => {
        if (selectedBuilding) {
            dispatch(deleteBuilding(selectedBuilding._id))
                .unwrap()
                .then(() => {
                    toast.success(t('buildings.deleteSuccess'));
                    dispatch(fetchBuildings());
                    setDeleteModal(false);
                })
                .catch((err) => {
                    toast.error(err.message || t('buildings.deleteFailed'));
                });
        }
    };

    // Open edit modal with building data
    const handleOpenEditModal = (building) => {
        setEditFormData({
            ...building,
            blocs: building.blocs?.map(bloc => ({
                ...bloc,
                isExpanded: true // Expand all blocs in edit mode
            })) || []
        });
        setOpenEditModal(true);
    };

    // Navigate to building details
    const handleViewBuilding = (buildingId) => {
        navigate(`/buildings/${buildingId}`);
    };

    // Handlers for modal callbacks
    const handleBuildingCreated = () => {
        dispatch(fetchBuildings());
        setOpenCreateModal(false);
    };

    const handleBuildingUpdated = () => {
        dispatch(fetchBuildings());
        setOpenEditModal(false);
    };

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>

                    <BreadCrumb title={t('buildings.title')} pageTitle={t('buildings.pageTitle')} />

                    <PropertyNavigation />
                    <Outlet />

                    {/* Welcome Card with Statistics Badges (replaces Statistics Cards Row) */}
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
                                                <h4 className="fw-semibold mb-2">{t('buildings.title')}</h4>
                                                <p className="text-muted mb-3">{t('buildings.welcomeCard')}</p>
                                                {/* Statistics Badges */}
                                                <div className="d-flex flex-wrap gap-2">
                                                    <Badge color="primary" pill className="fs-12 py-2 px-3">
                                                        <FaBuilding className="me-1" /> {t('buildings.totalBuildings')}: {totalBuildings || 0}
                                                    </Badge>
                                                    <Badge color="success" pill className="fs-12 py-2 px-3">
                                                        <FaLayerGroup className="me-1" /> {t('buildings.totalBlocs')}: {totalBlocs || 0}
                                                    </Badge>
                                                    <Badge color="danger" pill className="fs-12 py-2 px-3">
                                                        <FaHome className="me-1" /> {t('buildings.totalApartments')}: {totalApartments || 0}
                                                    </Badge>
                                                    <Badge color="purple" pill className="fs-12 py-2 px-3" style={{ background: '#f3eafe', color: '#6f42c1' }}>
                                                        <FaBuilding className="me-1" /> {t('buildings.plan')}: {buildingLimit === "Unlimited"
                                                            ? t('buildings.unlimited')
                                                            : `${buildingCount || 0}/${buildingLimit || 0}`}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </Col>
                                        <Col md={4}>
                                            <div className="text-end">
                                                <Button
                                                    color="primary"
                                                    disabled={!canCreate}
                                                    title={!canCreate ? t('buildings.limitReached', { limit: buildingLimit }) : ""}
                                                    onClick={() => setOpenCreateModal(true)}
                                                >
                                                    <i className="ri-add-line align-bottom me-1"></i> {t('buildings.addBuilding')}
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
                    <Card className="mb-4">
                        <CardBody>
                            <Row className="align-items-end g-3">
                                <Col sm={6} lg={3}>
                                    <FormGroup>
                                        <Label className="form-label">{t('buildings.search')}</Label>
                                        <div className="search-box">
                                            <Input
                                                type="text"
                                                className="form-control search"
                                                placeholder={t('buildings.searchPlaceholder')}
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                            <i className="ri-search-line search-icon"></i>
                                            {searchTerm && (
                                                <Button
                                                    color="link"
                                                    className="p-0 px-2 position-absolute end-0 top-0 h-100"
                                                    onClick={() => setSearchTerm("")}
                                                    title={t('buildings.clearSearch')}
                                                    style={{ zIndex: 10 }}
                                                >
                                                    <i className="ri-close-line"></i>
                                                </Button>
                                            )}
                                        </div>
                                    </FormGroup>
                                </Col>
                                <Col sm={6} lg={3}>
                                    <FormGroup>
                                        <Label className="form-label">{t('buildings.filterByCity')}</Label>
                                        <select
                                            className="form-select"
                                            value={cityFilter}
                                            onChange={(e) => setCityFilter(e.target.value)}
                                        >
                                            <option value="all">{t('buildings.allCities')}</option>
                                            {cities.map((city, index) => (
                                                <option key={index} value={city}>{city}</option>
                                            ))}
                                        </select>
                                    </FormGroup>
                                </Col>
                                <Col sm={6} lg={3}>
                                    <FormGroup>
                                        <Label className="form-label">{t('buildings.buildingsPerPage')}</Label>
                                        <select
                                            className="form-select"
                                            value={itemsPerPage}
                                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                        >
                                            <option value={6}>6</option>
                                            <option value={12}>12</option>
                                            <option value={24}>24</option>
                                        </select>
                                    </FormGroup>
                                </Col>
                                <Col sm={6} lg={3}>
                                    <FormGroup>
                                        <Button
                                            color="primary"
                                            disabled={!canCreate}
                                            title={!canCreate ? t('buildings.limitReached', { limit: buildingLimit }) : ""}
                                            onClick={() => setOpenCreateModal(true)}
                                            className="w-100"
                                        >
                                            <i className="ri-add-line align-bottom me-1"></i> {t('buildings.addBuilding')}
                                        </Button>
                                    </FormGroup>
                                </Col>
                            </Row>
                        </CardBody>
                    </Card>

                    {/* Building Grid */}
                    <div className="mt-4 mb-5" style={{ paddingLeft: "15px" }}>
                        {loading ? (
                            <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "400px" }}>
                                <div className="spinner-border avatar-lg text-primary" role="status"></div>
                            </div>
                        ) : currentBuildings.length > 0 ? (
                            <Row>
                                {currentBuildings.map((building) => (
                                    <Col xxl={4} xl={6} md={6} className="mb-4" key={building._id}>
                                        <Card className="building-card card-height-100">
                            <div className="card-header align-items-center d-flex bg-light bg-opacity-75 border-bottom-0 p-2">
                                <h5 className="card-title mb-0 flex-grow-1">
                                    {building.name || "N/A"}
                                </h5>
                                <div className="flex-shrink-0">
                                    {/* Only show buttons if this building is the current selected building */}
                                    {currentBuilding && currentBuilding._id === building._id && (
                                        <div className="d-flex gap-1">
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-icon btn-soft-primary"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenEditModal(building);
                                                }}
                                            >
                                                <i className="ri-pencil-fill"></i>
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-icon btn-soft-danger"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedBuilding(building);
                                                    setDeleteModal(true);
                                                }}
                                            >
                                                <i className="ri-delete-bin-fill"></i>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>                                            <div
                                                className="building-image position-relative cursor-pointer"
                                                onClick={() => handleViewBuilding(building._id)}
                                            >
                                                <img
                                                    src={buildingImage}
                                                    alt={building.name || "Building"}
                                                    className="img-fluid w-100 h-100 object-fit-cover"
                                                />
                                                <div className="building-image-overlay"></div>
                                            </div>

                                            <CardBody className="p-3">
                                                <div className="d-flex flex-column gap-2 mb-3">
                                                    <div className="d-flex align-items-center">
                                                        <FaIdCard className="text-muted me-2" style={{ minWidth: '14px' }} />
                                                        <span>{building.matricule || t('buildings.noId')}</span>
                                                    </div>
                                                    <div className="d-flex align-items-center">
                                                        <FaMapMarkerAlt className="text-danger me-2" style={{ minWidth: '14px' }} />
                                                        <span className="text-muted">{`${building.address_street}, ${building.address_city}`}</span>
                                                    </div>
                                                </div>

                                                <div className="bg-light p-3 rounded-3">
                                                    <Row className="g-0 text-center">
                                                        <Col xs={6} className="border-end">
                                                            <div className="py-3">
                                                                <h5 className="mb-0 fw-semibold">{building.blocs?.length || 0}</h5>
                                                                <p className="text-muted mb-0">
                                                                    <FaLayerGroup className="text-primary me-1" size={12} /> {t('buildings.blocs')}
                                                                </p>
                                                            </div>
                                                        </Col>
                                                        <Col xs={6}>
                                                            <div className="py-3">
                                                                <h5 className="mb-0 fw-semibold">
                                                                    {building.blocs?.reduce((total, bloc) => total + (bloc.apartments?.length || 0), 0) || 0}
                                                                </h5>
                                                                <p className="text-muted mb-0">
                                                                    <FaHome className="text-success me-1" size={12} /> {t('buildings.apartments')}
                                                                </p>
                                                            </div>
                                                        </Col>
                                                    </Row>
                                                </div>
                                            </CardBody>
                                        </Card>
                                    </Col>
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
                                    <h5 className="mt-2">{t('buildings.noBuildingsFound')}</h5>
                                    <p className="text-muted mb-0">
                                        {searchTerm || cityFilter !== 'all' ? (
                                            <>{t('buildings.noMatchingBuildings')}</>
                                        ) : (t('buildings.addFirstBuilding'))}
                                    </p>

                                    {(searchTerm || cityFilter !== 'all') && (
                                        <Button color="light" className="mt-3" onClick={() => { setSearchTerm(''); setCityFilter('all'); }}>
                                            <i className="ri-delete-bin-line me-1 align-bottom"></i> {t('buildings.clearFilters')}
                                        </Button>
                                    )}

                                    {!searchTerm && cityFilter === 'all' && (
                                        <Button color="primary" className="mt-3" onClick={() => setOpenCreateModal(true)}>
                                            <i className="ri-add-line me-1 align-bottom"></i> {t('buildings.addBuilding')}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {filteredBuildings.length > itemsPerPage && (
                        <Row>
                            <Col lg={12}>
                                <div className="pagination-wrap hstack justify-content-between gap-2 mb-4">
                                    <div className="pagination-info">
                                        {t('buildings.showing', {
                                            start: indexOfFirstItem + 1,
                                            end: Math.min(indexOfLastItem, filteredBuildings.length),
                                            total: filteredBuildings.length
                                        })}
                                    </div>
                                    <ul className="pagination listjs-pagination mb-0">
                                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                            <Button
                                                color="light"
                                                onClick={() => setCurrentPage(currentPage - 1)}
                                                disabled={currentPage === 1}
                                            >
                                                <i className="mdi mdi-chevron-left"></i>
                                            </Button>
                                        </li>
                                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                            let pageToShow;
                                            if (totalPages <= 5) {
                                                pageToShow = i + 1;
                                            } else if (currentPage <= 3) {
                                                pageToShow = i + 1;
                                            } else if (currentPage >= totalPages - 2) {
                                                pageToShow = totalPages - 4 + i;
                                            } else {
                                                pageToShow = currentPage - 2 + i;
                                            }

                                            return (
                                                <li key={i} className={pageToShow === currentPage ? "active" : ""}>
                                                    <Button
                                                        color={pageToShow === currentPage ? "primary" : "light"}
                                                        onClick={() => setCurrentPage(pageToShow)}
                                                    >
                                                        {pageToShow}
                                                    </Button>
                                                </li>
                                            );
                                        })}
                                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                            <Button
                                                color="light"
                                                onClick={() => setCurrentPage(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                            >
                                                <i className="mdi mdi-chevron-right"></i>
                                            </Button>
                                        </li>
                                    </ul>
                                </div>
                            </Col>
                        </Row>
                    )}

                    {/* Modals */}
                    <CreateBuildingModal
                        isOpen={openCreateModal}
                        toggle={() => setOpenCreateModal(false)}
                        canCreate={canCreate}
                        approachingLimit={approachingLimit}
                        buildingLimit={buildingLimit}
                        buildingCount={buildingCount}
                        user={user}
                        onSuccess={handleBuildingCreated}
                        t={t}
                    />

                    <EditBuildingModal
                        isOpen={openEditModal}
                        toggle={() => setOpenEditModal(false)}
                        buildingData={editFormData}
                        canAddApartmentsToBuilding={canAddApartmentsToBuilding}
                        approachingApartmentLimit={approachingApartmentLimit}
                        apartmentLimit={apartmentLimit}
                        buildingApartmentCount={buildingApartmentCount}
                        canCreate={canCreate}
                        approachingLimit={approachingLimit}
                        buildingLimit={buildingLimit}
                        buildingCount={buildingCount}
                        onSuccess={handleBuildingUpdated}
                        t={t}
                    />

                    <ToastContainer />
                    <DeleteModal
                        show={deleteModal}
                        onDeleteClick={handleDelete}
                        onCloseClick={() => setDeleteModal(false)}
                    />
                </Container>
            </div>


            <style jsx>{`
            /* Add these styles to your existing CSS file */

.building-card {
  transition: all 0.3s ease;
  border: 1px solid #e9e9ef;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
  overflow: hidden;
}

.building-card:hover {
  transform: translateX(8px);
  box-shadow: 0 5px 15px rgba(58, 87, 232, 0.15);
  border-color: rgba(58, 87, 232, 0.1);
}

.building-image {
  height: 180px;
  overflow: hidden;
  transition: transform 0.3s ease;
}

.building-card:hover .building-image {
  transform: scale(1.03);
}

.building-image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0) 70%, rgba(0,0,0,0.4));
  pointer-events: none;
  transition: background 0.3s ease;
}

.building-card:hover .building-image-overlay {
  background: linear-gradient(to bottom, rgba(0,0,0,0.1) 70%, rgba(0,0,0,0.5));
}

.building-card .card-header {
  transition: background-color 0.3s ease;
}

.building-card:hover .card-header {
  background-color: rgba(58, 87, 232, 0.05) !important;
}

.building-card:hover .card-title {
  color: #3a57e8;
}

.building-card:hover .btn-soft-primary {
  background-color: rgba(58, 87, 232, 0.2);
}

.building-card:hover .btn-soft-danger {
  background-color: rgba(244, 106, 106, 0.2);
}

/* Make the stats section more appealing on hover */
.building-card:hover .bg-light {
  background-color: #f8f9fa !important;
  border: 1px solid rgba(58, 87, 232, 0.1);
}

/* Add a subtle glow effect on hover */
.building-card:hover {
  box-shadow: 0 8px 24px rgba(58, 87, 232, 0.15), 0 0 0 1px rgba(58, 87, 232, 0.08);
}
  `} </style>
        </React.Fragment>
    );
};

export default withTranslation()(BuildingInterface);