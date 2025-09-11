import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, CardBody, CardHeader, Row, Col, Button, Progress,
  Spinner, Badge, UncontrolledDropdown, DropdownToggle,
  DropdownMenu, DropdownItem
} from 'reactstrap';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { withTranslation } from 'react-i18next';
import api from '../../services/api';
import { initializeSocket, refreshOnlineUsers } from '../../services/socketManager';
import Charts from 'react-apexcharts';
import CountUp from 'react-countup';
import './superAdminpage.css';

/**
 * User Statistics Component
 * Displays statistics about platform users
 */
const UserStats = ({ t }) => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    onlineUsers: 0,
    adminUsers: 0,
    syndicateAdmins: 0,
    syndicateCoowners: 0,
    workers: 0
  });
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        setLoading(true);

        let userStats = {
          totalUsers: 0,
          activeUsers: 0,
          inactiveUsers: 0,
          adminUsers: 0,
          syndicateAdmins: 0,
          syndicateCoowners: 0,
          workers: 0,
          onlineUsers: 0
        };

        try {
          const usersResponse = await api.get('/users/all', {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (usersResponse.data && Array.isArray(usersResponse.data)) {
            const users = usersResponse.data;
            userStats = {
              totalUsers: users.length,
              activeUsers: users.filter(u => u.isActive).length,
              inactiveUsers: users.filter(u => !u.isActive).length,
              adminUsers: users.filter(u => u.role === 'Admin').length,
              syndicateAdmins: users.filter(u => u.role === 'SyndicateAdmin').length,
              syndicateCoowners: users.filter(u => u.role === 'SyndicateCoowner' || u.role === 'Co-owner').length,
              workers: users.filter(u => u.role === 'Worker').length,
              onlineUsers: onlineUsers.length
            };

            console.log("User stats calculated:", userStats);
            console.log("User roles distribution:", {
              admins: users.filter(u => u.role === 'Admin').length,
              syndicateAdmins: users.filter(u => u.role === 'SyndicateAdmin').length,
              coowners: users.filter(u => u.role === 'SyndicateCoowner' || u.role === 'Co-owner').length,
            });
          }
        } catch (apiError) {
          console.error("API error fetching users:", apiError);
        }

        setStats(prevStats => ({
          ...userStats,
          onlineUsers: onlineUsers.length || prevStats.onlineUsers
        }));
      } catch (error) {
        console.error("Error in user stats flow:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();

    const handleOnlineUsersUpdate = (event) => {
      const { users, count } = event.detail;
      console.log("Custom event online users received:", count);
      
      if (Array.isArray(users)) {
        setOnlineUsers(users);
        setStats(prevStats => ({
          ...prevStats,
          onlineUsers: users.length
        }));
      }
    };

    document.addEventListener('onlineUsersUpdated', handleOnlineUsersUpdate);
    
    const interval = setInterval(() => {
      refreshOnlineUsers();
    }, 30000);

    const socket = initializeSocket();

    const handleOnlineUsers = (userIds) => {
      console.log("Online users received:", userIds);
      if (Array.isArray(userIds)) {
        setOnlineUsers(userIds);
        setStats(prevStats => ({
          ...prevStats,
          onlineUsers: userIds.length
        }));
      }
    };

    socket.on('onlineUsers', handleOnlineUsers);
    socket.emit('getOnlineUsers');

    return () => {
      document.removeEventListener('onlineUsersUpdated', handleOnlineUsersUpdate);
      clearInterval(interval);
      socket.off('onlineUsers');
    };
  }, [token]);

  const activePercentage = Math.round((stats.activeUsers / (stats.totalUsers || 1)) * 100);

  const userTypeChart = {
    series: [
      Math.max(0, parseInt(stats.adminUsers) || 0),
      Math.max(0, parseInt(stats.syndicateAdmins) || 0),
      Math.max(0, parseInt(stats.syndicateCoowners) || 0),
      Math.max(0, parseInt(stats.workers) || 0)
    ],
    options: {
      labels: [
        t('userStats.labels.admins'),
        t('userStats.labels.syndicateAdmins'),
        t('userStats.labels.coowners'),
        t('userStats.labels.workers')
      ],
      colors: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e'],
      chart: {
        type: 'donut',
      },
      legend: {
        position: 'bottom',
        show: true
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              total: {
                show: true,
                label: t('userStats.labels.totalUsers'),
                formatter: function () { return stats.totalUsers; }
              }
            }
          }
        }
      }
    }
  };

  useEffect(() => {
    if (stats.totalUsers > 0) {
      console.log("Chart rendering with:", {
        series: userTypeChart.series,
        total: stats.totalUsers,
        adminUsers: stats.adminUsers,
        syndicateAdmins: stats.syndicateAdmins,
        syndicateCoowners: stats.syndicateCoowners,
        hasNonZeroValue: userTypeChart.series.some(val => val > 0)
      });
    }
  }, [stats, userTypeChart.series]);

  return (
    <Card className="nestly-card mb-4 h-100">
      <CardHeader className="nestly-card-header">
        <div className="nestly-card-pattern"></div>
        <div className="d-flex align-items-center position-relative" style={{ zIndex: '1' }}>
          <div className="nestly-icon-container nestly-icon-container-coral me-3">
            <i className="ri-user-settings-line fs-4"></i>
          </div>
          <h5 className="mb-0">{t('userStats.title')}</h5>
        </div>
      </CardHeader>

      <CardBody>
        {loading ? (
          <div className="text-center py-4">
            <Spinner color="primary" size="sm" />
            <p className="text-muted mt-2">{t('userStats.loading')}</p>
          </div>
        ) : (
          <>
            <Row className="mb-4">
              <Col md={6} className="mb-3 mb-md-0">
                <div className="d-flex h-100">
                  <div className="flex-shrink-0 me-3">
                    <div className="avatar-sm">
                      <div className="avatar-title bg-soft-primary rounded-circle text-primary">
                        <i className="ri-user-follow-line fs-4"></i>
                      </div>
                    </div>
                  </div>
                  <div className="flex-grow-1">
                    <h4 className="fs-22 fw-semibold mb-1">
                      <CountUp start={0} end={stats.totalUsers} duration={2} separator="," />
                    </h4>
                    <p className="text-muted mb-0">{t('userStats.totalUsers')}</p>

                    <div className="mt-3 pt-1">
                      <div className="d-flex justify-content-between">
                        <p className="text-muted mb-0">{t('userStats.active', { percentage: activePercentage })}</p>
                        <p className="text-muted mb-0">
                          {stats.activeUsers}/{stats.totalUsers}
                        </p>
                      </div>
                      <Progress value={activePercentage} color="success" className="progress-sm mt-2" />
                    </div>
                  </div>
                </div>
              </Col>

              <Col md={6}>
                {[
                  {
                    left: { count: stats.onlineUsers, label: t('userStats.onlineNow'), icon: true },
                    right: { count: stats.inactiveUsers, label: t('userStats.inactiveUsers') }
                  },
                  {
                    left: { count: stats.adminUsers, label: t('userStats.admins') },
                    right: { count: stats.syndicateAdmins, label: t('userStats.syndicateAdmins') }
                  },
                ].map((row, index) => (
                  <Row
                    key={index}
                    className={`g-0 align-items-stretch ${index > 0 ? 'border-top' : ''}`}
                    style={{ minHeight: '90px' }}
                  >
                    <Col xs={6} className="border-end d-flex align-items-center justify-content-center">
                      <div className="text-center p-3 w-100">
                        <h5 className="fs-17 mb-2">
                          <CountUp start={0} end={row.left.count} duration={2} />
                        </h5>
                        <p className="text-muted mb-0">
                          {row.left.icon && (
                            <i
                              className="ri-record-circle-fill text-success me-1 align-middle"
                              style={{ fontSize: '10px' }}
                            ></i>
                          )}
                          {row.left.label}
                        </p>
                      </div>
                    </Col>
                    <Col xs={6} className="d-flex align-items-center justify-content-center">
                      <div className="text-center p-3 w-100">
                        <h5 className="fs-17 mb-2">
                          <CountUp start={0} end={row.right.count} duration={2} />
                        </h5>
                        <p className="text-muted mb-0">{row.right.label}</p>
                      </div>
                    </Col>
                  </Row>
                ))}
              </Col>
            </Row>

            <h6 className="mb-3 text-center">{t('userStats.userDistribution')}</h6>

            <div className="chart-container d-flex justify-content-center" style={{ height: '280px' }}>
              {stats.totalUsers > 0 ? (
                stats.adminUsers === 0 &&
                stats.syndicateAdmins === 0 &&
                stats.syndicateCoowners === 0 ? (
                  <div className="text-center py-5">
                    <div className="avatar-md mx-auto mb-3">
                      <div className="avatar-title bg-light text-secondary rounded-circle">
                        <i className="ri-user-line fs-2"></i>
                      </div>
                    </div>
                    <p className="text-muted">{t('userStats.noRoleData')}</p>
                  </div>
                ) : (
                  <Charts
                    options={{
                      ...userTypeChart.options,
                      chart: {
                        ...userTypeChart.options.chart,
                        width: 380,
                        height: 280,
                        type: 'donut',
                        offsetX: 0
                      },
                      dataLabels: { enabled: true },
                      stroke: { width: 2 },
                      tooltip: { enabled: true },
                      animations: {
                        enabled: true,
                        easing: 'easeinout',
                        speed: 800
                      }
                    }}
                    series={userTypeChart.series}
                    type="donut"
                    height={280}
                    width={380}
                  />
                )
              ) : (
                <div className="text-center py-5">
                  <Spinner color="primary" size="sm" />
                  <p className="text-muted mt-2">{t('userStats.loadingUserData')}</p>
                </div>
              )}
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
};

/**
 * Subscription Overview Component
 * Displays subscription statistics and trends
 */
const SubscriptionOverview = ({ t }) => {
  const [stats, setStats] = useState({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    monthlySubscriptions: 0,
    yearlySubscriptions: 0,
    freeSubscriptions: 0,
    expiringSoon: 0,
    revenueThisMonth: 0,
    revenueTrend: [0, 0, 0, 0, 0],
    subscriptionsByPlan: []
  });
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchSubscriptionData = async () => {
      try {
        setLoading(true);

        const usersResponse = await api.get('/users/all', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const users = usersResponse.data || [];
        console.log(`Retrieved ${users.length} users`);

        const paidSubscribers = users.filter(user =>
          user.subscription &&
          user.subscription.status === 'active' &&
          !user.subscription.isTrial
        );

        console.log(`Found ${paidSubscribers.length} active paid subscribers`);

        let subscriptionPlans = [];
        try {
          const plansResponse = await api.get('/api/subscriptions', {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (Array.isArray(plansResponse?.data)) {
            subscriptionPlans = plansResponse.data;
          } else if (plansResponse?.data?.data && Array.isArray(plansResponse.data.data)) {
            subscriptionPlans = plansResponse.data.data;
          }

          console.log(`Retrieved ${subscriptionPlans.length} subscription plans`);
        } catch (plansError) {
          console.error("Error fetching subscription plans:", plansError);
        }

        const planMap = {};
        subscriptionPlans.forEach(plan => {
          planMap[plan._id] = plan;
        });

        let monthlyCount = 0;
        let yearlyCount = 0;
        let freeCount = 0;
        let monthlyRevenue = 0;
        const planDistribution = {};

        paidSubscribers.forEach(user => {
          const userPlanId = user.subscription?.planId;
          const plan = userPlanId ? planMap[userPlanId] : null;

          if (plan) {
            if (plan.interval?.toLowerCase().includes('month')) {
              monthlyCount++;
              monthlyRevenue += parseFloat(plan.price || 0);
            } else if (plan.interval?.toLowerCase().includes('year')) {
              yearlyCount++;
              monthlyRevenue += (parseFloat(plan.price || 0) / 12);
            }

            if (parseFloat(plan.price || 0) === 0) {
              freeCount++;
            }

            const planType = plan.subscriptionType || t('subscriptionOverview.unknownPlan');
            planDistribution[planType] = (planDistribution[planType] || 0) + 1;
          } else {
            console.log(`User ${user._id} has subscription but no matching plan found`);
          }
        });

        const now = new Date();
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

        const expiringCount = paidSubscribers.filter(user => {
          if (!user.subscription?.endDate) return false;
          const endDate = new Date(user.subscription.endDate);
          return endDate >= now && endDate <= thirtyDaysLater;
        }).length;

        const subscriptionsByPlan = Object.entries(planDistribution).map(([name, count]) => ({
          name, count
        }));

        const revenueTrend = [
          monthlyRevenue * 0.85,
          monthlyRevenue * 0.90,
          monthlyRevenue * 0.95,
          monthlyRevenue,
          monthlyRevenue * 1.05,
        ];

        setStats({
          totalSubscriptions: paidSubscribers.length,
          activeSubscriptions: paidSubscribers.length,
          monthlySubscriptions: monthlyCount,
          yearlySubscriptions: yearlyCount,
          freeSubscriptions: freeCount,
          expiringSoon: expiringCount,
          revenueThisMonth: monthlyRevenue,
          revenueTrend,
          subscriptionsByPlan
        });

        console.log("Subscription stats calculated:", {
          totalSubscriptions: paidSubscribers.length,
          monthlySubscriptions: monthlyCount,
          yearlySubscriptions: yearlyCount,
          freeSubscriptions: freeCount,
          monthlyRevenue,
          expiringSoon: expiringCount
        });
      } catch (error) {
        console.error("Error processing subscription data:", error);
        setStats({
          totalSubscriptions: 0,
          activeSubscriptions: 0,
          monthlySubscriptions: 0,
          yearlySubscriptions: 0,
          freeSubscriptions: 0,
          expiringSoon: 0,
          revenueThisMonth: 0,
          revenueTrend: [0, 0, 0, 0, 0],
          subscriptionsByPlan: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionData();
  }, [token, t]);

  const activePercentage = Math.round((stats.activeSubscriptions / (stats.totalSubscriptions || 1)) * 100);

  const revenueTrendChart = {
    series: [{
      name: t('subscriptionOverview.monthlyRevenue'),
      data: stats.revenueTrend
    }],
    options: {
      chart: {
        type: 'area',
        height: 150,
        sparkline: {
          enabled: true
        }
      },
      stroke: {
        curve: 'smooth',
        width: 2,
      },
      colors: ['#0ab39c'],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          inverseColors: false,
          opacityFrom: 0.45,
          opacityTo: 0.05,
          stops: [50, 100, 100, 100]
        },
      },
      tooltip: {
        fixed: {
          enabled: false
        },
        x: {
          show: false
        },
        marker: {
          show: false
        }
      }
    }
  };

  return (
    <Card className="nestly-card mb-4 h-100">
      <CardHeader className="nestly-card-header">
        <div className="nestly-card-pattern"></div>
        <div className="d-flex align-items-center position-relative" style={{ zIndex: '1' }}>
          <div className="nestly-icon-container nestly-icon-container-teal me-3">
            <i className="ri-vip-crown-line fs-4"></i>
          </div>
          <h5 className="mb-0">{t('subscriptionOverview.title')}</h5>
        </div>
      </CardHeader>
      <CardBody>
        {loading ? (
          <div className="text-center py-4">
            <Spinner color="primary" size="sm" />
            <p className="text-muted mt-2">{t('subscriptionOverview.loading')}</p>
          </div>
        ) : (
          <>
            <Row className="mb-4">
              <Row className="mb-4">
                <Col xl={6} md={6} className="mb-3 mb-xl-0">
                  <div className="d-flex h-100 align-items-center">
                    <div className="flex-shrink-0 me-3">
                      <div className="avatar-sm">
                        <div className="avatar-title bg-soft-warning rounded-circle text-warning">
                          <i className="ri-stack-line fs-4"></i>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="fs-22 fw-semibold mb-1">
                        <CountUp start={0} end={stats.activeSubscriptions} duration={2} separator="," />
                      </h4>
                      <p className="text-muted mb-0">{t('subscriptionOverview.payingSubscribers')}</p>
                    </div>
                  </div>
                </Col>

                <Col xl={6} md={6}>
                  <div className="d-flex flex-column gap-3 h-100 justify-content-between">
                    <div className="card mini-stats-wid border shadow-none mb-0">
                      <div className="card-body">
                        <div className="d-flex">
                          <div className="flex-grow-1">
                            <p className="text-muted fw-medium mb-2">{t('subscriptionOverview.monthlySubscriptions')}</p>
                            <h4 className="mb-0">{stats.monthlySubscriptions}</h4>
                          </div>
                          <div className="flex-shrink-0 align-self-center">
                            <div className="mini-stat-icon avatar-sm rounded-circle bg-info">
                              <span className="avatar-title">
                                <i className="ri-calendar-check-line font-size-20"></i>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="card mini-stats-wid border shadow-none mb-0">
                      <div className="card-body">
                        <div className="d-flex">
                          <div className="flex-grow-1">
                            <p className="text-muted fw-medium mb-2">{t('subscriptionOverview.yearlySubscriptions')}</p>
                            <h4 className="mb-0">{stats.yearlySubscriptions}</h4>
                          </div>
                          <div className="flex-shrink-0 align-self-center">
                            <div className="avatar-sm rounded-circle bg-success mini-stat-icon">
                              <span className="avatar-title">
                                <i className="ri-calendar-check-fill font-size-20"></i>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>

              <Col xl={12} md={12}>
                <div className="card border shadow-none mb-0">
                  <div className="card-body">
                    <div className="d-flex align-items-start">
                      <div className="flex-grow-1 overflow-hidden">
                        <p className="text-muted fw-medium mb-1">{t('subscriptionOverview.monthlyRevenue')}</p>
                        <h5 className="font-size-16 mb-0">${stats.revenueThisMonth.toFixed(2)}</h5>
                      </div>
                      <div className="ms-2">
                        <Badge color="warning" className="px-2">
                          <i className="ri-time-line me-1"></i> {t('subscriptionOverview.expiringSoon', { count: stats.expiringSoon })}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="card-body border-top py-0">
                    <Charts
                      options={revenueTrendChart.options}
                      series={revenueTrendChart.series}
                      type="area"
                      height="150"
                    />
                  </div>
                </div>
              </Col>
            </Row>
            <h6 className="mb-3">{t('subscriptionOverview.subscriptionsByPlan')}</h6>
            <div className="table-responsive">
              <table className="table table-borderless table-sm mb-0">
                <thead className="table-light">
                  <tr>
                    <th scope="col">{t('subscriptionOverview.planType')}</th>
                    <th scope="col" className="text-end">{t('subscriptionOverview.count')}</th>
                    <th scope="col">{t('subscriptionOverview.distribution')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.subscriptionsByPlan.length > 0 ? (
                    stats.subscriptionsByPlan.map((plan, index) => {
                      const percentage = Math.round((plan.count / stats.totalSubscriptions) * 100);
                      const colors = ['primary', 'success', 'warning', 'warning', 'danger'];
                      return (
                        <tr key={index}>
                          <td>{plan.name}</td>
                          <td className="text-end">{plan.count}</td>
                          <td style={{ width: '50%' }}>
                            <div className="d-flex justify-content-between">
                              <Progress
                                value={percentage}
                                color={colors[index % colors.length]}
                                className="progress-sm mt-2 w-75"
                              />
                              <span className="ms-2">{percentage}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="3" className="text-center">
                        {t('subscriptionOverview.noPlans')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
};

/**
 * Contract Overview Component
 * Displays contract statistics and status
 */
const ContractOverview = ({ t }) => {
  const [stats, setStats] = useState({
    totalContracts: 0,
    activeContracts: 0,
    draftContracts: 0,
    expiringContracts: 0,
    recentlyAddedContracts: []
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchContractStats = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/contracts', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const contracts = response.data;
        const now = new Date();
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

        const activeContracts = contracts.filter(c => c.status === 'Active').length;
        const draftContracts = contracts.filter(c => c.status === 'Draft').length;

        const expiringContracts = contracts.filter(contract => {
          const endDate = new Date(contract.endDate);
          return contract.status === 'Active' && endDate >= now && endDate <= thirtyDaysLater;
        }).length;

        const recentlyAddedContracts = [...contracts]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 4)
          .map(c => ({
            id: c._id,
            title: c.title,
            status: c.status,
            date: c.createdAt
          }));

        setStats({
          totalContracts: contracts.length,
          activeContracts,
          draftContracts,
          expiringContracts,
          recentlyAddedContracts
        });
      } catch (error) {
        console.error("Error fetching contract stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContractStats();
  }, [token]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'success';
      case 'draft': return 'warning';
      case 'expired': return 'danger';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      return t('contractOverview.invalidDate');
    }
  };

  return (
    <Card className="nestly-card mb-4 h-100">
      <CardHeader className="nestly-card-header">
        <div className="nestly-card-pattern"></div>
        <div className="d-flex align-items-center justify-content-between position-relative" style={{ zIndex: '1' }}>
          <div className="d-flex align-items-center">
            <div className="nestly-icon-container nestly-icon-container-coral me-3">
              <i className="ri-file-list-3-line fs-4"></i>
            </div>
            <h5 className="mb-0">{t('contractOverview.title')}</h5>
          </div>
        </div>
      </CardHeader>
      <CardBody>
        {loading ? (
          <div className="text-center py-4">
            <Spinner color="primary" size="sm" />
            <p className="text-muted mt-2">{t('contractOverview.loading')}</p>
          </div>
        ) : (
          <>
            <div className="row mb-4">
              <div className="col-md-3 col-6 mb-3">
                <div className="card mini-stats-wid border shadow-none mb-0">
                  <div className="card-body">
                    <div className="text-center">
                      <div className="avatar-sm mx-auto mb-3">
                        <span className="avatar-title rounded-circle bg-soft-primary text-primary font-size-16">
                          <i className="ri-file-list-3-line"></i>
                        </span>
                      </div>
                      <h5 className="font-size-15">{stats.totalContracts}</h5>
                      <p className="text-muted">{t('contractOverview.total')}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-3 col-6 mb-3">
                <div className="card mini-stats-wid border shadow-none mb-0">
                  <div className="card-body">
                    <div className="text-center">
                      <div className="avatar-sm mx-auto mb-3">
                        <span className="avatar-title rounded-circle bg-soft-success text-success font-size-16">
                          <i className="ri-check-double-line"></i>
                        </span>
                      </div>
                      <h5 className="font-size-15">{stats.activeContracts}</h5>
                      <p className="text-muted">{t('contractOverview.active')}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-3 col-6 mb-3">
                <div className="card mini-stats-wid border shadow-none mb-0">
                  <div className="card-body">
                    <div className="text-center">
                      <div className="avatar-sm mx-auto mb-3">
                        <span className="avatar-title rounded-circle bg-soft-warning text-warning font-size-16">
                          <i className="ri-draft-line"></i>
                        </span>
                      </div>
                      <h5 className="font-size-15">{stats.draftContracts}</h5>
                      <p className="text-muted">{t('contractOverview.drafts')}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-3 col-6 mb-3">
                <div className="card mini-stats-wid border shadow-none mb-0">
                  <div className="card-body">
                    <div className="text-center">
                      <div className="avatar-sm mx-auto mb-3">
                        <span className="avatar-title rounded-circle bg-soft-danger text-danger font-size-16">
                          <i className="ri-alarm-warning-line"></i>
                        </span>
                      </div>
                      <h5 className="font-size-15">{stats.expiringContracts}</h5>
                      <p className="text-muted">{t('contractOverview.expiringSoon')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="d-flex justify-content-between mb-4">
                <h6 className="mb-0">{t('contractOverview.recentlyAdded')}</h6>
                <a href="/contract" className="text-primary">{t('contractOverview.viewAll')} <i className="ri-arrow-right-line align-middle"></i></a>
              </div>

              <div className="contract-list">
                {stats.recentlyAddedContracts.length > 0 ? (
                  stats.recentlyAddedContracts.map(contract => (
                    <div key={contract.id} className="d-flex align-items-center mb-3 p-2 border-bottom">
                      <div className="avatar-sm me-3">
                        <div className={`avatar-title rounded-circle bg-soft-${getStatusColor(contract.status)} text-${getStatusColor(contract.status)}`}>
                          <i className="ri-file-text-line"></i>
                        </div>
                      </div>
                      <div className="flex-grow-1">
                        <h6 className="mb-1">{contract.title}</h6>
                        <div className="d-flex align-items-center">
                          <small className="text-muted me-2">{formatDate(contract.date)}</small>
                          <Badge color={getStatusColor(contract.status)} pill size="sm">
                            {t(`contractOverview.status.${contract.status.toLowerCase()}`)}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <UncontrolledDropdown>
                          <DropdownToggle tag="a" className="btn btn-sm btn-ghost-secondary">
                            <i className="ri-more-2-fill"></i>
                          </DropdownToggle>
                          <DropdownMenu>
                            <DropdownItem onClick={() => navigate(`/contracts/${contract.id}`)}>
                              <i className="ri-eye-line me-2"></i> {t('contractOverview.view')}
                            </DropdownItem>
                            <DropdownItem onClick={() => navigate(`/contracts/edit/${contract.id}`)}>
                              <i className="ri-edit-2-line me-2"></i> {t('contractOverview.edit')}
                            </DropdownItem>
                            <DropdownItem divider />
                            <DropdownItem className="text-danger">
                              <i className="ri-delete-bin-line me-2"></i> {t('contractOverview.delete')}
                            </DropdownItem>
                          </DropdownMenu>
                        </UncontrolledDropdown>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted">
                    <div className="avatar-md mx-auto mb-4">
                      <div className="avatar-title bg-light text-secondary rounded-3">
                        <i className="ri-file-text-line fs-1"></i>
                      </div>
                    </div>
                    <h6>{t('contractOverview.noRecentContracts')}</h6>
                    <p className="text-muted">{t('contractOverview.noRecentContractsDesc')}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
};

/**
 * Main SuperAdmin/Admin Welcome Component
 */
const AdminSuperWelcome = ({ t }) => {
  const user = useSelector(state => state.Loginn.user) || {};
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    const socket = initializeSocket();
    socket.on('onlineUsers', (userIds) => {
      setOnlineCount(Array.isArray(userIds) ? userIds.length : 0);
    });

    socket.emit('getOnlineUsers');

    return () => {
      if (socket) {
        socket.off('onlineUsers');
      }
    };
  }, []);

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('welcome.morning');
    if (hour < 18) return t('welcome.afternoon');
    return t('welcome.evening');
  };

  return (
    <React.Fragment>
      <Row className="mb-4">
        <Col>
          <Card className="welcome-card">
            <CardBody className="p-4">
              <div className="d-md-flex align-items-center">
                <div className="flex-shrink-0 mb-3 mb-md-0 me-md-4">
                  <div className="avatar-lg">
                    <div className="avatar-title bg-soft-primary text-primary display-4 rounded-circle">
                      {user.firstName ? user.firstName.charAt(0).toUpperCase() : 'A'}
                    </div>
                  </div>
                </div>
                <div className="flex-grow-1">
                  <h4>{getTimeOfDay()}, {user.firstName || t('welcome.administrator')}!</h4>
                  <p className="text-muted mb-0">
                    {t('welcome.description')}
                  </p>
                </div>
                <div className="d-flex gap-2 mt-3 mt-md-0 ms-md-3">
                  <Button color="primary" onClick={() => navigate('/users')}>
                    <i className="ri-user-settings-line me-1"></i> {t('welcome.manageUsers')}
                  </Button>
                  <Button color="light" onClick={() => navigate('/subscription')}>
                    <i className="ri-vip-crown-line me-1"></i> {t('welcome.subscriptions')}
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col xl={12}>
          <UserStats t={t} />
        </Col>
      </Row>

      <Row className="g-4">
        <Col xl={6}>
          <SubscriptionOverview t={t} />
        </Col>
        <Col xl={6}>
          <ContractOverview t={t} />
        </Col>
      </Row>

      <Row className="mt-4">
        <Col>
          <Card>
            <CardBody>
              <h5 className="mb-3">{t('quickActions.title')}</h5>
              <Row className="g-3">
                <Col md={3} sm={6}>
                  <Button color="light" className="w-100 py-3" onClick={() => navigate('/users/add')}>
                    <i className="ri-user-add-line d-block fs-4 mb-1"></i>
                    {t('quickActions.addUser')}
                  </Button>
                </Col>
                <Col md={3} sm={6}>
                  <Button color="light" className="w-100 py-3" onClick={() => navigate('/subscription/new')}>
                    <i className="ri-vip-crown-line d-block fs-4 mb-1"></i>
                    {t('quickActions.createSubscription')}
                  </Button>
                </Col>
                <Col md={3} sm={6}>
                  <Button color="light" className="w-100 py-3" onClick={() => navigate('/contracts/new')}>
                    <i className="ri-file-add-line d-block fs-4 mb-1"></i>
                    {t('quickActions.addContract')}
                  </Button>
                </Col>
                <Col md={3} sm={6}>
                  <Button color="light" className="w-100 py-3" onClick={() => navigate('/settings')}>
                    <i className="ri-settings-3-line d-block fs-4 mb-1"></i>
                    {t('quickActions.systemSettings')}
                  </Button>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </React.Fragment>
  );
};

export default withTranslation()(AdminSuperWelcome);