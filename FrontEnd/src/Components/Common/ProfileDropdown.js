import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import { useTranslation } from 'react-i18next';
import api from "../../services/api";
//import images
import DropImage from './displayDropdown';
import { fetchUserData } from '../../slices/login/loginSlice';
import { isGamificationEnabledForBuilding, isGamificationEnabledForBuildingPerAdminSubcription } from "../../Components/Subscriptions/SubcriptionValidator";

const ProfileDropdown = ({ classname }) => {
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const location = useLocation();

    // Extract user directly without destructuring to ensure proper re-renders
    const user = useSelector(state => state.Loginn.user);
    const currentBuilding = useSelector(state => state.Building.currentBuilding);

    // State to store gamification data from direct API call
    const [gamificationData, setGamificationData] = useState(null);

    // Dropdown Toggle
    const [isProfileDropdown, setIsProfileDropdown] = useState(false);
    const toggleProfileDropdown = () => {
        setIsProfileDropdown(!isProfileDropdown);
    };

    // Determine if we're on the landing page
    const isOnLandingPage = location.pathname === '/landing' || location.pathname === '/';

    // Function to fetch gamification data directly from API
    const fetchGamificationData = useCallback(async () => {
        if (user?.id) {
            try {
                // Include buildingId if available
                const buildingIdParam = currentBuilding?._id ? `?buildingId=${currentBuilding._id}` : '';
                const response = await api.get(`/api/gamification/profile/${user.id}${buildingIdParam}`);

                if (response.data.success) {
                    console.log("Fetched gamification data:", response.data.data);
                    setGamificationData(response.data.data);
                }
            } catch (error) {
                console.error("Error fetching gamification data:", error);
            }
        }
    }, [user?.id, currentBuilding?._id]);

    // Fetch data when dropdown opens
    useEffect(() => {
        if (isProfileDropdown && user?.id) {
            fetchGamificationData();
        }
    }, [isProfileDropdown, user?.id, fetchGamificationData]);

    // Also fetch when building changes
    useEffect(() => {
        fetchGamificationData();
    }, [currentBuilding?._id, fetchGamificationData]);

    // Calculate points to display
    const displayPoints = gamificationData?.points || user?.gamification?.buildings?.[currentBuilding?._id]?.totalPoints || 0;

    // Calculate rank to display
    const displayRank = gamificationData?.rank || user?.gamification?.buildings?.[currentBuilding?._id]?.rank || '-';

    return (
        <React.Fragment>
            <Dropdown isOpen={isProfileDropdown} toggle={toggleProfileDropdown} className={classname}>
                <DropdownToggle tag="button" type="button" className="btn">
                    <span className="d-flex align-items-center">
                        <DropImage
                            userId={user}
                            className="rounded-circle header-profile-user"
                        />
                        <span className="text-start ms-xl-2">
                            <span className="d-none d-xl-inline-block ms-1 fw-medium user-name-text">{user?.firstName}</span>
                            <span className="d-none d-xl-block ms-1 fs-12 text-muted user-name-sub-text">{t(`rolesProf.${user?.role}`)}</span>
                        </span>
                    </span>
                </DropdownToggle>
                <DropdownMenu className="dropdown-menu-end">
                    <h6 className="dropdown-header">{t('profileDropdown.welcome', { name: user?.firstName })}</h6>
                    
                    {/* Dashboard/Home link that changes based on current page */}
                    <DropdownItem className='p-0'>
                        <Link to={isOnLandingPage ? "/dashboard" : "/"} className="dropdown-item">
                            <i className="mdi mdi-view-dashboard text-muted fs-16 align-middle me-1"></i>
                            <span className="align-middle">
                                {isOnLandingPage ? t('profileDropdown.dashboard') : t('profileDropdown.home')}
                            </span>
                        </Link>
                    </DropdownItem>

                    <DropdownItem className='p-0'>
                        <Link to={process.env.PUBLIC_URL + "/profile"} className="dropdown-item">
                            <i className="mdi mdi-account-circle text-muted fs-16 align-middle me-1"></i>
                            <span className="align-middle">{t('profileDropdown.profile')}</span>
                        </Link>
                    </DropdownItem>
                    <DropdownItem className='p-0'>
                        <Link to={process.env.PUBLIC_URL + "/apps-chat"} className="dropdown-item">
                            <i className="mdi mdi-message-text-outline text-muted fs-16 align-middle me-1"></i>
                            <span className="align-middle">{t('profileDropdown.messages')}</span>
                        </Link>
                    </DropdownItem>
   

                    <DropdownItem className='p-0'>
                        <Link to="/task" className="dropdown-item">
                            <i className="mdi mdi-view-column text-muted fs-16 align-middle me-1"></i>
                            <span className="align-middle">{t('profileDropdown.taskboard')}</span>
                        </Link>
                    </DropdownItem>

                    <div className="dropdown-divider"></div>

                    {isGamificationEnabledForBuildingPerAdminSubcription(currentBuilding) &&
                        isGamificationEnabledForBuilding(currentBuilding) &&
                        user?.role === "SyndicateCoowner" && (
                            <>
                                <DropdownItem className="p-0">
                                    <Link to={`${process.env.PUBLIC_URL}/profile`} className="dropdown-item">
                                        <i className="mdi mdi-trophy text-warning fs-16 align-middle me-1"></i>
                                        <span className="align-middle">
                                            {currentBuilding ? t('profileDropdown.buildingPoints', { points: displayPoints }) : t('profileDropdown.points', { points: displayPoints })}
                                        </span>
                                    </Link>
                                </DropdownItem>

                                {currentBuilding && (
                                    <DropdownItem className="p-0">
                                        <Link to={`${process.env.PUBLIC_URL}/profile`} className="dropdown-item">
                                            <i className="mdi mdi-crown text-info fs-16 align-middle me-1"></i>
                                            <span className="align-middle">
                                                {t('profileDropdown.buildingRank', { rank: displayRank })}
                                            </span>
                                        </Link>
                                    </DropdownItem>
                                )}
                            </>
                        )}

                    <DropdownItem className='p-0'>
                        <Link to={process.env.PUBLIC_URL + "/pages-profile-settings"} className="dropdown-item">
                            <i className="mdi mdi-cog-outline text-muted fs-16 align-middle me-1"></i>
                            <span className="align-middle">{t('profileDropdown.settings')}</span>
                        </Link>
                    </DropdownItem>
                    <DropdownItem className='p-0'>
                        <Link to={process.env.PUBLIC_URL + "/logout"} className="dropdown-item">
                            <i className="mdi mdi-logout text-muted fs-16 align-middle me-1"></i>
                            <span className="align-middle">{t('profileDropdown.logout')}</span>
                        </Link>
                    </DropdownItem>
                </DropdownMenu>
            </Dropdown>
        </React.Fragment>
    );
};

export default ProfileDropdown;