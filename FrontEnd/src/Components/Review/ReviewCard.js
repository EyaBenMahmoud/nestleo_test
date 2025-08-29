import React, { useState } from 'react';
import { Badge, Button, FormGroup, Input, UncontrolledTooltip } from 'reactstrap';
import { FaUser, FaEdit, FaTrash, FaComment } from 'react-icons/fa';
import StarRating from './StarRating';
import { withTranslation } from 'react-i18next';

const ReviewCard = ({ 
  review, 
  user, 
  handleEditReview, 
  handleDeleteReview, 
  handleCommentClick, 
  handleAddComment,
  handleDeleteComment,
  commentReviewId,
  commentText,
  setCommentText,
  toggleExpandedReview,
  expandedReview,
  t
}) => {
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Check if the current user is the author of the review
  const isReviewAuthor = (user?._id || user?.id)?.toString() === review.createdBy?._id?.toString();
  
  const isExpanded = expandedReview === review._id || commentReviewId === review._id;
  const maxContentLength = 200;
  const isLongContent = review.content.length > maxContentLength;
  const displayedContent = isLongContent && !isExpanded 
    ? `${review.content.substring(0, maxContentLength)}...` 
    : review.content;
  
  const commentCount = review.comments?.length || 0;
  
  return (
    <div className="review-card">
      <div className="review-header">
        <div className="d-flex justify-content-between align-items-start">
          <div className="d-flex">
            <div className={`avatar-wrapper ${user?.role === 'Worker' ? 'avatar-admin' : 'avatar-worker'}`}>
              <span className="user-initial">
                {user?.role === 'Worker' 
                  ? (review.createdBy?.firstName?.[0] || 'A') 
                  : (review.worker?.firstName?.[0] || 'W')}
              </span>
            </div>
            
            <div className="review-user-info">
              <h6 className="review-username">
                {user?.role === 'Worker' 
                  ? `${review.createdBy?.firstName || t('reviews.admin')} ${review.createdBy?.lastName || ''}` 
                  : `${review.worker?.firstName || t('reviews.worker')} ${review.worker?.lastName || ''}`
                }
              </h6>
              
              <div className="review-attribution">
                {user?.role === 'Worker' && (
                  <small className="text-muted">
                    {t('reviews.by')} {review.createdBy?.firstName || t('reviews.admin')} {review.createdBy?.lastName || ''} 
                    {review.createdBy?.syndicate?.name && (
                      <span> {t('reviews.from')} {review.createdBy?.syndicate?.name} {t('reviews.syndicate')}</span>
                    )}
                  </small>
                )}
                {user?.role === 'SyndicateAdmin' && !review.isTaskReview && (
                  <small className="text-muted">
                    {t('reviews.for')} {review.worker?.firstName || t('reviews.worker')} {review.worker?.lastName || ''}
                    {review.createdBy && review.createdBy._id?.toString() !== (user._id || user.id)?.toString() && (
                      <span> {t('reviews.by')} {review.createdBy?.firstName || t('reviews.admin')} {review.createdBy?.lastName || ''}</span>
                    )}
                  </small>
                )}
                {user?.role === 'SyndicateAdmin' && review.isTaskReview && (
                  <small className="text-muted">
                    {t('reviews.taskReviewFor')} {review.worker?.firstName || t('reviews.worker')} {review.worker?.lastName || ''}
                    {review.createdBy && review.createdBy._id?.toString() !== (user._id || user.id)?.toString() && (
                      <span> {t('reviews.by')} {review.createdBy?.firstName || t('reviews.admin')} {review.createdBy?.lastName || ''}</span>
                    )}
                  </small>
                )}
              </div>
              
              <div className="review-meta">
                <StarRating rating={review.rating} size="0.7rem" />
                <span className="review-date">{formatDate(review.createdAt)}</span>
              </div>
            </div>
          </div>
          
          {/* Only show edit/delete buttons if user is the review author */}
          {user?.role === 'SyndicateAdmin' && isReviewAuthor && (
            <div className="review-actions">
              <button 
                className="action-btn edit-btn"
                id={`edit-${review._id}`}
                onClick={() => handleEditReview(review)}
              >
                <FaEdit />
              </button>
              <UncontrolledTooltip target={`edit-${review._id}`} placement="top">
                {t('reviews.editReview')}
              </UncontrolledTooltip>
              
              <button 
                className="action-btn delete-btn"
                id={`delete-${review._id}`}
                onClick={() => handleDeleteReview(review._id)}
              >
                <FaTrash />
              </button>
              <UncontrolledTooltip target={`delete-${review._id}`} placement="top">
                {t('reviews.deleteReview')}
              </UncontrolledTooltip>
            </div>
          )}
        </div>
        
        <div className="d-flex align-items-center flex-wrap">
          <div className="worker-location location-icon mr-auto mb-1" style={{marginLeft:'8px'}}>
          
          </div>
          
          <div className="d-flex" style={{marginLeft: '12px'}}>
            {review.building?.name && (
              <Badge color="info" className="review-badge building-badge mr-3 mb-1">
                {review.building.name}
              </Badge>
            )}
            {review.isTaskReview && (
              <Badge color="success" className="review-badge mb-1" style={{marginLeft: '6px'}}>
                {t('reviews.taskReview')}
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      <div className="review-body">
        <div className="review-content">
          {expandedReview === review._id || review.content.length <= 150 ? (
            <p>{review.content}</p>
          ) : (
            <p>{review.content.substring(0, 150)}...</p>
          )}
          
          {review.content.length > 150 && (
            <button 
              className="show-more-btn"
              onClick={() => toggleExpandedReview(review._id)}
            >
              {expandedReview === review._id ? t('reviews.showLess') : t('reviews.showMore')}
            </button>
          )}
        </div>
        {review.comments?.length > 0 && (
          <div className="comments-section">
            <div className="comments-header">
              <FaComment className="comment-count-icon" />
              {review.comments.length} {t('reviews.comment', { count: review.comments.length })}
            </div>
            
            {review.comments.map((comment, index) => {
              const authorName = comment.createdBy?.firstName 
                ? `${comment.createdBy.firstName} ${comment.createdBy.lastName || ''}` 
                : t('reviews.unknown');
              
              const authorRole = comment.createdBy?.role || t('reviews.unknown');
              const isCurrentUserComment = comment.createdBy?._id?.toString() === (user._id || user.id)?.toString();
              
              return (
                <div key={comment._id || index} className="comment-item">
                  <div className="d-flex">
                    <div className={`comment-avatar ${authorRole === 'SyndicateAdmin' ? 'avatar-admin' : 'avatar-worker'}`}>
                      <span className="user-initial">{authorName[0]}</span>
                    </div>
                    <div className="ml-2 flex-grow-1">
                      <div className="comment-header">
                        <div className="d-flex align-items-center">
                          <span className="comment-user">{authorName}</span>
                          <Badge 
                            color={authorRole === 'SyndicateAdmin' ? 'primary' : 'info'}
                            className="comment-role-badge"
                          >
                            {authorRole === 'SyndicateAdmin' ? t('reviews.admin') : t('reviews.worker')}
                          </Badge>
                        </div>
                        
                        {(isCurrentUserComment || isReviewAuthor) && (
                          <button 
                            className="comment-delete-btn"
                            onClick={() => handleDeleteComment(review._id, comment._id)}
                            title={t('reviews.deleteComment')}
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                      <p className="comment-text">{comment.text}</p>
                      <div className="comment-date">{formatDate(comment.createdAt)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      <div className="review-footer">
        {commentReviewId === review._id ? (
          <div>
            <FormGroup>
              <Input
                type="textarea"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={t('reviews.writeCommentPlaceholder')}
                rows={2}
                className="comment-input"
              />
              <div className="comment-actions">
                <Button 
                  color="danger"
                  outline
                  className="comment-cancel-btn"
                  onClick={() => {
                    setCommentText('');
                    handleCommentClick(null);
                  }}
                >
                  {t('reviews.cancel')}
                </Button>
                <Button 
                  color="primary"
                  className="comment-post-btn"
                  onClick={() => handleAddComment(review._id)}
                  disabled={!commentText.trim()}
                >
                  {t('reviews.post')}
                </Button>
              </div>
            </FormGroup>
          </div>
        ) : (
          <button 
            className="comment-btn"
            onClick={() => handleCommentClick(review._id)}
          >
            <FaComment className="icon" /> {t('reviews.addComment')}
          </button>
        )}
      </div>
    </div>
  );
};

export default withTranslation()(ReviewCard);