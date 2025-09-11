import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { withTranslation } from "react-i18next";
import { loginUserWithGoogle } from "../../../slices/login/loginSlice";

// Import the custom Nestleo styling
import "../../../assets/scss/pages/_nestleoAuth.scss";

const roles = [
  {
    title: "roles.worker.title",
    description: "roles.worker.description",
    role: "Worker",
    icon: "ri-user-settings-line",
    features: [
      "roles.worker.features.taskManagement",
      "roles.worker.features.serviceTracking",
      "roles.worker.features.schedulePlanning"
    ],
    pattern: "radial-gradient(circle at 10% 20%, rgba(230, 72, 92, 0.1) 0%, rgba(230, 72, 92, 0.03) 90%)"
  },
  {
    title: "roles.syndicateAdmin.title",
    description: "roles.syndicateAdmin.description",
    role: "SyndicateAdmin",
    icon: "ri-building-4-line",
    features: [
      "roles.syndicateAdmin.features.buildingManagement",
      "roles.syndicateAdmin.features.financialControl",
      "roles.syndicateAdmin.features.residentCommunications"
    ],
    pattern: "radial-gradient(circle at 50% 60%, rgba(230, 72, 92, 0.08) 0%, rgba(230, 72, 92, 0.02) 90%)"
  },
  {
    title: "roles.syndicateCoowner.title",
    description: "roles.syndicateCoowner.description",
    role: "SyndicateCoowner",
    icon: "ri-team-line",
    features: [
      "roles.syndicateCoowner.features.voteOnDecisions",
      "roles.syndicateCoowner.features.trackExpenses",
      "roles.syndicateCoowner.features.communityEngagement"
    ],
    pattern: "radial-gradient(circle at 80% 30%, rgba(230, 72, 92, 0.07) 0%, rgba(230, 72, 92, 0.01) 90%)"
  },
];

