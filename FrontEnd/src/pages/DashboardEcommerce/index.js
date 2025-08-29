import React, { useEffect, useState } from "react";
import { Col, Container, Row } from "reactstrap";
import RecentActivity from "./RecentActivity";
import Section from "./Section";
import { useDispatch, useSelector } from "react-redux";
import { disconnectSocket, initializeSocket, refreshOnlineUsers } from "../../services/socketManager";
import GamificationLeaderboard from "./GamificationLeaderBoard";
import CoownerWelcome from "./CoownerWelcome";
import AdminWelcome from "./SyndicWelcome";
import AdminSuperWelcome from "./SuperAdminWelcomePage";
import WorkerWelcome from "./WorkerWelcomePage";

const DashboardEcommerce = () => {
  document.title = "Dashboard | Nestleo - Co-owner Portal";
  const dispatch = useDispatch();
  const { user } = useSelector(state => ({
    user: state.Loginn.user
  }));

  const isLoggedIn = useSelector(state => state.Loginn.isUserLoggedIn);

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
        disconnectSocket();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', refreshOnlineUsers);
      };
    } else {
      disconnectSocket();
    }
  }, [isLoggedIn]);

  const [rightColumn, setRightColumn] = useState(true);
  const toggleRightColumn = () => {
    setRightColumn(!rightColumn);
  };

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>

          {/* Display content based on user role */}
          {user.role === "SyndicateCoowner" ? (
            // Co-owner welcome view
            <CoownerWelcome user={user} />

          ) : (user.role === "SyndicateAdmin") ? (
            // Admin view
            <Row>

              <AdminWelcome user={user} />


              <Col lg={6}>
                <RecentActivity />
              </Col>
            </Row>
          ) : (user.role === "SuperAdmin" || user.role === "Admin") ? (
            // SuperAdmin and Admin view
            <AdminSuperWelcome />
          ) : (user.role === "Worker") ? (
            // Worker view
            <WorkerWelcome user={user} />
          ) : (
            // Default view for other roles
            <div>
              {/* Other role-specific content */}
            </div>
          )}
        </Container>
      </div>
    </React.Fragment>
  );
};

export default DashboardEcommerce;