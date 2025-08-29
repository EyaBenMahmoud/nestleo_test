import React from 'react';
import { Card, CardHeader, CardBody, Row, Col, Progress, Alert, Badge, ListGroup, ListGroupItem } from 'reactstrap';
import StarRating from './StarRating';
import { withTranslation } from 'react-i18next';

const ReviewsAnalytics = ({ reviewsToDisplay, t }) => {
  const getTopPerformers = () => {
    if (!reviewsToDisplay || reviewsToDisplay.length === 0) return [];
    
    return Array.from(reviewsToDisplay.reduce((map, review) => {
      const workerId = review.worker?._id;
      if (workerId) {
        if (!map.has(workerId)) {
          map.set(workerId, {
            worker: review.worker,
            count: 1,
            totalRating: review.rating
          });
        } else {
          const data = map.get(workerId);
          map.set(workerId, {
            ...data,
            count: data.count + 1,
            totalRating: data.totalRating + review.rating
          });
        }
      }
      return map;
    }, new Map()).values())
      .sort((a, b) => (b.totalRating / b.count) - (a.totalRating / a.count))
      .slice(0, 3);
  };

  return (
    <div className="reviews-analytics">
      <Row className="g-3">
        <Col lg="8" md="12">
          <Card className="stats-card h-100 shadow-sm">
            <CardHeader className="bg-white border-0 pb-0">
              <h5 className="mb-0 font-weight-bold text-dark">{t('reviews.analytics.ratingDistribution')}</h5>
            </CardHeader>
            <CardBody>
              {reviewsToDisplay && reviewsToDisplay.length > 0 ? (
                <div className="animate-fade-in">
                  {[5, 4, 3, 2, 1].map((rating, index) => {
                    const count = reviewsToDisplay.filter(r => Math.floor(r.rating) === rating).length;
                    const percentage = (count / reviewsToDisplay.length) * 100;
                    
                    return (
                      <div key={rating} className={`mb-3 animate-fade-in delay-${index + 1}`}>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="font-weight-bold text-dark">{rating} {t('reviews.analytics.stars')}</span>
                          <span className="text-muted">{count} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <Progress 
                          value={percentage} 
                          color={rating >= 4 ? 'success' : (rating >= 3 ? 'info' : (rating >= 2 ? 'warning' : 'danger'))}
                          className="rating-progress"
                          style={{ height: '10px', borderRadius: '5px' }}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Alert color="light" className="text-center mb-0">
                  <i className="fas fa-chart-bar mb-2" style={{ fontSize: '2rem', opacity: 0.5 }}></i>
                  <div>{t('reviews.analytics.noData')}</div>
                </Alert>
              )}
            </CardBody>
          </Card>
        </Col>
        
        <Col lg="4" md="12">
          <div className="d-flex flex-column h-100">
            <Card className="stats-card mb-3 shadow-sm">
              <CardHeader className="bg-white border-0 pb-0">
                <h5 className="mb-0 font-weight-bold text-dark">{t('reviews.analytics.reviewSummary')}</h5>
              </CardHeader>
              <CardBody>
                <Row className="text-center animate-fade-in">
                  <Col xs="4">
                    <div className="stats-number text-primary" style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                      {reviewsToDisplay ? reviewsToDisplay.length : 0}
                    </div>
                    <div className="stats-label text-muted small">{t('reviews.analytics.reviews')}</div>
                  </Col>
                  <Col xs="4">
                    <div className="stats-number text-info" style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                      {reviewsToDisplay ? reviewsToDisplay.reduce((sum, review) => sum + (review.comments?.length || 0), 0) : 0}
                    </div>
                    <div className="stats-label text-muted small">{t('reviews.analytics.comments')}</div>
                  </Col>
                  <Col xs="4">
                    <div className="stats-number text-success" style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                      {reviewsToDisplay && reviewsToDisplay.length > 0 ? 
                        (reviewsToDisplay.reduce((sum, review) => sum + review.rating, 0) / reviewsToDisplay.length).toFixed(1) : 
                        "0.0"}
                    </div>
                    <div className="stats-label text-muted small">{t('reviews.analytics.avgRating')}</div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
            
            <Card className="stats-card flex-grow-1 shadow-sm">
              <CardHeader className="bg-white border-0 pb-0">
                <h5 className="mb-0 font-weight-bold text-dark">{t('reviews.analytics.topPerformers')}</h5>
              </CardHeader>
              <CardBody className="p-0">
                {getTopPerformers().length > 0 ? (
                  <ListGroup flush>
                    {getTopPerformers().map((item, index) => (
                      <ListGroupItem key={item.worker._id} className="border-0 px-3 py-3 animate-fade-in delay-1">
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="d-flex align-items-center">
                            <div 
                              className={`avatar-circle d-flex align-items-center justify-content-center text-white font-weight-bold ${
                                index === 0 ? 'bg-warning' : index === 1 ? 'bg-info' : 'bg-secondary'
                              }`}
                              style={{ 
                                width: '40px', 
                                height: '40px', 
                                borderRadius: '50%',
                                fontSize: '1rem'
                              }}
                            >
                              {item.worker.firstName ? item.worker.firstName[0].toUpperCase() : 'U'}
                            </div>
                            <div className="ml-3">
                              <div className="font-weight-bold text-dark" style={{ fontSize: '0.9rem' }}>
                                {item.worker.firstName} {item.worker.lastName}
                              </div>
                              <div className="d-flex align-items-center mt-1">
                                <StarRating rating={item.totalRating / item.count} size="0.8rem" />
                                <span className="text-muted small ml-2">
                                  ({item.count} {t('reviews.analytics.review', { count: item.count })})
                                </span>
                              </div>
                            </div>
                          </div>
                          <Badge 
                            color={index === 0 ? 'warning' : index === 1 ? 'info' : 'secondary'}
                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                          >
                            #{index + 1}
                          </Badge>
                        </div>
                      </ListGroupItem>
                    ))}
                  </ListGroup>
                ) : (
                  <div className="text-center p-4">
                    <i className="fas fa-trophy mb-2" style={{ fontSize: '2rem', opacity: 0.5 }}></i>
                    <div className="text-muted">{t('reviews.analytics.noPerformers')}</div>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default withTranslation()(ReviewsAnalytics);