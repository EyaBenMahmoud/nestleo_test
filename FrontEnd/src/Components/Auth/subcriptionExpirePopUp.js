import React from 'react';
import { Button } from 'reactstrap';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const SubscriptionExpiredOverlay = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  return (
    <div className="subscription-expired-overlay">
      <div className="subscription-expired-content">
        <div className="icon-container">
          <i className="ri-timer-line"></i>
        </div>
        <h3>{t('subscription.expiredTitle')}</h3>
        <p>{t('subscription.expiredMessage')}</p>
        <Button 
          color="primary" 
          className="subscribe-now-btn"
          onClick={() => navigate('/landing')}
        >
          {t('subscription.subscribeNow')}
        </Button>
      </div>
      <style jsx>{`
        .subscription-expired-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(4px);
          z-index: 1050;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        
        .subscription-expired-content {
          background: white;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          padding: 30px;
          text-align: center;
          max-width: 500px;
          width: 100%;
        }
        
        .icon-container {
          width: 70px;
          height: 70px;
          background-color: #fff5f6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }
        
        .icon-container i {
          font-size: 32px;
          color: #e6485c;
        }
        
        h3 {
          margin-bottom: 15px;
          color: #343a40;
          font-weight: 600;
        }
        
        p {
          color: #6c757d;
          margin-bottom: 25px;
          font-size: 16px;
        }
        
        .subscribe-now-btn {
          padding: 10px 24px;
          font-weight: 500;
          font-size: 16px;
        }
        
        /* Dark mode support */
        [data-layout-mode="dark"] .subscription-expired-overlay {
          background-color: rgba(31, 35, 47, 0.9);
        }
        
        [data-layout-mode="dark"] .subscription-expired-content {
          background: #2a3042;
        }
        
        [data-layout-mode="dark"] .icon-container {
          background-color: #31374a;
        }
        
        [data-layout-mode="dark"] h3 {
          color: #e9ecef;
        }
        
        [data-layout-mode="dark"] p {
          color: #a6b0cf;
        }
      `}</style>
    </div>
  );
};

export default SubscriptionExpiredOverlay;