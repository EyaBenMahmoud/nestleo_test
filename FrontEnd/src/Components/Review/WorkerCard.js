import React from 'react';
import { Button, Badge } from 'reactstrap';
import { FaPlus, FaTrophy, FaMedal } from 'react-icons/fa';
import StarRating from './StarRating';
import { withTranslation } from 'react-i18next';

const WorkerCard = ({ worker, handleSelectWorker, workerRank = null, t }) => {
  const renderRankBadge = () => {
    if (workerRank === null || workerRank > 2) return null;
    
    switch(workerRank) {
      case 0:
        return (
          <Badge className="rank-badge gold-badge ml-2">
            <FaTrophy /> #1
          </Badge>
        );
      case 1:
        return (
          <Badge className="rank-badge silver-badge ml-2">
            <FaMedal /> #2 {t('reviews.rated')}
          </Badge>
        );
      case 2:
        return (
          <Badge className="rank-badge bronze-badge ml-2">
            <FaMedal /> #3 {t('reviews.rated')}
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="worker-card">
      <div className="d-flex">
        <div className={`worker-avatar ${workerRank !== null && workerRank <= 2 ? `rank-${workerRank+1}` : ''}`}>
          {worker.firstName?.[0] || 'W'}
        </div>
        <div className="flex-grow-1">
          <div className="d-flex align-items-center flex-wrap">
            <h5 className="worker-name mb-0">
              {worker.firstName} {worker.lastName}
            </h5>
            {renderRankBadge()}
          </div>
          <div className="worker-meta">{worker.email}</div>
          <div className="worker-location">
            <div className="worker-location location-icon">
              <span>{worker.city}, {worker.country}</span>
            </div>
          </div>
          <div className="worker-reviews">
            <StarRating rating={worker.averageRating || 0} size="0.8rem" />
            <span className="worker-review-count">
              ({worker.reviewCount || 0} {t('reviewsCard', { count: worker.reviewCount || 0 })})
            </span>
          </div>
          <Button
            className="add-review-btn"
            onClick={() => handleSelectWorker(worker._id)}
          >
            <FaPlus className="add-review-icon" /> {t('reviews.addReview')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default withTranslation()(WorkerCard);