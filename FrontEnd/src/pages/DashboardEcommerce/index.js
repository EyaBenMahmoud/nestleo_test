import React, { useEffect, useState } from "react";
import { Col, Container, Row, Button, Card, CardBody, CardHeader } from "reactstrap";
import RecentActivity from "./RecentActivity";
import Section from "./Section";
import { useDispatch, useSelector } from "react-redux";
import { disconnectSocket, initializeSocket, refreshOnlineUsers } from "../../services/socketManager";
import GamificationLeaderboard from "./GamificationLeaderBoard";
import CoownerWelcome from "./CoownerWelcome";
import AdminWelcome from "./SyndicWelcome";
import AdminSuperWelcome from "./SuperAdminWelcomePage";
import WorkerWelcome from "./WorkerWelcomePage";
import { FaBuilding } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { fetchBuildings, SetCurrentBuilding } from "../../slices/buildings/building";

const DashboardEcommerce = () => {
  document.title = "Dashboard | Nestleo - Co-owner Portal";
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { user } = useSelector(state => ({
    user: state.Loginn.user
  }));

  const isLoggedIn = useSelector(state => state.Loginn.isUserLoggedIn);
  const currentBuilding = useSelector((state) => state.Building.currentBuilding || {});
  const { buildings = [] } = useSelector((state) => state.Building.buildings || []);
  
  const [buildingSelectionModalOpen, setBuildingSelectionModalOpen] = useState(false);

  // Enhanced socket connection with polling
  useEffect(() => {
    if (isLoggedIn) {
      // Initialize socket
      initializeSocket();

      // Request online users immediately
      refreshOnlineUsers();

      // Also refresh online users whenever the dashboard gains focus
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          refreshOnlineUsers();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', refreshOnlineUsers);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', refreshOnlineUsers);
      };
    } else {
      disconnectSocket();
    }
  }, [isLoggedIn]);

  // Fetch buildings on component mount
  useEffect(() => {
    if (user.role === "SyndicateAdmin" || user.role === "SyndicateCoowner") {
      dispatch(fetchBuildings());
    }
  }, [dispatch, user.role]);

  const handleOpenBuildingSelection = () => {
    setBuildingSelectionModalOpen(true);
  };

  const [rightColumn, setRightColumn] = useState(true);
  const toggleRightColumn = () => {
    setRightColumn(!rightColumn);
  };

  // Building selection placeholder for roles that need building selection
// Building selection placeholder for roles that need building selection
const BuildingSelectionPlaceholder = () => {
  return (
    <>
      {/* Welcome Card */}
      <Card className="mb-4 welcome-card overflow-hidden">
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
            <Col md={8}>
              <div>
                <h3 className="fw-semibold mb-2">{t('dashboards.welcomeTitle')}</h3>
                <h5 className="text-muted fw-normal mb-3">{t('dashboards.welcomeMessage', {name: user.firstName || 'User'})}</h5>
                <p className="mb-4">
                  {t('dashboards.welcomeDescription')}
                </p>
              
              </div>
            </Col>
     
          </Row>
        </CardBody>
      </Card>

      {/* Building Selection Card */}
      <Card className="mb-4">
        <CardBody className="text-center p-5">
          <div className="mb-4">
            <div className="avatar-lg mx-auto">
              <div className="avatar-title bg-light text-primary rounded-circle">
                <FaBuilding size={40} />
              </div>
            </div>
          </div>
          <h5 className="mb-3">{t('buildingsDrop.selectBuilding')}</h5>
          <p className="text-muted mb-4">
            {t('buildingsDrop.selectBuildingDescription')}
          </p>
     
        </CardBody>
      </Card>

    </>
  );
};

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          {/* Display content based on user role */}
          {user.role === "SyndicateCoowner" ? (
            // Co-owner welcome view
            currentBuilding?._id ? (
              <CoownerWelcome user={user} />
            ) : (
              <BuildingSelectionPlaceholder />
            )
          ) : (user.role === "SyndicateAdmin") ? (
            // Admin view
            currentBuilding?._id ? (
              <Row>
                <AdminWelcome user={user} />
                <Col lg={6}>
                  <RecentActivity />
                </Col>
              </Row>
            ) : (
              <BuildingSelectionPlaceholder />
            )
          ) : (user.role === "SuperAdmin" || user.role === "Admin") ? (
            // SuperAdmin and Admin view - these don't require building selection
            <AdminSuperWelcome />
          ) : (user.role === "Worker") ? (
            // Worker view
            currentBuilding?._id ? (
              <WorkerWelcome user={user} />
            ) : (
              <BuildingSelectionPlaceholder />
            )
          ) : (
            // Default view for other roles
            <div>
              {/* Other role-specific content */}
            </div>
          )}
        </Container>
      </div>

      {/* Building Selection Modal */}
      {buildingSelectionModalOpen && (
        <div className="building-selection-modal-overlay">
          <div className="building-selection-modal">
            <div className="modal-header-custom d-flex justify-content-between align-items-center">
              <span>{t('buildingsDrop.selectYourBuilding')}</span>
              <button className="btn-close" onClick={() => setBuildingSelectionModalOpen(false)}></button>
            </div>

            <div className="modal-body p-4">
              <div className="text-center mb-4">
                <div className="buildings-icon">
                  <i className="ri-building-4-line"></i>
                </div>
              </div>

              <h5 className="mb-4 text-center">
                {t('buildingsDrop.pleaseSelectBuilding')}
              </h5>

              {/* Building list */}
              <div className="building-list">
                {buildings.map((building) => (
                  <div
                    key={building._id}
                    className="building-option"
                    onClick={() => {
                      dispatch(SetCurrentBuilding(building));
                      setBuildingSelectionModalOpen(false);
                    }}
                  >
                    <i className="ri-building-line me-2"></i>
                    <div className="d-flex justify-content-between w-100 align-items-center">
                      <span>{building.name}</span>
                    </div>
                  </div>
                ))}

                {buildings.length === 0 && (
                  <div className="text-center text-muted py-4">
                    <i className="ri-building-line fs-1 mb-2"></i>
                    <p>{t('buildingsDrop.noBuildingsAvailable')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


    </React.Fragment>
  );
};

export default DashboardEcommerce;