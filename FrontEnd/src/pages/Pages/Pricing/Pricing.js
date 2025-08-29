import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Col, Container, Row } from 'reactstrap';
import BreadCrumb from '../../../Components/Common/BreadCrumb';
import { getSubscriptionsfront } from '../../../services/subscriptionservice';
import { loadStripe } from '@stripe/stripe-js';
import '../../Icons/RemixIcons/RemixIcons';
import { useSelector } from 'react-redux';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { useTranslation } from 'react-i18next';
import { useSubscriptionTranslations } from '../../../utils/subscriptionTranslations';

const Pricing = () => {
    // Initialize translation hook
    const { t } = useTranslation();
    const { translateFeatureName, translateSubscriptionType } = useSubscriptionTranslations();

    const user = useSelector((state) => state.Loginn.user);
    const [isAnnual, setIsAnnual] = useState(false);
    const [subscriptions, setSubscriptions] = useState([]);
    const [allFeatures, setAllFeatures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const sliderRef = useRef(null);
    const navigate = useNavigate();

    // Set page title
    document.title = "Pricing | Nestleo";

    // Initialize Stripe
    const [stripePromise, setStripePromise] = useState(null);

    useEffect(() => {
        const initializeStripe = async () => {
            const stripe = await loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
            setStripePromise(stripe);
        };
        initializeStripe();
    }, []);

    // Fetch subscription plans
    const selectedLang = useSelector(state => state.assistantConfig?.currentLanguage) || localStorage.getItem("I18N_LANGUAGE")?.split('-')[0] || "en";

    useEffect(() => {
        setLoading(true);
        setError(null);
        getSubscriptionsfront(selectedLang)
            .then(res => {
                // Defensive: handle both axios and fetch response formats
                if (res && res.data) {
                    setSubscriptions(res.data.subscriptions || []);
                    setAllFeatures(res.data.allFeatures || []);
                } else if (res && res.subscriptions) {
                    setSubscriptions(res.subscriptions || []);
                    setAllFeatures(res.allFeatures || []);
                } else {
                    setSubscriptions([]);
                    setAllFeatures([]);
                }
                setLoading(false);
            })
            .catch((err) => {
                setError("Failed to load subscriptions");
                setLoading(false);
                console.error('Failed to load subscriptions:', err);
            });
    }, [selectedLang]);

    // Handle subscription
    const handleSubscribe = async (planId, price) => {
        const token = localStorage.getItem("token");
        if (!token) {
            toast.warning(t('plans.signupRequired'), {
                position: "top-center",
                autoClose: 3000,
            });
            setTimeout(() => {
                navigate("/registerr", { replace: true });
            }, 3000);
            return;
        }
        try {
            const stripe = await stripePromise;
            const priceInCents = Math.round(price * 100 * 100);
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/subscriptions/create-checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId,
                    price: priceInCents,
                    customerEmail: user?.email,
                }),
            });
            const { sessionId } = await response.json();
            const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });
            if (stripeError) {
                console.error('Stripe Checkout error:', stripeError);
                toast.error(t('plans.paymentFailed'));
            }
        } catch (error) {
            console.error('Payment failed:', error);
            toast.error(t('plans.paymentFailed'));
        }
    };

    // Toggle between billing frequencies
    const toggleBillingFrequency = () => {
        setIsAnnual(!isAnnual);
    };

    // Filter subscriptions based on the interval from toggle
    const filteredSubscriptions = subscriptions.filter(subscription => 
        isAnnual ? subscription.interval === 'year' : subscription.interval === 'month'
    );

    // Slick slider settings
    const sliderSettings = {
        dots: true,
        infinite: false,
        speed: 500,
        slidesToShow: 3,
        slidesToScroll: 1,
        arrows: false,
        responsive: [
            {
                breakpoint: 1200,
                settings: {
                    slidesToShow: 2,
                    slidesToScroll: 1,
                }
            },
            {
                breakpoint: 768,
                settings: {
                    slidesToShow: 1,
                    slidesToScroll: 1,
                }
            }
        ]
    };

    const nextSlide = () => {
        sliderRef.current.slickNext();
    };

    const prevSlide = () => {
        sliderRef.current.slickPrev();
    };

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Plans" pageTitle="Pages" />
                    
                    <section className="pricing-section">
                        <div className="pricing-bg-element"></div>
                        <ToastContainer 
                            position="top-center"
                            autoClose={3000}
                            hideProgressBar={false}
                            newestOnTop={true}
                            closeOnClick
                            rtl={false}
                            pauseOnFocusLoss
                            draggable
                            pauseOnHover
                        />
                        
                        <Container>
                            {/* Header */}
                            <Row className="justify-content-center">
                                <Col lg={8} className="text-center">
                                    <div className="pricing-header">
                                        <h2 className="pricing-title">{t('plans.choosePlan')}</h2>
                                        <div className="section-line mx-auto"></div>
                                        <p className="pricing-description">
                                            {t('plans.pricingDescription')}
                                        </p>
                                    </div>
                                </Col>
                            </Row>

                            {/* Billing Toggle */}
                            <div className="billing-toggle-container">
                                <div className="billing-toggle">
                                    <span className={`toggle-option ${!isAnnual ? 'active' : ''}`}>{t('plans.monthly')}</span>
                                    <label className="toggle">
                                        <input 
                                            type="checkbox" 
                                            checked={isAnnual}
                                            onChange={toggleBillingFrequency}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                    <span className={`toggle-option ${isAnnual ? 'active' : ''}`}>
                                        {t('plans.yearly')}
                                        <span className="discount-badge">{t('plans.save20')}</span>
                                    </span>
                                </div>
                            </div>

                            {/* Loading State */}
                            {loading && (
                                <div className="loading-container">
                                    <div className="loading-spinner"></div>
                                    <p>{t('plans.loadingPlans')}</p>
                                </div>
                            )}

                            {/* Error State */}
                            {error && (
                                <div className="error-container">
                                    <i className="ri-error-warning-line"></i>
                                    <p>{t('plans.error')}: {error}</p>
                                    <button onClick={() => window.location.reload()}>
                                        {t('plans.tryAgain')}
                                    </button>
                                </div>
                            )}

                            {/* Plans */}
                            {!loading && !error && filteredSubscriptions.length > 0 && (
                                <div className="plans-carousel">
                                    <button className="nav-arrow prev" onClick={prevSlide}>
                                        <i className="ri-arrow-left-s-line"></i>
                                    </button>
                                    
                                    <Slider ref={sliderRef} {...sliderSettings} className="plans-slider">
                                        {filteredSubscriptions.map((plan) => (
                                            <div key={plan._id} className="plan-slide">
                                                <div className={`plan-card ${plan.isPopular ? 'popular' : ''}`}>
                                                    {plan.isPopular && (
                                                        <div className="popular-tag">
                                                            <span>{t('plans.mostPopular')}</span>
                                                        </div>
                                                    )}
                                                    
                                                    <div className="plan-header">
                                                        <div className="plan-icon">
                                                            <i className={plan.icon || 'ri-building-line'}></i>
                                                        </div>
                                                        <h3 className="plan-name">{translateSubscriptionType(plan.subscriptionType)}</h3>
                                                        <p className="plan-subtitle">{plan.description}</p>
                                                    </div>
                                                    
                                                    <div className="plan-price">
                                                        <span className="currency">$</span>
                                                        <span className="amount">{plan.price}</span>
                                                        <span className="period">/{t(`plans.${plan.interval}`)}</span>
                                                    </div>
                                                    
                                                    <button
                                                        className={`plan-cta ${plan.isPopular ? 'popular' : ''}`}
                                                        onClick={() => {
                                                            if (!user) {
                                                                // Non-connected user - redirect to login
                                                                navigate("/RoleSelection", { replace: true });
                                                            } else if (user.role === "SyndicateAdmin") {
                                                                // Connected SyndicateAdmin - proceed with subscription
                                                                handleSubscribe(plan._id, plan.price);
                                                            } else {
                                                                // Connected but not SyndicateAdmin - show message
                                                                toast.info(t('plans.syndicateAdminRequired'), {
                                                                    position: "top-center",
                                                                    autoClose: 3000,
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        {!user ? t('plans.getStarted') : 
                                                         user.role === "SyndicateAdmin" ? t('plans.getStarted') : 
                                                         t('plans.contactAdmin')}
                                                    </button>
                                                    
                                                    <div className="plan-features">
                                                        <div className="features-header">
                                                            <span>
                                                                <strong>{plan.features.filter(f => f.isActive).length}</strong> {t('plans.of')} <strong>{allFeatures.length}</strong> {t('plans.features')}
                                                            </span>
                                                        </div>
                                                        
                                                        <ul className="features-list">
                                                            {allFeatures.map((featureName) => {
                                                                const feature = plan.features.find(f => 
                                                                    f.name.toLowerCase().includes(featureName.toLowerCase())
                                                                );
                                                                const isActive = feature ? feature.isActive : false;
                                                                
                                                                let displayName = featureName;
                                                                if (feature) {
                                                                    // Use the translation function to get the translated feature name
                                                                    const translatedFeatureName = translateFeatureName(feature.name);
                                                                    
                                                                    if (!isActive) {
                                                                        // Extract just the base name for "not included" display
                                                                        const baseName = translatedFeatureName.split(':')[0].trim();
                                                                        displayName = `${baseName}: ${t('plans.notIncluded')}`;
                                                                    } else {
                                                                        // Check if the feature has a value part
                                                                        const nameParts = feature.name.split(':');
                                                                        if (nameParts.length > 1) {
                                                                            const value = nameParts[1].trim();
                                                                            const baseName = translatedFeatureName.split(':')[0].trim();
                                                                            
                                                                            if (value === "0" || value === "-1" || value.toLowerCase() === "illimité") {
                                                                                displayName = `${baseName}: ${t('plans.unlimited')}`;
                                                                            } else {
                                                                                displayName = `${baseName}: ${value}`;
                                                                            }
                                                                        } else {
                                                                            displayName = translatedFeatureName;
                                                                        }
                                                                    }
                                                                }
                                                                
                                                                return (
                                                                    <li key={featureName} className={!isActive ? 'unavailable' : ''}>
                                                                        <i className={isActive ? 'ri-check-line' : 'ri-close-line'}></i>
                                                                        <span>{displayName}</span>
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </Slider>
                                    
                                    <button className="nav-arrow next" onClick={nextSlide}>
                                        <i className="ri-arrow-right-s-line"></i>
                                    </button>
                                </div>
                            )}
        
                        </Container>
                    </section>
                </Container>
            </div>

            <style jsx>{`
                :root {
                    --primary: #e6485c;
                    --primary-hover: #d13a4e;
                    --accent-light: #ff8a9c;
                    --plan-gradient: linear-gradient(to right, #e8f0ff 0%, #fff0f5 100%);
                }
                
                .pricing-section {
                    padding: 2rem 0 4.5rem;
                    position: relative;
                    overflow: hidden;
                }
                
                .pricing-bg-element {
                    position: absolute;
                    top: 0;
                    right: 0;
                    width: 600px;
                    height: 600px;
                    background: radial-gradient(circle, rgba(230, 72, 92, 0.03) 0%, rgba(255, 138, 156, 0.02) 50%, transparent 70%);
                    border-radius: 50%;
                    z-index: 0;
                }
                
                /* Header */
                .pricing-header {
                    margin-bottom: 2.2rem;
                    position: relative;
                    z-index: 1;
                }
                
                .badge {
                    padding: 0.5rem 1rem;
                    border-radius: 30px;
                    background-color: rgba(230, 72, 92, 0.1);
                    color: var(--primary);
                    font-size: 0.8rem;
                    font-weight: 600;
                    margin-bottom: 1rem;
                    display: inline-block;
                }
                
                .pricing-title {
                    font-size: 2.2rem;
                    font-weight: 700;
                    margin-bottom: 1rem;
                    color: #333;
                }
                
                .section-line {
                    width: 60px;
                    height: 3px;
                    background: linear-gradient(45deg, var(--primary), var(--accent-light));
                    border-radius: 3px;
                    margin: 1rem auto;
                }
                
                .pricing-description {
                    color: #6c757d;
                    font-size: 1rem;
                    max-width: 700px;
                    margin: 0 auto;
                }
                
                /* Billing Toggle */
                .billing-toggle-container {
                    display: flex;
                    justify-content: center;
                    margin-bottom: 2.5rem;
                    position: relative;
                    z-index: 1;
                }
                
                .billing-toggle {
                    display: flex;
                    align-items: center;
                    background-color: white;
                    padding: 0.7rem 1.3rem;
                    border-radius: 50px;
                    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.05);
                }
                
                .toggle-option {
                    font-size: 0.9rem;
                    color: #6c757d;
                    font-weight: 500;
                    position: relative;
                    transition: all 0.3s;
                    padding: 0 0.5rem;
                }
                
                .toggle-option.active {
                    color: var(--primary);
                    font-weight: 600;
                }
                
                .toggle {
                    position: relative;
                    display: inline-block;
                    width: 55px;
                    height: 26px;
                    margin: 0 0.9rem;
                }
                
                .toggle input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                
                .toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #e0e0e0;
                    border-radius: 34px;
                    transition: 0.3s;
                }
                
                .toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 4px;
                    bottom: 4px;
                    background-color: white;
                    border-radius: 50%;
                    transition: 0.3s;
                }
                
                input:checked + .toggle-slider {
                    background: linear-gradient(45deg, var(--primary), var(--accent-light));
                }
                
                input:checked + .toggle-slider:before {
                    transform: translateX(28px);
                }
                
                .discount-badge {
                    position: absolute;
                    top: -18px;
                    right: -25px;
                    background: linear-gradient(45deg, var(--primary), var(--accent-light));
                    color: white;
                    font-size: 0.7rem;
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-weight: 600;
                }
                
                /* Plans Carousel */
                .plans-carousel {
                    position: relative;
                    margin-bottom: 3rem;
                    padding: 0 30px;
                }
                
                .carousel-nav {
                    display: none; /* Hide the original nav container */
                }
                
                .nav-arrow {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: none;
                    background: white;
                    color: var(--primary);
                    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.2rem;
                    cursor: pointer;
                    transition: all 0.3s;
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    z-index: 10;
                }
                
                .nav-arrow.prev {
                    left: -15px;
                }
                
                .nav-arrow.next {
                    right: -15px;
                }
                
                .nav-arrow:hover {
                    background: var(--primary);
                    color: white !important;
                }
                
                .nav-arrow i {
                    color: var(--primary);
                    transition: all 0.3s;
                }
                
                .nav-arrow:hover i {
                    color: white !important;
                }
                
                /* Plan Card - MODERATELY COMPACT VERSION */
                .plan-slide {
                    padding: 12px;
                }
                
                .plan-card {
                    background: linear-gradient(to right, #e8f0ff 0%, #fff0f5 100%);
                    border-radius: 16px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
                    padding: 1rem 1.1rem;
                    position: relative;
                    overflow: visible;
                    transition: all 0.3s;
                    height: auto;
                    display: flex;
                    flex-direction: column;
                    transform: none;
                }
                
                .plan-card:hover {
                    transform: none;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
                }
                
                .plan-card.popular {
                    background: linear-gradient(to right, #e8f0ff 0%, #fff0f5 100%);
                    border: 1px solid rgba(230, 72, 92, 0.2);
                }
                
                .popular-tag {
                    position: absolute;
                    top: 10px;
                    right: -28px;
                    background: linear-gradient(45deg, var(--primary), var(--accent-light));
                    color: white;
                    font-size: 0.7rem;
                    font-weight: 600;
                    padding: 4px 25px;
                    transform: rotate(45deg);
                    z-index: 10;
                }
                
                /* Plan Header - MODERATELY COMPACT */
                .plan-header {
                    text-align: center;
                    margin-bottom: 0.8rem;
                }
                
                .plan-icon {
                    margin: 0 auto 0.6rem;
                    width: 50px;
                    height: 50px;
                    border-radius: 10px;
                    background: rgba(255, 255, 255, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .plan-icon i {
                    font-size: 24px;
                    background: linear-gradient(45deg, var(--primary), var(--accent-light));
                    -webkit-background-clip: text;
                    background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                
                .plan-name {
                    font-size: 1.3rem;
                    font-weight: 700;
                    color: #333;
                    margin-bottom: 0.3rem;
                }
                
                .plan-subtitle {
                    font-size: 0.8rem;
                    color: #6c757d;
                    margin-bottom: 0;
                    min-height: 30px;
                    line-height: 1.2;
                }
                
                /* Plan Price - MODERATELY COMPACT */
                .plan-price {
                    text-align: center;
                    margin-bottom: 0.8rem;
                    padding: 0.6rem;
                    border-radius: 8px;
                    background-color: rgba(255, 255, 255, 0.5);
                }
                
                .currency {
                    font-size: 1.3rem;
                    font-weight: 600;
                    vertical-align: top;
                    display: inline-block;
                    line-height: 1;
                    margin-top: 6px;
                }
                
                .amount {
                    font-size: 2.5rem;
                    font-weight: 700;
                    color: var(--primary);
                    line-height: 1;
                }
                
                .period {
                    font-size: 0.85rem;
                    color: #6c757d;
                }
                
                /* Plan CTA - MODERATELY COMPACT */
                .plan-cta {
                    display: block;
                    width: 100%;
                    padding: 0.6rem;
                    border: none;
                    border-radius: 25px;
                    font-weight: 600;
                    font-size: 0.9rem;
                    text-align: center;
                    cursor: pointer;
                    margin-bottom: 0.8rem;
                    transition: all 0.3s;
                    background-color: rgba(255, 255, 255, 0.7);
                    color: #333;
                }
                
                .plan-cta:hover {
                    background-color: rgba(255, 255, 255, 0.9);
                }
                
                .plan-cta.popular {
                    background: linear-gradient(45deg, var(--primary), var(--accent-light));
                    color: white;
                    box-shadow: 0 4px 12px rgba(230, 72, 92, 0.2);
                }
                
                .plan-cta.popular:hover {
                    box-shadow: 0 6px 15px rgba(230, 72, 92, 0.3);
                }
                
                /* Plan Features - MODERATELY COMPACT */
                .plan-features {
                    border: 1px solid rgba(255, 255, 255, 0.6);
                    border-radius: 8px;
                    overflow: visible;
                    flex-grow: 1;
                    display: flex;
                    flex-direction: column;
                    background-color: rgba(255, 255, 255, 0.3);
                }
                
                .features-header {
                    padding: 0.4rem 0.6rem;
                    background-color: rgba(255, 255, 255, 0.5);
                    font-size: 0.75rem;
                    font-weight: 600;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.6);
                }
                
                .features-list {
                    list-style-type: none;
                    padding: 0.3rem 0;
                    margin: 0;
                    overflow-y: visible;
                    flex-grow: 1;
                    max-height: none;
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                }
                
                .features-list li {
                    display: flex;
                    align-items: flex-start;
                    padding: 0.2rem 0.6rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                    font-size: 0.7rem;
                    margin: 0;
                    line-height: 1.2;
                }
                
                .features-list li:last-child {
                    border-bottom: none;
                }
                
                .features-list li i {
                    margin-right: 4px;
                    font-size: 0.8rem;
                    flex-shrink: 0;
                    margin-top: 1px;
                }
                
                .features-list li i.ri-check-line {
                    color: var(--primary);
                }
                
                .features-list li i.ri-close-line {
                    color: #ff6b6b;
                }
                
                .features-list li.unavailable {
                    color: #888;
                    opacity: 0.8;
                }
                
                /* Custom Plan Section - Matching Download App Style */
                .custom-plan {
                    position: relative;
                    background: linear-gradient(to right, #e8f0ff 0%, #fff0f5 100%);
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
                }
                
                .custom-plan::before {
                    content: '';
                    position: absolute;
                    bottom: -50px;
                    right: 10%;
                    width: 200px;
                    height: 200px;
                    background-color: rgba(255, 255, 255, 0.4);
                    border-radius: 50%;
                    z-index: 1;
                }
                
                .custom-plan::after {
                    content: '';
                    position: absolute;
                    top: -30px;
                    left: 10%;
                    width: 120px;
                    height: 120px;
                    background-color: rgba(255, 255, 255, 0.5);
                    border-radius: 50%;
                    z-index: 1;
                }
                
                .custom-plan-content {
                    padding: 4rem 2rem 4rem 4rem;
                    position: relative;
                    z-index: 2;
                    text-align: left;
                }
                
                .custom-plan-title {
                    font-size: 2.2rem;
                    font-weight: 700;
                    margin-bottom: 1.5rem;
                    color: #333;
                    line-height: 1.3;
                }
                
                .custom-plan-description {
                    color: #6c757d;
                    font-size: 1.1rem;
                    margin-bottom: 2rem;
                    line-height: 1.6;
                    max-width: 90%;
                }
                
                .custom-plan-cta {
                    margin-top: 1.5rem;
                }
                
                .custom-plan-link {
                    display: inline-flex;
                    align-items: center;
                    padding: 0.9rem 2.5rem;
                    border-radius: 30px;
                    background: linear-gradient(45deg, var(--primary), var(--accent-light));
                    color: white;
                    font-weight: 600;
                    text-decoration: none;
                    transition: all 0.3s;
                    position: relative;
                    z-index: 2;
                    font-size: 1rem;
                    box-shadow: 0 5px 15px rgba(230, 72, 92, 0.15);
                }
                
                .custom-plan-link:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 20px rgba(230, 72, 92, 0.25);
                    color: white;
                }
                
                .custom-plan-link span {
                    color: white;
                    transition: all 0.3s;
                }
                
                .custom-plan-link i {
                    margin-left: 10px;
                    color: white;
                    transition: all 0.3s;
                }
                
                .custom-plan-link:hover i {
                    transform: translateX(5px);
                }
                
                .custom-plan-image-col {
                    position: relative;
                    overflow: hidden;
                    padding: 0;
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                }
                
                .custom-plan-image-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    position: relative;
                    height: 100%;
                    z-index: 2;
                    padding: 2rem;
                }
                
                .custom-plan-image-container i {
                    font-size: 10rem;
                    background: linear-gradient(45deg, var(--primary), var(--accent-light));
                    -webkit-background-clip: text;
                    background-clip: text;
                    -webkit-text-fill-color: transparent;
                    filter: drop-shadow(0 10px 15px rgba(230, 72, 92, 0.15));
                }
                
                /* Loading and Error States */
                .loading-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 200px;
                    padding: 2rem;
                    text-align: center;
                }
                
                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid rgba(230, 72, 92, 0.1);
                    border-radius: 50%;
                    border-top-color: var(--primary);
                    animation: spinner 1s linear infinite;
                    margin-bottom: 1rem;
                }
                
                .error-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 200px;
                    padding: 2rem;
                    text-align: center;
                    color: #dc3545;
                }
                
                .error-container i {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                }
                
                .error-container button {
                    margin-top: 1rem;
                    padding: 0.5rem 1.5rem;
                    background: white;
                    border: 1px solid var(--primary);
                    color: var(--primary);
                    border-radius: 20px;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                
                .error-container button:hover {
                    background: var(--primary);
                    color: white;
                }
                
                @keyframes spinner {
                    to {transform: rotate(360deg);}
                }
                
                /* Slick Override */
                .plans-slider .slick-dots {
                    bottom: -35px;
                }
                
                .plans-slider .slick-dots li button:before {
                    font-size: 9px;
                    color: rgba(230, 72, 92, 0.3);
                }
                
                .plans-slider .slick-dots li.slick-active button:before {
                    color: var(--primary);
                }
                
                /* Responsive Styles */
                @media (max-width: 1200px) {
                    .custom-plan-content {
                        padding: 3rem 1.5rem 3rem 3rem;
                    }
                    
                    .custom-plan-title {
                        font-size: 2rem;
                    }
                    
                    .custom-plan-image-container i {
                        font-size: 8rem;
                    }
                }
                
                @media (max-width: 991.98px) {
                    .pricing-title {
                        font-size: 1.9rem;
                    }
                    
                    .plans-carousel {
                        margin-bottom: 2.5rem;
                    }
                    
                    .plan-card {
                        margin: 0.4rem 0;
                    }
                    
                    .features-list {
                        max-height: none;
                        overflow-y: visible;
                    }
                    
                    .plan-subtitle {
                        min-height: auto;
                    }
                    
                    .custom-plan-content {
                        padding: 3rem 1.5rem;
                    }
                    
                    .custom-plan-title {
                        font-size: 1.8rem;
                    }
                    
                    .custom-plan-description {
                        font-size: 1rem;
                        max-width: 100%;
                    }
                }
                
                @media (max-width: 767.98px) {
                    .pricing-section {
                        padding: 1rem 0 3.5rem;
                    }
                    
                    .pricing-title {
                        font-size: 1.7rem;
                    }
                    
                    .plan-slide {
                        padding: 8px;
                    }
                    
                    .amount {
                        font-size: 2.3rem;
                    }
                    
                    .features-list {
                        max-height: none;
                    }
                    
                    .plan-card {
                        padding: 1rem;
                    }
                    
                    .plan-icon {
                        width: 45px;
                        height: 45px;
                    }
                    
                    .plan-icon i {
                        font-size: 22px;
                    }
                    
                    .nav-arrow {
                        width: 35px;
                        height: 35px;
                        font-size: 1rem;
                    }
                    
                    .nav-arrow.prev {
                        left: -10px;
                    }
                    
                    .nav-arrow.next {
                        right: -10px;
                    }
                    
                    .custom-plan-content {
                        padding: 2rem 1.5rem;
                        text-align: center;
                        order: 2;
                    }
                    
                    .custom-plan-image-col {
                        order: 1;
                        justify-content: center;
                        margin-top: 1rem;
                        margin-bottom: 0;
                    }
                    
                    .custom-plan-cta {
                        display: flex;
                        justify-content: center;
                    }
                    
                    .custom-plan-title {
                        font-size: 1.6rem;
                    }
                    
                    .custom-plan-description {
                        max-width: 100%;
                        margin-left: auto;
                        margin-right: auto;
                    }
                    
                    .custom-plan-image-container i {
                        font-size: 7rem;
                    }
                }
                
                @media (max-width: 575.98px) {
                    .custom-plan-link {
                        width: 80%;
                        justify-content: center;
                    }
                }
                
                /* Dark mode support */
                [data-layout-mode="dark"] .plan-name,
                [data-layout-mode="dark"] .custom-plan-title {
                    color: #e9ecef;
                }
                
                [data-layout-mode="dark"] .plan-subtitle,
                [data-layout-mode="dark"] .period,
                [data-layout-mode="dark"] .custom-plan-description {
                    color: #a6b0cf;
                }
                
                [data-layout-mode="dark"] .plan-cta:not(.popular) {
                    background-color: rgba(255, 255, 255, 0.1);
                    color: #e9ecef;
                }
                
                [data-layout-mode="dark"] .plan-cta:not(.popular):hover {
                    background-color: rgba(255, 255, 255, 0.15);
                }
                
                [data-layout-mode="dark"] .features-header {
                    background-color: rgba(255, 255, 255, 0.1);
                }
                
                [data-layout-mode="dark"] .error-container button {
                    background: #2a3042;
                    border-color: var(--primary);
                }
                
                [data-layout-mode="dark"] .nav-arrow {
                    background: #2a3042;
                }
            `}</style>
        </React.Fragment>
    );
};

export default Pricing;