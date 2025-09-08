import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { clearError, registerUser } from '../../../src/slices/login/loginSlice';
import AuthSlider from "../../pages/AuthenticationInner/authCarousel";
import logoLight from "../../assets/images/logo-light.png";
import ReCAPTCHA from "react-google-recaptcha";

// Import i18next for language detection
import i18n from '../../i18n';

// Import the custom Nestleo styling
import "../../assets/scss/pages/_nestleoAuth.scss";

const RegisterSyndicate = () => {
   const recaptchaRef = useRef(null);
   const [recaptchaToken, setRecaptchaToken] = useState(null);
   const SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
   
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phoneNumber: '',
        role: 'SyndicateAdmin'
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError(null);
    if (!recaptchaToken) {
      setLocalError(t('auth.pleaseCompleteRecaptcha') || 'Please complete the reCAPTCHA.');
      return;
    }

        const errors = validateFields();
        setFieldErrors(errors);
        if (errors.firstName || errors.lastName || errors.email || errors.password || errors.phoneNumber) {
            dispatch(clearError());
            return;
        }
        // Get current language from localStorage or i18next
        const currentLanguage = localStorage.getItem('I18N_LANGUAGE') || i18n.language || 'en';
        const formDataWithLanguage = { ...formData, language: currentLanguage, recaptcha: recaptchaToken  };
           try { recaptchaRef.current?.reset(); } catch (e) { /* ignore */ }
         setRecaptchaToken(null);
        const result = await dispatch(registerUser(formDataWithLanguage));
        const backendMsg = result.payload?.message || result.payload;
        if (result.error && result.error.message === "Rejected") {
            if (backendMsg === "User already exists") {
                setFieldErrors({ ...fieldErrors, email: t('auth.userAlreadyExists') });
                return;
            }
            if (backendMsg === "Invalid user data") {
                setLocalError(t('auth.invalidUserData'));
                return;
            }
        }
        if (result.payload?.data && result.payload?.message) {
            navigate('/verify-email-notice', { state: { email: formData.email } });
        } else if (backendMsg) {
            setLocalError(backendMsg);
        }
    };
    const handleGoogleSignIn = () => {
        window.location.href = `${process.env.REACT_APP_API_URL}/auth/google`;
    };

    return (
        <div className="nestly-auth-wrapper">
            <div className="nestly-bg-overlay"></div>
            <div className="container">
                <div className="nestly-auth-card">
                    <div className="nestly-auth-row">
                        <div className="nestly-auth-col-left">
                            <AuthSlider />
                        </div>
                        <div className="nestly-auth-col-right">
                            <div className="nestly-auth-header">
                                {/* <h3>{t('auth.createNewAccount')}</h3> */}
                                {/* <p>{t('auth.createSyndicateAccount')}</p> */}
                                 <h3>{t('auth.createSyndicateAccount')}</h3>
                            </div>
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
                                        placeholder={t('auth.enterFirstName')}
                                        value={formData.firstName}
                                        onChange={(e) => {
                                            setFormData({ ...formData, firstName: e.target.value });
                                            setFieldErrors({ ...fieldErrors, firstName: '' });
                                            if (localError) setLocalError(null);
                                        }}
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
                                        placeholder={t('auth.enterLastName')}
                                        value={formData.lastName}
                                        onChange={(e) => {
                                            setFormData({ ...formData, lastName: e.target.value });
                                            setFieldErrors({ ...fieldErrors, lastName: '' });
                                            if (localError) setLocalError(null);
                                        }}
                                    />
                                    {fieldErrors.lastName && (
                                        <div className="nestly-field-error text-danger">{fieldErrors.lastName}</div>
                                    )}
                                </div>
                                <div className="nestly-form-group">
                                    <label htmlFor="email">{t('auth.email')}</label>
                                    <input
                                        type="text"
                                        className="nestly-form-control"
                                        id="email"
                                        placeholder={t('auth.enterEmail')}
                                        value={formData.email}
                                        onChange={(e) => {
                                            setFormData({ ...formData, email: e.target.value });
                                            setFieldErrors({ ...fieldErrors, email: '' });
                                            if (localError) setLocalError(null);
                                        }}
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
                                        placeholder={t('auth.enterPhoneNumber')}
                                        value={formData.phoneNumber}
                                        onChange={(e) => {
                                            setFormData({ ...formData, phoneNumber: e.target.value });
                                            setFieldErrors({ ...fieldErrors, phoneNumber: '' });
                                            if (localError) setLocalError(null);
                                        }}
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
                                            placeholder={t('auth.enterPassword')}
                                            value={formData.password}
                                            onChange={(e) => {
                                                setFormData({ ...formData, password: e.target.value });
                                                setFieldErrors({ ...fieldErrors, password: '' });
                                                if (localError) setLocalError(null);
                                            }}
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
                                         <div className="nestly-form-group" style={{ margin: '1rem 0', textAlign: 'center' }}>
                                           <ReCAPTCHA
                                             ref={recaptchaRef}
                                             sitekey={SITE_KEY}
                                             onChange={token => setRecaptchaToken(token)}
                                             onExpired={() => setRecaptchaToken(null)}
                                             theme="light"
                                           />
                                           {localError && localError === (t('auth.pleaseCompleteRecaptcha') || 'Please complete the reCAPTCHA.') && (
                                             <div className="nestly-field-error text-danger" style={{ marginTop: 6 }}>
                                               {localError}
                                             </div>
                                           )}
                                         </div>

                                <button
                                    type="submit"
                                    className="nestly-btn nestly-btn-primary nestly-btn-block"
                                    disabled={loading|| !recaptchaToken}
                                >
                                    {loading ? (
                                        <>
                                            <span className="nestly-spinner"></span>
                                            {t('auth.creatingAccount')}
                                        </>
                                    ) : t('auth.createAccount')}
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
                                   <div className="nestly-form-group" style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.8rem' }}>
                                                                <p>
                                                                 {t('auth.agreeTerms')} <Link to="/TermsAndConditions"> {t('auth.service')} </Link> {t('auth.and')} <Link to="/privacy-policy"> {t('auth.PrivacyPolicy')} </Link>.
                                                                </p>
                                                                   <Link to="/landing" className="nestly-auth-link">
                                                                        <i className="ri-arrow-left-line" style={{ fontSize: '14px', marginRight: '4px' }}></i>
                                                                        {t('auth.backToHome')}
                                                                    </Link>
                                
                                                               </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterSyndicate;