// src/pages/Authentication/TwoFaVerify.jsx
import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { verifyLoginTwoFa, sendTwoFaCode, setAuthorization } from "../../services/api";
import { setUser as setUserAction } from "../../slices/login/loginSlice";
import { jwtDecode } from "jwt-decode";
import logoLight from "../../assets/images/logo-light.png";
import "../../assets/scss/pages/_nestleoAuth.scss";

const TwoFaVerify = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // tempToken can come from navigate state OR query param ?token=...
  const tempTokenFromState = location.state?.tempToken || null;
  const urlParams = new URLSearchParams(location.search);
  const tempTokenFromQuery = urlParams.get("tempToken") || urlParams.get("token") || null;
  const emailFromState = location.state?.email || ''; // optional - frontend may pass email in state

  const tempToken = tempTokenFromState || tempTokenFromQuery;

  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState(null);
  const [expirySeconds, setExpirySeconds] = useState(600); // 10 minutes default
  const timerRef = useRef(null);

  useEffect(() => {
    document.title = (t('auth.enter2FaCode') || 'Enter verification code') + " | Nestleo";
    // If no temp token, redirect to login
    if (!tempToken) {
      navigate("/connect", { replace: true, state: { message: "Missing verification token — please login again." } });
      return;
    }
    // start countdown
    startTimer();
    return () => stopTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startTimer = () => {
    stopTimer();
    setExpirySeconds(600);
    timerRef.current = setInterval(() => {
      setExpirySeconds(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTimer = (s) => {
    const mm = Math.floor(s / 60).toString().padStart(2, "0");
    const ss = (s % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const handleVerify = async () => {
    setError(null);
    setResendMsg(null);
    if (!tempToken) {
      setError(t('auth.missingTempToken') || "Missing temporary token. Please login again.");
      return;
    }
    if (!code || code.length !== 6) {
      setError(t('auth.codeInvalid') || "Enter the 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      const resp = await verifyLoginTwoFa(tempToken, code);
      // expect { token, user }
      if (resp?.token) {
        // store token in local storage and in axios interceptor
        setAuthorization(resp.token);
        // Update redux with user (backend returns user object)
        if (resp.user) {
          dispatch(setUserAction(resp.user));
          try { localStorage.setItem('user', JSON.stringify(resp.user)); } catch (e) {}
        } else {
          // fallback decode token
          try {
            const decoded = jwtDecode(resp.token);
            dispatch(setUserAction(decoded));
            try { localStorage.setItem('user', JSON.stringify(decoded)); } catch (e) {}
          } catch (e) {
            // nothing
          }
        }
        // success -> navigate (dashboard or referred location)
        navigate("/dashboard", { replace: true });
      } else {
        setError(t('auth.verifyFailed') || "Verification succeeded but no token returned.");
      }
    } catch (err) {
      // normalize message
      const message = (err && (err.message || err)) || t('auth.verifyFailed') || "Verification failed";
      setError(typeof message === 'string' ? message : JSON.stringify(message));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendMsg(null);
    setError(null);
    if (!tempToken) {
      setError(t('auth.missingTempToken') || "Missing temporary token.");
      return;
    }
    setResendLoading(true);
    try {
      // sendTwoFaCode expects (body, config). Use Authorization Bearer with tempToken.
      await sendTwoFaCode({}, { headers: { Authorization: `Bearer ${tempToken}` } });

      setResendMsg(t('auth.twoFa.codeResent') || "Verification code resent.");
      // restart timer
      startTimer();
    } catch (err) {
      const message = (err && (err.message || err)) || t('auth.resendFailed') || "Failed to resend code";
      setError(typeof message === 'string' ? message : JSON.stringify(message));
    } finally {
      setResendLoading(false);
    }
  };

  const handleCancel = () => {
    // redirect to login (clear anything necessary)
    navigate("/connect");
  };

  // small helper to show masked email (if available)
  const maskEmail = (em) => {
    if (!em) return '';
    const [localPart, domain] = em.split('@');
    if (!domain) return em;
    const visible = localPart.slice(0, Math.min(3, localPart.length));
    return `${visible}...@${domain}`;
  };

  return (
    <div className="nestly-auth-wrapper">
      <div className="nestly-bg-overlay"></div>
      <div className="container">
        <div
          className="nestly-auth-card"
          style={{
            maxWidth: 420,
            margin: "40px auto",
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
              {t('auth.enter2FaCode') || 'Enter verification code'}
            </h3>

            <p style={{
              color: "#718096",
              fontSize: '15px',
              lineHeight: '1.5',
              marginBottom: '1rem'
            }}>
              {t('auth.codeSentToEmail') || 'A verification code has been sent to your email.'}
              {emailFromState ? <><br /><b style={{ color: '#2d3748' }}>{maskEmail(emailFromState)}</b></> : null}
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              style={{ fontSize: '1.6rem', letterSpacing: '10px', width: '220px', textAlign: 'center', padding: '8px 10px' }}
            />
          </div>

          {error && (
            <div style={{
              marginBottom: 12,
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              border: '1px solid #f5c6cb'
            }}>
              {error}
            </div>
          )}

          {resendMsg && (
            <div style={{
              marginBottom: 12,
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: '#d4edda',
              color: '#155724',
              border: '1px solid #c3e6cb'
            }}>
              {resendMsg}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
            <div>
              <button
                className="btn btn-link"
                onClick={handleResend}
                disabled={resendLoading}
                style={{
                  color: '#e6485c',
                  fontSize: '14px',
                  fontWeight: '500',
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  cursor: resendLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {resendLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" style={{ marginRight: 8, width: '16px', height: '16px' }}></span>
                    {t('auth.sending') || 'Sending...'}
                  </>
                ) : (
                  t('auth.resendCode') || 'Resend code'
                )}
              </button>
            </div>

            <div style={{ textAlign: 'right' }}>
              <small className="text-muted">{t('auth.twoFa.codeExpires') || 'Code expires in:'} {formatTimer(expirySeconds)}</small>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <button
              className="btn btn-secondary"
              onClick={handleCancel}
              disabled={loading}
              style={{
                padding: '8px 14px',
                borderRadius: 6
              }}
            >
              {t('auth.cancel') || 'Cancel'}
            </button>

            <button
              className="btn btn-primary"
              onClick={handleVerify}
              disabled={loading}
              style={{
                minWidth: 120,
                padding: '8px 16px',
                fontSize: '14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#e6485c',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.8 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm" style={{ marginRight: 8, width: '16px', height: '16px' }}></span>
                  {t('auth.verifying') || 'Verifying...'}
                </>
              ) : (
                t('auth.verify') || 'Verify'
              )}
            </button>
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
              {t('emailNotice.returnToLogin') || 'Return to login'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwoFaVerify;
