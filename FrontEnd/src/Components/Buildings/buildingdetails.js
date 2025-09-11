import { fetchBuildingById, clearCurrentBuilding, clearSelectedBuilding } from '../../slices/buildings/building';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  CardTitle,
  CardText,
  Badge,
  Button,
  ListGroup,
  ListGroupItem,
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane
} from 'reactstrap';
import { FaBuilding, FaMapMarkerAlt, FaIdCard, FaGlobe, FaLayerGroup, FaHome, FaUsers, FaArrowLeft, FaEllipsisV, FaExchangeAlt } from 'react-icons/fa';
import classnames from 'classnames';
import BreadCrumb from '../Common/BreadCrumb';
import buildingImage from "../../assets/images/office-building.png";
import BuildingTransferStatus from './BuildingTransferStatus';
import { withTranslation } from "react-i18next";
import BuildingTransferModal from './BuildingTransferModal';

const BuildingDetails = ({ t }) => {
  const { buildingId } = useParams();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.Building);
  const user = useSelector((state) => state.Loginn.user || {});

  const selectedBuilding = useSelector((state) => state.Building.selectedBuilding);

  const navigate = useNavigate();

  // Local state for modals and dropdowns
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [actionsDropdownOpen, setActionsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    dispatch(fetchBuildingById(buildingId));
    console.log(selectedBuilding)
    return () => {
      dispatch(clearSelectedBuilding());
    };
  }, [dispatch, buildingId]);

  const toggleTransferModal = () => setTransferModalOpen(!transferModalOpen);
  const toggleActionsDropdown = () => setActionsDropdownOpen(!actionsDropdownOpen);
  const toggleTab = (tab) => {
    if (activeTab !== tab) setActiveTab(tab);
  };

  // Check if current user is the owner of the building
  const isOwner = selectedBuilding?.building?.user === user._id || 
                  selectedBuilding?.building?.user?._id === user._id ||
                  selectedBuilding?.building?.user?.toString() === user._id?.toString();

  // Debug logging
  console.log('Building user:', selectedBuilding?.building?.user);
  console.log('Current user ID:', user._id);
  console.log('Is owner:', isOwner);

  if (loading) return <Container className="text-center my-5"><Card><CardBody>{t('buildingDetails.loading')}</CardBody></Card></Container>;
  if (error) return <Container className="text-center my-5"><Card><CardBody className="text-danger">{t('buildingDetails.error')}: {error}</CardBody></Card></Container>;
  if (!selectedBuilding || !selectedBuilding.building) return <Container className="text-center my-5"><Card><CardBody>{t('buildingDetails.notFound')}</CardBody></Card></Container>;

  const { building } = selectedBuilding;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title={t('buildingDetails.title')} pageTitle={t('buildingDetails.pageTitle')} />

        <Row className="mb-4">
          <Col>
            <Card className="shadow-sm border-0 rounded-3">
              <CardBody>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div>
                    <CardTitle tag="h4" className="mb-1">
                      <img
                        src={buildingImage}
                        alt={t('buildingDetails.buildingIcon')}
                        className="align-middle me-2"
                        style={{ width: "100px", height: "100px" }}
                      />
                      {building.name}
                    </CardTitle>
                    <CardText className="text-muted mb-0">
                      <FaMapMarkerAlt className="me-2" />
                      {building.address_street}, {building.address_number}, {building.address_city}
                    </CardText>
                  </div>
                  <div className="d-flex gap-2">
                    <Button
                      color="primary"
                      outline
                      onClick={() => navigate('/BuildingInterface')}
                      className="d-flex align-items-center"
                    >
                      <FaArrowLeft className="me-2" />
                      {t('buildingDetails.backToList')}
                    </Button>

                    {(isOwner || user.role === 'SyndicateAdmin') && (
                      <Dropdown isOpen={actionsDropdownOpen} toggle={toggleActionsDropdown}>
                        <DropdownToggle caret color="secondary" outline>
                          <FaEllipsisV className="me-2" />
                          {t('buildingDetails.actions')}
                        </DropdownToggle>
                        <DropdownMenu>
                          <DropdownItem onClick={toggleTransferModal}>
                            <FaExchangeAlt className="me-2" />
                            {t('buildingDetails.transferBuilding')}
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    )}
                  </div>
                </div>

                {/* Navigation Tabs */}
                <Nav tabs className="mb-4">
                  <NavItem>
                    <NavLink
                      className={classnames({ active: activeTab === 'overview' })}
                      onClick={() => toggleTab('overview')}
                      style={{ cursor: 'pointer' }}
                    >
                      <FaBuilding className="me-2" />
                      {t('buildingDetails.overview')}
                    </NavLink>
                  </NavItem>
                  {isOwner && (
                    <NavItem>
                      <NavLink
                        className={classnames({ active: activeTab === 'transfers' })}
                        onClick={() => toggleTab('transfers')}
                        style={{ cursor: 'pointer' }}
                      >
                        <FaExchangeAlt className="me-2" />
                        {t('buildingTransfer.pendingTransfers')}
                        {building.transferStatus && building.transferStatus !== 'none' && (
                          <Badge color="warning" pill className="ms-2">1</Badge>
                        )}
                      </NavLink>
                    </NavItem>
                  )}
                </Nav>

                {/* Tab Content */}
                <TabContent activeTab={activeTab}>
                  <TabPane tabId="overview">
                    <Row>
                  {/* Main Building Info */}
                  <Col md={6}>
                    <Card className="shadow-sm border-0 mb-4">
                      <CardBody>
                        <CardTitle tag="h5" className="border-bottom pb-2 mb-3">
                          <FaBuilding className="me-2" />
                          {t('buildingDetails.buildingInformation')}
                        </CardTitle>

                        <ListGroup flush>
                          <ListGroupItem className="d-flex justify-content-between align-items-center border-0 py-2">
                            <span className="text-muted">
                              <FaIdCard className="me-2" />
                              {t('buildingDetails.matricule')}:
                            </span>
                            <span>{building.matricule || t('buildingDetails.na')}</span>
                          </ListGroupItem>

                          <ListGroupItem className="d-flex justify-content-between align-items-center border-0 py-2">
                            <span className="text-muted">
                              <FaMapMarkerAlt className="me-2" />
                              {t('buildingDetails.address')}:
                            </span>
                            <span>{building.address_street}, {building.address_number}</span>
                          </ListGroupItem>

                          <ListGroupItem className="d-flex justify-content-between align-items-center border-0 py-2">
                            <span className="text-muted">
                              <FaMapMarkerAlt className="me-2" />
                              {t('buildingDetails.city')}:
                            </span>
                            <span>{building.address_city || t('buildingDetails.na')}</span>
                          </ListGroupItem>

                          <ListGroupItem className="d-flex justify-content-between align-items-center border-0 py-2">
                            <span className="text-muted">
                              <FaGlobe className="me-2" />
                              {t('buildingDetails.country')}:
                            </span>
                            <span>{building.address_country || t('buildingDetails.na')}</span>
                          </ListGroupItem>
                        </ListGroup>
                      </CardBody>
                    </Card>
                  </Col>

                  {/* Stats */}
                  <Col md={6}>
                    <Card className="shadow-sm border-0 mb-4">
                      <CardBody>
                        <CardTitle tag="h5" className="border-bottom pb-2 mb-3">
                          <FaLayerGroup className="me-2" />
                          {t('buildingDetails.buildingStatistics')}
                        </CardTitle>

                        <div className="d-flex flex-wrap gap-3">
                          <div className="bg-light rounded p-3 flex-grow-1 text-center">
                            <h6 className="text-muted mb-1">{t('buildingDetails.totalBlocs')}</h6>
                            <h4 className="mb-0">
                              <Badge color="info" className="p-2">
                                <FaLayerGroup className="me-1" />
                                {building.blocs?.length || 0}
                              </Badge>
                            </h4>
                          </div>

                          <div className="bg-light rounded p-3 flex-grow-1 text-center">
                            <h6 className="text-muted mb-1">{t('buildingDetails.totalApartments')}</h6>
                            <h4 className="mb-0">
                              <Badge color="info" className="p-2">
                                <FaHome className="me-1" />
                                {building.blocs?.reduce((total, bloc) => total + (bloc.apartments?.length || 0), 0)}
                              </Badge>
                            </h4>
                          </div>

                          <div className="bg-light rounded p-3 flex-grow-1 text-center">
                            <h6 className="text-muted mb-1">{t('buildingDetails.coOwners')}</h6>
                            <h4 className="mb-0">
                              <Badge color="info" className="p-2">
                                <FaUsers className="me-1" />
                                {building.coOwners?.length || 0}
                              </Badge>
                            </h4>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </Col>
                </Row>

                {/* Blocs Section */}
                <Row>
                  <Col md={8}>
                    <Card className="shadow-sm border-0 mb-4">
                      <CardBody>
                        <CardTitle tag="h5" className="border-bottom pb-2 mb-3">
                          <FaLayerGroup className="me-2" />
                          {t('buildingDetails.buildingBlocs')}
                        </CardTitle>

                        {building.blocs?.length > 0 ? (
                          building.blocs.map((bloc) => (
                            <Card key={bloc._id} className="shadow-sm border-0 mb-3">
                              <CardBody>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                  <CardTitle tag="h6" className="mb-0">
                                    <FaLayerGroup className="me-2 text-info" />
                                    {bloc.name}
                                  </CardTitle>
                                  <Badge color="info">
                                    {bloc.apartments?.length || 0} {t('buildingDetails.apartments')}
                                  </Badge>
                                </div>

                                {bloc.apartments?.length > 0 ? (
                                  <div className="d-flex flex-wrap gap-2 mt-3">
                                    {bloc.apartments.map((apartment) => (
                                      <Badge
                                        key={apartment._id}
                                        color="light"
                                        className="text-dark border"
                                      >
                                        <FaHome className="me-1" />
                                        #{apartment.number} ({t('buildingDetails.floor')} {apartment.floor})
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <CardText className="text-muted mt-2">
                                    {t('buildingDetails.noApartmentsInBloc')}
                                  </CardText>
                                )}
                              </CardBody>
                            </Card>
                          ))
                        ) : (
                          <CardText className="text-muted">
                            {t('buildingDetails.noBlocsFound')}
                          </CardText>
                        )}
                      </CardBody>
                    </Card>
                  </Col>

                  {/* Co-Owners Section */}
                  <Col md={4}>
                    <Card className="shadow-sm border-0">
                      <CardBody>
                        <CardTitle tag="h5" className="border-bottom pb-2 mb-3">
                          <FaUsers className="me-2" />
                          {t('buildingDetails.coOwners')}
                        </CardTitle>

                        {building.coOwners?.length > 0 ? (
                          <ListGroup flush>
                            {building.coOwners.map((coOwner) => (
                              <ListGroupItem key={coOwner._id} className="border-0 py-2">
                                <div className="d-flex align-items-center">
                                  <div className="flex-grow-1">
                                    <h6 className="mb-0">
                                      {coOwner.firstName ? `${coOwner.firstName} ${coOwner.lastName}` : coOwner.email}
                                    </h6>
                                    <small className="text-muted">
                                      {coOwner.email}
                                    </small>
                                  </div>
                                </div>
                              </ListGroupItem>
                            ))}
                          </ListGroup>
                        ) : (
                          <CardText className="text-muted">
                            {t('buildingDetails.noCoOwnersFound')}
                          </CardText>
                        )}
                      </CardBody>
                    </Card>
                  </Col>
                </Row>
                  </TabPane>
                  
                  {/* Transfers Tab */}
                  {isOwner && (
                    <TabPane tabId="transfers">
                      <BuildingTransferStatus 
                        building={building}
                      />
                    </TabPane>
                  )}
                </TabContent>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Building Transfer Modal */}
      {selectedBuilding?.building && (
        <BuildingTransferModal
          isOpen={transferModalOpen}
          toggle={toggleTransferModal}
          building={selectedBuilding.building}
          t={t}
        />
      )}
    </div>
  );
};

export default withTranslation()(BuildingDetails);