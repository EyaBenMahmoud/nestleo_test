import React from 'react';
import { Alert, Button } from 'reactstrap';
import { Link } from 'react-router-dom';
import { withTranslation } from 'react-i18next';

const PremiumFeatureAlert = ({ featureName, t }) => {
  return (
    <Alert color="warning" className="mb-4">
      <div className="d-flex">
        <div className="flex-shrink-0">
          <i className="ri-lock-line fs-2 me-3"></i>
        </div>
        <div>
          <h4 className="alert-heading">{t('premiumFeatureAlert.heading', { featureName })}</h4>
          <p>
            {t('premiumFeatureAlert.message', { featureName })}
          </p>
          <div className="mt-2">
            <Link to="/subscription">
              <Button color="warning" outline>
                <i className="ri-arrow-up-circle-line me-1"></i> {t('premiumFeatureAlert.upgradeButton')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Alert>
  );
};

export default withTranslation()(PremiumFeatureAlert);