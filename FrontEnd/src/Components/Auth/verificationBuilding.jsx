import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import { FaExclamationTriangle, FaBuilding } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import api from "../../services/api";
import AuthSlider from '../../pages/AuthenticationInner/authCarousel';
import logoLight from "../../assets/images/logo-light.png";

// Import the Nestleo auth styling
import "../../assets/scss/pages/_nestleoAuth.scss";

const VerificationBuilding = ({ onVerify }) => {
  const { t } = useTranslation();
  const [buildingId, setBuildingId] = useState('');
  const [buildingError, setBuildingError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleBuildingVerify = async () => {
    if (!buildingId) {
      setBuildingError(t('verificationBuilding.enterCode'));
      return;
    }

    setVerifying(true);
    try {
      const response = await api.get(`${process.env.REACT_APP_API_URL}/api/subscriptions/matricule/${buildingId}`);
      if (!response.data) {
        setBuildingError(t('verificationBuilding.notFound'));
        setVerifying(false);
        return;
      }

      onVerify(response.data._id); // Pass the verified building ID to the parent component
      setBuildingError('');
    } catch (err) {
      setBuildingError(t('verificationBuilding.verificationError'));
      console.error('Verification error:', err);
    } finally {
      setVerifying(false);
    }
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
                <h3>{t('verificationBuilding.verification')}</h3>
                <p>{t('verificationBuilding.enterCodeToContinue')}</p>
              </div>

              {buildingError && (
                <div className="nestly-alert nestly-alert-danger">
                  {buildingError}
                </div>
              )}

              <div className="p-2 mt-4">
                <div className="nestly-form-group">
                  <label className="form-label">{t('verificationBuilding.code')}</label>
                  <div className="nestly-password-group">
                    <input
                      type="text"
                      className="nestly-form-control"
                      value={buildingId}
                      onChange={(e) => setBuildingId(e.target.value)}
                      placeholder={t('verificationBuilding.enterBuildingCode')}
                    />
                    <span className="nestly-password-toggle">
                      <FaBuilding />
                    </span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <button
CHANTED                    type="button"
                    className="nestly-btn nestly-btn-primary nestly-btn-block"
                    onClick={handleBuildingVerify}
                    disabled={verifying}
                  >
                    {verifying ? (
                      <>
                        <span className="nestly-spinner"></span>
                        {t('verificationBuilding.verifying')}
                      </>
                    ) : (
                      t('verificationBuilding.verifyCode')
                    )}
                  </button>
                </div>
                
                <div className="mt-4 text-center">
                  <Link to="/roleSelection" className="nestly-auth-link">
                    <i className="ri-arrow-left-line" style={{ fontSize: '14px', marginRight: '4px' }}></i>
                    {t('auth.backToHome')}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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

export default VerificationBuilding;