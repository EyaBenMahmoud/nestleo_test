import React, { useState, useEffect } from 'react';
import {
    Container, Row, Col, Card, CardBody, CardHeader, Nav,
    NavItem, NavLink, TabContent, TabPane, Button, Badge,
    Spinner, Alert, Modal, ModalHeader, ModalBody,
    Progress, FormGroup, Input,
    ModalFooter
} from 'reactstrap';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import MetaTags from 'react-meta-tags';
import api from '../../services/api';
import BreadCrumb from '../Common/BreadCrumb';
import './poll.css';
import PollCreatorsingle from './singlepollCreatorPage';
import PollStatsChart from './PollStats';
import { exportPollReport } from '../../services/reportService';
import { fetchEvents } from '../../slices/Event/eventSlice';

const StandalonePollPage = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const user = useSelector(state => state.Loginn.user);
    const currentBuilding = useSelector(state => state.Building.currentBuilding);
    const events = useSelector(state => state.events?.events || []);

    // Determine if user is SyndicateCoowner
    const isSyndicateCoowner = user.role === 'SyndicateCoowner';
    
    // If SyndicateCoowner, always start with archived tab
    const [activeTab, setActiveTab] = useState(isSyndicateCoowner ? '3' : '1');
    const [stats, setStats] = useState(null);
    const [standalonePolls, setStandalonePolls] = useState([]);
    const [archivedPolls, setArchivedPolls] = useState([]);
    const [filteredArchivedPolls, setFilteredArchivedPolls] = useState([]);
    const [filterEvent, setFilterEvent] = useState('');
    const [loading, setLoading] = useState(true);
    const [archiveLoading, setArchiveLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    const [createPollModal, setCreatePollModal] = useState(false);
    const [selectedPoll, setSelectedPoll] = useState(null);
    const [viewDetailsModal, setViewDetailsModal] = useState(false);
    const [statsModalOpen, setStatsModalOpen] = useState(false);
    const [currentStatsPoll, setCurrentStatsPoll] = useState(null);

    // Fetch events for filter dropdown
    useEffect(() => {
        if (currentBuilding?._id) {
            dispatch(fetchEvents(currentBuilding._id));
        }
    }, [dispatch, currentBuilding?._id]);

    // Fetch poll stats
    useEffect(() => {
        const fetchPollStats = async () => {
            if (!currentBuilding?._id) return;

            try {
                const response = await api.get(`/api/polls/building/${currentBuilding._id}/stats`);
                setStats(response.data);
            } catch (error) {
                console.error('Error fetching poll stats:', error);
                toast.error(t('poll.errors.fetchStats'));
            }
        };

        fetchPollStats();
    }, [currentBuilding?._id, t, refreshKey]);

    // Fetch standalone polls (only if user is admin)
    useEffect(() => {
        const fetchStandalonePolls = async () => {
            if (!currentBuilding?._id || isSyndicateCoowner) return;

            setLoading(true);
            try {
                const response = await api.get(`/api/polls/building/${currentBuilding._id}/standalone`);
                setStandalonePolls(response.data);
            } catch (error) {
                console.error('Error fetching standalone polls:', error);
                toast.error(t('poll.errors.fetchPolls'));
            } finally {
                setLoading(false);
            }
        };

        if (activeTab === '1' && !isSyndicateCoowner) {
            fetchStandalonePolls();
        }
    }, [currentBuilding?._id, t, refreshKey, activeTab, isSyndicateCoowner]);

    // Fetch archived polls (for both roles)
    useEffect(() => {
        const fetchArchivedPolls = async () => {
            if (!currentBuilding?._id) return;

            setArchiveLoading(true);
            try {
                const response = await api.get(`/api/polls/building/${currentBuilding._id}/archived`);
                setArchivedPolls(response.data);
                setFilteredArchivedPolls(response.data);
            } catch (error) {
                console.error('Error fetching archived polls:', error);
                toast.error(t('poll.errors.fetchArchived'));
            } finally {
                setArchiveLoading(false);
            }
        };

        // Always fetch archived polls for coowners, otherwise only on active tab
        if (isSyndicateCoowner || activeTab === '3') {
            fetchArchivedPolls();
        }
    }, [currentBuilding?._id, t, activeTab, refreshKey, isSyndicateCoowner]);

    // Filter archived polls when filter changes
    useEffect(() => {
        if (!filterEvent) {
            setFilteredArchivedPolls(archivedPolls);
        } else if (filterEvent === 'standalone') {
            setFilteredArchivedPolls(archivedPolls.filter(poll => poll.isStandalone));
        } else {
            setFilteredArchivedPolls(archivedPolls.filter(poll =>
                poll.event && poll.event._id === filterEvent
            ));
        }
    }, [filterEvent, archivedPolls]);

    const handlePollCreated = () => {
        setRefreshKey(prev => prev + 1);
        setCreatePollModal(false);
    };

    const toggleCreatePollModal = () => {
        setCreatePollModal(!createPollModal);
    };

    const toggleViewDetailsModal = (poll = null) => {
        setSelectedPoll(poll);
        setViewDetailsModal(!viewDetailsModal);
    };

    const toggleStatsModal = (poll = null) => {
        if (poll) {
            setCurrentStatsPoll(poll);
        }
        setStatsModalOpen(!statsModalOpen);
    };

    const handleFilterChange = (e) => {
        setFilterEvent(e.target.value);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    return (
        <React.Fragment>
            <div className="page-content">
                <MetaTags>
                    <title>{isSyndicateCoowner ? t('polls.archivedPageTitle') : t('polls.pageTitle')} | Nestleo</title>
                </MetaTags>

                <Container fluid>
                    <BreadCrumb 
                        title={isSyndicateCoowner ? t('polls.archivedPageTitle') : t('polls.pageTitle')} 
                        pageTitle={isSyndicateCoowner ? t('polls.archivedManagement') : t('polls.management')} 
                    />

                    {!currentBuilding?._id ? (
                        <Alert color="info">
                            <i className="ri-information-line me-2"></i>
                            {t('common.selectBuildingFirst')}
                        </Alert>
                    ) : (
                        <>
                            {/* Welcome Card */}
                            <Card className="welcome-card overflow-hidden mb-4">
                                <div className="position-absolute end-0 start-0 top-0 z-0"
                                    style={{
                                        height: '100%',
                                        background: 'linear-gradient(to right, #e0f7fa, #cbe9f3, #c1e8f0)'
                                    }}>
                                    <div className="position-absolute end-0 top-0 z-0">
                                        <svg width="250" height="250" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="opacity-25">
                                            <path fill="#4B79CF" d="M44.3,-76.4C58.6,-69.7,72.2,-59.3,79.6,-45.3C87,-31.2,88.3,-13.5,85.2,2.7C82.1,19,74.7,33.8,64.7,45.9C54.8,58,42.3,67.4,28.4,72.7C14.5,78,0.1,79.2,-15,77.4C-30.1,75.7,-46,71.1,-59.6,61.6C-73.2,52.2,-84.6,38,-86.2,23C-87.8,8.1,-79.6,-7.6,-74.1,-24.6C-68.5,-41.6,-65.5,-59.8,-54.8,-69.7C-44.1,-79.7,-25.6,-81.4,-7.7,-79.5C10.2,-77.6,30,-83,44.3,-76.4Z" transform="translate(100 100)" />
                                        </svg>
                                    </div>
                                </div>
                                <CardBody className="p-4 position-relative">
                                    <Row className="align-items-center">
                                        <Col md={7}>
                                            <div className="text-start">
                                                <h4 className="fw-semibold">
                                                    {isSyndicateCoowner 
                                                        ? t('polls.welcome.archivedTitle') 
                                                        : t('polls.welcome.title')
                                                    }
                                                </h4>
                                                <p className="text-muted mb-4">
                                                    {isSyndicateCoowner 
                                                        ? t('polls.welcome.archivedSubtitle') 
                                                        : t('polls.welcome.subtitle')
                                                    }
                                                </p>

                                                <Row>
                                                    <Col sm={4}>
                                                        <div className="d-flex align-items-center mb-3">
                                                            <div className="flex-shrink-0 me-3">
                                                                <div className="avatar-sm">
                                                                    <div className="avatar-title bg-soft-primary text-primary rounded-circle fs-5">
                                                                        <i className="ri-questionnaire-line"></i>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex-grow-1">
                                                                <h5 className="mb-0">{stats?.total || 0}</h5>
                                                                <p className="text-muted mb-0">{t('polls.welcome.totalPolls')}</p>
                                                            </div>
                                                        </div>
                                                    </Col>
                                                    <Col sm={4}>
                                                        <div className="d-flex align-items-center mb-3">
                                                            <div className="flex-shrink-0 me-3">
                                                                <div className="avatar-sm">
                                                                    <div className="avatar-title bg-soft-success text-success rounded-circle fs-5">
                                                                        <i className="ri-bar-chart-horizontal-line"></i>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex-grow-1">
                                                                <h5 className="mb-0">{stats?.participation || 0}%</h5>
                                                                <p className="text-muted mb-0">{t('polls.welcome.participation')}</p>
                                                            </div>
                                                        </div>
                                                    </Col>
                                                    <Col sm={4}>
                                                        <div className="d-flex align-items-center mb-3">
                                                            <div className="flex-shrink-0 me-3">
                                                                <div className="avatar-sm">
                                                                    <div className="avatar-title bg-soft-info text-info rounded-circle fs-5">
                                                                        <i className="ri-archive-line"></i>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex-grow-1">
                                                                <h5 className="mb-0">{stats?.completed || 0}</h5>
                                                                <p className="text-muted mb-0">{t('polls.welcome.completed')}</p>
                                                            </div>
                                                        </div>
                                                    </Col>
                                                </Row>
                                            </div>
                                        </Col>
                                        <Col md={5}>
                                            <div className="text-center text-md-end">
                                                <div className="vote-icon-container position-relative z-1 mt-4 mt-md-0">
                                                    <i className="ri-bar-chart-grouped-line" style={{ fontSize: '70px', color: '#3577f1', opacity: 0.7 }}></i>
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>
                                </CardBody>
                            </Card>

                            {/* Main Content */}
                            <Card>
                                <CardHeader className="border-0">
                                    <div className="d-flex align-items-center">
                                        <div className="flex-grow-1">
                                            <h5 className="card-title mb-0">
                                                {isSyndicateCoowner 
                                                    ? t('polls.archivedPollsTitle') 
                                                    : t('polls.title')
                                                }
                                            </h5>
                                        </div>
                                        {user.role === 'SyndicateAdmin' && (
                                            <Button color="primary" onClick={toggleCreatePollModal}>
                                                <i className="ri-add-line align-bottom me-1"></i> {t('polls.buttons.createPoll')}
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>

                                <CardBody>
                                    {/* Tabs - Only show tabs for admin */}
                                    {!isSyndicateCoowner ? (
                                        <>
                                            <Nav tabs className="nav-tabs-custom">
                                                <NavItem>
                                                    <NavLink
                                                        className={activeTab === '1' ? 'active' : ''}
                                                        onClick={() => setActiveTab('1')}
                                                    >
                                                        <i className="ri-stack-line me-1 align-bottom"></i> {t('polls.tabs.standalone')}
                                                    </NavLink>
                                                </NavItem>
                                                <NavItem>
                                                    <NavLink
                                                        className={activeTab === '3' ? 'active' : ''}
                                                        onClick={() => setActiveTab('3')}
                                                    >
                                                        <i className="ri-archive-line me-1 align-bottom"></i> {t('polls.tabs.archived')}
                                                    </NavLink>
                                                </NavItem>
                                            </Nav>
                                            
                                            <TabContent activeTab={activeTab} className="pt-4">
                                                {/* Standalone Polls Tab */}
                                                <TabPane tabId="1">
                                                    {user.role === 'SyndicateAdmin' ? (
                                                        loading ? (
                                                            <div className="text-center">
                                                                <Spinner color="primary" />
                                                                <p className="mt-2">{t('polls.loading')}</p>
                                                            </div>
                                                        ) : standalonePolls.length > 0 ? (
                                                            <Row>
                                                                {standalonePolls.map((poll) => (
                                                                    <Col lg={4} md={6} key={poll._id} className="mb-4">
                                                                        <Card className="h-100">
                                                                            <CardBody>
                                                                                <div className="d-flex align-items-center mb-3">
                                                                                    <div className="flex-shrink-0">
                                                                                        <div className="avatar-sm">
                                                                                            <span className="avatar-title bg-soft-primary text-primary rounded fs-4">
                                                                                                <i className="ri-questionnaire-line"></i>
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex-grow-1 ms-3">
                                                                                        <h5 className="mb-1">{poll.title}</h5>
                                                                                        <p className="text-muted mb-0">
                                                                                            {formatDate(poll.createdAt)}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                                <p className="text-muted mb-3">
                                                                                    {poll.description || t('polls.noDescription')}
                                                                                </p>
                                                                                <div className="d-flex">
                                                                                    <div className="flex-grow-1">
                                                                                        <Badge color="info" className="me-2">
                                                                                            {poll.questions?.length || 0} {t('polls.questions')}
                                                                                        </Badge>
                                                                                        <Badge color="light" className="text-muted">
                                                                                            {t('polls.standalone')}
                                                                                        </Badge>
                                                                                    </div>
                                                                                    <Button
                                                                                        color="primary"
                                                                                        size="sm"
                                                                                        outline
                                                                                        onClick={() => toggleViewDetailsModal(poll)}
                                                                                    >
                                                                                        {t('polls.viewDetails')}
                                                                                    </Button>
                                                                                </div>
                                                                            </CardBody>
                                                                        </Card>
                                                                    </Col>
                                                                ))}
                                                            </Row>
                                                        ) : (
                                                            <div className="text-center py-5">
                                                                <div className="avatar-lg mx-auto mb-4">
                                                                    <div className="avatar-title bg-light text-primary rounded-circle fs-1">
                                                                        <i className="ri-questionnaire-line"></i>
                                                                    </div>
                                                                </div>
                                                                <h5>{t('polls.noStandalonePolls')}</h5>
                                                                <p className="text-muted">{t('polls.createPollsFirst')}</p>
                                                                <Button color="primary" onClick={toggleCreatePollModal}>
                                                                    <i className="ri-add-line align-bottom me-1"></i> {t('polls.buttons.createPoll')}
                                                                </Button>
                                                            </div>
                                                        )
                                                    ) : (
                                                        <Alert color="info">
                                                            <i className="ri-information-line me-2"></i>
                                                            {t('polls.adminPermissionRequired')}
                                                        </Alert>
                                                    )}
                                                </TabPane>

                                                {/* Archived Polls Tab - Inside the tab system for admin */}
                                                <TabPane tabId="3">
                                                    <ArchivedPollsSection 
                                                        archiveLoading={archiveLoading}
                                                        filteredArchivedPolls={filteredArchivedPolls}
                                                        filterEvent={filterEvent}
                                                        handleFilterChange={handleFilterChange}
                                                        events={events}
                                                        formatDate={formatDate}
                                                        toggleStatsModal={toggleStatsModal}
                                                        exportPollReport={exportPollReport}
                                                        t={t}
                                                    />
                                                </TabPane>
                                            </TabContent>
                                        </>
                                    ) : (
                                        // For SyndicateCoowner: Show archived polls directly without tabs
                                        <ArchivedPollsSection 
                                            archiveLoading={archiveLoading}
                                            filteredArchivedPolls={filteredArchivedPolls}
                                            filterEvent={filterEvent}
                                            handleFilterChange={handleFilterChange}
                                            events={events}
                                            formatDate={formatDate}
                                            toggleStatsModal={toggleStatsModal}
                                            exportPollReport={exportPollReport}
                                            t={t}
                                        />
                                    )}
                                </CardBody>
                            </Card>
                        </>
                    )}
                </Container>
            </div>

            {/* Create Poll Modal - only for admin */}
            {!isSyndicateCoowner && (
                <Modal isOpen={createPollModal} toggle={toggleCreatePollModal} size="lg">
                    <ModalHeader toggle={toggleCreatePollModal}>
                        {t('polls.createNewPoll')}
                    </ModalHeader>
                    <ModalBody>
                        <PollCreatorsingle
                            eventId="standalone"
                            showStart={false}
                            onPollCreated={handlePollCreated}
                            isStandalone={true}
                            buildingId={currentBuilding?._id}
                        />
                    </ModalBody>
                </Modal>
            )}

            {/* View Details Modal */}
            {selectedPoll && (
                <Modal isOpen={viewDetailsModal} toggle={toggleViewDetailsModal} size="lg">
                    <ModalHeader toggle={toggleViewDetailsModal}>
                        {selectedPoll.title}
                    </ModalHeader>
                    <ModalBody>
                        <h6>{t('polls.details.description')}:</h6>
                        <p className="text-muted">{selectedPoll.description || t('polls.noDescription')}</p>

                        <h6 className="mt-4">{t('polls.details.questions')}:</h6>
                        {selectedPoll.questions?.map((question, index) => (
                            <Card key={index} className="mb-3">
                                <CardBody>
                                    <h6 className="mb-2">
                                        {index + 1}. {question.title}
                                    </h6>
                                    {question.description && (
                                        <p className="text-muted small">{question.description}</p>
                                    )}
                                    <ul className="list-group">
                                        {question.options?.map((option, optIndex) => (
                                            <li key={optIndex} className="list-group-item d-flex justify-content-between align-items-center">
                                                {option.text}
                                                {selectedPoll.status === 'completed' && (
                                                    <Badge color="primary" pill>
                                                        {option.votes} {t('polls.votes')}
                                                    </Badge>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </CardBody>
                            </Card>
                        ))}

                        <div className="d-flex justify-content-between mt-4">
                            <div>
                                <p className="mb-1">
                                    <strong>{t('polls.details.created')}:</strong> {formatDate(selectedPoll.createdAt)}
                                </p>
                                {selectedPoll.endedAt && (
                                    <p className="mb-1">
                                        <strong>{t('polls.details.completed')}:</strong> {formatDate(selectedPoll.endedAt)}
                                    </p>
                                )}
                            </div>
                            <div>
                                <p className="mb-1">
                                    <strong>{t('polls.details.status')}:</strong> {selectedPoll.status === 'completed' ? t('polls.status.completed') : t('polls.status.pending')}
                                </p>
                                <p className="mb-0">
                                    <strong>{t('polls.details.type')}:</strong> {selectedPoll.isStandalone ? t('polls.standalone') : t('polls.eventAttached')}
                                </p>
                            </div>
                        </div>
                    </ModalBody>
                </Modal>
            )}

            {/* Statistics Modal */}
            <Modal isOpen={statsModalOpen} toggle={() => toggleStatsModal()} size="xl">
                <ModalBody>
                    {currentStatsPoll && (
                        <PollStatsChart poll={currentStatsPoll} detailed={true} />
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => toggleStatsModal()}>
                        {t('poll.close')}
                    </Button>
                    {currentStatsPoll && (
                        <Button color="primary" onClick={() => exportPollReport(currentStatsPoll._id)}>
                            <i className="ri-download-line me-1"></i> {t('poll.exportPDF')}
                        </Button>
                    )}
                </ModalFooter>
            </Modal>
        </React.Fragment>
    );
};

// Extracted the Archived Polls section as a reusable component
const ArchivedPollsSection = ({ 
    archiveLoading, 
    filteredArchivedPolls, 
    filterEvent, 
    handleFilterChange,
    events,
    formatDate, 
    toggleStatsModal, 
    exportPollReport, 
    t 
}) => {
    return (
        <Card className="mb-4">
            <CardHeader>
                <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">{t('poll.archivedPolls')}</h5>
                    <FormGroup className="mb-0" style={{ width: '250px' }}>
                        <Input
                            type="select"
                            value={filterEvent}
                            onChange={handleFilterChange}
                            className="form-select"
                        >
                            <option value="">{t('poll.allEvents')}</option>
                            <option value="standalone">{t('poll.standalonePolls')}</option>
                            {events.map(event => (
                                <option key={event._id} value={event._id}>
                                    {event.title}
                                </option>
                            ))}
                        </Input>
                    </FormGroup>
                </div>
            </CardHeader>
            <CardBody>
                {archiveLoading ? (
                    <div className="text-center py-5">
                        <Spinner color="primary" />
                        <p className="mt-2">{t('poll.loading')}</p>
                    </div>
                ) : filteredArchivedPolls.length > 0 ? (
                    <Row>
                        {filteredArchivedPolls.map(poll => (
                            <Col lg={4} md={6} key={poll._id} className="mb-4">
                                <Card className="h-100 border">
                                    <CardBody>
                                        <div className="d-flex align-items-center mb-3">
                                            <div className="flex-shrink-0">
                                                <div className="avatar-sm">
                                                    <span className="avatar-title bg-soft-info text-info rounded fs-4">
                                                        <i className="ri-archive-line"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex-grow-1 ms-3">
                                                <h5 className="mb-1">{poll.title}</h5>
                                                <span className="badge bg-soft-secondary text-dark me-1">
                                                    {poll.event?.title || t('poll.standalone')}
                                                </span>
                                                <small className="text-muted">{formatDate(poll.endedAt)}</small>
                                            </div>
                                        </div>

                                        <div className="mb-3">
                                            <div className="d-flex justify-content-between mb-1">
                                                <span>{t('poll.table.votes')}: {poll.responses?.length || 0}</span>
                                                <span>{poll.questions?.length || 0} {t('poll.table.questions')}</span>
                                            </div>
                                            <Progress
                                                value={(poll.responses?.length || 0)}
                                                max={50}
                                                color="success"
                                                style={{ height: '6px' }}
                                            />
                                        </div>

                                        {poll.description && (
                                            <p className="text-muted mb-3 small">
                                                {poll.description.length > 80 ? `${poll.description.substring(0, 80)}...` : poll.description}
                                            </p>
                                        )}

                                        <div className="d-flex justify-content-between mt-3">
                                            <Button
                                                color="primary"
                                                size="sm"
                                                onClick={() => toggleStatsModal(poll)}
                                            >
                                                <i className="ri-line-chart-line me-1"></i> {t('poll.viewResults')}
                                            </Button>
                                            <Button
                                                color="light"
                                                size="sm"
                                                onClick={() => exportPollReport(poll._id)}
                                            >
                                                <i className="ri-download-line me-1"></i> {t('poll.export')}
                                            </Button>
                                        </div>
                                    </CardBody>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                ) : (
                    <Alert color="info">
                        <i className="ri-information-line me-2"></i>
                        {filterEvent ? t('poll.noArchivedPollsForEvent') : t('poll.noArchivedPolls')}
                    </Alert>
                )}
            </CardBody>
        </Card>
    );
};

export default StandalonePollPage;