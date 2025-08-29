import React from 'react';
import { Col, Container, Row } from 'reactstrap';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Import translation hook

// Swiper
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import "swiper/css/effect-cards";
import { Pagination, Navigation, Autoplay, EffectCoverflow } from "swiper";
import avatar1 from '../../../assets/images/users/avatar-1.jpg';
import avatar2 from '../../../assets/images/users/avatar-2.jpg';
import avatar3 from '../../../assets/images/users/avatar-3.jpg';
import avatar4 from '../../../assets/images/users/avatar-4.jpg';
import avatar5 from '../../../assets/images/users/avatar-5.jpg';

const Reviews = () => {
    // Initialize translation hook
    const { t } = useTranslation();

    // Client reviews data
    const testimonials = [
        {
            id: 1,
            content: t('reviewsLanding.testimonials.1.content'),
            author: t('reviewsLanding.testimonials.1.author'),
            role: t('reviewsLanding.testimonials.1.role'),
            image: avatar1,
            rating: 5
        },
        {
            id: 2,
            content: t('reviewsLanding.testimonials.2.content'),
            author: t('reviewsLanding.testimonials.2.author'),
            role: t('reviewsLanding.testimonials.2.role'),
            image: avatar2,
            rating: 5
        },
        {
            id: 3,
            content: t('reviewsLanding.testimonials.3.content'),
            author: t('reviewsLanding.testimonials.3.author'),
            role: t('reviewsLanding.testimonials.3.role'),
            image: avatar3,
            rating: 4
        },
        {
            id: 4,
            content: t('reviewsLanding.testimonials.4.content'),
            author: t('reviewsLanding.testimonials.4.author'),
            role: t('reviewsLanding.testimonials.4.role'),
            image: avatar4,
            rating: 5
        },
        {
            id: 5,
            content: t('reviewsLanding.testimonials.5.content'),
            author: t('reviewsLanding.testimonials.5.author'),
            role: t('reviewsLanding.testimonials.5.role'),
            image: avatar5,
            rating: 5
        },
    ];

    // Render star rating
    const renderRating = (rating) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <i 
                    key={i} 
                    className={`ri-star-fill ${i <= rating ? 'filled' : 'empty'}`}
                ></i>
            );
        }
        return stars;
    };

    return (
        <React.Fragment>
            <section className="testimonials-section" id="reviews">
                <div className="testimonial-bg-pattern"></div>
                <Container>
                    <Row className="justify-content-center">
                        <Col lg={8} className="text-center">
                            <div className="section-header">
                                <span className="badge section-badge">{t('reviewsLanding.badge')}</span>
                                <h2 className="section-title">{t('reviewsLanding.title')}</h2>
                                <div className="section-line"></div>
                                <p className="section-description">
                                    {t('reviewsLanding.description')}
                                </p>
                            </div>
                        </Col>
                    </Row>
                    
                    <Row>
                        <Col lg={12}>
                            <div className="testimonial-metrics">
                                <div className="metric">
                                    <span className="metric-value">{t('reviewsLanding.metrics.uptime.value')}</span>
                                    <span className="metric-label">{t('reviewsLanding.metrics.uptime.label')}</span>
                                    <span className="metric-desc">{t('reviewsLanding.metrics.uptime.desc1')}</span>
                                    <span className="metric-desc">{t('reviewsLanding.metrics.uptime.desc2')}</span>
                                </div>
                                
                                <div className="metric">
                                    <span className="metric-value">{t('reviewsLanding.metrics.modules.value')}</span>
                                    <span className="metric-label">{t('reviewsLanding.metrics.modules.label')}</span>
                                    <span className="metric-desc">{t('reviewsLanding.metrics.modules.desc1')}</span>
                                    <span className="metric-desc">{t('reviewsLanding.metrics.modules.desc2')}</span>
                                </div>
                                
                                <div className="metric">
                                    <span className="metric-value">{t('reviewsLanding.metrics.setup.value')}</span>
                                    <span className="metric-label">{t('reviewsLanding.metrics.setup.label')}</span>
                                    <span className="metric-desc">{t('reviewsLanding.metrics.setup.desc1')}</span>
                                    <span className="metric-desc">{t('reviewsLanding.metrics.setup.desc2')}</span>
                                </div>
                                
                                <div className="metric">
                                    <span className="metric-value">{t('reviewsLanding.metrics.security.value')}</span>
                                    <span className="metric-label">{t('reviewsLanding.metrics.security.label')}</span>
                                    <span className="metric-desc">{t('reviewsLanding.metrics.security.desc1')}</span>
                                    <span className="metric-desc">{t('reviewsLanding.metrics.security.desc2')}</span>
                                </div>
                            </div>
                        </Col>
                    </Row>

                    <Row className="testimonials-row">
                        <Col>
                            <div className="testimonials-wrapper">
                                <div className="swiper-button testimonial-prev">
                                    <i className="ri-arrow-left-line"></i>
                                </div>
                                
                                <Swiper
                                    modules={[Navigation, Pagination, Autoplay, EffectCoverflow]}
                                    effect="coverflow"
                                    grabCursor={true}
                                    centeredSlides={true}
                                    slidesPerView={"auto"}
                                    loop={true}
                                    autoplay={{
                                        delay: 5000,
                                        disableOnInteraction: false,
                                    }}
                                    coverflowEffect={{
                                        rotate: 0,
                                        stretch: 0,
                                        depth: 100,
                                        modifier: 2,
                                        slideShadows: false,
                                    }}
                                    pagination={{ 
                                        clickable: true,
                                        dynamicBullets: true 
                                    }}
                                    navigation={{
                                        nextEl: '.testimonial-next',
                                        prevEl: '.testimonial-prev',
                                    }}
                                    className="testimonialSwiper"
                                >
                                    {testimonials.map((testimonial) => (
                                        <SwiperSlide key={testimonial.id}>
                                            <div className="testimonial-card">
                                                <div className="testimonial-card-inner">
                                                    <div className="testimonial-rating">
                                                        {renderRating(testimonial.rating)}
                                                    </div>
                                                    
                                                    <div className="quote-icon">
                                                        <i className="ri-double-quotes-l"></i>
                                                    </div>
                                                    
                                                    <p className="testimonial-content">{testimonial.content}</p>
                                                    
                                                    <div className="testimonial-author">
                                                        <div className="author-image">
                                                            <img src={testimonial.image} alt={testimonial.author} />
                                                        </div>
                                                        <div className="author-info">
                                                            <h5>{testimonial.author}</h5>
                                                            <p>{testimonial.role}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </SwiperSlide>
                                    ))}
                                </Swiper>
                                
                                <div className="swiper-button testimonial-next">
                                    <i className="ri-arrow-right-line"></i>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Container>

                {/* CTA Section - Matching Download App Style */}
                <div className="testimonial-cta-wrapper">
                    <div className="testimonial-cta">
                        <Container fluid>
                            <Row className="align-items-center">
                                <Col lg={7} md={7} className="testimonial-cta-content">
                                    <h2 className="testimonial-cta-title">{t('reviewsLanding.cta.title')}</h2>
                                    <p className="testimonial-cta-description">
                                        {t('reviewsLanding.cta.description')}
                                    </p>
                                    <div className="testimonial-cta-buttons">
                                        <Link to="/signup" className="testimonial-cta-link">
                                            <span>{t('reviewsLanding.cta.button')}</span>
                                            <i className="ri-arrow-right-line"></i>
                                        </Link>
                                        <p className="cta-note">{t('reviewsLanding.cta.note')}</p>
                                    </div>
                                </Col>
                                <Col lg={5} md={5} className="testimonial-cta-image-col">
                                    <div className="testimonial-cta-image-container">
                                        <i className="ri-home-heart-fill"></i>
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
                        --bright-green: #4AE290;
                    }
                    
                    .testimonials-section {
                        position: relative;
                        padding: 5rem 0;
                        background: linear-gradient(135deg, #f8f9fa, #ffffff);
                        overflow: hidden;
                    }
                    .metric-desc {
    font-size: 0.85rem;
    color: #888;
    margin-top: 0.3rem;
    text-align: center;
    line-height: 1.4;
}
                    .testimonial-bg-pattern {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background-image: radial-gradient(rgba(230, 72, 92, 0.03) 2px, transparent 2px),
                                          radial-gradient(rgba(255, 138, 156, 0.03) 2px, transparent 2px);
                        background-size: 50px 50px;
                        background-position: 0 0, 25px 25px;
                        opacity: 0.5;
                        pointer-events: none;
                    }
                    
                    /* Section Header */
                    .section-header {
                        margin-bottom: 3rem;
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
                    
                    /* Metrics Display */
                    .testimonial-metrics {
                        display: flex;
                        justify-content: center;
                        flex-wrap: wrap;
                        gap: 2.5rem;
                        margin-bottom: 3rem;
                        position: relative;
                    }
                    
                    .metric {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        padding: 1.5rem 1rem;
                        background: linear-gradient(to right, #e8f0ff 0%, #fff0f5 100%);
                        border-radius: 20px;
                        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
                        min-width: 160px;
                        overflow: hidden;
                        margin: 1rem 0.5rem;
                        transition: all 0.3s;
                    }
                    
                    .metric:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
                    }
                    
                    .metric-value {
                        font-size: 2.5rem;
                        font-weight: 800;
                        line-height: 1.2;
                        margin-bottom: 0.5rem;
                        background: linear-gradient(45deg, var(--primary), var(--accent-light));
                        -webkit-background-clip: text;
                        background-clip: text;
                        -webkit-text-fill-color: transparent;
                    }
                    
                    .metric-stars {
                        display: flex;
                        margin-bottom: 0.5rem;
                    }
                    
                    .metric-stars i {
                        font-size: 1rem;
                        color: var(--accent-light);
                        margin: 0 2px;
                    }
                    
                    .metric-stars i.empty {
                        color: #ddd;
                    }
                    
                    .metric-label {
                        font-size: 0.9rem;
                        color: #6c757d;
                        font-weight: 500;
                    }
                    
                    /* Testimonials Row */
                    .testimonials-row {
                        margin: 3rem 0;
                        position: relative;
                    }
                    
                    .testimonials-wrapper {
                        position: relative;
                        padding: 2rem 0;
                    }
                    
                    /* Swiper Styles */
                    .testimonialSwiper {
                        width: 100%;
                        padding-top: 1rem;
                        padding-bottom: 3rem;
                    }
                    
                    .testimonialSwiper .swiper-slide {
                        width: 450px;
                        height: auto;
                    }
                    
                    /* Custom Navigation */
                    .swiper-button {
                        position: absolute;
                        top: 50%;
                        transform: translateY(-50%);
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        background: white;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        z-index: 10;
                        transition: all 0.3s;
                    }
                    
                    .swiper-button:hover {
                        background: var(--primary);
                    }
                    
                    .swiper-button i {
                        font-size: 1.2rem;
                        color: var(--primary);
                        transition: all 0.3s;
                    }
                    
                    .swiper-button:hover i {
                        color: white !important;
                    }
                    
                    .testimonial-prev {
                        left: 10px;
                    }
                    
                    .testimonial-next {
                        right: 10px;
                    }
                    
                    /* Custom Pagination */
                    .testimonialSwiper .swiper-pagination-bullet {
                        width: 10px;
                        height: 10px;
                        background: rgba(230, 72, 92, 0.3);
                    }
                    
                    .testimonialSwiper .swiper-pagination-bullet-active {
                        background: var(--primary);
                        width: 24px;
                        border-radius: 5px;
                    }
                    
                    /* Testimonial Card */
                    .testimonial-card {
                        padding: 1rem;
                    }
                    
                    .testimonial-card-inner {
                        background: linear-gradient(to right, #e8f0ff 0%, #fff0f5 100%);
                        border-radius: 20px;
                        padding: 2rem;
                        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
                        transition: all 0.3s ease;
                        position: relative;
                        overflow: hidden;
                        margin: 1rem 0;
                    }
                    
                    .testimonial-card-inner:hover {
                        transform: translateY(-10px);
                        box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
                    }
                    
                    .testimonial-rating {
                        display: flex;
                        margin-bottom: 1.5rem;
                    }
                    
                    .testimonial-rating i {
                        color: var(--accent-light);
                        margin-right: 3px;
                        font-size: 1.1rem;
                    }
                    
                    .testimonial-rating i.empty {
                        color: #ddd;
                    }
                    
                    .quote-icon {
                        position: absolute;
                        top: 20px;
                        right: 20px;
                    }
                    
                    .quote-icon i {
                        font-size: 2rem;
                        color: rgba(230, 72, 92, 0.1);
                    }
                    
                    .testimonial-content {
                        font-size: 1.05rem;
                        color: #444;
                        line-height: 1.7;
                        margin-bottom: 1.5rem;
                        font-style: italic;
                    }
                    
                    .testimonial-author {
                        display: flex;
                        align-items: center;
                    }
                    
                    .author-image {
                        width: 50px;
                        height: 50px;
                        border-radius: 50%;
                        overflow: hidden;
                        margin-right: 15px;
                        border: 2px solid rgba(230, 72, 92, 0.1);
                    }
                    
                    .author-image img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                    }
                    
                    .author-info h5 {
                        font-size: 1.1rem;
                        font-weight: 600;
                        color: #333;
                        margin: 0 0 5px;
                    }
                    
                    .author-info p {
                        font-size: 0.9rem;
                        color: #6c757d;
                        margin: 0;
                    }
                    
                    /* CTA Section - Matching Download App Style with green button */
                    .testimonial-cta-wrapper {
                        padding: 2rem 5%;
                        background-color: transparent;
                        position: relative;
                        margin: 4rem 0;
                    }
                    
                    .testimonial-cta {
                        position: relative;
                        background: linear-gradient(to right, #e8f0ff 0%, #fff0f5 100%);
                        border-radius: 20px;
                        overflow: hidden;
                        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
                    }
                    
                    .testimonial-cta::before {
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
                    
                    .testimonial-cta::after {
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
                    
                    .testimonial-cta-content {
                        padding: 4rem 2rem 4rem 4rem;
                        position: relative;
                        z-index: 2;
                        text-align: left;
                    }
                    
                    .testimonial-cta-title {
                        font-size: 2.2rem;
                        font-weight: 700;
                        margin-bottom: 1.5rem;
                        color: #333;
                        line-height: 1.3;
                    }
                    
                    .testimonial-cta-description {
                        color: #6c757d;
                        font-size: 1.1rem;
                        margin-bottom: 2rem;
                        line-height: 1.6;
                        max-width: 90%;
                    }
                    
                    .testimonial-cta-buttons {
                        margin-top: 1.5rem;
                    }
                    
                    .testimonial-cta-link {
                        display: inline-flex;
                        align-items: center;
                        padding: 0.9rem 2.5rem;
                        border-radius: 30px;
                        background: #4AE290; /* Bright green from the image */
                        color: white;
                        font-weight: 600;
                        text-decoration: none;
                        transition: all 0.3s;
                        position: relative;
                        z-index: 2;
                        font-size: 1rem;
                        box-shadow: 0 5px 15px rgba(74, 226, 144, 0.25);
                    }
                    
                    .testimonial-cta-link:hover {
                        transform: translateY(-3px);
                        box-shadow: 0 8px 20px rgba(74, 226, 144, 0.35);
                        color: white;
                        background: #3dd584; /* Slightly darker on hover */
                    }
                    
                    .testimonial-cta-link span {
                        color: white;
                        transition: all 0.3s;
                    }
                    
                    .testimonial-cta-link i {
                        margin-left: 10px;
                        color: white;
                        transition: all 0.3s;
                    }
                    
                    .testimonial-cta-link:hover i {
                        transform: translateX(5px);
                    }
                    
                    .cta-note {
                        font-size: 0.85rem;
                        color: #6c757d;
                        margin: 0.8rem 0 0;
                    }
                    
                    .testimonial-cta-image-col {
                        position: relative;
                        overflow: hidden;
                        padding: 0;
                        display: flex;
                        justify-content: flex-end;
                        align-items: center;
                    }
                    
                    .testimonial-cta-image-container {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        position: relative;
                        height: 100%;
                        z-index: 2;
                        padding: 2rem;
                    }
                    
                    .testimonial-cta-image-container i {
                        font-size: 10rem;
                        color: #4AE290;
                        filter: drop-shadow(0 10px 15px rgba(74, 226, 144, 0.25));
                    }
                    
                    /* Responsive Styles */
                    @media (max-width: 1200px) {
                        .testimonial-cta-wrapper {
                            padding: 2rem 10%;
                        }
                        
                        .testimonial-cta-content {
                            padding: 3rem 1.5rem 3rem 3rem;
                        }
                        
                        .testimonial-cta-title {
                            font-size: 2rem;
                        }
                        
                        .testimonial-cta-image-container i {
                            font-size: 8rem;
                        }
                    }
                    
                    @media (max-width: 991.98px) {
                        .section-title {
                            font-size: 2rem;
                        }
                        
                        .testimonial-metrics {
                            gap: 1.5rem;
                        }
                        
                        .metric-value {
                            font-size: 2rem;
                        }
                        
                        .testimonialSwiper .swiper-slide {
                            width: 380px;
                        }
                        
                        .testimonial-content {
                            font-size: 0.95rem;
                        }
                        
                        .testimonial-cta-wrapper {
                            padding: 2rem 5%;
                        }
                        
                        .testimonial-cta-content {
                            padding: 3rem 1.5rem;
                        }
                        
                        .testimonial-cta-title {
                            font-size: 1.8rem;
                        }
                        
                        .testimonial-cta-description {
                            font-size: 1rem;
                            max-width: 100%;
                        }
                    }
                    
                    @media (max-width: 767.98px) {
                        .testimonials-section {
                            padding: 4rem 0;
                        }
                        
                        .section-title {
                            font-size: 1.8rem;
                        }
                        
                        .testimonial-metrics {
                            flex-wrap: wrap;
                            gap: 1rem;
                        }
                        
                        .metric {
                            width: calc(50% - 1rem);
                            min-width: auto;
                            padding: 1rem;
                        }
                        
                        .testimonialSwiper .swiper-slide {
                            width: 300px;
                        }
                        
                        .testimonial-card-inner {
                            padding: 1.5rem;
                        }
                        
                        .testimonial-cta-wrapper {
                            padding: 2rem;
                        }
                        
                        .testimonial-cta-content {
                            padding: 2rem 1.5rem;
                            text-align: center;
                            order: 2;
                        }
                        
                        .testimonial-cta-image-col {
                            order: 1;
                            justify-content: center;
                            margin-top: 1rem;
                            margin-bottom: 0;
                        }
                        
                        .testimonial-cta-buttons {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                        }
                        
                        .testimonial-cta-title {
                            font-size: 1.8rem;
                        }
                        
                        .testimonial-cta-description {
                            max-width: 100%;
                            margin-left: auto;
                            margin-right: auto;
                        }
                        
                        .testimonial-cta-image-container i {
                            font-size: 7rem;
                        }
                    }
                    
                    @media (max-width: 575.98px) {
                        .testimonial-cta-wrapper {
                            padding: 1.5rem;
                        }
                        
                        .testimonial-cta-title {
                            font-size: 1.6rem;
                        }
                        
                        .testimonial-cta-link {
                            width: 80%;
                            justify-content: center;
                        }
                    }
                `}</style>
            </section>
        </React.Fragment>
    );
};

export default Reviews;
