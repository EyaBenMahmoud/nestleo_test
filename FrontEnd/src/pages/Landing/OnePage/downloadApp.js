import React from 'react';
import { Container, Row, Col } from 'reactstrap';
import { useTranslation } from 'react-i18next'; // Import translation hook
import smartphone from "../../../assets/images/vecteur-smartphone.png";

const DownloadApp = () => {
    // Initialize translation hook
    const { t } = useTranslation();
    
    return (
        <div className="download-app-wrapper">
            <section className="download-app-section" id="download-app">
                <Container fluid>
                    <Row className="align-items-center">
                        <Col lg={7} md={7} className="download-app-content">
                            <h2 className="app-title">
                                {t('downloadApp.title')}
                            </h2>
                            <div className="download-buttons">
                                <a href="#" className="app-store-btn">
                                    <i className="ri-apple-fill"></i>
                                    <div className="btn-text">
                                        <span>{t('downloadApp.appStore.topText')}</span>
                                        <strong>{t('downloadApp.appStore.bottomText')}</strong>
                                    </div>
                                </a>
                                <a href="#" className="play-store-btn">
                                    <i className="ri-google-play-fill"></i>
                                    <div className="btn-text">
                                        <span>{t('downloadApp.playStore.topText')}</span>
                                        <strong>{t('downloadApp.playStore.bottomText')}</strong>
                                    </div>
                                </a>
                            </div>
                        </Col>
                        <Col lg={5} md={5} className="phone-col">
                            <div className="phone-image-container">
                                <img src={smartphone} alt={t('downloadApp.imageAlt')} className="phone-img" />
                            </div>
                        </Col>
                    </Row>
                </Container>
            </section>

            <style jsx>{`
                .download-app-wrapper {
                    padding: 2rem 5%;
                    background-color: transparent;
                    position: relative;
                    margin: 4rem 0;
                }
                
                .download-app-section {
                    position: relative;
                    background: linear-gradient(to right, #e8f0ff 0%, #fff0f5 100%);
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
                }
                
                /* Content Styles */
                .download-app-content {
                    padding: 4rem 2rem 4rem 4rem;
                    position: relative;
                    z-index: 2;
                    text-align: left;
                }
                
                .app-title {
                    font-size: 2.2rem;
                    font-weight: 700;
                    margin-bottom: 2rem;
                    color: #333;
                    line-height: 1.3;
                }
                
                /* Download Buttons */
                .download-buttons {
                    display: flex;
                    gap: 1rem;
                    margin-top: 2rem;
                }
                
                .app-store-btn, .play-store-btn {
                    display: flex;
                    align-items: center;
                    padding: 0.8rem 1.2rem;
                    border-radius: 8px;
                    text-decoration: none;
                    transition: all 0.3s ease;
                    background-color: #000000;
                    color: white;
                }
                
                .app-store-btn:hover, .play-store-btn:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
                    color: white;
                }
                
                .app-store-btn i, .play-store-btn i {
                    font-size: 1.8rem;
                    margin-right: 0.8rem;
                }
                
                .btn-text {
                    display: flex;
                    flex-direction: column;
                }
                
                .btn-text span {
                    font-size: 0.7rem;
                    margin-bottom: 0.1rem;
                }
                
                .btn-text strong {
                    font-size: 1.1rem;
                    font-weight: 600;
                }
                
                /* Phone Image */
                .phone-col {
                    position: relative;
                    overflow: hidden;
                    padding: 0;
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                }
                
                .phone-image-container {
                    position: relative;
                    height: 100%;
                    z-index: 2;
                }
                
                .phone-img {
                    max-height: 280px;
                    transform: rotate(5deg) translateY(-20px);
                    filter: drop-shadow(0 20px 30px rgba(0, 0, 0, 0.15));
                }
                
                /* Cloud-like decoration elements */
                .download-app-section::before {
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
                
                .download-app-section::after {
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
                
                /* Responsive */
                @media (max-width: 1200px) {
                    .download-app-wrapper {
                        padding: 2rem 10%;
                    }
                    
                    .download-app-content {
                        padding: 3rem 1.5rem 3rem 3rem;
                    }
                    
                    .app-title {
                        font-size: 2rem;
                    }
                    
                    .phone-img {
                        max-height: 320px;
                    }
                }
                
                @media (max-width: 991.98px) {
                    .download-app-wrapper {
                        padding: 2rem 5%;
                    }
                    
                    .download-app-content {
                        padding: 3rem 1.5rem;
                    }
                    
                    .app-title {
                        font-size: 1.8rem;
                    }
                    
                    .phone-img {
                        max-height: 280px;
                    }
                }
                
                @media (max-width: 767.98px) {
                    .download-app-wrapper {
                        padding: 2rem;
                    }
                    
                    .download-app-content {
                        padding: 2rem 1.5rem;
                        text-align: center;
                    }
                    
                    .download-buttons {
                        justify-content: center;
                    }
                    
                    .app-title {
                        font-size: 1.6rem;
                    }
                    
                    .phone-col {
                        justify-content: center;
                        margin-top: 2rem;
                    }
                    
                    .phone-img {
                        max-height: 240px;
                        transform: rotate(0);
                    }
                }
                
                @media (max-width: 575.98px) {
                    .download-app-wrapper {
                        padding: 1.5rem;
                    }
                    
                    .download-buttons {
                        flex-direction: column;
                        align-items: center;
                        gap: 1rem;
                    }
                    
                    .app-store-btn, .play-store-btn {
                        width: 80%;
                        justify-content: center;
                    }
                    
                    .phone-img {
                        max-height: 200px;
                    }
                }
            `}</style>
        </div>
    );
};

export default DownloadApp;