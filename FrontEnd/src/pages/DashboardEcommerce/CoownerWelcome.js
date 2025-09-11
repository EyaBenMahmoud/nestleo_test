import React, { useState, useEffect, useCallback } from "react";
import {
    Row, Col, Card, CardBody, CardHeader,
    Badge, Progress, Button, ListGroup, ListGroupItem,
    UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem
} from "reactstrap";
import { Link } from "react-router-dom";
import api from "../../services/api";
import CountUp from "react-countup";
import {
    FaFileInvoice, FaRegBuilding, FaCalendarAlt, FaExclamationCircle,
    FaTasks, FaBell, FaCrown, FaChartLine, FaHome, FaLayerGroup,
    FaBed, FaMapMarkerAlt
} from "react-icons/fa";
import GamificationLeaderboard from "./GamificationLeaderBoard";
import { useDispatch, useSelector } from "react-redux";
import { getInvoicesByCoOwner, getInvoicesByCoOwnerAndBuilding } from "../../slices/invoice/slice";
import { getUserClaims } from "../../slices/claim/claimsSlice";
import { fetchAllOwnerApartments, fetchOwnerAppartements } from "../../slices/buildings/building";
import { clearEvents, fetchEvents } from "../../slices/Event/eventSlice";
import { isGamificationEnabledForBuilding, isGamificationEnabledForBuildingPerAdminSubcription } from "../../Components/Subscriptions/SubcriptionValidator";
import { withTranslation } from "react-i18next";

