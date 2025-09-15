import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { clearError, registerUser } from '../../../src/slices/login/loginSlice';
import AuthSlider from "../../pages/AuthenticationInner/authCarousel";
import logoLight from "../../assets/images/logo-light.png";
import { Trans } from 'react-i18next'; // si pas déjà importé
// import { Link } from 'react-router-dom'; // tu as déjà Link dans ton code, garde-le
import ReCAPTCHA from "react-google-recaptcha";

// Import the custom Nestleo styling
import "../../assets/scss/pages/_nestleoAuth.scss";

const RegisterWorker = () => {
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
        country: '',
        city: '',
        role: 'Worker'
    });
    const [countries, setCountries] = useState([]);
    const [cities, setCities] = useState([]);
    const [loadingCountries, setLoadingCountries] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);
    const [passwordShow, setPasswordShow] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({ firstName: '', lastName: '', email: '', password: '', phoneNumber: '', country: '', city: '' });
    const [localError, setLocalError] = useState(null);

    const dispatch = useDispatch();
    const { loading, error } = useSelector((state) => state.Loginn);
    const navigate = useNavigate();

    useEffect(() => {
        dispatch(clearError());
        return () => {
            dispatch(clearError());
        };
    }, [dispatch]);

    // Fetch countries on component mount
    useEffect(() => {
        const fetchCountries = async () => {
            setLoadingCountries(true);
            try {
                const response = await fetch('https://countriesnow.space/api/v0.1/countries');
                const data = await response.json();
                if (data.error === false) {
                    setCountries(data.data.map(country => country.country));
                }
            } catch (err) {
                console.error(t('auth.failedToFetchCountries'), err);
            } finally {
                setLoadingCountries(false);
            }
        };
        fetchCountries();
    }, [t]);

    // Update cities when country changes
    useEffect(() => {
        const fetchCities = async () => {
            if (!formData.country) {
                setCities([]);
                return;
            }
            setLoadingCities(true);
            try {
                const response = await fetch('https://countriesnow.space/api/v0.1/countries/cities', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ country: formData.country })
                });
                const data = await response.json();
                if (data.error === false) {
                    setCities(data.data);
                    setFormData(prev => ({ ...prev, city: '' })); // Reset city
                }
            } catch (err) {
                console.error(t('auth.failedToFetchCities'), err);
            } finally {
                setLoadingCities(false);
            }
        };
        fetchCities();
    }, [formData.country, t]);

    const validateFields = () => {
        let errors = { firstName: '', lastName: '', email: '', password: '', phoneNumber: '', country: '', city: '' };
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
        // Country validation
        if (!formData.country) {
            errors.country = t('auth.countryRequired') || 'Country is required.';
        }
        // City validation
        if (!formData.city) {
            errors.city = t('auth.cityRequired') || 'City is required.';
        }
        return errors;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setFieldErrors(prev => ({ ...prev, [name]: '' }));
        if (localError) setLocalError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError(null);

            // Client-side check: require reCAPTCHA token
    if (!recaptchaToken) {
      setLocalError(t('auth.pleaseCompleteRecaptcha') || 'Please complete the reCAPTCHA.');
      return;
    }
        const errors = validateFields();
        setFieldErrors(errors);
        if (Object.values(errors).some(Boolean)) {
            dispatch(clearError());
            return;
        }
        // Get current language from localStorage or i18next
        const currentLanguage = localStorage.getItem('I18N_LANGUAGE') || i18n.language || 'en';
        const formDataWithLanguage = { ...formData, language: currentLanguage, recaptcha: recaptchaToken  };
        const result = await dispatch(registerUser(formDataWithLanguage));
         try { recaptchaRef.current?.reset(); } catch (e) { /* ignore */ }
         setRecaptchaToken(null);
        const backendMsg = result.payload?.message || result.payload;
        if (result.error && result.error.message === "Rejected") {
            if (backendMsg === "User already exists") {
                setFieldErrors(prev => ({ ...prev, email: t('auth.userAlreadyExists') }));
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
                                <h3>{t('auth.createWorkerAccount')}</h3>
                            </div>

                            {error && <div className="nestly-alert nestly-alert-danger">{error.message}</div>}

                            <form onSubmit={handleSubmit} noValidate>
                                <div className="nestly-form-group">
                                    <label htmlFor="firstName">{t('auth.firstName')}</label>
                                    <input
                                        type="text"
                                        className="nestly-form-control"
                                        id="firstName"
                                        name="firstName"
                                        placeholder={t('auth.enterFirstName')}
                                        value={formData.firstName}
                                        onChange={handleInputChange}
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
                                        onChange={handleInputChange}
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
                                        type="text"
                                        className="nestly-form-control"
                                        id="email"
                                        name="email"
                                        placeholder={t('auth.enterEmail')}
                                        value={formData.email}
                                        onChange={handleInputChange}
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
                                        onChange={handleInputChange}
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
                                            onChange={handleInputChange}
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

                                <div className="nestly-form-group">
                                    <label htmlFor="country">{t('auth.country')}</label>
                                    <select
                                        className="nestly-form-control"
                                        id="country"
                                        name="country"
                                        value={formData.country}
                                        onChange={handleInputChange}
                                        disabled={loadingCountries}
                                    >
                                        <option value="">{t('auth.selectCountry')}</option>
                                        {loadingCountries ? (
                                            <option>{t('auth.loadingCountries')}</option>
                                        ) : (
                                            countries.map(country => (
                                                <option key={country} value={country}>{country}</option>
                                            ))
                                        )}
                                    </select>
                                    {fieldErrors.country && (
                                        <div className="nestly-field-error text-danger">{fieldErrors.country}</div>
                                    )}
                                </div>

                                <div className="nestly-form-group">
                                    <label htmlFor="city">{t('auth.city')}</label>
                                    <select
                                        className="nestly-form-control"
                                        id="city"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleInputChange}
                                        disabled={!formData.country || loadingCities}
                                    >
                                        <option value="">{t('auth.selectCity')}</option>
                                        {loadingCities ? (
                                            <option>{t('auth.loadingCities')}</option>
                                        ) : (
                                            cities.map(city => (
                                                <option key={city} value={city}>{city}</option>
                                            ))
                                        )}
                                    </select>
                                    {fieldErrors.city && (
                                        <div className="nestly-field-error text-danger">{fieldErrors.city}</div>
                                    )}
                                </div>
                                {localError && (
                                    <div className="nestly-alert nestly-alert-danger" style={{ marginBottom: '1rem' }}>{localError}</div>
                                )}
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
                  <span className="nestly-spinner" />{t('auth.creatingAccount')}
                </>
              ) : t('auth.createAccount')}
            </button>

            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <div className="nestly-social-buttons">
                <button
                  type="button"
                  className="nestly-social-btn nestly-google"
                  onClick={handleGoogleSignIn}
                  aria-label={t('auth.signInWithGoogle')}
                >
                  <i className="ri-google-fill" />
                </button>
              </div>
            </div>

            <div className="nestly-auth-footer" style={{ marginTop: '1rem' }}>
              <p>{t('auth.alreadyHaveAccount')} <Link to="/connect" className="nestly-auth-link">{t('auth.signIn')}</Link></p>
            </div>

            <div className="nestly-form-group" style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.8rem' }}>
              <p>
                {t('auth.agreeTerms')} <Link to="/TermsAndConditions"> {t('auth.service')} </Link> {t('auth.and')} <Link to="/privacy-policy"> {t('auth.PrivacyPolicy')} </Link>.
              </p>

              <Link to="/landing" className="nestly-auth-link">
                <i className="ri-arrow-left-line" style={{ fontSize: '14px', marginRight: '4px' }} />
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

export default RegisterWorker;