import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, CardBody, Spinner } from 'reactstrap';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const BuildingTransferConfirmation = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const confirmTransfer = async () => {
      try {
        // Use axios directly without auth token for this public endpoint
        const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        await axios.get(`${baseURL}/api/Building/confirm-transfer/${token}`);
        
        // No matter what happens, redirect to building interface after a short delay
        setTimeout(() => {
          navigate('/buildingInterface');
        }, 2000);
        
      } catch (error) {
        console.error('Building transfer confirmation error:', error);
        // Even on error, redirect to building interface
        setTimeout(() => {
          navigate('/buildingInterface');
        }, 2000);
      }
    };

    confirmTransfer();
  }, [token, navigate]);

  return (
    <div className="auth-page-wrapper pt-5">
      <div className="auth-one-bg-position auth-one-bg" id="auth-particles">
        <div className="bg-overlay"></div>
        <div className="shape">
          <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1440 120">
            <path d="M 0,36 C 144,53.6 432,123.2 720,124 C 1008,124.8 1296,56.8 1440,40L1440 140L0 140z"></path>
          </svg>
        </div>
      </div>

      <div className="auth-page-content">
        <Container>
          <div className="row justify-content-center">
            <div className="col-md-8 col-lg-6 col-xl-5">
              <Card className="mt-4">
                <CardBody className="p-4">
                  <div className="text-center mt-2">
                    <h5 className="text-primary">{t('buildingTransfer.confirmTransfer')}</h5>
                    <p className="text-muted">{t('buildingTransfer.confirmTransferSubtitle')}</p>
                  </div>
                  
                  <div className="text-center py-5">
                    <Spinner size="lg" color="primary" className="mb-3" />
                    <h4>{t('buildingTransfer.confirmingTransfer')}</h4>
                    <p className="text-muted">{t('buildingTransfer.pleaseWait')}</p>
                    <p className="text-muted small">{t('buildingTransfer.redirecting')}</p>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
};

export default BuildingTransferConfirmation;
