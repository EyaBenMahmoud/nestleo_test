// src/components/Auth/Login.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import withRouter from "../Common/withRouter";
import { clearError, loginUser } from "../../slices/login/loginSlice";
import logoLight from "../../assets/images/logo-light.png";
import { jwtDecode } from "jwt-decode"; // <-- named import (correct)
import AuthSlider from '../../pages/AuthenticationInner/authCarousel';
import ReCAPTCHA from "react-google-recaptcha";

import "../../assets/scss/pages/_nestleoAuth.scss";
import AccountInactiveModal from './inactiveCoownerModal';

const Login = (props) => {
  const { t } = useTranslation();
  const recaptchaRef = useRef(null);
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || '';

  const [rememberMe, setRememberMe] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => ({
    loading: state.Loginn.loading,
    error: state.Loginn.error,
  }));
  const [showInactiveModal, setShowInactiveModal] = useState(false);

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [passwordShow, setPasswordShow] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });

  useEffect(() => {
    const remember = localStorage.getItem('rememberMe') === 'true';
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    const rememberedPassword = localStorage.getItem('rememberedPassword');

    if (remember && rememberedEmail) {
      setFormData(prev => ({ ...prev, email: rememberedEmail, password: rememberedPassword }));
      setRememberMe(true);
    }
  }, []);

  const validateFields = () => {
    let errors = { email: '', password: '' };
    if (!formData.email) {
      errors.email = t('auth.emailRequired');
    } else if (!formData.email.includes('@')) {
      errors.email = t('auth.emailInvalid');
    } else if ((formData.email.match(/@/g) || []).length > 1) {
      errors.email = t('auth.emailMultipleAt');
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      errors.email = t('auth.emailInvalidFormat');
    }
    if (!formData.password) {
      errors.password = t('auth.passwordRequired');
    }
    return errors;
  };
const mask = s => (s && s.length>10) ? `${s.slice(0,8)}...${s.slice(-4)}` : s;
const handleRecaptchaChange = (token) => {
  setRecaptchaToken(token);
  if (process.env.NODE_ENV !== 'production') {
    console.log('[client] reCAPTCHA token received (masked):', token ? mask(token) : 'null');
  } else {
    console.log('[client] reCAPTCHA token present');
  }
};

