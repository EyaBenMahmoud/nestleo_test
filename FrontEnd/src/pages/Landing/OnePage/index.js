import React, { useEffect } from 'react';

import Navbar from './navbar';
import Home from './home';
import Client from './client';
import Services from './services';
import Features from './features';
import Plans from './plans';
import Faqs from './faq';
import Reviews from './reviews';
import Counter from './counter';
import WorkProcess from './workProcess';
import Team from './team';
import Contact from './contact';
import Cta from './cta';
import Footer from './footer';
import { useLocation, useNavigate } from 'react-router-dom';
import { getUser } from "../../../services/api"
import { loginUser, setFakePassword, setUser } from '../../../slices/login/loginSlice';
import { useDispatch, useSelector } from 'react-redux';
import HowItWorks from './howItWorks';
import DownloadApp from './downloadApp';
const Index = () => {
    document.title = " Landing | Nestleo";
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const isUserLoggedIn = useSelector(state => state.Loginn.isUserLoggedIn);




    window.onscroll = function () {
        scrollFunction();
    };

    const scrollFunction = () => {
        const element = document.getElementById("back-to-top");
        if (element) {
            if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
                element.style.display = "block";
            } else {
                element.style.display = "none";
            }
        }
    };

    const toTop = () => {
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
    };

    // Scroll to 'plans' section if navigated
    useEffect(() => {
        if (location.state?.scrollTo === 'plans') {
            const plansSection = document.getElementById("plans");
            if (plansSection) {
                plansSection.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [location]);


    return (
        <React.Fragment>
            <div className="layout-wrapper landing">
                <Navbar isUserLoggedIn={isUserLoggedIn} />
                <Home />
                <HowItWorks />
                <Services />
                <div id="plans">
                    <Plans />
                </div>
                <Faqs />
                <Reviews />
                <Contact />
                <DownloadApp />
                <Footer />
            </div>
        </React.Fragment>
    );
};

export default Index;