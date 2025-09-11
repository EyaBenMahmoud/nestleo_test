import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBuilding, FaLayerGroup, FaHome, FaUsers, FaChevronDown } from 'react-icons/fa';
import { Row, Col, Card, CardBody, Breadcrumb, BreadcrumbItem } from 'reactstrap';
import { withTranslation } from 'react-i18next';

const PropertyNavigation = ({ isLoading, t }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const navigationItems = [
    {
      id: 'buildings',
      path: '/BuildingInterface',
      icon: <FaBuilding />,
      label: t('navigation.buildings'),
      description: t('navigation.buildingsDesc')
    },
    {
      id: 'blocs',
      path: '/buildings/blocs',
      icon: <FaLayerGroup />,
      label: t('navigation.blocs'),
      description: t('navigation.blocsDesc')
    },
    {
      id: 'apartments',
      path: '/buildings/apartments',
      icon: <FaHome />,
      label: t('navigation.apartments'),
      description: t('navigation.apartmentsDesc')
    },
    {
      id: 'coowners',
      path: '/pages-team',
      icon: <FaUsers />,
      label: t('navigation.coowners'),
      description: t('navigation.coownersDesc')
    }
  ];

  // Find current active item
  const activeItem = navigationItems.find(item => item.path === currentPath) || navigationItems[0];

  return (
    <>
      {/* Loading overlay */}
      {isLoading && (
        <div className="global-loading-overlay">
          <div className="loading-animation">
            <div className="loading-bar"></div>
            <div className="loading-bar"></div>
            <div className="loading-bar"></div>
            <div className="loading-building">
              <FaBuilding />
            </div>
          </div>
          <p className="loading-text">{t('navigation.loading')}</p>
        </div>
      )}

      <div className="property-navigation mb-0">
        <Row>
          <Col>
            {/* Breadcrumb Section */}
            <Card className="border-0 shadow-sm" style={{ borderRadius: 0 }}>
              <CardBody className="py-2">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="d-flex align-items-center mt-1">
                      <div className="tab-icon-badge me-2">
                        {activeItem.icon}
                      </div>
                      <h4 className="mb-0 fw-semibold">
                        {activeItem.label}
                        <small className="text-muted ms-2 fs-13 fw-normal">{activeItem.description}</small>
                      </h4>
                    </div>
                  </div>

                  {/* Horizontal Tab Navigation */}
                  <div className="horizontal-tabs-container">
                    <div className="horizontal-tabs">
                      {navigationItems.map(item => (
                        <div
                          key={item.id}
                          className={`horizontal-tab-item ${currentPath === item.path ? 'active' : ''}`}
                          onClick={() => navigate(item.path)}
                        >
                          <div className="tab-item-content">
                            <div className="tab-item-icon">
                              {item.icon}
                            </div>
                            <div className="tab-item-label">{item.label}</div>
                          </div>
                          {currentPath === item.path && (
                            <div className="tab-item-arrow">
                              <FaChevronDown />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>

      {/* CSS styles remain unchanged */}
      <style jsx>{`
        /* Breadcrumb styles */
        .breadcrumb {
          font-size: 14px;
        }
        
        /* Tab icon badge */
        .tab-icon-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          background-color: var(--vz-primary);
          border-radius: 6px;
          color: white;
          font-size: 14px;
        }
        
        /* Horizontal Tabs Styles */
        .horizontal-tabs-container {
          margin-left: 15px;
        }
        
        .horizontal-tabs {
          display: flex;
          gap: 6px;
        }
        
        .horizontal-tab-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px 12px;
          cursor: pointer;
          position: relative;
          min-width: 80px;
          transition: all 0.2s ease;
          border-bottom: 2px solid transparent;
        }
        
        .horizontal-tab-item.active {
          border-bottom: 2px solid var(--vz-primary);
        }
        
        .horizontal-tab-item:hover:not(.active) {
          background-color: rgba(0, 0, 0, 0.02);
        }
        
        .tab-item-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        
        .tab-item-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 6px;
          font-size: 14px;
          margin-bottom: 4px;
          color: var(--vz-body-color);
          transition: all 0.2s ease;
        }
        
        .horizontal-tab-item.active .tab-item-icon {
          color: var(--vz-primary);
          background-color: rgba(var(--vz-primary-rgb), 0.1);
        }
        
        .tab-item-label {
          font-weight: 600;
          font-size: 12px;
          color: var(--vz-body-color);
          transition: all 0.2s ease;
        }
        
        .horizontal-tab-item.active .tab-item-label {
          color: var(--vz-primary);
        }
        
        .tab-item-arrow {
          position: absolute;
          bottom: -1px;
          font-size: 10px;
          color: var(--vz-primary);
          opacity: 1;
          animation: bounce 1s infinite alternate;
        }
        
        @keyframes bounce {
          0% {
            transform: translateY(-1px);
          }
          100% {
            transform: translateY(1px);
          }
        }
        
        /* Loading animation styles */
        .global-loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(4px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        
        .loading-animation {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          width: 120px;
          height: 70px;
        }
        
        .loading-text {
          margin-top: 15px;
          font-weight: 500;
          color: var(--vz-primary);
        }
        
        .loading-bar {
          width: 12px;
          height: 5px;
          background: var(--vz-primary);
          margin: 0 4px;
          border-radius: 10px;
          animation: loading-wave 1s infinite ease-in-out;
          transform-origin: bottom;
          box-shadow: 0 2px 4px rgba(var(--vz-primary-rgb), 0.3);
        }
        
        .loading-bar:nth-child(2) {
          animation-delay: 0.1s;
          height: 15px;
        }
        
        .loading-bar:nth-child(3) {
          animation-delay: 0.2s;
          height: 25px;
        }
        
        .loading-building {
          position: absolute;
          top: -20px;
          color: var(--vz-primary);
          font-size: 1.8rem;
          animation: loading-bounce 1s infinite alternate ease-in-out;
          filter: drop-shadow(0 3px 3px rgba(var(--vz-primary-rgb), 0.3));
        }
        
        @keyframes loading-wave {
          0%, 100% { height: 5px; }
          50% { height: 35px; }
        }
        
        @keyframes loading-bounce {
          0% { transform: translateY(0); }
          100% { transform: translateY(-12px); }
        }

        /* Responsive styles */
        @media (max-width: 768px) {
          .d-flex.align-items-center {
            flex-direction: column;
            align-items: flex-start;
          }
          .horizontal-tabs-container {
            margin-left: 0;
            margin-top: 10px;
            width: 100%;
            overflow-x: auto;
          }
          .horizontal-tabs {
            flex-wrap: nowrap;
            width: max-content;
          }
        }

        /* Override Card rounding */
        .card {
          border-radius: 0 !important;
        }
      `}</style>
    </>
  );
};

export default withTranslation()(PropertyNavigation);