import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import logoLight from "../../assets/images/logo-light.png";
import "../../assets/scss/pages/_nestleoAuth.scss";

const VerifyEmailNotice = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const email = location.state?.email || '';
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  React.useEffect(() => {
    document.title = t('emailNotice.title') + " | Nestleo";
  }, [t]);

  const handleResend = async () => {
    if (!email) {
      setMessage(t('emailNotice.noEmailFound'));
      return;
    }
    setSending(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/auth/resend-verification`, { email });
      setMessage(t('emailNotice.resendSuccess'));
    } catch (err) {
      setMessage(t('emailNotice.resendFailed'));
    }
    setSending(false);
  };

  return (
    <div className="nestly-auth-wrapper">
      <div className="nestly-bg-overlay"></div>
      <div className="container">
        <div 
          className="nestly-auth-card" 
          style={{ 
            maxWidth: 400, 
            margin: "0 auto",
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            backgroundColor: 'white'
          }}
        >
          <div className="nestly-auth-header text-center">
            <div className="mb-4">
              <Link to="/" className="d-inline-block">
                <img src={logoLight} alt="Nestleo" height="32" />
              </Link>
            </div>
            <h3 style={{ 
              marginBottom: 12, 
              fontSize: '24px',
              fontWeight: '600',
              color: '#2d3748'
            }}>
              {t('emailNotice.title')}
            </h3>
            <p style={{ 
              color: "#718096", 
              fontSize: '15px',
              lineHeight: '1.5',
              marginBottom: '1.5rem'
            }}>
              {t('emailNotice.description')} <b style={{ color: '#2d3748' }}>{email}</b>.<br />
              {t('emailNotice.checkInbox')}
            </p>
          </div>
          <div className="text-center mt-4">
            <button
              className="btn btn-primary"
              onClick={handleResend}
              disabled={sending}
              style={{ 
                minWidth: 120,
                padding: '8px 16px',
                fontSize: '14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#e6485c',
                color: 'white',
                cursor: sending ? 'not-allowed' : 'pointer',
                opacity: sending ? 0.7 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              {sending ? (
                <>
                  <span 
                    className="spinner-border spinner-border-sm" 
                    style={{ marginRight: 8, width: '16px', height: '16px' }}
                  ></span>
                  {t('emailNotice.resending')}
                </>
              ) : (
                t('emailNotice.resendButton')
              )}
            </button>
            {message && (
              <div style={{ 
                marginTop: 16, 
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: message.includes(t('emailNotice.resendSuccess').split(' ')[0]) ? '#d4edda' : '#f8d7da',
                color: message.includes(t('emailNotice.resendSuccess').split(' ')[0]) ? '#155724' : '#721c24',
                border: `1px solid ${message.includes(t('emailNotice.resendSuccess').split(' ')[0]) ? '#c3e6cb' : '#f5c6cb'}`
              }}>
                {message}
              </div>
            )}
          </div>
          <div className="text-center mt-3">
            <Link 
              to="/connect" 
              className="text-decoration-none"
              style={{
                color: '#e6485c',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'color 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.color = '#d63384'}
              onMouseOut={(e) => e.target.style.color = '#e6485c'}
            >
              <i className="ri-arrow-left-line" style={{ fontSize: '14px', marginRight: '6px' }}></i>
              {t('emailNotice.returnToLogin')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailNotice;