import React, { useState, useEffect } from 'react';
import { Col, Container, Form, Row } from 'reactstrap';
import { useTranslation } from 'react-i18next'; // Import translation hook

const Contact = () => {
    // Initialize translation hook
    const { t } = useTranslation();
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [responseMessage, setResponseMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [crmSettings, setCrmSettings] = useState({});

    // Fetch CRM settings like in the footer component
    useEffect(() => {
        fetch(`${process.env.REACT_APP_API_URL}/api/crm/settings`)
            .then(response => response.json())
            .then(data => setCrmSettings(data))
            .catch(error => console.error('Error fetching CRM settings:', error));
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/contact/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            if (response.ok) {
                setResponseMessage(t('contact.messages.success'));
                setFormData({ name: '', email: '', subject: '', message: '' });
            } else {
                setResponseMessage(result.error || t('contact.messages.error'));
            }
        } catch (error) {
            setResponseMessage(t('contact.messages.error'));
        }
        
        setIsSubmitting(false);
        setTimeout(() => setResponseMessage(''), 5000); // Clear message after 5 seconds
    };

    return (
        <div className="contact-wrapper" id="contact">
            <section className="contact-section">
                <Container fluid>
                    <Row className="align-items-center">
                        <Col lg={5} md={5} className="contact-info-column">
                            <div className="contact-header">
                                <h2 className="contact-title">{t('contact.title')}</h2>
                                <div className="section-divider"></div>
                                <p className="contact-subtitle">
                                    {t('contact.subtitle')}
                                </p>
                            </div>

                            <div className="contact-info-list">
                                
                                <div className="contact-info-item">
                                    <div className="icon-box">
                                        <i className="ri-mail-open-fill"></i>
                                    </div>
                                    <div className="info-content">
                                        <h5>{t('contact.emailUs')}</h5>
                                        <p><a href={`mailto:${crmSettings.email || "info@nestly.com"}`}>{crmSettings.email || "info@nestly.com"}</a></p>
                                    </div>
                                </div>
                                
                                <div className="contact-info-item">
                                    <div className="icon-box">
                                        <i className="ri-phone-fill"></i>
                                    </div>
                                    <div className="info-content">
                                        <h5>{t('contact.callUs')}</h5>
                                        <p><a href={`tel:${crmSettings.phoneNumber || "+123456789"}`}>{crmSettings.phoneNumber || "+1 (234) 567-890"}</a></p>
                                    </div>
                                </div>
                            </div>
                        </Col>

                        <Col lg={7} md={7} className="form-column">
                            <Form className="contact-form" onSubmit={handleSubmit}>
                                <Row>
                                    <Col lg={6}>
                                        <div className="form-group">
                                            <label htmlFor="name" className="form-label">{t('contact.form.name')}</label>
                                            <div className="input-group">
                                                <span className="input-group-text"><i className="ri-user-3-line"></i></span>
                                                <input 
                                                    type="text" 
                                                    name="name" 
                                                    id="name" 
                                                    className="form-control" 
                                                    placeholder={t('contact.form.namePlaceholder')} 
                                                    value={formData.name} 
                                                    onChange={handleChange} 
                                                    required 
                                                />
                                            </div>
                                        </div>
                                    </Col>
                                    <Col lg={6}>
                                        <div className="form-group">
                                            <label htmlFor="email" className="form-label">{t('contact.form.email')}</label>
                                            <div className="input-group">
                                                <span className="input-group-text"><i className="ri-mail-line"></i></span>
                                                <input 
                                                    type="email" 
                                                    name="email" 
                                                    id="email" 
                                                    className="form-control" 
                                                    placeholder={t('contact.form.emailPlaceholder')} 
                                                    value={formData.email} 
                                                    onChange={handleChange} 
                                                    required 
                                                />
                                            </div>
                                        </div>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col lg={12}>
                                        <div className="form-group">
                                            <label htmlFor="subject" className="form-label">{t('contact.form.subject')}</label>
                                            <div className="input-group">
                                                <span className="input-group-text"><i className="ri-chat-3-line"></i></span>
                                                <input 
                                                    type="text" 
                                                    name="subject" 
                                                    id="subject" 
                                                    className="form-control" 
                                                    placeholder={t('contact.form.subjectPlaceholder')} 
                                                    value={formData.subject} 
                                                    onChange={handleChange} 
                                                    required 
                                                />
                                            </div>
                                        </div>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col lg={12}>
                                        <div className="form-group">
                                            <label htmlFor="message" className="form-label">{t('contact.form.message')}</label>
                                            <div className="input-group">
                                                <span className="input-group-text text-area-icon"><i className="ri-message-2-line"></i></span>
                                                <textarea 
                                                    name="message" 
                                                    id="message" 
                                                    rows="5" 
                                                    className="form-control" 
                                                    placeholder={t('contact.form.messagePlaceholder')} 
                                                    value={formData.message} 
                                                    onChange={handleChange} 
                                                    required
                                                ></textarea>
                                            </div>
                                        </div>
                                    </Col>
                                </Row>
                                <Row className="mt-4">
                                    <Col lg={12} className="text-end">
                                        <button type="submit" className="submit-btn" disabled={isSubmitting}>
                                            {isSubmitting ? (
                                                <>
                                                    <span className="spinner"></span>
                                                    {t('contact.form.sending')}
                                                </>
                                            ) : (
                                                <>
                                                    <i className="ri-send-plane-fill"></i>
                                                    {t('contact.form.send')}
                                                </>
                                            )}
                                        </button>
                                    </Col>
                                </Row>
                                {responseMessage && (
                                    <Row className="mt-3">
                                        <Col lg={12}>
                                            <div className="response-message">
                                                <i className={responseMessage.includes(t('contact.messages.success').substring(0, 10)) ? 'ri-checkbox-circle-line success-icon' : 'ri-error-warning-line error-icon'}></i>
                                                <span>{responseMessage}</span>
                                            </div>
                                        </Col>
                                    </Row>
                                )}
                            </Form>
                        </Col>
                    </Row>
                </Container>
            </section>

            <style jsx>{`
                .contact-wrapper {
                    padding: 2rem 5%;
                    background-color: transparent;
                    position: relative;
                    margin: 4rem 0;
                }
                
                .contact-section {
                    position: relative;
                    background: linear-gradient(to right, #e8f0ff 0%, #fff0f5 100%);
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
                }
                
                /* Contact Info Column */
                .contact-info-column {
                    padding: 4rem 2rem 4rem 4rem;
                    position: relative;
                    z-index: 2;
                    text-align: left;
                }
                
                .contact-header {
                    margin-bottom: 2.5rem;
                }
                
                .contact-title {
                    font-size: 2.2rem;
                    font-weight: 700;
                    margin-bottom: 1rem;
                    color: #333;
                    line-height: 1.3;
                }
                
                .section-divider {
                    width: 60px;
                    height: 3px;
                    background: linear-gradient(45deg, #e6485c, #ff8a9c);
                    margin-bottom: 1.2rem;
                    border-radius: 3px;
                }
                
                .contact-subtitle {
                    font-size: 1rem;
                    color: #6c757d;
                    line-height: 1.6;
                    margin-bottom: 2rem;
                }
                
                /* Info List */
                .contact-info-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                
                .contact-info-item {
                    display: flex;
                    align-items: flex-start;
                }
                
                .icon-box {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    background: rgba(230, 72, 92, 0.08);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 1rem;
                    flex-shrink: 0;
                }
                
                .icon-box i {
                    font-size: 1.3rem;
                    background: linear-gradient(45deg, #e6485c, #ff8a9c);
                    -webkit-background-clip: text;
                    background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                
                .info-content h5 {
                    font-size: 1.05rem;
                    font-weight: 600;
                    margin-bottom: 0.3rem;
                    color: #333;
                }
                
                .info-content p {
                    font-size: 0.9rem;
                    color: #6c757d;
                    margin-bottom: 0;
                }
                
                .info-content a {
                    color: #e6485c;
                    text-decoration: none;
                    transition: color 0.3s;
                }
                
                .info-content a:hover {
                    color: #d13a4e;
                }
                
                /* Form Column */
                .form-column {
                    padding: 4rem 4rem 4rem 2rem;
                    background-color: rgba(255, 255, 255, 0.1);
                    border-left: 1px solid rgba(255, 255, 255, 0.2);
                }
                
                /* Form Styling */
                .contact-form {
                    padding: 0;
                }
                
                .form-group {
                    margin-bottom: 1.5rem;
                }
                
                .form-label {
                    display: block;
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #444;
                    margin-bottom: 0.5rem;
                }
                
                .input-group {
                    position: relative;
                    display: flex;
                }
                
                .input-group-text {
                    background-color: rgba(230, 72, 92, 0.05);
                    border: 1px solid rgba(230, 72, 92, 0.1);
                    border-right: none;
                    color: #e6485c;
                    padding: 0.5rem 0.75rem;
                    border-top-left-radius: 8px;
                    border-bottom-left-radius: 8px;
                    border-top-right-radius: 0;
                    border-bottom-right-radius: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 45px;
                }
                
                .text-area-icon {
                    height: 100%;
                    align-items: flex-start;
                    padding-top: 0.8rem;
                }
                
                .input-group-text i {
                    font-size: 1.1rem;
                }
                
                .form-control {
                    flex: 1;
                    border: 1px solid rgba(230, 72, 92, 0.1);
                    border-left: none;
                    border-top-right-radius: 8px !important;
                    border-bottom-right-radius: 8px !important;
                    border-top-left-radius: 0 !important;
                    border-bottom-left-radius: 0 !important;
                    padding: 0.65rem 1rem;
                    color: #444;
                    background-color: #fff;
                    font-size: 0.95rem;
                    transition: all 0.3s;
                }
                
                .form-control:focus {
                    outline: none;
                    box-shadow: 0 0 0 3px rgba(230, 72, 92, 0.1);
                    border-color: #e6485c;
                    border-left: none;
                }
                
                .form-control:focus + .input-group-text {
                    border-color: #e6485c;
                }
                
                /* Submit Button */
                .submit-btn {
                    background: linear-gradient(45deg, #e6485c, #ff8a9c);
                    color: white;
                    border: none;
                    border-radius: 30px;
                    padding: 0.8rem 2rem;
                    font-weight: 600;
                    font-size: 1rem;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.3s;
                    box-shadow: 0 5px 15px rgba(230, 72, 92, 0.15);
                }
                
                .submit-btn:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 20px rgba(230, 72, 92, 0.25);
                    color: white !important;
                }
                
                .submit-btn i {
                    margin-right: 8px;
                    font-size: 1.1rem;
                }
                
                .submit-btn:disabled {
                    background: #aaa;
                    transform: none;
                    box-shadow: none;
                    cursor: not-allowed;
                }
                
                /* Spinner */
                .spinner {
                    display: inline-block;
                    width: 18px;
                    height: 18px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    border-top-color: #fff;
                    animation: spin 1s ease-in-out infinite;
                    margin-right: 8px;
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                /* Response Message */
                .response-message {
                    display: flex;
                    align-items: center;
                    padding: 1rem;
                    border-radius: 8px;
                    background-color: rgba(230, 72, 92, 0.05);
                    animation: fadeIn 0.3s ease;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .response-message i {
                    font-size: 1.5rem;
                    margin-right: 10px;
                }
                
                .success-icon {
                    color: #00c853;
                }
                
                .error-icon {
                    color: #f44336;
                }
                
                .response-message span {
                    font-size: 0.95rem;
                    font-weight: 500;
                }
                
                /* Responsive Styles */
                @media (max-width: 1200px) {
                    .contact-wrapper {
                        padding: 2rem 10%;
                    }
                    
                    .contact-info-column {
                        padding: 3rem 1.5rem 3rem 3rem;
                    }
                    
                    .form-column {
                        padding: 3rem 3rem 3rem 1.5rem;
                    }
                    
                    .contact-title {
                        font-size: 2rem;
                    }
                }
                
                @media (max-width: 991.98px) {
                    .contact-wrapper {
                        padding: 2rem 5%;
                    }
                    
                    .contact-info-column,
                    .form-column {
                        padding: 2.5rem;
                    }
                    
                    .contact-title {
                        font-size: 1.8rem;
                    }
                }
                
                @media (max-width: 767.98px) {
                    .contact-wrapper {
                        padding: 2rem;
                    }
                    
                    .contact-info-column {
                        padding: 2.5rem 2.5rem 1.5rem;
                    }
                    
                    .form-column {
                        padding: 0 2.5rem 2.5rem;
                        border-left: none;
                        border-top: 1px solid rgba(255, 255, 255, 0.2);
                    }
                    
                    .contact-title {
                        font-size: 1.7rem;
                    }
                    
                    .submit-btn {
                        width: 100%;
                    }
                }
                
                @media (max-width: 575.98px) {
                    .contact-wrapper {
                        padding: 1.5rem;
                    }
                    
                    .contact-info-column,
                    .form-column {
                        padding: 2rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default Contact;