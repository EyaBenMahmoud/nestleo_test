import React, { useEffect, useState } from 'react';
import {Accordion, Table, AccordionItem, AccordionHeader, AccordionBody, Card, CardBody, CardHeader, Row, Col, Badge, Progress, ListGroup, ListGroupItem, Pagination, PaginationItem, PaginationLink, Button } from 'reactstrap';
import { useSelector } from 'react-redux';
import { withTranslation } from "react-i18next";
import PropTypes from 'prop-types';
import api from '../../services/api';
import './gamification.css';

const GamificationProfile = ({ t, userId }) => {
  const currentUser = useSelector((state) => state.Loginn.user);
  const currentBuilding = useSelector((state) => state.Building.currentBuilding);
  const [profile, setProfile] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [topPerformer, setTopPerformer] = useState(null);
  const [rewards, setRewards] = useState({ availablePoints: 0, rewards: [] });
  const [loading, setLoading] = useState(true);
  const [showGamificationDetails, setShowGamificationDetails] = useState(false);
  const [open, setOpen] = useState('');
  
  const toggle = (id) => {
    if (open === id) {
      setOpen('');
    } else {
      setOpen(id);
    }
  };
  
  // Pagination states
  const [currentActivityPage, setCurrentActivityPage] = useState(1);
  const [currentRewardsPage, setCurrentRewardsPage] = useState(1);
  const [currentRedeemedRewardsPage, setCurrentRedeemedRewardsPage] = useState(1);
  const itemsPerPage = 7;

  // Use current user's ID if no userId is provided
  const targetUserId = userId || currentUser.id;

  useEffect(() => {
    const fetchGamificationData = async () => {
      try {
        setLoading(true);
        // Prepare buildingId query param if available
        const buildingIdParam = currentBuilding?._id ? `?buildingId=${currentBuilding._id}` : '';

        // Fetch user profile
        const profileResponse = await api.get(`/api/gamification/profile/${targetUserId}${buildingIdParam}`);
        setProfile(profileResponse.data.data);

        // Fetch top performer with building context
        const topPerformerUrl = currentBuilding?._id
          ? `/api/gamification/top-performer/${currentBuilding._id}`
          : '/api/gamification/top-performer';
        const topPerformerResponse = await api.get(topPerformerUrl);
        setTopPerformer(topPerformerResponse.data.data);

        // Fetch rewards if viewing own profile
        if (targetUserId === currentUser.id) {
          const rewardsResponse = await api.get(`/api/gamification/rewards/${targetUserId}${buildingIdParam}`);
          setRewards(rewardsResponse.data.data);
        }
      } catch (error) {
        console.error('Error fetching gamification data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGamificationData();
  }, [targetUserId, currentUser.id, currentBuilding]);

  const handleRedeemReward = async (rewardId) => {
    try {
      // Include buildingId in reward redemption if available
      const redemptionData = {
        userId: currentUser.id,
        rewardId
      };

      if (currentBuilding?._id) {
        redemptionData.buildingId = currentBuilding._id;
      }

      await api.post('/api/gamification/rewards/redeem', redemptionData);

      // Prepare buildingId query param if available
      const buildingIdParam = currentBuilding?._id ? `?buildingId=${currentBuilding._id}` : '';

      // Refresh rewards and profile after redemption
      const rewardsResponse = await api.get(`/api/gamification/rewards/${targetUserId}${buildingIdParam}`);
      setRewards(rewardsResponse.data.data);

      const profileResponse = await api.get(`/api/gamification/profile/${targetUserId}${buildingIdParam}`);
      setProfile(profileResponse.data.data);
    } catch (error) {
      console.error('Error redeeming reward:', error);
      alert(t('gamification.profile.redeemError', { error: (error.response?.data?.message || error.message) }));
    }
  };

  // Toggle gamification details visibility
  const toggleGamificationDetails = () => {
    setShowGamificationDetails(!showGamificationDetails);
  };

  if (loading) {
    return <div className="text-center p-4">{t('gamification.profile.loading')}</div>;
  }

  if (!profile) {
    return <div className="text-center p-4">{t('gamification.profile.noData')}</div>;
  }

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Map reason codes to friendly names
  const reasonLabels = {
    'early_payment': t('gamification.profile.reasons.earlyPayment'),
    'meeting_attendance': t('gamification.profile.reasons.meetingAttendance'),
    'voting': t('gamification.profile.reasons.voting')
  };

  // Pagination calculations for Recent Activity
  const totalActivityPages = Math.ceil(profile.recentActivity.length / itemsPerPage);
  const paginatedActivities = profile.recentActivity.slice(
    (currentActivityPage - 1) * itemsPerPage,
    currentActivityPage * itemsPerPage
  );

  // Pagination calculations for Available Rewards
  const totalRewardsPages = Math.ceil(rewards.rewards.length / itemsPerPage);
  const paginatedRewards = rewards.rewards.slice(
    (currentRewardsPage - 1) * itemsPerPage,
    currentRewardsPage * itemsPerPage
  );

  // Pagination calculations for Redeemed Rewards
  const totalRedeemedRewardsPages = Math.ceil((profile.redeemedRewards?.length || 0) / itemsPerPage);
  const paginatedRedeemedRewards = profile.redeemedRewards?.slice(
    (currentRedeemedRewardsPage - 1) * itemsPerPage,
    currentRedeemedRewardsPage * itemsPerPage
  ) || [];

  // Pagination navigation components
  const ActivityPagination = () => (
    <div className="d-flex justify-content-center">
      <Pagination className="mt-3">
        <PaginationItem disabled={currentActivityPage === 1}>
          <PaginationLink previous onClick={() => setCurrentActivityPage(currentActivityPage - 1)} />
        </PaginationItem>
        {[...Array(totalActivityPages)].map((_, index) => (
          <PaginationItem active={index + 1 === currentActivityPage} key={index}>
            <PaginationLink onClick={() => setCurrentActivityPage(index + 1)}>
              {index + 1}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem disabled={currentActivityPage === totalActivityPages}>
          <PaginationLink next onClick={() => setCurrentActivityPage(currentActivityPage + 1)} />
        </PaginationItem>
      </Pagination>
    </div>
  );

  const RewardsPagination = () => (
    <div className="d-flex justify-content-center">
      <Pagination className="mt-3">
        <PaginationItem disabled={currentRewardsPage === 1}>
          <PaginationLink previous onClick={() => setCurrentRewardsPage(currentRewardsPage - 1)} />
        </PaginationItem>
        {[...Array(totalRewardsPages)].map((_, index) => (
          <PaginationItem active={index + 1 === currentRewardsPage} key={index}>
            <PaginationLink onClick={() => setCurrentRewardsPage(index + 1)}>
              {index + 1}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem disabled={currentRewardsPage === totalRewardsPages}>
          <PaginationLink next onClick={() => setCurrentRewardsPage(currentRewardsPage + 1)} />
        </PaginationItem>
      </Pagination>
    </div>
  );

  const RedeemedRewardsPagination = () => (
    <div className="d-flex justify-content-center">
      <Pagination className="mt-3">
        <PaginationItem disabled={currentRedeemedRewardsPage === 1}>
          <PaginationLink previous onClick={() => setCurrentRedeemedRewardsPage(currentRedeemedRewardsPage - 1)} />
        </PaginationItem>
        {[...Array(totalRedeemedRewardsPages)].map((_, index) => (
          <PaginationItem active={index + 1 === currentRedeemedRewardsPage} key={index}>
            <PaginationLink onClick={() => setCurrentRedeemedRewardsPage(index + 1)}>
              {index + 1}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem disabled={currentRedeemedRewardsPage === totalRedeemedRewardsPages}>
          <PaginationLink next onClick={() => setCurrentRedeemedRewardsPage(currentRedeemedRewardsPage + 1)} />
        </PaginationItem>
      </Pagination>
    </div>
  );

  return (
    <div className="gamification-profile">
      {/* Button to toggle gamification details visibility */}
      <div className="d-flex justify-content-center mb-4">
        <Button 
          color="primary"
          onClick={toggleGamificationDetails}
          className="view-details-btn"
        >
          {showGamificationDetails 
            ? t('gamification.profile.hideDetails') 
            : t('gamification.profile.learnMore')}
        </Button>
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

      <Row>
        {/* Points Summary */}
        <Col md={6}>
          <Card className="mb-4">
            <CardHeader className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">{t('gamification.profile.pointsRecognition')}</h5>
              <Badge color="primary" pill className="px-3 py-2">{profile.points} {t('gamification.points')}</Badge>
            </CardHeader>
            <CardBody>
              <div className="points-summary">
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span>{t('gamification.profile.monthlyPoints')}</span>
                    <span>{profile.monthlyPoints}</span>
                  </div>
                  <Progress value={(profile.monthlyPoints / Math.max(profile.points, 1)) * 100} />
                </div>

                {/* Monthly Ranking */}
                <div className="mb-3">
                  <h6>{t('gamification.profile.yourRanking')}</h6>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      {leaderboard.findIndex(user => user.id === targetUserId) + 1 <= leaderboard.length
                        ? t('gamification.profile.rankingPosition', { 
                            position: leaderboard.findIndex(user => user.id === targetUserId) + 1, 
                            total: leaderboard.length 
                          })
                        : t('gamification.profile.notRanked')}
                    </div>
                    <Badge color={leaderboard[0]?.id === targetUserId ? 'warning' : 'light'} className="ranking-badge">
                      {leaderboard[0]?.id === targetUserId ? t('gamification.profile.topPerformer') : ''}
                    </Badge>
                  </div>
                </div>

                {/* Top Performer */}
                {topPerformer && (
                  <div className="top-performerr">
                    <h6>{t('gamification.profile.coOwnerOfDay')}</h6>
                    <div className="d-flex align-items-center">
                      <div className="top-performer-avatarr">
                        {topPerformer.avatar ? (
                          <img src={topPerformer.avatar} alt={topPerformer.name} />
                        ) : (
                          <span>{topPerformer.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="ms-2">
                        <div className="name">{topPerformer.name}</div>
                        <div className="points">{t('gamification.profile.pointsToday', { points: topPerformer.points })}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Badges */}
        <Col md={6}>
          <Card className="mb-4">
            <CardHeader>
              <h5 className="mb-0">{t('gamification.profile.badgesCount', { count: profile.badges.length })}</h5>
            </CardHeader>
            <CardBody>
              {profile.badges.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <i className="ri-medal-line display-4"></i>
                  <p>{t('gamification.profile.noBadgesYet')}</p>
                </div>
              ) : (
                <div className="badges-grid">
                  {profile.badges.map(badge => (
                    <div key={badge.id} className="badge-item">
                      <div className={`badge-icon ${badge.category}`}>
                        <i className={badge.icon || 'ri-medal-line'}></i>
                      </div>
                      <div className="badge-name">{badge.name}</div>
                      <div className="badge-date">{formatDate(badge.earnedAt)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Recent Activity */}
        <Col md={6}>
          <Card className="mb-4">
            <CardHeader>
              <h5 className="mb-0">{t('gamification.profile.recentActivity')}</h5>
            </CardHeader>
            <CardBody>
              {profile.recentActivity.length === 0 ? (
                <div className="text-center text-muted py-3">{t('gamification.profile.noRecentActivity')}</div>
              ) : (
                <>
                  <ListGroup>
                    {paginatedActivities.map(activity => (
                      <ListGroupItem key={activity.id} className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="activity-reason">
                            {reasonLabels[activity.reason] || activity.reason}
                          </div>
                          <div className="activity-description text-muted">{activity.description}</div>
                        </div>
                        <div className="d-flex align-items-center">
                          <Badge color="success" className="points-badge">+{activity.points}</Badge>
                          <small className="text-muted ms-2">{formatDate(activity.timestamp)}</small>
                        </div>
                      </ListGroupItem>
                    ))}
                  </ListGroup>
                  {totalActivityPages > 1 && <ActivityPagination />}
                </>
              )}
            </CardBody>
          </Card>
        </Col>

        {/* Rewards (only visible for own profile) */}
        {targetUserId === currentUser.id && (
          <Col md={6}>
            <Card className="mb-4">
              <CardHeader className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">{t('gamification.profile.availableRewards')}</h5>
                <Badge color="info" pill className="px-3 py-2">
                  {rewards.availablePoints} {t('gamification.points')}
                </Badge>
              </CardHeader>
              <CardBody>
                {rewards.rewards.length === 0 ? (
                  <div className="text-center text-muted py-3">
                    <i className="ri-gift-line display-4"></i>
                    <p>{t('gamification.profile.earnMorePoints')}</p>
                  </div>
                ) : (
                  <>
                    <ListGroup>
                      {paginatedRewards.map(reward => (
                        <ListGroupItem key={reward._id} className="d-flex justify-content-between align-items-center">
                          <div>
                            <div className="reward-name">{reward.name}</div>
                            <div className="reward-description text-muted">{reward.description}</div>
                          </div>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleRedeemReward(reward._id)}
                            disabled={rewards.availablePoints < reward.pointCost}
                          >
                            {t('gamification.profile.redeemFor', { points: reward.pointCost })}
                          </button>
                        </ListGroupItem>
                      ))}
                    </ListGroup>
                    {totalRewardsPages > 1 && <RewardsPagination />}
                  </>
                )}

                {/* Redeemed Rewards */}
                {profile.redeemedRewards && profile.redeemedRewards.length > 0 && (
                  <div className="mt-4">
                    <h6>{t('gamification.profile.redeemedRewards')}</h6>
                    <ListGroup>
                      {paginatedRedeemedRewards.map(reward => (
                        <ListGroupItem key={reward.id}>
                          <div className="d-flex justify-content-between">
                            <div>
                              <div>{reward.name}</div>
                              <div className="text-muted">{formatDate(reward.redeemedAt)}</div>
                            </div>
                            <Badge color={reward.isUsed ? 'secondary' : 'success'}>
                              {t('gamification.profile.code')}: {reward.code}
                            </Badge>
                          </div>
                        </ListGroupItem>
                      ))}
                    </ListGroup>
                    {totalRedeemedRewardsPages > 1 && <RedeemedRewardsPagination />}
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
};

GamificationProfile.propTypes = {
  t: PropTypes.func.isRequired,
  userId: PropTypes.string
};

export default withTranslation()(GamificationProfile);