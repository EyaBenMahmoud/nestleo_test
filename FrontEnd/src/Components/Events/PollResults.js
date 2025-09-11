import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Card, CardBody, CardHeader, Row, Col } from 'reactstrap';
import { useTranslation } from 'react-i18next';
import PollStatsChart from './PollStats';
import { exportPollReport } from '../../services/reportService';
import api from '../../services/api';

const PollResultsModal = ({ isOpen, toggle, completedPolls, selectedPoll, setSelectedPoll }) => {
  const { t } = useTranslation();
  const [enrichedPoll, setEnrichedPoll] = useState(null);
  
  // Fetch additional poll data when a poll is selected to ensure accurate participation rates
  useEffect(() => {
    const fetchPollWithEventData = async () => {
      if (selectedPoll && selectedPoll._id) {
        try {
          // Get the complete poll data with responses
          const response = await api.get(`/api/polls/${selectedPoll._id}/onepoll`);
          
          // If event ID exists, try to fetch event data to get attendees count
          if (response.data?.event) {
            try {
              const eventResponse = await api.get(`/api/events/${response.data.event}`);
              
              // Calculate unique respondents
              const uniqueRespondents = new Set();
              if (response.data.responses && Array.isArray(response.data.responses)) {
                response.data.responses.forEach(response => {
                  // Handle both object and string user IDs
                  const userId = typeof response.user === 'object' ? response.user._id : response.user;
                  if (userId) {
                    uniqueRespondents.add(userId);
                  }
                });
              }
              
              // Set enhanced poll data with event and unique respondent info
              setEnrichedPoll({
                ...response.data,
                event: eventResponse.data,
                participantCount: eventResponse.data?.attendees?.length || 2,
                uniqueRespondentsCount: uniqueRespondents.size
              });
            } catch (eventError) {
              console.error('Error fetching event data:', eventError);
              // Still use the poll data even if event fetch fails
              setEnrichedPoll(response.data);
            }
          } else {
            setEnrichedPoll(response.data);
          }
        } catch (error) {
          console.error('Error fetching poll details:', error);
          // Fallback to the original poll data
          setEnrichedPoll(selectedPoll);
        }
      } else {
        setEnrichedPoll(null);
      }
    };
    
    if (selectedPoll) {
      fetchPollWithEventData();
    } else {
      setEnrichedPoll(null);
    }
  }, [selectedPoll]);

  // Use the poll with enhanced data or fall back to the original selected poll
  const displayPoll = enrichedPoll || selectedPoll;

  return (
    <Modal
      isOpen={isOpen}
      toggle={toggle}
      centered
      size="xl"
    >
      <ModalHeader toggle={toggle}>
        <div className="nestly-card-pattern"></div>
        <div className="d-flex align-items-center position-relative" style={{ zIndex: '1' }}>
          <div className="nestly-icon-container nestly-icon-container-teal me-2">
            <i className="ri-bar-chart-line"></i>
          </div>
          <h5 className="poll-title mb-0">{t('pollResults.title')}</h5>
        </div>
      </ModalHeader>
      <ModalBody className="p-4">
        {completedPolls.length > 0 ? (
          <>
            {displayPoll ? (
              <>
                <Button 
                  color="link" 
                  className="nestly-btn-outline-teal mb-4 px-3 py-1" 
                  onClick={() => setSelectedPoll(null)}
                  style={{ border: 'none', textDecoration: 'none' }}
                >
                  <i className="ri-arrow-left-line me-1"></i> {t('pollResults.backToAllPolls')}
                </Button>
                
                <div className="poll-detail-container">
                  <Card className="nestly-card mb-4">
                    <CardHeader className="nestly-card-header">
                      <div className="nestly-card-pattern"></div>
                      <div className="d-flex align-items-center position-relative" style={{ zIndex: '1' }}>
                        <div className="nestly-icon-container nestly-icon-container-coral me-2">
                          <i className="ri-questionnaire-line"></i>
                        </div>
                        <div>
                          <h5 className="poll-title mb-0">{displayPoll.title}</h5>
                          {displayPoll.description && (
                            <p className="text-white-50 small mb-0 mt-1">{displayPoll.description}</p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardBody>
                      {/* Stats with horizontal layout using PollStatsChart */}
                      <PollStatsChart 
                        poll={displayPoll} 
                        detailed={true}
                        key={`${displayPoll._id}-${displayPoll.uniqueRespondentsCount || 0}`} 
                      />
                    </CardBody>
                  </Card>
                  
                  {/* Multi-question poll - only show if stats section is not already showing this */}
                  {displayPoll.questions && displayPoll.questions.length > 1 && (
                    <Card className="nestly-card mb-4">
                      <CardHeader className="bg-light border-0">
                        <div className="d-flex align-items-center">
                          <div className="nestly-icon-container nestly-icon-container-navy me-2">
                            <i className="ri-question-answer-line"></i>
                          </div>
                          <h5 className="poll-subtitle mb-0">{t('pollResults.questionDetails')}</h5>
                        </div>
                      </CardHeader>
                      <CardBody>
                        <Row>
                          {displayPoll.questions.map((question, qIndex) => (
                            <Col md={6} key={qIndex} className="mb-4">
                              <Card className="nestly-card h-100">
                                <CardHeader className="nestly-question-header">
                                  <h6 className="mb-0">{t('pollResults.questionNumber', { number: qIndex + 1 })}: {question.title}</h6>
                                </CardHeader>
                                <CardBody>
                                  <div className="poll-results">
                                    {question.options.map((option, oIndex) => {
                                      const totalVotes = question.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
                                      const percentage = totalVotes === 0 ? 0 : Math.round((option.votes || 0) / totalVotes * 100);
                                      
                                      return (
                                        <div key={oIndex} className="mb-3">
                                          <div className="d-flex justify-content-between align-items-center mb-1">
                                            <span>{option.text}</span>
                                            <div>
                                              <span className="nestly-badge nestly-badge-teal me-2">{percentage}%</span>
                                              <small className="text-muted">{option.votes || 0} {t('pollResults.votes')}</small>
                                            </div>
                                          </div>
                                          <div className="progress" style={{ height: '8px', backgroundColor: 'rgba(12, 139, 141, 0.1)', borderRadius: '4px' }}>
                                            <div 
                                              className="progress-bar" 
                                              role="progressbar" 
                                              style={{ 
                                                width: `${percentage}%`, 
                                                backgroundColor: 'var(--teal)',
                                                borderRadius: '4px'
                                              }}
                                              aria-valuenow={percentage} 
                                              aria-valuemin="0" 
                                              aria-valuemax="100"
                                            ></div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </CardBody>
                              </Card>
                            </Col>
                          ))}
                        </Row>
                      </CardBody>
                    </Card>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="d-flex align-items-center justify-content-between mb-4">
                  <div className="d-flex align-items-center">
                    <div className="nestly-icon-container nestly-icon-container-teal me-2">
                      <i className="ri-archive-line"></i>
                    </div>
                    <h5 className="poll-subtitle mb-0">{t('pollResults.archivedPolls')}</h5>
                  </div>
                  <span className="nestly-badge nestly-badge-coral">
                    {completedPolls.length} {t('pollResults.pollCount', { count: completedPolls.length })}
                  </span>
                </div>
                
                <Row>
                  {completedPolls.map(poll => (
                    <Col md={4} key={poll._id} className="mb-4">
                      <Card 
                        className="nestly-card h-100 cursor-pointer" 
                        onClick={() => setSelectedPoll(poll)}
                        style={{ cursor: 'pointer' }}
                      >
                        <CardBody className="d-flex flex-column">
                          <div className="d-flex align-items-center mb-3">
                            <div className="nestly-icon-container nestly-icon-container-teal me-2">
                              <i className="ri-questionnaire-line"></i>
                            </div>
                            <h6 className="mb-0 poll-subtitle">{poll.title}</h6>
                          </div>
                          
                          <div className="text-muted mb-3">
                            <div className="d-flex align-items-center mb-2">
                              <i className="ri-question-line me-2"></i>
                              <span>
                                {poll.questions ? 
                                  t('pollResults.questionsCount', { count: poll.questions.length }) : 
                                  t('pollResults.questionsCount', { count: 1 })}
                              </span>
                            </div>
                            <div className="d-flex align-items-center">
                              <i className="ri-user-line me-2"></i>
                              <span>{t('pollResults.responsesCount', { count: poll.responses ? poll.responses.length : 0 })}</span>
                            </div>
                          </div>
                          
                          <div className="mt-auto text-center">
                            <Button className="w-100" color='primary'>
                              <i className="ri-eye-line me-1"></i> {t('pollResults.viewResults')}
                            </Button>
                          </div>
                        </CardBody>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </>
            )}
          </>
        ) : (
          <div className="text-center py-5">
            <div className="nestly-icon-container nestly-icon-container-coral mx-auto mb-3" style={{ width: '80px', height: '80px' }}>
              <i className="ri-archive-line fs-2"></i>
            </div>
            <h5 className="poll-subtitle mb-3">{t('pollResults.noCompletedPolls')}</h5>
            <p className="text-muted">
              {t('pollResults.noCompletedPollsDesc')}
            </p>
          </div>
        )}
      </ModalBody>
      <ModalFooter className="border-top-0">
        <Button color='danger' onClick={toggle}>
          <i className="ri-close-line me-1"></i> {t('pollResults.close')}
        </Button>
        {displayPoll && (
          <Button color='primary' onClick={() => exportPollReport(displayPoll._id)}>
            <i className="ri-file-pdf-line me-1"></i> {t('pollResults.exportPdf')}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default PollResultsModal;