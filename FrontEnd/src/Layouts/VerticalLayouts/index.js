import React, { useEffect, useCallback } from 'react';
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { Collapse } from 'reactstrap';
import navdata from "../LayoutMenuData";
import { withTranslation } from "react-i18next";
import withRouter from "../../Components/Common/withRouter";
import { useSelector } from "react-redux";

const VerticalLayout = (props) => {
    const navData = navdata().props.children;
    const path = props.router.location.pathname;
    const shouldShowHamburger = false;

    const { leftsidbarSizeType, sidebarVisibilitytype, layoutType } = useSelector(state => ({
        leftsidbarSizeType: state.Layout.leftsidbarSizeType,
        sidebarVisibilitytype: state.Layout.sidebarVisibilitytype,
        layoutType: state.Layout.layoutType
    }));

    // Function to close sidebar on mobile when menu item is clicked
    const handleNavItemClick = () => {
        if (window.innerWidth < 992) {  // Standard Bootstrap lg breakpoint
            document.body.classList.remove("vertical-sidebar-enable");
        }
    };

    const handleHamburgerClick = () => {
        const icon = document.querySelector('.hamburger-icon');
        if (icon) {
            icon.classList.toggle('open');
        }
    };

    const resizeSidebarMenu = useCallback(() => {
        var windowSize = document.documentElement.clientWidth;
        if (windowSize >= 1025) {
            document.querySelector(".hamburger-icon")?.classList.remove("open");
        } else if (windowSize <= 1025) {
            document.querySelector(".hamburger-icon")?.classList.add("open");
        }
    }, [leftsidbarSizeType, sidebarVisibilitytype, layoutType]);

    useEffect(() => {
        window.addEventListener("resize", resizeSidebarMenu, true);
    }, [resizeSidebarMenu]);

    return (
        <React.Fragment>
          {shouldShowHamburger && (
            <button className="hamburger-icon" onClick={handleHamburgerClick}>
            </button>
          )}
            {/* menu Items */}
            {(navData || []).map((item, key) => (
                <React.Fragment key={key}>
                    {item['isHeader'] ? 
                        <li className="menu-title"><span>{props.t(item.label)} </span></li> 
                        : (
                            item.subItems ? (
                                <li className="nav-item">
                                    <Link 
                                        onClick={(e) => {
                                            if(item.click) item.click(e);
                                            handleNavItemClick();
                                        }} 
                                        className="nav-link menu-link" 
                                        to={item.link ? item.link : "/#"} 
                                        data-bs-toggle="collapse"
                                    >
                                        <i className={item.icon}></i>
                                        <span>{props.t(item.label)}</span>
                                    </Link>
                                    <Collapse className="menu-dropdown" isOpen={item.stateVariables}>
                                        {/* Nested subitems */}
                                    </Collapse>
                                </li>
                            ) : (
                                <li className="nav-item">
                                    <Link 
                                        className="nav-link menu-link" 
                                        to={item.link ? item.link : "/#"}
                                        onClick={handleNavItemClick}
                                    >
                                        <i className={item.icon}></i>
                                        <span>{props.t(item.label)}</span>
                                    </Link>
                                </li>
                            )
                        )
                    }
                </React.Fragment>
            ))}
        </React.Fragment>
    );
};

VerticalLayout.propTypes = {
    location: PropTypes.object,
    t: PropTypes.any,
};

export default withRouter(withTranslation()(VerticalLayout));