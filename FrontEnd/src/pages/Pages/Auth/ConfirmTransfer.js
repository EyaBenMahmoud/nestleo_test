import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';
import api from '../../../services/api';
import logoLight from "../../../assets/images/logo-light.png";
import AuthSlider from '../../AuthenticationInner/authCarousel';

// Import the Nestleo auth styling
import "../../../assets/scss/pages/_nestleoAuth.scss";

const ConfirmTransfer = () => {
    const { t } = useTranslation();
    const { token } = useParams();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [transferData, setTransferData] = useState(null);

    useEffect(() => {
        if (token) {
            confirmTransfer();
        } else {
            setError(t('settings.transfer.confirmPage.errors.invalidToken'));
            setLoading(false);
        }
    }, [token, t]);

    const confirmTransfer = async () => {
        try {
            const response = await api.get(`/users/confirm-transfer/${token}`);
            
            if (response.data.success) {
                setSuccess(true);
                setTransferData(response.data.data);
                
                // Redirect to login after 5 seconds
                setTimeout(() => {
                    navigate('/landing');
                }, 5000);
            } else {
                // Handle specific backend error cases with frontend translations
                const backendMessage = response.data.message || '';
                setError(getTranslatedError(backendMessage));
            }
        } catch (error) {
            console.error('Transfer confirmation error:', error);
            
            // Handle different error scenarios with translated messages
            if (error.response?.status === 400) {
                const backendMessage = error.response?.data?.message || '';
                setError(getTranslatedError(backendMessage));
            } else if (error.response?.status === 404) {
                setError(t('settings.transfer.confirmPage.errors.transferNotFound'));
            } else if (error.response?.status >= 500) {
                setError(t('settings.transfer.confirmPage.errors.networkError'));
            } else if (!error.response) {
                setError(t('settings.transfer.confirmPage.errors.networkError'));
            } else {
                setError(t('settings.transfer.confirmPage.errors.unknownError'));
            }
        } finally {
            setLoading(false);
        }
    };

    // Function to map backend error messages to translated frontend messages
    const getTranslatedError = (backendMessage) => {
        const lowerMessage = backendMessage.toLowerCase();
        
        if (lowerMessage.includes('invalid') || lowerMessage.includes('token')) {
            return t('settings.transfer.confirmPage.errors.invalidToken');
        }
        if (lowerMessage.includes('expired')) {
            return t('settings.transfer.confirmPage.errors.tokenExpired');
        }
        if (lowerMessage.includes('not found')) {
            return t('settings.transfer.confirmPage.errors.transferNotFound');
        }
        if (lowerMessage.includes('already confirmed') || lowerMessage.includes('already completed')) {
            return t('settings.transfer.confirmPage.errors.alreadyConfirmed');
        }
        
        // Default to unknown error for any unmapped messages
        return t('settings.transfer.confirmPage.errors.unknownError');
    };

    const redirectToLogin = () => {
        navigate('/landing');
    };

    document.title = `${t('settings.transfer.confirmPage.title')} | Nestleo`;

    return (
        <div className="nestly-auth-wrapper">
            <div className="nestly-bg-overlay"></div>
            <div className="container">
                <div className="nestly-auth-card">
                    <div className="nestly-auth-row">
                        {/* Left Column with Slider */}
                        <div className="nestly-auth-col-left">
                            <div className="nestly-auth-slider">
                                <AuthSlider />
                            </div>
                        </div>
                        
                        {/* Right Column with Content */}
                        <div className="nestly-auth-col-right">
                            <div className="nestly-auth-header">
                                <div className="mb-4 text-center">
                                    <Link to="/" className="d-inline-block">
                                        <img src={logoLight} alt="Nestleo" height="30" />
                                    </Link>
                                </div>
                                <h3>{t('settings.transfer.confirmPage.title')}</h3>
                                <p>{t('settings.transfer.confirmPage.description')}</p>
                            </div>

                            <div className="p-2 mt-4">
                                {loading && (
                                    <div className="text-center">
                                        <div className="mb-4">
                                            <FaSpinner className="text-primary" size={48} spin />
                                        </div>
                                        <h5 className="text-primary mb-3">{t('settings.transfer.confirmPage.confirming')}</h5>
                                        <p className="text-muted">{t('settings.transfer.confirmPage.confirmingMessage')}</p>
                                    </div>
                                )}

                                {success && transferData && (
                                    <div className="text-center">
                                        <div className="mb-4">
                                            <FaCheckCircle className="text-success" size={48} />
                                        </div>
                                        
                                        <div className="nestly-alert" style={{
                                            color: '#155724',
                                            backgroundColor: '#d4edda',
                                            borderColor: '#c3e6cb'
                                        }}>
                                            <h5 className="mb-3">{t('settings.transfer.confirmPage.transferConfirmed')}</h5>
                                            <p className="mb-0">
                                                {transferData.oldEmail && transferData.newEmail ? (
                                                    t('settings.transfer.confirmPage.successMessage', {
                                                        oldEmail: transferData.oldEmail,
                                                        newEmail: transferData.newEmail
                                                    })
                                                ) : (
                                                    t('settings.transfer.confirmPage.transferConfirmed')
                                                )}
                                            </p>
                                        </div>

                                        {transferData.newEmail && (
                                            <div className="mt-3">
                                                <div className="nestly-alert" style={{
                                                    color: '#0c5460',
                                                    backgroundColor: '#d1ecf1',
                                                    borderColor: '#bee5eb'
                                                }}>
                                                    <p className="mb-0">
                                                        <strong>{t('importantDecline')}</strong> {t('settings.transfer.confirmPage.credentialsMessage', {
                                                            newEmail: transferData.newEmail
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-4">
                                            <button 
                                                className="nestly-btn nestly-btn-primary nestly-btn-block"
                                                onClick={redirectToLogin}
                                            >
                                                {t('settings.transfer.confirmPage.goToLogin')}
                                            </button>
                                            <p className="text-muted mt-2 mb-0 text-center">
                                                <small>{t('settings.transfer.confirmPage.autoRedirect')}</small>
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {success && !transferData && (
                                    <div className="text-center">
                                        <div className="mb-4">
                                            <FaCheckCircle className="text-success" size={48} />
                                        </div>
                                        
                                        <div className="nestly-alert" style={{
                                            color: '#155724',
                                            backgroundColor: '#d4edda',
                                            borderColor: '#c3e6cb'
                                        }}>
                                            <h5 className="mb-3">{t('settings.transfer.confirmPage.transferConfirmed')}</h5>
                                            <p className="mb-0">{t('settings.transfer.confirmPage.transferConfirmed')}</p>
                                        </div>

                                        <div className="mt-4">
                                            <button 
                                                className="nestly-btn nestly-btn-primary nestly-btn-block"
                                                onClick={redirectToLogin}
                                            >
                                                {t('settings.transfer.confirmPage.goToLogin')}
                                            </button>
                                            <p className="text-muted mt-2 mb-0 text-center">
                                                <small>{t('settings.transfer.confirmPage.autoRedirect')}</small>
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {error && (
                                    <div className="text-center">
                                        <div className="mb-4">
                                            <FaTimesCircle className="text-danger" size={48} />
                                        </div>
                                        
                                        <div className="nestly-alert nestly-alert-danger">
                                            <h5 className="mb-3">{t('settings.transfer.confirmPage.confirmationFailed')}</h5>
                                            <p className="mb-0">{error}</p>
                                        </div>

                                        <div className="mt-4">
                                            <button 
                                                className="nestly-btn nestly-btn-primary nestly-btn-block"
                                                onClick={redirectToLogin}
                                            >
                                                {t('settings.transfer.confirmPage.goToLogin')}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmTransfer;
