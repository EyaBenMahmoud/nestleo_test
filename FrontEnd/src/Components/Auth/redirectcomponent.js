import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchUserProfile, setAuthorization } from "../../services/api";
import { setFakePassword, setisUserLoggedIn, setUser } from '../../slices/login/loginSlice';
import logoLight from "../../assets/images/logo-light.png";
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';

// Import the custom Nestleo styling
import "../../assets/scss/pages/_nestleoAuth.scss";

const Redirect = () => {
    const { t } = useTranslation();
    document.title = t('redirect.title') + " | Nestleo";
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const handleRedirect = async () => {
            try {
                const queryParams = new URLSearchParams(location.search);
                const token = queryParams.get("token");
                const fakePassword = queryParams.get("fakePassword");

                if (!token || !fakePassword) {
                    setError(t('redirect.missingTokenOrPassword'));
                    setIsLoading(false);
                    setTimeout(() => navigate("/connect", { replace: true }), 2000);
                    return;
                }

                // Store the token and password
                setAuthorization(token);
                dispatch(setFakePassword(fakePassword));

                // IMPORTANT: await the async function here
                const userData = await fetchUserProfile();
                console.log("User data received:", userData);

                if (!userData) {
                    setError(t('redirect.failedToFetchProfile'));
                    setIsLoading(false);
                    setTimeout(() => navigate("/connect", { replace: true }), 2000);
                    return;
                }

                // Now we have the user data, store it in Redux
                dispatch(setUser(userData));
                dispatch(setisUserLoggedIn(true));

                // Store in localStorage as well if needed
                localStorage.setItem("user", JSON.stringify(userData));

                // Redirect based on user role
                const validRoles = ["SuperAdmin", "Admin", "SyndicateAdmin", "SyndicateCoowner", "Worker"];

                if (validRoles.includes(userData.role)) {
                    const redirectPath = queryParams.get("state") || "/dashboard";
                    navigate(redirectPath, { replace: true });
                } else if (userData.role === "User") {
                    navigate("/selectrole", { replace: true });
                } else {
                    setError(t('redirect.unknownRole') + `: ${userData.role}`);
                    setIsLoading(false);
                    setTimeout(() => navigate("/connect", { replace: true }), 2000);
                }
            } catch (err) {
                console.error("Redirect error:", err);
                setError(t('redirect.errorProcessingLogin'));
                setIsLoading(false);
                setTimeout(() => navigate("/connect", { replace: true }), 2000);
            }
        };

        handleRedirect();
    }, [location, navigate, dispatch]);

    return (
        <div className="nestly-auth-wrapper d-flex align-items-center justify-content-center">
            <div className="nestly-bg-overlay"></div>
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-md-8 col-lg-6 col-xl-5">
                        <div className="nestly-auth-card my-4">
                            <div className="nestly-auth-inner p-4">
                                <div className="nestly-auth-header text-center">
                                    <div className="mb-4">
                                        <Link to="/" className="d-inline-block">
                                            <img src={logoLight} alt="Nestleo" height="30" />
                                        </Link>
                                    </div>
                                    <h3>{error ? t('redirect.authError') : t('redirect.title')}</h3>
                                    <p>{error || t('redirect.preparingDashboard')}</p>
                                </div>

                                {isLoading && (
                                    <div className="text-center my-5">
                                        <div className="nestly-spinner" style={{
                                            width: '3.5rem',
                                            height: '3.5rem',
                                            margin: '0 auto',
                                            border: '0.25em solid rgba(230, 72, 92, 0.2)',
                                            borderRightColor: '#e6485c',
                                            borderRadius: '50%',
                                            animation: 'spin 1.2s linear infinite'
                                        }}></div>
                                    </div>
                                )}

                                {!isLoading && error && (
                                    <div className="text-center my-4">
                                        <p className="text-muted">{t('redirect.redirectingToLogin')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style jsx>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .nestly-auth-wrapper {
                    min-height: 100vh;
                    position: relative;
                }
                .nestly-auth-card {
                    background-color: white;
                    border-radius: 12px;
                    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                    position: relative;
                }
                .nestly-auth-inner {
                    padding: 2.5rem;
                }
            `}</style>
        </div>
    );
};

export default Redirect;