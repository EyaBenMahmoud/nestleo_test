import PropTypes from "prop-types";
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../slices/login/loginSlice"; // Ensure correct import
import withRouter from "../../Components/Common/withRouter";
import { clearAllBuildingState, clearCurrentBuilding } from "../../slices/buildings/building";

const Logout = () => {
  const dispatch = useDispatch();
  const isUserLogout = useSelector((state) => state.Loginn.isUserLogout);
  const user = useSelector((state) => state.Loginn.user);
  const [redirectPath, setRedirectPath] = useState(null);

  useEffect(() => {
    // Get user role from current state or from localStorage as fallback
    const currentUserRole = user?.role || JSON.parse(localStorage.getItem('user'))?.role;
    
    // Determine redirect path based on user role
    const targetPath = currentUserRole === 'SuperAdmin' ? "/super-admin" : "/connect";
    
    // Set redirect path
    setRedirectPath(targetPath);
    
    // Dispatch logout actions
    dispatch(logout());
    dispatch(clearAllBuildingState());
  }, [dispatch]);

 

  if (isUserLogout && redirectPath) {
    return <Navigate to={redirectPath} />;
  }

  return null;
};

Logout.propTypes = {
  history: PropTypes.object,
};

export default withRouter(Logout);
