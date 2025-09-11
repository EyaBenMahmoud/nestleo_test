import React from 'react';
import { Card, CardBody, CardHeader, Table, Badge } from 'reactstrap';
import { FaTrophy, FaMedal } from 'react-icons/fa';
import StarRating from './StarRating';
import { withTranslation } from 'react-i18next';

const LeaderboardCard = ({ workers = [], t }) => {
  // Sort workers by averageRating in descending order
  const sortedWorkers = [...workers]
    .filter(worker => worker.averageRating > 0)
    .sort((a, b) => b.averageRating - a.averageRating);

  const getRankBadge = (index) => {
    switch(index) {
      case 0:
        return <Badge className="rank-badge gold-badge"><FaTrophy/> #1</Badge>;
      case 1:
        return <Badge className="rank-badge silver-badge"><FaMedal/> #2</Badge>;
      case 2:
        return <Badge className="rank-badge bronze-badge"><FaMedal/> #3</Badge>;
      default:
        return <Badge color="light" className="rank-number">{index + 1}</Badge>;
    }
  };

  return (
    <Card className="leaderboard-card shadow-sm border-0">
      <CardHeader className="bg-white d-flex align-items-center justify-content-between">
        <h5 className="mb-0">
          <FaTrophy className="text-warning mr-2"/> {t('reviews.leader.title')}
        </h5>
      </CardHeader>
      <CardBody className="p-0">
        {sortedWorkers.length > 0 ? (
          <Table responsive hover className="mb-0 leaderboard-table">
            <thead>
              <tr>
                <th className="text-center" style={{ width: '8%' }}>{t('reviews.leader.rank')}</th>
                <th style={{ width: '42%' }}>{t('reviews.leader.worker')}</th>
                <th className="text-center" style={{ width: '20%' }}>{t('reviews.leader.rating')}</th>
                <th className="text-center" style={{ width: '30%' }}>{t('reviews.leader.reviews')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedWorkers.map((worker, index) => (
                <tr key={worker._id} className={index < 3 ? `top-${index+1}-row` : ''}>
                  <td className="text-center align-middle">
                    <span className={`rank-number rank-${index < 3 ? index+1 : 'other'}`}>{index + 1}</span>
                  </td>
                  <td>
                    <div className="d-flex align-items-center">
                      <div className={`worker-avatar ${index < 3 ? `rank-${index+1}` : ''}`}>
                        {worker.firstName?.[0] || 'W'}
                      </div>
                      <div className="ml-2">
                        <div className="d-flex align-items-center">
                          <div className="worker-name">{worker.firstName} {worker.lastName}</div>
                          {index < 3 && 
                            <div className="ml-2">
                              {getRankBadge(index)}
                            </div>
                          }
                        </div>
                        <small className="text-muted">{worker.city}, {worker.country}</small>
                      </div>
                    </div>
                  </td>
                  <td className="text-center align-middle">
                    <div className="d-flex align-items-center justify-content-center">
                      <StarRating rating={worker.averageRating || 0} size="0.8rem" />
                    </div>
                  </td>
                  <td className="text-center align-middle">
                    <Badge color="primary" pill className="review-count-badge">
                      {worker.reviewCount || 0} {t('reviews.leader.review', { count: worker.reviewCount || 0 })}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div className="text-center p-4">
            <p className="text-muted">{t('reviews.leader.noWorkers')}</p>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default withTranslation()(LeaderboardCard);