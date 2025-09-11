import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import {
  Container, Row, Col, Card, CardHeader, CardBody,
  Button, Table, Badge, Input,
  Pagination, PaginationItem, PaginationLink, Dropdown,
  DropdownToggle, DropdownMenu, DropdownItem, Progress,
  Nav, NavItem, NavLink, TabContent, TabPane
} from 'reactstrap';
import './subcriptionDetails.css';
import BreadCrumb from '../Common/BreadCrumb';
import { FaBuilding, FaCalendarAlt, FaCrown, FaCheck, FaTimes } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import Plans from '../../pages/Landing/OnePage/PlansBackoffice'; // Import the Plans component
import { useSubscriptionTranslations } from '../../utils/subscriptionTranslations';
//i18n
import { withTranslation } from "react-i18next";

const SubscriptionDetails = (props) => {
  const { t } = props;
  const { translateFeatureName } = useSubscriptionTranslations();
  document.title = `${t('subscription.title')} | Nestleo`;
  
  const { user } = useSelector((state) => state.Loginn || {});
  const [filterText, setFilterText] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('current');
  
  const allSubscriptions = [
    user?.subscription,
    ...(user?.subscriptionHistory || [])
  ].filter(Boolean);

  // Separate current and history subscriptions
  const userCurrentSubscriptions = user?.subscription ? [user.subscription] : [];
  const userHistorySubscriptions = user?.subscriptionHistory || [];

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'canceled': return 'danger';
      case 'inactive': return 'warning';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter logic
  const getFilteredData = () => {
    let dataToFilter = [];
    
    if (activeTab === 'current') {
      dataToFilter = userCurrentSubscriptions;
    } else if (activeTab === 'history') {
      dataToFilter = userHistorySubscriptions;
    } else {
      dataToFilter = allSubscriptions;
    }
    
    return dataToFilter.filter(sub => {
      if (!sub) return false;
      
      const matchesSearch = (
        (sub.planId?.subscriptionType?.toLowerCase().includes(filterText.toLowerCase()) ||
          sub.status?.toLowerCase().includes(filterText.toLowerCase()) ||
          (sub.planId?.description && sub.planId.description.toLowerCase().includes(filterText.toLowerCase())) ||
          (!sub.planId && "trial".includes(filterText.toLowerCase()))
      ));
      
      return matchesSearch;
    });
  };

  const filteredData = getFilteredData();

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedSubscriptions = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  // Calculate statistics
  const activeSubscriptions = allSubscriptions.filter(sub => sub.status === 'active').length;
  const totalSubscriptions = allSubscriptions.length;
  const expiredSubscriptions = allSubscriptions.filter(sub => sub.status === 'canceled' || sub.status === 'inactive').length;
  
  const activePercentage = totalSubscriptions ? Math.round((activeSubscriptions / totalSubscriptions) * 100) : 0;
  const expiredPercentage = totalSubscriptions ? Math.round((expiredSubscriptions / totalSubscriptions) * 100) : 0;

  // Helper function to render subscription features
  const renderFeatures = (subscription) => {
    if (!subscription?.planId?.features || subscription.planId.features.length === 0) {
      return (
        <div className="text-center py-3">
          <div className="avatar-sm mx-auto mb-2">
            <div className="avatar-title bg-light text-muted rounded-circle fs-16">
              <i className="ri-file-list-2-line"></i>
            </div>
          </div>
          <p className="text-muted mb-0 fs-13">{t('subscription.noFeatures')}</p>
        </div>
      );
    }

    const activeFeatures = subscription.planId.features.filter(f => f.isActive);
    const inactiveFeatures = subscription.planId.features.filter(f => !f.isActive);

    return (
      <div className="features-container">
        {/* Active Features */}
        {activeFeatures.length > 0 && (
          <div className="mb-4">
            <h6 className="fw-semibold text-success mb-3">
              <i className="ri-check-line me-1"></i>
              {t('subscription.includedFeatures')} ({activeFeatures.length})
            </h6>
            <div className="row g-2">
              {activeFeatures.map((feature, index) => {
                const translatedName = translateFeatureName(feature.name);
                return (
                  <div key={index} className="col-md-6">
                    <div className="feature-item active">
                      <div className="d-flex align-items-center">
                        <div className="feature-icon success me-2">
                          <FaCheck size={12} />
                        </div>
                        <span className="feature-text">{translatedName}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Inactive Features */}
        {inactiveFeatures.length > 0 && (
          <div>
            <h6 className="fw-semibold text-muted mb-3">
              <i className="ri-close-line me-1"></i>
              {t('subscription.notIncludedFeatures')} ({inactiveFeatures.length})
            </h6>
            <div className="row g-2">
              {inactiveFeatures.map((feature, index) => {
                const translatedName = translateFeatureName(feature.name);
                return (
                  <div key={index} className="col-md-6">
                    <div className="feature-item inactive">
                      <div className="d-flex align-items-center">
                        <div className="feature-icon danger me-2">
                          <FaTimes size={12} />
                        </div>
                        <span className="feature-text text-muted">{translatedName}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title={t('subscription.title')} pageTitle={t('subscription.pageTitle')} />

          {/* Welcome Back Card - Replaced from SyndicWelcome.js */}
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
                        <h4 className="fw-semibold mb-2">{t('subscription.title')}</h4>
                        <p className="mb-3 text-muted">
                          {t('subscription.WelcomCaRD')}
                        </p>
                        <div className="d-flex flex-wrap gap-2">
                          {user.subscription && (
                            <Badge color="success" pill className="fs-12 py-2 px-3">
                              <FaCrown className="me-1" /> {user.subscription.planId?.subscriptionType || 'Free'} {t('subscription.Subscription')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="text-end">
                        <div className="d-flex justify-content-end">
                          <Button color="primary" tag={Link} to="/index" className="me-2">
                            <FaBuilding className="me-1" /> Dashboard
                          </Button>
                          <Button color="success" tag={Link} to="/calendar">
                            <FaCalendarAlt className="me-1" /> Calendar
                          </Button>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </CardBody>
              </Card>
            </Col>
          </Row>

          {/* Subscriptions List Section with gradient header */}
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader className="nestly-card-header align-items-center d-flex">
                  <h4 className="card-title mb-0 flex-grow-1">{t('subscription.subscriptions')}</h4>
                  <div className="flex-shrink-0 d-flex gap-2">
                    <div className="search-box">
                      <Input
                        type="text"
                        className="form-control search"
                        placeholder={t('subscription.search')}
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
                  </div>
                </CardHeader>

                <CardBody>
                  <Nav tabs className="nav-tabs-custom rounded card-header-tabs border-bottom-0 mb-4">
                    <NavItem>
                      <NavLink
                        className={activeTab === 'current' ? 'active' : ''}
                        onClick={() => setActiveTab('current')}
                        style={{ cursor: 'pointer' }}
                      >
                        <i className="ri-vip-crown-line me-1 align-bottom"></i> {t('subscription.current')}
                        <span className="badge bg-primary ms-1">{userCurrentSubscriptions.length}</span>
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink
                        className={activeTab === 'history' ? 'active' : ''}
                        onClick={() => setActiveTab('history')}
                        style={{ cursor: 'pointer' }}
                      >
                        <i className="ri-history-line me-1 align-bottom"></i> {t('subscription.history')}
                        <span className="badge bg-secondary ms-1">{userHistorySubscriptions.length}</span>
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink
                        className={activeTab === 'upgrade' ? 'active' : ''}
                        onClick={() => setActiveTab('upgrade')}
                        style={{ cursor: 'pointer' }}
                      >
                        <i className="ri-price-tag-3-line me-1 align-bottom"></i> {t('subscription.upgrade')}
                      </NavLink>
                    </NavItem>
                  </Nav>

                  <TabContent activeTab={activeTab} className="text-muted">
                    <TabPane tabId="current">
                      {filteredData.length > 0 ? (
                        <div className="table-responsive">
                          <Table hover className="align-middle position-relative table-striped">
                            <thead className="table-light">
                              <tr>
                                <th scope="col">{t('subscription.planType')}</th>
                                <th scope="col">{t('subscription.description')}</th>
                                <th scope="col">{t('subscription.startDate')}</th>
                                <th scope="col">{t('subscription.endDate')}</th>
                                <th scope="col">{t('subscription.status')}</th>
                                <th scope="col">{t('subscription.progress')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedSubscriptions.map((subscription, index) => {
                                const now = new Date();
                                const endDate = new Date(subscription.endDate);
                                const startDate = new Date(subscription.startDate);
                                const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                                const daysElapsed = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
                                const daysRemaining = Math.max(0, totalDays - daysElapsed);
                                const progressPercentage = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));

                                return (
                                  <tr key={subscription._id || index}>
                                    <td>
                                      <div className="d-flex align-items-center">
                                        <div className="avatar-xs me-2">
                                          <div className="avatar-title rounded-circle bg-primary-subtle text-primary">
                                            <i className="ri-vip-crown-line"></i>
                                          </div>
                                        </div>
                                        <div>
                                          <h5 className="mb-0 fs-14">
                                            {subscription.planId?.subscriptionType ||
                                              (subscription.status === 'active' ? t('subscription.trial') : t('subscription.expiredTrial'))}
                                          </h5>
                                        </div>
                                      </div>
                                    </td>
                                    <td>
                                      {subscription.planId?.description ||
                                        t('subscription.trialDescription')}
                                    </td>
                                    <td>{formatDate(subscription.startDate)}</td>
                                    <td>{formatDate(subscription.endDate)}</td>
                                    <td>
                                      <Badge color={getStatusColor(subscription.status)}>
                                        {subscription.status || '-'}
                                      </Badge>
                                    </td>
                                    <td>
                                      {subscription.status === 'active' && (
                                        <div style={{ width: '120px' }}>
                                          <div className="d-flex justify-content-between mb-1">
                                            <small>{Math.round(progressPercentage)}%</small>
                                            <small>{daysRemaining}d {t('subscription.left')}</small>
                                          </div>
                                          <Progress 
                                            color={progressPercentage > 80 ? 'danger' : progressPercentage > 50 ? 'warning' : 'success'} 
                                            value={progressPercentage} 
                                            style={{ height: "5px" }} 
                                          />
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-5">
                          <div className="avatar-lg mx-auto mb-4">
                            <div className="avatar-title bg-light text-primary rounded-circle fs-24">
                              <i className="ri-vip-crown-line"></i>
                            </div>
                          </div>
                          <h5>{t('subscription.noSubscriptions')}</h5>
                          {filterText && <p className="text-muted mb-0">{t('subscription.noMatches')} "{filterText}"</p>}
                          {activeTab === 'current' && <p className="text-muted mb-0">{t('subscription.noActive')}</p>}
                        </div>
                      )}

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="d-flex justify-content-between align-items-center mt-3">
                          <div className="d-flex align-items-center">
                            <span className="me-2">{t('subscription.show')}</span>
                            <Dropdown isOpen={dropdownOpen} toggle={toggleDropdown}>
                              <DropdownToggle caret color="light" size="sm">
                                {itemsPerPage}
                              </DropdownToggle>
                              <DropdownMenu>
                                <DropdownItem onClick={() => {setItemsPerPage(5); setCurrentPage(1);}}>5</DropdownItem>
                                <DropdownItem onClick={() => {setItemsPerPage(10); setCurrentPage(1);}}>10</DropdownItem>
                                <DropdownItem onClick={() => {setItemsPerPage(20); setCurrentPage(1);}}>20</DropdownItem>
                              </DropdownMenu>
                            </Dropdown>
                            <span className="ms-2">{t('subscription.entries')}</span>
                          </div>

                          <Pagination className="pagination-rounded mb-0">
                            <PaginationItem disabled={currentPage === 1}>
                              <PaginationLink
                                previous
                                onClick={() => setCurrentPage(currentPage - 1)}
                              />
                            </PaginationItem>
                            {Array.from({ length: totalPages }, (_, i) => (
                              <PaginationItem active={currentPage === i + 1} key={i}>
                                <PaginationLink onClick={() => setCurrentPage(i + 1)}>
                                  {i + 1}
                                </PaginationLink>
                              </PaginationItem>
                            ))}
                            <PaginationItem disabled={currentPage === totalPages}>
                              <PaginationLink
                                next
                                onClick={() => setCurrentPage(currentPage + 1)}
                              />
                            </PaginationItem>
                          </Pagination>
                        </div>
                      )}
                    </TabPane>
                    
                    <TabPane tabId="history">
                      {filteredData.length > 0 ? (
                        <div className="table-responsive">
                          <Table hover className="align-middle position-relative table-striped">
                            <thead className="table-light">
                              <tr>
                                <th scope="col">{t('subscription.planType')}</th>
                                <th scope="col">{t('subscription.description')}</th>
                                <th scope="col">{t('subscription.startDate')}</th>
                                <th scope="col">{t('subscription.endDate')}</th>
                                <th scope="col">{t('subscription.status')}</th>
                                <th scope="col">{t('subscription.duration')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedSubscriptions.map((subscription, index) => {
                                const now = new Date();
                                const endDate = new Date(subscription.endDate);
                                const startDate = new Date(subscription.startDate);
                                const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

                                return (
                                  <tr key={subscription._id || `history-${index}`}>
                                    <td>
                                      <div className="d-flex align-items-center">
                                        <div className="avatar-xs me-2">
                                          <div className="avatar-title rounded-circle bg-secondary-subtle text-secondary">
                                            <i className="ri-history-line"></i>
                                          </div>
                                        </div>
                                        <div>
                                          <h5 className="mb-0 fs-14">
                                            {subscription.planId?.subscriptionType ||
                                              (subscription.status === 'expired' ? t('subscription.expiredTrial') : t('subscription.trial'))}
                                          </h5>
                                        </div>
                                      </div>
                                    </td>
                                    <td>
                                      {subscription.planId?.description ||
                                        t('subscription.trialDescription')}
                                    </td>
                                    <td>{formatDate(subscription.startDate)}</td>
                                    <td>{formatDate(subscription.endDate)}</td>
                                    <td>
                                      <Badge color={getStatusColor(subscription.status)}>
                                        {subscription.status || '-'}
                                      </Badge>
                                    </td>
                                    <td>
                                      <span className="text-muted">{totalDays} {t('subscription.days')}</span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-5">
                          <div className="avatar-lg mx-auto mb-4">
                            <div className="avatar-title bg-light text-secondary rounded-circle fs-24">
                              <i className="ri-history-line"></i>
                            </div>
                          </div>
                          <h5>{t('subscription.noHistory')}</h5>
                          {filterText && <p className="text-muted mb-0">{t('subscription.noMatches')} "{filterText}"</p>}
                          <p className="text-muted mb-0">{t('subscription.noHistoryDescription')}</p>
                        </div>
                      )}
                    </TabPane>
                    
                    <TabPane tabId="upgrade">
                      <Plans />
                    </TabPane>
                  </TabContent>
                </CardBody>
              </Card>
            </Col>
          </Row>

          {/* Current Subscription Details with gradient header */}
          {user?.subscription && activeTab === 'current' && (
            <Row className="mt-4">
              <Col lg={6}>
                <Card>
                  <CardHeader className="nestly-card-header">
                    <h5 className="card-title mb-0">
                      <i className="ri-information-line me-2"></i>
                      {t('subscription.details')}
                    </h5>
                  </CardHeader>
                  <CardBody>
                    <div className="table-responsive">
                      <table className="table table-borderless mb-0">
                        <tbody>
                          <tr>
                            <th scope="row" className="fw-medium" style={{ width: "40%" }}>{t('subscription.planType')}:</th>
                            <td>
                              <Badge color="primary" className="fs-12">
                                {user?.subscription?.planId?.subscriptionType || t('subscription.trial')}
                              </Badge>
                            </td>
                          </tr>
                          <tr>
                            <th scope="row" className="fw-medium">{t('subscription.status')}:</th>
                            <td>
                              <Badge color={getStatusColor(user?.subscription?.status)} className="fs-12">
                                {user?.subscription?.status || '-'}
                              </Badge>
                            </td>
                          </tr>
                          <tr>
                            <th scope="row" className="fw-medium">{t('subscription.startDate')}:</th>
                            <td>{formatDate(user?.subscription?.startDate)}</td>
                          </tr>
                          <tr>
                            <th scope="row" className="fw-medium">{t('subscription.endDate')}:</th>
                            <td>{formatDate(user?.subscription?.endDate)}</td>
                          </tr>
                          <tr>
                            <th scope="row" className="fw-medium">{t('subscription.description')}:</th>
                            <td>
                              {user?.subscription?.planId?.description || 
                               t('subscription.currentTrial')}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardBody>
                </Card>
              </Col>
              {/* Only render Usage Progress card if NOT a free pack */}
              {user?.subscription?.planId?.price !== 0 && (
                <Col lg={6}>
                  <Card>
                    <CardHeader className="nestly-card-header">
                      <h5 className="card-title mb-0">
                        <i className="ri-time-line me-2"></i>
                        {t('subscription.usage')}
                      </h5>
                    </CardHeader>
                    <CardBody>
                      {(() => {
                        const now = new Date();
                        const endDate = new Date(user?.subscription?.endDate);
                        const startDate = new Date(user?.subscription?.startDate);
                        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                        const daysElapsed = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
                        const daysRemaining = Math.max(0, totalDays - daysElapsed);
                        const progressPercentage = totalDays > 0 ? Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100)) : 0;
                        return (
                          <>
                            <div className="mb-3">
                              <div className="d-flex justify-content-between mb-2">
                                <span className="fw-medium">{t('subscription.timeProgress')}</span>
                                <span className="text-muted">{Math.round(progressPercentage)}%</span>
                              </div>
                              <Progress 
                                color={progressPercentage > 80 ? 'danger' : progressPercentage > 50 ? 'warning' : 'success'} 
                                value={progressPercentage} 
                                style={{ height: "8px" }} 
                              />
                            </div>
                            <Row className="text-center">
                              <Col sm={4}>
                                <div className="border rounded p-3">
                                  <h4 className="mb-1 text-primary">{totalDays}</h4>
                                  <p className="text-muted mb-0 fs-13">{t('subscription.totalDays')}</p>
                                </div>
                              </Col>
                              <Col sm={4}>
                                <div className="border rounded p-3">
                                  <h4 className="mb-1 text-success">{daysElapsed}</h4>
                                  <p className="text-muted mb-0 fs-13">{t('subscription.daysUsed')}</p>
                                </div>
                              </Col>
                              <Col sm={4}>
                                <div className="border rounded p-3">
                                  <h4 className="mb-1 text-warning">{daysRemaining}</h4>
                                  <p className="text-muted mb-0 fs-13">{t('subscription.daysLeft')}</p>
                                </div>
                              </Col>
                            </Row>
                          </>
                        );
                      })()}
                    </CardBody>
                  </Card>
                </Col>
              )}
            </Row>
          )}

          {/* Subscription Features Section */}
          {user?.subscription && activeTab === 'current' && (
            <Row className="mt-4">
              <Col lg={12}>
                <Card>
                  <CardHeader className="nestly-card-header">
                    <h5 className="card-title mb-0">
                      <i className="ri-file-list-2-line me-2"></i>
                      {t('subscription.planFeatures')}
                    </h5>
                  </CardHeader>
                  <CardBody>
                    {renderFeatures(user.subscription)}
                  </CardBody>
                </Card>
              </Col>
            </Row>
          )}
        </Container>
      </div>
    </React.Fragment>
  );
};

SubscriptionDetails.propTypes = {
  t: PropTypes.func.isRequired,
};

export default withTranslation()(SubscriptionDetails);