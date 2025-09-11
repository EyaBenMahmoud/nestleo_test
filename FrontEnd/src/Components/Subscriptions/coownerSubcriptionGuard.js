import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { isInTrialPeriod } from './SubcriptionValidator';
import { isBuildingAdminSubscriptionActive } from './subcriptionStatus';

const SubscriptionGuard = ({ children }) => {
  const { t } = useTranslation();
  const [showOverlay, setShowOverlay] = useState(false);
  const { user } = useSelector((state) => state.Loginn);
  const { currentBuilding } = useSelector((state) => state.Building);
  
  useEffect(() => {
    // Function to check if user has subscription access
    const checkSubscriptionAccess = () => {
      // If no user is logged in, don't show overlay
      if (!user) return false;
      
      // Check based on user role
      if (user.role === 'SyndicateAdmin') {
        // Admin access depends on their own subscription
        const inTrialPeriod = isInTrialPeriod(user);
        
        if (inTrialPeriod) {
          // Trial period access is allowed
          return false;
        } else {
          // Need active subscription
          return !(user.subscription && user.subscription.status === 'active');
        }
      } 
      else if (user.role === 'SyndicateCoowner') {
        // Co-owner access depends on building admin's subscription
        if (!currentBuilding) {
          // No building selected, don't block access
          return false;
        }
        
        // Check the admin's subscription for the building
        return !isBuildingAdminSubscriptionActive(currentBuilding);
      }
      
      // For other roles like superadmin, no restrictions
      return false;
    };

    setShowOverlay(checkSubscriptionAccess());
  }, [user, currentBuilding]);

  return (
    <div className="position-relative">
      {children}
      {showOverlay && (
        <div className="subscription-overlay">
          <div className="subscription-message">
            <i className="ri-lock-2-line fs-1 mb-2"></i>
            <h4>{t('subscription.featureNotAvailable')}</h4>
            <p className="mb-3">{t('subscription.subscriptionRequired')}</p>
            {user?.role === 'SyndicateAdmin' ? (
              <a href="/subscription" className="btn btn-primary">
                {t('subscription.viewPlans')}
              </a>
            ) : (
              <p className="text-muted small">
                {t('subscription.contactBuildingAdmin')}
              </p>
            )}
          </div>
        </div>
      )}
      <style jsx="true">{`
        .subscription-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .subscription-message {
          background-color: white;
          padding: 2rem;
          border-radius: 8px;
          text-align: center;
          max-width: 400px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        [data-layout-mode="dark"] .subscription-message {
          background-color: #2a3042;
          color: #e9ecef;
        }
      `}</style>
    </div>
  );
};

export default SubscriptionGuard;