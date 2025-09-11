import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { resetPassword } from '../../../slices/login/loginSlice';
import logoLight from "../../../assets/images/logo-light.png";
import AuthSlider from "../authCarousel";

// Import the custom Nestleo styling
import "../../../assets/scss/pages/_nestleoAuth.scss";

const BasicPasswCreate = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { token } = useParams();
    const { loading, error } = useSelector((state) => state.Loginn);
    
    const [passwordShow, setPasswordShow] = useState(false);
    const [confirmPasswordShow, setConfirmPasswordShow] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const validation = useFormik({
        initialValues: {
            password: "",
            confirm_password: "",
        },
        validationSchema: Yup.object({
            password: Yup.string()
                .min(8, t('auth.passwordMinLength8'))
                .matches(/^(?=.*[a-z])/, t('auth.passwordAtLeastOneLower'))
                .matches(/^(?=.*[A-Z])/, t('auth.passwordAtLeastOneUpper'))
                .matches(/^(?=.*[0-9])/, t('auth.passwordAtLeastOneNumber'))
                .matches(/^(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/, t('auth.passwordAtLeastOneSpecial'))
                .required(t('auth.passwordRequired')),
            confirm_password: Yup.string()
                .oneOf([Yup.ref('password'), null], t('auth.passwordsMustMatch'))
                .required(t('auth.confirmPasswordRequired')),
        }),
        onSubmit: async (values) => {
            try {
                const result = await dispatch(resetPassword({ 
                    token, 
                    password: values.password 
                })).unwrap();
                
                setSuccessMessage(t('auth.passwordResetSuccess'));
                setTimeout(() => navigate('/connect'), 2000);
            } catch (error) {
                // Error handling is done through Redux state
            }
        }
    });

    document.title = `${t('auth.createNewPassword')} | Nestleo`;

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
                                <h3>{t('auth.createNewPassword')}</h3>
                            </div>

                            {error && <div className="nestly-alert nestly-alert-danger">{error.message}</div>}
                            {successMessage && <div className="nestly-alert nestly-alert-success">{successMessage}</div>}

                            <form onSubmit={validation.handleSubmit}>
                                <div className="nestly-form-group">
                                    <label htmlFor="password">{t('auth.password')}</label>
                                    <div className="nestly-password-group">
                                        <input
                                            type={passwordShow ? "text" : "password"}
                                            className="nestly-form-control"
                                            id="password"
                                            placeholder={t('auth.enterPassword')}
                                            name="password"
                                            value={validation.values.password}
                                            onChange={validation.handleChange}
                                            onBlur={validation.handleBlur}
                                        />
                                        <button
                                            type="button"
                                            className="nestly-password-toggle"
                                            onClick={() => setPasswordShow(!passwordShow)}
                                        >
                                            <i className={`ri-${passwordShow ? 'eye-off' : 'eye'}-fill`}></i>
                                        </button>
                                    </div>
                                    {validation.touched.password && validation.errors.password && (
                                        <div className="text-danger small mt-1">{validation.errors.password}</div>
                                    )}
                                </div>

                                <div className="nestly-form-group">
                                    <label htmlFor="confirm_password">{t('auth.confirmPassword')}</label>
                                    <div className="nestly-password-group">
                                        <input
                                            type={confirmPasswordShow ? "text" : "password"}
                                            className="nestly-form-control"
                                            id="confirm_password"
                                            placeholder={t('auth.enterConfirmPassword')}
                                            name="confirm_password"
                                            value={validation.values.confirm_password}
                                            onChange={validation.handleChange}
                                            onBlur={validation.handleBlur}
                                        />
                                        <button
                                            type="button"
                                            className="nestly-password-toggle"
                                            onClick={() => setConfirmPasswordShow(!confirmPasswordShow)}
                                        >
                                            <i className={`ri-${confirmPasswordShow ? 'eye-off' : 'eye'}-fill`}></i>
                                        </button>
                                    </div>
                                    {validation.touched.confirm_password && validation.errors.confirm_password && (
                                        <div className="text-danger small mt-1">{validation.errors.confirm_password}</div>
                                    )}
                                </div>

                                <div className="password-requirements mt-3 mb-3">
                                    <p className="text-muted mb-2">{t('auth.passwordMustContain')}</p>
                                    <ul className="ps-3 text-muted">
                                        <li className="small">{t('auth.passwordMinLength8')}</li>
                                        <li className="small">{t('auth.passwordAtLeastOneLower')}</li>
                                        <li className="small">{t('auth.passwordAtLeastOneUpper')}</li>
                                        <li className="small">{t('auth.passwordAtLeastOneNumber')}</li>
                                        <li className="small">{t('auth.passwordAtLeastOneSpecial')}</li>
                                    </ul>
                                </div>

                                <button 
                                    type="submit" 
                                    className="nestly-btn nestly-btn-primary nestly-btn-block" 
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="nestly-spinner"></span>
                                            {t('auth.resettingPassword')}
                                        </>
                                    ) : t('auth.resetPassword')}
                                </button>
                            </form>
                            
                            <div className="nestly-auth-footer">
                                <p>{t('auth.rememberYourPassword')} <Link to="/connect" className="nestly-auth-link">{t('auth.signIn')}</Link></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BasicPasswCreate;