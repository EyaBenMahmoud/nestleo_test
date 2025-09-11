import React from 'react';
import Navbar from "./Navbar";
import Home from "./Home";
import Connect from './Connect';
import Products from "./Products";
import Features from './Features';
import Trending from "./Trending ";
import DiscoverItems from "./DiscoverItems";
import TopCreator from "./TopCreator ";
import CTA from './CTA';
import Footer from "./footer";
import { useLocation, useNavigate } from 'react-router-dom';
import { getUser } from "../../../services/api"
const index = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get("token"); // Extract token from URL

    // Store token in localStorage if it exists
    if (token) {
        localStorage.setItem("token", token);
        navigate("/landing", { replace: true });

        const user = getUser(); // Will get the token from storage or use the passed token
        if (user) {
            console.log("User Data:", user);
        } else {
            console.log("No valid token found");
        }

    }

    document.title = " Landing | Nestleo";

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

    return (
        <React.Fragment>
            <div className="layout-wrapper landing">
                <Navbar />
                <Home />
                <Connect />
                <Products />
                <Features />
                <Trending />
                <DiscoverItems />
                <TopCreator />
                <CTA />
                <Footer />
                <button onClick={() => toTop()} className="btn btn-danger btn-icon landing-back-top" id="back-to-top">
                    <i className="ri-arrow-up-line"></i>
                </button>
            </div>
        </React.Fragment>
    );
};

export default index;