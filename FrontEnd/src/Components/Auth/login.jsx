import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import withRouter from "../Common/withRouter";
import { clearError, loginUser } from "../../slices/login/loginSlice";
import logoLight from "../../assets/images/logo-light.png";
import { jwtDecode } from "jwt-decode";
import AuthSlider from '../../pages/AuthenticationInner/authCarousel';

// Make sure to import the new stylesheet
import "../../assets/scss/pages/_nestleoAuth.scss";
import AccountInactiveModal from './inactiveCoownerModal';

const Login = (props) => {
    const { t } = useTranslation();
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
    const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' }); // Custom field errors
    // Ajouter cet useEffect pour charger les données "Se souvenir de moi" au chargement
    useEffect(() => {
        const rememberMe = localStorage.getItem('rememberMe') === 'true';
        const rememberedEmail = localStorage.getItem('rememberedEmail');
        const rememberedPassword = localStorage.getItem('rememberedPassword');

        if (rememberMe && rememberedEmail) {
            setFormData(prev => ({ ...prev, email: rememberedEmail }));
            setFormData(prev => ({ ...prev, password: rememberedPassword }));

            setRememberMe(true);
        }
    }, []);


    const validateFields = () => {
        let errors = { email: '', password: '' };
        // Email validation
        if (!formData.email) {
            errors.email = t('auth.emailRequired');
        } else if (!formData.email.includes('@')) {
            errors.email = t('auth.emailInvalid');
        } else if ((formData.email.match(/@/g) || []).length > 1) {
            errors.email = t('auth.emailMultipleAt');
        } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
            errors.email = t('auth.emailInvalidFormat');
        }
        // Password validation
        if (!formData.password) {
            errors.password = t('auth.passwordRequired');
        }
        return errors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError(null);
        const errors = validateFields();
        setFieldErrors(errors);
        if (errors.email || errors.password) {
            dispatch(clearError());
            return;
        }

        // Regular login flow
        const result = await dispatch(loginUser(formData));

        console.log("Login result:", result);

        // Restrict login for Admin and SuperAdmin roles
        const userRoleRaw = result.payload?.user?.role;
        if (userRoleRaw && (userRoleRaw.toLowerCase() === 'admin' || userRoleRaw.toLowerCase() === 'superadmin' || userRoleRaw.toLowerCase() === 'super-admin')) {
            setLocalError(t('auth.accountDoesntExist'));
            return;
        }

        if (
            result.payload.user?.role === "SyndicateCoowner" &&
            !result.payload.user?.isActive
        ) {
            setShowInactiveModal(true);
            return;
        }
        // Map backend errors to frontend field/local errors
        const backendMsg = result.payload?.message || result.payload;
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
            if (backendMsg === "User not registered") {
                setLocalError(t('auth.emailNotRegistered'));
                return;
            }
            if (backendMsg === "Account not found") {
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

        if (!result.payload.user?.isActive) {
            setLocalError(t('auth.accountDeactivated'));
            return;

        } else if (result.payload.user.isActive) {
            if (rememberMe) {
                localStorage.setItem('rememberMe', 'true');
                localStorage.setItem('rememberedEmail', formData.email);
                localStorage.setItem('rememberedPassword', formData.password);
            } else {
                localStorage.removeItem('rememberMe');
                localStorage.removeItem('rememberedEmail');
                localStorage.removeItem('rememberedPassword');
            }

            // Show FreePackInfo page only once for SyndicateAdmin after first login (using cookie)
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
            const userRole = result.payload.user.role?.toLowerCase();
            if (userRole === 'syndicateadmin') {
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
            const decodedUser = jwtDecode(result.payload.token);
        }
    };
    const handleGoBack = () => {
        navigate('/landing');
    };
    useEffect(() => {
        dispatch(clearError());
    }, [dispatch]);

    useEffect(() => {
        return () => {
            dispatch(clearError());
        };
    }, [dispatch]);

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
            <AccountInactiveModal
                isOpen={showInactiveModal}
                onClose={handleInactiveLogout}
                onLogout={handleInactiveLogout}
            />
            <div className="nestly-bg-overlay"></div>
            <div className="container">
                <div className="nestly-auth-card">
                    <div className="nestly-auth-row">
                        <div className="nestly-auth-col-left">
                            <div className="nestly-auth-slider">
                                <AuthSlider />
                            </div>
                        </div>
                        <div className="nestly-auth-col-right">
                            <div className="nestly-auth-header">
                                <h3>{t('auth.welcomeBack')}</h3>
                                <p>{t('auth.signInToContinue')}</p>
                            </div>

                            {/* Show localError at the top of the form like the backend/global error */}
                            {localError && (
                                <div className="nestly-alert nestly-alert-danger" style={{ marginBottom: '1rem' }}>{localError}</div>
                            )}

                            <form onSubmit={handleSubmit}>
                                <div className="nestly-form-group">
                                    <label htmlFor="email">{t('auth.email')}</label>
                                    <input
                                        type="text" // Change from "email" to "text" to disable browser validation
                                        className="nestly-form-control"
                                        id="email"
                                        placeholder={t('auth.enterEmail')}
                                        value={formData.email}
                                        onChange={(e) => {
                                            setFormData({ ...formData, email: e.target.value });
                                            setFieldErrors({ ...fieldErrors, email: '' });
                                            if (localError) setLocalError(null);
                                        }}
                                    />
                                    {fieldErrors.email && (
                                        <div className="nestly-field-error text-danger">{fieldErrors.email}</div>
                                    )}
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
                                            onChange={(e) => {
                                                setFormData({ ...formData, password: e.target.value });
                                                setFieldErrors({ ...fieldErrors, password: '' });
                                                if (localError) setLocalError(null);
                                            }}
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
                                <Link to="/forgot-password" className="nestly-auth-link nestly-forgot-password">
                                    {t('auth.forgotPassword')}
                                </Link>
                                <div className="nestly-form-check mb-3">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="remember-me"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                    />
                                    <label htmlFor="remember-me">{t('auth.rememberMe')}</label>
                                </div>

                                <button type="submit" className="nestly-btn nestly-btn-primary nestly-btn-block" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <span className="nestly-spinner"></span>
                                            {t('auth.signingIn')}
                                        </>
                                    ) : t('auth.signIn')}
                                </button>

                                <div className="nestly-social-divider">
                                    <span>{t('auth.signInWith')}</span>
                                </div>

                                <div className="nestly-social-buttons">
                                    <button
                                        type="button"
                                        className="nestly-social-btn nestly-google"
                                        onClick={handleGoogleSignIn}
                                    >
                                        <i className="ri-google-fill"></i>
                                    </button>
                                </div>

                                <div className="nestly-auth-footer">
                                    <p>{t('auth.dontHaveAccount')} <Link to="/roleSelection" className="nestly-auth-link">{t('auth.signUp')}</Link></p>
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

export default withRouter(Login);