const CoownerWelcome = ({ user, t }) => {
    const dispatch = useDispatch();


    // this is just function for nested building inside gamification inside user 
    const getBuildingSpecificGamification = (user, buildingId) => {
        if (!user?.gamification?.buildings || !buildingId) {
            return {
                paymentStreak: 0,
                meetingStreak: 0,
                votingStreak: 0,
                totalPoints: 0,
                monthlyPoints: 0,
                rank: '-'
            };
        }

        const buildingData = user.gamification.buildings[buildingId];
        return {
            paymentStreak: buildingData?.paymentStreak || 0,
            meetingStreak: buildingData?.meetingStreak || 0,
            votingStreak: buildingData?.votingStreak || 0,
            totalPoints: buildingData?.totalPoints || 0,
            monthlyPoints: buildingData?.monthlyPoints || 0,
            rank: buildingData?.rank || '-'
        };
    };


    // State for loading indicator
    const [loading, setLoading] = useState(true);
    const [gamificationData, setGamificationData] = useState(null);


    // State for invoice statistics
    const [invoiceStats, setInvoiceStats] = useState({
        total: 0,
        paid: 0,
        unpaid: 0,
        overdue: 0,
        paymentRate: 0,
        revenue: 0
    });
    const [nextDueInvoice, setNextDueInvoice] = useState(null);

    // Get data from Redux store
    const currentBuilding = useSelector((state) => state.Building.currentBuilding);


    // Add a function to fetch gamification data with buildingId
    const fetchUserGamificationData = useCallback(async () => {
        if (user?.id) {
            try {
                // Include buildingId if available
                const buildingIdParam = currentBuilding?._id ? `?buildingId=${currentBuilding._id}` : '';
                const response = await api.get(`/api/gamification/profile/${user.id}${buildingIdParam}`);

                if (response.data.success) {
                    // Update user's gamification data
                    setGamificationData(response.data.data);
                }
            } catch (error) {
                console.error("Error fetching gamification data:", error);
            }
        }
    }, [user, currentBuilding]);
    const { invoices, loading: invoicesLoading } = useSelector((state) => state.Invoice);

    // Get claims data from Redux
    const {
        list: claimsResponse = {},
        loading: claimsLoading,
    } = useSelector((state) => state.claims || {});
    const claims = claimsResponse.data || claimsResponse || [];

    // Get events (meetings) data from Redux
    const { events = [], error, successMessage } = useSelector((state) => state.events || {});

    // Get apartments data from Redux
    const {
        apartments = [],
        error: apartmentsError,
    } = useSelector(state => ({
        apartments: state.Building.ownerApartments.apartments || [],
        loading: state.Building.ownerApartments.loading || false,
        error: state.Building.ownerApartments.error || null
    }));
    // Fetch claims data using Redux action
    const fetchClaims = useCallback(() => {
        const params = {};
        if (currentBuilding) {
            params.buildingId = currentBuilding._id;
        }
        dispatch(getUserClaims(params));
    }, [dispatch, currentBuilding]);

    // Fetch invoices data using Redux actions
    const fetchInvoices = useCallback(() => {
        if (user?.id) {
            if (currentBuilding) {
                dispatch(getInvoicesByCoOwnerAndBuilding({
                    coOwnerId: user.id,
                    buildingId: currentBuilding._id
                }));
            } else {
                dispatch(getInvoicesByCoOwner(user.id));
            }
        }
    }, [dispatch, user, currentBuilding]);

    // Fetch apartments data - Fix the function to correctly pass user ID
    const fetchApartments = useCallback(() => {
        if (user?.id) {
            if (currentBuilding?._id) {
                console.log("Fetching apartments for building:", currentBuilding._id);
                dispatch(fetchOwnerAppartements(currentBuilding._id));
            } else {
                console.log("Fetching all apartments for co-owner:", user.id);
                // Pass the user ID as a parameter if the action requires it
                dispatch(fetchAllOwnerApartments({ userId: user.id }));
            }
        }
    }, [dispatch, currentBuilding, user]);
    console.log("Fetching apartments for user:", apartments);
    // Fetch meetings/events data
    const fetchMeetings = useCallback(() => {
        if (user?.role === 'SyndicateAdmin' || user?.role === 'SyndicateCoowner') {
            if (currentBuilding?._id) {
                dispatch(fetchEvents(currentBuilding._id))
                    .unwrap()
                    .catch(err => {
                        console.error("Event fetch failed:", err);

                    });
            } else {
                dispatch(clearEvents());
            }
        } else {
            dispatch(clearEvents());
        }
    }, [dispatch, user, currentBuilding]);

    // Calculate invoice statistics
    useEffect(() => {
        if (invoices?.length > 0) {
            const totalInvoices = invoices.length;
            const paidInvoices = invoices.filter(inv => inv.status === "paid").length;
            const unpaidInvoices = invoices.filter(inv => inv.status === "unpaid").length;
            const overdueInvoices = invoices.filter(inv => {
                return inv.status === "unpaid" && new Date(inv.dueDate) < new Date();
            }).length;
            const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
            const paymentRate = totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 100) : 0;

            setInvoiceStats({
                total: totalInvoices,
                paid: paidInvoices,
                unpaid: unpaidInvoices,
                overdue: overdueInvoices,
                paymentRate,
                revenue: totalRevenue
            });

            // Find next due invoice
            const unpaidInvoicesSorted = invoices
                .filter(inv => inv.status === "unpaid")
                .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

            if (unpaidInvoicesSorted.length > 0) {
                setNextDueInvoice(unpaidInvoicesSorted[0]);
            }
        }
    }, [invoices]);

    // Fetch dashboard data on component mount
    useEffect(() => {
        setLoading(true);

        Promise.all([
            fetchInvoices(),
            fetchClaims(),
            fetchApartments(),
            fetchMeetings(),
            fetchUserGamificationData()

        ]).finally(() => {
            setLoading(false);
        });

    }, [user.id, fetchInvoices, fetchClaims, fetchApartments, fetchMeetings, fetchUserGamificationData]);

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
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
            case 'completed': return 'success';
            case 'in progress': return 'info';
            case 'open': return 'primary';
            case 'closed': return 'secondary';
            default: return 'warning';
        }
    };

    return (
        <>
            {/* Welcome Section */}
            <Row className="mb-4">
                <Col>
                    <Card className="welcome-card overflow-hidden" style={{background: 'linear-gradient(90deg, #c1e8f0, #cbe9f3, #e0f7fa)'}}>
                        <div className="position-absolute end-0 start-0 top-0 z-0"
                            style={{ height: '100%', background: 'linear-gradient(135deg, #3f87ff14 0%, #0c4fdd1c 100%)' }}>
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
                                        <h4 className="fw-semibold mb-2">{t('coOwnerWelcome.welcomeBack')}</h4>
                                        <p className="mb-3 text-muted">{t('coOwnerWelcome.dashboardSummary')}</p>
                                        <div className="d-flex flex-wrap gap-2">
                                            <Button color="primary" tag={Link} to="/profile">
                                                <i className="ri-user-settings-line align-bottom me-1"></i> {t('coOwnerWelcome.myProfile')}
                                            </Button>
                                            <Button color="success" tag={Link} to="/calendar">
                                                <i className="ri-calendar-event-line align-bottom me-1"></i> {t('coOwnerWelcome.viewMeetings')}
                                            </Button>
                                        </div>
                                    </div>
                                </Col>
                                {isGamificationEnabledForBuildingPerAdminSubcription(currentBuilding) &&
                                    isGamificationEnabledForBuilding(currentBuilding) && (

                                        <Col md={4}>
                                            <div className="text-end mt-3 mt-md-0">
                                                <div className="mb-2">
                                                    <span className="badge bg-info fs-12">
                                                        <i className="ri-trophy-line align-bottom me-1"></i> {gamificationData?.points || 0} {t('coOwnerWelcome.points')}
                                                    </span>
                                                </div>
                                                <div className="position-relative mt-3">
                                                    <div className="dashboard-icon-badge text-primary">
                                                        <FaCrown size={48} />
                                                        <div className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                                                            #{gamificationData?.rank || '---'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Col>)}
                            </Row>
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            {/* Quick Stats */}
            <Row className="mb-4">
                <Col xl={3} md={6}>
                    <Card className="card-animate" style={{background: 'linear-gradient(90deg, #c1e8f0, #cbe9f3, #e0f7fa)'}}>
                        <CardBody>
                            <div className="d-flex align-items-center">
                                <div className="flex-grow-1">
                                    <p className="text-uppercase fw-medium text-muted mb-0">{t('coOwnerWelcome.unpaidInvoices')}</p>
                                </div>
                                <div className="flex-shrink-0">
                                    <h5 className={`fs-14 mb-0 text-${invoiceStats.unpaid > 0 ? 'danger' : 'success'}`}>
                                        <i className="ri-arrow-right-up-line fs-13 align-middle"></i> {invoiceStats.unpaid}
                                    </h5>
                                </div>
                            </div>
                            <div className="d-flex align-items-end justify-content-between mt-4">
                                <div>
                                    <h4 className="fs-22 fw-semibold ff-secondary mb-2">
                                        <CountUp start={0} end={invoiceStats.unpaid} duration={2} className="counter-value" />
                                    </h4>
                                    <span className="badge bg-warning me-1">
                                        {invoiceStats.overdue} Overdue
                                    </span>
                                    <span className="text-muted">from {invoiceStats.total} total</span>
                                </div>
                                <div className="avatar-sm flex-shrink-0">
                                    <span className="avatar-title bg-light rounded fs-3">
                                        <FaFileInvoice className="text-primary" />
                                    </span>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </Col>
                <Col xl={3} md={6}>
                    <Card className="card-animate" style={{background: 'linear-gradient(90deg, #c1e8f0, #cbe9f3, #e0f7fa)'}}>
                        <CardBody>
                            <div className="d-flex align-items-center">
                                <div className="flex-grow-1">
                                    <p className="text-uppercase fw-medium text-muted mb-0">{t('coOwnerWelcome.myApartments')}</p>
                                </div>
                                <div className="flex-shrink-0">
                                    <h5 className="fs-14 mb-0 text-success">
                                        <i className="ri-home-4-line fs-13 align-middle"></i> {apartments?.length || 0}
                                    </h5>
                                </div>
                            </div>
                            <div className="d-flex align-items-end justify-content-between mt-4">
                                <div>
                                    <h4 className="fs-22 fw-semibold ff-secondary mb-2">
                                        <CountUp start={0} end={apartments?.length || 0} duration={2} className="counter-value" />
                                    </h4>
                                    <span className="text-muted">{t('coOwnerWelcome.apartmentsStats')}</span>
                                </div>
                                <div className="avatar-sm flex-shrink-0">
                                    <span className="avatar-title bg-light rounded fs-3">
                                        <FaRegBuilding className="text-primary" />
                                    </span>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </Col>
                <Col xl={3} md={6}>
                    <Card className="card-animate" style={{background: 'linear-gradient(90deg, #c1e8f0, #cbe9f3, #e0f7fa)'}}>
                        <CardBody>
                            <div className="d-flex align-items-center">
                                <div className="flex-grow-1">
                                    <p className="text-uppercase fw-medium text-muted mb-0">{t('coOwnerWelcome.upcomingMeetings')}</p>
                                </div>
                                <div className="flex-shrink-0">
                                    <h5 className="fs-14 mb-0 text-info">
                                        <i className="ri-calendar-event-line fs-13 align-middle"></i> {events?.length || 0}
                                    </h5>
                                </div>
                            </div>
                            <div className="d-flex align-items-end justify-content-between mt-4">
                                <div>
                                    <h4 className="fs-22 fw-semibold ff-secondary mb-2">
                                        <CountUp start={0} end={events?.length || 0} duration={2} className="counter-value" />
                                    </h4>
                                    <span className="text-muted">
                                        {events?.length > 0
                                            ? `Next: ${formatDate(events[0]?.start)}`
                                            : t('coOwnerWelcome.noUpcomingMeetings')}
                                    </span>
                                </div>
                                <div className="avatar-sm flex-shrink-0">
                                    <span className="avatar-title bg-light rounded fs-3">
                                        <FaCalendarAlt className="text-primary" />
                                    </span>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </Col>
                <Col xl={3} md={6}>
                    <Card className="card-animate" style={{background: 'linear-gradient(90deg, #c1e8f0, #cbe9f3, #e0f7fa)'}}>
                        <CardBody>
                            <div className="d-flex align-items-center">
                                <div className="flex-grow-1">
                                    <p className="text-uppercase fw-medium text-muted mb-0">{t('coOwnerWelcome.activeClaimsCount')}</p>
                                </div>
                                <div className="flex-shrink-0">
                                    <h5 className="fs-14 mb-0 text-warning">
                                        <i className="ri-error-warning-line fs-13 align-middle"></i> {claims?.length || 0}
                                    </h5>
                                </div>
                            </div>
                            <div className="d-flex align-items-end justify-content-between mt-4">
                                <div>
                                    <h4 className="fs-22 fw-semibold ff-secondary mb-2">
                                        <CountUp start={0} end={claims?.length || 0} duration={2} className="counter-value" />
                                    </h4>
                                    <span className="text-muted">{t('coOwnerWelcome.activeClaims')}</span>
                                </div>
                                <div className="avatar-sm flex-shrink-0">
                                    <span className="avatar-title bg-light rounded fs-3">
                                        <FaExclamationCircle className="text-primary" />
                                    </span>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </Col>
            </Row>
            {isGamificationEnabledForBuildingPerAdminSubcription(currentBuilding) &&
                isGamificationEnabledForBuilding(currentBuilding) && (
                    <GamificationLeaderboard />
                )}


            {/* Dashboard Widgets */}
            <Row>

                <Col lg={8}>
                    <Card className="mb-4">
                        <CardHeader className=" nestly-card-header card-header-with-icon">
                            <h5 className="card-title mb-0">
                                <FaRegBuilding className="icon-left" /> {t('coOwnerWelcome.myApartments')}
                            </h5>
                            {apartments?.length > 0 && (
                                <div className="flex-shrink-0">
                                    <Button color="primary" size="sm" tag={Link} to="/Apartements">
                                        {t('coOwnerWelcome.viewAll')}
                                    </Button>
                                </div>
                            )}
                        </CardHeader>
                        <CardBody>
                            {apartments?.length > 0 ? (
                                <div className="apartments-grid">
                                    {apartments.slice(0, 4).map((apartment, index) => (
                                        <div key={apartment._id || index} className="apartment-card shadow-sm border-0 rounded-3">
                                            <div className="apartment-header d-flex justify-content-between align-items-center">
                                                <h6 className="mb-0 d-flex align-items-center">
                                                    <FaHome className="me-2 text-primary" />
                                                    {currentBuilding?.name|| t('coOwnerWelcome.building')} - #{apartment.number}
                                                </h6>
                                                <Badge color="primary" className="fs-12">
                                                    {t('coOwnerWelcome.floor')} {apartment.floor}
                                                </Badge>
                                            </div>

                                            <div className="apartment-body">
                                                <div className="d-flex justify-content-between mb-2">
                                                    <span className="text-muted">
                                                        <FaBed className="me-1" /> {t('coOwnerWelcome.bedrooms')}:
                                                    </span>
                                                    <span>{apartment.bedrooms ?? t('coOwnerWelcome.na')}</span>
                                                </div>
                                                <div className="d-flex justify-content-between mb-2">
                                                    <span className="text-muted">
                                                        <FaMapMarkerAlt className="me-1" /> {t('coOwnerWelcome.bloc')}:
                                                    </span>
                                                    <span>{apartment.bloc?.name || t('coOwnerWelcome.na')}</span>
                                                </div>
                                                <div className="d-flex justify-content-between">
                                                    <span className="text-muted">
                                                        <i className="ri-building-line me-1"></i> {t('coOwnerWelcome.floor')}:
                                                    </span>
                                                    <span>{apartment.floor ?? t('coOwnerWelcome.na')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center p-4">
                                    <div className="avatar-md mx-auto mb-4">
                                        <div className="avatar-title bg-light text-primary rounded-circle fs-2">
                                            <FaRegBuilding />
                                        </div>
                                    </div>
                                    <h5>{t('coOwnerWelcome.noApartmentsFound')}</h5>
                                    <p className="text-muted">{t('coOwnerWelcome.noApartmentsAssigned')}</p>
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    {/* Upcoming Meetings - Updated with events from Redux */}
                    <Card className="mb-4">
                        <CardHeader className="nestly-card-header card-header-with-icon">
                            <h5 className="card-title mb-0">
                                <FaCalendarAlt className="icon-left" /> {t('coOwnerWelcome.upcomingMeetings')}
                            </h5>
                            <div className="flex-shrink-0">
                                <Button color="primary" size="sm" tag={Link} to="/calendar">
                                    {t('coOwnerWelcome.viewCalendar')}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardBody>
                            {events?.length > 0 ? (
                                <div className="meetings-list">
                                    {events.slice(0, 3).map((meeting, index) => (
                                        <div key={meeting._id || index} className="meeting-item">
                                            <div className="d-flex align-items-center">
                                
                                                <div className="flex-grow-1">
                                                    <h5 className="meeting-title">{meeting.title}</h5>
                                                    <p className="meeting-time mb-2">
                                                        <i className="ri-time-line me-1"></i>
                                                        {meeting.eventTime || 'Not specified'}
                                                    </p>
                                                    <div className="d-flex align-items-center">
                                                        <Badge
                                                            color={meeting.className?.replace('bg-soft-', '') || 'primary'}
                                                            pill
                                                            className="me-2"
                                                        >
                                                            {t('coOwnerWelcome.meeting')}
                                                        </Badge>
                                                        <span className="meeting-location">
                                                            <i className="ri-map-pin-line me-1"></i>
                                                            {meeting.location || t('coOwnerWelcome.online')}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex-shrink-0 ms-2 meeting-actions">
                                                    {meeting.meeting?.isActive ? (
                                                        <Button
                                                            color="success"
                                                            size="sm"
                                                            tag={Link}
                                                            to={`/meeting/${meeting._id}`}
                                                            className="join-meeting-btn"
                                                        >
                                                            <i className="ri-login-box-line me-1"></i> {t('coOwnerWelcome.join')}
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            color="primary"
                                                            size="sm"
                                                            tag={Link}
                                                            to={`/calendar/${meeting._id}`}
                                                        >
                                                            <i className="ri-eye-line me-1"></i> {t('coOwnerWelcome.view')}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center p-4">
                                    <div className="avatar-md mx-auto mb-4">
                                        <div className="avatar-title bg-light text-primary rounded-circle fs-2">
                                            <FaCalendarAlt />
                                        </div>
                                    </div>
                                    <h5>{t('coOwnerWelcome.noUpcomingMeetings')}</h5>
                                    <p className="text-muted">{t('coOwnerWelcome.noScheduledMeetings')}</p>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                    {/* Claims section */}
                    <Card>
                        <CardHeader className="nestly-card-header card-header-with-icon">
                            <h5 className="card-title mb-0">
                                <FaBell className="icon-left" /> {t('coOwnerWelcome.activeClaimsCount')}
                            </h5>
                            {claims?.length > 0 && (
                                <div className="flex-shrink-0">
                                    <Button color="primary" size="sm" tag={Link} to="/Claim">
                                        {t('coOwnerWelcome.viewAll')}
                                    </Button>
                                </div>
                            )}
                        </CardHeader>
                        <CardBody>
                            {claimsLoading ? (
                                <div className="text-center p-3">
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            ) : claims?.length > 0 ? (
                                <div className="claims-list">
                                    {claims.slice(0, 3).map((claim, index) => (
                                        <div key={claim._id || index} className="claim-item">
                                            <div className="d-flex align-items-center">
                                                <div className="flex-shrink-0 me-3">
                                                    <div className={`avatar-sm claim-avatar bg-soft-${getStatusColor(claim.status)}`}>
                                                        <span className={`avatar-title rounded-circle text-${getStatusColor(claim.status)}`}>
                                                            <i className="ri-error-warning-line"></i>
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex-grow-1">
                                                    <h6 className="mb-1">{claim.title}</h6>
                                                    <p className="text-muted mb-0">{claim.description?.substring(0, 50)}...</p>
                                                    <div className="d-flex align-items-center mt-2">
                                                        <Badge color={getStatusColor(claim.status)}>{claim.status}</Badge>
                                                        <small className="text-muted ms-2">Filed on: {formatDate(claim.createdAt)}</small>
                                                    </div>
                                                </div>
                                                <div className="flex-shrink-0 ms-2">
                                                    <Button color="ghost-secondary" size="sm" tag={Link} to={`/Claim/${claim._id}`}>
                                                        <i className="ri-arrow-right-s-line"></i>
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center p-4">
                                    <div className="avatar-md mx-auto mb-4">
                                        <div className="avatar-title bg-light text-primary rounded-circle fs-2">
                                            <FaExclamationCircle />
                                        </div>
                                    </div>
                                    <h5>{t('coOwnerWelcome.noActiveClaims')}</h5>
                                    <p className="text-muted">{t('coOwnerWelcome.noActiveClaimsDesc')}</p>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </Col>

                {/* Right Column */}
                <Col lg={4}>
                    {/* Payment Summary */}
                    <Card className="mb-4">
                        <CardHeader className="nestly-card-header card-header-with-icon">
                            <h5 className="card-title mb-0">
                                <FaFileInvoice className="icon-left" /> {t('coOwnerWelcome.invoicesStats')}
                            </h5>
                            <div className="flex-shrink-0">
                                <Button color="primary" size="sm" tag={Link} to="/apps-invoices-list">
                                    {t('coOwnerWelcome.viewAll')}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardBody>
                            {invoicesLoading ? (
                                <div className="text-center p-3">
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="text-center mb-4">
                                        <h5 className="mb-3">{t('coOwnerWelcome.paymentRate')}</h5>
                                        {/* Circular progress indicator */}
                                        <div className="position-relative d-inline-block">
                                            <svg className="circular-chart" width="120" height="120" viewBox="0 0 36 36">
                                                <path className="circle-bg"
                                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                    fill="none"
                                                    stroke="#eee"
                                                    strokeWidth="2" />
                                                <path className="circle"
                                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                    fill="none"
                                                    stroke="#03A9F4"
                                                    strokeWidth="2"
                                                    strokeDasharray={`${invoiceStats.paymentRate}, 100`} />
                                                <text x="18" y="17" className="percentage" textAnchor="middle" dominantBaseline="middle" fontSize="8">
                                                    {invoiceStats.paymentRate}%
                                                </text>
                                            </svg>
                                        </div>

                                        <div className="payment-summary-stats mt-4">
                                            <Row>
                                                <Col xs={4}>
                                                    <div className="payment-stat">
                                                        <h5>{invoiceStats.paid}</h5>
                                                        <p className="text-muted mb-0">{t('coOwnerWelcome.paidInvoices')}</p>
                                                    </div>
                                                </Col>
                                                <Col xs={4}>
                                                    <div className="payment-stat">
                                                        <h5>{invoiceStats.unpaid - invoiceStats.overdue}</h5>
                                                        <p className="text-muted mb-0">{t('coOwnerWelcome.pending')}</p>
                                                    </div>
                                                </Col>
                                                <Col xs={4}>
                                                    <div className="payment-stat">
                                                        <h5 className="text-danger">{invoiceStats.overdue}</h5>
                                                        <p className="text-muted mb-0">{t('coOwnerWelcome.overdue')}</p>
                                                    </div>
                                                </Col>
                                            </Row>
                                        </div>
                                    </div>

                                    {invoiceStats.unpaid > 0 && nextDueInvoice ? (
                                        <div className="next-payment mt-4">
                                            <h6>{t('coOwnerWelcome.nextDueInvoice')}</h6>
                                            <div className="next-payment-alert">
                                                <div className="d-flex align-items-center">
                                                    <div className="flex-shrink-0 me-3">
                                                        <i className="ri-calendar-todo-fill fs-2 text-danger"></i>
                                                    </div>
                                                    <div className="flex-grow-1">
                                                        <h6 className="mb-1">{formatDate(nextDueInvoice.dueDate)}</h6>
                                                        <p className="text-muted mb-0">
                                                            {nextDueInvoice.building?.name || t('coOwnerWelcome.building')} - ${nextDueInvoice.total?.toFixed(2) || '0.00'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center p-3">
                                            <div className="avatar-md mx-auto mb-3">
                                                <div className="avatar-title bg-light text-success rounded-circle fs-2">
                                                    <i className="ri-checkbox-circle-fill"></i>
                                                </div>
                                            </div>
                                            <h5>{t('coOwnerWelcome.allInvoicesPaid')}</h5>
                                            <p className="text-muted">{t('coOwnerWelcome.noInvoicesDue')}</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardBody>
                    </Card>
                    {isGamificationEnabledForBuildingPerAdminSubcription(currentBuilding) &&
                        isGamificationEnabledForBuilding(currentBuilding) && (
                            < Card className="mb-4">
                                <CardHeader className="nestly-card-header card-header-with-icon">
                                    <h5 className="card-title mb-0">
                                        <FaChartLine className="icon-left" /> {t('coOwnerWelcome.yourAchievements')}
                                    </h5>
                                    <div className="flex-shrink-0">
                                        <Button color="primary" size="sm" tag={Link} to="/profile">
                                            {t('coOwnerWelcome.myProfile')}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardBody>
                                    <div className="text-center mb-3">
                                        <div className="avatar-lg mx-auto mb-3">
                                            <div className="avatar-title bg-soft-primary text-primary display-5 rounded-circle">
                                                <FaCrown />
                                            </div>
                                        </div>
                                        <h4>{gamificationData?.points || 0} {t('coOwnerWelcome.points')}</h4>
                                        <p className="text-muted">{t('coOwnerWelcome.rankedAmongCoOwners', { rank: gamificationData?.rank || '---' })}</p>
                                    </div>
                                    <div className="mt-4">
                                        <div className="streaks-section mb-4">
                                            <h6 className="mb-3">{t('coOwnerWelcome.yourStreaks')}</h6>
                                            <div className="d-flex justify-content-between">
                                                {currentBuilding ? (
                                                    // Building-specific streaks
                                                    <>
                                                        <div className="streak-item text-center">
                                                            <div className="avatar-xs mx-auto mb-2 bg-soft-success rounded-circle">
                                                                <span className="avatar-title rounded-circle text-success">
                                                                    <i className="ri-money-dollar-circle-line"></i>
                                                                </span>
                                                            </div>
                                                            <div className="streak-value">
                                                                {getBuildingSpecificGamification(user, currentBuilding._id).paymentStreak}
                                                            </div>
                                                            <div className="streak-label text-muted small">{t('coOwnerWelcome.payments')}</div>
                                                        </div>

                                                        <div className="streak-item text-center">
                                                            <div className="avatar-xs mx-auto mb-2 bg-soft-info rounded-circle">
                                                                <span className="avatar-title rounded-circle text-info">
                                                                    <i className="ri-calendar-check-line"></i>
                                                                </span>
                                                            </div>
                                                            <div className="streak-value">
                                                                {getBuildingSpecificGamification(user, currentBuilding._id).meetingStreak}
                                                            </div>
                                                            <div className="streak-label text-muted small">{t('coOwnerWelcome.meetings')}</div>
                                                        </div>

                                                        <div className="streak-item text-center">
                                                            <div className="avatar-xs mx-auto mb-2 bg-soft-warning rounded-circle">
                                                                <span className="avatar-title rounded-circle text-warning">
                                                                    <i className="ri-vote-line"></i>
                                                                </span>
                                                            </div>
                                                            <div className="streak-value">
                                                                {getBuildingSpecificGamification(user, currentBuilding._id).votingStreak}
                                                            </div>
                                                            <div className="streak-label text-muted small">{t('coOwnerWelcome.voting')}</div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    // General streaks for when no building is selected
                                                    <>
                                                        <div className="streak-item text-center">
                                                            <div className="avatar-xs mx-auto mb-2 bg-soft-success rounded-circle">
                                                                <span className="avatar-title rounded-circle text-success">
                                                                    <i className="ri-money-dollar-circle-line"></i>
                                                                </span>
                                                            </div>
                                                            <div className="streak-value">{user?.gamification?.paymentStreak || 0}</div>
                                                            <div className="streak-label text-muted small">{t('coOwnerWelcome.payments')}</div>
                                                        </div>

                                                        <div className="streak-item text-center">
                                                            <div className="avatar-xs mx-auto mb-2 bg-soft-info rounded-circle">
                                                                <span className="avatar-title rounded-circle text-info">
                                                                    <i className="ri-calendar-check-line"></i>
                                                                </span>
                                                            </div>
                                                            <div className="streak-value">{user?.gamification?.meetingStreak || 0}</div>
                                                            <div className="streak-label text-muted small">{t('coOwnerWelcome.meetings')}</div>
                                                        </div>

                                                        <div className="streak-item text-center">
                                                            <div className="avatar-xs mx-auto mb-2 bg-soft-warning rounded-circle">
                                                                <span className="avatar-title rounded-circle text-warning">
                                                                    <i className="ri-vote-line"></i>
                                                                </span>
                                                            </div>
                                                            <div className="streak-value">{user?.gamification?.votingStreak || 0}</div>
                                                            <div className="streak-label text-muted small">{t('coOwnerWelcome.voting')}</div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>)}






                </Col>
            </Row >

            <style jsx>{`
                /* Enhanced styles for CoownerWelcome page */
                .welcome-card {
                  background: #fff;
                  border: none;
                  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.05);
                }
                .nestly-card-header {
                background: linear-gradient(90deg, #c1e8f0, #cbe9f3, #e0f7fa);
                }
                .card-header-with-icon {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                }
                
                .icon-left {
                  margin-right: 8px;
                  vertical-align: -2px;
                }
                
                /* Apartment styles */
                .apartments-grid {
                  display: grid;
                  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
                  gap: 16px;
                }
                
                .apartment-card {
                  border: 1px solid #e9ebec;
                  border-radius: 0.5rem;
                  overflow: hidden;
                  transition: all 0.3s ease;
                }
                
                .apartment-card:hover {
                  transform: translateY(-5px);
                  box-shadow: 0 10px 20px rgba(0,0,0,0.08);
                }
                
                .apartment-header {
                  padding: 12px 16px;
                  background-color: #f8f9fa;
                  border-bottom: 1px solid #e9ebec;
                }
                
                .apartment-body {
                  padding: 16px;
                }
                
                /* Meeting styles */
                .meetings-list {
                  display: flex;
                  flex-direction: column;
                  gap: 12px;
                }
                
                .meeting-item {
                  padding: 16px;
                  background-color: #f8f9fa;
                  border-radius: 0.5rem;
                  transition: all 0.3s ease;
                }
                
                .meeting-item:hover {
                  transform: translateY(-3px);
                  box-shadow: 0 5px 15px rgba(0,0,0,0.05);
                }
                
                .calendar-date-badge {
                  width: 50px;
                  height: 60px;
                  background-color: #fff;
                  border-radius: 8px;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
                  border: 1px solid #e9ebec;
                }
                
                .calendar-date-month {
                  background-color: #4B79CF;
                  color: white;
                  font-size: 0.7rem;
                  font-weight: 600;
                  text-transform: uppercase;
                  width: 100%;
                  text-align: center;
                  border-radius: 6px 6px 0 0;
                  padding: 2px 0;
                }
                
                .calendar-date-day {
                  font-size: 1.2rem;
                  font-weight: 700;
                  padding: 5px 0;
                }
                
                .meeting-title {
                  font-size: 1rem;
                  font-weight: 600;
                  margin-bottom: 0.25rem;
                }
                
                .meeting-time, .meeting-location {
                  font-size: 0.85rem;
                  color: #6c757d;
                }
                
                .join-meeting-btn {
                  animation: pulse 1.5s infinite;
                }
                
                @keyframes pulse {
                  0% {
                    box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.4);
                  }
                  70% {
                    box-shadow: 0 0 0 6px rgba(40, 167, 69, 0);
                  }
                  100% {
                    box-shadow: 0 0 0 0 rgba(40, 167, 69, 0);
                  }
                }
                
                /* Claims styles */
                .claim-item {
                  padding: 15px 0;
                  border-bottom: 1px solid #e9ebec;
                  transition: all 0.3s ease;
                }
                
                .claim-item:hover {
                  background-color: #f8f9fa;
                }
                
                .claim-item:last-child {
                  border-bottom: none;
                  padding-bottom: 0;
                }
                
                .claim-item:first-child {
                  padding-top: 0;
                }
                
                .claim-avatar {
                  width: 40px;
                  height: 40px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  border-radius: 50%;
                }
                
                /* Payment styles */
                .next-payment-alert {
                  background-color: #f8f9fa;
                  border-radius: 0.5rem;
                  padding: 15px;
                  border: 1px solid #e9ebec;
                }
                
                .payment-stat {
                  text-align: center;
                }
                
                .payment-stat h5 {
                  margin-bottom: 5px;
                  font-weight: 600;
                }
                
                .circular-chart {
                  display: block;
                  margin: 10px auto;
                  max-width: 100%;
                  max-height: 250px;
                }
                
                .circle {
                  stroke: #4B79CF;
                  fill: none;
                  stroke-width: 2.8;
                  stroke-linecap: round;
                  animation: progress 1s ease-out forwards;
                }
                
                .circle-bg {
                  stroke: #eee;
                  fill: none;
                  stroke-width: 2.8;
                }
                
                .percentage {
                  fill: #4B79CF;
                  font-size: 0.5em;
                  text-anchor: middle;
                  dominant-baseline: middle;
                  font-weight: bold;
                }
                
                @keyframes progress {
                  0% {
                    stroke-dasharray: 0 100;
                  }
                }
                
                /* Achievement styles */
                .streak-item {
                  text-align: center;
                  padding: 10px;
                  border-radius: 8px;
                  transition: all 0.3s ease;
                }
                
                .streak-item:hover {
                  background-color: #f8f9fa;
                  transform: translateY(-3px);
                }
                
                .streak-value {
                  font-size: 1.5rem;
                  font-weight: 700;
                  margin: 5px 0;
                  color: #495057;
                }
            `}</style>
        </>
    );
};

export default withTranslation()(CoownerWelcome);
