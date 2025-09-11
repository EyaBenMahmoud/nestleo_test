import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllUsers, deleteUser, toggleUserStatus } from "../../slices/users/userSlice";
import DataTable from 'react-data-table-component';
import {
  Card, CardBody, CardHeader, Col, Container, Row,
  UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem,
  Button, Input, Badge, Modal, ModalHeader, ModalBody, ModalFooter
} from 'reactstrap';
import { useNavigate } from "react-router-dom";
import AdminsModal from './AdminsModal';
import DeleteModal from "../Common/DeleteModal";
import {
  FaBan, FaCheckCircle, FaSearch, FaUserPlus,
  FaSync, FaFilter, FaUserShield
} from "react-icons/fa";
import Loader from '../Common/Loader';
import { withTranslation } from 'react-i18next';

const AdminList = ({ t }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list = [], loading, error } = useSelector((state) => state.Userss);
  const [filterText, setFilterText] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [modal, setModal] = useState(false);
  const [ModalDelete, setModalDelete] = useState(false);
  const [user, setUser] = useState(false);
  const [userDetailModal, setUserDetailModal] = useState(false);
  const [viewingAdmin, setViewingAdmin] = useState(null);
  const [statusModal, setStatusModal] = useState(false);

  const adminData = list.filter(user => user.role === "Admin");
  const filteredData = adminData.filter(item =>
    item.firstName?.toLowerCase().includes(filterText.toLowerCase()) ||
    item.lastName?.toLowerCase().includes(filterText.toLowerCase()) ||
    item.email?.toLowerCase().includes(filterText.toLowerCase()) ||
    item.SubRole?.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleStatusToggle = (userId) => {
    const admin = adminData.find(user => user._id === userId);
    if (admin) {
      setSelectedAdmin(admin);
      setStatusModal(true);
    }
  };

  const handleStatusChange = () => {
    if (selectedAdmin) {
      dispatch(toggleUserStatus(selectedAdmin._id))
        .then(() => {
          fetchUsers();
          setStatusModal(false);
        });
    }
  };

  const fetchUsers = useCallback(() => {
    dispatch(getAllUsers());
  }, [dispatch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = () => {
    if (user) {
      dispatch(deleteUser(user)).then(() => {
        fetchUsers();
        setModalDelete(false);
      });
    }
  };

  const handleEdit = (userId) => {
    const admin = adminData.find(user => user._id === userId);
    setSelectedAdmin(admin);
    setModal(true);
  };

  const handleViewDetails = (userId) => {
    const admin = adminData.find(user => user._id === userId);
    if (admin) {
      setViewingAdmin(admin);
      setUserDetailModal(true);
    }
  };

  const handleRowSelected = (state) => {
    setSelectedRows(state.selectedRows);
  };

  const toggleModal = () => {
    setModal(!modal);
    if (modal) setSelectedAdmin(null);
  };

  const adminCounts = {
    total: adminData.length,
    active: adminData.filter(admin => admin.isActive).length,
    inactive: adminData.filter(admin => !admin.isActive).length
  };

  function getAvatarColor(SubRole) {
    switch (SubRole) {
      case 'Finance': return 'success';
      case 'HR': return 'info';
      case 'Operations': return 'warning';
      case 'IT': return 'primary';
      default: return 'secondary';
    }
  }

  const columns = [
    {
      name: <span className='font-weight-bold fs-13'>{t('adminList.columns.name')}</span>,
      selector: row => `${row.firstName} ${row.lastName}`,
      sortable: true,
      cell: row => (
        <div className="d-flex align-items-center">
          <div className="avatar-sm me-2 flex-shrink-0">
            <div className={`avatar-title rounded-circle bg-soft-${getAvatarColor(row.SubRole)} text-${getAvatarColor(row.SubRole)} fs-lg`}>
              {row.firstName?.charAt(0)}{row.lastName?.charAt(0)}
            </div>
          </div>
          <div>
            <h5 className="fs-14 mb-0">{`${row.firstName} ${row.lastName}`}</h5>
            <p className="text-muted mb-0 fs-12">{t(`adminList.subRoles.${row.SubRole?.toLowerCase() || 'general'}`, { defaultValue: row.SubRole || 'General' })}</p>
          </div>
        </div>
      )
    },
    {
      name: <span className='font-weight-bold fs-13'>{t('adminList.columns.email')}</span>,
      selector: row => row.email,
      sortable: true,
    },
    {
      name: <span className='font-weight-bold fs-13'>{t('adminList.columns.subRole')}</span>,
      selector: row => row.SubRole,
      sortable: true,
      cell: row => (
        <Badge 
          color={getAvatarColor(row.SubRole)} 
          pill 
          className="fs-12 px-2 py-1"
        >
          {t(`adminList.subRoles.${row.SubRole?.toLowerCase() || 'general'}`, { defaultValue: row.SubRole || 'General' })}
        </Badge>
      )
    },
    {
      name: <span className='font-weight-bold fs-13'>{t('adminList.columns.status')}</span>,
      selector: row => row.isActive,
      sortable: true,
      cell: (row) => (
        <div className="form-check form-switch">
          <input
            type="checkbox"
            className="form-check-input"
            checked={row.isActive}
            onChange={() => handleStatusToggle(row._id)}
            disabled={row.role === 'SuperAdmin'}
          />
          <label className="form-check-label d-flex align-items-center">
            {row.isActive ? (
              <span className="badge bg-soft-success text-success">{t('adminList.status.active')}</span>
            ) : (
              <span className="badge bg-soft-danger text-danger">{t('adminList.status.inactive')}</span>
            )}
          </label>
        </div>
      ),
      width: '120px'
    },
    {
      name: <span className='font-weight-bold fs-13'>{t('adminList.columns.actions')}</span>,
      cell: (row) => (
        <UncontrolledDropdown>
          <DropdownToggle tag="button" className="btn btn-ghost-secondary btn-icon btn-sm">
            <i className="ri-more-2-fill fs-16"></i>
          </DropdownToggle>
          <DropdownMenu end className="dropdown-menu-sm">
            <DropdownItem onClick={() => handleViewDetails(row._id)}>
              <i className="ri-eye-line me-2 align-bottom text-muted"></i>{t('adminList.actions.viewDetails')}
            </DropdownItem>
            <DropdownItem onClick={() => handleEdit(row._id)}>
              <i className="ri-pencil-fill me-2 align-bottom text-muted"></i>{t('adminList.actions.edit')}
            </DropdownItem>
            <DropdownItem onClick={() => handleStatusToggle(row._id)}>
              {row.isActive ? (
                <><i className="ri-forbid-line me-2 align-bottom text-danger"></i>{t('adminList.actions.deactivate')}</>
              ) : (
                <><i className="ri-checkbox-circle-line me-2 align-bottom text-success"></i>{t('adminList.actions.activate')}</>
              )}
            </DropdownItem>
            <DropdownItem divider />
            <DropdownItem className="text-danger" onClick={() => { setUser(row._id); setModalDelete(true) }}>
              <i className="ri-delete-bin-6-line me-2 align-bottom"></i>{t('adminList.actions.delete')}
            </DropdownItem>
          </DropdownMenu>
        </UncontrolledDropdown>
      ),
      width: '100px',
      center: true
    },
  ];

  const customStyles = {
    table: {
      style: {
        minWidth: '100%',
      },
    },
    headRow: {
      style: {
        backgroundColor: '#f8f9fa',
        borderBottomWidth: '1px',
        borderBottomStyle: 'solid',
        borderBottomColor: '#e9ecef',
      },
    },
    rows: {
      style: {
        fontSize: '14px',
        minHeight: '56px',
        '&:not(:last-of-type)': {
          borderBottomStyle: 'solid',
          borderBottomWidth: '1px',
          borderBottomColor: '#f1f1f1',
        },
      },
      highlightOnHoverStyle: {
        backgroundColor: 'rgba(230, 72, 92, 0.04)',
        cursor: 'pointer',
      },
    },
    pagination: {
      style: {
        borderTopStyle: 'solid',
        borderTopWidth: '1px',
        borderTopColor: '#f1f1f1',
      },
    },
  };

  const AdminDetailModal = ({ isOpen, toggle, admin, t }) => {
    if (!admin) return null;

    return (
      <Modal isOpen={isOpen} toggle={toggle} size="lg">
        <ModalHeader toggle={toggle}>
          {t('adminList.adminDetailModal.title')}
        </ModalHeader>
        <ModalBody>
          <Row className="mb-4">
            <Col md="3" className="text-center mb-3 mb-md-0">
              <div className="avatar-lg mx-auto">
                <div
                  className={`avatar-title rounded-circle bg-soft-${getAvatarColor(admin.SubRole)} text-${getAvatarColor(admin.SubRole)}`}
                  style={{
                    width: '80px',
                    height: '80px',
                    fontSize: '2rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {admin.firstName?.charAt(0).toUpperCase()}
                  {admin.lastName?.charAt(0).toUpperCase()}
                </div>
              </div>
              <h5 className="mt-3 mb-1">{`${admin.firstName} ${admin.lastName}`}</h5>
              <Badge color="primary" className="fs-12 px-2 py-1">
                {t(`adminList.roles.${admin.role.toLowerCase()}`, { defaultValue: admin.role })}
              </Badge>
              {admin.SubRole && (
                <div className="mt-2">
                  <Badge color={getAvatarColor(admin.SubRole)} pill>
                    {t(`adminList.subRoles.${admin.SubRole.toLowerCase()}`, { defaultValue: admin.SubRole })}
                  </Badge>
                </div>
              )}
              <div className="mt-3">
                {admin.isActive ? (
                  <Badge color="success" pill>{t('adminList.status.active')}</Badge>
                ) : (
                  <Badge color="danger" pill>{t('adminList.status.inactive')}</Badge>
                )}
              </div>
            </Col>
            <Col md="9">
              <div className="table-responsive">
                <table className="table table-borderless mb-0">
                  <tbody>
                    <tr>
                      <th scope="row" style={{width: '25%'}}>{t('adminList.adminDetailModal.fullName')}</th>
                      <td>{`${admin.firstName} ${admin.lastName}`}</td>
                    </tr>
                    <tr>
                      <th scope="row">{t('adminList.adminDetailModal.email')}</th>
                      <td>{admin.email}</td>
                    </tr>
                    <tr>
                      <th scope="row">{t('adminList.adminDetailModal.role')}</th>
                      <td>{t(`adminList.roles.${admin.role.toLowerCase()}`, { defaultValue: admin.role })}</td>
                    </tr>
                    <tr>
                      <th scope="row">{t('adminList.adminDetailModal.subRole')}</th>
                      <td>{t(`adminList.subRoles.${admin.SubRole?.toLowerCase() || 'general'}`, { defaultValue: admin.SubRole || 'Not assigned' })}</td>
                    </tr>
                    <tr>
                      <th scope="row">{t('adminList.adminDetailModal.status')}</th>
                      <td>{t(`adminList.status.${admin.isActive ? 'active' : 'inactive'}`)}</td>
                    </tr>
                    {admin.createdAt && (
                      <tr>
                        <th scope="row">{t('adminList.adminDetailModal.createdAt')}</th>
                        <td>{new Date(admin.createdAt).toLocaleString()}</td>
                      </tr>
                    )}
                    {admin.lastLogin && (
                      <tr>
                        <th scope="row">{t('adminList.adminDetailModal.lastLogin')}</th>
                        <td>{new Date(admin.lastLogin).toLocaleString()}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {admin.permissions && (
                <div className="mt-4">
                  <h5 className="font-size-15 mb-3">{t('adminList.adminDetailModal.permissions')}</h5>
                  <div className="d-flex flex-wrap gap-2">
                    {admin.permissions.map((permission, index) => (
                      <Badge 
                        key={index} 
                        color="light" 
                        className="text-secondary fs-12"
                        style={{borderRadius: '4px'}}
                      >
                        {t(`adminList.permissions.${permission.toLowerCase()}`, { defaultValue: permission })}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Col>
          </Row>
          {admin.phone && (
            <div className="d-flex align-items-center mt-4">
              <div className="avatar-xs me-3 flex-shrink-0">
                <div className="avatar-title bg-soft-primary text-primary rounded-circle fs-16">
                  <i className="ri-phone-line"></i>
                </div>
              </div>
              <div className="flex-grow-1">
                <h5 className="fs-14 mb-0">{admin.phone}</h5>
                <p className="text-muted mb-0">{t('adminList.adminDetailModal.phone')}</p>
              </div>
            </div>
          )}
          {admin.address && (
            <div className="d-flex align-items-center mt-3">
              <div className="avatar-xs me-3 flex-shrink-0">
                <div className="avatar-title bg-soft-primary text-primary rounded-circle fs-16">
                  <i className="ri-map-pin-line"></i>
                </div>
              </div>
              <div className="flex-grow-1">
                <h5 className="fs-14 mb-0">{admin.address}</h5>
                <p className="text-muted mb-0">{t('adminList.adminDetailModal.address')}</p>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={toggle}>
            {t('adminList.adminDetailModal.close')}
          </Button>
        </ModalFooter>
      </Modal>
    );
  };

  const StatusChangeModal = ({ isOpen, toggle, admin, t }) => {
    if (!admin) return null;

    return (
      <Modal isOpen={isOpen} toggle={toggle} size="sm" centered>
        <ModalHeader toggle={toggle}>
          {t(`adminList.statusChangeModal.${admin.isActive ? 'deactivateTitle' : 'activateTitle'}`)}
        </ModalHeader>
        <ModalBody>
          <div className="text-center">
            <div className="avatar-md mx-auto mb-3">
              <div className={`avatar-title rounded-circle bg-light text-${admin.isActive ? 'danger' : 'success'} fs-24`}>
                {admin.isActive ? <i className="ri-user-unfollow-line"></i> : <i className="ri-user-follow-line"></i>}
              </div>
            </div>
            <p>
              {t(`adminList.statusChangeModal.confirmText`, { firstName: admin.firstName, lastName: admin.lastName ,action : admin.isActive ? t('adminList.statusChangeModal.deactivate') : t('adminList.statusChangeModal.activate')})}
            </p>
            <p className="text-muted small">
              {t(`adminList.statusChangeModal.${admin.isActive ? 'deactivateDesc' : 'activateDesc'}`)}
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={toggle}>
            {t('adminList.statusChangeModal.cancel')}
          </Button>
          <Button 
            color={admin.isActive ? 'danger' : 'success'} 
            onClick={handleStatusChange}
          >
            {t(`adminList.statusChangeModal.${admin.isActive ? 'deactivate' : 'activate'}`)}
          </Button>
        </ModalFooter>
      </Modal>
    );
  };

  return (
    <Container fluid style={{ marginTop: "90px" }}>

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
                    <h4 className="fw-semibold mb-2">{t('adminList.welcome.title')}</h4>
                    <p className="text-muted mb-3">{t('adminList.welcome.description')}</p>
                    {/* Statistics Badges */}
                    <div className="d-flex flex-wrap gap-2">
                      <Badge color="primary" pill className="fs-12 py-2 px-3">
                        <i className="ri-user-settings-line me-1"></i> {t('adminList.summary.totalAdmins')}: {adminCounts.total || 0}
                      </Badge>
                      <Badge color="success" pill className="fs-12 py-2 px-3">
                        <i className="ri-user-follow-line me-1"></i> {t('adminList.summary.activeAdmins')}: {adminCounts.active || 0}
                      </Badge>
                      <Badge color="danger" pill className="fs-12 py-2 px-3">
                        <i className="ri-user-unfollow-line me-1"></i> {t('adminList.summary.inactiveAdmins')}: {adminCounts.inactive || 0}
                      </Badge>
                    </div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="text-end">
                    <Button
                      color="primary"
                      onClick={toggleModal}
                      title={t('adminList.actions.addAdmin')}
                    >
                      <i className="ri-user-add-line align-bottom me-1"></i> {t('adminList.addAdmin')}
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
            <CardHeader className="border-0">
              <div className="d-flex align-items-center">
                <h5 className="card-title mb-0 flex-grow-1">{t('adminList.systemAdmins')}</h5>
                <div className="flex-shrink-0">
                  <Button color="primary" onClick={toggleModal} className="btn-sm">
                    <i className="ri-user-add-line me-1 align-bottom"></i>{t('adminList.addAdmin')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="text-center py-4">
                  <Loader />
                </div>
              ) : (
                <>
                  {error && <div className="alert alert-danger">{t('adminList.error', { error })}</div>}
                  <div className="mb-4 d-flex flex-wrap gap-2 align-items-center justify-content-between">
                    <div className="search-box">
                      <div className="position-relative">
                        <Input
                          type="text"
                          placeholder={t('adminList.searchPlaceholder')}
                          value={filterText}
                          onChange={(e) => setFilterText(e.target.value)}
                          className="form-control search"
                          style={{ minWidth: "250px" }}
                        />
                        <i className="ri-search-line search-icon"></i>
                      </div>
                    </div>
                    <Button
                      color="light"
                      onClick={fetchUsers}
                      className="btn-sm"
                      title={t('adminList.refresh')}
                      style={{
                        borderRadius: '4px',
                        boxShadow: 'none'
                      }}
                    >
                      <i className="ri-refresh-line me-1"></i>{t('adminList.refresh')}
                    </Button>
                  </div>
                  <DataTable
                    columns={columns}
                    data={filteredData}
                    pagination
                    paginationPerPage={10}
                    paginationRowsPerPageOptions={[5, 10, 20, 50]}
                    highlightOnHover
                    customStyles={customStyles}
                    responsive
                    striped
                    fixedHeader
                    fixedHeaderScrollHeight="500px"
                    persistTableHead
                    noDataComponent={
                      <div className="p-4 text-center">
                        <div className="avatar-md mx-auto mb-3">
                          <div className="avatar-title bg-light text-secondary rounded-circle fs-24">
                            <i className="ri-user-search-line"></i>
                          </div>
                        </div>
                        <h5>{t('adminList.noAdminsFound')}</h5>
                        <p className="text-muted">{t('adminList.noAdminsFoundDesc')}</p>
                      </div>
                    }
                  />
                </>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <AdminsModal
        isOpen={modal}
        toggle={toggleModal}
        admin={selectedAdmin}
        onSave={fetchUsers}
        onClose={() => setSelectedAdmin(null)}
      />
      <DeleteModal
        show={ModalDelete}
        onCloseClick={() => setModalDelete(false)}
        onDeleteClick={handleDelete}
      />
      <AdminDetailModal 
        isOpen={userDetailModal} 
        toggle={() => setUserDetailModal(!userDetailModal)}
        admin={viewingAdmin}
        t={t}
      />
      <StatusChangeModal 
        isOpen={statusModal}
        toggle={() => setStatusModal(false)}
        admin={selectedAdmin}
        t={t}
      />
    </Container>
  );
};

export default withTranslation()(AdminList);