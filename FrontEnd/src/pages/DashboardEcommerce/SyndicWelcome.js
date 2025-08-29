import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Row, Col, Card, CardBody, CardHeader,
    Badge, Button, Progress, ListGroup, ListGroupItem,
    UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem
} from 'reactstrap';
import { Link, useNavigate } from 'react-router-dom';
import CountUp from 'react-countup';
import { useDispatch, useSelector } from 'react-redux';
import {
    FaBuilding, FaLayerGroup, FaHome, FaUsers, FaFileInvoice,
    FaExclamationCircle, FaTasks, FaCalendarAlt, FaPoll,
    FaChartLine, FaTrophy, FaCrown, FaMoneyBillWave,
    FaRocket, FaInfoCircle, FaCheck, FaSyncAlt
} from 'react-icons/fa';
import GamificationLeaderboard from './GamificationLeaderBoard';
import RecentActivity from './RecentActivity';
import { clearEvents, fetchEvents } from '../../slices/Event/eventSlice';
import { getInvoices } from '../../slices/invoice/slice';
import { fetchBuildings, fetchCoOwners, getAllCoowners } from '../../slices/buildings/building';
import { fetchTasks } from '../../slices/Task/taskSlice';
import { getUserClaims } from '../../slices/claim/claimsSlice';
import api from '../../services/api';
import './syndicWelcome.css';
import { isGamificationAvailable, isGamificationEnabledForBuilding } from '../../Components/Subscriptions/SubcriptionValidator';
import { withTranslation } from "react-i18next";

// Fixed Component for Subscription Details
const SubscriptionDetails = ({ user, t }) => {
    const formatDate = (dateString) => {
        if (!dateString) return t('syndicWelcome.noDate');
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'success';
            case 'canceled': return 'danger';
            case 'inactive': return 'warning';
            default: return 'secondary';
        }
    };

    if (!user?.subscription) {
        return (
            <Card className="nestly-card mb-4">
                <CardHeader className="nestly-card-header">
                    <div className="nestly-card-pattern"></div>
                    <div className="d-flex align-items-center position-relative" style={{ zIndex: '1' }}>
                        <div className="nestly-icon-container nestly-icon-container-teal me-3">
                            <i className="ri-vip-crown-line fs-4"></i>
                        </div>
                        <h5 className="mb-0">{t('syndicWelcome.subscriptionOverview')}</h5>
                    </div>
                </CardHeader>
                <CardBody>
                    <div className="text-center py-4">
                        <div className="avatar-md mx-auto mb-4">
                            <div className="avatar-title bg-light text-secondary rounded-3">
                                <i className="ri-vip-crown-line fs-1"></i>
                            </div>
                        </div>
                        <h5 className="mb-1">{t('syndicWelcome.noSubscription')}</h5>
                        <p className="text-muted">{t('syndicWelcome.noSubscriptionDesc')}</p>
                    </div>
                </CardBody>
            </Card>
        );
    }

    // Calculate subscription progress
    const now = new Date();
    const endDate = new Date(user.subscription.endDate || now);
    const startDate = new Date(user.subscription.startDate || now);
    const totalDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
    const daysElapsed = Math.min(totalDays, Math.max(0, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24))));
    const daysRemaining = Math.max(0, totalDays - daysElapsed);
    const progressPercentage = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));

    return (
        <Card className="nestly-card mb-4">
            <CardHeader className="nestly-card-header">
                <div className="nestly-card-pattern"></div>
                <div className="d-flex align-items-center position-relative" style={{ zIndex: '1' }}>
                    <div className="nestly-icon-container nestly-icon-container-teal me-3">
                        <i className="ri-vip-crown-line fs-4"></i>
                    </div>
                    <h5 className="mb-0">{t('syndicWelcome.subscriptionOverview')}</h5>
                </div>
            </CardHeader>
            <CardBody>
                <Row>
                    <Col md={6}>
                        <div className="d-flex align-items-center mb-3">
                            <div className="flex-shrink-0 me-3">
                                <div className="avatar-sm">
                                    <div className="avatar-title bg-light rounded-circle text-primary">
                                        <i className="ri-vip-diamond-line fs-4"></i>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-grow-1">
                                <h5 className="mb-1">{user.subscription.planId?.subscriptionType || t('syndicWelcome.trialPlan')} {t('syndicWelcome.plan')}</h5>
                                <p className="text-muted mb-0">{t('syndicWelcome.status')}: <span className={`text-${getStatusColor(user.subscription.status)}`}>{user.subscription.status || t('syndicWelcome.na')}</span></p>
                            </div>
                        </div>
                    </Col>
                    <Col md={6}>
                        <div className="d-flex align-items-center mb-3">
                            <div className="flex-shrink-0 me-3">
                                <div className="avatar-sm">
                                    <div className="avatar-title bg-light rounded-circle text-primary">
                                        <i className="ri-calendar-check-line fs-4"></i>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-grow-1">
                                <h5 className="mb-1">{t('syndicWelcome.expires')}: {formatDate(user.subscription.endDate)}</h5>
                                <p className="text-muted mb-0">{daysRemaining}{t('syndicWelcome.daysRemaining', { count: daysRemaining })}</p>
                            </div>
                        </div>
                    </Col>
                </Row>

                <div className="mt-3">
                    <h6 className="text-muted mb-2">{t('syndicWelcome.subscriptionProgress')}</h6>
                    <Progress value={progressPercentage} color="success" style={{ height: "10px" }} />
                    <div className="d-flex justify-content-between mt-2">
                        <small>{`${Math.round(progressPercentage)}% ${t('syndicWelcome.used')}`}</small>
                        <small>{`${daysElapsed} ${t('syndicWelcome.of')} ${totalDays} ${t('syndicWelcome.days')}`}</small>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
};

