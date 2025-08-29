import React, { useState } from 'react';
import { FaStar, FaRegStar } from 'react-icons/fa';

const StarRating = ({ rating, size = '1.2rem', editable = false, onRatingChange = () => {} }) => {
  const [hoverRating, setHoverRating] = useState(0);
  
  return (
    <div className="star-rating d-flex align-items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className="star"
          onClick={() => editable && onRatingChange(star)}
          onMouseEnter={() => editable && setHoverRating(star)}
          onMouseLeave={() => editable && setHoverRating(0)}
          style={{
            cursor: editable ? 'pointer' : 'default',
            color: (hoverRating || rating) >= star ? '#ffc107' : '#e4e5e9',
            fontSize: size,
            marginRight: '3px'
          }}
        >
          {(hoverRating || rating) >= star ? <FaStar /> : <FaRegStar />}
        </span>
      ))}
      {rating > 0 && (
        <span className="ml-2 rating-text" style={{ fontSize: '0.9rem', color: '#6c757d' }}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
};

export default StarRating;