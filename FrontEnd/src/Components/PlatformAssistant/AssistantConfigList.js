import React, { useState, useEffect } from 'react';
import DataTable from 'react-data-table-component';
import { 
  Card, CardHeader, CardBody, Container, Row, Col, 
  Button, UncontrolledDropdown, DropdownToggle, DropdownMenu, 
  DropdownItem, Badge, Alert, Spinner,
  FormGroup, Label, Input
} from 'reactstrap';
import { useDispatch, useSelector } from 'react-redux';
import {
  getAllConfigs,
  activateConfig,
  deleteConfig,
  cloneConfig,
  clearSuccessMessage,
  clearError
} from '../../slices/Assistant/assistantConfigSlice';
import AssistantConfigModal from './AssistantConfigModal';
import DeleteModal from '../Common/DeleteModal';
import FeatherIcon from 'feather-icons-react';
import { withTranslation } from 'react-i18next';

const AssistantConfigList = ({ t }) => {
  const dispatch = useDispatch();
  const { list: configurations, loading, error, successMessage, actionInProgress } = useSelector(state => state.assistantConfig);
  const { user } = useSelector(state => state.Loginn || {});
  
  const [filterText, setFilterText] = useState('');
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (user?.role === 'SuperAdmin') {
      dispatch(getAllConfigs());
    }
  }, [dispatch, user]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        dispatch(clearSuccessMessage());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, dispatch]);

  const handleAdd = () => {
    setSelectedConfig(null);
    setIsEditing(false);
    setShowAddEditModal(true);
  };

  const handleEdit = (config) => {
    setSelectedConfig(config);
    setIsEditing(true);
    setShowAddEditModal(true);
  };

  const handleClone = (id) => {
    dispatch(cloneConfig(id));
  };

  const handleDelete = (config) => {
    setSelectedConfig(config);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (selectedConfig) {
      dispatch(deleteConfig(selectedConfig._id));
      setShowDeleteModal(false);
    }
  };

  const handleActivate = (id) => {
    dispatch(activateConfig(id));
  };

  const filteredItems = configurations.filter(
    item => item.version.toLowerCase().includes(filterText.toLowerCase())
  );

  const columns = [
    {
      name: <span className='font-weight-bold fs-13'>{t('assistantConfig.version')}</span>,
      selector: row => row.version,
      sortable: true,
      minWidth: '120px'
    },
    {
      name: <span className='font-weight-bold fs-13'>{t('assistantConfig.language')}</span>,
      selector: row => row.language || 'en',
      sortable: true,
      width: '100px'
    },
    {
      name: <span className='font-weight-bold fs-13'>{t('assistantConfig.status')}</span>,
      cell: row => (
        <Badge color={row.isActive ? 'success' : 'secondary'} pill>
          {row.isActive ? t('assistantConfig.active') : t('assistantConfig.inactive')}
        </Badge>
      ),
      sortable: true,
      width: '100px'
    },
    {
      name: <span className='font-weight-bold fs-13'>{t('assistantConfig.topics')}</span>,
      selector: row => row.topics?.length || 0,
      sortable: true,
      width: '100px'
    },
    {
      name: <span className='font-weight-bold fs-13'>{t('assistantConfig.keywords')}</span>,
      selector: row => row.keywords?.length || 0,
      sortable: true,
      width: '120px'
    },
    {
      name: <span className='font-weight-bold fs-13'>{t('assistantConfig.lastUpdated')}</span>,
      selector: row => new Date(row.updatedAt).toLocaleString(),
      sortable: true,
      minWidth: '180px'
    },
    {
        name: <span className='font-weight-bold fs-13'>{t('assistantConfig.actions')}</span>,
        cell: (row) => (
          <UncontrolledDropdown>
            <DropdownToggle tag="button" className="btn btn-soft-secondary btn-sm">
              <i className="ri-more-fill align-middle"></i>
            </DropdownToggle>
            <DropdownMenu end className="dropdown-menu-end position-fixed" style={{ minWidth: '150px', zIndex: 1000 }}>
              <DropdownItem onClick={() => handleEdit(row)}>
                <i className="ri-pencil-fill me-2"></i>{t('assistantConfig.edit')}
              </DropdownItem>
              {!row.isActive && (
                <DropdownItem onClick={() => handleActivate(row._id)}>
                  <i className="ri-check-line me-2"></i>{t('assistantConfig.activate')}
                </DropdownItem>
              )}
              {!row.isActive && (
                <DropdownItem onClick={() => handleDelete(row)}>
                  <i className="ri-delete-bin-fill me-2"></i>{t('assistantConfig.delete')}
                </DropdownItem>
              )}
            </DropdownMenu>
          </UncontrolledDropdown>
        ),
        width: '120px'
      },
  ];

  // Render nothing if user is not SuperAdmin
  if (user?.role !== 'SuperAdmin') {
    return (
      <Container fluid style={{ marginTop: "80px" }}>
        <Row>
          <Col lg={12}>
            <Card>
              <CardBody>
                <Alert color="warning">
                  {t('assistantConfig.noPermission')}
                </Alert>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container fluid style={{ marginTop: "80px" }}>
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
                    <h4 className="fw-semibold mb-2">{t('assistantConfig.welcome.title')}</h4>
                    <p className="text-muted mb-3">{t('assistantConfig.welcome.description')}</p>
                    {/* Statistics Badges */}
                    <div className="d-flex flex-wrap gap-2">
                      <Badge color="primary" pill className="fs-12 py-2 px-3">
                        <i className="ri-settings-3-line me-1"></i> {t('assistantConfig.stats.totalConfigs')}: {configurations.length || 0}
                      </Badge>
                      <Badge color="success" pill className="fs-12 py-2 px-3">
                        <i className="ri-check-line me-1"></i> {t('assistantConfig.stats.activeConfigs')}: {configurations.filter(c => c.isActive).length || 0}
                      </Badge>
                      <Badge color="info" pill className="fs-12 py-2 px-3">
                        <i className="ri-chat-3-line me-1"></i> {t('assistantConfig.stats.totalTopics')}: {configurations.reduce((total, c) => total + (c.topics?.length || 0), 0)}
                      </Badge>
                    </div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="text-end">
                    <Button
                      color="primary"
                      onClick={handleAdd}
                      title={t('assistantConfig.createNew')}
                    >
                      <i className="ri-add-line align-bottom me-1"></i> {t('assistantConfig.createNew')}
                    </Button>
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>
      {/* End Welcome Card */}

      <Row>
        <Col lg={12}>
          <Card>
            <CardHeader>
              <h4 className="card-title mb-0 flex-grow-1">{t('assistantConfig.title')}</h4>
            </CardHeader>

            <CardBody>
              {error && (
                <Alert color="danger" toggle={() => dispatch(clearError())}>
                  {error}
                </Alert>
              )}
              
              {successMessage && (
                <Alert color="success" toggle={() => dispatch(clearSuccessMessage())}>
                  {successMessage}
                </Alert>
              )}

              <div className="d-flex justify-content-between mb-3">
                <div style={{ width: '300px' }}>
                  <FormGroup>
                    <Input
                      type="text"
                      placeholder={t('assistantConfig.searchByVersion')}
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      className="form-control"
                    />
                  </FormGroup>
                </div>
                
                <Button color="primary" onClick={handleAdd}>
                  <FeatherIcon icon="plus" size={16} className="me-1" />
                  {t('assistantConfig.createNew')}
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-4">
                  <Spinner color="primary" />
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={filteredItems}
                  pagination
                  highlightOnHover
                  responsive
                  striped
                  noDataComponent={<div className="p-4 text-center">{t('assistantConfig.noConfigurations')}</div>}
                />
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <AssistantConfigModal
        isOpen={showAddEditModal}
        toggle={() => setShowAddEditModal(!showAddEditModal)}
        config={selectedConfig}
        isEditing={isEditing}
      />

      <DeleteModal
        show={showDeleteModal}
        onCloseClick={() => setShowDeleteModal(false)}
        onDeleteClick={confirmDelete}
        loading={actionInProgress}
      />
    </Container>
  );
};

export default withTranslation()(AssistantConfigList);