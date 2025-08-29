import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useTranslation } from 'react-i18next';
import api from "../../../services/api";
import { loginUserWithGoogle, setisUserLoggedIn, logout } from "../../../slices/login/loginSlice";
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from "reactstrap";
import { FaExclamationTriangle, FaBuilding } from "react-icons/fa";
import logoLight from "../../../assets/images/logo-light.png";
import AuthSlider from '../../../pages/AuthenticationInner/authCarousel';

// Import the Nestleo auth styling
import "../../../assets/scss/pages/_nestleoAuth.scss";

const BuildingInput = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [buildingCode, setBuildingCode] = useState("");
  const [buildingError, setBuildingError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [showInactiveModal, setShowInactiveModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const handleVerifyBuilding = async () => {
    if (!buildingCode) {
      setBuildingError(t('buildingInput.enterCode'));
      return;
    }

    setVerifying(true);
    try {
      const response = await api.get(`${process.env.REACT_APP_API_URL}/api/subscriptions/matricule/${buildingCode}`);
      if (!response.data) {
        setBuildingError(t('buildingInput.notFound'));
        setVerifying(false);
        return;
      }

      const buildingId = response.data._id;
      localStorage.setItem("buildingId", buildingId);

      let user = localStorage.getItem("user");
      if (user) {
        user = JSON.parse(user);
        user.buildingId = buildingId;
        const tok = localStorage.getItem("token");
        
        try {
          // Save current user info before clearing localStorage
          setCurrentUser(user);
          
          // First, clear localStorage to avoid data confusion
          localStorage.clear();
          
          // Dispatch login action
          const actionResult = await dispatch(
            loginUserWithGoogle({
              email: user.email,
              token: tok,
              role: user.role,
              buildingId: buildingId,
            })
          );

          // Check if user is active
          const userData = actionResult.payload;
          if (userData && userData.user && !userData.user.isActive) {
            // User account is inactive, show modal
            setShowInactiveModal(true);
          } else {
            // User account is active, redirect to landing
            dispatch(setisUserLoggedIn(true));
            navigate("/dashboard", { replace: true });
          }
        } catch (error) {
          console.error("Error creating user:", error);
          setBuildingError(t('buildingInput.failedToCreateUser'));
        }
      } else {
        setBuildingError(t('buildingInput.noUserInfo'));
        console.error("No user found in local storage!");
      }
    } catch (error) {
      setBuildingError(t('buildingInput.verificationError'));
      console.error("Error verifying building:", error);
    } finally {
      setVerifying(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    setShowInactiveModal(false);
    navigate("/landing", { replace: true });
  };

  const handleBackToLogin = () => {
    dispatch(logout());
    navigate("/connect", { replace: true });
  };
  
  const handleGoToRegister = () => {
    dispatch(logout());
    navigate("/registerr", { replace: true });
  };

  return (
    <div className="nestly-auth-wrapper">
      <div className="nestly-bg-overlay"></div>
      <div className="container">
        <div className="nestly-auth-card">
          <div className="nestly-auth-row">
            {/* Left Column with Slider */}
            <div className="nestly-auth-col-left">
              <div className="nestly-auth-slider">
                <AuthSlider />
              </div>
            </div>
            
            {/* Right Column with Form */}
            <div className="nestly-auth-col-right">
              <div className="nestly-auth-header">
                <div className="mb-4 text-center">
                  <Link to="/" className="d-inline-block">
                    <img src={logoLight} alt="Nestleo" height="30" />
                  </Link>
                </div>
                <h3>{t('buildingInput.verification')}</h3>
                <p>{t('buildingInput.enterCodeToContinue')}</p>
              </div>

              {buildingError && (
                <div className="nestly-alert nestly-alert-danger">
                  {buildingError}
                </div>
              )}

              <div className="p-2 mt-4">
                <div className="nestly-form-group">
                  <label className="form-label">{t('buildingInput.code')}</label>
                  <div className="nestly-password-group">
                    <input
                      type="text"
                      className="nestly-form-control"
                      value={buildingCode}
                      onChange={(e) => setBuildingCode(e.target.value)}
                      placeholder={t('buildingInput.enterBuildingCode')}
                    />
                    <span className="nestly-password-toggle">
                      <FaBuilding />
                    </span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <button
                    type="button"
                    className="nestly-btn nestly-btn-primary nestly-btn-block"
                    onClick={handleVerifyBuilding}
                    disabled={verifying}
                  >
                    {verifying ? (
                      <>
                        <span className="nestly-spinner"></span>
                        {t('buildingInput.verifying')}
                      </>
                    ) : (
                      t('buildingInput.verifyCode')
                    )}
                  </button>
                </div>
                
                <div className="mt-4 text-center">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inactive Account Modal */}
      <Modal isOpen={showInactiveModal} toggle={() => setShowInactiveModal(!showInactiveModal)} centered className="account-inactive-modal">
        <ModalHeader toggle={() => setShowInactiveModal(!showInactiveModal)} className="border-0 pb-0">
          <div className="d-flex align-items-center">
            <div className="modal-icon-container warning-icon me-3">
              <FaExclamationTriangle size={20} />
            </div>
            <h5 className="modal-title mb-0">{t('buildingInput.accountPendingApproval')}</h5>
          </div>
        </ModalHeader>
        <ModalBody className="pt-3 pb-4">
          <div className="text-center mb-4">
            <div className="waiting-animation">
              <div className="circle-pulse"></div>
            </div>
          </div>
          <div className="account-inactive-message p-3">
            <p className="mb-3">{t('buildingInput.accountInactiveMessage')}</p>
            <p className="mb-3">{t('buildingInput.emailNotification')}</p>
            <p className="mb-0 fw-medium">{t('buildingInput.thankYouPatience')}</p>
          </div>
        </ModalBody>
        <ModalFooter className="border-0 pt-0">
          <Button color="primary" onClick={handleLogout} className="px-4 nestly-btn-primary">
            {t('buildingInput.iUnderstand')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Add these styles */}
      <style jsx>{`
        .modal-icon-container.warning-icon {
          background: rgba(255, 152, 0, 0.1);
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ff9800;
        }
        
        .waiting-animation {
          position: relative;
          width: 120px;
          height: 120px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .circle-pulse {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background-color: rgba(230, 72, 92, 0.7);
          position: absolute;
          animation: pulse-animation 2s infinite;
        }
        
        .circle-pulse:after {
          content: "";
          position: absolute;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background-color: white;
          top: 10px;
          left: 10px;
          z-index: 1;
        }
        
        .account-inactive-message {
          background-color: rgba(230, 72, 92, 0.05);
          border-radius: 8px;
        }
        
        @keyframes pulse-animation {
          0% {
            box-shadow: 0 0 0 0 rgba(230, 72, 92, 0.4);
          }
          70% {
            box-shadow: 0 0 0 25px rgba(230, 72, 92, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(230, 72, 92, 0);
          }
        }
      `}</style>
    </div>
  );
};

export default BuildingInput;