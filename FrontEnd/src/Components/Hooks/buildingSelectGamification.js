import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Card, CardBody, CardHeader,
  Form, FormGroup, Label, Input,
  Button, Alert, Spinner, Row, Col, Table, Accordion, AccordionItem, AccordionHeader, AccordionBody, Badge
} from 'reactstrap';
import { withTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { isGamificationAvailable } from '../Subscriptions/SubcriptionValidator';
import { SetCurrentBuilding } from '../../slices/buildings/building';

const BuildingSettings = ({ t }) => {
  const { user } = useSelector(state => state.Loginn);
  const dispatch = useDispatch();
  const [open, setOpen] = useState('');
  const toggle = (id) => {
    if (open === id) {
      setOpen('');
    } else {
      setOpen(id);
    }
  };
  const [showGamificationDetails, setShowGamificationDetails] = useState(true);

  // Get the current building from Redux state
  const { currentBuilding } = useSelector(state => state.Building);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [buildingSettings, setBuildingSettings] = useState({
    gamificationEnabled: false
  });
  const [originalSettings, setOriginalSettings] = useState({
    gamificationEnabled: false
  });

  // Load settings whenever the current building changes
  useEffect(() => {
    const fetchBuildingSettings = async () => {
      // Reset if no building selected
      if (!currentBuilding || !currentBuilding._id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const response = await api.get(`/api/Building/${currentBuilding._id}`);

        // Check if gamificationEnabled field exists directly on the data object
        const gamificationEnabled =
          // Check if it's directly on the response data
          response.data?.gamificationEnabled !== undefined ? response.data.gamificationEnabled :
            // If not, check if it's in a nested data object
            response.data?.data?.gamificationEnabled !== undefined ? response.data.data.gamificationEnabled :
              // If still not found, use the value from Redux state
              currentBuilding?.gamificationEnabled || false;

        // Set both current and original settings
        const newSettings = { gamificationEnabled };
        setBuildingSettings(newSettings);
        setOriginalSettings(newSettings);

      } catch (error) {
        console.error('Error fetching building settings:', error);
        toast.error(t('gamification.settings.fetchError'));

        // Fallback to using Redux state if API fails
        if (currentBuilding) {
          const fallbackSettings = {
            gamificationEnabled: currentBuilding.gamificationEnabled || false
          };
          setBuildingSettings(fallbackSettings);
          setOriginalSettings(fallbackSettings);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBuildingSettings();
  }, [currentBuilding, t]);

  // Handle toggle change
  const handleToggleChange = (e) => {
    const { name, checked } = e.target;
    setBuildingSettings(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  // Save settings function
  const handleSaveSettings = async (e) => {
    e.preventDefault();

    if (!currentBuilding || !currentBuilding._id) {
      toast.error(t('gamification.settings.noBuildingSelected'));
      return;
    }

    try {
      setSaving(true);

      const response = await api.patch(`/api/Building/${currentBuilding._id}/settings`, {
        gamificationEnabled: buildingSettings.gamificationEnabled
      });

      // Update original settings after successful save
      setOriginalSettings({
        ...buildingSettings
      });

      // Update the Redux store with the new gamificationEnabled value
      dispatch(SetCurrentBuilding({
        ...currentBuilding,
        gamificationEnabled: buildingSettings.gamificationEnabled
      }));

      toast.success(t('gamification.settings.updateSuccess'));
    } catch (error) {
      console.error('Error saving building settings:', error);
      toast.error(t('gamification.settings.updateError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>


      {!currentBuilding ? (
        <Alert color="info">
          <div className="d-flex">
            <div className="flex-shrink-0">
              <i className="ri-information-line fs-18 align-middle me-2"></i>
            </div>
            <div className="flex-grow-1">
              <h5 className="mt-0">{t('gamification.settings.noBuildingSelected')}</h5>
              <p className="mb-0">
                {t('gamification.settings.selectBuildingPrompt')}
              </p>
            </div>
          </div>
        </Alert>
      ) : loading ? (
        <div className="text-center py-3">
          <Spinner color="primary" />
          <p className="mt-2 text-muted">{t('gamification.settings.loading')}</p>
        </div>
      ) : (
        <>
          {/* Gamification System Section */}
          {isGamificationAvailable(user) && (
            <div className="mt-4 pt-3 border-top">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">{t('gamification.settings.title')}</h5>
                <Button
                  color={showGamificationDetails ? "primary" : "outline-primary"}
                  size="sm"
                  onClick={() => setShowGamificationDetails(!showGamificationDetails)}
                  className="view-details-btn"
                >
                  {showGamificationDetails ? (
                    <>
                      <i className="ri-eye-off-line me-1"></i> {t('gamification.profile.hideDetails')}
                    </>
                  ) : (
                    <>
                      <i className="ri-eye-line me-1"></i> {t('gamification.profile.learnMore')}
                    </>
                  )}
                </Button>
              </div>

              {/* Gamification Enable/Disable Control */}
              <div className="gamification-controls p-3 border rounded mb-3">
                <Form onSubmit={handleSaveSettings}>
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
                    <FormGroup className="mb-3 mb-md-0 me-md-3 flex-grow-1">
                      <div className="form-check form-switch form-switch-lg">
                        <Input
                          type="switch"
                          className="form-check-input"
                          id="gamificationEnabled"
                          name="gamificationEnabled"
                          checked={buildingSettings.gamificationEnabled}
                          onChange={handleToggleChange}
                        />
                        <Label className="form-check-label" for="gamificationEnabled">
                          {t('gamification.settings.enableGamification')}
                        </Label>
                      </div>
                      <small className="text-muted d-block mt-2">
                        {t('gamification.settings.enableDescription')}
                      </small>
                    </FormGroup>

                    <div className="d-flex gap-2">
                      <Button
                        color="primary"
                        size="sm"
                        type="submit"
                        disabled={saving}
                      >
                        {saving ? <><Spinner size="sm" className="me-1" /> {t('gamification.settings.saving')}</> : t('gamification.settings.saveSettings')}
                      </Button>

                      <Button
                        color="light"
                        size="sm"
                        type="button"
                        onClick={() => setBuildingSettings({ ...originalSettings })}
                        disabled={saving}
                      >
                        {t('gamification.settings.reset')}
                      </Button>
                    </div>
                  </div>
                </Form>
              </div>

              {/* Gamification Details Section */}
              <div className={`gamification-details-container ${showGamificationDetails ? 'show' : 'hide'}`}>
                {/* Visual Journey/Path Representation */}
                <div className="gamification-journey mb-4">
                  <div className="journey-path">
                    <div className="milestone">
                      <div className="milestone-icon">
                        <i className="ri-coins-line"></i>
                      </div>
                      <div className="milestone-label">{t('gamification.profile.journey.earnPoints')}</div>
                    </div>
                    <div className="milestone">
                      <div className="milestone-icon">
                        <i className="ri-award-line"></i>
                      </div>
                      <div className="milestone-label">{t('gamification.profile.journey.getBadges')}</div>
                    </div>
                    <div className="milestone">
                      <div className="milestone-icon">
                        <i className="ri-trophy-line"></i>
                      </div>
                      <div className="milestone-label">{t('gamification.profile.journey.climbLeaderboard')}</div>
                    </div>
                    <div className="milestone">
                      <div className="milestone-icon">
                        <i className="ri-gift-line"></i>
                      </div>
                      <div className="milestone-label">{t('gamification.profile.journey.redeemRewards')}</div>
                    </div>
                  </div>
                </div>

                <Accordion open={open} toggle={toggle} className="accordion-flush">
                  {/* Points Section */}
                  <AccordionItem>
                    <AccordionHeader targetId="1">
                      <i className="ri-coins-line me-2 text-warning"></i>
                      <span className="fw-medium">{t('gamification.profile.howToEarnPoints')}</span>
                    </AccordionHeader>
                    <AccordionBody accordionId="1">
                      <Table borderless size="sm" className="mb-0">
                        <thead>
                          <tr>
                            <th>{t('gamification.profile.activity')}</th>
                            <th>{t('gamification.profile.basePoints')}</th>
                            <th>{t('gamification.profile.additionalInfo')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>{t('gamification.profile.activities.meetingAttendance')}</td>
                            <td><Badge color="primary">30 {t('gamification.points')}</Badge></td>
                            <td>{t('gamification.profile.perMeeting')}</td>
                          </tr>
                          <tr>
                            <td>{t('gamification.profile.activities.votingInPolls')}</td>
                            <td><Badge color="primary">20 {t('gamification.points')}</Badge></td>
                            <td>{t('gamification.profile.perPoll')}</td>
                          </tr>
                          <tr>
                            <td>{t('gamification.profile.activities.earlyPayment')}</td>
                            <td><Badge color="primary">50 {t('gamification.points')}</Badge></td>
                            <td>
                              <div>{t('gamification.profile.bonusMultiplier')}:</div>
                              <div className="mt-1">
                                <Badge color="primary" className="me-1">
                                  {t('gamification.profile.dayEarly', { days: 1, points: 53 })}
                                </Badge>
                                <Badge color="primary" className="me-1">
                                  {t('gamification.profile.dayEarly', { days: 7, points: 73 })}
                                </Badge>
                                <Badge color="primary">
                                  {t('gamification.profile.dayEarly', { days: 15, points: 100 })}
                                </Badge>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </AccordionBody>
                  </AccordionItem>

                  {/* Badges Section */}
                  <AccordionItem>
                    <AccordionHeader targetId="2">
                      <i className="ri-award-line me-2 text-info"></i>
                      <span className="fw-medium">{t('gamification.profile.badgesAchievements')}</span>
                    </AccordionHeader>
                    <AccordionBody accordionId="2">
                      <Row>
                        <Col md={6} className="mb-3">
                          <div className="badge-category-card">
                            <div className="badge-header payment-header">
                              <i className="ri-money-dollar-circle-line me-2"></i>
                              <h6 className="mb-0">{t('gamification.profile.badges.paymentBadges')}</h6>
                            </div>
                            <div className="badge-content">
                              <div className="badge-item">
                                <div className="badge-icon payment">
                                  <i className="ri-time-line"></i>
                                </div>
                                <div className="badge-details">
                                  <div className="badge-name">{t('gamification.profile.badges.earlyBird')}</div>
                                  <div className="badge-criteria">{t('gamification.profile.badges.earlyBirdCriteria')}</div>
                                </div>
                              </div>
                              <div className="badge-item">
                                <div className="badge-icon payment">
                                  <i className="ri-calendar-check-line"></i>
                                </div>
                                <div className="badge-details">
                                  <div className="badge-name">{t('gamification.profile.badges.punctualPayer')}</div>
                                  <div className="badge-criteria">{t('gamification.profile.badges.punctualPayerCriteria')}</div>
                                </div>
                              </div>
                              <div className="badge-item">
                                <div className="badge-icon payment">
                                  <i className="ri-bank-line"></i>
                                </div>
                                <div className="badge-details">
                                  <div className="badge-name">{t('gamification.profile.badges.financialGuru')}</div>
                                  <div className="badge-criteria">{t('gamification.profile.badges.financialGuruCriteria')}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Col>

                        <Col md={6} className="mb-3">
                          <div className="badge-category-card">
                            <div className="badge-header meeting-header">
                              <i className="ri-team-line me-2"></i>
                              <h6 className="mb-0">{t('gamification.profile.badges.meetingBadges')}</h6>
                            </div>
                            <div className="badge-content">
                              <div className="badge-item">
                                <div className="badge-icon meeting">
                                  <i className="ri-user-star-line"></i>
                                </div>
                                <div className="badge-details">
                                  <div className="badge-name">{t('gamification.profile.badges.firstTimer')}</div>
                                  <div className="badge-criteria">{t('gamification.profile.badges.firstTimerCriteria')}</div>
                                </div>
                              </div>
                              <div className="badge-item">
                                <div className="badge-icon meeting">
                                  <i className="ri-user-voice-line"></i>
                                </div>
                                <div className="badge-details">
                                  <div className="badge-name">{t('gamification.profile.badges.activeParticipant')}</div>
                                  <div className="badge-criteria">{t('gamification.profile.badges.activeParticipantCriteria')}</div>
                                </div>
                              </div>
                              <div className="badge-item">
                                <div className="badge-icon meeting">
                                  <i className="ri-community-line"></i>
                                </div>
                                <div className="badge-details">
                                  <div className="badge-name">{t('gamification.profile.badges.communityPillar')}</div>
                                  <div className="badge-criteria">{t('gamification.profile.badges.communityPillarCriteria')}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Col>

                        <Col md={6} className="mb-3">
                          <div className="badge-category-card">
                            <div className="badge-header voting-header">
                              <i className="ri-vote-line me-2"></i>
                              <h6 className="mb-0">{t('gamification.profile.badges.votingBadges')}</h6>
                            </div>
                            <div className="badge-content">
                              <div className="badge-item">
                                <div className="badge-icon voting">
                                  <i className="ri-checkbox-circle-line"></i>
                                </div>
                                <div className="badge-details">
                                  <div className="badge-name">{t('gamification.profile.badges.voter')}</div>
                                  <div className="badge-criteria">{t('gamification.profile.badges.voterCriteria')}</div>
                                </div>
                              </div>
                              <div className="badge-item">
                                <div className="badge-icon voting">
                                  <i className="ri-government-line"></i>
                                </div>
                                <div className="badge-details">
                                  <div className="badge-name">{t('gamification.profile.badges.democracyChampion')}</div>
                                  <div className="badge-criteria">{t('gamification.profile.badges.democracyChampionCriteria')}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Col>

                        <Col md={6} className="mb-3">
                          <div className="badge-category-card">
                            <div className="badge-header general-header">
                              <i className="ri-medal-line me-2"></i>
                              <h6 className="mb-0">{t('gamification.profile.badges.generalBadges')}</h6>
                            </div>
                            <div className="badge-content">
                              <div className="badge-item">
                                <div className="badge-icon general">
                                  <i className="ri-star-smile-line"></i>
                                </div>
                                <div className="badge-details">
                                  <div className="badge-name">{t('gamification.profile.badges.risingStar')}</div>
                                  <div className="badge-criteria">{t('gamification.profile.badges.risingStarCriteria')}</div>
                                </div>
                              </div>
                              <div className="badge-item">
                                <div className="badge-icon general">
                                  <i className="ri-home-heart-line"></i>
                                </div>
                                <div className="badge-details">
                                  <div className="badge-name">{t('gamification.profile.badges.engagedResident')}</div>
                                  <div className="badge-criteria">{t('gamification.profile.badges.engagedResidentCriteria')}</div>
                                </div>
                              </div>
                              <div className="badge-item">
                                <div className="badge-icon general">
                                  <i className="ri-vip-crown-line"></i>
                                </div>
                                <div className="badge-details">
                                  <div className="badge-name">{t('gamification.profile.badges.buildingVIP')}</div>
                                  <div className="badge-criteria">{t('gamification.profile.badges.buildingVIPCriteria')}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </AccordionBody>
                  </AccordionItem>

                  {/* Rewards Section */}
                  <AccordionItem>
                    <AccordionHeader targetId="3">
                      <i className="ri-gift-line me-2 text-danger"></i>
                      <span className="fw-medium">{t('gamification.profile.availableRewards')}</span>
                    </AccordionHeader>
                    <AccordionBody accordionId="3">
                      <div className="reward-cards">
                        <Row>
                          <Col md={4} className="mb-3">
                            <div className="reward-card">
                              <div className="reward-ribbon">200 {t('gamification.points')}</div>
                              <div className="reward-icon">
                                <i className="ri-percent-line text-success"></i>
                              </div>
                              <h5 className="reward-title">{t('gamification.profile.rewards.discount5')}</h5>
                              <p className="reward-description">{t('gamification.profile.rewards.discount5Desc')}</p>
                            </div>
                          </Col>

                          <Col md={4} className="mb-3">
                            <div className="reward-card">
                              <div className="reward-ribbon">500 {t('gamification.points')}</div>
                              <div className="reward-icon">
                                <i className="ri-percent-line text-warning"></i>
                              </div>
                              <h5 className="reward-title">{t('gamification.profile.rewards.discount10')}</h5>
                              <p className="reward-description">{t('gamification.profile.rewards.discount10Desc')}</p>
                            </div>
                          </Col>

                          <Col md={4} className="mb-3">
                            <div className="reward-card premium">
                              <div className="reward-ribbon">1000 {t('gamification.points')}</div>
                              <div className="reward-icon">
                                <i className="ri-calendar-check-line text-danger"></i>
                              </div>
                              <h5 className="reward-title">{t('gamification.profile.rewards.skipMonth')}</h5>
                              <p className="reward-description">{t('gamification.profile.rewards.skipMonthDesc')}</p>
                            </div>
                          </Col>
                        </Row>
                      </div>
                    </AccordionBody>
                  </AccordionItem>

                  {/* How It Works Section */}
                  <AccordionItem>
                    <AccordionHeader targetId="4">
                      <i className="ri-information-line me-2 text-primary"></i>
                      <span className="fw-medium">{t('gamification.profile.howItWorks')}</span>
                    </AccordionHeader>
                    <AccordionBody accordionId="4">
                      <div className="process-steps">
                        <div className="process-step">
                          <div className="step-number">1</div>
                          <div className="step-content">
                            <h6>{t('gamification.profile.steps.participate')}</h6>
                            <p>{t('gamification.profile.steps.participateDesc')}</p>
                          </div>
                        </div>

                        <div className="process-step">
                          <div className="step-number">2</div>
                          <div className="step-content">
                            <h6>{t('gamification.profile.steps.earnBadges')}</h6>
                            <p>{t('gamification.profile.steps.earnBadgesDesc')}</p>
                          </div>
                        </div>

                        <div className="process-step">
                          <div className="step-number">3</div>
                          <div className="step-content">
                            <h6>{t('gamification.profile.steps.trackProgress')}</h6>
                            <p>{t('gamification.profile.steps.trackProgressDesc')}</p>
                          </div>
                        </div>

                        <div className="process-step">
                          <div className="step-number">4</div>
                          <div className="step-content">
                            <h6>{t('gamification.profile.steps.maintainStreaks')}</h6>
                            <p>{t('gamification.profile.steps.maintainStreaksDesc')}</p>
                          </div>
                        </div>

                        <div className="process-step">
                          <div className="step-number">5</div>
                          <div className="step-content">
                            <h6>{t('gamification.profile.steps.redeemRewards')}</h6>
                            <p>{t('gamification.profile.steps.redeemRewardsDesc')}</p>
                          </div>
                        </div>

                        <div className="process-step">
                          <div className="step-number">6</div>
                          <div className="step-content">
                            <h6>{t('gamification.profile.steps.annualReset')}</h6>
                            <p>{t('gamification.profile.steps.annualResetDesc')}</p>
                          </div>
                        </div>
                      </div>
                    </AccordionBody>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          )}

          {/* Display when gamification is not available */}
          {!isGamificationAvailable(user) && (
            <div className="mt-4 pt-3 border-top">
              <h5 className="mb-3">{t('gamification.settings.title')}</h5>
              <Alert color="warning">
                <h6 className="alert-heading fw-bold mb-1">{t('gamification.settings.featureNotAvailable')}</h6>
                <p className="mb-0">
                  {t('gamification.settings.featureNotAvailableDesc')}
                  <a href="/subscription" className="alert-link ms-1">{t('gamification.settings.upgradeSubscription')}</a> {t('gamification.settings.toAccessFeature')}
                </p>
              </Alert>
            </div>
          )}
        </>
      )}

      {/* Styled JSX for component-scoped CSS */}
      <style jsx>{`
          /* Gamification details container */
          .gamification-details-container {
            overflow: hidden;
            transition: max-height 0.5s ease-out, opacity 0.3s ease-out;
          }
          
          .gamification-details-container.hide {
            max-height: 0;
            opacity: 0;
            margin-top: 0;
            padding-top: 0;
          }
          
          .gamification-details-container.show {
            max-height: 3000px;
            opacity: 1;
            margin-top: 1.5rem;
          }
          
          /* Gamification controls styling */
          .gamification-controls {
            background-color: #f8f9fa;
          }
          
          /* Journey visualization */
          .gamification-journey {
            position: relative;
            padding: 20px 0;
            margin-bottom: 2rem;
          }

          .journey-path {
            display: flex;
            justify-content: space-between;
            position: relative;
            margin: 0 auto;
          }

          .journey-path:before {
            content: '';
            position: absolute;
            top: 25px;
            left: 40px;
            right: 40px;
            height: 4px;
            background: linear-gradient(90deg, #3a57e8, #00c3ff, #47c742, #ff6b6b);
            z-index: 0;
          }

          .milestone {
            position: relative;
            z-index: 1;
            text-align: center;
          }

          .milestone-icon {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 10px;
            border: 2px solid;
            box-shadow: 0 0 0 4px #f8f9fa;
            transition: all 0.3s ease;
          }

          .milestone-icon i {
            font-size: 24px;
          }

          .milestone-label {
            font-size: 14px;
            font-weight: 500;
            white-space: nowrap;
          }

          .milestone:nth-child(1) .milestone-icon {
            border-color: #3a57e8;
          }
          
          .milestone:nth-child(2) .milestone-icon {
            border-color: #00c3ff;
          }
          
          .milestone:nth-child(3) .milestone-icon {
            border-color: #47c742;
          }
          
          .milestone:nth-child(4) .milestone-icon {
            border-color: #ff6b6b;
          }

          .milestone:nth-child(1) .milestone-icon i {
            color: #3a57e8;
          }
          
          .milestone:nth-child(2) .milestone-icon i {
            color: #00c3ff;
          }
          
          .milestone:nth-child(3) .milestone-icon i {
            color: #47c742;
          }
          
          .milestone:nth-child(4) .milestone-icon i {
            color: #ff6b6b;
          }

          /* Accordion styling */
          :global(.accordion-button) {
            background-color: transparent !important;
            box-shadow: none !important;
            padding: 1rem 0;
          }
          
          :global(.accordion-button:not(.collapsed)) {
            color: #3a57e8;
            background-color: transparent;
          }
          
          :global(.accordion-body) {
            padding: 1rem 0.25rem;
          }
          
          /* Badge styling */
          .badge-icon {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          
          .badge-icon i {
            font-size: 18px;
            color: white;
          }
          
          .badge-icon.payment {
            background-color: #ffc107;
          }
          
          .badge-icon.meeting {
            background-color: #00c3ff;
          }
          
          .badge-icon.voting {
            background-color: #47c742;
          }
          
          .badge-icon.general {
            background-color: #6c757d;
          }
          
          .badge-list li {
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px dashed rgba(0,0,0,0.1);
          }
          
          .badge-list li:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
          }
          
          /* Reward card styling */
          .reward-card {
            border-radius: 8px;
            border: 1px solid #e9e9ef;
            padding: 20px;
            text-align: center;
            position: relative;
            height: 100%;
            transition: all 0.3s ease;
            overflow: hidden;
          }
          
          .reward-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
          }
          
          .reward-ribbon {
            position: absolute;
            top: 10px;
            right: -30px;
            background: #3a57e8;
            color: white;
            padding: 5px 30px;
            font-size: 12px;
            transform: rotate(45deg);
            font-weight: bold;
          }
          
          .reward-icon {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background-color: #f8f9fa;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 10px auto;
          }
          
          .reward-icon i {
            font-size: 30px;
          }
          
          .reward-title {
            font-size: 18px;
            margin: 10px 0;
            font-weight: 500;
          }
          
          .reward-description {
            color: #6c757d;
            font-size: 14px;
            margin-bottom: 0;
          }
          
          .reward-card.premium {
            border: 1px solid #ffc107;
            box-shadow: 0 0 10px rgba(255, 193, 7, 0.2);
          }
          
          .reward-card.premium .reward-ribbon {
            background: #ffc107;
            color: #212529;
          }
          
          /* How it works / process steps */
          .process-steps {
            position: relative;
            padding-left: 30px;
          }
          
          .process-steps:before {
            content: '';
            position: absolute;
            top: 0;
            bottom: 0;
            left: 15px;
            width: 2px;
            background-color: #e9e9ef;
          }
          
          .process-step {
            position: relative;
            padding-bottom: 25px;
          }
          
          .process-step:last-child {
            padding-bottom: 0;
          }
          
          .step-number {
            position: absolute;
            left: -30px;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background-color: #3a57e8;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
          }
          
          .step-content {
            padding-left: 15px;
          }
          
          .step-content h6 {
            margin-bottom: 5px;
          }
          
          .step-content p {
            color: #6c757d;
            margin-bottom: 0;
          }
          
          /* View details button effects */
          :global(.view-details-btn) {
            transition: all 0.2s ease;
          }
          
          :global(.view-details-btn:hover) {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }
          
          /* Table styling */
          :global(table.table-sm td) {
            padding: 0.5rem;
          }

          /* Responsive adjustments */
          @media (max-width: 767.98px) {
            .journey-path:before {
              left: 20px;
              right: 20px;
            }
            
            .milestone-icon {
              width: 40px;
              height: 40px;
            }
            
            .milestone-icon i {
              font-size: 18px;
            }
            
            .milestone-label {
              font-size: 12px;
            }
          }
        `}</style>

    </Card>
  );
};

BuildingSettings.propTypes = {
  t: PropTypes.func.isRequired,
};

export default withTranslation()(BuildingSettings);