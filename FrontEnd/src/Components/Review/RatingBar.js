import React, { useState } from 'react';
import { Card, CardBody, Button, Input, Progress } from 'reactstrap';
import classnames from 'classnames';
import StarRating from './StarRating';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa'; // Import star icons
import './RatingBar.css'; // Make sure to create this CSS file

const RatingBar = ({ reviews, filterRating, setFilterRating, searchTerm, setSearchTerm }) => {
  const totalReviews = reviews.length;
  const [animatingRating, setAnimatingRating] = useState(null);
  
  if (totalReviews === 0) return null;
  
  const ratingCounts = [0, 0, 0, 0, 0];
  reviews.forEach(review => {
    const ratingIndex = Math.floor(review.rating) - 1;
    if (ratingIndex >= 0 && ratingIndex < 5) {
      ratingCounts[ratingIndex]++;
    }
  });
  
  const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;

  // Handle rating filter click with animation
  const handleRatingClick = (star) => {
    // If we're already filtering by this rating, clear the filter
    if (filterRating === star) {
      setFilterRating(0);
      return;
    }
    
    // Start animation
    setAnimatingRating(star);
    
    // After animation completes, apply the filter
    setTimeout(() => {
      setFilterRating(star);
      setAnimatingRating(null);
    }, 600); // Animation duration
  };

  // Generate stars based on rating
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;
    
    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(<FaStar key={`full-${i}`} className="text-warning" />);
    }
    
    // Add half star if needed
    if (hasHalfStar) {
      stars.push(<FaStarHalfAlt key="half" className="text-warning" />);
    }
    
    // Add empty stars to make total of 5
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<FaRegStar key={`empty-${i}`} className="text-warning" />);
    }
    
    return stars;
  };

  // Get the display percentage for a rating bar
  const getDisplayPercentage = (star) => {
    const count = ratingCounts[star - 1];
    const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
    
    // If we're filtering by rating, show 100% for the selected rating, 0% for others
    if (filterRating > 0) {
      return filterRating === star ? 100 : 0;
    }
    
    // If we're animating this rating, show 100%
    if (animatingRating === star) {
      return 100;
    }
    
    // Otherwise show the actual percentage
    return percentage;
  };
  
  return (
    <Card className="rating-summary-card mb-4">
      <div className="rating-summary-header" style={{  background: 'linear-gradient(90deg, #c1e8f0, #cbe9f3, #e0f7fa)' }}>
        Rating Summary
      </div>
      <CardBody className="p-3">
        <div className="d-flex align-items-center mb-3">
          {/* Average Rating */}
          <div className="text-center me-3">
            <div className="d-flex align-items-center justify-content-center">
              <h2 className="mb-0 font-weight-bold me-2">{avgRating.toFixed(1)}</h2>
              <div className="d-flex align-items-center">
                {renderStars(avgRating)}
              </div>
            </div>
            <div className="text-muted small mt-1">
              {totalReviews} review{totalReviews !== 1 ? 's' : ''}
            </div>
          </div>
          
          {/* Vertical Separator */}
          <div 
            style={{
              width: '1px',
              height: '50px', 
              background: 'linear-gradient(to bottom, transparent, #e2e8f0, transparent)',
              margin: '0 15px'
            }}
          />
          
          {/* Rating Bars */}
          <div className="flex-grow-1">
            {[5, 4, 3, 2, 1].map(star => {
              const count = ratingCounts[star - 1];
              const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              const isAnimating = animatingRating === star;
              const displayPercentage = getDisplayPercentage(star);
              
              return (
                <div key={star} className="rating-bar">
                  <div className="rating-label">{star} ★</div>
                  <div 
                    className="rating-progress" 
                    onClick={() => handleRatingClick(star)}
                  >
                    <div 
                      className={`rating-progress-bar ${isAnimating ? 'animating' : ''}`}
                      style={{ 
                        width: `${displayPercentage}%`, 
                        backgroundColor: star >= 4 ? '#10b981' : (star >= 3 ? '#3b82f6' : (star >= 2 ? '#f59e0b' : '#ef4444'))  
                      }}
                    />
                  </div>
                  <div className="rating-count">
                    {count} ({percentage.toFixed(0)}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <hr className="my-3" />
        <div className="reviews-filters">
          <div>
            <Button 
              color={filterRating === 0 ? "primary" : "light"}
              className="rating-filter-btn"
              onClick={() => setFilterRating(0)}
            >
              All
            </Button>
            {[5, 4, 3, 2, 1].map(star => (
              <Button 
                key={star} 
                color={filterRating === star ? "primary" : "light"}
                className="rating-filter-btn"
                onClick={() => handleRatingClick(star)}
              >
                {star} ★
              </Button>
            ))}
          </div>
          <div className="position-relative search-wrapper">
            <Input 
              type="search" 
              placeholder="Search reviews..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default RatingBar;