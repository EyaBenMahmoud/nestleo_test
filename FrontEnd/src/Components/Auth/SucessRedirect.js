import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { useDispatch } from 'react-redux';
import { setUser } from '../../slices/login/loginSlice';

// Import the custom Nestleo styling
import "../../assets/scss/pages/_nestleoAuth.scss";

// Add custom styles for the success page
const successStyles = {
    wrapper: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(-45deg, #e6485c, #ff8a9c)',
        textAlign: 'center',
        padding: '2rem',
        position: 'relative',
        color: 'white'
    },
    heading: {
        fontSize: '2.5rem',
        fontWeight: '700',
        marginBottom: '1rem',
        textShadow: '0 2px 4px rgba(0,0,0,0.2)'
    },
    subtext: {
        fontSize: '1.125rem',
        opacity: '0.9',
        marginBottom: '2rem'
    },
    popup: {
        background: 'white',
        borderRadius: '8px',
        padding: '2rem',
        textAlign: 'center',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        maxWidth: '400px',
        width: '100%'
    },
    popupHeading: {
        fontSize: '1.5rem',
        fontWeight: '600',
        color: '#2d3748',
        marginBottom: '1rem'
    },
    popupText: {
        color: '#718096',
        fontSize: '1rem'
    },
    icon: {
        fontSize: '3rem',
        color: '#e6485c',
        marginBottom: '1rem'
    }
};

const Success = () => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const sessionId = searchParams.get('session_id');
    const userId = searchParams.get('user_id');
    const dispatch = useDispatch();

    const [showPopup, setShowPopup] = useState(false);
    const [showConfetti, setShowConfetti] = useState(true);

    useEffect(() => {
        document.title = t('paymentSuccess.title') + " | Nestleo";
        const confirmSubscription = async () => {
            try {
                const response = await fetch(
                    `${process.env.REACT_APP_API_URL}/api/subscriptions/confirm?session_id=${sessionId}`
                );
                const data = await response.json();

                if (data.success) {
                    // Deep clone the user object to ensure Redux detects changes
                    const userClone = JSON.parse(JSON.stringify(data.user));

                    // Update Redux state
                    dispatch(setUser(userClone));

                    // Update localStorage
                    localStorage.setItem('user', JSON.stringify(userClone));

                    // Debug log to verify data
                    console.log('Updated subscription:', userClone.subscription);
                }
            } catch (error) {
                console.error('Error:', error);
            }
        };

        if (sessionId && userId) {
            confirmSubscription();
        }

        // Animation timeouts
        const popupTimeout = setTimeout(() => setShowPopup(true), 1000);
        const confettiTimeout = setTimeout(() => setShowConfetti(false), 4000);
        const redirectTimeout = setTimeout(() => navigate('/subscription'), 5000);

        return () => {
            clearTimeout(popupTimeout);
            clearTimeout(confettiTimeout);
            clearTimeout(redirectTimeout);
        };
    }, [sessionId, userId, navigate, dispatch, t]);

    return (
        <div style={successStyles.wrapper}>
            {showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight} />}

            <div className="nestly-bg-overlay"></div>

            <h1 style={successStyles.heading}>🎉 {t('paymentSuccess.title')} 🎉</h1>
            <p style={successStyles.subtext}>{t('paymentSuccess.thankYou')}</p>

            <AnimatePresence>
                {showPopup && (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, y: 20 }}
                        animate={{
                            scale: 1,
                            opacity: 1,
                            y: 0,
                            transition: {
                                type: "spring",
                                stiffness: 300,
                                damping: 24
                            }
                        }}
                        exit={{ scale: 0.8, opacity: 0, y: 20 }}
                        className="nestly-success-popup"
                    >
                        <div className="nestly-success-icon-wrapper">
                            <motion.div
                                className="nestly-success-icon-circle"
                                initial={{ scale: 0 }}
                                animate={{
                                    scale: 1,
                                    transition: { delay: 0.2, duration: 0.4 }
                                }}
                            >
                                <motion.div
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{
                                        pathLength: 1,
                                        opacity: 1,
                                        transition: {
                                            delay: 0.3,
                                            duration: 0.6,
                                            ease: "easeInOut"
                                        }
                                    }}
                                    className="nestly-check-icon"
                                >
                                    <svg viewBox="0 0 24 24" width="48" height="48">
                                        <motion.path
                                            fill="none"
                                            strokeWidth="3"
                                            stroke="#e6485c"
                                            d="M6,12 L10,16 L18,8"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ delay: 0.5, duration: 0.6, ease: "easeInOut" }}
                                        />
                                    </svg>
                                </motion.div>
                            </motion.div>
                        </div>

                        <motion.h2
                            className="nestly-success-heading"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{
                                opacity: 1,
                                y: 0,
                                transition: { delay: 0.6, duration: 0.3 }
                            }}
                        >
                            {t('paymentSuccess.subscriptionConfirmed')}
                        </motion.h2>

                        <motion.p
                            className="nestly-success-text"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{
                                opacity: 1,
                                y: 0,
                                transition: { delay: 0.8, duration: 0.3 }
                            }}
                        >
                            {t('paymentSuccess.redirectingToDashboard')}
                        </motion.p>

                        <motion.div
                            className="nestly-loading-bar-container"
                            initial={{ opacity: 0 }}
                            animate={{
                                opacity: 1,
                                transition: { delay: 1, duration: 0.3 }
                            }}
                        >
                            <motion.div
                                className="nestly-loading-bar"
                                initial={{ width: "0%" }}
                                animate={{
                                    width: "100%",
                                    transition: {
                                        delay: 1.2,
                                        duration: 3.5,
                                        ease: "linear"
                                    }
                                }}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Success;