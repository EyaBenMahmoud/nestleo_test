import React, { useState, useEffect } from 'react';
import {
    Modal,
    ModalHeader,
    ModalBody,
    Row,
    Col,
    Progress,
    Card,
    CardBody,
    Badge,
    Spinner
} from 'reactstrap';
import axios from 'axios';
import { FaStar, FaAward, FaMedal, FaTrophy, FaCreditCard, FaBuilding, FaHome, FaEnvelope, FaPhone, FaCalendarAlt } from 'react-icons/fa';
import DropImage from '../../../Components/Common/displayDropdown';
import api from '../../../services/api';
import { isGamificationAvailable, isGamificationEnabledForBuilding } from '../../../Components/Subscriptions/SubcriptionValidator';
import { useSelector } from 'react-redux';
import { withTranslation } from "react-i18next";

const UserProfileModal = ({ isOpen, toggle, userId, t }) => {
    const [userDetails, setUserDetails] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [gamification, setGamification] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [currentPage, setCurrentPage] = useState(1);
    const [activitiesPerPage] = useState(5);

    const user = useSelector(state => state.Loginn.user || {})
    const currentBuilding = useSelector(state => state.Building.currentBuilding || {});

    useEffect(() => {
        async function fetchData() {
            if (!userId || !isOpen) return;

            setLoading(true);
            setError(null);

            try {
                // Get user profile details
                const userResponse = await api.get(`/users/${userId}`);
                let userData = userResponse.data.data;

                // Get user's invoices
                const invoicesResponse = await api.get(`/api/invoices/coowner/${userId}?buildingId=${currentBuilding._id}`);
                setInvoices(invoicesResponse.data.data || []);

                // Get association status if we have a current building
                if (currentBuilding?._id) {
                    try {
                        const associationsResponse = await api.get(`/api/Building/${currentBuilding._id}/associations`);
                        const association = associationsResponse.data.find(
                            assoc => assoc.coOwner?._id === userId
                        );

                        // Add association data to the user object
                        userData = {
                            ...userData,
                            associationId: association?._id,
                            associationActive: association ? association.isActive : false,
                            hasAssociation: !!association
                        };
                    } catch (err) {
                        console.error("Error fetching association data:", err);
                    }
                }

                // Set the enriched user data
                setUserDetails(userData);

                // Get gamification profile
                const gamificationResponse = await api.get(`/api/gamification/profile/${userId}`);
                console.log('Gamification response:', gamificationResponse.data);

                // Process gamification data to match the structure your component expects
                if (gamificationResponse.data && gamificationResponse.data.success) {
                    const gamData = gamificationResponse.data.data;
                    setGamification({
                        totalPoints: gamData.points || 0,
                        monthlyPoints: gamData.monthlyPoints || 0,
                        badges: gamData.badges || [],
                        recentActivity: gamData.recentActivity || [],
                        redeemedRewards: gamData.redeemedRewards || [],
                        // Set streaks if available, otherwise default to 0
                        paymentStreak: gamData.paymentStreak || 0,
                        meetingStreak: gamData.meetingStreak || 0,
                        votingStreak: gamData.votingStreak || 0,
                    });
                }
            } catch (err) {
                console.error("Error fetching user data:", err);
                setError(err.response?.data?.message || t('coOwnerProfile.errorLoading'));
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [userId, isOpen, currentBuilding, t]);

    // Function to get badge color class based on name or category
    const getBadgeColorClass = (badgeNameOrCategory) => {
        const name = badgeNameOrCategory ? badgeNameOrCategory.toLowerCase() : '';

        if (name.includes('financ') || name.includes('pay') || name.includes('bill') || name.includes('punctual')) {
            return 'badge-green';
        }
        if (name.includes('meet') || name.includes('timer') || name.includes('first')) {
            return 'badge-blue';
        }
        if (name.includes('vote') || name.includes('poll')) {
            return 'badge-orange';
        }
        if (name.includes('bird') || name.includes('early')) {
            return 'badge-green';
        }
        if (name.includes('star') || name.includes('rising')) {
            return 'badge-purple';
        }
        if (name.includes('engage') || name.includes('resident') || name.includes('active')) {
            return 'badge-purple';
        }

        // Default color if no matches
        return 'badge-purple';
    };

    // Calculate payment statistics
    const invoiceStats = React.useMemo(() => {
        const totalInvoices = invoices.length;
        const paidInvoices = invoices.filter(i => i.status === 'paid').length;
        const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;

        return {
            total: totalInvoices,
            paid: paidInvoices,
            overdue: overdueInvoices,
            unpaid: totalInvoices - paidInvoices,
            paidPercentage: totalInvoices ? Math.round((paidInvoices / totalInvoices) * 100) : 0,
        };
    }, [invoices]);

    const getBadgeIcon = (badge) => {
        if (!badge) return <FaAward />;

        const name = badge.name ? badge.name.toLowerCase() : '';
        const category = badge.category ? badge.category.toLowerCase() : '';

        if (name.includes('financ') || name.includes('pay') || name.includes('bill') ||
            name.includes('punctual') || name.includes('early') || category === 'payment') {
            return <FaCreditCard />;
        }

        if (name.includes('meet') || name.includes('timer') || name.includes('participant') ||
            category === 'meeting') {
            return <FaCalendarAlt />;
        }

        if (name.includes('vote') || name.includes('poll') || category === 'voting') {
            return <FaStar />;
        }

        if (name.includes('star') || name.includes('rising')) {
            return <FaStar />;
        }

        return <FaAward />;
    };

    // Function to get activity icon class based on reason
    const getActivityIconClass = (reason) => {
        if (!reason) return 'activity-other';

        if (reason.includes('payment')) return 'activity-payment';
        if (reason.includes('meeting')) return 'activity-meeting';
        if (reason.includes('voting')) return 'activity-voting';

        return 'activity-other';
    };

    // Function to get activity icon based on reason
    const getActivityIcon = (reason) => {
        if (!reason) return <FaAward />;

        if (reason.includes('payment')) return <FaCreditCard />;
        if (reason.includes('meeting')) return <FaCalendarAlt />;
        if (reason.includes('voting')) return <FaStar />;

        return <FaAward />;
    };

    // Format date to readable string
    const formatDate = (dateString) => {
        if (!dateString) return t('coOwnerProfile.notAvailable');
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Then, add this function to handle page changes
    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    return (
        <Modal isOpen={isOpen} toggle={toggle} size="xl" className="user-profile-modal">
            <ModalHeader toggle={toggle} className="border-0 pb-0">
                {!loading && userDetails && (
                    <div className="d-flex align-items-center">
                        <h4 className="modal-title mb-0">{t('coOwnerProfile.title')}</h4>
                    </div>
                )}
            </ModalHeader>
            <ModalBody className="pt-0">
                {loading ? (
                    <div className="text-center p-5">
                        <Spinner color="primary" />
                        <p className="mt-3">{t('coOwnerProfile.loadingProfile')}</p>
                    </div>
                ) : error ? (
                    <div className="text-center p-5 text-danger">
                        <i className="ri-error-warning-line fs-1"></i>
                        <p className="mt-3">{error}</p>
                    </div>
                ) : userDetails ? (
                    <>
                        {/* User Header */}
                        <div className="profile-header">
                            <div className="profile-header-content">
                                <div className="profile-avatar">
                                    {userDetails.avatar ? (
                                        <DropImage userId={userDetails} className="profile-img" alt={`${userDetails.firstName} ${userDetails.lastName}`} />
                                    ) : (
                                        <div className="profile-initials">
                                            {userDetails.firstName?.charAt(0) || ''}{userDetails.lastName?.charAt(0) || ''}
                                        </div>
                                    )}
                                </div>
                                <div className="profile-info">
                                    <h4 className="profile-name">
                                        {userDetails.firstName} {userDetails.lastName}
                                    </h4>
                                    <p className="profile-role">{userDetails.role}</p>

                                    <div className="profile-status">
                                        {/* Updated status display to match Team.js */}
                                        {userDetails.associationActive !== undefined ? (
                                            userDetails.associationActive ? (
                                                <Badge color="success" pill className="status-badge me-2">
                                                    <i className="ri-checkbox-circle-line me-1"></i> {t('team.status.active')}
                                                </Badge>
                                            ) : (
                                                <Badge color="danger" pill className="status-badge me-2">
                                                    <i className="ri-close-circle-line me-1"></i> {t('team.status.inactive')}
                                                </Badge>
                                            )
                                        ) : userDetails.hasAssociation ? (
                                            userDetails.isActive ? (
                                                <Badge color="success" pill className="status-badge me-2">
                                                    <i className="ri-checkbox-circle-line me-1"></i> {t('team.status.active')}
                                                </Badge>
                                            ) : (
                                                <Badge color="danger" pill className="status-badge me-2">
                                                    <i className="ri-close-circle-line me-1"></i> {t('team.status.inactive')}
                                                </Badge>
                                            )
                                        ) : (
                                            <Badge color="warning" pill className="status-badge me-2">
                                                <i className="ri-question-line me-1"></i> {t('team.status.noAssociation')}
                                            </Badge>
                                        )}

                                        {/* Payment status badges remain unchanged */}
                                        {invoiceStats.paidPercentage === 100 ? (
                                            <Badge color="success" pill className="payment-badge">
                                                <i className="ri-shield-check-line me-1"></i> {t('coOwnerProfile.paymentStatus.allPaid')}
                                            </Badge>
                                        ) : invoiceStats.overdue > 0 ? (
                                            <Badge color="danger" pill className="payment-badge">
                                                <i className="ri-error-warning-line me-1"></i> {t('coOwnerProfile.paymentStatus.hasOverdue')}
                                            </Badge>
                                        ) : invoiceStats.unpaid > 0 ? (
                                            <Badge color="warning" pill className="payment-badge">
                                                <i className="ri-time-line me-1"></i> {t('coOwnerProfile.paymentStatus.hasUnpaid')}
                                            </Badge>
                                        ) : (
                                            <Badge color="info" pill className="payment-badge">
                                                <i className="ri-information-line me-1"></i> {t('coOwnerProfile.paymentStatus.noInvoices')}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Progress bar remains unchanged */}
                            <div className="payment-progress mt-3">
                                <div className="d-flex align-items-center justify-content-between mb-1">
                                    <span className="fs-12">{t('coOwnerProfile.invoicePaymentStatus')}</span>
                                    <span className="fs-12 fw-semibold">{invoiceStats.paidPercentage}%</span>
                                </div>
                                <Progress
                                    value={invoiceStats.paidPercentage}
                                    color={invoiceStats.paidPercentage === 100 ? "success" : invoiceStats.paidPercentage >= 50 ? "info" : "warning"}
                                    className="progress-sm"
                                />
                                <div className="d-flex justify-content-between mt-1 fs-12 text-muted">
                                    <span>{invoiceStats.paid} {t('coOwnerProfile.paid')}</span>
                                    <span>{invoiceStats.unpaid} {t('coOwnerProfile.unpaid')}</span>
                                    {invoiceStats.overdue > 0 && (
                                        <span className="text-danger">{invoiceStats.overdue} {t('coOwnerProfile.overdue')}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="profile-tabs mt-4">
                            <ul className="nav nav-tabs nav-tabs-custom">
                                <li className="nav-item">
                                    <button
                                        className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('overview')}
                                    >
                                        <i className="ri-user-line me-1"></i> {t('coOwnerProfile.tabs.overview')}
                                    </button>
                                </li>
                                {isGamificationAvailable(user) && isGamificationEnabledForBuilding(currentBuilding) && (
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${activeTab === 'gamification' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('gamification')}
                                        >
                                            <i className="ri-award-line me-1"></i> {t('coOwnerProfile.tabs.gamification')}
                                        </button>
                                    </li>
                                )}
                                <li className="nav-item">
                                    <button
                                        className={`nav-link ${activeTab === 'invoices' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('invoices')}
                                    >
                                        <i className="ri-file-list-3-line me-1"></i> {t('coOwnerProfile.tabs.invoices')}
                                    </button>
                                </li>
                            </ul>
                        </div>

                        {/* Tab Content */}
                        <div className="tab-content p-3">
                            {/* Overview Tab */}
                            {activeTab === 'overview' && (
                                <div className="overview-tab">
                                    <Row>
                                        <Col lg={6}>
                                            <Card className="mb-3">
                                                <CardBody>
                                                    <h5 className="card-title">{t('coOwnerProfile.personalInformation')}</h5>
                                                    <div className="profile-info-list">
                                                        <div className="info-item">
                                                            <div className="info-label">
                                                                <FaEnvelope className="me-2" /> {t('coOwnerProfile.email')}
                                                            </div>
                                                            <div className="info-value">{userDetails.email}</div>
                                                        </div>
                                                        <div className="info-item">
                                                            <div className="info-label">
                                                                <FaPhone className="me-2" /> {t('coOwnerProfile.phone')}
                                                            </div>
                                                            <div className="info-value">{userDetails.phoneNumber || t('coOwnerProfile.notProvided')}</div>
                                                        </div>
                                                        <div className="info-item">
                                                            <div className="info-label">
                                                                <FaBuilding className="me-2" /> {t('coOwnerProfile.city')}
                                                            </div>
                                                            <div className="info-value">{userDetails.city || t('coOwnerProfile.notProvided')}</div>
                                                        </div>
                                                        <div className="info-item">
                                                            <div className="info-label">
                                                                <FaHome className="me-2" /> {t('coOwnerProfile.country')}
                                                            </div>
                                                            <div className="info-value">{userDetails.country || t('coOwnerProfile.notProvided')}</div>
                                                        </div>
                                                    </div>
                                                </CardBody>
                                            </Card>
                                        </Col>

                                        <Col lg={6}>
                                            <Card className="mb-3">
                                                <CardBody>
                                                    <h5 className="card-title">{t('coOwnerProfile.accountInformation')}</h5>
                                                    <div className="profile-info-list">
                                                        <div className="info-item">
                                                            <div className="info-label">{t('coOwnerProfile.accountStatus')}</div>
                                                            <div className="info-value">
                                                                {userDetails.associationActive !== undefined ? (
                                                                    userDetails.associationActive ? (
                                                                        <Badge color="success" pill>
                                                                            <i className="ri-checkbox-circle-line me-1"></i> {t('team.status.active')}
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge color="danger" pill>
                                                                            <i className="ri-close-circle-line me-1"></i> {t('team.status.inactive')}
                                                                        </Badge>
                                                                    )
                                                                ) : userDetails.hasAssociation ? (
                                                                    userDetails.isActive ? (
                                                                        <Badge color="success" pill>
                                                                            <i className="ri-checkbox-circle-line me-1"></i> {t('team.status.active')}
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge color="danger" pill>
                                                                            <i className="ri-close-circle-line me-1"></i> {t('team.status.inactive')}
                                                                        </Badge>
                                                                    )
                                                                ) : (
                                                                    <Badge color="warning" pill>
                                                                        <i className="ri-question-line me-1"></i> {t('team.status.noAssociation')}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="info-item">
                                                            <div className="info-label">{t('coOwnerProfile.role')}</div>
                                                            <div className="info-value">{userDetails.role}</div>
                                                        </div>
                                                        <div className="info-item">
                                                            <div className="info-label">{t('coOwnerProfile.apartments')}</div>
                                                            <div className="info-value">
                                                                {t('coOwnerProfile.apartmentsAssigned', { count: userDetails.apartments?.length || 0 })}
                                                            </div>
                                                        </div>
                                                        <div className="info-item">
                                                            <div className="info-label">{t('coOwnerProfile.paymentStatus.label')}</div>
                                                            <div className="info-value">
                                                                {invoiceStats.paidPercentage === 100 ? (
                                                                    <Badge color="success">{t('coOwnerProfile.paymentStatus.allPaid')}</Badge>
                                                                ) : (
                                                                    <Badge color="warning">{t('coOwnerProfile.paymentStatus.percentagePaid', { percentage: invoiceStats.paidPercentage })}</Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardBody>
                                            </Card>
                                        </Col>
                                    </Row>

                                    {/* Apartments Section */}
                                    <Card>
                                        <CardBody>
                                            <h5 className="card-title mb-3">{t('coOwnerProfile.assignedApartments')}</h5>

                                            {userDetails.apartments && userDetails.apartments.length > 0 ? (
                                                <div className="apartments-grid">
                                                    {userDetails.apartments.map((apt, index) => (
                                                        <div className="apartment-card" key={apt._id || index}>
                                                            <div className="apartment-card-header">
                                                                <h6 className="apartment-number">#{apt.number}</h6>
                                                                <Badge color="light" className="apartment-floor">
                                                                    {t('coOwnerProfile.floor', { floor: apt.floor })}
                                                                </Badge>
                                                            </div>
                                                            <div className="apartment-card-body">
                                                                <div className="apartment-detail">
                                                                    <span className="detail-label">{t('coOwnerProfile.building')}:</span>
                                                                    <span className="detail-value">{apt.building?.name || t('coOwnerProfile.unknown')}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center p-3 text-muted">
                                                    <i className="ri-home-4-line fs-3"></i>
                                                    <p className="mt-2">{t('coOwnerProfile.noApartments')}</p>
                                                </div>
                                            )}
                                        </CardBody>
                                    </Card>

                                    {/* Delegates Section */}
                                    <Card className="mt-3">
                                        <CardBody>
                                            <h5 className="card-title mb-3">{t('coOwnerProfile.delegates')}</h5>

                                            {userDetails.delegates && userDetails.delegates.length > 0 ? (
                                                <div className="delegates-grid">
                                                    {userDetails.delegates.map((delegate, index) => (
                                                        <div className="delegate-card" key={delegate._id || index}>
                                                            <div className="delegate-card-header">
                                                                <div className="d-flex align-items-center">
                                                                    <div className="delegate-avatar">
                                                                        {delegate.user?.avatar ? (
                                                                            <DropImage
                                                                                userId={delegate.user}
                                                                                className="delegate-img"
                                                                                alt={`${delegate.user?.firstName} ${delegate.user?.lastName}`}
                                                                            />
                                                                        ) : (
                                                                            <div className="delegate-initials">
                                                                                {delegate.user?.firstName?.charAt(0) || delegate.email?.charAt(0) || '?'}
                                                                                {delegate.user?.lastName?.charAt(0) || ''}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="delegate-info ms-3">
                                                                        <h6 className="delegate-name mb-1">
                                                                            {delegate.user ?
                                                                                `${delegate.user.firstName} ${delegate.user.lastName}` :
                                                                                delegate.email
                                                                            }
                                                                        </h6>
                                                                        <p className="delegate-email text-muted mb-0">{delegate.email}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="delegate-status">
                                                                    {delegate.meetingDelegation.isActive ? (
                                                                        <Badge color="success" pill>
                                                                            <i className="ri-checkbox-circle-line me-1"></i>
                                                                            {t('coOwnerProfile.delegate.active')}
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge color="warning" pill>
                                                                            <i className="ri-time-line me-1"></i>
                                                                            {t('coOwnerProfile.delegate.pending')}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="delegate-card-body mt-3">
                                                                <div className="delegate-details">
                                                                    <div className="delegate-detail">
                                                                        <span className="detail-label">{t('coOwnerProfile.delegate.type')}:</span>
                                                                        <span className="detail-value">
                                                                            <Badge
                                                                                color={delegate.type === 'both' ? 'primary' : delegate.type === 'meeting' ? 'info' : 'secondary'}
                                                                                className="ms-1"
                                                                            >
                                                                                {delegate.type === 'both' ? t('coOwnerProfile.delegate.types.both') :
                                                                                    delegate.type === 'meeting' ? t('coOwnerProfile.delegate.types.meeting') :
                                                                                        t('coOwnerProfile.delegate.types.payment')}
                                                                            </Badge>
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center p-3 text-muted">
                                                    <i className="ri-user-shared-line fs-3"></i>
                                                    <p className="mt-2">{t('coOwnerProfile.noDelegates')}</p>
                                                </div>
                                            )}
                                        </CardBody>
                                    </Card>
                                </div>
                            )}

                            {/* Gamification Tab */}
                            {activeTab === 'gamification' && (
                                <div className="gamification-tab">
                                    {gamification ? (
                                        <>
                                            <Row className="mb-4">
                                                <Col lg={4}>
                                                    <Card className="gamification-stats-card">
                                                        <CardBody>
                                                            <div className="stats-icon total-points">
                                                                <FaTrophy />
                                                            </div>
                                                            <h3 className="stats-value">{gamification.totalPoints || 0}</h3>
                                                            <p className="stats-label">{t('coOwnerProfile.gamification.totalPoints')}</p>
                                                        </CardBody>
                                                    </Card>
                                                </Col>
                                                <Col lg={4}>
                                                    <Card className="gamification-stats-card">
                                                        <CardBody>
                                                            <div className="stats-icon monthly-points">
                                                                <FaStar />
                                                            </div>
                                                            <h3 className="stats-value">{gamification.monthlyPoints || 0}</h3>
                                                            <p className="stats-label">{t('coOwnerProfile.gamification.monthlyPoints')}</p>
                                                        </CardBody>
                                                    </Card>
                                                </Col>
                                                <Col lg={4}>
                                                    <Card className="gamification-stats-card">
                                                        <CardBody>
                                                            <div className="stats-icon badges">
                                                                <FaMedal />
                                                            </div>
                                                            <h3 className="stats-value">{gamification.badges?.length || 0}</h3>
                                                            <p className="stats-label">{t('coOwnerProfile.gamification.badgesEarned')}</p>
                                                        </CardBody>
                                                    </Card>
                                                </Col>
                                            </Row>

                                            <Card className="mb-4">
                                                <CardBody>
                                                    <h5 className="card-title">{t('coOwnerProfile.gamification.recentActivity')}</h5>
                                                    <div className="recent-activities">
                                                        {gamification && gamification.recentActivity && gamification.recentActivity.length > 0 ? (
                                                            <>
                                                                <div className="table-responsive">
                                                                    <table className="table activity-table">
                                                                        <thead>
                                                                            <tr>
                                                                                <th>{t('coOwnerProfile.gamification.activity')}</th>
                                                                                <th>{t('coOwnerProfile.gamification.points')}</th>
                                                                                <th>{t('coOwnerProfile.gamification.date')}</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {gamification.recentActivity
                                                                                .slice(
                                                                                    (currentPage - 1) * activitiesPerPage,
                                                                                    currentPage * activitiesPerPage
                                                                                )
                                                                                .map((activity, index) => (
                                                                                    <tr key={activity.id || index}>
                                                                                        <td>
                                                                                            <div className="d-flex align-items-center">
                                                                                                <div className={`activity-icon-small ${getActivityIconClass(activity.reason)}`}>
                                                                                                    {getActivityIcon(activity.reason)}
                                                                                                </div>
                                                                                                <span className="ms-2">{activity.description}</span>
                                                                                            </div>
                                                                                        </td>
                                                                                        <td>
                                                                                            <Badge color="success" className="points-badge">
                                                                                                +{activity.points}
                                                                                            </Badge>
                                                                                        </td>
                                                                                        <td>{formatDate(activity.timestamp)}</td>
                                                                                    </tr>
                                                                                ))
                                                                            }
                                                                        </tbody>
                                                                    </table>
                                                                </div>

                                                                {/* Pagination controls */}
                                                                {gamification.recentActivity.length > activitiesPerPage && (
                                                                    <div className="pagination-container mt-3">
                                                                        <nav aria-label="Activity pagination">
                                                                            <ul className="pagination pagination-sm justify-content-center">
                                                                                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                                                                    <button
                                                                                        className="page-link"
                                                                                        onClick={() => handlePageChange(currentPage - 1)}
                                                                                        disabled={currentPage === 1}
                                                                                    >
                                                                                        {t('coOwnerProfile.pagination.previous')}
                                                                                    </button>
                                                                                </li>

                                                                                {[...Array(Math.ceil(gamification.recentActivity.length / activitiesPerPage))].map((_, i) => (
                                                                                    <li key={i} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                                                                                        <button
                                                                                            className="page-link"
                                                                                            onClick={() => handlePageChange(i + 1)}
                                                                                        >
                                                                                            {i + 1}
                                                                                        </button>
                                                                                    </li>
                                                                                ))}

                                                                                <li className={`page-item ${currentPage === Math.ceil(gamification.recentActivity.length / activitiesPerPage) ? 'disabled' : ''}`}>
                                                                                    <button
                                                                                        className="page-link"
                                                                                        onClick={() => handlePageChange(currentPage + 1)}
                                                                                        disabled={currentPage === Math.ceil(gamification.recentActivity.length / activitiesPerPage)}
                                                                                    >
                                                                                        {t('coOwnerProfile.pagination.next')}
                                                                                    </button>
                                                                                </li>
                                                                            </ul>
                                                                        </nav>
                                                                    </div>
                                                                )}

                                                                <div className="text-center mt-2 text-muted small">
                                                                    {t('coOwnerProfile.pagination.showing', {
                                                                        count: Math.min(activitiesPerPage, gamification.recentActivity.slice((currentPage - 1) * activitiesPerPage, currentPage * activitiesPerPage).length),
                                                                        total: gamification.recentActivity.length
                                                                    })}
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="text-center p-3 text-muted">
                                                                <p>{t('coOwnerProfile.gamification.noActivity')}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </CardBody>
                                            </Card>

                                            <Card>
                                                <CardBody>
                                                    <h5 className="card-title">{t('coOwnerProfile.gamification.badgesEarned')}</h5>

                                                    {gamification && gamification.badges && gamification.badges.length > 0 ? (
                                                        <div className="badges-container">
                                                            {gamification.badges.map((badge, index) => (
                                                                <div className="badge-item" key={badge.id || index}>
                                                                    <div className="badge-item-content">
                                                                        <div className={`badge-icon-container ${getBadgeColorClass(badge.name || badge.category)}`}>
                                                                            {getBadgeIcon(badge)}
                                                                        </div>
                                                                        <div className="badge-details">
                                                                            <h6 className="badge-title">{badge.name}</h6>
                                                                            <p className="badge-subtitle">{badge.description}</p>
                                                                            <div className="badge-date">
                                                                                {t('coOwnerProfile.gamification.earnedOn', { date: formatDate(badge.earnedAt) })}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center p-4 text-muted">
                                                            <FaAward className="fs-1" />
                                                            <p className="mt-3">{t('coOwnerProfile.gamification.noBadges')}</p>
                                                        </div>
                                                    )}
                                                </CardBody>
                                            </Card>
                                        </>
                                    ) : (
                                        <div className="text-center p-5 text-muted">
                                            <FaTrophy className="fs-1" />
                                            <p className="mt-3">{t('coOwnerProfile.gamification.noData')}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Invoices Tab */}
                            {activeTab === 'invoices' && (
                                <div className="invoices-tab">
                                    <Card>
                                        <CardBody>
                                            <h5 className="card-title mb-3">{t('coOwnerProfile.invoices.history')}</h5>

                                            {invoices && invoices.length > 0 ? (
                                                <div className="table-responsive">
                                                    <table className="table invoice-table">
                                                        <thead>
                                                            <tr>
                                                                <th>{t('coOwnerProfile.invoices.number')}</th>
                                                                <th>{t('coOwnerProfile.invoices.date')}</th>
                                                                <th>{t('coOwnerProfile.invoices.dueDate')}</th>
                                                                <th>{t('coOwnerProfile.invoices.amount')}</th>
                                                                <th>{t('coOwnerProfile.invoices.status')}</th>
                                                                <th>{t('coOwnerProfile.invoices.paymentDate')}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {invoices.map((invoice, index) => (
                                                                <tr key={invoice._id || index}>
                                                                    <td>{invoice.invoiceNumber}</td>
                                                                    <td>{formatDate(invoice.date)}</td>
                                                                    <td>{formatDate(invoice.dueDate)}</td>
                                                                    <td>
                                                                        {invoice.currencyCode || '€'} {invoice.total}
                                                                    </td>
                                                                    <td>
                                                                        <Badge
                                                                            color={
                                                                                invoice.status === 'paid' ? 'success' :
                                                                                    invoice.status === 'overdue' ? 'danger' : 'warning'
                                                                            }
                                                                            pill
                                                                        >
                                                                            {t(`coOwnerProfile.invoices.statuses.${invoice.status}`)}
                                                                        </Badge>
                                                                    </td>
                                                                    <td>{invoice.paymentDate ? formatDate(invoice.paymentDate) : '-'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="text-center p-4 text-muted">
                                                    <i className="ri-file-list-3-line fs-3"></i>
                                                    <p className="mt-3">{t('coOwnerProfile.invoices.noInvoices')}</p>
                                                </div>
                                            )}
                                        </CardBody>
                                    </Card>
                                </div>
                            )}
                        </div>
                    </>
                ) : null}
            </ModalBody>

            {/* CSS styles */}
            <style jsx>{`
        .user-profile-modal .modal-header {
          border-bottom: none;
        }
        
        .profile-header {
          padding: 20px;
          background: linear-gradient(135deg, #f5f7fa 0%, #e4e7f0 100%);
          border-radius: 12px;
          margin-bottom: 24px;
        }
        
        .profile-header-content {
          display: flex;
          align-items: center;
        }
        
        .profile-avatar {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          overflow: hidden;
          margin-right: 20px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
          border: 4px solid #fff;
          background-color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .profile-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .profile-initials {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          font-weight: 700;
          background-color: #4361ee;
          color: white;
        }
        
        .profile-info {
          flex: 1;
        }
        
        .profile-name {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 5px;
          color: #333;
        }
        
        .profile-role {
          font-size: 1rem;
          color: #666;
          margin-bottom: 10px;
        }
        
        .profile-status {
          display: flex;
          align-items: center;
        }
        
        .payment-progress {
          padding: 10px 20px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .profile-tabs .nav-link {
          border: none;
          border-radius: 0;
          color: #666;
          padding: 10px 16px;
          font-weight: 500;
          position: relative;
          transition: all 0.2s;
          background: none;
        }
        
        .profile-tabs .nav-link.active {
          color: #4361ee;
          background: none;
          font-weight: 600;
        }
        
        .profile-tabs .nav-link.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background-color: #4361ee;
        }
        
        .profile-tabs .nav-link:hover:not(.active) {
          background-color: #f8f9fa;
        }
        
        .profile-info-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .info-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .info-label {
          color: #666;
          display: flex;
          align-items: center;
          font-weight: 500;
        }
        
        .info-value {
          font-weight: 600;
          color: #333;
        }
        
        .apartments-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 16px;
        }
        
        .apartment-card {
          border: 1px solid #eaeaea;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .apartment-card-header {
          background-color: #f8f9fa;
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #eaeaea;
        }
        
        .apartment-number {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #333;
        }
        
        .apartment-card-body {
          padding: 16px;
        }
        
        .apartment-detail {
          margin-bottom: 8px;
          display: flex;
          justify-content: space-between;
        }
        
        .detail-label {
          color: #666;
          font-weight: 500;
        }
        
        .detail-value {
          font-weight: 600;
          color: #333;
        }
        
        /* Gamification styles */
        .gamification-stats-card {
          text-align: center;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .stats-icon {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 15px;
          font-size: 24px;
          color: white;
        }
        
        .stats-icon.total-points {
          background: linear-gradient(135deg, #4361ee, #3a0ca3);
        }
        
        .stats-icon.monthly-points {
          background: linear-gradient(135deg, #f72585, #b5179e);
        }
        
        .stats-icon.badges {
          background: linear-gradient(135deg, #ffbe0b, #fb5607);
        }
        
        .stats-value {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 5px;
          color: #333;
        }
        
        .stats-label {
          color: #666;
          font-weight: 500;
        }
        
        .streak-card {
          display: flex;
          align-items: center;
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .streak-icon {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 15px;
          font-size: 18px;
          color: white;
        }
        
        .streak-icon.payment-streak {
          background-color: #2cb978;
        }
        
        .streak-icon.meeting-streak {
          background-color: #4361ee;
        }
        
        .streak-icon.voting-streak {
          background-color: #fb5607;
        }
        
        .streak-count {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
          color: #333;
        }
        
        .streak-label {
          color: #666;
          margin: 0;
          font-size: 0.9rem;
        }
        
        .activity-timeline {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .activity-item {
          display: flex;
          align-items: center;
        }
        
        .activity-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 15px;
          font-size: 16px;
          color: white;
        }
        
        .activity-icon.payment {
          background-color: #2cb978;
        }
        
        .activity-icon.meeting {
          background-color: #4361ee;
        }
        
        .activity-icon.voting {
          background-color: #fb5607;
        }
        
        .activity-title {
          margin: 0 0 3px;
          font-weight: 600;
        }
        
        .activity-date {
          margin: 0;
          color: #666;
          font-size: 0.85rem;
        }

        .badges-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }

        .badge-item {
          background-color: #fff;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          border: 1px solid #eaeaea;
          overflow: hidden;
        }

        .badge-item-content {
          display: flex;
          align-items: center;
          padding: 20px;
        }

        .badge-icon-container {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 16px;
          font-size: 20px;
          color: white;
          flex-shrink: 0;
        }

        .invoice-table th {
          font-weight: 600;
          color: #333;
          background-color: #f8f9fa;
        }
        
        /* Delegates Section Styles */
        .delegates-grid {
          display: grid;
          gap: 1rem;
        }
        
        .delegate-card {
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 1rem;
          background: #fff;
          transition: all 0.2s ease;
        }
        
        .delegate-card:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          border-color: #007bff;
        }
        
        .delegate-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        
        .delegate-avatar {
          width: 40px;
          height: 40px;
          flex-shrink: 0;
        }
        
        .delegate-img {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }
        
        .delegate-initials {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #007bff, #6610f2);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.9rem;
        }
        
        .delegate-name {
          color: #333;
          font-size: 1rem;
        }
        
        .delegate-email {
          font-size: 0.85rem;
        }
        
        .delegate-details {
          display: grid;
          gap: 0.5rem;
        }
        
        .delegate-detail {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.25rem 0;
          border-bottom: 1px solid #f1f3f4;
        }
        
        .delegate-detail:last-child {
          border-bottom: none;
        }
        
        .detail-label {
          font-weight: 500;
          color: #666;
          font-size: 0.875rem;
        }
        
        .detail-value {
          color: #333;
          font-weight: 500;
          font-size: 0.875rem;
        }badge-green {
          background-color: #1da667;
        }

        .badge-blue {
          background-color: #3f51b5;
        }

        .badge-orange {
          background-color: #ff6d00;
        }

        .badge-details {
          flex: 1;
        }

        .badge-title {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0 0 5px;
          color: #333;
        }

        .badge-subtitle {
          font-size: 0.9rem;
          color: #555;
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .badge-date {
          font-size: 0.8rem;
          color: #777;
        }
        
        .badges-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 16px;
        }
        
        .badge-card {
          display: flex;
          border: 1px solid #eaeaea;
          border-radius: 8px;
          padding: 15px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .badge-icon {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 15px;
          font-size: 20px;
          color: white;
          flex-shrink: 0;
        }
        
        .badge-icon.payment-badge {
          background: linear-gradient(135deg, #2cb978, #155e3f);
        }
        
        .badge-icon.meeting-badge {
          background: linear-gradient(135deg, #4361ee, #3a0ca3);
        }
        
        .badge-icon.voting-badge {
          background: linear-gradient(135deg, #fb5607, #ff8c38);
        }
        
        .badge-icon.general-badge {
          background: linear-gradient(135deg, #7209b7, #560bad);
        }
        
        .badge-name {
          font-size: 1rem;
          font-weight: 600;
          margin: 0 0 3px;
          color: #333;
        }
        
        .badge-description {
          font-size: 0.85rem;
          color: #666;
          margin-bottom: 5px;
        }
        
        .badge-earned {
          font-size: 0.75rem;
          color: #999;
        }
        
        .invoice-table th {
          font-weight: 600;
          color: #333;
          background-color: #f8f9fa;
        }
      `}</style>
        </Modal>
    );
};

export default withTranslation()(UserProfileModal);