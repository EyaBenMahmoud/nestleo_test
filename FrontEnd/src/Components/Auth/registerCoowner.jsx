import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { clearError, registerUser } from '../../../src/slices/login/loginSlice';
import AuthSlider from '../../pages/AuthenticationInner/authCarousel';
import VerificationBuilding from './verificationBuilding';
import logoLight from '../../assets/images/logo-light.png';

// Import i18next for language detection
import i18n from '../../i18n';

// Import the custom Nestleo styling
import "../../assets/scss/pages/_nestleoAuth.scss";

const RegisterCoowner = () => {
  const { t } = useTranslation();
  const [step, setStep] = useState('verify'); // 'verify' or 'register'
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phoneNumber: '',
    role: 'SyndicateCoowner',
    buildingId: '',
    isActive: false
  });
  const [passwordShow, setPasswordShow] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({ firstName: '', lastName: '', email: '', password: '', phoneNumber: '' });
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.Loginn);
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(clearError());
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const validateFields = () => {
    let errors = { firstName: '', lastName: '', email: '', password: '', phoneNumber: '' };
    // First name validation
    if (!formData.firstName.trim()) {
      errors.firstName = t('auth.firstNameRequired') || 'First name is required.';
    } else if (formData.firstName !== formData.firstName.trim()) {
      errors.firstName = t('auth.firstNameSpaces') || 'First name cannot start or end with spaces.';
    } else if (/[^a-zA-ZÀ-ÿ\s'-]/.test(formData.firstName)) {
      errors.firstName = t('auth.firstNameInvalidChars') || 'First name must not contain numbers or special characters.';
    } else if (/\d/.test(formData.firstName)) {
      errors.firstName = t('auth.firstNameNoNumbers') || 'First name must not contain numbers.';
    }
    // Last name validation
    if (!formData.lastName.trim()) {
      errors.lastName = t('auth.lastNameRequired') || 'Last name is required.';
    } else if (formData.lastName !== formData.lastName.trim()) {
      errors.lastName = t('auth.lastNameSpaces') || 'Last name cannot start or end with spaces.';
    } else if (/[^a-zA-ZÀ-ÿ\s'-]/.test(formData.lastName)) {
      errors.lastName = t('auth.lastNameInvalidChars') || 'Last name must not contain numbers or special characters.';
    } else if (/\d/.test(formData.lastName)) {
      errors.lastName = t('auth.lastNameNoNumbers') || 'Last name must not contain numbers.';
    }
    // Email validation
    if (!formData.email) {
      errors.email = t('auth.emailRequired');
    } else if (!formData.email.includes('@')) {
      errors.email = t('auth.emailInvalid');
    } else if ((formData.email.match(/@/g) || []).length > 1) {
      errors.email = t('auth.emailMultipleAt');
    } else if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]@[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(formData.email)) {
      errors.email = t('auth.emailInvalidFormat');
    }
    // Phone number validation (optional)
    if (formData.phoneNumber && formData.phoneNumber.trim()) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(formData.phoneNumber.replace(/[\s\-\(\)]/g, ''))) {
        errors.phoneNumber = t('auth.phoneNumberInvalid') || 'Please enter a valid phone number.';
      }
    }
    // Password validation
    if (!formData.password) {
      errors.password = t('auth.passwordRequired');
    } else if (formData.password.length < 6) {
      errors.password = t('auth.passwordMinLength') || 'Password must be at least 6 characters.';
    } else if (formData.password.length > 12) {
      errors.password = t('auth.passwordMaxLength') || 'Password must be at most 12 characters.';
    } else if (!/[a-z]/.test(formData.password)) {
      errors.password = t('auth.passwordLowercase') || 'Password must contain a lowercase letter.';
    } else if (!/[A-Z]/.test(formData.password)) {
      errors.password = t('auth.passwordUppercase') || 'Password must contain an uppercase letter.';
    } else if (!/\d/.test(formData.password)) {
      errors.password = t('auth.passwordNumber') || 'Password must contain a number.';
    } else if (!/[!@#$%^&*(),.?":{}|<>_+=\-]/.test(formData.password)) {
      errors.password = t('auth.passwordSymbol') || 'Password must contain a symbol.';
    }
    return errors;
  };

  const handleBuildingVerified = (buildingId) => {
    setFormData(prev => ({ ...prev, buildingId }));
    setStep('register');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFieldErrors(prev => ({ ...prev, [name]: '' }));
    if (localError) setLocalError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    const errors = validateFields();
    setFieldErrors(errors);
    if (errors.firstName || errors.lastName || errors.email || errors.password || errors.phoneNumber) {
      dispatch(clearError());
      return;
    }
    // Check for SuperAdmin pattern in email
    if (formData.email.toLowerCase().includes('admin') ||
      formData.email.toLowerCase().includes('superadmin') ||
      formData.email.toLowerCase().includes('super-admin')) {
      setLocalError(t('auth.accountDoesntExist'));
      return;
    }
    // Regular registration flow
    try {
      // Get current language from localStorage or i18next
      const currentLanguage = localStorage.getItem('I18N_LANGUAGE') || i18n.language || 'en';
      const submissionData = {
        ...formData,
        language: currentLanguage,
        isActive: false // Force false for co-owner registration
      };
      const result = await dispatch(registerUser(submissionData));
      const backendMsg = result.payload?.message || result.payload;
      if (result.error && result.error.message === "Rejected") {
        if (backendMsg === "Invalid email or password") {
          setFieldErrors({ ...fieldErrors, password: t('auth.incorrectCredentials') });
          return;
        }
        if (backendMsg === "Account deactivated") {
          setLocalError(t('auth.accountDeactivated'));
          return;
        }
        if (backendMsg === "User not registered") {
          setLocalError(t('auth.userNotRegistered'));
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
      if (!result.error) {
        navigate('/verify-email-notice', { state: { email: formData.email } });
      }


    } catch (error) {
      setLocalError(t('auth.registrationError'));
    }
  };
  const handleGoogleSignIn = () => {
    window.location.href = `${process.env.REACT_APP_API_URL}/auth/google`;
  };

  return (
    <div className="nestly-auth-wrapper">
      <div className="nestly-bg-overlay"></div>
      <div className="container">
        {step === 'verify' ? (
          <VerificationBuilding onVerify={handleBuildingVerified} />
        ) : (
          <div className="nestly-auth-card">
            <div className="nestly-auth-row">
              <div className="nestly-auth-col-left">
                <AuthSlider />
              </div>
              <div className="nestly-auth-col-right">
                <div className="nestly-auth-header">
                  <h3>{t('auth.completeRegistration')}</h3>
                  <p>{t('auth.enterDetailsCoowner')}</p>
                </div>

                {/* Show localError at the top of the form like the backend/global error */}
                {localError && (
                  <div className="nestly-alert nestly-alert-danger" style={{ marginBottom: '1rem' }}>{localError}</div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="nestly-form-group">
                    <label htmlFor="firstName">{t('auth.firstName')}</label>
                    <input
                      type="text"
                      className="nestly-form-control"
                      id="firstName"
                      name="firstName"
                      placeholder={t('auth.enterFirstName')}
                      value={formData.firstName}
                      onChange={handleChange}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="words"
                      spellCheck="false"
                    />
                    {fieldErrors.firstName && (
                      <div className="nestly-field-error text-danger">{fieldErrors.firstName}</div>
                    )}
                  </div>

                  <div className="nestly-form-group">
                    <label htmlFor="lastName">{t('auth.lastName')}</label>
                    <input
                      type="text"
                      className="nestly-form-control"
                      id="lastName"
                      name="lastName"
                      placeholder={t('auth.enterLastName')}
                      value={formData.lastName}
                      onChange={handleChange}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="words"
                      spellCheck="false"
                    />
                    {fieldErrors.lastName && (
                      <div className="nestly-field-error text-danger">{fieldErrors.lastName}</div>
                    )}
                  </div>

                  <div className="nestly-form-group">
                    <label htmlFor="email">{t('auth.email')}</label>
                    <input
                      type="text" // Changed from "email" to "text" to disable browser validation
                      className="nestly-form-control"
                      id="email"
                      name="email"
                      placeholder={t('auth.enterEmail')}
                      value={formData.email}
                      onChange={handleChange}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                    />
                    {fieldErrors.email && (
                      <div className="nestly-field-error text-danger">{fieldErrors.email}</div>
                    )}
                  </div>

                  <div className="nestly-form-group">
                    <label htmlFor="phoneNumber">{t('auth.phoneNumber')} <span className="text-muted">({t('auth.optional')})</span></label>
                    <input
                      type="tel"
                      className="nestly-form-control"
                      id="phoneNumber"
                      name="phoneNumber"
                      placeholder={t('auth.enterPhoneNumber')}
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      autoComplete="tel"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                    />
                    {fieldErrors.phoneNumber && (
                      <div className="nestly-field-error text-danger">{fieldErrors.phoneNumber}</div>
                    )}
                  </div>

                  <div className="nestly-form-group">
                    <label htmlFor="password">{t('auth.password')}</label>
                    <div className="nestly-password-group">
                      <input
                        type={passwordShow ? "text" : "password"}
                        className="nestly-form-control"
                        id="password"
                        name="password"
                        placeholder={t('auth.enterPassword')}
                        value={formData.password}
                        onChange={handleChange}
                        minLength="6"
                        autoComplete="new-password"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                      />
                      <button
                        type="button"
                        className="nestly-password-toggle"
                        onClick={() => setPasswordShow(!passwordShow)}
                      >
                        <i className={`ri-${passwordShow ? 'eye-off' : 'eye'}-fill`}></i>
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <div className="nestly-field-error text-danger">{fieldErrors.password}</div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="nestly-btn nestly-btn-primary nestly-btn-block"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="nestly-spinner"></span>
                        {t('auth.creatingAccount')}
                      </>
                    ) : t('auth.register')}
                  </button>
                  <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <div className="nestly-social-buttons">
                      <button
                        type="button"
                        className="nestly-social-btn nestly-google"
                        onClick={handleGoogleSignIn}
                      >
                        <i className="ri-google-fill"></i>
                      </button>
                    </div>
                  </div>
                  <div className="nestly-auth-footer">
                    <p>{t('auth.alreadyHaveAccount')} <Link to="/connect" className="nestly-auth-link">{t('auth.signIn')}</Link></p>
                    <Link to="/landing" className="nestly-auth-link">
                      <i className="ri-arrow-left-line" style={{ fontSize: '14px', marginRight: '4px' }}></i>
                      {t('auth.backToHome')}
                    </Link>
                  </div>

                </form>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterCoowner;