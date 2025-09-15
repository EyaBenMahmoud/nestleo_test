import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { acceptPolicies, setAuthorization } from '../../services/api';
import { useDispatch } from 'react-redux';
import { setUser as setUserAction } from '../../slices/login/loginSlice';
import logoLight from "../../assets/images/logo-light.png";

const AcceptPolicies = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const tempToken = location.state?.tempPolicyToken || location.state?.token || null;
  const email = location.state?.email || '';

  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    document.title = (t('policy.title') || 'Welcome to Nestleo') + " | Nestleo";
    if (!tempToken) {
      // If no token, redirect to login
      navigate('/connect', { replace: true, state: { message: 'Missing token' } });
    }
  }, [t, tempToken, navigate]);

 const handleAccept = async () => {
  setError(null);

  if (!termsChecked || !privacyChecked) {
    setError(t('policy.mustAcceptRequired') || 'You must accept the required policies to continue.');
    return;
  }

  if (!tempToken) {
    setError(t('auth.missingTempToken') || 'Missing token');
    return;
  }

  setSending(true);
  try {
    const resp = await acceptPolicies(tempToken, { marketingOptIn });

    if (resp?.token) {
      setAuthorization(resp.token);
      if (resp.user) dispatch(setUserAction(resp.user));
      try {
        localStorage.setItem('token', resp.token);
        localStorage.setItem('user', JSON.stringify(resp.user));
      } catch (e) {}
      navigate('/dashboard', { replace: true });
    } else {
      setError(t('policy.acceptFailed') || 'Failed to accept policies');
    }
  } catch (err) {
    // Helpful debug info in console during development
    console.error('acceptPolicies error:', err?.response || err);

    const status = err?.response?.status;
    const serverMsg = err?.response?.data?.message || err?.message;

    if (status === 401) {
      // token invalid / expired
      setError(t('policy.tokenExpired') || 'Your session has expired. Please login again to continue.');
      // Optionally, navigate user back to login or show a button to re-login (see render)
    } else {
      setError(serverMsg || (t('policy.acceptFailed') || 'Failed to accept policies'));
    }
  } finally {
    setSending(false);
  }
};


  const allRequiredChecked = termsChecked && privacyChecked;
  const acceptDisabled = sending || !allRequiredChecked;

  return (
    <div className="nestly-auth-wrapper">
      <div className="nestly-bg-overlay"></div>
      <div className="container">
        <div
          className="nestly-auth-card"
          style={{
            maxWidth: 640,
            margin: "40px auto",
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            backgroundColor: 'white'
          }}
        >
          <div className="nestly-auth-header text-center">
            <div className="mb-4">
              <Link to="/" className="d-inline-block"><img src={logoLight} alt="Nestleo" height="32" /></Link>
            </div>
            <h3 style={{ marginBottom: 12, fontSize: '24px', fontWeight: '600', color: '#2d3748' }}>
              {t('policy.welcomeTitle') || 'Bienvenue sur Nestleo'}
            </h3>
            <p style={{ color: "#718096", fontSize: '15px', lineHeight: '1.5', marginBottom: '1rem' }}>
              {t('policy.intro')}
            </p>
          </div>

          <div style={{ marginTop: 12, color: '#2d3748', lineHeight: 1.6 }}>
            <ul>
              <li>{t('policy.joinBuilding')}</li>
              <li>{t('policy.smartVoting')}</li>
              <li>{t('policy.reportIssues')}</li>
              <li>{t('policy.videoMeetings')}</li>
              <li>{t('policy.managePayments')}</li>
              <li>{t('policy.interactProfessionals')}</li>
            </ul>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={termsChecked}
                  onChange={(e) => setTermsChecked(e.target.checked)}
                  aria-label={t('policy.readAndAccept') || 'I have read and accept the Terms'}
                />
                <span>
                  {t('policy.readAndAccept') || "J’ai lu et j’accepte les Conditions Générales d’Utilisation de Nestleo."}
                </span>
              </label>
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={privacyChecked}
                  onChange={(e) => setPrivacyChecked(e.target.checked)}
                  aria-label={t('policy.privacyNotice') || 'Privacy policy'}
                />
                <span>
                  {t('policy.privacyNotice') || "Nestleo collecte et traite les données comme décrit dans la Politique de Confidentialité. (obligatoire)"}
                </span>
              </label>
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={marketingOptIn}
                  onChange={(e) => setMarketingOptIn(e.target.checked)}
                  aria-label={t('policy.marketingOptIn') || 'Marketing opt-in'}
                />
                <span>
                  {t('policy.marketingOptIn') || "Je souhaite recevoir des communications de la part de Nestleo concernant ses produits et services."}
                </span>
              </label>
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 4, backgroundColor: '#f8d7da', color: '#721c24' }}>
              {error}
            </div>
          )}

          <div className="text-center" style={{ marginTop: 18 }}>
            <button
              className="btn btn-primary"
              onClick={handleAccept}
              disabled={acceptDisabled}
              style={{
                minWidth: 160,
                padding: '8px 18px',
                borderRadius: 6,
                backgroundColor: acceptDisabled ? '#d3d3d3' : '#e6485c',
                color: acceptDisabled ? '#666' : 'white',
                border: 'none',
                cursor: acceptDisabled ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              {sending ? (
                <>
                  <span className="spinner-border spinner-border-sm" style={{ marginRight: 8 }}></span>
                  {t('policy.accepting') || 'Accepting...'}
                </>
              ) : (
                t('policy.acceptAndContinue') || 'Accepter et continuer'
              )}
            </button>
          </div>

          <div className="text-center mt-3">
            <Link to="/connect" className="text-decoration-none" style={{ color: '#e6485c', fontSize: '14px', fontWeight: '500' }}>
              {t('policy.returnToLogin') || 'Retour à la connexion'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcceptPolicies;
