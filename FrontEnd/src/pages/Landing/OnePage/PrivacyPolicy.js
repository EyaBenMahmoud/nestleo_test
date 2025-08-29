import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardBody, Col, Container, Row, Spinner } from "reactstrap";
import Navbar from "./navbar";
import Footer from "./footer";
import { useDispatch, useSelector } from "react-redux";
import { setUser } from "../../../slices/login/loginSlice";
import { useTranslation } from 'react-i18next';

const PrivacyPolicy = () => {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language || localStorage.getItem("I18N_LANGUAGE") || "en";

  document.title = t("privacyPolicy.title", "Privacy Policy") + " | Nestleo";
  
  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState({
    content: '',
    lastUpdated: new Date(),
    language: 'en'
  });
  const [fallbackLanguage, setFallbackLanguage] = useState(false);
  
  const dispatch = useDispatch();
  const { isUserLoggedIn, user } = useSelector((state) => state.Loginn);
  
  // Check if user is logged in and fetch user data if needed
  useEffect(() => {
    const token = localStorage.getItem("authUser");
    
    if (token && !user) {
      // Fetch user data from API
      const fetchUserData = async () => {
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/me`, {
            headers: {
              'Authorization': `Bearer ${JSON.parse(token).accessToken}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            dispatch(setUser(userData));
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      };
      
      fetchUserData();
    }
  }, [dispatch, user]);
  
  // Fetch the policy data from the CRM API with language parameter
  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        setLoading(true);
        // Pass current language as query parameter
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/crm/policy/privacyPolicy?lang=${currentLanguage}`);
        
        if (response.ok) {
          const data = await response.json();
          setPolicy(data);
          
          // Check if we're using a fallback language
          if (data.fallback) {
            setFallbackLanguage(true);
          } else {
            setFallbackLanguage(false);
          }
        } else {
          console.error('Failed to fetch policy');
        }
      } catch (error) {
        console.error('Error fetching policy:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPolicy();
  }, [currentLanguage]); // Re-fetch when language changes

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString(currentLanguage, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  return (
    <React.Fragment>
      <div className="layout-wrapper landing">
        {/* Include Navbar with isUserLoggedIn and user props */}
        <Navbar isUserLoggedIn={isUserLoggedIn} user={user} />
        
        <div className="legal-page-content">
          <Container style={{ paddingTop: "60px" }}>
            <Row className="justify-content-center">
              <Col lg={10}>
                <Card className="mt-5">
                  <div className="bg-soft-info position-relative">
                    <CardBody className="p-5">
                      <div className="text-center">
                        <h3>{t("privacyPolicy.heading", "Privacy Policy")}</h3>
                        <p className="mb-0 text-muted">
                          {t("privacyPolicy.lastUpdate", "Last update")}: {formatDate(policy.lastUpdated)}
                        </p>
                        {fallbackLanguage && (
                          <div className="mt-2 text-warning">
                            <small>
                              {t("privacyPolicy.fallbackNotice", "This content is not available in your language and is shown in English.")}
                            </small>
                          </div>
                        )}
                      </div>
                    </CardBody>
                    <div className="shape">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        version="1.1"
                        xmlnsXlink="http://www.w3.org/1999/xlink"
                        width="1440"
                        height="60"
                        preserveAspectRatio="none"
                        viewBox="0 0 1440 60"
                      >
                        <g mask='url("#SvgjsMask1001")' fill="none">
                          <path
                            d="M 0,4 C 144,13 432,48 720,49 C 1008,50 1296,17 1440,9L1440 60L0 60z"
                            style={{ fill: "var(--vz-card-bg-custom)" }}
                          ></path>
                        </g>
                        <defs>
                          <mask id="SvgjsMask1001">
                            <rect width="1440" height="60" fill="#ffffff"></rect>
                          </mask>
                        </defs>
                      </svg>
                    </div>
                  </div>
                  <CardBody className="p-4">
                    {loading ? (
                      <div className="text-center py-5">
                        <Spinner color="primary" />
                        <p className="mt-3">{t("privacyPolicy.loading", "Loading privacy policy...")}</p>
                      </div>
                    ) : (
                      <>
                        <div className="policy-content" dangerouslySetInnerHTML={{ __html: policy.content }}></div>
                      </>
                    )}
                  </CardBody>
                </Card>
              </Col>
            </Row>
          </Container>
        </div>
        <Footer />
      </div>

      <style jsx>{`
        .layout-wrapper.landing {
          font-family: "Inter", sans-serif;
        }
        
        .legal-page-content {
          padding: 60px 0;
          background: linear-gradient(to right, #e8f0ff 0%, #fff0f5 100%);
          min-height: calc(100vh - 300px);
          /* Adjusted padding to account for navbar */
          padding-top: 160px;
        }
        
        .policy-content h5 {
          color: #333;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
        }
        
        .policy-content p, .policy-content li {
          color: #666;
          line-height: 1.6;
        }
        
        .policy-content ul {
          padding-left: 1.5rem;
          margin-bottom: 1.5rem;
        }
      `}</style>
    </React.Fragment>
  );
};

export default PrivacyPolicy;