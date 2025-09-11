import React, { useState, useEffect } from 'react';
import { 
  Card, CardHeader, CardBody, Button, Nav, NavItem, NavLink, 
  TabContent, TabPane, Row, Col, Input, FormGroup, Label, 
  Badge, Alert, Progress, Spinner, Modal, ModalHeader, ModalBody, ModalFooter
} from 'reactstrap';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next'; // Import translation hook
import api from '../../services/api';
import PollCreator from './PollManagement';
import PollStatsChart from './PollStats';
import { fetchEvents, clearEvents, clearSuccessMessage } from '../../slices/Event/eventSlice';
import './poll.css';
import { exportPollReport } from '../../services/reportService';

const PollManagementSystem = () => {
  // Initialize translation hook
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState('1');
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [polls, setPolls] = useState([]);
  const [activePolls, setActivePolls] = useState([]);
  const [completedPolls, setCompletedPolls] = useState([]);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [currentStatsPoll, setCurrentStatsPoll] = useState(null);
  const user = useSelector(state => state.Loginn.user);
  
  const dispatch = useDispatch();
  
  const events = useSelector(state => {
    if (state.events && state.events.events && Array.isArray(state.events.events)) {
      return state.events.events;
    }
    return [];
  });
  
  const currentBuilding = useSelector(state => state.Building.currentBuilding);

  useEffect(() => {
    if (currentBuilding?._id) {
      dispatch(fetchEvents(currentBuilding._id))
        .unwrap()
        .catch(err => {
          console.error("Event fetch failed:", err);
          toast.error(t('poll.errors.fetchEvents'));
          dispatch(clearSuccessMessage());
        });
    } else {
      dispatch(clearEvents());
    }
  }, [dispatch, currentBuilding?._id, t]);

  useEffect(() => {
    if (!selectedEventId) return;
    
    const fetchPolls = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/api/polls/events/${selectedEventId}/polls`);
        const allPolls = response.data || [];
        setPolls(allPolls);
        setActivePolls(allPolls.filter(poll => poll.status === 'active'));
        setCompletedPolls(allPolls.filter(poll => 
          poll.status === 'completed' || poll.status === 'ended' || poll.status === 'expired'));
      } catch (error) {
        console.error('Error fetching polls:', error);
        toast.error(t('poll.errors.fetchPolls'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchPolls();
  }, [selectedEventId, t]);

  useEffect(() => {
    // When selecting a poll, fetch the event data to get accurate participant count
    const fetchPollWithEventData = async () => {
      if (currentStatsPoll?._id) {
        try {
          // Get poll data with event information
          const pollResponse = await api.get(`/api/polls/${currentStatsPoll._id}/onepoll`);
          
          // If event ID exists, fetch event data to get attendees count
          if (pollResponse.data?.event) {
            try {
              const eventResponse = await api.get(`/api/events/${pollResponse.data.event}`);
              
              // Update poll with event data
              setCurrentStatsPoll({
                ...pollResponse.data,
                event: eventResponse.data,
                participantCount: eventResponse.data?.attendees?.length || 2 // Default to 2 if no attendees
              });
            } catch (eventError) {
              console.error('Error fetching event data:', eventError);
            }
          } else {
            setCurrentStatsPoll(pollResponse.data);
          }
        } catch (error) {
          console.error('Error fetching poll with event data:', error);
        }
      }
    };
    
    if (statsModalOpen && currentStatsPoll) {
      fetchPollWithEventData();
    }
  }, [statsModalOpen, currentStatsPoll?._id]);

  const handleEventChange = (e) => {
    setSelectedEventId(e.target.value);
    setSelectedPoll(null);
  };

  const handlePollSelect = (poll) => {
    setSelectedPoll(poll);
  };

  const toggleStatsModal = (poll) => {
    setCurrentStatsPoll(poll);
    setStatsModalOpen(!statsModalOpen);
  };

  return (
    <div className="poll-management-container" style={{ marginTop: '80px' }}>
      <Card className="nestly-card mb-4">
        <CardHeader className="nestly-card-header">
          <div className="nestly-card-pattern"></div>
          <div className="d-flex align-items-center justify-content-between position-relative" style={{ zIndex: '1' }}>
            <div className="d-flex align-items-center">
              <div className="nestly-icon-container nestly-icon-container-coral me-3">
                <i className="ri-bar-chart-grouped-line fs-4"></i>
              </div>
              <h4 className="poll-title mb-0">{t('poll.title')}</h4>
            </div>
            <span className="nestly-badge nestly-badge-teal">
              <i className="ri-calendar-event-line me-1"></i>
              {events && events.length ? t('poll.eventsCount', { count: events.length }) : t('poll.noEvents')}
            </span>
          </div>
        </CardHeader>
        
        <CardBody>
          <FormGroup className="mb-4">
            <Label for="eventSelect" className="poll-subtitle mb-2">{t('poll.selectEvent')}</Label>
            <Input
              type="select"
              id="eventSelect"
              value={selectedEventId || ''}
              onChange={handleEventChange}
              className="nestly-input"
            >
              <option value="">{t('poll.selectEventPrompt')}</option>
              {events && events.length > 0 ? (
                events.map(event => (
                  <option key={event._id} value={event._id}>
                    {event.title}
                  </option>
                ))
              ) : (
                <option value="" disabled>{t('poll.noEventsAvailable')}</option>
              )}
            </Input>
          </FormGroup>

          {selectedEventId ? (
            <>
              <Nav tabs className="nestly-tabs justify-content-center">
                {user.role && user.role.trim() === "SyndicateAdmin" && (
                  <NavItem>
                    <NavLink
                      className={`nestly-tab nestly-tab-coral ${activeTab === '1' ? 'active' : ''}`}
                      onClick={() => setActiveTab('1')}
                    >
                      <i className="ri-add-circle-line me-2"></i>
                      {t('poll.tabs.create')}
                    </NavLink>
                  </NavItem>
                )}
                <NavItem>
                  <NavLink
                    className={`nestly-tab nestly-tab-teal ${activeTab === '2' ? 'active' : ''}`}
                    onClick={() => setActiveTab('2')}
                  >
                    <i className="ri-archive-line me-2"></i>
                    {t('poll.tabs.archived')}
                    {completedPolls.length > 0 && (
                      <span className="nestly-badge nestly-badge-teal ms-2" style={{ fontSize: '0.9em' }}>
                        {completedPolls.length}
                      </span>
                    )}
                  </NavLink>
                </NavItem>
              </Nav>

              <TabContent activeTab={activeTab}>
                <TabPane tabId="1">
                  {user.role && user.role.trim() === "SyndicateAdmin" && (
                    <PollCreator eventId={selectedEventId} onPollCreated={async () => {
                      toast.success(t('poll.success.created'));
                      const response = await api.get(`/api/polls/events/${selectedEventId}/polls`);
                      setPolls(response.data);
                      setActivePolls(response.data.filter(poll => poll.status === 'active'));
                      setCompletedPolls(response.data.filter(poll =>
                        poll.status === 'completed' || poll.status === 'ended' || poll.status === 'expired'));
                    }} />
                  )}
                </TabPane>

                <TabPane tabId="2">
                  {loading ? (
                    <div className="text-center py-5">
                      <Spinner color="primary" />
                      <p className="mt-2">{t('poll.loading')}</p>
                    </div>
                  ) : completedPolls.length > 0 ? (
                    <Row>
                      {completedPolls.map(poll => (
                        <Col md={6} lg={4} key={poll._id} className="mb-4">
                          <Card
                            className={`nestly-card h-100 ${selectedPoll?._id === poll._id ? 'border-primary' : ''}`}
                            onClick={() => handlePollSelect(poll)}
                            style={{
                              border: selectedPoll?._id === poll._id ? '2px solid var(--teal)' : 'none',
                              cursor: 'pointer'
                            }}
                          >
                            <CardBody className="d-flex flex-column">
                              <div className="d-flex align-items-center mb-3">
                                <div className="nestly-icon-container nestly-icon-container-teal">
                                  <i className="ri-pie-chart-line"></i>
                                </div>
                                <h5 className="poll-subtitle mb-0 flex-grow-1">{poll.title}</h5>
                              </div>
                              
                              <div className="mb-3">
                                <div className="d-flex align-items-center mb-2">
                                  <i className="ri-question-line text-muted me-2"></i>
                                  <span className="text-muted">
                                    {t('poll.questionCount', {
                                      count: poll.questions ? poll.questions.length : 1
                                    })}
                                  </span>
                                </div>
                                <div className="d-flex align-items-center">
                                  <i className="ri-user-line text-muted me-2"></i>
                                  <span className="text-muted">
                                    {t('poll.responseCount', {
                                      count: poll.responses ? poll.responses.length : 0
                                    })}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="mt-auto d-flex">
                                <Button
                                  className=" me-2 flex-grow-1"
                                  color='primary'
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleStatsModal(poll);
                                  }}
                                >
                                  <i className="ri-line-chart-line me-1"></i> {t('poll.buttons.stats')}
                                </Button>
                                <Button
                                  className="flex-grow-1"
                                  color="danger"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    exportPollReport(poll._id);
                                  }}
                                >
                                  <i className="ri-download-line me-1"></i> {t('poll.buttons.export')}
                                </Button>
                              </div>
                            </CardBody>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  ) : (
                    <div className="text-center py-5">
                      <div className="nestly-icon-container nestly-icon-container-coral mx-auto mb-3">
                        <i className="ri-archive-line fs-3"></i>
                      </div>
                      <h5 className="poll-subtitle">{t('poll.empty.title')}</h5>
                      <p className="text-muted">{t('poll.empty.description')}</p>
                    </div>
                  )}
                </TabPane>
              </TabContent>
            </>
          ) : (
            <div className="text-center py-5">
              <div className="nestly-icon-container nestly-icon-container-teal mx-auto mb-3">
                <i className="ri-calendar-line fs-3"></i>
              </div>
              <h5 className="poll-subtitle">{t('poll.selectToManage')}</h5>
              <p className="text-muted">{t('poll.chooseFromDropdown')}</p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Statistics Modal - Updated to match PollResults.js styling */}
      <Modal isOpen={statsModalOpen} toggle={() => toggleStatsModal(null)} size="xl" centered className="nestly-event-modal">
        <ModalHeader toggle={() => toggleStatsModal(null)}>
          <div className="nestly-card-pattern"></div>
          <div className="d-flex align-items-center position-relative" style={{ zIndex: '1' }}>
            <div className="nestly-icon-container nestly-icon-container-teal me-2">
              <i className="ri-line-chart-line"></i>
            </div>
            <h5 className="poll-title mb-0">{t('poll.statistics.title')}</h5>
          </div>
        </ModalHeader>
        <ModalBody className="p-4">
          {currentStatsPoll && (
            <PollStatsChart poll={currentStatsPoll} detailed={true} />
          )}
        </ModalBody>
        <ModalFooter className="border-top-0">
          <Button color='danger' onClick={() => toggleStatsModal(null)}>
            <i className="ri-close-line me-1"></i> {t('poll.buttons.close')}
          </Button>
          {currentStatsPoll && (
            <Button color='secondary' onClick={() => exportPollReport(currentStatsPoll._id)}>
              <i className="ri-file-pdf-line me-1"></i> {t('poll.buttons.exportPDF')}
            </Button>
          )}
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default PollManagementSystem;