const handleSubmit = async (e) => {
  e.preventDefault();
  setLocalError(null);

  // validate fields...
  const errors = validateFields();
  setFieldErrors(errors);
  if (errors.email || errors.password) {
    dispatch(clearError());
    return;
  }

  if (!recaptchaToken) {
    setLocalError(t('auth.pleaseCompleteRecaptcha') || 'Please complete the reCAPTCHA.');
    return;
  }

  // payload includes token in body AND we add header as fallback
const payload = { ...formData, recaptchaToken };

if (process.env.NODE_ENV !== 'production') {
  console.log('[client] sending login payload JSON:', JSON.stringify(payload));
  console.log('[client] sending recaptcha token (masked):', mask(recaptchaToken));
}
const result = await dispatch(loginUser(payload));

  // Reset captcha after response so user can retry
  try { recaptchaRef.current?.reset(); } catch (err) {}
  setRecaptchaToken(null);

  // Check server-provided recaptcha flag explicitly
  const serverPayload = result.payload || {};
   const backendMsg = (typeof serverPayload === 'string') ? serverPayload : (serverPayload.message || serverPayload);

  if (serverPayload.recaptchaVerified === false) {
    console.warn('[client] server reported recaptcha verification failed:', serverPayload.details || serverPayload);
    setLocalError(t('auth.recaptchaFailed') || 'reCAPTCHA verification failed. Please try again.');
    return;
  }

    // keep existing inactive flow
    if (result.payload?.user?.role === "SyndicateCoowner" && !result.payload?.user?.isActive) {
      setShowInactiveModal(true);
      return;
    }

    // Existing backend message mapping
    if (result.error && result.error.message === "Rejected") {
      if (backendMsg === "Invalid email or password") {
        setFieldErrors({ ...fieldErrors, password: t('auth.incorrectCredentials') });
        return;
      }
      if (backendMsg === "Email not verified") {
        setLocalError(t('auth.emailNotVerified'));
        return;
      }
      if (backendMsg === "Account deactivated") {
        setLocalError(t('auth.accountDeactivated'));
        return;
      }
      if (backendMsg === "User not registered" || backendMsg === "Account not found") {
        setLocalError(t('auth.emailNotRegistered'));
        return;
      }
      if (backendMsg === "User already exists") {
        setFieldErrors({ ...fieldErrors, email: t('auth.userAlreadyExists') });
        return;
      }
      if (backendMsg === "Building not found") {
        setLocalError(t('auth.buildingNotFound'));
        return;
      }
      if (backendMsg === "Invalid user data") {
        setLocalError(t('auth.invalidUserData'));
        return;
      }
    }

    if (!result.payload?.user) {
      setLocalError(backendMsg || t('auth.emailNotRegistered'));
      return;
    }

    // Successful login: remember credentials if needed + redirect flows
    if (result.payload.user && result.payload.user.isActive) {
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('rememberedEmail', formData.email);
        localStorage.setItem('rememberedPassword', formData.password);
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
      }

      const userRole = result.payload.user.role?.toLowerCase();
      if (userRole === 'syndicateadmin') {
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
        if (getCookie('freePackInfoShown') !== 'true') {
          navigate('/free-pack-info');
        } else {
          navigate('/dashboard');
        }
      } else {
        navigate('/dashboard');
      }
    }

    if (result.payload?.token) {
      try {
        const decodedUser = jwtDecode(result.payload.token);
        // use decodedUser if needed
      } catch (e) {
        console.warn('Token decode failed', e);
      }
    }
  };

  const handleGoBack = () => navigate('/landing');

  useEffect(() => { dispatch(clearError()); }, [dispatch]);

  const handleGoogleSignIn = () => {
    window.location.href = `${process.env.REACT_APP_API_URL}/auth/google`;
  };

  const handleInactiveLogout = () => {
    setShowInactiveModal(false);
    dispatch(clearError());
    navigate("/landing");
  };

  return (
    <div className="nestly-auth-wrapper">
      <AccountInactiveModal isOpen={showInactiveModal} onClose={handleInactiveLogout} onLogout={handleInactiveLogout} />
      <div className="nestly-bg-overlay"></div>
      <div className="container">
        <div className="nestly-auth-card">
          <div className="nestly-auth-row">
            <div className="nestly-auth-col-left">
              <div className="nestly-auth-slider"><AuthSlider /></div>
            </div>

            <div className="nestly-auth-col-right">
              <div className="nestly-auth-header">
                <h3>{t('auth.welcomeBack')}</h3>
                <p>{t('auth.signInToContinue')}</p>
              </div>

              {localError && <div className="nestly-alert nestly-alert-danger" style={{ marginBottom: '1rem' }}>{localError}</div>}

              <form onSubmit={handleSubmit}>
                <div className="nestly-form-group">
                  <label htmlFor="email">{t('auth.email')}</label>
                  <input
                    type="text"
                    className="nestly-form-control"
                    id="email"
                    placeholder={t('auth.enterEmail')}
                    value={formData.email}
                    onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setFieldErrors({ ...fieldErrors, email: '' }); if (localError) setLocalError(null); }}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                  {fieldErrors.email && <div className="nestly-field-error text-danger">{fieldErrors.email}</div>}
                </div>

                <div className="nestly-form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor="password">{t('auth.password')}</label>
                  </div>
                  <div className="nestly-password-group">
                    <input
                      type={passwordShow ? "text" : "password"}
                      className="nestly-form-control"
                      id="password"
                      placeholder={t('auth.enterPassword')}
                      value={formData.password}
                      onChange={(e) => { setFormData({ ...formData, password: e.target.value }); setFieldErrors({ ...fieldErrors, password: '' }); if (localError) setLocalError(null); }}
                    />
                    <button type="button" className="nestly-password-toggle" onClick={() => setPasswordShow(!passwordShow)}>
                      <i className={`ri-${passwordShow ? 'eye-off' : 'eye'}-fill`}></i>
                    </button>
                  </div>
                  {fieldErrors.password && <div className="nestly-field-error text-danger">{fieldErrors.password}</div>}
                </div>

                <Link to="/forgot-password" className="nestly-auth-link nestly-forgot-password">{t('auth.forgotPassword')}</Link>

                <div className="nestly-form-check mb-3">
                  <input className="form-check-input" type="checkbox" id="remember-me" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                  <label htmlFor="remember-me">{t('auth.rememberMe')}</label>
                </div>

                {/* reCAPTCHA widget */}
                <div className="nestly-form-group" style={{ margin: "1rem 0", textAlign: "center" }}>
                <ReCAPTCHA
  ref={recaptchaRef}
  sitekey={SITE_KEY}
  onChange={handleRecaptchaChange}    // <-- use your handler
  onExpired={() => setRecaptchaToken(null)}
  theme="light"
/>
                </div>

                <button type="submit" className="nestly-btn nestly-btn-primary nestly-btn-block" disabled={loading || !recaptchaToken}>
                  {loading ? (<><span className="nestly-spinner"></span>{t('auth.signingIn')}</>) : t('auth.signIn')}
                </button>

                <div className="nestly-social-divider"><span>{t('auth.signInWith')}</span></div>

                <div className="nestly-social-buttons">
                  <button type="button" className="nestly-social-btn nestly-google" onClick={handleGoogleSignIn}><i className="ri-google-fill"></i></button>
                </div>

                <div className="nestly-auth-footer">
                  <p>{t('auth.dontHaveAccount')} <Link to="/roleSelection" className="nestly-auth-link">{t('auth.signUp')}</Link></p>
                  <Link to="/landing" className="nestly-auth-link"><i className="ri-arrow-left-line" style={{ fontSize: '14px', marginRight: '4px' }}></i>{t('auth.backToHome')}</Link>
                </div>
              </form>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default withRouter(Login);
