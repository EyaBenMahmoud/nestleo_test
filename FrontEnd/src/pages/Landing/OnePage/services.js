import React from 'react';
import { Link } from 'react-router-dom';
import { Col, Container, Row } from 'reactstrap';
import { useTranslation } from 'react-i18next'; // Import translation hook

const Services = () => {
    // Initialize translation hook
    const { t } = useTranslation();

    const serviceItems = [
        {
            icon: "ri-shield-user-line",
            title: t('services.items.secureAccess.title'),
            description: t('services.items.secureAccess.description')
        },
        {
            icon: "ri-dashboard-line",
            title: t('services.items.personalizedExperience.title'),
            description: t('services.items.personalizedExperience.description')
        },
        {
            icon: "ri-calendar-check-line",
            title: t('services.items.maintenance.title'),
            description: t('services.items.maintenance.description')
        },
        {
            icon: "ri-message-3-line",
            title: t('services.items.communityBuilding.title'),
            description: t('services.items.communityBuilding.description')
        },
        {
            icon: "ri-money-dollar-circle-line",
            title: t('services.items.payments.title'),
            description: t('services.items.payments.description')
        },
        {
            icon: "ri-file-upload-line",
            title: t('services.items.digitalRecords.title'),
            description: t('services.items.digitalRecords.description')
        },
        {
            icon: "ri-mail-send-line",
            title: t('services.items.stayInformed.title'),
            description: t('services.items.stayInformed.description')
        },
        {
            icon: "ri-chat-1-line",
            title: t('services.items.communication.title'),
            description: t('services.items.communication.description')
        },
        {
            icon: "ri-bar-chart-grouped-line",
            title: t('services.items.insights.title'),
            description: t('services.items.insights.description')
        }
    ];

    return (
        <React.Fragment>
            <section className="services-section position-relative py-5" id="services">
                <div className="services-bg-element"></div>
                <Container>
                    <Row className="justify-content-center">
                        <Col lg={7}>
                            <div className="text-center mb-5">
                                <span className="badge bg-soft-primary text-primary fs-13 rounded-pill">{t('services.badge')}</span>
                                <h2 className="display-5 fw-semibold mt-3 mb-3">
                                    {t('services.heading.part1')} <span className="text-accent">{t('services.heading.part2')}</span> {t('services.heading.part3')}
                                </h2>
                                <div className="section-line mx-auto"></div>
                                <p className="text-muted fs-17 mt-4">{t('services.subheading')}</p>
                            </div>
                        </Col>
                    </Row>

                    <Row className="g-4 services-grid">
                        {serviceItems.map((service, index) => (
                            <Col lg={4} md={6} key={index}>
                                <div className="service-card h-100">
                                    <div className="service-icon-box">
                                        <i className={`${service.icon} service-icon`}></i>
                                    </div>
                                    <h5 className="service-title">{service.title}</h5>
                                    <p className="service-description">{service.description}</p>
                                </div>
                            </Col>
                        ))}
                    </Row>
                </Container>
                
                <style jsx="true">{`
                    :root {
                        --primary: #e6485c;
                        --primary-hover: #d13a4e;
                        --accent-light: #ff8a9c;
                    }
                    
                    .text-accent {
                        color: var(--primary) !important;
                    }
                    
                    .services-section {
                        background-color: #f8f9fa;
                        overflow: hidden;
                    }
                    
                    .services-bg-element {
                        position: absolute;
                        top: -100px;
                        right: -100px;
                        width: 400px;
                        height: 400px;
                        border-radius: 50%;
                        background: linear-gradient(135deg, rgba(230, 72, 92, 0.05), rgba(255, 138, 156, 0.05));
                        z-index: 0;
                    }
                    
                    .section-line {
                        width: 80px;
                        height: 4px;
                        background: linear-gradient(45deg, var(--primary), var(--accent-light));
                        margin: 0 auto;
                        border-radius: 2px;
                    }
                    
                    .bg-soft-primary {
                        background-color: rgba(230, 72, 92, 0.1);
                        padding: 8px 16px;
                    }
                    
                    .text-primary {
                        color: var(--primary) !important;
                    }
                    
                    .services-grid {
                        position: relative;
                        z-index: 1;
                    }
                    
                    .service-card {
                        background: #ffffff;
                        border-radius: 16px;
                        padding: 30px;
                        transition: all 0.3s ease;
                        border: 1px solid rgba(0, 0, 0, 0.05);
                        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.03);
                        position: relative;
                        overflow: hidden;
                    }
                    
                    .service-card::before {
                        content: "";
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        width: 100%;
                        height: 3px;
                        background: linear-gradient(45deg, var(--primary), var(--accent-light));
                        transform: scaleX(0);
                        transition: transform 0.3s ease;
                        transform-origin: left;
                    }
                    
                    .service-card:hover {
                        transform: translateY(-8px);
                        box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
                    }
                    
                    .service-card:hover::before {
                        transform: scaleX(1);
                    }
                    
                    .service-icon-box {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        width: 70px;
                        height: 70px;
                        border-radius: 50%;
                        background-color: rgba(230, 72, 92, 0.1);
                        margin-bottom: 20px;
                    }
                    
                    .service-icon {
                        font-size: 30px;
                        color: var(--primary);
                    }
                    
                    .service-title {
                        font-size: 20px;
                        font-weight: 600;
                        margin-bottom: 15px;
                        color: #333;
                    }
                    
                    .service-description {
                        color: #6c757d;
                        margin-bottom: 20px;
                        font-size: 15px;
                        line-height: 1.6;
                    }
                    
                    .service-link {
                        color: var(--primary);
                        text-decoration: none;
                        font-weight: 600;
                        font-size: 14px;
                        display: inline-block;
                        position: relative;
                        transition: all 0.3s ease;
                    }
                    
                    .service-link:hover {
                        color: var(--primary-hover);
                        transform: translateX(5px);
                    }
                    
                    @media (max-width: 768px) {
                        .service-card {
                            padding: 20px;
                        }
                        
                        .service-icon-box {
                            width: 60px;
                            height: 60px;
                        }
                        
                        .service-icon {
                            font-size: 24px;
                        }
                    }
                `}</style>
            </section>
        </React.Fragment>
    );
};

export default Services;