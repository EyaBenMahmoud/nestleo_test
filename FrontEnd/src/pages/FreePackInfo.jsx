import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Helper functions for cookies
function setCookie(name, value, days) {
  let expires = '';
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = '; expires=' + date.toUTCString();
  }
  document.cookie = name + '=' + (value || '') + expires + '; path=/';
}

function getCookie(name) {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

const FreePackInfo = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useSelector(state => state.Loginn?.user);
  const subscription = useSelector(state => state.Loginn?.subscription);

  // Get features array (objects) for rendering
  const features = useMemo(() => {
    let feats = [];
    if (subscription && Array.isArray(subscription.features)) {
      feats = subscription.features;
    } else if (user && user.subscription && Array.isArray(user.subscription.features)) {
      feats = user.subscription.features;
    }
    // Debug user.subscription and planId
    if (user && user.subscription && user.subscription.planId && Array.isArray(user.subscription.planId.features)) {
      feats = user.subscription.planId.features;
      console.log('FreePackInfo: features from user.subscription.planId.features:', feats);
    }
    console.log('FreePackInfo: features array:', feats);
    return feats;
  }, [subscription, user]);

  const packName = useMemo(() => {
    if (subscription && subscription.name) return subscription.name;
    if (user && user.subscription && user.subscription.name) return user.subscription.name;
    return t('freePackInfo.defaultPackName', 'Free Pack');
  }, [subscription, user, t]);

  useEffect(() => {
    if (getCookie('freePackInfoShown') === 'true') {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleContinue = () => {
    setCookie('freePackInfoShown', 'true', 365);
    navigate('/dashboard');
  };

    return (
      <div className="nestly-auth-wrapper" style={{ minHeight: '100vh', width: '100vw', overflow: 'auto', position: 'relative' }}>
        <div className="nestly-bg-overlay"></div>
        <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, position: 'relative' }}>
          <div className="free-pack-info-card" style={{ background: '#fff', padding: '2rem 2.5rem', borderRadius: '12px', boxShadow: '0 2px 16px rgba(0,0,0,0.08)', maxWidth: 480, width: '100%' }}>
            <h2 style={{ color: '#2d3748', marginBottom: 12 }}>{t('freePackInfo.welcomeTitle', 'Welcome to the')} {packName}!</h2>
            <p style={{ marginBottom: 20, color: '#4a5568' }}>
              {t('freePackInfo.currentPlan', 'You are currently on the')} <b>{packName}</b>. {t('freePackInfo.featuresIncluded', 'Here are the features included:')}
            </p>
            <ul style={{ marginBottom: 24, color: '#2d3748' }}>
              {features && features.length > 0 ? (
                features
                  .filter(f => (typeof f === 'object' && f !== null && f.name) || typeof f === 'string')
                  .map((feature, idx) => {
                    let baseName = '';
                    let rawValue = '';
                    let isActive = true;
                    if (typeof feature === 'object' && feature !== null && typeof feature.name === 'string') {
                      const parts = feature.name.split(':');
                      baseName = parts[0]?.trim() || '';
                      rawValue = parts[1]?.trim() || '';
                      isActive = feature.isActive !== false;
                    } else if (typeof feature === 'string') {
                      baseName = feature;
                      rawValue = '';
                      isActive = true;
                    }
                    let displayValue = rawValue;
                    if (rawValue === '0' || rawValue === '-1' || (rawValue && rawValue.toLowerCase() === 'illimité')) {
                      displayValue = t('unlimited', 'Unlimited');
                    }
                    if (!baseName) return null;
                    return (
                      <li key={idx} style={{ marginBottom: 6 }}>
                        <strong>{t(`freePackInfo.feature.${baseName}`, baseName)}</strong>{displayValue ? `: ${displayValue}` : ''}
                        <span className={isActive ? 'text-success' : 'text-muted'} style={{ marginLeft: 8 }}>
                          {isActive ? ` (${t('active', 'Active')})` : ` (${t('inactive', 'Inactive')})`}
                        </span>
                      </li>
                    );
                  })
              ) : (
                <li style={{ marginBottom: 6, color: '#a0aec0' }}>{t('freePackInfo.noFeatures', 'No features found for this subscription.')}</li>
              )}
            </ul>
            <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
              <a href="/landing#plans" className="nestly-btn nestly-btn-outline-primary" style={{ textAlign: 'center', textDecoration: 'none' }}>
                {t('freePackInfo.seePaidPlans', 'See Paid Plans')}
              </a>
              <button className="nestly-btn nestly-btn-primary" style={{ width: '100%' }} onClick={handleContinue}>
                {t('freePackInfo.continue', 'Continue to Dashboard')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
};

export default FreePackInfo;
