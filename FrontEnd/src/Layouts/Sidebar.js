import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import SimpleBar from "simplebar-react";
import { Container } from "reactstrap";

//Import Components
import VerticalLayout from "./VerticalLayouts";
import TwoColumnLayout from "./TwoColumnLayout";
import HorizontalLayout from "./HorizontalLayout";

const Sidebar = ({ layoutType = "vertical" }) => {

  useEffect(() => {
    var verticalOverlay = document.getElementsByClassName("vertical-overlay");
    if (verticalOverlay) {
      verticalOverlay[0].addEventListener("click", function () {
        document.body.classList.remove("vertical-sidebar-enable");
      });
    }
  });

  const addEventListenerOnSmHoverMenu = () => {
    // add listener Sidebar Hover icon on change layout from setting
    if (document.documentElement.getAttribute('data-sidebar-size') === 'sm-hover') {
      document.documentElement.setAttribute('data-sidebar-size', 'sm-hover-active');
    } else if (document.documentElement.getAttribute('data-sidebar-size') === 'sm-hover-active') {
      document.documentElement.setAttribute('data-sidebar-size', 'sm-hover');
    } else {
      document.documentElement.setAttribute('data-sidebar-size', 'sm-hover');
    }
  };

  return (
    <React.Fragment>
      <div className="app-menu navbar-menu">
        <div className="navbar-brand-box">
          <Link to="/" className="logo logo-dark">
            <span className="logo-sm">
              <div className="logo-text-sm">N</div>
            </span>
            <span className="logo-lg">
              <div className="logo-text">Nestleo</div>
            </span>
          </Link>

          <Link to="/" className="logo logo-light">
            <span className="logo-sm">
              <div className="logo-text-sm">N</div>
            </span>
            <span className="logo-lg">
              <div className="logo-text">Nestleo</div>
            </span>
          </Link>
          <button
            onClick={addEventListenerOnSmHoverMenu}
            type="button"
            className="btn btn-sm p-0 fs-20 header-item float-end btn-vertical-sm-hover"
            id="vertical-hover"
          >
            <i className="ri-record-circle-line"></i>
          </button>
        </div>
        {layoutType === "horizontal" ? (
          <div id="scrollbar">
            <Container fluid>
              <div id="two-column-menu"></div>
              <ul className="navbar-nav" id="navbar-nav">
                <HorizontalLayout />
              </ul>
            </Container>
          </div>
        ) : layoutType === 'twocolumn' ? (
          <React.Fragment>
            <TwoColumnLayout layoutType={layoutType} />
            <div className="sidebar-background"></div>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <SimpleBar id="scrollbar" className="h-100">
              <Container fluid>
                <div id="two-column-menu"></div>
                <ul className="navbar-nav" id="navbar-nav">
                  <VerticalLayout layoutType={layoutType} />
                </ul>
              </Container>
            </SimpleBar>
            <div className="sidebar-background"></div>
          </React.Fragment>
        )}
      </div>
      <div className="vertical-overlay"></div>
      
      <style jsx>{`
        /* Logo Text Styling */
        .logo-text {
          font-family: 'Arial', sans-serif;
          font-size: 32px;
          font-weight: 600;
          color: #e6485c;
          letter-spacing: -0.5px;
          line-height: 1;
          padding: 20px 0;
        }
        
        .logo-text-sm {
          font-family: 'Arial', sans-serif;
          font-size: 24px;
          font-weight: 600;
          color: #e6485c;
          letter-spacing: -0.5px;
          line-height: 1;
          padding: 10px 0;
        }

        /* Make sure dark/light mode transitions work if needed */
        .navbar-menu.is-sticky .logo-text {
          color: #e6485c;
        }
        
        .navbar-menu.is-sticky .logo-text-sm {
          color: #e6485c;
        }

        /* Responsive adjustments for logo */
        @media (max-width: 767.98px) {
          .logo-text {
            font-size: 28px;
            padding: 15px 0;
          }
          
          .logo-text-sm {
            font-size: 20px;
            padding: 8px 0;
          }
        }
      `}</style>
    </React.Fragment>
  );
};

export default Sidebar;