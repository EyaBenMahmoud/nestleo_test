import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardBody, CardHeader, Spinner, Button, Badge } from 'reactstrap';
import { useSelector } from 'react-redux';
import { withTranslation } from "react-i18next";
import PropTypes from 'prop-types';
import api from '../../services/api';
import avatar1 from "../../assets/images/users/avatar-1.jpg";
import "./leaderBoard.css";

const GamificationLeaderboard = ({ t }) => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leaderboardType, setLeaderboardType] = useState('all-time');
  const [topPerformer, setTopPerformer] = useState(null);

  // Get current user from Redux
  const user = useSelector(state => state.Loginn?.user);
  // Get current building from Redux
  const currentBuilding = useSelector(state => state.Building?.currentBuilding);
  const buildingId = currentBuilding?._id;

  // Handle leaderboard period type change
  const handleTypeChange = useCallback((type) => {
    setLeaderboardType(type);
  }, []);

  // Function to get building-specific gamification data for user
  const getBuildingGamification = useCallback((user, buildingId) => {
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
  }, []);

  // Move the fetch logic outside of useEffect to a memoized function
  const fetchData = useCallback(async () => {
    if (!buildingId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Fetch leaderboard data
      const response = await api.get(`/api/gamification/leaderboard/${buildingId}?type=${leaderboardType}`);
      
      // Process the response data
      if (response.data?.success && response.data?.data) {
        setLeaderboardData(response.data.data);
      } else if (Array.isArray(response.data)) {
        setLeaderboardData(response.data);
      } else {
        setLeaderboardData([]);
      }

      // Fetch top performer - direct API fetch to ensure we get the latest data
      const topResponse = await api.get(`/api/gamification/top-performer/${buildingId}`);
      
      if (topResponse.data?.success && topResponse.data?.data) {
        // If the response has the new API format
        setTopPerformer(topResponse.data.data);
      } else if (topResponse.data?.id) {
        // If the response has the old API format
        setTopPerformer(topResponse.data);
      } else {
        setTopPerformer(null);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(t('gamification.leaderboard.loadError'));
    } finally {
      setLoading(false);
    }
  }, [buildingId, leaderboardType, t]);

  // Fetch leaderboard data when building or type changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get user's rank in leaderboard - memoize this calculation
  const getUserRank = useCallback(() => {
    if (!user || !leaderboardData?.length) return null;

    const userId = user.id?.toString() || user._id?.toString();
    if (!userId) return null;

    const currentUserRank = leaderboardData.findIndex(item =>
      (item.id?.toString() || item._id?.toString()) === userId
    ) + 1;

    if (currentUserRank === 0) {
      return { rank: leaderboardData.length + 1, total: leaderboardData.length + 1 };
    }

    return { rank: currentUserRank, total: leaderboardData.length };
  }, [user, leaderboardData]);

  const userRank = getUserRank();

  const getRankBadge = useCallback((rank) => {
    if (rank === 1) return t('gamification.leaderboard.topPerformer');
    if (rank === 2) return t('gamification.leaderboard.runnerUp');
    if (rank === 3) return t('gamification.leaderboard.thirdPlace');
    return null;
  }, [t]);

  // Show message when no building is selected
  if (!buildingId) {
    return (
      <Card className="gamification-leaderboard-card">
        <CardBody className="text-center py-5">
          <div className="display-6 text-muted mb-4">
            <i className="ri-building-2-line"></i>
          </div>
          <h5>{t('gamification.leaderboard.selectBuilding')}</h5>
          <p className="text-muted">
            {t('gamification.leaderboard.selectBuildingMessage')}
          </p>
        </CardBody>
      </Card>
    );
  }
  
  // Function to get building-specific points for top performer
  const getTopPerformerPoints = () => {
    if (!topPerformer) return 0;
    
    if (topPerformer.gamification?.buildings && buildingId) {
      const buildingData = topPerformer.gamification.buildings[buildingId];
      return buildingData ? 
        (leaderboardType === 'monthly' ? buildingData.monthlyPoints : buildingData.totalPoints) : 0;
    }
    
    // Direct points field from API
    if (topPerformer.points) {
      return topPerformer.points;
    }
    
    return 0;
  };

  return (
    <Card className="gamification-leaderboard-card">
      <CardHeader className="d-flex justify-content-between align-items-center flex-wrap">
        <div>
          <h5 className="card-title mb-0">
            {currentBuilding?.name 
              ? t('gamification.leaderboard.buildingName', { name: currentBuilding.name })
              : t('gamification.leaderboard.title')}
          </h5>
          {userRank && user?.role === 'SyndicateCoowner' && (
            <div className="mt-1">
              <small className="text-muted">{t('gamification.leaderboard.yourRank')}: </small>
              <Badge color="primary" pill>#{userRank.rank} {t('gamification.leaderboard.of')} {userRank.total}</Badge>
            </div>
          )}
        </div>

        <div className="d-flex flex-wrap gap-2 align-items-center mt-2 mt-md-0">
          <div className="btn-group">
            <Button
              size="sm"
              color={leaderboardType === 'all-time' ? 'primary' : 'light'}
              onClick={() => handleTypeChange('all-time')}
            >
              {t('gamification.leaderboard.allTime')}
            </Button>
            <Button
              size="sm"
              color={leaderboardType === 'monthly' ? 'primary' : 'light'}
              onClick={() => handleTypeChange('monthly')}
            >
              {t('gamification.leaderboard.monthly')}
            </Button>
          </div>
          <Button
            size="sm"
            color="light"
            onClick={fetchData}
            title={t('gamification.leaderboard.refreshTitle')}
          >
            <i className="ri-refresh-line"></i>
          </Button>
        </div>
      </CardHeader>
      <CardBody>
        {/* Top performer section */}
        {topPerformer && (
          <div className="top-performer-section mb-4">
            <div className="top-performer-layout">
              {/* Left - Profile Image */}
              <div className="top-performer-avatar-container">
                <div className="top-performer-avatar">
                  <img
                    src={topPerformer.avatar || avatar1}
                    alt={topPerformer.name}
                    className="rounded-circle"
                  />
                  <div className="top-badge">
                    <i className="ri-trophy-line text-warning" color='white'></i>
                  </div>
                </div>
              </div>

              {/* Middle - Name and Points */}
              <div className="top-performer-info">
                <h6 className="text-muted mb-1">{t('gamification.leaderboard.coOwnerOfMonth')}</h6>
                <h3 className="performer-name">{topPerformer.name}</h3>
                <div className="performer-points">
                  <i className="ri-medal-line me-1 text-warning"></i>
                  <span className="text-warning fw-bold">
                    {getTopPerformerPoints()} {t('gamification.points')}
                  </span>
                </div>
              </div>

              {/* Right - Streak Indicators */}
              <div className="streaks-container">
                <div className="streak-item">
                  <div className="streak-circle bg-soft-success">
                    <i className="ri-money-dollar-circle-line text-success"></i>
                  </div>
                  <div className="streak-value">
                    {buildingId && topPerformer.gamification?.buildings?.[buildingId]?.paymentStreak || 
                      topPerformer.gamification?.paymentStreak || 0}
                  </div>
                  <div className="streak-label">{t('gamification.leaderboard.paymentStreak')}</div>
                </div>

                <div className="streak-item">
                  <div className="streak-circle bg-soft-info">
                    <i className="ri-calendar-check-line text-info"></i>
                  </div>
                  <div className="streak-value">
                    {buildingId && topPerformer.gamification?.buildings?.[buildingId]?.meetingStreak || 
                      topPerformer.gamification?.meetingStreak || 0}
                  </div>
                  <div className="streak-label">{t('gamification.leaderboard.attendanceStreak')}</div>
                </div>

                <div className="streak-item">
                  <div className="streak-circle bg-soft-warning">
                    <i className="ri-task-line text-warning"></i>
                  </div>
                  <div className="streak-value">
                    {buildingId && topPerformer.gamification?.buildings?.[buildingId]?.votingStreak || 
                      topPerformer.gamification?.votingStreak || 0}
                  </div>
                  <div className="streak-label">{t('gamification.leaderboard.votingStreak')}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-4">
            <Spinner color="primary" />
          </div>
        ) : error ? (
          <div className="text-center text-danger py-4">{error}</div>
        ) : (
          <div className="leaderboard-list">
            {Array.isArray(leaderboardData) && leaderboardData.length > 0 ? (
              leaderboardData.map((item, index) => (
                <div
                  key={item.id || item._id || index}
                  className={`leaderboard-item ${(item.id === user?.id || item._id === user?._id) ? 'current-user' : ''}`}
                >
                  <div className={`leaderboard-rank rank-${index + 1}`}>
                    {index + 1}
                  </div>
                  <div className="leaderboard-avatar">
                    <img
                      src={item.avatar || avatar1}
                      alt={item.name}
                      className="rounded-circle"
                    />
                    {index < 3 && (
                      <div className={`rank-badge rank-${index + 1}`}>
                        {index === 0 && <i className="ri-vip-crown-fill"></i>}
                        {index === 1 && <i className="ri-medal-fill"></i>}
                        {index === 2 && <i className="ri-award-fill"></i>}
                      </div>
                    )}
                  </div>
                  <div className="leaderboard-name">
                    {item.name}
                    {getRankBadge(index + 1) && (
                      <Badge
                        color={index === 0 ? 'warning' : index === 1 ? 'info' : 'secondary'}
                        pill
                        className="ms-2"
                      >
                        {getRankBadge(index + 1)}
                      </Badge>
                    )}
                  </div>
                  <div className="leaderboard-points">
                    {item.points} {t('gamification.points')}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted">
                {t('gamification.leaderboard.noData')}
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
};

GamificationLeaderboard.propTypes = {
  t: PropTypes.func.isRequired,
};

export default withTranslation()(GamificationLeaderboard);