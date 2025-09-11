import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { clearError, registerUser } from '../../../src/slices/login/loginSlice';
import AuthSlider from "../../pages/AuthenticationInner/authCarousel";
import logoLight from "../../assets/images/logo-light.png";

// Import the custom Nestleo styling
import "../../assets/scss/pages/_nestleoAuth.scss";

const Register = () => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'SyndicateAdmin',
    });
    const [passwordShow, setPasswordShow] = useState(false);
    const dispatch = useDispatch();
    const { loading, error } = useSelector((state) => state.Loginn);
    const navigate = useNavigate();

    const handleRoleChange = (e) => {
        const selectedRole = e.target.value;
        console.log(t('auth.selectedRole'), selectedRole);
        setFormData((prevData) => ({
            ...prevData,
            role: selectedRole,
        }));

        if (selectedRole === 'SyndicateCoowner') {
            navigate('/registercoowner');
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await dispatch(registerUser(formData));

        if (!result.error) {
            navigate('/verify-email-notice');
        }
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
                                <h3>{t('auth.createNewAccount')}</h3>
                                <p>{t('auth.createAdminAccount')}</p>
                            </div>

                            {error && <div className="nestly-alert nestly-alert-danger">{error.message}</div>}

                            <form onSubmit={handleSubmit}>
                                <div className="nestly-form-group">
                                    <label htmlFor="firstName">{t('auth.firstName')}</label>
                                    <input
                                        type="text"
                                        className="nestly-form-control"
                                        id="firstName"
                                        placeholder={t('auth.enterFirstName')}
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="nestly-form-group">
                                    <label htmlFor="lastName">{t('auth.lastName')}</label>
                                    <input
                                        type="text"
                                        className="nestly-form-control"
                                        id="lastName"
                                        placeholder={t('auth.enterLastName')}
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="nestly-form-group">
                                    <label htmlFor="email">{t('auth.email')}</label>
                                    <input
                                        type="email"
                                        className="nestly-form-control"
                                        id="email"
                                        placeholder={t('auth.enterEmail')}
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
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
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

                                <div className="nestly-form-group">
                                    <label htmlFor="role">{t('auth.role')}</label>
                                    <select
                                        className="nestly-form-control"
                                        id="role"
                                        value={formData.role}
                                        onChange={handleRoleChange}
                                    >
                                        <option value="" disabled>{t('auth.selectRole')}</option>
                                        <option value="SyndicateAdmin">{t('auth.syndicateAdmin')}</option>
                                        <option value="SyndicateCoowner">{t('auth.syndicateCoowner')}</option>
                                        <option value="Worker">{t('auth.worker')}</option>
                                    </select>
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
                                    ) : t('auth.createAccount')}
                                </button>

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
            </div>
        </div>
    );
};

export default Register;