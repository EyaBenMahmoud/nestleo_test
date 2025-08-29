import React, { useEffect, useState, useRef } from 'react';
import PropTypes from "prop-types";
import withRouter from '../Components/Common/withRouter';

// Import Components
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';

// Import actions
import {
    changeLayout,
    changeSidebarTheme,
    changeLayoutMode,
    changeLayoutWidth,
    changeLayoutPosition,
    changeTopbarTheme,
    changeLeftsidebarSizeType,
    changeLeftsidebarViewType,
    changeSidebarImageType,
    changeSidebarVisibility
} from "../slices/thunks";
import RightSidebar from '../Components/Common/RightSidebar';
// Redux
import { useSelector, useDispatch } from "react-redux";

const Layout = (props) => {
    const [headerClass, setHeaderClass] = useState("");
    const headerRef = useRef(null);
    const dispatch = useDispatch();
    
    const {
        layoutType,
        leftSidebarType,
        layoutModeType,
        layoutWidthType,
        layoutPositionType,
        topbarThemeType,
        leftsidbarSizeType,
        leftSidebarViewType,
        leftSidebarImageType,
        sidebarVisibilitytype
    } = useSelector(state => ({
        layoutType: state.Layout.layoutType,
        leftSidebarType: state.Layout.leftSidebarType,
        layoutModeType: state.Layout.layoutModeType,
        layoutWidthType: state.Layout.layoutWidthType,
        layoutPositionType: state.Layout.layoutPositionType,
        topbarThemeType: state.Layout.topbarThemeType,
        leftsidbarSizeType: state.Layout.leftsidbarSizeType,
        leftSidebarViewType: state.Layout.leftSidebarViewType,
        leftSidebarImageType: state.Layout.leftSidebarImageType,
        sidebarVisibilitytype: state.Layout.sidebarVisibilitytype
    }));

    // Layout settings
    useEffect(() => {
        if (
            layoutType ||
            leftSidebarType ||
            layoutModeType ||
            layoutWidthType ||
            layoutPositionType ||
            topbarThemeType ||
            leftsidbarSizeType ||
            leftSidebarViewType ||
            leftSidebarImageType ||
            sidebarVisibilitytype
        ) {
            window.dispatchEvent(new Event('resize'));
            dispatch(changeLeftsidebarViewType(leftSidebarViewType));
            dispatch(changeLeftsidebarSizeType(leftsidbarSizeType));
            dispatch(changeSidebarTheme(leftSidebarType));
            dispatch(changeLayoutMode(layoutModeType));
            dispatch(changeLayoutWidth(layoutWidthType));
            dispatch(changeLayoutPosition(layoutPositionType));
            dispatch(changeTopbarTheme(topbarThemeType));
            dispatch(changeLayout(layoutType));
            dispatch(changeSidebarImageType(leftSidebarImageType));
            dispatch(changeSidebarVisibility(sidebarVisibilitytype));
        }
    }, [
        layoutType,
        leftSidebarType,
        layoutModeType,
        layoutWidthType,
        layoutPositionType,
        topbarThemeType,
        leftsidbarSizeType,
        leftSidebarViewType,
        leftSidebarImageType,
        sidebarVisibilitytype,
        dispatch
    ]);

    // Scroll handler
    useEffect(() => {
        const scrollNavigation = () => {
            const scrollup = document.documentElement.scrollTop;
            setHeaderClass(scrollup > 50 ? "topbar-shadow" : "");
        };

        window.addEventListener("scroll", scrollNavigation, true);
        return () => window.removeEventListener("scroll", scrollNavigation, true);
    }, []);

    return (
        <React.Fragment>
            <div id="layout-wrapper">
                <Header
                    headerClass={headerClass}
                    layoutModeType={layoutModeType}
                    onChangeLayoutMode={(value) => dispatch(changeLayoutMode(value))}
                />
                <Sidebar layoutType={layoutType} />
                <div className="main-content">
                    {props.children}
                    <Footer />
                </div>
            </div>
        </React.Fragment>
    );
};

Layout.propTypes = {
    children: PropTypes.node,
};

export default withRouter(Layout);