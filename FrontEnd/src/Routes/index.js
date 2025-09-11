import React from 'react';
import { Routes, Route } from "react-router-dom";

//Layouts
import NonAuthLayout from "../Layouts/NonAuthLayout";
import VerticalLayout from "../Layouts/index";

//routes
import { authProtectedRoutes, filterRoutesByRole, publicRoutes } from "./allRoutes";
import { AuthProtected } from './AuthProtected';
import { useSelector } from 'react-redux';
import Alt404 from '../pages/AuthenticationInner/Errors/Alt404';
import Basic404 from '../pages/AuthenticationInner/Errors/Basic404';

const Index = () => {
    const { user } = useSelector((state) => ({
      user: state.Loginn.user,
    }));
  
    const filteredAuthRoutes = user ? filterRoutesByRole(authProtectedRoutes, user.role) : [];
    
    return (
      <React.Fragment>
        <Routes>
          <Route>
            {publicRoutes.map((route, idx) => (
              <Route
                path={route.path}
                element={
                  <NonAuthLayout>
                    {route.component}
                  </NonAuthLayout>
                }
                key={idx}
              />
            ))}
          </Route>
  
          <Route>
            {filteredAuthRoutes.map((route, idx) => (
              <Route
                path={`${route.path}/*`}  // Add /* to allow nested routes
                element={
                  <AuthProtected>
                    <VerticalLayout>{route.component}</VerticalLayout>
                  </AuthProtected>
                }
                key={idx}
              />
            ))}
          </Route>
          <Route path="*" element={<Basic404 />} />
        </Routes>
      </React.Fragment>
    );
  };
export default Index;