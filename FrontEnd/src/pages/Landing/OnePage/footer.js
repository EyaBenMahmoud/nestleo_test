import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Col, Container, Row } from 'reactstrap';
import { useTranslation } from 'react-i18next'; // Import translation hook

// Import Images
import logolight from "../../../assets/images/Nestly.png";

const Footer = () => {
    // Initialize translation hook
    const { t } = useTranslation();
    
    const [crmSettings, setCrmSettings] = useState({});
    const [currentYear] = useState(new Date().getFullYear());

    useEffect(() => {
        fetch(`${process.env.REACT_APP_API_URL}/api/crm/settings`)
            .then(response => response.json())
            .then(data => setCrmSettings(data))
            .catch(error => console.error('Error fetching CRM settings:', error));
    }, []);

    // Function to handle smooth scroll for anchor links
    const handleSmoothScroll = (e, target) => {
        e.preventDefault();
        const element = document.getElementById(target);
        if (element) {
            window.scrollTo({
                top: element.offsetTop - 120, // Adjust for fixed header
                behavior: 'smooth'
            });
        }
    };

    // Function to scroll to top when navigating to a different page
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    return (
        <React.Fragment>
            <footer className="footer-section">
                <div className="footer-content">
                    <Container>
                        <Row className="footer-main-row">
                            <Col md={3} sm={12} className="footer-brand-col">
                                <div className="footer-brand">
                                    <Link to="/" className="footer-logo" onClick={scrollToTop}>
                                        <div className="logo-text">Nestleo</div>
                                    </Link>
                                </div>

                                <div className="footer-app-buttons">
                                    <a href="#" className="app-store-btn">
                                        <i className="ri-apple-fill"></i> {t('footer.appStore')}
                                    </a>
                                    <a href="#" className="play-store-btn">
                                        <i className="ri-google-play-fill"></i> {t('footer.googlePlay')}
                                    </a>
                                </div>
                                
                                <div className="footer-social-links">
                                    <a href="#" className="social-link" aria-label="Facebook">
                                        <i className="ri-facebook-fill"></i>
                                    </a>
                                    <a href="#" className="social-link" aria-label="Instagram">
                                        <i className="ri-instagram-line"></i>
                                    </a>
                                    <a href="#" className="social-link" aria-label="YouTube">
                                        <i className="ri-youtube-fill"></i>
                                    </a>
                                    <a href="#" className="social-link" aria-label="LinkedIn">
                                        <i className="ri-linkedin-fill"></i>
                                    </a>
                                    <a href="#" className="social-link" aria-label="Twitter">
                                        <i className="ri-twitter-fill"></i>
                                    </a>
                                </div>
                            </Col>
                            
                            <Col md={9} sm={12} className="footer-links-container">
                                <Row>
                                    <Col lg={3} md={6} sm={6} xs={6} className="footer-links-col">
                                        <h5 className="footer-title">{t('footer.register.title')}</h5>
                                        <ul className="footer-links">
                                            <li>
                                                <Link to="/registerWorker" onClick={scrollToTop}>{t('footer.register.worker')}</Link>
                                            </li>
                                            <li>
                                                <Link to="/registerSyndicate" onClick={scrollToTop}>{t('footer.register.syndicate')}</Link>
                                            </li>
                                            <li>
                                                <Link to="/registerCoOwner" onClick={scrollToTop}>{t('footer.register.coOwner')}</Link>
                                            </li>
                                        </ul>
                                    </Col>
                                    
                                    <Col lg={3} md={6} sm={6} xs={6} className="footer-links-col">
                                        <h5 className="footer-title">{t('footer.legal.title')}</h5>
                                        <ul className="footer-links">
                                            <li>
                                                <Link to="/TermsAndConditions" onClick={scrollToTop}>{t('footer.legal.terms')}</Link>
                                            </li>
                                            <li>
                                                <Link to="/cookie-policy" onClick={scrollToTop}>{t('footer.legal.cookie')}</Link>
                                            </li>
                                            <li>
                                                <Link to="/privacy-policy" onClick={scrollToTop}>{t('footer.legal.privacy')}</Link>
                                            </li>
                                        </ul>
                                    </Col>
                                    
                                    <Col lg={3} md={6} sm={6} xs={6} className="footer-links-col">
                                        <h5 className="footer-title">{t('footer.contact.title')}</h5>
                                        <ul className="footer-links contact-links">
                                            {crmSettings.email && (
                                                <li>
                                                    <i className="ri-mail-line"></i>
                                                    <a href={`mailto:${crmSettings.email}`}>{crmSettings.email}</a>
                                                </li>
                                            )}
                                            {crmSettings.phoneNumber && (
                                                <li>
                                                    <i className="ri-phone-line"></i>
                                                    <a href={`tel:${crmSettings.phoneNumber}`}>{crmSettings.phoneNumber}</a>
                                                </li>
                                            )}
                                            {crmSettings.companyName && (
                                                <li>
                                                    <i className="ri-building-line"></i>
                                                    <span>{crmSettings.companyName}</span>
                                                </li>
                                            )}
                                            {crmSettings.website && (
                                                <li>
                                                    <i className="ri-global-line"></i>
                                                    <a href={crmSettings.website} target="_blank" rel="noopener noreferrer">
                                                        {crmSettings.website.replace(/^https?:\/\//, '')}
                                                    </a>
                                                </li>
                                            )}
                                        </ul>
                                    </Col>
                                    
                                    <Col lg={3} md={6} sm={6} xs={6} className="footer-links-col">
                                        <h5 className="footer-title">{t('footer.info.title')}</h5>
                                        <ul className="footer-links">
                                            <li>
                                                <a href="#contact" onClick={(e) => handleSmoothScroll(e, 'contact')}>
                                                    {t('footer.info.devices')}
                                                </a>
                                            </li>
                                            <li>
                                                <a href="#howitworks" onClick={(e) => handleSmoothScroll(e, 'howitworks')}>
                                                    {t('footer.info.setup')}
                                                </a>
                                            </li>
                                            <li>
                                                <a href="#hero" onClick={(e) => handleSmoothScroll(e, 'hero')}>
                                                    {t('footer.info.about')}
                                                </a>
                                            </li>
                                        </ul>
                                    </Col>
                                </Row>
                            </Col>
                        </Row>
                    </Container>
                </div>
                
                <div className="footer-separator"></div>
                
                <div className="footer-bottom">
                    <Container>
                        <div className="made-with-love">
                            <p>{t('footer.copyright.text', { year: currentYear })}</p>
                        </div>
                    </Container>
                </div>
            </footer>

            <style jsx>{`
                /* Footer Styles with matching background */
                .footer-section {
                    position: relative;
                    background: linear-gradient(to right, #e8f0ff 0%, #fff0f5 100%);
                    padding-top: 0;
                    color: #212529;
                    font-family: "Inter", sans-serif;
                    margin-top: 0;
                }
                
                .footer-content {
                    position: relative;
                    padding: 3rem 0 2rem;
                    background: transparent;
                }
                
                .footer-main-row {
                    padding-top: 1rem;
                }
                
                /* Brand Column */
                .footer-brand-col {
                    padding-right: 1.5rem;
                    margin-bottom: 2rem;
                }
                
                .footer-logo {
                    display: inline-block;
                    margin-bottom: 1.5rem;
                    padding: 0.5rem;
                    border-radius: 8px;
                }
                
                .footer-logo img {
                    max-height: 30px;
                }
                
                /* App Buttons */
                .footer-app-buttons {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    margin-bottom: 1.5rem;
                    width: 100%;
                }
                
                .app-store-btn, .play-store-btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0.5rem 0.75rem;
                    border: 1px solid #dee2e6;
                    border-radius: 5px;
                    color: #212529;
                    font-size: var(--wp--preset--font-size--xs);
                    text-decoration: none;
                    transition: all 0.2s ease;
                    background: rgba(255, 255, 255, 0.6);
                    width: 100%;
                    max-width: 200px;
                }
                
                .app-store-btn i, .play-store-btn i {
                    font-size: 1.1rem;
                    margin-right: 0.5rem;
                }
                
                .app-store-btn:hover, .play-store-btn:hover {
                    background-color: rgba(255, 255, 255, 0.8);
                    color: #212529;
                    border-color: #c6c7c8;
                }
            
                
                /* Social Links */
                .footer-social-links {
                    display: flex;
                    gap: 1rem;
                    margin-top: 1rem;
                }
                
                .social-link {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    color: #212529;
                    font-size: 1rem;
                    text-decoration: none;
                    transition: color 0.2s;
                }
                
                .social-link:hover {
                    color: #e6485c;
                }
                
                /* Footer Links Container */
                .footer-links-container {
                    padding-left: 2rem;
                }
                
                /* Footer Links */
                .footer-links-col {
                    margin-bottom: 2rem;
                }
                
                .footer-title {
                    color: #000000;
                    font-size: var(--wp--preset--font-size--s);
                    font-weight: 600;
                    margin-bottom: 1.5rem;
                }
                
                .footer-links {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                
                .footer-links li {
                    margin-bottom: 0.75rem;
                }
                
                .footer-links a {
                    color: #212529;
                    font-size: var(--wp--preset--font-size--xs);
                    text-decoration: none;
                    transition: color 0.2s;
                }
                
                .footer-links a:hover {
                    color: #e6485c;
                }
                
                /* Contact Links */
                .contact-links li {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.75rem;
                    margin-bottom: 0.75rem;
                }
                
                .contact-links i {
                    color: #e6485c;
                    font-size: 1rem;
                    margin-top: 0.15rem;
                    flex-shrink: 0;
                }
                
                .contact-links span, .contact-links a {
                    color: #212529;
                    font-size: var(--wp--preset--font-size--xs);
                    word-break: break-word;
                    line-height: 1.5;
                }
                
                .contact-links a:hover {
                    color: #e6485c;
                }
                
                /* Separator */
                .footer-separator {
                    height: 1px;
                    background: rgba(0, 0, 0, 0.06);
                    margin: 0.5rem 0 0;
                }
                
                /* Footer Bottom */
                .footer-bottom {
                    padding: 1.25rem 0;
                    text-align: center;
                    background: transparent;
                }
                
                .made-with-love {
                    font-size: var(--wp--preset--font-size--xs);
                    color: #212529;
                }
                
                .heart {
                    color: #e6485c;
                    display: inline-block;
                    animation: pulse 1s infinite;
                }
                
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.2); }
                    100% { transform: scale(1); }
                }
                
                /* Responsive */
                @media (max-width: 991.98px) {
                    .footer-content {
                        padding: 2.5rem 0 1.5rem;
                    }
                    
                    .footer-links-container {
                        padding-left: 15px;
                    }
                }
                
                @media (max-width: 767.98px) {
                    .footer-links-col {
                        margin-bottom: 1.5rem;
                    }
                    
                    .footer-title {
                        margin-bottom: 1rem;
                        font-size: 16px;
                    }
                    
                    .footer-logo {
                        margin-bottom: 1rem;
                    }
                    
                    .footer-main-row {
                        padding-top: 0.5rem;
                    }
                }
            `}</style>
        </React.Fragment>
    );
};

export default Footer;