const SelectRoleComponent = ({ t }) => {
  document.title = `${t('roles.title')} | Nestleo`;
  
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [activeRole, setActiveRole] = useState(null);
  const [animating, setAnimating] = useState(false);

  const handleLogin = async (role) => {
    let user = localStorage.getItem("user");
  
    if (user) {
      user = JSON.parse(user);
      user.role = role;
      localStorage.setItem("user", JSON.stringify(user));
  
      if (role === "SyndicateCoowner") {
        navigate("/building-input", { state: { role } });
        return;
      }
  
      const tok = localStorage.getItem("token");
      try {
        await dispatch(
          loginUserWithGoogle({
            email: user.email,
            token: tok,
            role: user.role,
          })
        ).unwrap();
  
        navigate("/dashboard", { replace: true });
      } catch (error) {
        console.error("Error creating user:", error);
        alert(t('roles.error'));
      }
    } else {
      console.error("No user found in session storage!");
      alert(t('roles.noUser'));
    }
  };

  const handleRoleSelect = (role) => {
    setAnimating(true);
    setTimeout(() => {
      setActiveRole(role);
      setAnimating(false);
    }, 300);
  };

  return (
    <div className="nestly-auth-wrapper">
      <div className="nestly-bg-overlay"></div>
      <div className="design-element design-circle-1"></div>
      <div className="design-element design-circle-2"></div>
      <div className="container">
        <div className="nestly-auth-card enhanced">
          <div className="card-shape-top"></div>
          <div className="card-shape-bottom"></div>
          
          <div className="nestly-auth-row role-selection">
            <div className="nestly-auth-header animated">
              <div className="header-badge">
                <i className="ri-user-4-line"></i>
              </div>
              <h3>{t('roles.title')}</h3>
              <p>{t('roles.subtitle')}</p>
            </div>

            <div className={`role-selection-container ${animating ? 'animating' : ''}`}>
              {roles.map((role, index) => (
                <div 
                  key={index} 
                  className={`role-selection-item ${activeRole?.role === role.role ? 'active' : ''}`}
                  onClick={() => handleRoleSelect(role)}
                  style={{ '--pattern-bg': role.pattern }}
                >
                  <div className="role-shine"></div>
                  <div className="role-card-content">
                    <div className="role-icon-wrapper">
                      <div className="role-icon-bg"></div>
                      <i className={role.icon}></i>
                    </div>
                    <h4>{t(role.title)}</h4>
                    <p>{t(role.description)}</p>
                    
                    <div className="role-features">
                      {role.features.map((feature, i) => (
                        <div key={i} className="role-feature">
                          <i className="ri-check-line"></i> {t(feature)}
                        </div>
                      ))}
                    </div>
                    
                    {activeRole?.role === role.role && (
                      <div className="role-selected-indicator">
                        <span>{t('roles.selected')}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {activeRole && (
              <div className="continue-action">
                <button 
                  className="nestly-btn nestly-btn-primary nestly-btn-block animate-in" 
                  onClick={() => handleLogin(activeRole.role)}
                >
                  <i className="ri-arrow-right-line"></i>
                  <span>{t('roles.continueAs', { title: t(activeRole.title) })}</span>
                </button>
              </div>
            )}

            <div className="nestly-auth-footer">
              <p>{t('roles.notReady')} <a href="/connect" className="nestly-auth-link">{t('roles.goBack')}</a></p>
            </div>
          </div>
        </div>
      </div>

      <style jsx="true">{`
        .nestly-auth-wrapper {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 1.5rem 1rem;
          background: linear-gradient(-45deg, #a1d0e0, #f2fafc);
          position: relative;
          overflow: hidden;
        }

        .nestly-bg-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.828-1.415 1.415L51.8 0h2.827zM5.373 0l-.83.828L5.96 2.243 8.2 0H5.374zM48.97 0l3.657 3.657-1.414 1.414L46.143 0h2.828zM11.03 0L7.372 3.657 8.787 5.07 13.857 0H11.03zm32.284 0L49.8 6.485 48.384 7.9l-7.9-7.9h2.83zm-24.596 0L12.143 6.485l1.415 1.414 7.9-7.9h-2.83zm16.728 0L29.8 6.485 31.214 7.9l7.9-7.9h-2.83zm-8.86 0l5.657 5.657-1.415 1.415L25.857 0h2.828zM16.504 0L10.845 5.657l1.415 1.415L18.92 0h-2.416zm15.984 0l-5.657 5.657 1.415 1.415L34.9 0h-2.413zM4.03 0L0 4.03l1.414 1.414L7.03 0H4.03zm50.627 0L58.627 4.03 57.213 5.44 51.627 0h3.03zm-46.627 0L9.97 1.97 8.557 3.384 4.97 0h3.06zM54.627 0L52.657 1.97l1.414 1.415L58.03 0h-3.404zM3.336 0L0 3.336l1.414 1.414L6.03 0H3.335zm50.628 0L50.343 3.657l1.414 1.414L56.97 0h-3.006zM2.465 0L0 2.465l1.414 1.414L5.293 0H2.465zM55.5 0L52.343 3.157l1.414 1.414L59 0h-3.5zM1.54 0L0 1.54l1.414 1.415L4.37 0H1.54zm51.92 0L50.343 3.117l1.414 1.415L56.88 0h-3.42zM6.97 0L0 6.97l1.414 1.414L9.9 0H6.97zm40.737 0L44.2 3.506l1.415 1.414L49.826 0h-2.12zM2.232 0L0 2.232l1.414 1.414L5.06 0H2.23zM53.707 0L49.343 4.364l1.414 1.414L58.03 0h-4.323zM46.5 0L44.343 2.157l1.414 1.415L48.343 0h-1.843zm-40.83 0L3.157 2.513l1.415 1.414L7.686 0H5.67z' fill='%23e6485c' fill-opacity='0.03' fill-rule='evenodd'/%3E%3C/svg%3E");
          z-index: -1;
        }

        .design-element {
          position: absolute;
          z-index: -1;
          pointer-events: none;
        }

        .design-circle-1 {
          width: 250px;
          height: 250px;
          background: radial-gradient(circle, rgba(230, 72, 92, 0.07) 0%, rgba(230, 72, 92, 0) 70%);
          border-radius: 50%;
          top: -50px;
          right: 15%;
        }

        .design-circle-2 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(230, 72, 92, 0.05) 0%, rgba(230, 72, 92, 0) 70%);
          border-radius: 50%;
          bottom: -100px;
          left: -100px;
        }

        .nestly-auth-card.enhanced {
          width: 110%;
          max-width: 1100px;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 
            0 15px 40px rgba(0, 0, 0, 0.08),
            0 5px 15px rgba(230, 72, 92, 0.07);
          background-color: #fff;
          position: relative;
          border-top: 5px solid #e6485c;
        }

        .card-shape-top {
          position: absolute;
          top: 0;
          right: 0;
          width: 150px;
          height: 150px;
          background: linear-gradient(135deg, rgba(230, 72, 92, 0.07), rgba(230, 72, 92, 0.02));
          clip-path: polygon(100% 0, 0 0, 100% 100%);
          z-index: 1;
        }

        .card-shape-bottom {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 120px;
          height: 120px;
          background: linear-gradient(135deg, rgba(230, 72, 92, 0.05), rgba(230, 72, 92, 0.01));
          clip-path: polygon(0 100%, 100% 100%, 0 0);
          z-index: 1;
        }

        .nestly-auth-row.role-selection {
          display: block;
          padding: 30px;
          position: relative;
          z-index: 2;
        }

        .nestly-auth-header.animated {
          text-align: center;
          margin-bottom: 25px;
          position: relative;
        }

        .header-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background-color: #e6485c;
          border-radius: 50%;
          color: white;
          margin-bottom: 12px;
          position: relative;
          box-shadow: 0 5px 15px rgba(230, 72, 92, 0.3);
        }

        .header-badge::before {
          content: "";
          position: absolute;
          top: -5px;
          left: -5px;
          right: -5px;
          bottom: -5px;
          background-color: rgba(230, 72, 92, 0.3);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .header-badge i {
          font-size: 18px;
        }

        .nestly-auth-header h3 {
          font-size: 26px;
          font-weight: 700;
          color: #2d3748;
          margin-bottom: 8px;
        }

        .nestly-auth-header p {
          color: #718096;
          font-size: 1rem;
          margin-bottom: 5px;
        }

        .role-selection-container {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin: 20px 0 20px;
          transition: opacity 0.3s ease;
        }

        .role-selection-container.animating {
          opacity: 0.7;
        }

        .role-selection-item {
          background-color: #fff;
          border-radius: 12px;
          box-shadow: 
            0 8px 20px rgba(0, 0, 0, 0.03),
            0 4px 8px rgba(0, 0, 0, 0.02);
          padding: 20px 18px;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          cursor: pointer;
          position: relative;
          overflow: hidden;
          height: 100%;
          display: flex;
          flex-direction: column;
          background-image: var(--pattern-bg);
          border: 1px solid rgba(230, 72, 92, 0.05);
          z-index: 1;
        }

        .role-shine {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            45deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.1) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          transform: rotate(45deg);
          z-index: 0;
          transition: all 0.8s ease;
          pointer-events: none;
          opacity: 0;
        }

        .role-selection-item:hover .role-shine {
          opacity: 1;
          transform: rotate(45deg) translateY(-120%);
        }

        .role-card-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .role-selection-item:hover, .role-selection-item.active {
          transform: translateY(-5px);
          box-shadow: 
            0 15px 30px rgba(0, 0, 0, 0.08),
            0 6px 12px rgba(230, 72, 92, 0.1);
          border: 1px solid rgba(230, 72, 92, 0.2);
        }

        .role-selection-item.active {
          background-color: rgba(230, 72, 92, 0.03);
        }

        .role-icon-wrapper {
          position: relative;
          width: 60px;
          height: 60px;
          margin-bottom: 15px;
          z-index: 1;
        }

        .role-icon-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: linear-gradient(135deg, #e6485c, #d13a4e);
          box-shadow: 
            0 8px 16px rgba(230, 72, 92, 0.3),
            0 4px 6px rgba(230, 72, 92, 0.2),
            inset 0 -2px 4px rgba(0, 0, 0, 0.15);
        }

        .role-selection-item:hover .role-icon-bg,
        .role-selection-item.active .role-icon-bg {
          background: linear-gradient(135deg, #d13a4e, #e6485c);
          box-shadow: 
            0 10px 20px rgba(230, 72, 92, 0.4),
            0 5px 10px rgba(230, 72, 92, 0.25);
        }

        .role-icon-wrapper i {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 26px;
          color: white;
          z-index: 2;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .role-selection-item h4 {
          color: #e6485c;
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 8px;
          transition: color 0.3s ease;
          position: relative;
        }

        .role-selection-item h4::after {
          content: '';
          position: absolute;
          bottom: -5px;
          left: 0;
          width: 30px;
          height: 2px;
          background-color: rgba(230, 72, 92, 0.3);
          transition: width 0.3s ease;
        }

        .role-selection-item:hover h4::after,
        .role-selection-item.active h4::after {
          width: 50px;
          background-color: #e6485c;
        }

        .role-selection-item p {
          color: #718096;
          font-size: 14px;
          line-height: 1.4;
          margin-bottom: 12px;
        }

        .role-features {
          margin-top: auto;
        }

        .role-feature {
          display: flex;
          align-items: center;
          margin-top: 8px;
          font-size: 13px;
          color: #4a5568;
          transition: transform 0.3s ease;
        }

        .role-selection-item:hover .role-feature,
        .role-selection-item.active .role-feature {
          transform: translateX(3px);
        }

        .role-feature i {
          color: #e6485c;
          font-size: 14px;
          margin-right: 6px;
          background: rgba(230, 72, 92, 0.1);
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.3s ease;
        }

        .role-selection-item:hover .role-feature i,
        .role-selection-item.active .role-feature i {
          background: rgba(230, 72, 92, 0.2);
        }

        .role-selected-indicator {
          position: absolute;
          top: 12px;
          right: 12px;
          background: #e6485c;
          color: white;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 30px;
          box-shadow: 0 3px 8px rgba(230, 72, 92, 0.3);
          animation: fadeIn 0.5s ease;
        }

        .continue-action {
          margin-top: 15px;
          position: relative;
        }

        .nestly-btn {
          margin-top: 10px;
          position: relative;
          overflow: hidden;
          padding: 12px 24px;
          font-size: 15px;
          font-weight: 600;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 6px 15px rgba(230, 72, 92, 0.3);
        }

        .nestly-btn-primary {
          background: linear-gradient(90deg, #e6485c, #d13a4e);
          border: none;
          color: white;
        }

        .nestly-btn-block {
          width: 100%;
        }

        .animate-in {
          animation: slideUp 0.5s ease;
        }

        .nestly-btn::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            45deg, 
            rgba(255, 255, 255, 0) 0%, 
            rgba(255, 255, 255, 0.2) 50%, 
            rgba(255, 255, 255, 0) 100%
          );
          transform: rotate(45deg);
          z-index: 0;
          transition: all 0.8s ease;
          pointer-events: none;
        }

        .nestly-btn:hover::after {
          transform: rotate(45deg) translateY(-200%);
        }

        .nestly-btn i, .nestly-btn span {
          position: relative;
          z-index: 1;
        }

        .nestly-auth-footer {
          text-align: center;
          margin-top: 20px;
          position: relative;
        }

        .nestly-auth-footer p {
          color: #718096;
          font-size: 14px;
          margin: 0;
        }

        .nestly-auth-link {
          color: #e6485c;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
          position: relative;
        }

        .nestly-auth-link::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 0;
          height: 1px;
          background-color: #e6485c;
          transition: width 0.3s ease;
        }

        .nestly-auth-link:hover::after {
          width: 100%;
        }

        .nestly-auth-link:hover {
          color: #d13a4e;
        }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 992px) {
          .role-selection-container {
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
          }
          
          .role-selection-item {
            padding: 18px 15px;
          }
          
          .role-icon-wrapper {
            width: 50px;
            height: 50px;
          }

          .nestly-auth-row.role-selection {
            padding: 25px 20px;
          }
          
          .role-icon-wrapper i {
            font-size: 22px;
          }

          .nestly-auth-header h3 {
            font-size: 24px;
          }
        }

        @media (max-width: 768px) {
          .nestly-auth-row.role-selection {
            padding: 25px 20px;
          }

          .role-selection-container {
            grid-template-columns: 1fr;
            gap: 15px;
          }

          .role-selection-item {
            max-width: 450px;
            margin: 0 auto;
          }
          
          .header-badge {
            width: 32px;
            height: 32px;
          }
          
          .header-badge i {
            font-size: 16px;
          }

          .design-circle-1, .design-circle-2, .card-shape-top, .card-shape-bottom {
            opacity: 0.5;
            transform: scale(0.8);
          }
        }
      `}</style>
    </div>
  );
};

export default withTranslation()(SelectRoleComponent);