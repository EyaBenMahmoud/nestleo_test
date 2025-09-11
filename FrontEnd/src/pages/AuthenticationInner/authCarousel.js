import React from "react";
import { Carousel } from "react-responsive-carousel";
import "react-responsive-carousel/lib/styles/carousel.min.css";
import { Link } from "react-router-dom";

const AuthSlider = () => {
    return (
        <React.Fragment>
            <div className="nestly-auth-slider-container">
                <div className="nestly-bg-overlay"></div>
                <div className="nestly-slider-content">
                    <div className="nestly-logo">
                        <Link className="nestly-logo-text" to="/">
                            Nestleo
                        </Link>
                    </div>
                    
                    <div className="nestly-quotes">
                        <i className="ri-double-quotes-l nestly-quote-icon"></i>

                        <Carousel 
                            showThumbs={false} 
                            showArrows={false} 
                            showStatus={false} 
                            infiniteLoop={true} 
                            autoPlay={true}
                            interval={5000}
                            className="nestly-carousel" 
                        >
                            <div className="nestly-carousel-item">
                                <p>" Stay connected with your Community, wherever you are. "</p>
                            </div>
                            
                            <div className="nestly-carousel-item">
                                <p>" The Nestleo platform is really great, with amazing building management."</p>
                            </div>
                            
                            <div className="nestly-carousel-item">
                                <p>" Great! Clean design and easy to use. Thank you very much! "</p>
                            </div>
                        </Carousel>
                    </div>
                </div>
                
                {/* Wave shape divider removed for a more professional look */}
            </div>
        </React.Fragment>
    );
};

export default AuthSlider;