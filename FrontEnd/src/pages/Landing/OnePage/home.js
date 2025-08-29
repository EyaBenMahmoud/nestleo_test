import React from 'react'; 
import { Col, Container, Row } from 'reactstrap';
import { Link } from 'react-router-dom';
import heroImg from "../../../assets/images/HomePageLanding.png"; // Import your hero image
import { useTranslation } from 'react-i18next'; // Import translation hook

// Import other components
import Services from './services';
import Features from './features';

const Home = () => {
    // Initialize translation hook
    const { t } = useTranslation();

    // Using translation for roles
    const roles = [
        {
            title: t('home.roles.worker.title'),
            description: t('home.roles.worker.description'),
            role: "Worker",
            link: "/registerWorker",
            icon: "tools"
        },
        {
            title: t('home.roles.syndicate.title'),
            description: t('home.roles.syndicate.description'),
            role: "SyndicateAdmin",
            link: "/registerSyndicate",
            icon: "building"
        },
        {
            title: t('home.roles.coowner.title'),
            description: t('home.roles.coowner.description'),
            role: "SyndicateCoowner",
            link: "/registerCoowner",
            icon: "team"
        },
    ];

    return (
        <React.Fragment>
            {/* Hero Section - Modernized */}
            <section className="hero-section position-relative overflow-hidden" id="hero">
                <div className="bg-overlay bg-overlay-pattern"></div>
                <div className="bg-decoration"></div>
                <div className="floating-shapes"></div>
                <Container>
                    <Row className="align-items-center min-vh-75">
                        <Col lg={6} md={6} className="hero-content-col">
                            <div className="hero-content py-5">
                                <h1 className="display-4 fw-bold mb-4 lh-base text-black hero-title">
                                    {t('home.hero.title1')}<br/>
                                    {t('home.hero.title2')} <span className="text-accent">{t('home.hero.community')}</span>,<br/>
                                    {t('home.hero.title3')}
                                </h1>
                                <p className="lead text-dark mb-4">
                                    {t('home.hero.description1')} <span className="text-accent">{t('home.hero.informed')}</span>, 
                                    {t('home.hero.description2')}
                                </p>
                                <div className="d-flex gap-3 justify-content-start">
                                    <Link to="/roleSelection" className="btn btn-primary btn-lg rounded-pill">
                                        {t('home.hero.getStarted')} <i className="ri-arrow-right-line align-middle ms-1"></i>
                                    </Link>
                                    <a href="#plans" className="btn btn-outline-primary btn-lg rounded-pill">
    {t('home.hero.viewPlans')} <i className="ri-eye-line align-middle ms-1"></i>
</a>
                                </div>
                            </div>
                        </Col>
                        <Col lg={6} md={6} className="hero-image-col">
                            <div className="hero-image-wrapper">
                                <img src={heroImg} alt={t('home.hero.imageAlt')} className="hero-image img-fluid" />
                            </div>
                        </Col>
                    </Row>
                </Container>
            </section>

            {/* Role Selection Section - Redesigned with cards */}
            <section className="section role-section py-5">
                <Container>
                    <Row className="justify-content-center">
                        <Col lg={8} className="text-center mb-5">
                            <h2 className="display-4 fw-bold text-black mb-3 animate__animated animate__fadeInDown">
                                {t('home.roleSection.title1')} <span className="text-accent">{t('home.roleSection.role')}</span>
                            </h2>
                            <div className="line-behind mb-4"></div>
                            <p className="text-dark fs-4 mb-5 opacity-75">
                                {t('home.roleSection.subtitle')}
                            </p>
                        </Col>
                    </Row>
                    
                    <Row className="g-4 justify-content-center">
                        {roles.map((role, index) => (
                            <Col lg={4} md={6} key={index}>
                                <div className="card role-card text-center p-4 h-100 shadow-lg border-0 transform-on-hover">
                                    <div className="role-icon mb-4">
                                        <div className="icon-circle mx-auto">
                                            <i className={`ri-${role.icon}-line`}></i>
                                        </div>
                                    </div>
                                    <h3 className="mb-3 text-black">{role.title}</h3>
                                    <p className="mb-4 text-muted">{role.description}</p>
                                    <Link
                                        to={role.link}
                                        className="btn btn-outline-primary btn-hover-gradient w-100 py-2"
                                    >
                                        {t('home.roleSection.signUpAs')} {role.title}
                                    </Link>
                                </div>
                            </Col>
                        ))}
                    </Row>
                </Container>
            </section>
            {/* Custom Styles */}
            <style>
                {`
                /* Modern styling updates with new color scheme */
                :root {
                    --primary: #e6485c;
                    --primary-hover: #d13a4e;
                    --accent-light: #ff8a9c;
                    --secondary: #2d3748;
                    --light-bg: #f2fafc; /* Lighter WhatsApp bar color - closer to white */
                    --light-bg-accent: #e8f4f8; /* Original WhatsApp bar color as accent */
                    --extra-light: #f8fcfd; /* Extra light shade for subtle effects */
                }
                
                .hero-section {
                    padding: 120px 0 80px;
                    position: relative;
                    background-color: var(--light-bg);
                    overflow: hidden;
                }
                
                .hero-section::before {
                    content: "";
                    position: absolute;
                    right: 0;
                    top: 0;
                    width: 45%;
                    height: 100%;
                    background: linear-gradient(135deg, rgba(232, 244, 248, 0.15), rgba(248, 252, 253, 0.15));
                    clip-path: polygon(25% 0%, 100% 0%, 100% 100%, 0% 100%);
                    z-index: 1;
                }

                /* Overlay pattern - Using lighter WhatsApp bar color */
                .bg-overlay-pattern {
                    position: absolute;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    left: 0;
                    background-color: var(--light-bg);
                    background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e8f4f8' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
                    opacity: 0.8;
                    z-index: 0;
                }

                /* Add decorative wavy lines and elements - Using lighter colors */
                .bg-decoration {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-image: 
                        url("data:image/svg+xml,%3Csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='a' gradientUnits='userSpaceOnUse' x1='0' x2='0' y1='0' y2='100%25' gradientTransform='rotate(240)'%3E%3Cstop offset='0' stop-color='%23f8fcfd'/%3E%3Cstop offset='1' stop-color='%23e8f4f8' stop-opacity='0.6'/%3E%3C/linearGradient%3E%3Cpattern patternUnits='userSpaceOnUse' id='b' width='540' height='450' x='0' y='0' viewBox='0 0 1080 900'%3E%3Cg fill-opacity='0.04'%3E%3Cpolygon fill='%23d0eaf2' points='90 150 0 300 180 300'/%3E%3Cpolygon points='90 150 180 0 0 0'/%3E%3Cpolygon fill='%23d0eaf2' points='270 150 360 0 180 0'/%3E%3Cpolygon fill='%23e0f1f6' points='450 150 360 300 540 300'/%3E%3Cpolygon fill='%23d0eaf2' points='450 150 540 0 360 0'/%3E%3Cpolygon points='630 150 540 300 720 300'/%3E%3Cpolygon fill='%23e0f1f6' points='630 150 720 0 540 0'/%3E%3Cpolygon fill='%23d0eaf2' points='810 150 720 300 900 300'/%3E%3Cpolygon fill='%23e8f4f8' points='810 150 900 0 720 0'/%3E%3Cpolygon fill='%23e0f1f6' points='990 150 900 300 1080 300'/%3E%3Cpolygon fill='%23d0eaf2' points='990 150 1080 0 900 0'/%3E%3Cpolygon fill='%23e0f1f6' points='90 450 0 600 180 600'/%3E%3Cpolygon points='90 450 180 300 0 300'/%3E%3Cpolygon fill='%23d0eaf2' points='270 450 180 600 360 600'/%3E%3Cpolygon fill='%23e0f1f6' points='270 450 360 300 180 300'/%3E%3Cpolygon fill='%23e8f4f8' points='450 450 360 600 540 600'/%3E%3Cpolygon fill='%23d0eaf2' points='450 450 540 300 360 300'/%3E%3Cpolygon fill='%23d0eaf2' points='630 450 540 600 720 600'/%3E%3Cpolygon fill='%23e8f4f8' points='630 450 720 300 540 300'/%3E%3Cpolygon points='810 450 720 600 900 600'/%3E%3Cpolygon fill='%23e0f1f6' points='810 450 900 300 720 300'/%3E%3Cpolygon fill='%23d0eaf2' points='990 450 900 600 1080 600'/%3E%3Cpolygon fill='%23d0eaf2' points='990 450 1080 300 900 300'/%3E%3Cpolygon fill='%23e0f1f6' points='90 750 0 900 180 900'/%3E%3Cpolygon points='270 750 180 900 360 900'/%3E%3Cpolygon fill='%23e8f4f8' points='270 750 360 600 180 600'/%3E%3Cpolygon points='450 750 540 600 360 600'/%3E%3Cpolygon points='630 750 540 900 720 900'/%3E%3Cpolygon fill='%23d0eaf2' points='630 750 720 600 540 600'/%3E%3Cpolygon fill='%23d0eaf2' points='810 750 720 900 900 900'/%3E%3Cpolygon fill='%23e0f1f6' points='810 750 900 600 720 600'/%3E%3Cpolygon fill='%23d0eaf2' points='990 750 900 900 1080 900'/%3E%3Cpolygon fill='%23d0eaf2' points='990 750 1080 600 900 600'/%3E%3Cpolygon points='0 0 0 0 0 0'/%3E%3C/g%3E%3C/pattern%3E%3C/defs%3E%3Crect fill='url(%23a)' width='100%25' height='100%25'/%3E%3Crect fill='url(%23b)' width='100%25' height='100%25'/%3E%3C/svg%3E");
                    opacity: 0.25; /* Reduced opacity for lighter effect */
                    z-index: 0;
                }

                /* Add floating shapes decoration - Using lighter colors */
                .floating-shapes {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    top: 0;
                    left: 0;
                    overflow: hidden;
                    z-index: 0;
                }

                .floating-shapes::before {
                    content: "";
                    position: absolute;
                    top: 10%;
                    right: 15%;
                    width: 300px;
                    height: 300px;
                    border-radius: 50%;
                    background: linear-gradient(45deg, rgba(232, 244, 248, 0.2), rgba(248, 252, 253, 0.3));
                    animation: float 15s ease-in-out infinite alternate;
                }

                .floating-shapes::after {
                    content: "";
                    position: absolute;
                    bottom: 10%;
                    left: 5%;
                    width: 200px;
                    height: 200px;
                    border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
                    background: linear-gradient(45deg, rgba(232, 244, 248, 0.25), rgba(248, 252, 253, 0.2));
                    animation: float 12s ease-in-out infinite alternate-reverse;
                }

                @keyframes float {
                    0% {
                        transform: translateY(0) rotate(0deg);
                    }
                    50% {
                        transform: translateY(-20px) rotate(5deg);
                    }
                    100% {
                        transform: translateY(0) rotate(0deg);
                    }
                }

                /* Hero Title Styling for multiline display */
                .hero-title {
                    font-size: 3.2rem;
                    line-height: 1.1;
                    margin-bottom: 1.5rem;
                    font-weight: 800;
                }
                
                .hero-title br {
                    line-height: 0.9;
                }

                /* Hero Image Styling */
                .hero-content-col {
                    z-index: 2;
                    position: relative;
                }

                .hero-image-col {
                    z-index: 2;
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .hero-image-wrapper {
                    position: relative;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .hero-image {
                    max-width: 50%;
                    height: auto;
                    border-radius: 12px;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
                    position: relative;
                    z-index: 2;
                }
                
                /* The background accent for the hero image - Changed to lighter blue tones */
                .hero-image-wrapper::after {
                    content: '';
                    position: absolute;
                    right: -20px;
                    bottom: -20px;
                    width: 70%;
                    height: 70%;
                    background: linear-gradient(45deg, var(--light-bg-accent), #d0eaf2);
                    border-radius: 12px;
                    z-index: 1;
                    opacity: 0.3; /* Reduced opacity for lighter effect */
                }

                .min-vh-75 {
                    min-height: 75vh;
                }
                
                .text-gradient {
                    background: linear-gradient(45deg, #000, var(--primary));
                    -webkit-background-clip: text;
                    background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                
                .text-accent {
                    color: var(--primary) !important;
                }
                
                .text-black {
                    color: #000 !important;
                }

                .role-section {
                    background: linear-gradient(135deg, #ffffff, var(--extra-light));
                    position: relative;
                    z-index: 1;
                }
                
                .role-section::after {
                    content: "";
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    background-image: radial-gradient(rgba(232, 244, 248, 0.25) 2px, transparent 2px);
                    background-size: 30px 30px;
                    z-index: -1;
                }

                .line-behind {
                    width: 100px;
                    height: 4px;
                    background: linear-gradient(45deg, var(--primary), var(--accent-light));
                    margin: 0 auto;
                    border-radius: 2px;
                }

                .role-card {
                    border-radius: 20px;
                    transition: all 0.3s ease;
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(8px);
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
                    position: relative;
                    z-index: 1;
                    overflow: hidden;
                }
                
                .role-card::after {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 5px;
                    background: linear-gradient(45deg, var(--primary), var(--accent-light));
                    z-index: 2;
                }

                .role-card:hover {
                    transform: translateY(-12px);
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
                }

                /* Icon replacement for role images */
                .icon-circle {
                    width: 120px;
                    height: 120px;
                    background: linear-gradient(45deg, var(--primary), var(--accent-light));
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
                }

                .icon-circle i {
                    font-size: 48px;
                    color: #fff;
                }

                .btn-hover-gradient:hover {
                    background: linear-gradient(45deg, var(--primary), var(--accent-light));
                    color: white;
                    transform: translateY(-2px);
                }
                
                .btn-primary {
                    background-color: var(--primary);
                    border-color: var(--primary);
                    box-shadow: 0 4px 12px rgba(230, 72, 92, 0.2);
                }
                
                .btn-primary:hover {
                    background-color: var(--primary-hover);
                    border-color: var(--primary-hover);
                }
                
                .btn-outline-primary {
                    color: var(--primary);
                    border-color: var(--primary);
                    box-shadow: 0 4px 12px rgba(230, 72, 92, 0.1);
                }
                
                .btn-outline-primary:hover {
                    background-color: var(--primary);
                    border-color: var(--primary);
                    color: white !important; /* Added !important to ensure text color changes */
                }

                .text-dark {
                    color: #343a40 !important;
                }

                .text-muted {
                    color: #6c757d;
                }

                .transform-on-hover {
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                }

                /* Responsive adjustments */
                @media (max-width: 1200px) {
                    .hero-title {
                        font-size: 2.8rem;
                    }
                }

                @media (max-width: 991px) {
                    .hero-image {
                        max-width: 80%;
                        margin: 0 auto;
                        display: block;
                    }
                    
                    .hero-title {
                        font-size: 2.5rem;
                    }
                    
                    .icon-circle {
                        width: 100px;
                        height: 100px;
                    }
                    
                    .icon-circle i {
                        font-size: 40px;
                    }
                }

                @media (max-width: 768px) {
                    .hero-section {
                        padding: 80px 0 40px;
                    }
                    
                    .hero-content-col {
                        order: 2;
                    }
                    
                    .hero-image-col {
                        order: 1;
                        margin-bottom: 30px;
                    }
                    
                    .hero-image {
                        max-width: 70%;
                    }
                    
                    .min-vh-75 {
                        min-height: auto;
                    }
                    
                    .hero-title {
                        font-size: 2.2rem;
                    }
                    
                    .icon-circle {
                        width: 90px;
                        height: 90px;
                    }
                    
                    .icon-circle i {
                        font-size: 36px;
                    }
                }
                
                @media (max-width: 576px) {
                    .hero-title {
                        font-size: 2rem;
                    }
                    
                    .icon-circle {
                        width: 80px;
                        height: 80px;
                    }
                    
                    .icon-circle i {
                        font-size: 32px;
                    }
                }
                `}
            </style>
        </React.Fragment>
    );
};

export default Home;