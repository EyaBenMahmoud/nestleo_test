import React from 'react';
import { Container, Row, Col, Card, CardBody, Button } from 'reactstrap';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BreadCrumb from '../../Components/Common/BreadCrumb';

const SubscriptionExpiredPage = () => {
  const { t } = useTranslation();
  document.title = `${t('subscription.expiredTitle')} | Nestleo`;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title={t('subscription.expiredTitle')} pageTitle={t('subscription.titlesub')} />

        <Row className="justify-content-center">
          <Col lg={8}>
            <Card>
              <CardBody className="p-4 text-center">
                <div className="expired-icon mb-4">
                  <i className="ri-timer-flash-line"></i>
                </div>

                <h2 className="mb-3">{t('subscription.expiredTitle')}</h2>
                <p className="text-muted fs-16 mb-4">
                  {t('subscription.expiredDetailedMessage')}
                </p>

                <div className="benefits-list text-start mx-auto mb-4" style={{ maxWidth: "500px" }}>
                  <h5 className="mb-3">{t('subscription.whySubscribe')}:</h5>
                  <ul className="vstack gap-2">
                    <li><i className="ri-check-line text-success me-2"></i> {t('subscription.benefit1')}</li>
                    <li><i className="ri-check-line text-success me-2"></i> {t('subscription.benefit2')}</li>
                    <li><i className="ri-check-line text-success me-2"></i> {t('subscription.benefit3')}</li>
                    <li><i className="ri-check-line text-success me-2"></i> {t('subscription.benefit4')}</li>
                  </ul>
                </div>

                <div className="d-flex flex-column flex-sm-row justify-content-center gap-3">
                  <Button color="primary" tag={Link} to="/landing" className="btn-hover">
                    <i className="ri-shopping-cart-line me-1 align-middle"></i> {t('subscription.viewPlans')}
                  </Button>
                  <Button color="soft-info" tag={Link} to="/dashboard">
                    <i className="ri-home-4-line me-1 align-middle"></i> {t('subscription.backToDashboard')}
                  </Button>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>

      <style jsx>{`
        .expired-icon {
          width: 100px;
          height: 100px;
          background-color: #fff5f6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
        }
        
        .expired-icon i {
          font-size: 50px;
          color: #e6485c;
        }
        
        .benefits-list {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
        }
        
        .benefits-list ul {
          list-style-type: none;
          padding-left: 0;
        }
        
        /* Dark mode support */
        [data-layout-mode="dark"] .expired-icon {
          background-color: #31374a;
        }
        
        [data-layout-mode="dark"] .benefits-list {
          background-color: #2a3042;
        }
      `}</style>
    </div>
  );
};

export default SubscriptionExpiredPage;