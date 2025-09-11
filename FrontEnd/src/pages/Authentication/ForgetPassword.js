import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import withRouter from "../../Components/Common/withRouter";
import * as Yup from "yup";
import { useFormik } from "formik";
import { forgotPassword } from "../../slices/login/loginSlice";
import logoLight from "../../assets/images/logo-light.png";
import AuthSlider from "../AuthenticationInner/authCarousel";

// Import the custom Nestleo styling
import "../../assets/scss/pages/_nestleoAuth.scss";

const ForgetPasswordPage = props => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [emailSent, setEmailSent] = useState(false);
  const [localError, setLocalError] = useState('');

  const validation = useFormik({
    enableReinitialize: true,
    initialValues: {
      email: '',
    },
    validationSchema: Yup.object({
      email: Yup.string().email(t('auth.emailInvalid')).required(t('auth.emailRequired')),
    }),
    onSubmit: (values) => {
      dispatch(forgotPassword(values)).unwrap()
        .then(() => {
          setTimeout(() => {
            setEmailSent(true);
          }, 1000);
        })
        .catch((error) => {
          if (error?.message === 'User not found') {
            setLocalError('Email not found');
          }
        });
    }

  });

  const { loading, forgetError, forgetSuccessMsg } = useSelector(state => ({
    loading: state.Loginn.loading,
    forgetError: state.ForgetPassword?.forgetError,
    forgetSuccessMsg: state.ForgetPassword?.forgetSuccessMsg,
  }));

  useEffect(() => {
    if (forgetSuccessMsg) {
      setEmailSent(true);
    }
  }, [forgetSuccessMsg]);

  document.title = "Reset Password | Nestleo";

  if (emailSent) {
    return (
      <div className="nestly-auth-wrapper">
        <div className="nestly-bg-overlay"></div>
        <div className="container" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh'
        }}>
          <div className="nestly-auth-card" style={{ maxWidth: '500px', width: '100%' }}>
            <div className="nestly-auth-row">
              <div className="nestly-auth-col-right" style={{
                flex: '1 0 100%',
                maxWidth: '100%',
                padding: '3rem 2rem',
                textAlign: 'center'
              }}>
                <div className="nestly-auth-header text-center">
                  <div className="mb-4">
                    <Link to="/" className="d-inline-block">
                      <img src={logoLight} alt="Nestleo" height="30" />
                    </Link>
                  </div>
                </div>

                <div className="text-success" style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                  <i className="ri-mail-send-line"></i>
                </div>

                <h3 className="mb-3">{t('auth.checkYourEmail')}</h3>
                <p className="text-muted mb-4">
                  {t('auth.resetLinkSent')}<br />
                  {t('auth.checkInboxInstructions')}
                </p>

                <Link
                  to="/connect"
                  className="nestly-btn nestly-btn-primary nestly-btn-block"
                >
                  {t('auth.backToLogin')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                <h3>{t('auth.forgotPasswordTitle')}</h3>
                <p>{t('auth.forgotPasswordSubtitle')}</p>
              </div>

              {(forgetError || localError) && (
                <div className="nestly-alert nestly-alert-danger">
                  {forgetError || localError}
                </div>
              )}

              <form onSubmit={(e) => {
                e.preventDefault();
                validation.handleSubmit();
                return false;
              }}>
                <div className="nestly-form-group">
                  <label htmlFor="email">{t('auth.email')}</label>
                  <input
                    type="email"
                    className="nestly-form-control"
                    id="email"
                    placeholder={t('auth.enterEmail')}
                    name="email"
                    value={validation.values.email}
                    onChange={validation.handleChange}
                    onBlur={validation.handleBlur}
                  />
                  {validation.touched.email && validation.errors.email && (
                    <div className="text-danger small mt-1">{validation.errors.email}</div>
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
                      {t('auth.sending')}
                    </>
                  ) : t('auth.sendResetLink')}
                </button>
              </form>

              <div className="nestly-auth-footer">
                <p>{t('auth.rememberPassword')} <Link to="/connect" className="nestly-auth-link">{t('auth.signIn')}</Link></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default withRouter(ForgetPasswordPage);