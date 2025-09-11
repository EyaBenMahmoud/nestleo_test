import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Input,
  Alert,
  Spinner,
  Card,
  CardBody,
  Badge,
  Button,
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Label
} from 'reactstrap';
import { fetchOwnerAppartements, fetchAllOwnerApartments, joinBuilding, fetchBuildingAssociations } from '../../slices/buildings/building';
import {
  FaSearch,
  FaHome,
  FaFilter,
  FaSortAmountDown,
  FaSortAmountUp,
  FaBed,
  FaMapMarkerAlt,
  FaLayerGroup,
  FaUsers,
  FaBuilding,
  FaRegBuilding,
  FaInfoCircle,
  FaPlusCircle,
  FaKey
} from 'react-icons/fa';
import apartmentImage from "../../assets/images/Build.png";
import { useTranslation } from 'react-i18next';
import BreadCrumb from '../Common/BreadCrumb';
import { toast } from 'react-toastify';

const ApartmentsList = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const currentBuilding = useSelector(state => state.Building.currentBuilding);
  const {
    apartments = [],
    loading,
    error
  } = useSelector(state => ({
    apartments: state.Building.ownerApartments.apartments || [],
    loading: state.Building.ownerApartments.loading || false,
    error: state.Building.ownerApartments.error || null
  }));

  // State for search, sorting and filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('number');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filterFloor, setFilterFloor] = useState('');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  // Join Building Modal States
  const [joinBuildingModal, setJoinBuildingModal] = useState(false);
  const [matricule, setMatricule] = useState('');
  const [matriculeError, setMatriculeError] = useState('');
  const [joiningBuilding, setJoiningBuilding] = useState(false);

  const toggleFilterDropdown = () => setFilterDropdownOpen(!filterDropdownOpen);
  const toggleSortDropdown = () => setSortDropdownOpen(!sortDropdownOpen);
  const toggleJoinBuildingModal = () => {
    setJoinBuildingModal(!joinBuildingModal);
    if (!joinBuildingModal) {
      // Reset form when opening
      setMatricule('');
      setMatriculeError('');
    }
  };
  // Ajouter cet état
  const [buildingAssociations, setBuildingAssociations] = useState([]);
  const [pendingBuildings, setPendingBuildings] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Charger les associations pour les copropriétaires
        const user = useSelector(state => state.Loginn.user || {});

        if (user.role === "SyndicateCoowner") {
          const associations = await dispatch(fetchBuildingAssociations());
          setBuildingAssociations(associations);

          // Filtrer les immeubles en attente d'approbation
          const pending = associations.filter(assoc => !assoc.isActive)
            .map(assoc => assoc.building);
          setPendingBuildings(pending);
        }

        // Continuer avec la logique existante
        if (currentBuilding?._id) {
          dispatch(fetchOwnerAppartements(currentBuilding._id));
        } else {
          dispatch(fetchAllOwnerApartments());
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [dispatch, currentBuilding?._id]);

  // Get unique floors for filter dropdown
  const uniqueFloors = Array.isArray(apartments)
    ? [...new Set(apartments.filter(apt => apt?.floor).map(apt => apt.floor))].sort((a, b) => a - b)
    : [];

  // Filter apartments
  const filteredApartments = Array.isArray(apartments)
    ? apartments.filter(apartment => {
      if (!apartment) return false;

      // Apply search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        apartment.number?.toString().toLowerCase().includes(searchLower) ||
        apartment.floor?.toString().includes(searchTerm) ||
        apartment.owner?.name?.toLowerCase().includes(searchLower) ||
        apartment.bloc?.name?.toLowerCase().includes(searchLower);

      // Apply floor filter if active
      const matchesFloor = filterFloor ? apartment.floor === filterFloor : true;

      return matchesSearch && matchesFloor;
    })
    : [];

  // Sort apartments
  const sortedApartments = [...filteredApartments].sort((a, b) => {
    if (!a[sortField] && !b[sortField]) return 0;
    if (!a[sortField]) return 1;
    if (!b[sortField]) return -1;

    const valA = typeof a[sortField] === 'string' ? a[sortField].toLowerCase() : a[sortField];
    const valB = typeof b[sortField] === 'string' ? b[sortField].toLowerCase() : b[sortField];

    if (sortDirection === 'asc') {
      return valA > valB ? 1 : -1;
    } else {
      return valA < valB ? 1 : -1;
    }
  });

  // Function to handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Function to clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterFloor('');
    setSortField('number');
    setSortDirection('asc');
  };

  // Function to get apartment status
  const getApartmentStatus = (apartment) => {
    return apartment?.owner?.name ? t('apartments.owned') : t('apartments.available');
  };

  // Function to get color based on status
  const getStatusColor = (status) => {
    return status === t('apartments.owned') ? 'success' : 'warning';
  };

  // Function to handle joining a building
  const handleJoinBuilding = async () => {
    if (!matricule.trim()) {
      setMatriculeError(t('apartments.enterMatricule'));
      return;
    }

    setJoiningBuilding(true);
    setMatriculeError('');

    try {
      const result = await dispatch(joinBuilding(matricule.trim())).unwrap();


      toast.success(t('apartments.joinSuccess'));
      toggleJoinBuildingModal();



    } catch (error) {
      console.error("Error joining building:", error);
      if (error?.message === "Building not found") {
        setMatriculeError(t('apartments.buildingNotFound'));
      } else if (error?.message === "You have already joined this building") {
        setMatriculeError(t('apartments.alreadyJoined'));
      } else {
        setMatriculeError(t('apartments.joinError'));
      }
    } finally {
      setJoiningBuilding(false);
    }
  };
  // Ajouter une section pour afficher les immeubles en attente d'approbation
  const renderPendingBuildings = () => {
    if (pendingBuildings.length === 0) return null;

    return (
      <Alert color="warning" className="mb-4">
        <h5><i className="ri-time-line me-2"></i>{t('apartments.pendingBuildings')}</h5>
        <p>{t('apartments.pendingBuildingsDescription')}</p>
        <ul className="mb-0">
          {pendingBuildings.map(building => (
            <li key={building._id}>
              {building.name} <small>({building.matricule})</small>
            </li>
          ))}
        </ul>
      </Alert>
    );
  };

  if (loading) return (
    <div className="apartments-page-content">
      <Container fluid className="apartments-container text-center py-5">
        <Spinner color="primary" />
        <p className="mt-3">{t('apartments.loading')}</p>
      </Container>
    </div>
  );

  if (error) return (
    <div className="apartments-page-content">
      <Container fluid className="apartments-container py-5">
        <Alert color="danger">
          {t('apartments.errorLoading')}: {error.message || String(error)}
        </Alert>
      </Container>
    </div>
  );

  return (
    <div style={{ marginTop: "85px" }}>
      <Container fluid >
        <BreadCrumb title={t('apartments.title')} pageTitle="Apartments" />
        {renderPendingBuildings()}
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
                      <h4 className="fw-semibold mb-2">{t('apartments.title')}</h4>
                      <p className="text-muted mb-3">{t('apartments.welcomeCard')}</p>

                      {/* Statistics Badges */}
                      <div className="d-flex flex-wrap gap-2">
                        <div className="d-flex flex-wrap gap-2">
                          {currentBuilding ? (
                            <Badge color="info" pill className="fs-12 py-2 px-3">
                              <FaBuilding className="me-1" /> {t('apartments.managing')}: {currentBuilding.name}
                            </Badge>
                          ) : (
                            <Badge color="primary" pill className="fs-12 py-2 px-3">
                              <FaRegBuilding className="me-1" /> {t('apartments.allProperties')}
                            </Badge>
                          )}
                        </div>
                        <Badge color="primary" pill className="fs-12 py-2 px-3">
                          <FaHome className="me-1" /> {t('apartments.total')}: {apartments.length}
                        </Badge>
                        <Badge color="success" pill className="fs-12 py-2 px-3">
                          <FaUsers className="me-1" /> {t('apartments.owned')}: {apartments.filter(apt => apt?.owner?.name).length}
                        </Badge>
                        <Badge color="warning" pill className="fs-12 py-2 px-3">
                          <FaInfoCircle className="me-1" /> {t('apartments.available')}: {apartments.filter(apt => !apt?.owner?.name).length}
                        </Badge>
                        <Badge color="info" pill className="fs-12 py-2 px-3">
                          <FaLayerGroup className="me-1" /> {t('apartments.floors')}: {uniqueFloors.length}
                        </Badge>
                      </div>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="text-end">
                      <div className="d-flex justify-content-end">
                        {/* Join Building Button */}
                        <Button color="primary" className="me-2" onClick={toggleJoinBuildingModal}>
                          <FaPlusCircle className="me-1" /> {t('apartments.joinBuilding')}
                        </Button>
                        <Button color="success" tag={Link} to="/calendar">
                          <i className="ri-calendar-line me-1"></i> {t('apartments.calendar')}
                        </Button>
                      </div>
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Search and Filter Card */}
        <Card className="mb-4 shadow-sm border-0">
          <CardBody>
            <Row className="g-3 align-items-center">
              <Col sm={12} md={4}>
                <div>
                  <h5 className="card-title mb-0">{t('apartments.search')}</h5>
                </div>
                <div className="search-box mt-2">
                  <Input
                    type="text"
                    className="form-control search"
                    placeholder={t('apartments.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <i className="ri-search-line search-icon"></i>
                  {searchTerm && (
                    <Button
                      color="link"
                      className="btn-close btn-close-lg"
                      style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)" }}
                      onClick={() => setSearchTerm("")}
                    ></Button>
                  )}
                </div>
              </Col>

              <Col sm={6} md={4}>
                <div>
                  <h5 className="card-title mb-0">{t('apartments.filter')}</h5>
                </div>
                <div>
                  <Dropdown isOpen={filterDropdownOpen} toggle={toggleFilterDropdown}>
                    <DropdownToggle color="light" className="w-100 mt-2 d-flex align-items-center justify-content-between">
                      <span>{filterFloor ? `${t('apartments.floor')} ${filterFloor}` : t('apartments.allFloors')}</span>
                      <FaFilter className="ms-2" />
                    </DropdownToggle>
                    <DropdownMenu className="w-100">
                      <DropdownItem header>{t('apartments.filterByFloor')}</DropdownItem>
                      <DropdownItem onClick={() => setFilterFloor('')}>{t('apartments.allFloors')}</DropdownItem>
                      <DropdownItem divider />
                      {uniqueFloors.map(floor => (
                        <DropdownItem key={floor} onClick={() => setFilterFloor(floor)}>
                          {t('apartments.floor')} {floor}
                        </DropdownItem>
                      ))}
                    </DropdownMenu>
                  </Dropdown>
                </div>
              </Col>

              <Col sm={6} md={4}>
                <div>
                  <h5 className="card-title mb-0">{t('apartments.sort')}</h5>
                </div>
                <div>
                  <Dropdown isOpen={sortDropdownOpen} toggle={toggleSortDropdown}>
                    <DropdownToggle color="light" className="w-100 mt-2 d-flex align-items-center justify-content-between">
                      <span>
                        {sortField === 'number' ? t('apartments.apartmentNumber') : t('apartments.floor')}
                        {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                      </span>
                      {sortDirection === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />}
                    </DropdownToggle>
                    <DropdownMenu className="w-100">
                      <DropdownItem header>{t('apartments.sortBy')}</DropdownItem>
                      <DropdownItem onClick={() => handleSort('number')}>
                        {t('apartments.apartmentNumber')} {sortField === 'number' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </DropdownItem>
                      <DropdownItem onClick={() => handleSort('floor')}>
                        {t('apartments.floor')} {sortField === 'floor' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
              </Col>
            </Row>
          </CardBody>
        </Card>

        {/* Apartments grid */}
        {filteredApartments.length === 0 ? (
          <Alert color="info" className="text-center border-0 shadow-sm rounded-3">
            <FaSearch className="me-2 fs-4" />
            {t('apartments.noApartmentsFound')} {searchTerm || filterFloor ? t('apartments.matchingSearch') : null}
            <div className="mt-2">

            </div>
          </Alert>
        ) : (
          <Row>
            {sortedApartments.map(apartment => (
              <Col key={apartment._id} lg="4" md="6" className="mb-4">
                <Card className="apartments-building-card shadow-sm border-0 rounded-3 h-100">
                  <CardBody>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h5 className="mb-1 d-flex align-items-center">
                          <img
                            src={apartmentImage}
                            alt="Apartment Icon"
                            className="me-2"
                            style={{ width: "80px", height: "80px" }}
                          />
                          <span>
                            {t('apartments.apartment')} #{apartment.number || "N/A"}
                          </span>
                        </h5>
                        <Badge
                          color={getStatusColor(getApartmentStatus(apartment))}
                          className="mt-2"
                        >
                          {getApartmentStatus(apartment)}
                        </Badge>
                      </div>
                    </div>

                    <div className="mb-3 border-top pt-3">
                      <div className="d-flex align-items-center mb-2">
                        <div className="text-primary me-2">
                          <FaLayerGroup />
                        </div>
                        <div>
                          <strong>{t('apartments.floor')}:</strong> {apartment.floor || "N/A"}
                        </div>
                      </div>

                      <div className="d-flex align-items-center mb-2">
                        <div className="text-primary me-2">
                          <FaMapMarkerAlt />
                        </div>
                        <div>
                          <strong>{t('apartments.bloc')}:</strong> {apartment.bloc?.name || "N/A"}
                        </div>
                      </div>

                      <div className="d-flex align-items-center">
                        <div className="text-primary me-2">
                          <FaBed />
                        </div>
                        <div>
                          <strong>{t('apartments.bedrooms')}:</strong> {apartment.bedrooms || "N/A"}
                        </div>
                      </div>
                    </div>

                    {apartment?.owner?.name && (
                      <div className="border-top pt-3">
                        <div className="d-flex align-items-center">
                          <div className="apartments-owner-icon rounded-circle bg-success bg-opacity-10 p-2 me-2">
                            <FaUsers className="text-success" />
                          </div>
                          <div>
                            <strong>{t('apartments.owner')}:</strong> {apartment.owner.name}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardBody>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        {/* Join Building Modal */}
        <Modal isOpen={joinBuildingModal} toggle={toggleJoinBuildingModal} centered>
          <ModalHeader toggle={toggleJoinBuildingModal}>
            <FaBuilding className="me-2" /> {t('apartments.joinBuildingTitle')}
          </ModalHeader>
          <ModalBody>
            <p className="text-muted">{t('apartments.joinBuildingDescription')}</p>
            <Form>
              <FormGroup>
                <Label for="matricule">{t('apartments.buildingCode')}</Label>
                <div className="position-relative">
                  <Input
                    type="text"
                    id="matricule"
                    value={matricule}
                    onChange={(e) => setMatricule(e.target.value)}
                    placeholder={t('apartments.enterBuildingCode')}
                    className={matriculeError ? "is-invalid" : ""}
                  />
                  <div className="position-absolute end-0 top-50 translate-middle-y px-3 text-muted">
                    <FaKey />
                  </div>
                </div>
                {matriculeError && <div className="invalid-feedback d-block">{matriculeError}</div>}
              </FormGroup>
            </Form>
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={toggleJoinBuildingModal}>
              {t('apartments.cancel')}
            </Button>
            <Button
              color="primary"
              onClick={handleJoinBuilding}
              disabled={joiningBuilding}
            >
              {joiningBuilding ? (
                <>
                  <Spinner size="sm" className="me-1" />
                  {t('apartments.joining')}
                </>
              ) : (
                <>
                  <FaPlusCircle className="me-1" /> {t('apartments.joinBuilding')}
                </>
              )}
            </Button>
          </ModalFooter>
        </Modal>

        {/* Scoped CSS */}
        <style>
          {`
            .apartments-page-content {
              background: #f8f9fa;
              padding: 2rem;
              min-height: 100vh;
            }
            
            .apartments-building-card {
              transition: all 0.3s ease;
            }
            
            .apartments-building-card:hover {
              transform: translateY(-5px);
              box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important;
            }
            
            .apartments-search-box {
              position: relative;
            }
            
            .apartments-search-box .form-control {
              padding-left: 1rem;
              padding-right: 2.5rem;
              height: 38px;
            }
            
            .apartments-search-icon {
              right: 15px;
              top: 50%;
              transform: translateY(-50%);
              color: #6c757d;
            }
            
            .apartments-dropdown-toggle, 
            .apartments-btn-outline {
              border-radius: 50rem;
              padding: 0.5rem 1rem;
              display: flex;
              align-items: center;
            }
            
            .apartments-stats-card:hover {
              transform: translateY(-3px);
              transition: transform 0.3s;
            }
            
            .apartments-icon-circle {
              min-width: 50px;
              min-height: 50px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            
            .apartments-owner-icon {
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .welcome-card {
              border-radius: 12px;
              overflow: hidden;
              position: relative;
              border: none;
              box-shadow: 0 4px 20px rgba(0,0,0,0.05);
            }

            .welcome-card .card-body {
              position: relative;
              z-index: 1;
            }
          `}
        </style>
      </Container>
    </div>
  );
};

export default ApartmentsList;