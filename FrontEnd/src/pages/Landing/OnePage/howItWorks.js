import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col } from 'reactstrap';
import { useTranslation } from 'react-i18next'; // Import translation hook

// Import your images for each step
import verifyImage from "../../../assets/images/1.gif";
import installImage from "../../../assets/images/2.gif";
import enjoyImage from "../../../assets/images/3.gif";
import image4 from "../../../assets/images/4.gif";
import image5 from "../../../assets/images/5.gif";
import image6 from "../../../assets/images/6.gif";

const HowItWorks = () => {
    // Initialize translation hook
    const { t } = useTranslation();
    
    const steps = [
        {
            stepNumber: 1,
            title: t('howItWorks.steps.step1.title'),
            description: t('howItWorks.steps.step1.description'),
            description2: t('howItWorks.steps.step1.description2'),
            image: verifyImage
        },
        {
            stepNumber: 2,
            title: t('howItWorks.steps.step2.title'),
            description: t('howItWorks.steps.step2.description'),
            description2: t('howItWorks.steps.step2.description2'),
            image: installImage
        },
        {
            stepNumber: 3,
            title: t('howItWorks.steps.step3.title'),
            description: t('howItWorks.steps.step3.description'),
            description2: t('howItWorks.steps.step3.description2'),
            image: enjoyImage
        },
        {
            stepNumber: 4,
            title: t('howItWorks.steps.step4.title'),
            description: t('howItWorks.steps.step4.description'),
            description2: t('howItWorks.steps.step4.description2'),
            image: image4
        },
        {
            stepNumber: 5,
            title: t('howItWorks.steps.step5.title'),
            description: t('howItWorks.steps.step5.description'),
            description2: t('howItWorks.steps.step5.description2'),
            image: image5
        },
        {
            stepNumber: 6,
            title: t('howItWorks.steps.step6.title'),
            description: t('howItWorks.steps.step6.description'),
            description2: t('howItWorks.steps.step6.description2'),
            image: image6
        }
    ];

    return (
        <section className="how-it-works-section py-5" id="howitworks">
            <div className="bg-overlay bg-overlay-pattern"></div>
            <div className="bg-decoration"></div>
            <div className="floating-shapes"></div>
            <Container>
                <Row className="justify-content-center mb-5">
                    <Col lg={8} className="text-center">
                        <h2 className="display-5 fw-semibold mb-3">
                            {t('howItWorks.heading.part1')} <span className="text-accent">{t('howItWorks.heading.part2')}</span>
                        </h2>
                        <div className="section-line mx-auto"></div>
                        <p className="text-muted mt-3">
                            {t('howItWorks.subheading.part1')} <span className="text-accent">{t('howItWorks.subheading.part2')}</span>
                        </p>
                    </Col>
                </Row>

                <div className="steps-container">
                    <div className="steps-timeline"></div>
                    
                    {steps.map((step, index) => (
                        <div key={index} className="step-row">
                            <Row className="align-items-center">
                                <Col lg={6} className={`step-content-col ${index % 2 !== 0 ? 'order-lg-2' : ''}`}>
                                    <div className="step-content">
                                        <div className="step-number">{step.stepNumber}</div>
                                        <h3 className="step-title">{step.title}</h3>
                                        <p className="step-description">{step.description}<br></br>{step.description2}</p>
                                        {step.link && (
                                            <Link to={step.link} className="step-link">
                                                {step.linkText || t('howItWorks.learnMore')} <i className="ri-arrow-right-line"></i>
                                            </Link>
                                        )}
                                    </div>
                                </Col>
                                <Col lg={6} className={`step-image-col ${index % 2 !== 0 ? 'order-lg-1' : ''}`}>
                                    <div className="step-image-container">
                                        <img src={step.image} alt={step.title} className="step-image img-fluid" />
                                    </div>
                                </Col>
                            </Row>
                            <div className="step-dot"></div>
                        </div>
                    ))}
                </div>
            </Container>
            <style jsx>{`
                :root {
                    --primary: #e6485c;
                    --primary-hover: #d13a4e;
                    --accent-light: #ff8a9c;
                    --blue-base: #f2fafc; /* WhatsApp header blue */
                    --blue-medium: #e8f4f8;
                    --blue-dark: #d8eef6;
                    --blue-darker: #c5e6f2;
                }
                
                .text-accent {
                    color: var(--primary) !important;
                }
                
                .how-it-works-section {
                    position: relative;
                    overflow: hidden;
                    padding: 120px 0 80px;
                    position: relative;
                    background-color: var(--blue-base);
                }
                
                /* Add the same background pattern from home component */
                .how-it-works-section::before {
                    content: "";
                    position: absolute;
                    right: 0;
                    top: 0;
                    width: 45%;
                    height: 100%;
                    background: linear-gradient(135deg, rgba(216, 238, 246, 0.15), rgba(242, 250, 252, 0.15));
                    clip-path: polygon(25% 0%, 100% 0%, 100% 100%, 0% 100%);
                    z-index: 1;
                }

                /* Overlay pattern - Using blue tones only */
                .bg-overlay-pattern {
                    position: absolute;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    left: 0;
                    background-color: var(--blue-base);
                    background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d8eef6' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
                    opacity: 0.8;
                    z-index: 0;
                }
                
                /* Add decorative wavy lines and elements - Using blue tones only */
                .bg-decoration {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-image: 
                        url("data:image/svg+xml,%3Csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='a' gradientUnits='userSpaceOnUse' x1='0' x2='0' y1='0' y2='100%25' gradientTransform='rotate(240)'%3E%3Cstop offset='0' stop-color='%23f2fafc'/%3E%3Cstop offset='1' stop-color='%23d8eef6' stop-opacity='0.6'/%3E%3C/linearGradient%3E%3Cpattern patternUnits='userSpaceOnUse' id='b' width='540' height='450' x='0' y='0' viewBox='0 0 1080 900'%3E%3Cg fill-opacity='0.04'%3E%3Cpolygon fill='%23d8eef6' points='90 150 0 300 180 300'/%3E%3Cpolygon fill='%23e8f4f8' points='90 150 180 0 0 0'/%3E%3Cpolygon fill='%23d8eef6' points='270 150 360 0 180 0'/%3E%3Cpolygon fill='%23e8f4f8' points='450 150 360 300 540 300'/%3E%3Cpolygon fill='%23d8eef6' points='450 150 540 0 360 0'/%3E%3Cpolygon fill='%23e8f4f8' points='630 150 540 300 720 300'/%3E%3Cpolygon fill='%23e8f4f8' points='630 150 720 0 540 0'/%3E%3Cpolygon fill='%23d8eef6' points='810 150 720 300 900 300'/%3E%3Cpolygon fill='%23e8f4f8' points='810 150 900 0 720 0'/%3E%3Cpolygon fill='%23e8f4f8' points='990 150 900 300 1080 300'/%3E%3Cpolygon fill='%23d8eef6' points='990 150 1080 0 900 0'/%3E%3Cpolygon fill='%23e8f4f8' points='90 450 0 600 180 600'/%3E%3Cpolygon fill='%23d8eef6' points='90 450 180 300 0 300'/%3E%3Cpolygon fill='%23d8eef6' points='270 450 180 600 360 600'/%3E%3Cpolygon fill='%23e8f4f8' points='270 450 360 300 180 300'/%3E%3Cpolygon fill='%23e8f4f8' points='450 450 360 600 540 600'/%3E%3Cpolygon fill='%23d8eef6' points='450 450 540 300 360 300'/%3E%3Cpolygon fill='%23d8eef6' points='630 450 540 600 720 600'/%3E%3Cpolygon fill='%23e8f4f8' points='630 450 720 300 540 300'/%3E%3Cpolygon fill='%23d8eef6' points='810 450 720 600 900 600'/%3E%3Cpolygon fill='%23e8f4f8' points='810 450 900 300 720 300'/%3E%3Cpolygon fill='%23d8eef6' points='990 450 900 600 1080 600'/%3E%3Cpolygon fill='%23d8eef6' points='990 450 1080 300 900 300'/%3E%3Cpolygon fill='%23e8f4f8' points='90 750 0 900 180 900'/%3E%3Cpolygon fill='%23d8eef6' points='270 750 180 900 360 900'/%3E%3Cpolygon fill='%23e8f4f8' points='270 750 360 600 180 600'/%3E%3Cpolygon fill='%23d8eef6' points='450 750 540 600 360 600'/%3E%3Cpolygon fill='%23e8f4f8' points='630 750 540 900 720 900'/%3E%3Cpolygon fill='%23d8eef6' points='630 750 720 600 540 600'/%3E%3Cpolygon fill='%23d8eef6' points='810 750 720 900 900 900'/%3E%3Cpolygon fill='%23e8f4f8' points='810 750 900 600 720 600'/%3E%3Cpolygon fill='%23d8eef6' points='990 750 900 900 1080 900'/%3E%3Cpolygon fill='%23d8eef6' points='990 750 1080 600 900 600'/%3E%3Cpolygon fill='%23e8f4f8' points='0 0 0 0 0 0'/%3E%3C/g%3E%3C/pattern%3E%3C/defs%3E%3Crect fill='url(%23a)' width='100%25' height='100%25'/%3E%3Crect fill='url(%23b)' width='100%25' height='100%25'/%3E%3C/svg%3E");
                    opacity: 0.25;
                    z-index: 0;
                }

                /* Floating shapes - Using blue tones only */
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
                    background: linear-gradient(45deg, rgba(216, 238, 246, 0.2), rgba(242, 250, 252, 0.3));
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
                    background: linear-gradient(45deg, rgba(216, 238, 246, 0.25), rgba(242, 250, 252, 0.2));
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
                
                .section-line {
                    width: 60px;
                    height: 4px;
                    background: linear-gradient(45deg, var(--primary), var(--accent-light));
                    border-radius: 3px;
                }
                
                .steps-container {
                    position: relative;
                    max-width: 1140px;
                    margin: 0 auto;
                    padding: 30px 0;
                    z-index: 2;
                }
                
                .steps-timeline {
                    content: '';
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    left: 50%;
                    width: 2px;
                    background: linear-gradient(to bottom, rgba(200, 230, 245, 0.4), rgba(216, 238, 246, 0.4));
                    transform: translateX(-50%);
                    z-index: 1;
                }
                
                .step-row {
                    position: relative;
                    margin-bottom: 80px;
                    z-index: 2;
                }
                
                .step-row:last-child {
                    margin-bottom: 0;
                }
                
                .step-dot {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background-color: #fff;
                    border: 3px solid var(--primary);
                    z-index: 3;
                }
                
                .step-content-col {
                    padding: 0 30px;
                    position: relative;
                    z-index: 2;
                }
                
                .step-content {
                    padding: 30px;
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
                    position: relative;
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                    backdrop-filter: blur(8px);
                    background: rgba(255, 255, 255, 0.95);
                    overflow: hidden;
                }
                
                .step-content::after {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 5px;
                    background: linear-gradient(45deg, var(--primary), var(--accent-light));
                    z-index: 2;
                }
                
                .step-content:hover {
                    transform: translateY(-12px);
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
                }
                
                .step-number {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 50px;
                    height: 50px;
                    background: linear-gradient(45deg, var(--primary), var(--accent-light));
                    color: white;
                    border-radius: 50%;
                    font-weight: 700;
                    font-size: 20px;
                    margin-bottom: 20px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                }
                
                .step-title {
                    font-size: 24px;
                    font-weight: 700;
                    color: #333;
                    margin-bottom: 15px;
                }
                
                .step-description {
                    color: #6c757d;
                    margin-bottom: 20px;
                    line-height: 1.6;
                }
                
                .step-link {
                    color: var(--primary);
                    font-weight: 600;
                    text-decoration: none;
                    display: inline-flex;
                    align-items: center;
                    transition: all 0.3s;
                }
                
                .step-link i {
                    margin-left: 5px;
                    transition: transform 0.2s;
                }
                
                .step-link:hover {
                    color: var(--primary-hover);
                }
                
                .step-link:hover i {
                    transform: translateX(4px);
                }
                
                .step-image-col {
                    padding: 0 80px;
                    position: relative;
                    z-index: 2;
                }
                
                .step-image-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    position: relative;
                }
                
                .step-image {
                    max-width: 90%;
                    border-radius: 16px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
                    transition: transform 0.3s ease;
                    position: relative;
                    z-index: 2;
                }
                
                .step-image:hover {
                    transform: scale(1.02);
                }
                
                .step-image-container::after {
                    content: '';
                    position: absolute;
                    right: -20px;
                    bottom: -20px;
                    width: 70%;
                    height: 70%;
                    background: linear-gradient(45deg, var(--blue-medium), var(--blue-dark));
                    border-radius: 12px;
                    z-index: 1;
                    opacity: 0.3;
                }
                
                @media (max-width: 991.98px) {
                    .how-it-works-section {
                        padding: 80px 0 40px;
                    }
                    
                    .steps-timeline {
                        left: 30px;
                    }
                    
                    .step-dot {
                        left: 30px;
                    }
                    
                    .step-content-col {
                        padding: 0 15px 0 60px;
                    }
                    
                    .step-image-col {
                        padding: 30px 15px 0 60px;
                    }
                    
                    .step-content {
                        padding: 20px;
                    }
                    
                    .step-row {
                        margin-bottom: 60px;
                    }
                    
                    .step-number {
                        width: 40px;
                        height: 40px;
                        font-size: 18px;
                    }
                }
                
                @media (max-width: 767.98px) {
                    .step-title {
                        font-size: 20px;
                    }
                    
                    .step-image {
                        max-width: 100%;
                    }
                    
                    .step-number {
                        width: 36px;
                        height: 36px;
                        font-size: 16px;
                    }
                    
                    .floating-shapes::before {
                        width: 200px;
                        height: 200px;
                    }
                    
                    .floating-shapes::after {
                        width: 150px;
                        height: 150px;
                    }
                }
            `}</style>
        </section>
    );
};

export default HowItWorks;