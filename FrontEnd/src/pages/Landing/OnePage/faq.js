import React, { useState } from 'react';
import { Col, Container, Row } from 'reactstrap';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Import translation hook

const Faqs = () => {
    // Initialize translation hook
    const { t } = useTranslation();
    
    // FAQ State Management
    const [activeQuestion, setActiveQuestion] = useState(null);

    const toggleQuestion = (id) => {
        setActiveQuestion(activeQuestion === id ? null : id);
    };

    // FAQ Questions and Answers - Using translations
    const faqItems = [
        {
            id: 1,
            question: t('faq.items.1.question'),
            answer: t('faq.items.1.answer'),
            category: "general"
        },
        {
            id: 2,
            question: t('faq.items.2.question'),
            answer: t('faq.items.2.answer'),
            category: "general"
        },
        {
            id: 3,
            question: t('faq.items.3.question'),
            answer: t('faq.items.3.answer'),
            category: "general"
        },
        {
            id: 4,
            question: t('faq.items.4.question'),
            answer: t('faq.items.4.answer'),
            category: "billing"
        },
        {
            id: 5,
            question: t('faq.items.5.question'),
            answer: t('faq.items.5.answer'),
            category: "billing"
        },
        {
            id: 6,
            question: t('faq.items.6.question'),
            answer: t('faq.items.6.answer'),
            category: "property"
        },
        {
            id: 7,
            question: t('faq.items.7.question'),
            answer: t('faq.items.7.answer'),
            category: "property"
        },
        {
            id: 8,
            question: t('faq.items.8.question'),
            answer: t('faq.items.8.answer'),
            category: "general"
        },
    ];

    return (
        <section className="faq-section" id="faq">
            <Container>
                <Row className="justify-content-center mb-5">
                    <Col lg={8} className="text-center">
                        <div className="section-header">
                            <span className="badge section-badge">{t('faq.badge')}</span>
                            <h2 className="section-title">{t('faq.title')}</h2>
                            <div className="section-line"></div>
                            <p className="section-description">
                                {t('faq.description')}
                            </p>
                        </div>
                    </Col>
                </Row>

                <Row className="justify-content-center">
                    <Col xl={10}>
                        {faqItems.map((item) => (
                            <div className="faq-item" key={item.id}>
                                <div 
                                    className={`faq-question ${activeQuestion === item.id ? 'active' : ''}`}
                                    onClick={() => toggleQuestion(item.id)}
                                >
                                    <h5 className="mb-0">{item.question}</h5>
                                    <div className="faq-icon">
                                        <i className={`ri-arrow-down-s-line ${activeQuestion === item.id ? 'rotated' : ''}`}></i>
                                    </div>
                                </div>
                                
                                <div className={`faq-answer ${activeQuestion === item.id ? 'open' : ''}`}>
                                    <div className="faq-answer-content">
                                        <p>{item.answer}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </Col>
                </Row>
            </Container>
            
            {/* CTA Section - Matching Download App Style */}
            <div className="faq-cta-wrapper">
                <div className="faq-cta">
                    <Container fluid>
                        <Row className="align-items-center">
                            <Col lg={7} md={7} className="faq-cta-content">
                                <h2 className="faq-cta-title">{t('faq.cta.title')}</h2>
                                <p className="faq-cta-description">
                                    {t('faq.cta.description')}
                                </p>
                                <div className="faq-cta-buttons">
                                    <Link to="/contact" className="faq-cta-link">
                                        <span>{t('faq.cta.button')}</span>
                                        <i className="ri-arrow-right-line"></i>
                                    </Link>
                                </div>
                            </Col>
                            <Col lg={5} md={5} className="faq-cta-image-col">
                                <div className="faq-cta-image-container">
                                    <i className="ri-customer-service-line"></i>
                                </div>
                            </Col>
                        </Row>
                    </Container>
                </div>
            </div>

            <style jsx>{`
                :root {
                    --primary: #e6485c;
                    --primary-hover: #d13a4e;
                    --accent-light: #ff8a9c;
                }
                
                .faq-section {
                    position: relative;
                    padding: 5rem 0;
                    background: linear-gradient(135deg, #f8f9fa, #ffffff);
                    overflow: hidden;
                }
                
                .faq-section::before {
                    content: "";
                    position: absolute;
                    right: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e8f4f8' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
                    opacity: 0.3;
                    z-index: 0;
                }
                
                /* Section Header */
                .section-header {
                    margin-bottom: 3rem;
                    position: relative;
                    z-index: 1;
                }
                
                .section-badge {
                    display: inline-block;
                    padding: 0.5rem 1rem;
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: var(--primary);
                    background-color: rgba(230, 72, 92, 0.1);
                    border-radius: 30px;
                    margin-bottom: 1rem;
                }
                
                .section-title {
                    font-size: 2.5rem;
                    font-weight: 700;
                    color: #333;
                    margin-bottom: 1rem;
                }
                
                .section-line {
                    width: 60px;
                    height: 3px;
                    background: linear-gradient(45deg, var(--primary), var(--accent-light));
                    margin: 1rem auto;
                    border-radius: 3px;
                }
                
                .section-description {
                    font-size: 1.1rem;
                    color: #6c757d;
                    max-width: 700px;
                    margin: 0 auto;
                }
                
                /* FAQ Item Styles */
                .faq-item {
                    margin-bottom: 1rem;
                    border: 1px solid rgba(255, 255, 255, 0.6);
                    border-radius: 8px;
                    background-color: rgba(255, 255, 255, 0.7);
                    overflow: hidden;
                    position: relative;
                    z-index: 1;
                    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.03);
                }
                
                .faq-question {
                    padding: 1.25rem;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    position: relative;
                }
                
                .faq-question:hover {
                    background-color: rgba(255, 255, 255, 0.9);
                }
                
                .faq-question.active {
                    background-color: rgba(255, 255, 255, 0.9);
                }
                
                .faq-question h5 {
                    font-weight: 500;
                    color: #212529;
                    font-size: 1.05rem;
                    padding-right: 2rem;
                }
                
                .faq-icon {
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    position: absolute;
                    right: 1.25rem;
                }
                
                .faq-icon i {
                    font-size: 1.5rem;
                    color: #e6485c;
                    transition: transform 0.3s ease;
                }
                
                .faq-icon i.rotated {
                    transform: rotate(-180deg);
                }
                
                /* FAQ Answer Styles */
                .faq-answer {
                    height: 0;
                    overflow: hidden;
                    transition: height 0.35s ease;
                    border-top: none;
                }
                
                .faq-answer.open {
                    height: auto;
                    border-top: 1px solid rgba(255, 255, 255, 0.6);
                }
                
                .faq-answer-content {
                    padding: 1.25rem;
                }
                
                .faq-answer-content p {
                    margin: 0;
                    color: #6c757d;
                    line-height: 1.6;
                }
                
                /* CTA Section - Matching Download App Style */
                .faq-cta-wrapper {
                    padding: 2rem 5%;
                    background-color: transparent;
                    position: relative;
                    margin: 4rem 0 2rem;
                }
                
                .faq-cta {
                    position: relative;
                    background: linear-gradient(to right, #e8f0ff 0%, #fff0f5 100%);
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
                }
                
                .faq-cta::before {
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
                
                .faq-cta::after {
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
                
                .faq-cta-content {
                    padding: 4rem 2rem 4rem 4rem;
                    position: relative;
                    z-index: 2;
                    text-align: left;
                }
                
                .faq-cta-title {
                    font-size: 2.2rem;
                    font-weight: 700;
                    margin-bottom: 1.5rem;
                    color: #333;
                    line-height: 1.3;
                }
                
                .faq-cta-description {
                    color: #6c757d;
                    font-size: 1.1rem;
                    margin-bottom: 2rem;
                    line-height: 1.6;
                    max-width: 90%;
                }
                
                .faq-cta-buttons {
                    margin-top: 1.5rem;
                }
                
                .faq-cta-link {
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
                
                .faq-cta-link:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 20px rgba(230, 72, 92, 0.25);
                    color: white;
                }
                
                .faq-cta-link span {
                    color: white;
                    transition: all 0.3s;
                }
                
                .faq-cta-link i {
                    margin-left: 10px;
                    color: white;
                    transition: all 0.3s;
                }
                
                .faq-cta-link:hover i {
                    transform: translateX(5px);
                }
                
                .faq-cta-image-col {
                    position: relative;
                    overflow: hidden;
                    padding: 0;
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                }
                
                .faq-cta-image-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    position: relative;
                    height: 100%;
                    z-index: 2;
                    padding: 2rem;
                }
                
                .faq-cta-image-container i {
                    font-size: 10rem;
                    background: linear-gradient(45deg, var(--primary), var(--accent-light));
                    -webkit-background-clip: text;
                    background-clip: text;
                    -webkit-text-fill-color: transparent;
                    filter: drop-shadow(0 10px 15px rgba(230, 72, 92, 0.15));
                }
                
                /* Responsive Styles */
                @media (max-width: 1200px) {
                    .faq-cta-wrapper {
                        padding: 2rem 10%;
                    }
                    
                    .faq-cta-content {
                        padding: 3rem 1.5rem 3rem 3rem;
                    }
                    
                    .faq-cta-title {
                        font-size: 2rem;
                    }
                    
                    .faq-cta-image-container i {
                        font-size: 8rem;
                    }
                }
                
                @media (max-width: 991.98px) {
                    .section-title {
                        font-size: 2rem;
                    }
                    
                    .faq-cta-wrapper {
                        padding: 2rem 5%;
                    }
                    
                    .faq-cta-content {
                        padding: 3rem 1.5rem;
                    }
                    
                    .faq-cta-title {
                        font-size: 1.8rem;
                    }
                    
                    .faq-cta-description {
                        font-size: 1rem;
                        max-width: 100%;
                    }
                }
                
                @media (max-width: 767.98px) {
                    .faq-section {
                        padding: 4rem 0;
                    }
                    
                    .section-title {
                        font-size: 1.8rem;
                    }
                    
                    .faq-question h5 {
                        font-size: 1rem;
                    }
                    
                    .faq-cta-wrapper {
                        padding: 2rem;
                    }
                    
                    .faq-cta-content {
                        padding: 2rem 1.5rem;
                        text-align: center;
                        order: 2;
                    }
                    
                    .faq-cta-image-col {
                        order: 1;
                        justify-content: center;
                        margin-top: 1rem;
                        margin-bottom: 0;
                    }
                    
                    .faq-cta-buttons {
                        display: flex;
                        justify-content: center;
                    }
                    
                    .faq-cta-title {
                        font-size: 1.7rem;
                    }
                    
                    .faq-cta-description {
                        max-width: 100%;
                        margin-left: auto;
                        margin-right: auto;
                    }
                    
                    .faq-cta-image-container i {
                        font-size: 7rem;
                    }
                }
                
                @media (max-width: 575.98px) {
                    .faq-cta-wrapper {
                        padding: 1.5rem;
                    }
                    
                    .faq-cta-title {
                        font-size: 1.6rem;
                    }
                    
                    .faq-cta-link {
                        width: 80%;
                        justify-content: center;
                    }
                }
            `}</style>
        </section>
    );
};

export default Faqs;