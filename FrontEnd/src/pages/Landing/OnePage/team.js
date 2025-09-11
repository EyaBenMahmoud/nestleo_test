import React from 'react';
import { Col, Container, Row } from 'reactstrap';
import { Link } from 'react-router-dom';

// Import Images
import avatar2 from "../../../assets/images/users/avatar-2.jpg";
import avatar3 from "../../../assets/images/users/avatar-3.jpg";
import avatar4 from "../../../assets/images/users/avatar-4.jpg";
import avatar5 from "../../../assets/images/users/avatar-5.jpg";
import avatar6 from "../../../assets/images/users/avatar-6.jpg";
import avatar7 from "../../../assets/images/users/avatar-7.jpg";
import avatar8 from "../../../assets/images/users/avatar-8.jpg";
import avatar10 from "../../../assets/images/users/avatar-10.jpg";

const Team = () => {
    // Team member data
    const teamMembers = [
        {
            id: 1,
            name: "Nancy Martino",
            role: "Chief Executive Officer",
            image: avatar2,
            bio: "Over 15 years of experience in real estate and property management. Nancy leads our strategic vision for innovative property solutions.",
            social: {
                linkedin: "#",
                twitter: "#",
                email: "/apps-mailbox"
            }
        },
        {
            id: 2,
            name: "Henry Baird",
            role: "CTO & Technical Lead",
            image: avatar10,
            bio: "With expertise in property tech solutions and system architecture, Henry oversees all technological aspects of our platform.",
            social: {
                linkedin: "#",
                twitter: "#",
                email: "/apps-mailbox"
            }
        },
        {
            id: 3,
            name: "Frank Hook",
            role: "Head of Property Management",
            image: avatar3,
            bio: "Frank brings 10+ years of property management experience, specializing in optimization of property portfolios and tenant relations.",
            social: {
                linkedin: "#",
                twitter: "#",
                email: "/apps-mailbox"
            }
        },
        {
            id: 4,
            name: "Donald Palmer",
            role: "UI/UX Design Lead",
            image: avatar8,
            bio: "Donald creates intuitive user experiences that make property management simple and accessible for landlords and tenants alike.",
            social: {
                linkedin: "#",
                twitter: "#",
                email: "/apps-mailbox"
            }
        },
        {
            id: 5,
            name: "Erica Kernan",
            role: "Marketing Director",
            image: avatar5,
            bio: "Erica leads our marketing initiatives with a focus on educating property owners about efficient management solutions.",
            social: {
                linkedin: "#",
                twitter: "#",
                email: "/apps-mailbox"
            }
        },
        {
            id: 6,
            name: "Alexis Clarke",
            role: "Backend Developer",
            image: avatar4,
            bio: "Alexis specializes in secure payment processing and property data management systems that power our platform.",
            social: {
                linkedin: "#",
                twitter: "#",
                email: "/apps-mailbox"
            }
        },
        {
            id: 7,
            name: "Marie Ward",
            role: "Customer Success Manager",
            image: avatar6,
            bio: "Marie ensures our clients maximize the value of our platform through training, support, and relationship management.",
            social: {
                linkedin: "#",
                twitter: "#",
                email: "/apps-mailbox"
            }
        },
        {
            id: 8,
            name: "Jack Gough",
            role: "Frontend Developer",
            image: avatar7,
            bio: "Jack builds responsive interfaces that make property management accessible across all devices for owners on the go.",
            social: {
                linkedin: "#",
                twitter: "#",
                email: "/apps-mailbox"
            }
        }
    ];

    return (
        <section className="team-section" id="team">
            <div className="team-bg-pattern"></div>
            
            <Container>
                <Row className="justify-content-center">
                    <Col lg={8} className="text-center">
                        <div className="team-header">
                            <span className="team-badge">OUR EXPERTS</span>
                            <h2 className="team-title">Meet The Team Behind Nestleo</h2>
                            <div className="team-line"></div>
                            <p className="team-subtitle">
                                Our diverse team of property management experts, developers, and customer success managers 
                                work together to provide you with the most comprehensive property management solution.
                            </p>
                        </div>
                    </Col>
                </Row>
                
                <Row className="team-grid">
                    {teamMembers.map((member, index) => (
                        <Col lg={3} md={6} key={member.id} className="team-member-col">
                            <div className="team-member-card">
                                <div className="member-image-wrapper">
                                    <img src={member.image} alt={member.name} className="member-image" />
                                    <div className="member-social">
                                        <Link to={member.social.linkedin} className="social-icon">
                                            <i className="ri-linkedin-fill"></i>
                                        </Link>
                                        <Link to={member.social.twitter} className="social-icon">
                                            <i className="ri-twitter-fill"></i>
                                        </Link>
                                        <Link to={member.social.email} className="social-icon">
                                            <i className="ri-mail-fill"></i>
                                        </Link>
                                    </div>
                                </div>
                                <div className="member-content">
                                    <h3 className="member-name">{member.name}</h3>
                                    <div className="member-role">{member.role}</div>
                                    <p className="member-bio">{member.bio}</p>
                                </div>
                            </div>
                        </Col>
                    ))}
                </Row>
            </Container>

            <style jsx>{`
                .team-section {
                    padding: 5rem 0;
                    position: relative;
                    background: #f8f9fa;
                    overflow: hidden;
                }
                
                .team-bg-pattern {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-image: 
                        radial-gradient(rgba(22, 6, 165, 0.03) 2px, transparent 2px),
                        radial-gradient(rgba(22, 6, 165, 0.03) 1.5px, transparent 1.5px);
                    background-size: 50px 50px, 30px 30px;
                    background-position: 0 0, 25px 25px;
                    opacity: 0.6;
                    pointer-events: none;
                }
                
                /* Header Styles */
                .team-header {
                    margin-bottom: 3rem;
                    position: relative;
                }
                
                .team-badge {
                    display: inline-block;
                    padding: 0.5rem 1rem;
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: rgb(22, 6, 165);
                    background-color: rgba(22, 6, 165, 0.1);
                    border-radius: 30px;
                    margin-bottom: 1rem;
                    letter-spacing: 0.5px;
                }
                
                .team-title {
                    font-size: 2.5rem;
                    font-weight: 700;
                    margin-bottom: 1rem;
                    color: #2a2a2a;
                }
                
                .team-line {
                    width: 60px;
                    height: 3px;
                    background: linear-gradient(45deg, rgb(22, 6, 165), rgb(224, 96, 10));
                    margin: 1rem auto;
                    border-radius: 3px;
                }
                
                .team-subtitle {
                    font-size: 1.1rem;
                    color: #6c757d;
                    max-width: 750px;
                    margin: 0 auto;
                    line-height: 1.6;
                }
                
                /* Team Grid */
                .team-grid {
                    margin-top: 3rem;
                }
                
                .team-member-col {
                    margin-bottom: 2rem;
                }
                
                /* Team Member Card */
                .team-member-card {
                    background: white;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
                    transition: all 0.4s;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }
                
                .team-member-card:hover {
                    transform: translateY(-10px);
                    box-shadow: 0 15px 40px rgba(22, 6, 165, 0.1);
                }
                
                .member-image-wrapper {
                    position: relative;
                    overflow: hidden;
                    padding-bottom: 100%; /* 1:1 Aspect Ratio */
                }
                
                .member-image {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 1s;
                }
                
                .team-member-card:hover .member-image {
                    transform: scale(1.05);
                }
                
                .member-social {
                    position: absolute;
                    bottom: -50px;
                    left: 0;
                    right: 0;
                    background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
                    padding: 2rem 1rem 1rem;
                    display: flex;
                    justify-content: center;
                    gap: 0.8rem;
                    transition: all 0.3s;
                    opacity: 0;
                }
                
                .team-member-card:hover .member-social {
                    bottom: 0;
                    opacity: 1;
                }
                
                .social-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: white;
                    color: rgb(22, 6, 165);
                    font-size: 1rem;
                    transition: all 0.3s;
                }
                
                .social-icon:hover {
                    transform: translateY(-3px);
                    background: rgb(22, 6, 165);
                    color: white;
                    box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
                }
                
                .member-content {
                    padding: 1.5rem;
                    flex-grow: 1;
                    display: flex;
                    flex-direction: column;
                }
                
                .member-name {
                    font-size: 1.2rem;
                    font-weight: 700;
                    color: #2a2a2a;
                    margin-bottom: 0.3rem;
                }
                
                .member-role {
                    font-size: 0.9rem;
                    color: rgb(22, 6, 165);
                    font-weight: 500;
                    margin-bottom: 1rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px dashed rgba(22, 6, 165, 0.1);
                }
                
                .member-bio {
                    font-size: 0.9rem;
                    color: #6c757d;
                    line-height: 1.6;
                    margin: 0;
                    flex-grow: 1;
                }
                
                /* Team CTA */
                .team-cta {
                    background: linear-gradient(135deg, rgba(22, 6, 165, 0.03), rgba(224, 96, 10, 0.03));
                    padding: 3rem 2rem;
                    border-radius: 12px;
                    border: 1px solid rgba(22, 6, 165, 0.05);
                }
                
                .team-cta h3 {
                    font-size: 1.8rem;
                    font-weight: 700;
                    color: #2a2a2a;
                    margin-bottom: 1rem;
                }
                
                .team-cta p {
                    font-size: 1.1rem;
                    color: #6c757d;
                    margin-bottom: 1.5rem;
                    max-width: 600px;
                    margin-left: auto;
                    margin-right: auto;
                }
                
                .btn-careers {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: linear-gradient(45deg, rgb(22, 6, 165), rgb(44, 26, 199));
                    color: white;
                    border-radius: 30px;
                    padding: 0.8rem 2rem;
                    font-weight: 600;
                    text-decoration: none;
                    transition: all 0.3s;
                    box-shadow: 0 5px 15px rgba(22, 6, 165, 0.2);
                }
                
                .btn-careers:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 20px rgba(22, 6, 165, 0.3);
                    color: white;
                }
                
                /* Responsive Styles */
                @media (max-width: const Team = () => {
                    return (
                        <section className="team-section" id="team">
                            <div className="team-bg-pattern"></div>
                            
                            <Container>
                                <Row className="justify-content-center">
                                    <Col lg={8} className="text-center">
                                        <div className="team-header">
                                            <span className="team-badge">OUR EXPERTS</span>
                                            <h2 className="team-title">Meet The Team Behind Nestleo</h2>
                                            <div className="team-line"></div>
                                            <p className="team-subtitle">
                                                Our diverse team of property management experts, developers, and customer success managers 
                                                work together to provide you with the most comprehensive property management solution.
                                            </p>
                                        </div>
                                    </Col>
                                </Row>
                                
                                <Row className="team-grid">
                                    {teamMembers.map((member, index) => (
                                        <Col lg={3} md={6} key={member.id} className="team-member-col">
                                            <div className="team-member-card">
                                                <div className="member-image-wrapper">
                                                    <img src={member.image} alt={member.name} className="member-image" />
                                                    <div className="member-social">
                                                        <Link to={member.social.linkedin} className="social-icon">
                                                            <i className="ri-linkedin-fill"></i>
                                                        </Link>
                                                        <Link to={member.social.twitter} className="social-icon">
                                                            <i className="ri-twitter-fill"></i>
                                                        </Link>
                                                        <Link to={member.social.email} className="social-icon">
                                                            <i className="ri-mail-fill"></i>
                                                        </Link>
                                                    </div>
                                                </div>
                                                <div className="member-content">
                                                    <h3 className="member-name">{member.name}</h3>
                                                    <div className="member-role">{member.role}</div>
                                                    <p className="member-bio">{member.bio}</p>
                                                </div>
                                            </div>
                                        </Col>
                                    ))}
                                </Row>
                                
                                <Row className="justify-content-center mt-5">
                                    <Col lg={8} className="text-center">
                                        <div className="team-cta">
                                            <h3>Join Our Growing Team</h3>
                                            <p>
                                                We're always looking for talented individuals who are passionate about revolutionizing 
                                                the property management industry. Check our careers page for current openings.
                                            </p>
                                            <Link to="/careers" className="btn-careers">
                                                <i className="ri-user-add-line"></i> View Open Positions
                                            </Link>
                                        </div>
                                    </Col>
                                </Row>
                            </Container>
                        </section>
                    );
                };
                
                @media (max-width: 991.98px) {
                    .team-title {
                        font-size: 2rem;
                    }
                    
                    .team-subtitle {
                        font-size: 1rem;
                    }
                    
                    .team-grid {
                        margin-top: 2rem;
                    }
                }
                
                @media (max-width: 767.98px) {
                    .team-section {
                        padding: 4rem 0;
                    }
                    
                    .team-title {
                        font-size: 1.8rem;
                    }
                    
                    .team-member-col {
                        margin-bottom: 1.5rem;
                    }
                    
                    .team-cta {
                        padding: 2rem 1.5rem;
                    }
                    
                    .team-cta h3 {
                        font-size: 1.5rem;
                    }
                    
                    .team-cta p {
                        font-size: 1rem;
                    }
                }
            `}</style>
        </section>
    );
};

export default Team;