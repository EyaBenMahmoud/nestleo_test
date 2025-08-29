import React from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { hasTaskManagementAccess, isInTrialPeriod } from './SubcriptionValidator';
import PremiumFeatureAlert from './PremiumFeatureAlert';

// Import the image at the top of the file
import productReviewImage from '../../assets/images/product-review.png';

const TaskAccessGuard = ({ children }) => {
  const { user } = useSelector((state) => state.Loginn || {});
  const location = useLocation();
  
  // Check if we're on the review page
  const isReviewPage = location.pathname.includes('/review');
  
  // Set feature name based on current page
  const featureName = isReviewPage ? "Review Management" : "Task Management";
  
  // Only apply to SyndicateAdmin users
  if (user?.role !== 'SyndicateAdmin') {
    return children;
  }
  
  // Check for trial period first
  if (isInTrialPeriod(user)) {
    // Allow immediate access for trial users
    return children;
  }
  
  // For non-trial users, check if they have access to task management
  const hasAccess = hasTaskManagementAccess(user);
  
  if (!hasAccess) {
    return (
      <div className="page-content">
        <div className="container-fluid">
          <PremiumFeatureAlert featureName={featureName} />
          <div className="text-center mt-5">
            <img 
              src={productReviewImage}
              alt="Feature" 
              className="img-fluid" 
              style={{ maxWidth: '300px' }} 
            />
          </div>
        </div>
      </div>
    );
  }
  
  return children;
};

export default TaskAccessGuard;