// Component for CoOwners Stats with proper null checks
const CoOwnersStats = ({ t }) => {
    const dispatch = useDispatch();
    const coOwnersData = useSelector(state => state.Building?.coOwners);
    const currentBuilding = useSelector(state => state.Building?.currentBuilding);

    const stats = useMemo(() => {
        const coOwners = Array.isArray(coOwnersData) ? coOwnersData : [];
        const totalCoowners = coOwners.length;
        const activeCoowners = coOwners.filter(co => co && co.isActive).length;
        const pendingCoowners = totalCoowners - activeCoowners;
        const apartmentAssignedCoowners = coOwners.filter(co => co && co.apartments && co.apartments.length > 0).length;
        const activationRate = totalCoowners > 0 ? Math.round((activeCoowners / totalCoowners) * 100) : 0;

        return {
            totalCoowners,
            activeCoowners,
            pendingCoowners,
            apartmentAssignedCoowners,
            activationRate
        };
    }, [coOwnersData]);

    return (
        <Card className="nestly-card mb-4">
            <CardHeader className="nestly-card-header">
                <div className="nestly-card-pattern"></div>
                <div className="d-flex align-items-center position-relative" style={{ zIndex: '1' }}>
                    <div className="nestly-icon-container nestly-icon-container-coral me-3">
                        <i className="ri-team-line fs-4"></i>
                    </div>
                    <h5 className="mb-0">{t('syndicWelcome.coOwnersOverview')}</h5>
                </div>
            </CardHeader>
            <CardBody>
                {!currentBuilding ? (
                    <div className="text-center py-4">
                        <div className="avatar-md mx-auto mb-4">
                            <div className="avatar-title bg-light text-secondary rounded-3">
                                <i className="ri-building-line fs-1"></i>
                            </div>
                        </div>
                        <h5 className="mb-1">{t('syndicWelcome.noBuildingSelected')}</h5>
                        <p className="text-muted">{t('syndicWelcome.noBuildingSelectedDesc')}</p>
                    </div>
                ) : (
                    <>
                        <Row>
                            <Col md={3} sm={6} className="mb-4">
                                <div className="d-flex">
                                    <div className="flex-shrink-0 me-3">
                                        <div className="avatar-sm">
                                            <div className="avatar-title bg-light rounded-circle text-primary">
                                                <i className="ri-user-3-line fs-5"></i>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h5 className="fs-14 mb-1">{stats.totalCoowners}</h5>
                                        <p className="text-muted mb-0">{t('syndicWelcome.totalCoOwners')}</p>
                                    </div>
                                </div>
                            </Col>
                            <Col md={3} sm={6} className="mb-4">
                                <div className="d-flex">
                                    <div className="flex-shrink-0 me-3">
                                        <div className="avatar-sm">
                                            <div className="avatar-title bg-light rounded-circle text-success">
                                                <i className="ri-user-follow-line fs-5"></i>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h5 className="fs-14 mb-1">{stats.activeCoowners}</h5>
                                        <p className="text-muted mb-0">{t('syndicWelcome.activeCoOwners')}</p>
                                    </div>
                                </div>
                            </Col>
                            <Col md={3} sm={6} className="mb-4">
                                <div className="d-flex">
                                    <div className="flex-shrink-0 me-3">
                                        <div className="avatar-sm">
                                            <div className="avatar-title bg-light rounded-circle text-warning">
                                                <i className="ri-home-4-line fs-5"></i>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h5 className="fs-14 mb-1">{stats.apartmentAssignedCoowners}</h5>
                                        <p className="text-muted mb-0">{t('syndicWelcome.withApartments')}</p>
                                    </div>
                                </div>
                            </Col>
                            <Col md={3} sm={6} className="mb-4">
                                <div className="d-flex">
                                    <div className="flex-shrink-0 me-3">
                                        <div className="avatar-sm">
                                            <div className="avatar-title bg-light rounded-circle text-danger">
                                                <i className="ri-user-unfollow-line fs-5"></i>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h5 className="fs-14 mb-1">{stats.pendingCoowners}</h5>
                                        <p className="text-muted mb-0">{t('syndicWelcome.pendingActivation')}</p>
                                    </div>
                                </div>
                            </Col>
                        </Row>

                        <div className="mt-2">
                            <h6 className="text-muted mb-2">{t('syndicWelcome.activationRate')}</h6>
                            <Progress value={stats.activationRate} color="success" style={{ height: "10px" }} />
                            <div className="text-end mt-2">
                                <small>{`${stats.activationRate}% ${t('syndicWelcome.active')}`}</small>
                            </div>
                        </div>
                    </>
                )}
            </CardBody>
        </Card>
    );
};

// Component for Poll Stats with proper null checks
const PollStats = ({ t }) => {
    const currentBuilding = useSelector(state => state.Building?.currentBuilding);
    const [pollStats, setPollStats] = useState({
        total: 0,
        active: 0,
        completed: 0,
        participation: 0,
        recentPolls: []
    });

    useEffect(() => {
        const fetchPollStats = async () => {
            try {
                if (!currentBuilding?._id) return;

                const response = await api.get(`/api/polls/stats/${currentBuilding._id}`);
                if (response && response.data) {
                    setPollStats(response.data);
                }
            } catch (error) {
                console.error("Error fetching poll stats:", error);
                setPollStats({
                    total: 0,
                    active: 0,
                    completed: 0,
                    participation: 0,
                    recentPolls: []
                });
            }
        };

        fetchPollStats();
    }, [currentBuilding]);

    return (
        <Card className="nestly-card mb-4">
            <CardHeader className="nestly-card-header">
                <div className="nestly-card-pattern"></div>
                <div className="d-flex align-items-center position-relative" style={{ zIndex: '1' }}>
                    <div className="nestly-icon-container nestly-icon-container-teal me-3">
                        <i className="ri-bar-chart-grouped-line fs-4"></i>
                    </div>
                    <h5 className="mb-0">{t('syndicWelcome.pollStatistics')}</h5>
                </div>
            </CardHeader>
            <CardBody>
                {!currentBuilding ? (
                    <div className="text-center py-4">
                        <div className="avatar-md mx-auto mb-4">
                            <div className="avatar-title bg-light text-secondary rounded-3">
                                <i className="ri-questionnaire-line fs-1"></i>
                            </div>
                        </div>
                        <h5 className="mb-1">{t('syndicWelcome.noBuildingSelected')}</h5>
                        <p className="text-muted">{t('syndicWelcome.noBuildingSelectedPollDesc')}</p>
                    </div>
                ) : (
                    <Row>
                        <Col md={4} className="mb-4 mb-md-0">
                            <div className="text-center">
                                <div className="avatar-md mx-auto mb-3">
                                    <div className="avatar-title bg-light rounded-circle text-primary fs-2">
                                        <i className="ri-questionnaire-line"></i>
                                    </div>
                                </div>
                                <h5 className="fs-15 mb-1">{pollStats.total || 0}</h5>
                                <p className="text-muted mb-0">{t('syndicWelcome.totalPolls')}</p>
                            </div>
                        </Col>
                        <Col md={4} className="mb-4 mb-md-0">
                            <div className="text-center">
                                <div className="avatar-md mx-auto mb-3">
                                    <div className="avatar-title bg-light rounded-circle text-success fs-2">
                                        <i className="ri-check-double-line"></i>
                                    </div>
                                </div>
                                <h5 className="fs-15 mb-1">{pollStats.completed || 0}</h5>
                                <p className="text-muted mb-0">{t('syndicWelcome.completedPolls')}</p>
                            </div>
                        </Col>
                        <Col md={4} className="mb-4 mb-md-0">
                            <div className="text-center">
                                <div className="avatar-md mx-auto mb-3">
                                    <div className="avatar-title bg-light rounded-circle text-warning fs-2">
                                        <i className="ri-user-voice-line"></i>
                                    </div>
                                </div>
                                <h5 className="fs-15 mb-1">{pollStats.participation || 0}%</h5>
                                <p className="text-muted mb-0">{t('syndicWelcome.avgParticipation')}</p>
                            </div>
                        </Col>
                    </Row>
                )}
            </CardBody>
        </Card>
    );
};

