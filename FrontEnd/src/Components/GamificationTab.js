import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { withTranslation } from "react-i18next";
import PropTypes from 'prop-types';
import {
  Container, Row, Col, Card, CardHeader, CardBody,
  Button, Badge, Progress, Nav, NavItem, NavLink, TabContent, TabPane
} from 'reactstrap';
import BreadCrumb from "./Common/BreadCrumb";
import { FaBuilding, FaCalendarAlt, FaTrophy, FaMedal, FaStar, FaChartLine } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import BuildingSettings from "./Hooks/buildingSelectGamification";

const GamificationTab = ({ t }) => {
  document.title = `${t('gamification.title')} | Nestleo`;
  
  const { user } = useSelector((state) => state.Loginn || {});
  const [activeTab, setActiveTab] = useState('achievements');
  
  // Mock data for gamification stats - replace with actual data from your API
  const userPoints = user?.gamification?.points || 0;
  const userLevel = user?.gamification?.level || 1;
  const userRank = user?.gamification?.rank || "Beginner";
  const totalActivities = user?.gamification?.totalActivities || 0;
  const completedActivities = user?.gamification?.completedActivities || 0;
  
  // Calculate completion percentage
  const completionPercentage = totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;
  
  // Calculate level progress
  const pointsForNextLevel = userLevel * 100;
  const pointsFromPreviousLevel = (userLevel - 1) * 100;
  const levelProgressPercentage = ((userPoints - pointsFromPreviousLevel) / (pointsForNextLevel - pointsFromPreviousLevel)) * 100;
  
  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title={t('gamification.title')} pageTitle={t('gamification.pageTitle')} />

          {/* Welcome Back Card */}
          <Row className="mb-4">
            <Col>
              <Card className="welcome-card overflow-hidden">
                <div className="position-absolute end-0 start-0 top-0 z-0"
                  style={{ height: '100%', background: 'linear-gradient(90deg, #e4f1ff, #d8edff, #c7e5ff)' }}>
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
                        <h4 className="fw-semibold mb-2">{t('gamification.welcomeTitle')}</h4>
                        <p className="mb-3 text-muted">
                          {t('gamification.welcomeDescription')}
                        </p>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="text-end">
                        <div className="d-flex justify-content-end">
                          <Button color="primary" tag={Link} to="/dashboard" className="me-2">
                            <FaBuilding className="me-1" /> {t('gamification.dashboard')}
                          </Button>
                          <Button color="success" tag={Link} to="/calendar">
                            <FaCalendarAlt className="me-1" /> {t('gamification.calendar')}
                          </Button>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </CardBody>
              </Card>
            </Col>
          </Row>

          {/* Stats Row */}
          {/* <Row className="mb-4">
            <Col sm={6} xl={3}>
              <Card className="card-animate">
                <CardBody>
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <h6 className="text-muted mb-3">{t('gamification.totalPoints')}</h6>
                      <h2 className="ff-secondary mb-0">{userPoints}</h2>
                    </div>
                    <div className="avatar-sm flex-shrink-0">
                      <span className="avatar-title bg-soft-primary text-primary rounded-circle fs-4">
                        <FaStar />
                      </span>
                    </div>
                  </div>
                </CardBody>
                <div className="animation-effect-1"></div>
                <div className="animation-effect-2"></div>
                <div className="animation-effect-3"></div>
              </Card>
            </Col>
            <Col sm={6} xl={3}>
              <Card className="card-animate">
                <CardBody>
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <h6 className="text-muted mb-3">{t('gamification.currentLevel')}</h6>
                      <h2 className="ff-secondary mb-0">{userLevel}</h2>
                    </div>
                    <div className="avatar-sm flex-shrink-0">
                      <span className="avatar-title bg-soft-info text-info rounded-circle fs-4">
                        <FaTrophy />
                      </span>
                    </div>
                  </div>
                </CardBody>
                <div className="animation-effect-1"></div>
                <div className="animation-effect-2"></div>
                <div className="animation-effect-3"></div>
              </Card>
            </Col>
            <Col sm={6} xl={3}>
              <Card className="card-animate">
                <CardBody>
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <h6 className="text-muted mb-3">{t('gamification.rank')}</h6>
                      <h2 className="ff-secondary mb-0">{userRank}</h2>
                    </div>
                    <div className="avatar-sm flex-shrink-0">
                      <span className="avatar-title bg-soft-success text-success rounded-circle fs-4">
                        <FaMedal />
                      </span>
                    </div>
                  </div>
                </CardBody>
                <div className="animation-effect-1"></div>
                <div className="animation-effect-2"></div>
                <div className="animation-effect-3"></div>
              </Card>
            </Col>
            <Col sm={6} xl={3}>
              <Card className="card-animate">
                <CardBody>
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <h6 className="text-muted mb-3">{t('gamification.completion')}</h6>
                      <h2 className="ff-secondary mb-0">{completionPercentage}%</h2>
                    </div>
                    <div className="avatar-sm flex-shrink-0">
                      <span className="avatar-title bg-soft-warning text-warning rounded-circle fs-4">
                        <FaChartLine />
                      </span>
                    </div>
                  </div>
                </CardBody>
                <div className="animation-effect-1"></div>
                <div className="animation-effect-2"></div>
                <div className="animation-effect-3"></div>
              </Card>
            </Col>
          </Row> */}         
          {/* Building Selection */}
          <Row className="mb-4">
            <Col lg={12}>
              <Card>
                <CardBody>
                  <BuildingSettings />
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Add CSS for the nestly-card-header */}
      <style jsx>{`
        .nestly-card-header {
          background: linear-gradient(90deg, #f8f9fa, #e9ecef);
          padding: 15px 20px;
          border-bottom: 0;
        }
        
        .welcome-card {
          background: white;
        }

        .card-animate {
          transition: all 0.3s ease-in-out;
        }

        .card-animate:hover {
          transform: translateY(-5px);
        }

        .animation-effect-1,
        .animation-effect-2,
        .animation-effect-3 {
          position: absolute;
          z-index: -1;
          background-color: rgba(32, 107, 196, 0.05);
          border-radius: 50%;
        }

        .animation-effect-1 {
          width: 70px;
          height: 70px;
          top: -30px;
          right: 0;
        }

        .animation-effect-2 {
          width: 50px;
          height: 50px;
          bottom: 0;
          right: -10px;
        }

        .animation-effect-3 {
          width: 30px;
          height: 30px;
          bottom: 15px;
          right: 30px;
        }
      `}</style>
    </React.Fragment>
  );
};

GamificationTab.propTypes = {
  t: PropTypes.func.isRequired,
};

export default withTranslation()(GamificationTab);