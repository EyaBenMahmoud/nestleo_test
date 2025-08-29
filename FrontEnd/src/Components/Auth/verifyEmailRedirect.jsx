import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import logoLight from "../../assets/images/logo-light.png";
import "../../assets/scss/pages/_nestleoAuth.scss";

const VerifyEmail = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    document.title = t('emailVerification.title') + " | Nestleo";
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage(t('emailVerification.invalidVerificationLink'));
      return;
    }
    axios.get(`${process.env.REACT_APP_API_URL}/auth/verify-email?token=${token}`)
      .then(res => {
        setStatus('success');
        setMessage(t('emailVerification.emailVerifiedSuccess'));
        setTimeout(() => navigate('/connect'), 3000); // Redirect to login after 3s
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.response?.data?.message || t('emailVerification.verificationFailedMessage'));
      });
  }, [searchParams, navigate, t]);

  return (
    <div className="nestly-auth-wrapper">
      <div className="nestly-bg-overlay"></div>
      <div className="container">
        <div className="nestly-auth-card" style={{ maxWidth: 420, margin: "0 auto" }}>
          <div className="nestly-auth-header text-center">
            <div className="mb-4">
              <Link to="/" className="d-inline-block">
                <img src={logoLight} alt="Nestleo" height="32" />
              </Link>
            </div>
            <h3 style={{ marginBottom: 8 }}>
              {status === 'success'
                ? t('emailVerification.emailVerified')
                : status === 'error'
                ? t('emailVerification.verificationFailed')
                : t('emailVerification.verifying')}
            </h3>
            <p style={{
              color:
                status === 'success'
                  ? 'green'
                  : status === 'error'
                  ? 'red'
                  : '#666'
            }}>
              {status === 'verifying' && t('emailVerification.verifyingEmail')}
              {status !== 'verifying' && message}
            </p>
            {status === 'success' && (
              <p style={{ color: "#666", marginTop: 16 }}>
                {t('emailVerification.redirectingToLogin')}
              </p>
            )}
            {status === 'error' && (
              <div className="mt-3">
                <Link to="/connect" className="nestly-auth-link">
                  <i className="ri-arrow-left-line" style={{ fontSize: '14px', marginRight: '4px' }}></i>
                  {t('emailVerification.returnToLogin')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;