// Main Component
const AdminWelcome = ({ t }) => {
    document.title = `${t('syndicWelcome.title')} | Nestleo`;

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const user = useSelector(state => state.Loginn?.user) || {};

    // Get data from Redux store
    const { buildings = [] } = useSelector((state) => state.Building.buildings || {});
    const currentBuilding = useSelector((state) => state.Building?.currentBuilding);
    const { invoices = [], loading: invoicesLoading } = useSelector((state) => state.Invoice);
    const { events = [] } = useSelector((state) => state.events || {});
    useEffect(() => {
        if (currentBuilding) {
            dispatch(fetchCoOwners(currentBuilding._id));
        } else {
            dispatch(getAllCoowners());
        }
    }, [currentBuilding, dispatch]);
    const Coowners = useSelector((state) => state.Building?.coOwners || []);
    const {
        list: claimsResponse = {},
        loading: claimsLoading
    } = useSelector((state) => state.claims || {});
    const claims = claimsResponse.data || claimsResponse || [];
    const { tasks = [], loading: tasksLoading } = useSelector((state) => state.task || {});
    const { coOwners = [] } = useSelector((state) => state.profile || {});

    // Local state
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        buildings: { total: 0, active: 0 },
        blocs: { total: 0 },
        apartments: { total: 0, occupied: 0, vacant: 0 },
        coOwners: { total: 0, active: 0 },
        invoices: { total: 0, paid: 0, unpaid: 0, overdue: 0, revenue: 0 },
        claims: { total: 0, open: 0, resolved: 0 },
        tasks: { total: 0, completed: 0, inProgress: 0 },
        meetings: { total: 0, upcoming: 0, active: 0 },
        polls: { total: 0, active: 0, completed: 0 }
    });
    const [recentPolls, setRecentPolls] = useState([]);
    const [subscriptionInfo, setSubscriptionInfo] = useState(null);

    // Navigation handler functions
    const handleViewSubscription = useCallback(() => {
        navigate('/subscription');
    }, [navigate]);

    const handleViewCoowners = useCallback(() => {
        navigate('/team');
    }, [navigate]);

    const handleViewPolls = useCallback(() => {
        navigate('/events/polls');
    }, [navigate]);

    // Fetch subscription info
    const fetchSubscriptionInfo = async () => {
        try {
            const response = await api.get('/api/subscriptions/current');
            setSubscriptionInfo(response.data);
        } catch (error) {
            console.error("Failed to fetch subscription info:", error);
        }
    };

    // Fetch polls data
    const fetchPolls = async () => {
        try {
            if (currentBuilding?._id) {
                const response = await api.get(`/api/polls/building/${currentBuilding._id}/recent`);
                setRecentPolls(response.data || []);
            } else {
                const response = await api.get(`/api/polls/recent`);
                setRecentPolls(response.data || []);
            }
        } catch (error) {
            console.error("Error fetching polls:", error);
        }
    };

    // Fetch dashboard data
    const fetchData = useCallback(async () => {
        setLoading(true);

        const fetchPromises = [
            dispatch(fetchBuildings()),
            currentBuilding
                ? dispatch(getInvoices(currentBuilding._id))
                : dispatch(getInvoices()),
            dispatch(getUserClaims(currentBuilding ? { buildingId: currentBuilding._id } : {})),
            dispatch(fetchTasks()),
            currentBuilding
                ? dispatch(fetchEvents(currentBuilding._id))
                : dispatch(clearEvents()),
            dispatch(getAllCoowners()),
            fetchPolls(),
            fetchSubscriptionInfo()
        ];

        try {
            await Promise.all(fetchPromises);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    }, [dispatch, currentBuilding]);

    // Calculate statistics from fetched data
    useEffect(() => {
        if (loading) return;

        const calculateStats = () => {
            const totalBuildings = buildings.length;
            const activeBuildings = buildings.filter(b => !b.isDisabled).length;
            const totalBlocs = buildings.reduce((acc, b) => acc + (b.blocs?.length || 0), 0);

            const apartmentStats = buildings.reduce((stats, building) => {
                if (!building.blocs) return stats;

                building.blocs.forEach(bloc => {
                    if (!bloc.apartments) return;

                    stats.total += bloc.apartments.length;

                    bloc.apartments.forEach(apt => {
                        if (apt.coOwner) {
                            stats.occupied++;
                        } else {
                            stats.vacant++;
                        }
                    });
                });

                return stats;
            }, { total: 0, occupied: 0, vacant: 0 });

            const totalInvoices = invoices.length;
            const paidInvoices = invoices.filter(inv => inv.status === "paid").length;
            const unpaidInvoices = invoices.filter(inv => inv.status === "unpaid").length;
            const overdueInvoices = invoices.filter(inv => {
                return inv.status === "unpaid" && new Date(inv.dueDate) < new Date();
            }).length;
            const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

            const totalTasks = tasks.length;
            const completedTasks = tasks.filter(task => task.status === "Completed").length;
            const inProgressTasks = tasks.filter(task => task.status === "In Progress").length;

            const now = new Date();
            const totalMeetings = events.length;
            const upcomingMeetings = events.filter(event => new Date(event.start) > now).length;
            const activeMeetings = events.filter(event => event.meeting?.isActive).length;

            const totalCoOwners = coOwners.length;
            const activeCoOwners = coOwners.filter(co => co.isActive !== false).length;

            const totalClaims = claims.length;
            const openClaims = claims.filter(c => c.status?.toLowerCase() !== 'closed' && c.status?.toLowerCase() !== 'resolved').length;
            const resolvedClaims = claims.filter(c => c.status?.toLowerCase() === 'closed' || c.status?.toLowerCase() === 'resolved').length;

            const totalPolls = recentPolls.length;
            const activePolls = recentPolls.filter(p => p.status === 'active').length;
            const completedPolls = recentPolls.filter(p => p.status === 'completed' || p.status === 'ended').length;

            return {
                buildings: { total: totalBuildings, active: activeBuildings },
                blocs: { total: totalBlocs },
                apartments: { ...apartmentStats },
                coOwners: { total: totalCoOwners, active: activeCoOwners },
                invoices: { total: totalInvoices, paid: paidInvoices, unpaid: unpaidInvoices, overdue: overdueInvoices, revenue: totalRevenue },
                claims: { total: totalClaims, open: openClaims, resolved: resolvedClaims },
                tasks: { total: totalTasks, completed: completedTasks, inProgress: inProgressTasks },
                meetings: { total: totalMeetings, upcoming: upcomingMeetings, active: activeMeetings },
                polls: { total: totalPolls, active: activePolls, completed: completedPolls }
            };
        };

        const newStats = calculateStats();
        if (JSON.stringify(newStats) !== JSON.stringify(stats)) {
            setStats(newStats);
        }
    }, [buildings, invoices, claims, tasks, events, recentPolls, coOwners, loading]);

    // Load data on component mount
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return t('syndicWelcome.noDate');
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    // Get badge color based on status
    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'paid': return 'success';
            case 'overdue': return 'danger';
            case 'pending': return 'warning';
            case 'resolved': return 'success';
            case 'available': return 'primary';
            case 'completed': return 'success';
            case 'in progress': return 'warning';
            case 'open': return 'primary';
            case 'closed': return 'secondary';
            default: return 'warning';
        }
    };

    return (
        <React.Fragment>
            {/* Welcome Section */}
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
                                        <h4 className="fw-semibold mb-2">{t('syndicWelcome.welcomeBack')}, {user.firstName}! 👋</h4>
                                        <p className="mb-3 text-muted">{t('syndicWelcome.welcomeDesc')}</p>
                                        <div className="d-flex flex-wrap gap-2">
                                            {currentBuilding ? (
                                                <Badge color="info" pill className="fs-12 py-2 px-3">
                                                    <FaBuilding className="me-1" /> {t('syndicWelcome.managing')}: {currentBuilding.name}
                                                </Badge>
                                            ) : (
                                                <Badge color="primary" pill className="fs-12 py-2 px-3">
                                                    <FaBuilding className="me-1" /> {t('syndicWelcome.allProperties')}
                                                </Badge>
                                            )}
                                            {user.subscription && (
                                                <Badge color="success" pill className="fs-12 py-2 px-3">
                                                    <FaCrown className="me-1" /> {user.subscription.planId?.subscriptionType || t('syndicWelcome.trial')} {t('syndicWelcome.subscription')}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </Col>
                                <Col md={4}>
                                    <div className="text-end">
                                        <div className="d-flex justify-content-end">
                                            <Button color="primary" tag={Link} to="/BuildingInterface" className="me-2">
                                                <FaBuilding className="me-1" /> {t('syndicWelcome.buildings')}
                                            </Button>
                                            <Button color="success" tag={Link} to="/calendar">
                                                <FaCalendarAlt className="me-1" /> {t('syndicWelcome.calendar')}
                                            </Button>
                                        </div>
                                        <div className="mt-3 d-flex justify-content-end flex-wrap gap-2">
                                            <Button color="light" size="sm" tag={Link} to="/apps-invoices-list">
                                                <i className="ri-file-list-3-line me-1"></i> {t('syndicWelcome.newInvoice')}
                                            </Button>
                                            <Button color="light" size="sm" tag={Link} to="/pages-team">
                                                <i className="ri-user-add-line me-1"></i> {t('syndicWelcome.coOwnersButton')}
                                            </Button>
                                            <Button color="light" size="sm" tag={Link} to="/task">
                                                <i className="ri-task-line me-1"></i> {t('syndicWelcome.tasks')}
                                            </Button>
                                        </div>
                                    </div>
                                </Col>
                            </Row>
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            {/* Quick Stats */}
            <Row className="mb-4">
                <Col xl={3} md={6}>
                    <Card className="card-animate" style={{ background: 'linear-gradient(90deg,#c1e8f0, #cbe9f3, #e0f7fa)' }}>
                        <CardBody>
                            <div className="d-flex align-items-center">
                                <div className="flex-grow-1">
                                    <p className="text-uppercase fw-medium text-muted mb-0">{t('syndicWelcome.buildings')}</p>
                                </div>
                                <div className="flex-shrink-0">
                                    <h5 className="fs-14 mb-0 text-success">
                                        <i className="ri-arrow-right-up-line fs-13 align-middle"></i> {stats.buildings.active}
                                    </h5>
                                </div>
                            </div>
                            <div className="d-flex align-items-end justify-content-between mt-4">
                                <div>
                                    <h4 className="fs-22 fw-semibold ff-secondary mb-2">
                                        <CountUp start={0} end={stats.buildings.total} duration={2} className="counter-value" />
                                    </h4>
                                    <span className="text-muted">{t('syndicWelcome.totalProperties')}</span>
                                </div>
                                <div className="avatar-sm flex-shrink-0">
                                    <span className="avatar-title bg-light rounded fs-3">
                                        <FaBuilding className="text-primary" />
                                    </span>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </Col>
                <Col xl={3} md={6}>
                    <Card className="card-animate" style={{ background: 'linear-gradient(90deg,#c1e8f0, #cbe9f3, #e0f7fa)' }}>
                        <CardBody>
                            <div className="d-flex align-items-center">
                                <div className="flex-grow-1">
                                    <p className="text-uppercase fw-medium text-muted mb-0">{t('syndicWelcome.apartments')}</p>
                                </div>
                                <div className="flex-shrink-0">
                                    <h5 className="fs-14 mb-0 text-primary">
                                        <i className="ri-arrow-right-up-line fs-13 align-middle"></i> {stats.apartments.occupied}
                                    </h5>
                                </div>
                            </div>
                            <div className="d-flex align-items-end justify-content-between mt-4">
                                <div>
                                    <h4 className="fs-22 fw-semibold ff-secondary mb-2">
                                        <CountUp start={0} end={stats.apartments.total} duration={2} className="counter-value" />
                                    </h4>
                                    <span className="text-muted">
                                        <span className="text-success">{stats.apartments.occupied}</span> / <span className="text-danger">{stats.apartments.vacant}</span> ({t('syndicWelcome.occupiedVacant')})
                                    </span>
                                </div>
                                <div className="avatar-sm flex-shrink-0">
                                    <span className="avatar-title bg-light rounded fs-3">
                                        <FaHome className="text-primary" />
                                    </span>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </Col>
                <Col xl={3} md={6}>
                    <Card className="card-animate" style={{ background: 'linear-gradient(90deg, #cbe9f3, #e0f7fa, #c1e8f0)' }}>
                        <CardBody>
                            <div className="d-flex align-items-center">
                                <div className="flex-grow-1">
                                    <p className="text-uppercase fw-medium text-muted mb-0">{t('syndicWelcome.coOwners')}</p>
                                </div>
                                <div className="flex-shrink-0">
                                    <h5 className="fs-14 mb-0 text-info">
                                        <i className="ri-arrow-right-up-line fs-13 align-middle"></i> {stats.coOwners.active}
                                    </h5>
                                </div>
                            </div>
                            <div className="d-flex align-items-end justify-content-between mt-4">
                                <div>
                                    <h4 className="fs-22 fw-semibold ff-secondary mb-2">
                                        {Coowners.length}
                                    </h4>
                                    <span className="text-muted">{t('syndicWelcome.totalRegisteredCoOwners')}</span>
                                </div>
                                <div className="avatar-sm flex-shrink-0">
                                    <span className="avatar-title bg-light rounded fs-3">
                                        <FaUsers className="text-primary" />
                                    </span>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </Col>
                <Col xl={3} md={6}>
                    <Card className="card-animate" style={{ background: 'linear-gradient(90deg,#c1e8f0, #cbe9f3, #e0f7fa)' }}>
                        <CardBody>
                            <div className="d-flex align-items-center">
                                <div className="flex-grow-1">
                                    <p className="text-uppercase fw-medium text-muted mb-0">{t('syndicWelcome.revenue')}</p>
                                </div>
                                <div className="flex-shrink-0">
                                    <h5 className="fs-14 mb-0 text-success">
                                        <i className="ri-arrow-right-up-line fs-13 align-middle"></i> ${stats.invoices.revenue.toFixed(2)}
                                    </h5>
                                </div>
                            </div>
                            <div className="d-flex align-items-end justify-content-between mt-4">
                                <div>
                                    <h4 className="fs-22 fw-semibold ff-secondary mb-2">
                                        $<CountUp start={0} end={stats.invoices.revenue} duration={2} decimals={2} className="counter-value" />
                                    </h4>
                                    <span className="text-muted">{t('syndicWelcome.paymentRate')}: {stats.invoices.total > 0 ? Math.round((stats.invoices.paid / stats.invoices.total) * 100) : 0}%</span>
                                </div>
                                <div className="avatar-sm flex-shrink-0">
                                    <span className="avatar-title bg-light rounded fs-3">
                                        <FaMoneyBillWave className="text-primary" />
                                    </span>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            <Row>
                {isGamificationAvailable(user) ? (
                    isGamificationEnabledForBuilding(currentBuilding) ? (
                        <Col xl={12} className="mb-4">
                            <GamificationLeaderboard />
                        </Col>
                    ) : (
                        <Col xl={12} className="mb-4">
                            <Card>
                                <CardHeader className="nestly-card-header">
                                    <div className="nestly-card-pattern"></div>
                                    <div className="d-flex align-items-center position-relative" style={{ zIndex: '1' }}>
                                        <div className="nestly-icon-container nestly-icon-container bg-primary me-3">
                                            <i className="ri-gamepad-line fs-4"></i>
                                        </div>
                                        <h5 className="mb-0">{t('syndicWelcome.gamificationOverview')}</h5>
                                    </div>
                                </CardHeader>
                                <CardBody className="text-center py-4">
                                    <div className="display-6 mb-3 text-muted">
                                        <i className="ri-gamepad-line"></i>
                                    </div>
                                    <h5>{t('syndicWelcome.gamificationNotEnabled')}</h5>
                                    <p className="text-muted">{t('syndicWelcome.gamificationNotEnabledDesc')}
                                        <br />
                                        <a href="/Gamification" className="mt-2 btn btn-sm btn-danger">{t('syndicWelcome.enableInSettings')}</a>
                                    </p>
                                </CardBody>
                            </Card>
                        </Col>
                    )
                ) : null}
            </Row>

            {/* Additional Statistics */}
            <Row className="mb-4 mt-4">
                <Col lg={12}>
                    <Card className="stats-overview-card">
                        <CardHeader className='nestly-card-header'>
                            <h5 className="card-title mb-0">
                                <FaChartLine className="me-2" /> {t('syndicWelcome.systemOverview')}
                            </h5>
                        </CardHeader>
                        <CardBody>
                            <div className="stats-overview-grid">
                                <div className="stats-item">
                                    <div className="stats-icon bg-soft-primary">
                                        <FaLayerGroup className="text-primary" />
                                    </div>
                                    <div className="stats-info">
                                        <h5>{stats.blocs.total}</h5>
                                        <span>{t('syndicWelcome.totalBlocs')}</span>
                                    </div>
                                </div>
                                <div className="stats-item">
                                    <div className="stats-icon bg-soft-warning">
                                        <FaFileInvoice className="text-warning" />
                                    </div>
                                    <div className="stats-info">
                                        <h5>{stats.invoices.unpaid}</h5>
                                        <span>{t('syndicWelcome.unpaidInvoices')}</span>
                                    </div>
                                </div>
                                <div className="stats-item">
                                    <div className="stats-icon bg-soft-danger">
                                        <FaExclamationCircle className="text-danger" />
                                    </div>
                                    <div className="stats-info">
                                        <h5>{stats.claims.open}</h5>
                                        <span>{t('syndicWelcome.openClaims')}</span>
                                    </div>
                                </div>
                                <div className="stats-item">
                                    <div className="stats-icon bg-soft-success">
                                        <FaTasks className="text-success" />
                                    </div>
                                    <div className="stats-info">
                                        <h5>{stats.tasks.total}</h5>
                                        <span>{t('syndicWelcome.totalTasks')}</span>
                                    </div>
                                </div>
                                <div className="stats-item">
                                    <div className="stats-icon bg-soft-info">
                                        <FaCalendarAlt className="text-info" />
                                    </div>
                                    <div className="stats-info">
                                        <h5>{stats.meetings.upcoming}</h5>
                                        <span>{t('syndicWelcome.upcomingMeetings')}</span>
                                    </div>
                                </div>
                                <div className="stats-item">
                                    <div className="stats-icon bg-soft-primary">
                                        <FaPoll className="text-primary" />
                                    </div>
                                    <div className="stats-info">
                                        <h5>{stats.polls.active}</h5>
                                        <span>{t('syndicWelcome.activePolls')}</span>
                                    </div>
                                </div>
                                <div className="stats-item">
                                    <div className="stats-icon bg-soft-warning">
                                        <FaSyncAlt className="text-warning" />
                                    </div>
                                    <div className="stats-info">
                                        <h5>{stats.tasks.inProgress}</h5>
                                        <span>{t('syndicWelcome.tasksInProgress')}</span>
                                    </div>
                                </div>
                                <div className="stats-item">
                                    <div className="stats-icon bg-soft-success">
                                        <FaCheck className="text-success" />
                                    </div>
                                    <div className="stats-info">
                                        <h5>{stats.tasks.completed}</h5>
                                        <span>{t('syndicWelcome.completedTasks')}</span>
                                    </div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            {/* Detailed statistics row */}
            <Row>
                {/* Left column */}
                <Col lg={6}>
                    {/* Buildings and Properties */}
                    <Card className="mb-4">
                        <CardHeader className="nestly-card-header card-header-with-icon">
                            <h5 className="card-title mb-0">
                                <FaBuilding className="icon-left" /> {t('syndicWelcome.buildingsProperties')}
                            </h5>
                            <div className="flex-shrink-0">
                                <Button color="primary" size="sm" tag={Link} to="/BuildingInterface">
                                    {t('syndicWelcome.manageBuildings')}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardBody>
                            {buildings?.length > 0 ? (
                                <div className="buildings-list">
                                    {buildings.slice(0, 3).map((building, index) => (
                                        <div key={building._id || index} className="building-item">
                                            <div className="d-flex align-items-center">
                                                <div className="flex-shrink-0 me-3">
                                                    <div className="building-icon">
                                                        <FaBuilding />
                                                    </div>
                                                </div>
                                                <div className="flex-grow-1">
                                                    <h5 className="mb-1">{building.name}</h5>
                                                    <div className="building-details">
                                                        <span className="text-muted me-3">
                                                            <FaLayerGroup className="me-1" /> {building.blocs?.length || 0} {t('syndicWelcome.blocs')}
                                                        </span>
                                                        <span className="text-muted">
                                                            <FaHome className="me-1" /> {building.blocs?.reduce((total, bloc) => total + (bloc.apartments?.length || 0), 0) || 0} {t('syndicWelcome.units')}
                                                        </span>
                                                    </div>
                                                    <div className="mt-2">
                                                        {building.address_street && (
                                                            <small className="text-muted d-block">
                                                                <i className="ri-map-pin-line me-1"></i> {building.address_street}, {building.address_city || t('syndicWelcome.na')}
                                                            </small>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex-shrink-0 ms-2">
                                                    <Button color="light" size="sm" tag={Link} to={`/buildings/${building._id}`}>
                                                        <i className="ri-arrow-right-s-line"></i>
                                                    </Button>
                                                </div>
                                            </div>
                                            {index < buildings.slice(0, 3).length - 1 && <hr />}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center p-4">
                                    <div className="avatar-md mx-auto mb-4">
                                        <div className="avatar-title bg-light text-primary rounded-circle fs-2">
                                            <FaBuilding />
                                        </div>
                                    </div>
                                    <h5>{t('syndicWelcome.noBuildingsFound')}</h5>
                                    <p className="text-muted">{t('syndicWelcome.noBuildingsFoundDesc')}</p>
                                    <Button color="primary" tag={Link} to="/BuildingInterface">
                                        <i className="ri-add-line me-1"></i> {t('syndicWelcome.addBuilding')}
                                    </Button>
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    {/* Invoices and Finance */}
                    <Card className="mb-4">
                        <CardHeader className="nestly-card-header card-header-with-icon">
                            <h5 className="card-title mb-0">
                                <FaFileInvoice className="icon-left" /> {t('syndicWelcome.financialOverview')}
                            </h5>
                            <div className="flex-shrink-0">
                                <Button color="primary" size="sm" tag={Link} to="/apps-invoices-list">
                                    {t('syndicWelcome.manageInvoices')}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardBody>
                            <div className="mb-4">
                                <h6>{t('syndicWelcome.revenueCollection')}</h6>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span>{t('syndicWelcome.paymentRate')}</span>
                                    <span>{stats.invoices.total > 0 ? Math.round((stats.invoices.paid / stats.invoices.total) * 100) : 0}%</span>
                                </div>
                                <Progress
                                    value={stats.invoices.total > 0 ? Math.round((stats.invoices.paid / stats.invoices.total) * 100) : 0}
                                    color="success"
                                    className="progress-sm"
                                />

                                <div className="financial-stats mt-4">
                                    <Row>
                                        <Col xs={3}>
                                            <div className="financial-stat-item">
                                                <h4>${stats.invoices.revenue.toFixed(2)}</h4>
                                                <p className="text-muted mb-0">{t('syndicWelcome.totalRevenue')}</p>
                                            </div>
                                        </Col>
                                        <Col xs={3}>
                                            <div className="financial-stat-item">
                                                <h4>{stats.invoices.paid}</h4>
                                                <p className="text-muted mb-0">{t('syndicWelcome.paidInvoices')}</p>
                                            </div>
                                        </Col>
                                        <Col xs={3}>
                                            <div className="financial-stat-item">
                                                <h4>{stats.invoices.unpaid}</h4>
                                                <p className="text-muted mb-0">{t('syndicWelcome.pendingInvoices')}</p>
                                            </div>
                                        </Col>
                                        <Col xs={3}>
                                            <div className="financial-stat-item">
                                                <h4 className="text-danger">{stats.invoices.overdue}</h4>
                                                <p className="text-muted mb-0">{t('syndicWelcome.overdueInvoices')}</p>
                                            </div>
                                        </Col>
                                    </Row>
                                </div>
                            </div>

                            <div className="mt-4">
                                <h6>{t('syndicWelcome.recentInvoices')}</h6>
                                {invoices.length > 0 ? (
                                    <div className="recent-invoices">
                                        {invoices.slice(0, 3).map((invoice, idx) => (
                                            <div key={invoice._id || idx} className="recent-invoice-item">
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <h6 className="mb-1">#{invoice.invoiceNumber}</h6>
                                                        <div className="text-muted small">
                                                            {invoice.coOwner?.firstName} {invoice.coOwner?.lastName} | {t('syndicWelcome.due')}: {formatDate(invoice.dueDate)}
                                                        </div>
                                                    </div>
                                                    <div className="d-flex align-items-center">
                                                        <h6 className="mb-0 me-3">${invoice.total?.toFixed(2) || "0.00"}</h6>
                                                        <Badge color={getStatusColor(invoice.status)}>{invoice.status}</Badge>
                                                    </div>
                                                </div>
                                                {idx < invoices.slice(0, 3).length - 1 && <hr className="my-2" />}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-3">
                                        <span className="text-muted">{t('syndicWelcome.noInvoicesFound')}</span>
                                    </div>
                                )}
                            </div>
                        </CardBody>
                    </Card>

                    {/* Claims Management */}
                    <Card className="mb-4">
                        <CardHeader className="nestly-card-header card-header-with-icon d-flex justify-content-between align-items-center">
                            <h5 className="card-title mb-0 d-flex align-items-center gap-2">
                                <FaExclamationCircle className="text-warning" /> {t('syndicWelcome.claimsManagement')}
                            </h5>
                            <div>
                                <Button color="primary" size="sm" tag={Link} to="/Claim">
                                    {t('syndicWelcome.viewClaims')}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardBody>
                            <div className="mb-4">
                                <Row className="text-center">
                                    <Col xs={4}>
                                        <div className="claim-stat-item">
                                            <div className="claim-stat-value">{stats.claims.total}</div>
                                            <div className="claim-stat-label">{t('syndicWelcome.totalClaims')}</div>
                                        </div>
                                    </Col>
                                    <Col xs={4}>
                                        <div className="claim-stat-item">
                                            <div className="claim-stat-value">{stats.claims.open}</div>
                                            <div className="claim-stat-label">{t('syndicWelcome.openClaims')}</div>
                                        </div>
                                    </Col>
                                    <Col xs={4}>
                                        <div className="claim-stat-item">
                                            <div className="claim-stat-value">{stats.claims.resolved}</div>
                                            <div className="claim-stat-label">{t('syndicWelcome.resolvedClaims')}</div>
                                        </div>
                                    </Col>
                                </Row>
                            </div>

                            {claims.length > 0 ? (
                                <div className="recent-claims">
                                    <h6 className="mb-3">{t('syndicWelcome.recentClaims')}</h6>
                                    {claims.slice(0, 3).map((claim, idx) => (
                                        <div key={claim._id || idx} className="recent-claim-item py-2">
                                            <div className="d-flex align-items-center justify-content-between">
                                                <div className="d-flex align-items-center">
                                                    <div className={`claim-status-icon me-3 bg-soft-${getStatusColor(claim.status)}`}>
                                                        <i className={`ri-alert-line text-${getStatusColor(claim.status)}`}></i>
                                                    </div>
                                                    <div>
                                                        <h6 className="mb-1 fw-semibold text-dark">{claim.title}</h6>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <Badge color={getStatusColor(claim.status)} className="text-capitalize">{claim.status}</Badge>
                                                            <small className="text-muted">{claim.claimType}</small>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button color="light" size="sm" tag={Link} to={`/claim/${claim._id}`}>
                                                    <i className="ri-arrow-right-s-line"></i>
                                                </Button>
                                            </div>
                                            {idx < claims.slice(0, 3).length - 1 && <hr className="my-2" />}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-3">
                                    <span className="text-muted">{t('syndicWelcome.noClaimsFound')}</span>
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    <SubscriptionDetails user={user} t={t} />
                </Col>

                {/* Right column */}
                <Col lg={6}>
                    {/* Tasks Management */}
                    <Card className="mb-4">
                        <CardHeader className="nestly-card-header card-header-with-icon">
                            <h5 className="card-title mb-0">
                                <FaTasks className="icon-left" /> {t('syndicWelcome.tasksManagement')}
                            </h5>
                            <div className="flex-shrink-0">
                                <Button color="primary" size="sm" tag={Link} to="/task">
                                    {t('syndicWelcome.manageTasks')}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardBody>
                            <div className="task-progress mb-4">
                                <h6 className="mb-2">{t('syndicWelcome.tasksProgress')}</h6>
                                <div className="d-flex align-items-center mb-3">
                                    <div className="flex-grow-1">
                                        <div className="d-flex justify-content-between mb-1">
                                            <span>{t('syndicWelcome.completionRate')}</span>
                                            <span>{stats.tasks.total > 0 ? Math.round((stats.tasks.completed / stats.tasks.total) * 100) : 0}%</span>
                                        </div>
                                        <Progress
                                            value={stats.tasks.total > 0 ? Math.round((stats.tasks.completed / stats.tasks.total) * 100) : 0}
                                            color="success"
                                            className="progress-sm"
                                        />
                                    </div>
                                </div>

                                <div className="task-stats">
                                    <Row>
                                        <Col xs={4}>
                                            <div className="task-stat-item">
                                                <div className="task-stat-icon bg-soft-primary">
                                                    <i className="ri-task-line text-primary"></i>
                                                </div>
                                                <div className="task-stat-info">
                                                    <div className="task-stat-value">{stats.tasks.total}</div>
                                                    <div className="task-stat-label">{t('syndicWelcome.totalTasks')}</div>
                                                </div>
                                            </div>
                                        </Col>
                                        <Col xs={4}>
                                            <div className="task-stat-item">
                                                <div className="task-stat-icon bg-soft-info">
                                                    <i className="ri-loader-4-line text-info"></i>
                                                </div>
                                                <div className="task-stat-info">
                                                    <div className="task-stat-value">{stats.tasks.inProgress}</div>
                                                    <div className="task-stat-label">{t('syndicWelcome.inProgressTasks')}</div>
                                                </div>
                                            </div>
                                        </Col>
                                        <Col xs={4}>
                                            <div className="task-stat-item">
                                                <div className="task-stat-icon bg-soft-success">
                                                    <i className="ri-checkbox-circle-line text-success"></i>
                                                </div>
                                                <div className="task-stat-info">
                                                    <div className="task-stat-value">{stats.tasks.completed}</div>
                                                    <div className="task-stat-label">{t('syndicWelcome.completedTasks')}</div>
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>
                                </div>
                            </div>

                            {tasks.length > 0 ? (
                                <div className="recent-tasks">
                                    <h6 className="mb-3">{t('syndicWelcome.recentTasks')}</h6>
                                    {tasks.slice(0, 3).map((task, idx) => (
                                        <div key={task._id || idx} className="recent-task-item">
                                            <div className="d-flex align-items-center">
                                                <div className="flex-shrink-0 me-3">
                                                    <div className={`task-status-icon bg-soft-${getStatusColor(task.status)}`}>
                                                        <i className={`ri-${task.status === 'Completed' ? 'check-line' : task.status === 'In Progress' ? 'time-line' : 'file-list-line'} text-${getStatusColor(task.status)}`}></i>
                                                    </div>
                                                </div>
                                                <div className="flex-grow-1">
                                                    <h6 className="mb-1">{task.title}</h6>
                                                    <div className="d-flex align-items-center">
                                                        <Badge color={getStatusColor(task.status)} className="me-2">{task.status}</Badge>
                                                        <Badge color="info" className="me-2">{task.priority}</Badge>
                                                        <small className="text-muted">{task.building?.name || t('syndicWelcome.na')}</small>
                                                    </div>
                                                </div>
                                                <div className="flex-shrink-0 ms-2">
                                                    <Button color="light" size="sm" tag={Link} to={`/task/${task._id}`}>
                                                        <i className="ri-arrow-right-s-line"></i>
                                                    </Button>
                                                </div>
                                            </div>
                                            {idx < tasks.slice(0, 3).length - 1 && <hr className="my-2" />}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-3">
                                    <span className="text-muted">{t('syndicWelcome.noTasksFound')}</span>
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    {/* Calendar and Meetings */}
                    <Card className="mb-4">
                        <CardHeader className="nestly-card-header card-header-with-icon">
                            <h5 className="card-title mb-0">
                                <FaCalendarAlt className="icon-left" /> {t('syndicWelcome.calendarMeetings')}
                            </h5>
                            <div className="flex-shrink-0">
                                <Button color="primary" size="sm" tag={Link} to="/calendar">
                                    {t('syndicWelcome.viewCalendar')}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardBody>
                            <div className="calendar-stats mb-4">
                                <Row>
                                    <Col xs={4}>
                                        <div className="calendar-stat-item">
                                            <div className="calendar-stat-icon bg-soft-primary">
                                                <i className="ri-calendar-event-line text-primary"></i>
                                            </div>
                                            <div className="calendar-stat-info">
                                                <div className="calendar-stat-value">{stats.meetings.total}</div>
                                                <div className="calendar-stat-label">{t('syndicWelcome.totalEvents')}</div>
                                            </div>
                                        </div>
                                    </Col>
                                    <Col xs={4}>
                                        <div className="calendar-stat-item">
                                            <div className="calendar-stat-icon bg-soft-info">
                                                <i className="ri-calendar-check-line text-info"></i>
                                            </div>
                                            <div className="calendar-stat-info">
                                                <div className="calendar-stat-value">{stats.meetings.upcoming}</div>
                                                <div className="calendar-stat-label">{t('syndicWelcome.upcomingEvents')}</div>
                                            </div>
                                        </div>
                                    </Col>
                                    <Col xs={4}>
                                        <div className="calendar-stat-item">
                                            <div className="calendar-stat-icon bg-soft-success">
                                                <i className="ri-video-chat-line text-success"></i>
                                            </div>
                                            <div className="calendar-stat-info">
                                                <div className="calendar-stat-value">{stats.meetings.active}</div>
                                                <div className="calendar-stat-label">{t('syndicWelcome.activeNow')}</div>
                                            </div>
                                        </div>
                                    </Col>
                                </Row>
                            </div>

                            {events.length > 0 ? (
                                <div className="upcoming-events">
                                    <h6 className="mb-3">{t('syndicWelcome.upcomingEvents')}</h6>
                                    {events.slice(0, 3).map((event, idx) => (
                                        <div key={event._id || idx} className="upcoming-event-item">
                                            <div className="d-flex align-items-center">
                                                <div className="flex-shrink-0 me-3">
                                                    <div className="event-date">
                                                        <div className="event-month">
                                                            {event.start && new Date(event.start).toLocaleString('default', { month: 'short' })}
                                                        </div>
                                                        <div className="event-day">
                                                            {event.start && new Date(event.start).getDate()}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex-grow-1">
                                                    <h6 className="mb-1">{event.title}</h6>
                                                    <div className="d-flex align-items-center">
                                                        <i className="ri-time-line me-1 text-muted"></i>
                                                        <small className="text-muted me-3">{event.start && new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                                                        <i className="ri-map-pin-line me-1 text-muted"></i>
                                                        <small className="text-muted">{event.location || t('syndicWelcome.virtual')}</small>
                                                    </div>
                                                </div>
                                                <div className="flex-shrink-0 ms-2">
                                                    <Button color="light" size="sm" tag={Link} to={`/calendar?event=${event._id}`}>
                                                        <i className="ri-arrow-right-s-line"></i>
                                                    </Button>
                                                </div>
                                            </div>
                                            {idx < events.slice(0, 3).length - 1 && <hr className="my-2" />}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-3">
                                    <span className="text-muted">{t('syndicWelcome.noUpcomingEvents')}</span>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                    <PollStats t={t} />
                    <CoOwnersStats t={t} />
                </Col>
            </Row>

            <style jsx>{`
                .nestly-card-header {
                    background: linear-gradient(90deg, #c1e8f0, #cbe9f3, #e0f7fa);
                }
                .claim-stats {
                    text-align: center;
                }
                .claim-stat-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }
                .claim-stat-value {
                    font-size: 20px;
                    font-weight: 600;
                }
                .claim-stat-label {
                    font-size: 14px;
                    color: #6c757d;
                }
                .recent-claim-item {
                    padding: 10px 0;
                }
                .claim-status-icon {
                    width: 42px;
                    height: 42px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
                }
                .recent-claim-item h6 {
                    font-size: 16px;
                    font-weight: 600;
                    margin-bottom: 4px;
                }
                .recent-claim-item .d-flex.align-items-center {
                    gap: 6px;
                }
                .recent-claim-item .badge {
                    font-size: 12px;
                    padding: 4px 8px;
                    line-height: 1.4;
                    text-transform: capitalize;
                }
                .recent-claim-item small {
                    font-size: 13px;
                    color: #6c757d;
                }
                .badge-white-fix .badge {
                    background-color: #ffc107 !important;
                    color: #212529 !important;
                }
                .calendar-stat-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .calendar-stat-icon {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                    flex-shrink: 0;
                }
                .calendar-stat-info {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .calendar-stat-value {
                    font-weight: 600;
                    font-size: 18px;
                }
                .calendar-stat-label {
                    font-size: 14px;
                    color: #6c757d;
                }
            `}</style>
        </React.Fragment>
    );
}

export default withTranslation()(AdminWelcome);