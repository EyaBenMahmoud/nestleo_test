import React, { useState, useEffect } from "react";
import { Collapse, Container, NavbarToggler, NavLink } from "reactstrap";
import Scrollspy from "react-scrollspy";
import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next'; // Import translation hook

// Import Components
import ProfileDropdown from "../../../Components/Common/ProfileDropdown";
import LanguageDropdown from "../../../Components/Common/LanguageDropdown";

const Navbar = ({ isUserLoggedIn }) => {
    // Initialize translation hook
    const { t } = useTranslation();
    
    const [isOpenMenu, setisOpenMenu] = useState(false);
    const [navClass, setnavClass] = useState("");
    const [showPromoMessage, setShowPromoMessage] = useState(true);
    const [crmSettings, setCrmSettings] = useState({});

    const toggle = () => setisOpenMenu(!isOpenMenu);
    
    // Add this new function to handle nav item clicks
    const handleNavItemClick = () => {
        if (window.innerWidth < 992) {  // 992px is Bootstrap's lg breakpoint
            setisOpenMenu(false);
        }
    };

    useEffect(() => {
        window.addEventListener("scroll", scrollNavigation, true);
        
        // Fetch CRM settings
        fetch(`${process.env.REACT_APP_API_URL}/api/crm/settings`)
            .then(response => response.json())
            .then(data => setCrmSettings(data))
            .catch(error => console.error('Error fetching CRM settings:', error));
        
        return () => {
            window.removeEventListener("scroll", scrollNavigation, true);
        };
    }, []);

    const scrollNavigation = () => {
        var scrollup = document.documentElement.scrollTop;
        if (scrollup > 50) {
            setnavClass("is-sticky");
        } else {
            setnavClass("");
        }
    }

    const closePromoMessage = () => {
        setShowPromoMessage(false);
    }

    return (
        <React.Fragment>
            {showPromoMessage && (
                <div className="promo-message-bar">
                    <Container className="d-flex justify-content-between align-items-center">
                        <div className="promo-text">
                            {t('navbar.promo.text')} 
                            <Link to="/connect" className="promo-highlight">{t('navbar.promo.link')}</Link>
                        </div>
                        <button className="promo-close-btn" onClick={closePromoMessage}>
                            <span aria-hidden="true">×</span>
                        </button>
                    </Container>
                </div>
            )}
            
            {/* WhatsApp Support Bar - Fixed above navbar */}
            <div className={`whatsapp-fixed ${navClass}`}>
                <Container className="d-flex justify-content-center align-items-center">
                    <div className="whatsapp-text">
                        <i className="ri-whatsapp-line me-1"></i> {t('navbar.whatsapp.text')}: 
                        <a href={`https://wa.me/${crmSettings.phoneNumber?.replace(/\D/g, '')}`} className="whatsapp-number">
                            {crmSettings.phoneNumber || " +1 (661) 384-8482"}
                        </a>
                    </div>
                </Container>
            </div>

            <nav className={"navbar navbar-expand-lg navbar-landing fixed-top " + navClass} id="navbar">
                <Container>
                    {isUserLoggedIn ? <Link className="navbar-brand" to="/index">
                        <div className="logo-text">Nestleo</div>
                    </Link> : <Link className="navbar-brand" to="/">
                        <div className="logo-text">Nestleo</div>
                    </Link>}

                    <NavbarToggler className="navbar-toggler py-0 fs-20 text-body" onClick={toggle} type="button" data-bs-toggle="collapse"
                        data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent"
                        aria-expanded="false" aria-label="Toggle navigation">
                        <i className="mdi mdi-menu"></i>
                    </NavbarToggler>

                    <Collapse
                        isOpen={isOpenMenu}
                        className="navbar-collapse"
                        id="navbarSupportedContent"
                    >
                        <Scrollspy
                            offset={-18}
                            items={[
                                "hero",
                                "howitworks",
                                "services",
                                "plans",
                                "reviews",
                                "contact",
                            ]}
                            currentClassName="active"
                            className="navbar-nav mx-auto mt-2 mt-lg-0"
                            id="navbar-example"
                        >
                            <li className="nav-item">
                                <NavLink href="/landing#hero" className="nav-link-custom" onClick={handleNavItemClick}>{t('navbar.links.home')}</NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink href="/landing#howitworks" className="nav-link-custom" onClick={handleNavItemClick}>{t('navbar.links.howItWorks')}</NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink href="/landing#services" className="nav-link-custom" onClick={handleNavItemClick}>{t('navbar.links.services')}</NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink href="/landing#plans" className="nav-link-custom" onClick={handleNavItemClick}>{t('navbar.links.plans')}</NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink href="/landing#reviews" className="nav-link-custom" onClick={handleNavItemClick}>{t('navbar.links.reviews')}</NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink href="/landing#contact" className="nav-link-custom" onClick={handleNavItemClick}>{t('navbar.links.contact')}</NavLink>
                            </li>
                        </Scrollspy>
                        {isUserLoggedIn ? (
                            <>
                                <LanguageDropdown />
                                <ProfileDropdown />
                            </>
                        ) : (
                            <div className="nestly-auth-buttons">
                                <LanguageDropdown />
                                <Link to="/connect" className="btn btn-link fw-medium text-decoration-none nestly-signin-btn">
                                    {t('navbar.buttons.signin')}
                                </Link>
                                <Link to="/RoleSelection" className="btn nestly-signup-btn">
                                    {t('navbar.buttons.signup')}
                                </Link>
                                <NavLink href="#contact" className="btn nestly-signup-btn" onClick={handleNavItemClick}>
                                    {t('navbar.buttons.demo')}
                                </NavLink>
                            </div>
                        )}
                    </Collapse>
                </Container>
            </nav>
            
            <style jsx>{`
               /* Promo Message Bar */
.promo-message-bar {
    background: linear-gradient(90deg, #cbe9f3, #e0f7fa, #c1e8f0);
    padding: 8px 0;
    font-size: 14px;
    color: #333;
    position: relative;
    z-index: 1031;
}

.promo-text {
    font-weight: 400;
    text-align: center;
    width: 100%;
}

.promo-highlight {
    color: #e6485c;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.promo-highlight:hover {
    color: #d13a4e;
    text-decoration: underline;
}

.promo-close-btn {
    background: transparent;
    border: none;
    color: #666;
    font-size: 20px;
    cursor: pointer;
    padding: 0 5px;
}

/* WhatsApp Fixed Support */
.whatsapp-fixed {
    position: fixed;
    top: ${showPromoMessage ? '41px' : '0'};
    left: 0;
    right: 0;
    background-color: #e8f4f8;
    padding: 8px 0; /* Reduced padding for better spacing */
    font-size: 14px;
    color: #333;
    z-index: 1030;
    box-shadow: none;
    transition: top 0.3s ease;
    border-bottom: none;
    height: 40px; /* Fixed height to ensure consistent spacing */
    display: flex;
    align-items: center;
}

.whatsapp-fixed.is-sticky {
    top: 0;
}

.whatsapp-text {
    font-weight: 500;
    text-align: center;
}

.whatsapp-number {
    color: #e6485c;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.3s ease;
    margin-left: 5px;
    padding: 3px 10px;
    border-radius: 15px;
    background-color: rgba(230, 72, 92, 0.1);
}

.whatsapp-number:hover {
    color: #fff !important;
    background-color: #e6485c;
    text-decoration: none;
    box-shadow: 0 2px 8px rgba(230, 72, 92, 0.3);
}

/* Remove the gap by adjusting margins and box shadow */
.navbar-landing {
    background-color: #fff;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
    margin-top: ${showPromoMessage ? '81px' : '40px'};
    transition: margin-top 0.3s ease, background-color 0.3s ease;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1029;
    padding-top: 0; /* Reduced padding */
    padding-bottom: 0; /* Reduced padding */
    border-top: none; /* Remove any borders that might cause gaps */
}

.navbar-landing.is-sticky {
    background-color: #fff;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
    margin-top: 40px; /* Height of WhatsApp bar */
    top: 0;
}

/* Main page content padding to account for fixed elements */
#page-content {
    padding-top: ${showPromoMessage ? '123px' : '82px'};
}
                
/* Override any default Bootstrap or component library styles */
.nav-link-custom, .nav-link-custom:focus, .nav-link-custom:visited {
    color: #333 !important;
    font-weight: 500;
    transition: color 0.3s ease, transform 0.2s ease;
    position: relative;
    padding: 8px 16px;
}
                
/* GLOBAL HOVER OVERRIDES - Force all hover states to be red */
.nav-link-custom:hover,
.nav-link:hover,
li .nav-link-custom:hover,
li .nav-link:hover,
.navbar-nav li .nav-link-custom:hover,
.navbar-nav li .nav-link:hover,
#navbar-example li .nav-link-custom:hover,
#navbar-example li .nav-link:hover,
nav li .nav-link-custom:hover,
nav li .nav-link:hover {
    color: #e6485c !important;
}
                
/* Only apply hover effects to non-active links */
li:not(.active) .nav-link-custom:hover {
    color: #e6485c !important;
    transform: translateY(-2px);
}
                
/* EXTREME OVERRIDES FOR ACTIVE LINK - FORCE RED COLOR */
.active .nav-link-custom, 
.active > .nav-link-custom,
#navbar .active .nav-link-custom,
#navbar-example .active .nav-link-custom,
.navbar-nav .active .nav-link-custom,
.navbar-nav > .active > .nav-link-custom,
.navbar .active .nav-link-custom,
nav .active .nav-link-custom,
li.active .nav-link-custom,
li.active > .nav-link-custom,
.nav-item.active .nav-link-custom,
.nav-item.active > .nav-link-custom,
.active .nav-link-custom:hover, 
.active .nav-link-custom:focus, 
.active .nav-link-custom:active,
.active > .nav-link-custom:hover,
.active > .nav-link-custom:focus,
.active > .nav-link-custom:active,
#navbar-example li.active .nav-link-custom {
    color: #e6485c !important;
    border-bottom: 3px solid #e6485c !important;
}
                
/* Extra override for any active styling */
#navbar-example .active * {
    color: #e6485c !important;
}
                
/* Remove any default styling from React-scrollspy */
.navbar-nav .active {
    background-color: transparent !important;
}
                
/* Complete reset of any styles that might cause green */
.active, .active *, .active *::before, .active *::after,
#navbar-example .active, #navbar-example .active *,
.navbar-nav .active, .navbar-nav .active *,
nav .active, nav .active * {
    color: #e6485c !important;
}
                
/* Override reactstrap's NavLink hover styles */
.nav-link:hover {
    color: #e6485c !important;
}
                
/* Target all possible ancestors */
body .nav-link:hover,
body .nav-link-custom:hover,
html .nav-link:hover,
html .nav-link-custom:hover,
#root .nav-link:hover,
#root .nav-link-custom:hover {
    color: #e6485c !important;
}
                
/* Ensure hover pseudo-class gets highest specificity */
.navbar-nav li a.nav-link-custom:hover,
.navbar-nav li a.nav-link:hover,
nav li a.nav-link-custom:hover,
nav li a.nav-link:hover,
#navbar-example li a.nav-link-custom:hover,
#navbar-example li a.nav-link:hover {
    color: #e6485c !important;
}
                
.nestly-signin-btn {
    color: #e6485c !important;
    transition: transform 0.2s ease;
}
                
.nestly-signin-btn:hover {
    transform: translateY(-2px);
}
                
.nestly-signup-btn {
    background-color: #e6485c !important;
    border-color: #e6485c !important;
    color: #fff !important;
    padding: 0.5rem 1.5rem;
    border-radius: 5px;
    transition: all 0.3s ease;
    animation: pulse-animation 2s infinite;
}
                
@keyframes pulse-animation {
    0% {
        box-shadow: 0 0 0 0px rgba(230, 72, 92, 0.2);
    }
    100% {
        box-shadow: 0 0 0 10px rgba(230, 72, 92, 0);
    }
}
                
.nestly-signup-btn:hover {
    background-color: #d13a4e !important;
    border-color: #d13a4e !important;
    transform: translateY(-3px) scale(1.03);
    box-shadow: 0 6px 12px rgba(230, 72, 92, 0.25);
}
                
.nestly-auth-buttons {
    display: flex;
    align-items: center;
    gap: 0.8rem;
}

/* Navbar animation */
.navbar-collapse {
    transition: all 0.4s ease;
}
                
.navbar-collapse.show .nav-item {
    animation: slide-in 0.3s forwards;
    opacity: 0;
    transform: translateY(20px);
}
                
@keyframes slide-in {
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
                
.navbar-collapse.show .nav-item:nth-child(1) { animation-delay: 0.1s; }
.navbar-collapse.show .nav-item:nth-child(2) { animation-delay: 0.15s; }
.navbar-collapse.show .nav-item:nth-child(3) { animation-delay: 0.2s; }
.navbar-collapse.show .nav-item:nth-child(4) { animation-delay: 0.25s; }
.navbar-collapse.show .nav-item:nth-child(5) { animation-delay: 0.3s; }
.navbar-collapse.show .nav-item:nth-child(6) { animation-delay: 0.35s; }
.navbar-collapse.show .nav-item:nth-child(7) { animation-delay: 0.4s; }

/* Navigation hover effect - only for non-active items */
li:not(.active) .nav-link-custom::before {
    content: "";
    position: absolute;
    width: 0;
    height: 2px;
    bottom: -2px;
    left: 50%;
    background-color: #e6485c;
    visibility: hidden;
    transition: all 0.3s ease-in-out;
    transform: translateX(-50%);
}
                
li:not(.active) .nav-link-custom:hover::before {
    visibility: visible;
    width: 70%;
}

/* Responsive adjustments */
@media (max-width: 991.98px) {
    .navbar-landing {
        margin-top: ${showPromoMessage ? '81px' : '40px'};
    }
    
    .navbar-landing.is-sticky {
        margin-top: 40px; /* Ensure consistent spacing */
    }
                    
    .nestly-auth-buttons {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid rgba(0,0,0,0.1);
        flex-direction: row;
        align-items: center;
        gap: 0.8rem;
    }
                    
    /* Remove the red border for active links in responsive mode */
    .active .nav-link-custom {
        border-left: none !important;
        border-bottom: none !important;
        padding-left: 16px;
        color: #e6485c !important;
    }
    
    /* Remove all hover effects and borders in responsive mode */
    li .nav-link-custom::before {
        display: none !important;
    }
    
    li .nav-link-custom:hover::before {
        display: none !important;
        visibility: hidden !important;
        width: 0 !important;
    }
    
    li:not(.active) .nav-link-custom::before {
        display: none !important;
    }
    
    li:not(.active) .nav-link-custom:hover::before {
        display: none !important;
        visibility: hidden !important;
        width: 0 !important;
    }
    
    /* Remove transform effects on hover in responsive mode */
    li:not(.active) .nav-link-custom:hover {
        transform: none !important;
    }
                    
    .promo-text {
        font-size: 12px;
        padding-right: 25px;
    }
                    
    .whatsapp-text {
        font-size: 12px;
    }
}
                
@media (max-width: 767.98px) {
    .navbar-landing {
        margin-top: ${showPromoMessage ? '81px' : '40px'};
    }
    
    .navbar-landing.is-sticky {
        margin-top: 40px; /* Ensure consistent spacing */
    }
                    
    .promo-message-bar {
        padding: 6px 0;
    }
                    
    .promo-text {
        font-size: 11px;
    }
                    
    /* Fixed WhatsApp Responsive */
    .whatsapp-fixed {
        padding: 5px 0;
    }
                    
    .whatsapp-number {
        padding: 2px 8px;
        font-size: 12px;
    }
}

/* Force override for reactstrap's NavLink component */
.nav-link.active, .nav-link.active:hover, .nav-link.active:focus,
a.nav-link.active, a.nav-link.active:hover, a.nav-link.active:focus {
    color: #e6485c !important;
}

/* Target any inline styles that might be applied */
[style*="color"] {
    color: #e6485c !important;
}
                
/* Extra hover overrides - these target all hover states globally */
a:hover, button:hover, .nav-link:hover, .nav-link-custom:hover {
    color: #e6485c !important;
}
                
/* Force all :hover CSS rules to use red */
html [class*="-item"]:hover,
html [class*="nav"]:hover,
html [class*="link"]:hover,
html [class*="menu"]:hover,
html a:hover {
    color: #e6485c !important;
}
                
/* Override any hover styles with !important (highest specificity) */
.nav-item .nav-link-custom:hover,
.nav-item .nav-link:hover,
li .nav-link-custom:hover,
li .nav-link:hover,
#navbar-example li .nav-link-custom:hover {
    color: #e6485c !important;
}

/* Logo Text Styling */
.logo-text {
    font-family: 'Arial', sans-serif;
    font-size: 32px;
    font-weight: 600;
    color: #e6485c;
    letter-spacing: -0.5px;
    line-height: 1;
}
                
/* Make sure dark/light mode transitions work if needed */
.navbar-landing.is-sticky .logo-text {
    color: #e6485c;
}
                
/* Responsive adjustments for logo */
@media (max-width: 767.98px) {
    .logo-text {
        font-size: 28px;
    }
}
            `}</style>
        </React.Fragment>
    );
};

export default Navbar;