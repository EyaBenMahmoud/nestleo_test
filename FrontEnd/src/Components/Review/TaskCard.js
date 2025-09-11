import React from 'react';
import { Badge, Button } from 'reactstrap';
import { FaPlus, FaStar, FaUser } from 'react-icons/fa';
import { withTranslation } from 'react-i18next';

const TaskCard = ({ task, handleOpenTaskReviewModal, t }) => {
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  return (
    <div className="worker-card">
      <div className="mb-3">
        <h6 className="font-weight-bold mb-2">{task.title}</h6>
        <div className="worker-meta">
          <div className="mb-1">{t('reviews.completed')}: {formatDate(task.updatedAt)}</div>
          {task.assignedTo && (
            <div className="d-flex align-items-center mb-1">
              <FaUser className="mr-1" size="0.8em" />
              {task.assignedTo.firstName} {task.assignedTo.lastName}
            </div>
          )}
          {task.building?.name && (
            <div className="location-icon">
              {task.building.name}
            </div>
          )}
        </div>
      </div>
      <div className="d-flex">
        {task.hasReview ? (
          <>
            <Badge color="success" className="add-review-btn ml-auto ">
              <FaStar className="mr-1" size="0.7em" /> {t('reviews.reviewed')}
            </Badge>
            <Button 
              size="sm" 
              color="primary"
              className="add-review-btn ml-auto"
              onClick={() => handleOpenTaskReviewModal(task)}
            >
              {t('reviews.editReview')}
            </Button>
          </>
        ) : (
          <Button 
            size="sm" 
            color="primary"
            className="add-review-btn ml-auto"
            onClick={() => handleOpenTaskReviewModal(task)}
          >
            <FaPlus className="add-review-icon" /> {t('reviews.review')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default withTranslation()(TaskCard);