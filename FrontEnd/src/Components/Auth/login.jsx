// src/components/Auth/Login.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import withRouter from "../Common/withRouter";
import { clearError, loginUser, setUser as setUserAction } from "../../slices/login/loginSlice";
import logoLight from "../../assets/images/logo-light.png";
import { jwtDecode } from "jwt-decode";

import AuthSlider from '../../pages/AuthenticationInner/authCarousel';
import ReCAPTCHA from "react-google-recaptcha";

import "../../assets/scss/pages/_nestleoAuth.scss";
import AccountInactiveModal from './inactiveCoownerModal';

import { verifyLoginTwoFa, sendTwoFaCode, setAuthorization } from "../../services/api"; // <-- added

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

  // --- 2FA UI state ---
  const [show2FaModal, setShow2FaModal] = useState(false);
  const [twoFaTempToken, setTwoFaTempToken] = useState(null);
  const [twoFaCode, setTwoFaCode] = useState('');
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [twoFaError, setTwoFaError] = useState(null);
  const [twoFaResendLoading, setTwoFaResendLoading] = useState(false);
  const [twoFaResendMsg, setTwoFaResendMsg] = useState(null);
  // --------------------

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

  const open2FaModal = (tempToken) => {
    setTwoFaTempToken(tempToken || null);
    setTwoFaCode('');
    setTwoFaError(null);
    setTwoFaResendMsg(null);
    setShow2FaModal(true);
  };

  const close2FaModal = () => {
    setShow2FaModal(false);
    setTwoFaTempToken(null);
    setTwoFaCode('');
    setTwoFaError(null);
    setTwoFaResendMsg(null);
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

  const payload = { ...formData, recaptchaToken };

  if (process.env.NODE_ENV !== 'production') {
    console.log('[client] sending login payload JSON:', JSON.stringify(payload));
    console.log('[client] sending recaptcha token (masked):', mask(recaptchaToken));
  }

  const action = await dispatch(loginUser(payload));

  // Reset captcha after response so user can retry
  try { recaptchaRef.current?.reset(); } catch (err) {}
  setRecaptchaToken(null);

  // normalize server payload
  const serverPayload = action.payload || {};
  const backendMsg = (typeof serverPayload === 'string') ? serverPayload : (serverPayload.message || serverPayload);

  if (serverPayload.recaptchaVerified === false) {
    console.warn('[client] server reported recaptcha verification failed:', serverPayload.details || serverPayload);
    setLocalError(t('auth.recaptchaFailed') || 'reCAPTCHA verification failed. Please try again.');
    return;
  }
  if (serverPayload.mustAcceptPolicies) {
  const temp = serverPayload.tempPolicyToken || serverPayload.temp_policy_token || serverPayload.tempToken || serverPayload.tempToken;
  if (!temp) {
    setLocalError(t('auth.missingTempToken') || 'Policy acceptance required but no temp token returned.');
    return;
  }
  // navigate to AcceptPolicies page, pass token + maybe email
  navigate('/accept-policies', { state: { tempPolicyToken: temp, email: serverPayload.email || formData.email } });
  return;
}
if (serverPayload.twoFaRequired) {
  const temp = serverPayload.tempToken || serverPayload.temp_token || serverPayload.token;
  if (!temp) {
    setLocalError(t('auth.missingTempToken') || '2FA required but no temp token returned');
    return;
  }
  navigate('/auth-2fa', { state: { tempToken: temp } });
  return;
}


  // -------------- 2FA flow detection (robust) ----------------
  console.debug('[client] login result (raw):', action);

  // payload might live in action.payload.user, action.payload.data, or action.payload (depends on your thunk)
  const normalized = serverPayload.user || serverPayload.data || serverPayload || {};
  console.debug('[client] normalized payloadData:', normalized);

  const twoFaRequired =
    Boolean(normalized.twoFaRequired) ||
    Boolean(normalized.two_fa_required) ||
    Boolean(normalized.twoFa) ||
    false;

  const tempTokenCandidate =
    normalized.tempToken ||
    normalized.temp_token ||
    normalized.temp ||
    normalized.token ||
    serverPayload.tempToken ||
    serverPayload.token ||
    null;

  console.debug('[client] 2FA check:', { twoFaRequired, tempTokenCandidate });


  // --------------------------------------------------

  // At this point 2FA was not required — continue normal login handling

  // If server responded with an error shape (rejected), action.error may exist — keep previous mapping handling
  if (action.error && action.error.message === "Rejected") {
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

  // Ensure we have a user object somewhere
  const loggedUser = serverPayload.user || serverPayload.data?.user || serverPayload;
  if (!loggedUser || !loggedUser.user && !loggedUser.role && !loggedUser.email) {
    // fallback: if thunk returned plain message it's an error
    setLocalError(backendMsg || t('auth.emailNotRegistered'));
    return;
  }

  // Successful login: remember credentials if needed + redirect flows
  // best to use normalized data: token maybe in serverPayload.token or normalized.token
  const token = serverPayload.token || normalized.token || null;
  const userObj = serverPayload.user || normalized.user || normalized; // normalized user object

  if (userObj && userObj.isActive) {
    if (rememberMe) {
      localStorage.setItem('rememberMe', 'true');
      localStorage.setItem('rememberedEmail', formData.email);
      localStorage.setItem('rememberedPassword', formData.password);
    } else {
      localStorage.removeItem('rememberMe');
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberedPassword');
    }

    // If token present (non-2FA), store and decode if needed

if (token) {
  setAuthorization(token); // stores token centrally
  try {
    const decodedUser = jwtDecode(token);
    dispatch(setUserAction(decodedUser));
  } catch (e) {
    // fallback: if user object present set it
    if (userObj) dispatch(setUserAction(userObj));
  }
} else {
      // If no token but user object returned, set it directly in redux
      try {
        dispatch(setUserAction(userObj));
      } catch (e) {
        console.warn('Could not dispatch user object', e);
      }
    }

    // Redirect based on role
    const userRole = (userObj.role || '').toLowerCase();
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
  } else {
    // If user exists but inactive (SyndicateCoowner flow)
    if (userObj && userObj.role === "SyndicateCoowner" && !userObj.isActive) {
      setShowInactiveModal(true);
      return;
    }

    // fallback error
    setLocalError(backendMsg || t('auth.emailNotRegistered'));
  }
};


  // Verify code handler (modal)
  const handleVerifyTwoFa = async () => {
    setTwoFaError(null);
    setTwoFaLoading(true);

    if (!twoFaTempToken) {
      setTwoFaError(t('auth.missingTempToken') || 'Missing temporary token. Please retry login.');
      setTwoFaLoading(false);
      return;
    }
    if (!twoFaCode || twoFaCode.length !== 6) {
      setTwoFaError(t('auth.codeInvalid') || 'Enter the 6-digit code.');
      setTwoFaLoading(false);
      return;
    }

    try {
      const resp = await verifyLoginTwoFa(twoFaTempToken, twoFaCode);
      // expect resp.token + resp.user
      if (resp?.token) {
        setAuthorization(resp.token);
        // dispatch user update in redux
        if (resp.user) dispatch(setUserAction(resp.user));
        // close modal and redirect
        close2FaModal();
        navigate('/dashboard');
      } else {
        setTwoFaError(t('auth.verifyFailed') || 'Verification succeeded but no token returned.');
      }
    } catch (err) {
      const msg = err?.message || (err?.message || t('auth.verifyFailed') || 'Verification failed');
      setTwoFaError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setTwoFaLoading(false);
    }
  };

  // Resend code (calls backend send endpoint using temp token as auth)
  const handleResendTwoFa = async () => {
    setTwoFaResendMsg(null);
    setTwoFaError(null);
    setTwoFaResendLoading(true);
    try {
      // Use sendTwoFaCode helper that uses axios api instance:
      // we send with temp token in Authorization header if needed
      if (!twoFaTempToken) throw new Error(t('auth.missingTempToken') || 'Missing temp token');
      await sendTwoFaCode(tempToken);

      setTwoFaResendMsg(t('auth.twoFa.codeResent') || 'Verification code resent.');
    } catch (err) {
      const msg = err?.message || (err?.message || t('auth.resendFailed') || 'Failed to resend code');
      setTwoFaError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setTwoFaResendLoading(false);
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
                    onChange={handleRecaptchaChange}
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

      {/* ------------------ 2FA Modal (simple) ------------------ */}
      {show2FaModal && (
        <div className="modal show d-block" tabIndex="-1" role="dialog" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('auth.enter2FaCode') || 'Enter verification code'}</h5>
                <button type="button" className="btn-close" onClick={close2FaModal} />
              </div>
              <div className="modal-body">
                <p>{t('auth.codeSentToEmail') || 'A verification code has been sent to your email. Enter it below.'}</p>

                <input
                  className="form-control"
                  value={twoFaCode}
                  onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0,6))}
                  placeholder="123456"
                  maxLength={6}
                  style={{ fontSize: '1.2rem', letterSpacing: '6px', width: '170px' }}
                />

                {twoFaError && <div className="text-danger mt-2">{twoFaError}</div>}
                {twoFaResendMsg && <div className="text-success mt-2">{twoFaResendMsg}</div>}
                <div className="mt-2">
                  <small className="text-muted">{t('auth.twoFa.codeExpires') || 'The code expires in 10 minutes.'}</small>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-link" onClick={handleResendTwoFa} disabled={twoFaResendLoading}>
                  {twoFaResendLoading ? (t('auth.sending') || 'Sending...') : (t('auth.resendCode') || 'Resend code')}
                </button>
                <div style={{ flex: 1 }} /> {/* space */}
                <button className="btn btn-secondary" onClick={close2FaModal}>{t('auth.cancel') || 'Cancel'}</button>
                <button className="btn btn-primary" onClick={handleVerifyTwoFa} disabled={twoFaLoading}>
                  {twoFaLoading ? (t('auth.verifying') || 'Verifying...') : (t('auth.verify') || 'Verify')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* -------------------------------------------------------- */}
    </div>
  );
};

export default withRouter(Login);
