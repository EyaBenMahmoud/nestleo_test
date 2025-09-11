import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import withRouter from "../Components/Common/withRouter";
import { clearError, loginUser } from "../slices/login/loginSlice";
import { jwtDecode } from "jwt-decode";
import AuthSlider from '../pages/AuthenticationInner/authCarousel';

// Import the same stylesheet as login.jsx
import "../assets/scss/pages/_nestleoAuth.scss";

const SuperAdminLogin = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { loading, error } = useSelector((state) => ({
        loading: state.Loginn.loading,
        error: state.Loginn.error,
    }));

    const [formData, setFormData] = useState({ email: "", password: "" });
    const [passwordShow, setPasswordShow] = useState(false);
    const [localError, setLocalError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Clear previous local errors
        setLocalError(null);
        
        // Regular login flow
        const result = await dispatch(loginUser(formData));

        if (!result.payload?.user) {
            // Handle case where login failed but no payload returned
            return;
        }

        // Check if user is SuperAdmin after successful login
        if (result.payload.user?.role !== 'SuperAdmin' && result.payload.user?.role!== 'Admin') {
            setLocalError(t('superAdminLogin.accessDenied'));
            return;
        }

        if (!result.payload.user?.isActive) {
            setLocalError(t('superAdminLogin.accountDeactivated'));
            return;
        } else if (result.payload.user.isActive) {
            navigate("/dashboard");
        }

        if (result.payload?.token) {
            const decodedUser = jwtDecode(result.payload.token);
        }
    };

    useEffect(() => {
        dispatch(clearError());
    }, [dispatch]);

    useEffect(() => {
        return () => {
          dispatch(clearError());
        };
    }, [dispatch]);

    return (
        <div className="nestly-auth-wrapper">
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
                                <h3>{t('superAdminLogin.title')}</h3>
                                <p>{t('superAdminLogin.subtitle')}</p>
                                <div className="restricted-access-badge">
                                    {t('superAdminLogin.restrictedAccess')}
                                </div>
                            </div>

                            {/* Display either Redux error or local validation error */}
                            {(error || localError) && (
                                <div className="nestly-alert nestly-alert-danger">
                                    {localError || (error && error.message)}
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                <div className="nestly-form-group">
                                    <label htmlFor="email">{t('superAdminLogin.emailLabel')}</label>
                                    <input
                                        type="email"
                                        className="nestly-form-control"
                                        id="email"
                                        placeholder={t('superAdminLogin.emailPlaceholder')}
                                        value={formData.email}
                                        onChange={(e) => {
                                            setFormData({ ...formData, email: e.target.value });
                                            // Clear error when typing
                                            if (localError) setLocalError(null);
                                        }}
                                        required
                                    />
                                </div>

                                <div className="nestly-form-group">
                                    <Link to="/forgot-password" className="nestly-auth-link nestly-forgot-password">
                                        {t('superAdminLogin.forgotPassword')}
                                    </Link>
                                    <label htmlFor="password">{t('superAdminLogin.passwordLabel')}</label>
                                    <div className="nestly-password-group">
                                        <input
                                            type={passwordShow ? "text" : "password"}
                                            className="nestly-form-control"
                                            id="password"
                                            placeholder={t('superAdminLogin.passwordPlaceholder')}
                                            value={formData.password}
                                            onChange={(e) => {
                                                setFormData({ ...formData, password: e.target.value });
                                                // Clear error when typing
                                                if (localError) setLocalError(null);
                                            }}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="nestly-password-toggle"
                                            onClick={() => setPasswordShow(!passwordShow)}
                                        >
                                            <i className={`ri-${passwordShow ? 'eye-off' : 'eye'}-fill`}></i>
                                        </button>
                                    </div>
                                </div>

                                <div className="nestly-form-check mb-3">
                                    <input className="form-check-input" type="checkbox" id="remember-me" />
                                    <label htmlFor="remember-me">{t('superAdminLogin.rememberMe')}</label>
                                </div>

                                <button type="submit" className="nestly-btn nestly-btn-primary nestly-btn-block" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <span className="nestly-spinner"></span>
                                            {t('superAdminLogin.authenticating')}
                                        </>
                                    ) : t('superAdminLogin.signInButton')}
                                </button>

                                <div className="nestly-auth-footer mt-4">
                                    <p>{t('superAdminLogin.notSuperAdmin')} <Link to="/connect" className="nestly-auth-link">{t('superAdminLogin.regularLogin')}</Link></p>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add custom styles to highlight this as the admin portal */}
            <style jsx>{`
                .nestly-auth-header h3 {
                    color: #e6485c;
                }
                
                .nestly-auth-header p {
                    color: #495057;
                    font-weight: 500;
                }
                
                .restricted-access-badge {
                    background: #e6485c;
                    color: white;
                    font-size: 10px;
                    font-weight: bold;
                    padding: 3px 10px;
                    border-radius: 4px;
                    margin: 10px auto 0;
                    width: fit-content;
                    letter-spacing: 1px;
                }
                
                .nestly-btn-primary {
                    background-color: #343a40 !important;
                    border-color: #343a40 !important;
                }
                
                .nestly-btn-primary:hover {
                    background-color: #23272b !important;
                    border-color: #1d2124 !important;
                }
            `}</style>
        </div>
    );
};

export default withRouter(SuperAdminLogin);