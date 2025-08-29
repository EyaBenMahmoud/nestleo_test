import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllUsers, deleteUser, toggleUserStatus, updateUserInList } from "../../slices/users/userSlice";
import DataTable from 'react-data-table-component';
import {
  Card, CardBody, CardHeader, Col, Container, Row,
  UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem,
  Button, Input, Badge, ButtonGroup, Modal, ModalHeader, ModalBody, ModalFooter
} from 'reactstrap';
import DeleteModal from "../Common/DeleteModal";
import StatusModal from "./statusmodal";
import { FaCheckCircle, FaBan, FaSearch, FaFilter, FaSync, FaUserPlus } from 'react-icons/fa';
import Loader from '../Common/Loader';
import { withTranslation } from 'react-i18next';

const UserList = ({ t }) => {
  const dispatch = useDispatch();
  const { list = [], loading, error } = useSelector((state) => state.Userss || {});

  const [filterText, setFilterText] = useState('');
  const [deleteModal, setDeleteModal] = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [userDetailModal, setUserDetailModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [userStatus, setUserStatus] = useState(null);
  const [roleFilter, setRoleFilter] = useState('All');
  const [addEditUserModal, setAddEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Fetch users from the backend
  const fetchUsers = useCallback(() => {
    dispatch(getAllUsers());
  }, [dispatch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = () => {
    if (selectedUser) {
      dispatch(deleteUser(selectedUser)).then(fetchUsers);
      setDeleteModal(false);
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setAddEditUserModal(true);
  };

  const handleEditUser = (userId) => {
    const user = list.find(u => u._id === userId);
    if (user) {
      setEditingUser(user);
      setAddEditUserModal(true);
    }
  };

  const filteredData = list.filter(item => {
    const matchesText =
      item.firstName?.toLowerCase().includes(filterText.toLowerCase()) ||
      item.lastName?.toLowerCase().includes(filterText.toLowerCase()) ||
      item.email?.toLowerCase().includes(filterText.toLowerCase());
    const matchesRole = roleFilter === 'All' || item.role === roleFilter;
    return matchesText && matchesRole;
  });

  const handleStatusToggle = (userId, isActive) => {
    setSelectedUser(userId);
    setUserStatus(isActive);
    setStatusModal(true);
    setUserDetailModal(false);
  };

  const handleStatusChange = (userId) => {
    dispatch(toggleUserStatus(userId))
      .then((actionResult) => {
        if (toggleUserStatus.fulfilled.match(actionResult)) {
          // Update the local list without refetching
          const updatedList = list.map(user =>
            user._id === userId ? { ...user, isActive: !user.isActive } : user
          );

          // Update the Redux state
          dispatch(updateUserInList(updatedList));

          // Update the viewing user if needed
          if (viewingUser && viewingUser._id === userId) {
            setViewingUser({ ...viewingUser, isActive: !viewingUser.isActive });
          }

          // Close the status modal
          setStatusModal(false);
        }
      });
  };
  const handleUserDetails = (userId) => {
    const user = list.find(u => u._id === userId);
    if (user) {
      setViewingUser(user);
      setUserDetailModal(true);
    }
  };

  const roles = ['All', ...new Set(list.map(user => user.role))];

  const userCounts = list.reduce((acc, user) => {
    acc.total += 1;
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, { total: 0 });

  const columns = [
    {
      name: <span className='font-weight-bold fs-13'>{t('userList.columns.name')}</span>,
      selector: row => `${row.firstName} ${row.lastName}`,
      sortable: true,
      cell: row => (
        <div className="d-flex align-items-center">
          <div className="avatar-sm me-2 flex-shrink-0">
            <div className={`avatar-title rounded-circle bg-soft-${getAvatarColor(row.role)} text-${getAvatarColor(row.role)} fs-lg`}>
              {row.firstName?.charAt(0)}{row.lastName?.charAt(0)}
            </div>
          </div>
          <div>
            <h5 className="fs-14 mb-0">{`${row.firstName} ${row.lastName}`}</h5>
            <p className="text-muted mb-0 fs-12">{t(`userList.roles.${row.role.toLowerCase()}`, { defaultValue: row.role })}</p>
          </div>
        </div>
      )
    },
    {
      name: <span className='font-weight-bold fs-13'>{t('userList.columns.email')}</span>,
      selector: row => row.email,
      sortable: true,
    },
    {
      name: <span className='font-weight-bold fs-13'>{t('userList.columns.role')}</span>,
      selector: row => row.role,
      sortable: true,
      cell: row => (
        <Badge color={getRoleBadgeColor(row.role)} className="fs-12 px-2 py-1">
          {t(`userList.roles.${row.role.toLowerCase()}`, { defaultValue: row.role })}
        </Badge>
      )
    },
    {
      name: <span className='font-weight-bold fs-13'>{t('userList.columns.status')}</span>,
      selector: row => row.isActive,
      sortable: true,
      cell: (row) => (
        <div className="form-check form-switch">
          <input
            type="checkbox"
            className="form-check-input"
            checked={row.isActive}
            onChange={() => handleStatusToggle(row._id, row.isActive)}
            disabled={row.role === 'SuperAdmin'}
          />
          <label className="form-check-label d-flex align-items-center">
            {row.isActive ? (
              <span className="badge bg-soft-success text-success">{t('userList.status.active')}</span>
            ) : (
              <span className="badge bg-soft-danger text-danger">{t('userList.status.inactive')}</span>
            )}
          </label>
        </div>
      ),
      width: '120px'
    },
    {
      name: <span className='font-weight-bold fs-13'>{t('userList.columns.actions')}</span>,
      cell: (row) => (
        <UncontrolledDropdown>
          <DropdownToggle tag="button" className="btn btn-ghost-secondary btn-icon btn-sm">
            <i className="ri-more-2-fill fs-16"></i>
          </DropdownToggle>
          <DropdownMenu end className="dropdown-menu-sm">
            <DropdownItem onClick={() => handleUserDetails(row._id)}>
              <i className="ri-eye-line me-2 align-bottom text-muted"></i>{t('userList.actions.viewDetails')}
            </DropdownItem>
            <DropdownItem onClick={() => handleStatusToggle(row._id, row.isActive)}>
              {row.isActive ? (
                <><i className="ri-forbid-line me-2 align-bottom text-danger"></i>{t('userList.actions.deactivate')}</>
              ) : (
                <><i className="ri-checkbox-circle-line me-2 align-bottom text-success"></i>{t('userList.actions.activate')}</>
              )}
            </DropdownItem>
            <DropdownItem divider />
            <DropdownItem className="text-danger" onClick={() => { setSelectedUser(row._id); setDeleteModal(true); }}>
              <i className="ri-delete-bin-6-line me-2 align-bottom"></i>{t('userList.actions.delete')}
            </DropdownItem>
          </DropdownMenu>
        </UncontrolledDropdown>
      ),
      width: '100px',
      center: true
    },
  ];

  function getAvatarColor(role) {
    switch (role) {
      case 'SuperAdmin': return 'danger';
      case 'Admin': return 'primary';
      case 'SyndicateAdmin': return 'success';
      case 'SyndicateCoowner': return 'info';
      case 'Worker': return 'warning';
      default: return 'secondary';
    }
  }

  function getRoleBadgeColor(role) {
    switch (role) {
      case 'SuperAdmin': return 'danger';
      case 'Admin': return 'primary';
      case 'SyndicateAdmin': return 'success';
      case 'SyndicateCoowner': return 'info';
      case 'Worker': return 'warning';
      default: return 'secondary';
    }
  }

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
        minHeight: '60px',
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

  const UserDetailModal = ({ isOpen, toggle, user, t }) => {
    if (!user) return null;

    return (
      <Modal isOpen={isOpen} toggle={toggle} size="lg">
        <ModalHeader toggle={toggle}>
          {t('userList.userDetailModal.title')}
        </ModalHeader>
        <ModalBody>
          <Row className="mb-4">
            <Col md="3" className="text-center mb-3 mb-md-0">
              <div className="avatar-lg mx-auto">
                <div
                  className={`rounded-circle d-flex align-items-center justify-content-center bg-soft-${getAvatarColor(user.role)} text-${getAvatarColor(user.role)}`}
                  style={{
                    width: '80px',
                    height: '80px',
                    fontSize: '2rem',
                    fontWeight: '600',
                  }}
                >
                  {user.firstName?.charAt(0).toUpperCase()}
                  {user.lastName?.charAt(0).toUpperCase()}
                </div>
              </div>
              <h5 className="mt-3 mb-1">{`${user.firstName} ${user.lastName}`}</h5>
              <Badge color={getRoleBadgeColor(user.role)} className="fs-12 px-2 py-1">
                {t(`userList.roles.${user.role.toLowerCase()}`, { defaultValue: user.role })}
              </Badge>
              <div className="mt-3">
                {user.isActive ? (
                  <Badge color="success" pill>{t('userList.status.active')}</Badge>
                ) : (
                  <Badge color="danger" pill>{t('userList.status.inactive')}</Badge>
                )}
              </div>
            </Col>
            <Col md="9">
              <div className="table-responsive">
                <table className="table table-borderless mb-0">
                  <tbody>
                    <tr>
                      <th scope="row" style={{ width: '25%' }}>{t('userList.userDetailModal.fullName')}</th>
                      <td>{`${user.firstName} ${user.lastName}`}</td>
                    </tr>
                    <tr>
                      <th scope="row">{t('userList.userDetailModal.email')}</th>
                      <td>{user.email}</td>
                    </tr>
                    <tr>
                      <th scope="row">{t('userList.userDetailModal.role')}</th>
                      <td>{t(`userList.roles.${user.role.toLowerCase()}`, { defaultValue: user.role })}</td>
                    </tr>
                    <tr>
                      <th scope="row">{t('userList.userDetailModal.status')}</th>
                      <td>{t(`userList.status.${user.isActive ? 'active' : 'inactive'}`)}</td>
                    </tr>
                    {user.createdAt && (
                      <tr>
                        <th scope="row">{t('userList.userDetailModal.createdAt')}</th>
                        <td>{new Date(user.createdAt).toLocaleString()}</td>
                      </tr>
                    )}
                    {user.lastLogin && (
                      <tr>
                        <th scope="row">{t('userList.userDetailModal.lastLogin')}</th>
                        <td>{new Date(user.lastLogin).toLocaleString()}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {user.building && (
                <div className="mt-4">
                  <h5 className="font-size-15 mb-3">{t('userList.userDetailModal.buildingInfo')}</h5>
                  <div className="table-responsive">
                    <table className="table table-borderless mb-0">
                      <tbody>
                        <tr>
                          <th scope="row" style={{ width: '25%' }}>{t('userList.userDetailModal.buildingName')}</th>
                          <td>{user.building.name}</td>
                        </tr>
                        <tr>
                          <th scope="row">{t('userList.userDetailModal.buildingAddress')}</th>
                          <td>{user.building.address}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Col>
          </Row>
          {user.phone && (
            <div className="d-flex align-items-center mt-4">
              <div className="avatar-xs me-3 flex-shrink-0">
                <div className="avatar-title bg-soft-primary text-primary rounded-circle fs-16">
                  <i className="ri-phone-line"></i>
                </div>
              </div>
              <div className="flex-grow-1">
                <h5 className="fs-14 mb-0">{user.phone}</h5>
                <p className="text-muted mb-0">{t('userList.userDetailModal.phone')}</p>
              </div>
            </div>
          )}
          {user.address && (
            <div className="d-flex align-items-center mt-3">
              <div className="avatar-xs me-3 flex-shrink-0">
                <div className="avatar-title bg-soft-primary text-primary rounded-circle fs-16">
                  <i className="ri-map-pin-line"></i>
                </div>
              </div>
              <div className="flex-grow-1">
                <h5 className="fs-14 mb-0">{user.address}</h5>
                <p className="text-muted mb-0">{t('userList.userDetailModal.address')}</p>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={toggle}>
            {t('userList.userDetailModal.close')}
          </Button>
          {user.role !== 'SuperAdmin' && (
            user.isActive ? (
              <Button color="danger" onClick={() => handleStatusToggle(user._id, user.isActive)}>
                <i className="ri-user-unfollow-line me-1"></i>{t('userList.userDetailModal.deactivateUser')}
              </Button>
            ) : (
              <Button color="success" onClick={() => handleStatusToggle(user._id, user.isActive)}>
                <i className="ri-user-follow-line me-1"></i>{t('userList.userDetailModal.activateUser')}
              </Button>
            )
          )}
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
                    <h4 className="fw-semibold mb-2">{t('userList.welcome.title')}</h4>
                    <p className="text-muted mb-3">{t('userList.welcome.description')}</p>
                    {/* Statistics Badges */}
                    <div className="d-flex flex-wrap gap-2">
                      <Badge color="primary" pill className="fs-12 py-2 px-3">
                        <i className="ri-user-line me-1"></i> {t('userList.summary.totalUsers')}: {userCounts.total || 0}
                      </Badge>
                      <Badge color="success" pill className="fs-12 py-2 px-3">
                        <i className="ri-admin-line me-1"></i> {t('userList.summary.admins')}: {userCounts.Admin || 0}
                      </Badge>
                      <Badge color="danger" pill className="fs-12 py-2 px-3">
                        <i className="ri-team-line me-1"></i> {t('userList.summary.coowners')}: {userCounts.SyndicateCoowner || 0}
                      </Badge>
                      <Badge color="purple" pill className="fs-12 py-2 px-3" style={{ background: '#f3eafe', color: '#6f42c1' }}>
                        <i className="ri-tools-line me-1"></i> {t('userList.summary.workers')}: {userCounts.Worker || 0}
                      </Badge>
                    </div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="text-end">
                    <Button
                      color="primary"
                      onClick={handleAddUser}
                      title={t('userList.actions.addUser')}
                    >
                      <i className="ri-user-add-line align-bottom me-1"></i> {t('userList.actions.addUser')}
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
                <h5 className="card-title mb-0 flex-grow-1">{t('userList.allUsers')}</h5>
              </div>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="text-center py-4">
                  <Loader />
                </div>
              ) : (
                <>
                  {error && <div className="alert alert-danger">{t('userList.error', { error })}</div>}
                  <div className="mb-4 d-flex flex-wrap gap-2 align-items-center justify-content-between">
                    <div className="search-box">
                      <div className="position-relative">
                        <Input
                          type="text"
                          placeholder={t('userList.searchPlaceholder')}
                          value={filterText}
                          onChange={(e) => setFilterText(e.target.value)}
                          className="form-control search"
                          style={{ minWidth: "250px" }}
                        />
                        <i className="ri-search-line search-icon"></i>
                      </div>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      <div className="btn-group" role="group">
                        {roles.map(role => (
                          <Button
                            key={role}
                            color={roleFilter === role ? "primary" : "light"}
                            outline={roleFilter !== role}
                            onClick={() => setRoleFilter(role)}
                            className="btn-sm font-size-12"
                            style={{
                              borderRadius: role === 'All' ? '4px 0 0 4px' :
                                role === roles[roles.length - 1] ? '0 4px 4px 0' : '0',
                              margin: 0,
                              boxShadow: 'none',
                              fontWeight: roleFilter === role ? '600' : '400',
                              borderColor: '#ced4da',
                              background: roleFilter === role ? '' : '#f8f9fa',
                              color: roleFilter === role ? '' : '#495057',
                            }}
                          >
                            {role === 'All' ? (
                              <><i className="ri-user-3-line me-1"></i>{t('userList.roles.all')}</>
                            ) : role === 'Admin' ? (
                              <><i className="ri-admin-line me-1"></i>{t('userList.roles.admin')}</>
                            ) : role === 'SuperAdmin' ? (
                              <><i className="ri-shield-star-line me-1"></i>{t('userList.roles.superadmin')}</>
                            ) : role === 'SyndicateAdmin' ? (
                              <><i className="ri-building-2-line me-1"></i>{t('userList.roles.syndicateadmin')}</>
                            ) : role === 'SyndicateCoowner' ? (
                              <><i className="ri-home-4-line me-1"></i>{t('userList.roles.syndicatecoowner')}</>
                            ) : role === 'Worker' ? (
                              <><i className="ri-tools-line me-1"></i>{t('userList.roles.worker')}</>
                            ) : (
                              <><i className="ri-user-line me-1"></i>{t(`userList.roles.${role.toLowerCase()}`, { defaultValue: role })}</>
                            )}
                          </Button>
                        ))}
                        <Button
                          color="light"
                          onClick={fetchUsers}
                          className="btn-sm ms-2"
                          title={t('userList.refresh')}
                          style={{
                            borderRadius: '4px',
                            boxShadow: 'none',
                            borderColor: '#ced4da',
                            background: '#f8f9fa'
                          }}
                        >
                          <i className="ri-refresh-line me-0"></i>
                        </Button>
                      </div>
                    </div>
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
                    noDataComponent={
                      <div className="p-4 text-center">
                        <div className="avatar-md mx-auto mb-3">
                          <div className="avatar-title bg-light text-secondary rounded-circle fs-24">
                            <i className="ri-user-search-line"></i>
                          </div>
                        </div>
                        <h5>{t('userList.noUsersFound')}</h5>
                        <p className="text-muted">{t('userList.noUsersFoundDesc')}</p>
                      </div>
                    }
                  />
                </>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <DeleteModal
        show={deleteModal}
        onCloseClick={() => setDeleteModal(false)}
        onDeleteClick={handleDelete}
      />

      <StatusModal
        show={statusModal}
        onCloseClick={() => setStatusModal(false)}
        onConfirmClick={handleStatusChange}
        user={selectedUser ? list.find(user => user._id === selectedUser) : null}
        isActive={userStatus}
      />

      <UserDetailModal
        isOpen={userDetailModal}
        toggle={() => setUserDetailModal(!userDetailModal)}
        user={viewingUser}
        t={t}
      />
    </Container>
  );
};

export default withTranslation()(UserList);