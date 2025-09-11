import React from 'react';
import { Link } from 'react-router-dom';
import { Col, Container, Row } from 'reactstrap';

// Import Images
import meetingsImg from "../../../assets/images/online-meeting.png";
import buildingImg from "../../../assets/images/teamwork.png";
import communicationImg from "../../../assets/images/discussion.png";

const Features = () => {
    const featureItems = [
        {
            icon: "ri-team-line",
            title: "Meetings & Polls",
            description: "Schedule and organize property meetings, create polls for community decisions, and track voting results all in one place. Keep everyone informed and involved.",
            image: meetingsImg
        },
        {
            icon: "ri-building-line",
            title: "Building & Co-owner Management",
            description: "Efficiently manage properties, units, and co-owner information. Track ownership details, maintenance responsibilities and important property documents.",
            image: buildingImg
        },
        {
            icon: "ri-chat-voice-line",
            title: "Instant Communication",
            description: "Connect instantly with residents, property managers, and service providers through secure messaging, announcements, and notifications.",
            image: communicationImg
        }
    ];

    return (
        <React.Fragment>
            <section className="features-section position-relative py-5" id="features">
                <div className="features-bg-element"></div>
                <Container>
                    <Row className="justify-content-center">
                        <Col lg={7}>
                            <div className="text-center mb-5">
                                <span className="badge bg-soft-primary text-primary fs-13 rounded-pill">KEY FEATURES</span>
                                <h2 className="display-5 fw-semibold mt-3 mb-3">Powerful Tools for Community Management</h2>
                                <div className="section-line mx-auto"></div>
                                <p className="text-muted fs-17 mt-4">Our platform offers specialized features designed to strengthen community bonds and simplify property management.</p>
                            </div>
                        </Col>
                    </Row>

                    {featureItems.map((feature, index) => (
                        <Row key={index} className={`align-items-center feature-row ${index % 2 !== 0 ? 'flex-row-reverse' : ''} mb-5`}>
                            <Col lg={6} md={6}>
                                <div className="feature-content-wrapper">
                                    <div className="feature-icon-box mb-4">
                                        <i className={`${feature.icon} feature-icon`}></i>
                                    </div>
                                    <h3 className="feature-title mb-3">{feature.title}</h3>
                                    <p className="feature-description text-muted mb-4">{feature.description}</p>
                                    <Link to="#" className="btn btn-primary rounded-pill">
                                        Learn More <i className="ri-arrow-right-line align-middle ms-1"></i>
                                    </Link>
                                </div>
                            </Col>
                            <Col lg={6} md={6}>
                                <div className="feature-image-wrapper">
                                    <img src={feature.image} alt={feature.title} className="img-fluid feature-image" />
                                    <div className={`feature-shape feature-shape-${index * 2 + 1}`}></div>
                                    <div className={`feature-shape feature-shape-${index * 2 + 2}`}></div>
                                </div>
                            </Col>
                        </Row>
                    ))}
                </Container>

                <style jsx>{`
                    .features-section {
                        background-color: #ffffff;
                        overflow: hidden;
                    }
                    
                    .features-bg-element {
                        position: absolute;
                        top: -100px;
                        left: -100px;
                        width: 400px;
                        height: 400px;
                        border-radius: 50%;
                        background: linear-gradient(135deg, rgba(22, 6, 165, 0.05), rgba(224, 96, 10, 0.05));
                        z-index: 0;
                    }
                    
                    .section-line {
                        width: 80px;
                        height: 4px;
                        background: linear-gradient(45deg, rgb(22, 6, 165), rgb(224, 96, 10));
                        margin: 0 auto;
                        border-radius: 2px;
                    }
                    
                    .bg-soft-primary {
                        background-color: rgba(22, 6, 165, 0.1);
                        padding: 8px 16px;
                    }
                    
                    .feature-row {
                        position: relative;
                        z-index: 1;
                        padding: 30px 0;
                    }
                    
                    .feature-row:not(:last-child)::after {
                        content: '';
                        position: absolute;
                        bottom: 0;
                        left: 10%;
                        width: 80%;
                        height: 1px;
                        background: linear-gradient(90deg, 
                            transparent, 
                            rgba(22, 6, 165, 0.1), 
                            rgba(224, 96, 10, 0.1),
                            transparent);
                    }
                    
                    .feature-content-wrapper {
                        padding: 20px;
                    }
                    
                    .feature-icon-box {
                        width: 80px;
                        height: 80px;
                        border-radius: 16px;
                        background: linear-gradient(135deg, rgba(22, 6, 165, 0.1), rgba(224, 96, 10, 0.1));
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-bottom: 20px;
                    }
                    
                    .feature-icon {
                        font-size: 36px;
                        background: linear-gradient(45deg, rgb(22, 6, 165), rgb(224, 96, 10));
                        -webkit-background-clip: text;
                        background-clip: text;
                        -webkit-text-fill-color: transparent;
                    }
                    
                    .feature-title {
                        font-size: 28px;
                        font-weight: 700;
                        color: #333;
                        margin-bottom: 15px;
                    }
                    
                    .feature-description {
                        font-size: 16px;
                        line-height: 1.7;
                        margin-bottom: 25px;
                    }
                    
                    .feature-image-wrapper {
                        position: relative;
                        padding: 20px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    
                    .feature-image {
                        position: relative;
                        z-index: 2;
                        max-width: 90%;
                        transition: all 0.4s ease;
                    }
                    
                    .feature-image:hover {
                        transform: translateY(-10px);
                    }
                    
                    .feature-shape {
                        position: absolute;
                        border-radius: 50%;
                    }
                    
                    .feature-shape-1 {
                        width: 150px;
                        height: 150px;
                        background: linear-gradient(135deg, rgba(22, 6, 165, 0.08), rgba(224, 96, 10, 0.04));
                        top: -20px;
                        left: 10%;
                        z-index: 1;
                    }
                    
                    .feature-shape-2 {
                        width: 100px;
                        height: 100px;
                        background: rgba(22, 6, 165, 0.06);
                        bottom: 10%;
                        right: 5%;
                        z-index: 1;
                    }
                    
                    .feature-shape-3 {
                        width: 120px;
                        height: 120px;
                        background: rgba(224, 96, 10, 0.06);
                        top: 10%;
                        right: 10%;
                        z-index: 1;
                    }
                    
                    .feature-shape-4 {
                        width: 80px;
                        height: 80px;
                        background: rgba(22, 6, 165, 0.04);
                        bottom: -10px;
                        left: 15%;
                        z-index: 1;
                    }
                    
                    .feature-shape-5 {
                        width: 140px;
                        height: 140px;
                        background: linear-gradient(135deg, rgba(224, 96, 10, 0.06), rgba(22, 6, 165, 0.06));
                        top: 5%;
                        left: 5%;
                        z-index: 1;
                    }
                    
                    .feature-shape-6 {
                        width: 90px;
                        height: 90px;
                        background: rgba(224, 96, 10, 0.05);
                        bottom: 15%;
                        right: 10%;
                        z-index: 1;
                    }
                    
                    .btn-primary {
                        background: rgb(22, 6, 165);
                        border: none;
                        box-shadow: 0 4px 12px rgba(22, 6, 165, 0.2);
                        transition: all 0.3s ease;
                    }
                    
                    .btn-primary:hover {
                        background: rgb(224, 96, 10);
                        transform: translateY(-2px);
                        box-shadow: 0 8px 16px rgba(224, 96, 10, 0.3);
                    }
                    
                    @media (max-width: 992px) {
                        .feature-row {
                            text-align: center;
                            padding: 20px 0;
                        }
                        
                        .feature-icon-box {
                            margin: 0 auto 20px;
                        }
                        
                        .feature-content-wrapper {
                            margin-bottom: 30px;
                        }
                    }
                    
                    @media (max-width: 768px) {
                        .feature-title {
                            font-size: 24px;
                        }
                        
                        .feature-description {
                            font-size: 15px;
                        }
                        
                        .feature-image-wrapper {
                            padding: 10px;
                        }
                    }
                `}</style>
            </section>
        </React.Fragment>
    );
};

export default Features;