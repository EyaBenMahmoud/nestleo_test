import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
    Dropdown,
    DropdownMenu,
    DropdownToggle,
    Form,
    DropdownItem,
    Modal,
    ModalBody,
    ModalHeader,
    ModalFooter,
    Button
} from 'reactstrap';
import { useTranslation } from 'react-i18next';
import api from "../../src/services/api";
//import images
import logoSm from "../assets/images/logo-sm.png";
import logoDark from "../assets/images/logo-dark.png";
import logoLight from "../assets/images/logo-light.png";

//import Components
import SearchOption from '../Components/Common/SearchOption';
import LanguageDropdown from '../Components/Common/LanguageDropdown';
import WebAppsDropdown from '../Components/Common/WebAppsDropdown';
import MyCartDropdown from '../Components/Common/MyCartDropdown';
import FullScreenDropdown from '../Components/Common/FullScreenDropdown';
import NotificationDropdown from '../Components/Common/NotificationDropdown';
import ProfileDropdown from '../Components/Common/ProfileDropdown';
import LightDark from '../Components/Common/LightDark';

import { changeSidebarVisibility } from '../slices/thunks';
import { useSelector, useDispatch } from "react-redux";
import { fetchBuildings, SetCurrentBuilding } from '../slices/buildings/building';
import { isBuildingAdminSubscriptionActive } from '../Components/Subscriptions/subcriptionStatus';
import { logout } from '../slices/login/loginSlice';

const Header = ({ onChangeLayoutMode, layoutModeType, headerClass }) => {
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const { sidebarVisibilitytype } = useSelector(state => ({
        sidebarVisibilitytype: state.Layout.sidebarVisibilitytype
    }));
    const [buildingAssociations, setBuildingAssociations] = useState([]);
    // Get user from redux state
    const user = useSelector(state => state.Loginn.user || {});

    // Get buildings and current building from redux state
    const { buildings = [] } = useSelector(state => state.Building.buildings || []);
    const currentBuilding = useSelector(state => state.Building.currentBuilding || {});


  

    // Then, add a function to handle logout
    const handleLogout = () => {
        dispatch(logout());
        // Optional: Redirect to login page
        window.location.href = '/connect';
    };
    // Replace the fetchBuildingAssociations function with this:
    useEffect(() => {
        const fetchBuildingAssociations = async () => {
            if (user.role === "SyndicateCoowner") {
                try {
                    console.log("Fetching building associations for co-owner");

                    // First, get the associations to check active status
                    const associationsResponse = await api.get('/api/Building/my-associations');
                    console.log("Associations fetched:", associationsResponse.data);
                    setBuildingAssociations(associationsResponse.data);

                    // Also fetch buildings that are active
                    const buildingsResponse = await api.get('/api/Building/my-buildings');
                    console.log("Active buildings fetched:", buildingsResponse.data);

                    // Force refresh the buildings list in Redux
                    dispatch(fetchBuildings());
                } catch (error) {
                    console.error('Error fetching building associations:', error);
                }
            }
        };

        fetchBuildingAssociations();
    }, [user, dispatch]);

    // Fetch buildings on component mount - Modifier cette fonction pour filtrer les bâtiments actifs
    useEffect(() => {
        const loadBuildings = async () => {
            await dispatch(fetchBuildings());
            // Pour les copropriétaires, vérifier si on a besoin de filtrer les bâtiments actifs
            if (user.role === "SyndicateCoowner" && buildingAssociations.length > 0) {
                // Filtrer les bâtiments pour n'afficher que ceux avec un accès actif
                const activeBuildings = buildings.filter(building => {
                    const association = buildingAssociations.find(
                        assoc => assoc.building?._id === building._id
                    );
                    return association?.isActive === true;
                });
                // Si aucun bâtiment actif, effacer le bâtiment courant
                if (activeBuildings.length === 0 && currentBuilding) {
                    dispatch(SetCurrentBuilding(null));
                }
                // Si le bâtiment actuel n'est pas actif, le désélectionner
                else if (currentBuilding) {
                    const currentIsActive = buildingAssociations.some(
                        assoc => assoc.building?._id === currentBuilding._id && assoc.isActive === true
                    );

                    if (!currentIsActive) {
                        dispatch(SetCurrentBuilding(null));
                    }
                }
            }
        };
        loadBuildings();
    }, [dispatch, buildingAssociations]);



    // Fetch buildings on component mount
    useEffect(() => {
        dispatch(fetchBuildings());
    }, [dispatch]);

    // Auto-select building if there's only one
    useEffect(() => {
        // Only run this logic for roles that need building selection AND when buildings have loaded
        if ((user.role === "SyndicateCoowner" || user.role === "SyndicateAdmin") &&
            buildings && buildings.length > 0) {

            // If there's only one building and no current building is set
            if (buildings.length === 1 && !currentBuilding?._id) {
                dispatch(SetCurrentBuilding(buildings[0]));
                setBuildingModalOpen(true);
            }
            // If there are multiple buildings and none selected
            else if (buildings.length > 1 && !currentBuilding?._id) {
                setBuildingSelectionModalOpen(true);
            }
        }
    }, [buildings, currentBuilding, user.role, dispatch]);

    const [search, setSearch] = useState(false);
    const toogleSearch = () => {
        setSearch(!search);
    };

    // Building dropdown state
    const [buildingDropdown, setBuildingDropdown] = useState(false);
    const toggleBuildingDropdown = () => setBuildingDropdown(prevState => !prevState);

    // Modal state for building selection confirmation
    const [buildingModalOpen, setBuildingModalOpen] = useState(false);
    // Modal state for building selection (when multiple buildings)
    const [buildingSelectionModalOpen, setBuildingSelectionModalOpen] = useState(false);

    // Handle building selection
    const handleBuildingSelect = (building) => {
        if (building === null) {
            dispatch(SetCurrentBuilding(null)); // Clear current building for "All Buildings"
            setBuildingModalOpen(true);
        } else {
            dispatch(SetCurrentBuilding(building));
            setBuildingModalOpen(true);
        }

        setBuildingDropdown(false);
        setBuildingSelectionModalOpen(false);
    };

    // Auto-close modal after delay
    useEffect(() => {
        if (buildingModalOpen) {
            const timer = setTimeout(() => {
                setBuildingModalOpen(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [buildingModalOpen]);

    const toogleMenuBtn = () => {
        var windowSize = document.documentElement.clientWidth;
        dispatch(changeSidebarVisibility("show"));

        if (windowSize > 767)
            document.querySelector(".hamburger-icon").classList.toggle('open');

        //For collapse horizontal menu
        if (document.documentElement.getAttribute('data-layout') === "horizontal") {
            document.body.classList.contains("menu") ? document.body.classList.remove("menu") : document.body.classList.add("menu");
        }

        //For collapse vertical and semibox menu
        if (sidebarVisibilitytype === "show" && (document.documentElement.getAttribute('data-layout') === "vertical" || document.documentElement.getAttribute('data-layout') === "semibox")) {
            if (windowSize < 1025 && windowSize > 767) {
                document.body.classList.remove('vertical-sidebar-enable');
                (document.documentElement.getAttribute('data-sidebar-size') === 'sm') ? document.documentElement.setAttribute('data-sidebar-size', '') : document.documentElement.setAttribute('data-sidebar-size', 'sm');
            } else if (windowSize > 1025) {
                document.body.classList.remove('vertical-sidebar-enable');
                (document.documentElement.getAttribute('data-sidebar-size') === 'lg') ? document.documentElement.setAttribute('data-sidebar-size', 'sm') : document.documentElement.setAttribute('data-sidebar-size', 'lg');
            } else if (windowSize <= 767) {
                document.body.classList.add('vertical-sidebar-enable');
                document.documentElement.setAttribute('data-sidebar-size', 'lg');
            }
        }


        //Two column menu
        if (document.documentElement.getAttribute('data-layout') === "twocolumn") {
            document.body.classList.contains('twocolumn-panel') ? document.body.classList.remove('twocolumn-panel') : document.body.classList.add('twocolumn-panel');
        }
    };

    return (
        <React.Fragment>
            <header id="page-topbar" className={headerClass}>
                <div className="layout-width">
                    <div className="navbar-header">
                        <div className="d-flex">

                            <div className="navbar-brand-box horizontal-logo">
                                <Link to="/" className="logo logo-dark">
                                    <span className="logo-sm">
                                        <img src={logoSm} alt="" height="22" />
                                    </span>
                                    <span className="logo-lg">
                                        <img src={logoDark} alt="" height="17" />
                                    </span>
                                </Link>

                                <Link to="/" className="logo logo-light">
                                    <span className="logo-sm">
                                        <img src={logoSm} alt="" height="22" />
                                    </span>
                                    <span className="logo-lg">
                                        <img src={logoLight} alt="" height="17" />
                                    </span>
                                </Link>
                            </div>

                            <button
                                onClick={toogleMenuBtn}
                                type="button"
                                className="btn btn-sm px-3 fs-16 header-item vertical-menu-btn topnav-hamburger"
                                id="topnav-hamburger-icon">
                                <span className="hamburger-icon">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </span>
                            </button>

                        </div>

                        <div className="d-flex align-items-center">
                            {/* Building Selector - Only show for certain roles */}


                            {(user.role === "SyndicateCoowner" || user.role === "SyndicateAdmin") && (
                                <div className="me-2">
                                    <Dropdown isOpen={buildingDropdown} toggle={toggleBuildingDropdown} className="building-selector">
                                        <DropdownToggle
                                            caret
                                            className="btn custom-building-btn text-uppercase fw-bold"
                                        >
                                            {currentBuilding && currentBuilding.name
                                                ? currentBuilding.name
                                                : t('buildingsDrop.selectBuilding')}
                                        </DropdownToggle>
                                        <DropdownMenu className="dropdown-menu-end custom-building-dropdown">
                                            <DropdownItem divider />
                                            {buildings.length > 0 ? (
                                                buildings.map((building) => {
                                                    // For co-owners, check both association status AND admin subscription
                                                    if (user.role === "SyndicateCoowner") {
                                                        const association = buildingAssociations.find(
                                                            assoc => assoc.building?._id === building._id
                                                        );

                                                        // Don't display buildings with inactive association or inactive admin subscription
                                                        if (!association || !association.isActive) {
                                                            return null;
                                                        }

                                                        // Check admin subscription status
                                                        if (!isBuildingAdminSubscriptionActive(building)) {
                                                            // Show building but mark as inactive
                                                            return (
                                                                <DropdownItem
                                                                    key={building._id}
                                                                    disabled
                                                                    className="custom-building-item-inactive"
                                                                >
                                                                    {building.name}
                                                                    <span className="ms-2 badge bg-danger">{t('buildingsDrop.subscriptionInactive')}</span>
                                                                </DropdownItem>
                                                            );
                                                        }
                                                    }

                                                    return (
                                                        <DropdownItem
                                                            key={building._id}
                                                            onClick={() => handleBuildingSelect(building)}
                                                            className="custom-building-item"
                                                        >
                                                            {building.name}
                                                        </DropdownItem>
                                                    );
                                                }).filter(item => item !== null) // Filter out null items
                                            ) : (
                                                <DropdownItem disabled>{t('buildingsDrop.noBuildingsFound')}</DropdownItem>
                                            )}
                                        </DropdownMenu>
                                    </Dropdown>
                                </div>
                            )}

                            {/* LanguageDropdown */}
                            <LanguageDropdown />

                            {/* FullScreenDropdown */}
                            <FullScreenDropdown />

                            {/* NotificationDropdown */}
                            <NotificationDropdown />

                            {/* ProfileDropdown */}
                            <ProfileDropdown />
                        </div>
                    </div>
                </div>
            </header>


            <Modal
                isOpen={buildingSelectionModalOpen}
                toggle={() => setBuildingSelectionModalOpen(!buildingSelectionModalOpen)}
                centered
                fade={true}
                backdrop="static"
                className="building-selection-modal"
                size="md"
            >
                <div className="modal-header-custom d-flex justify-content-between align-items-center">
                    <span>{t('buildingsDrop.selectYourBuilding')}</span>
                    <button
                        type="button"
                        className="btn-close btn-close-white"
                        onClick={() => setBuildingSelectionModalOpen(false)}
                        aria-label="Close"
                    ></button>
                </div>

                <ModalBody className="p-4">
                    <div className="text-center mb-4">
                        <div className="buildings-icon">
                            <i className="ri-building-4-line"></i>
                        </div>
                    </div>

                    <h5 className="mb-4 text-center">
                        {t('buildingsDrop.pleaseSelectBuilding')}
                    </h5>

                    {/* Check if all buildings are inactive */}
                    {user.role === "SyndicateCoowner" &&
                        buildings.length > 0 &&
                        buildings.every(building => {
                            const association = buildingAssociations.find(
                                assoc => assoc.building?._id === building._id
                            );
                            // Either no association, inactive association, or inactive subscription
                            return !association ||
                                !association.isActive ||
                                !isBuildingAdminSubscriptionActive(building);
                        }) && (
                            <div className="alert alert-warning text-center mb-4">
                                <i className="ri-alert-line me-2"></i>
                                {t('buildingsDrop.allBuildingsInactive')}
                            </div>
                        )}

                    <div className="building-list">
                        {buildings.map((building) => {
                            // For co-owners, check building admin subscription status
                            let isDisabled = false;
                            let statusBadge = null;

                            if (user.role === "SyndicateCoowner") {
                                const association = buildingAssociations.find(
                                    assoc => assoc.building?._id === building._id
                                );

                                // Don't display buildings with inactive association
                                if (!association || !association.isActive) {
                                    return null;
                                }

                                // Check admin subscription status
                                if (!isBuildingAdminSubscriptionActive(building)) {
                                    isDisabled = true;
                                    statusBadge = (
                                        <span className="ms-2 badge bg-danger">
                                            {t('buildingsDrop.subscriptionInactive')}
                                        </span>
                                    );
                                }
                            }

                            return (
                                <div
                                    key={building._id}
                                    className={`building-option ${isDisabled ? 'disabled' : ''}`}
                                    onClick={isDisabled ? null : () => handleBuildingSelect(building)}
                                >
                                    <i className="ri-building-line me-2"></i>
                                    <div className="d-flex justify-content-between w-100 align-items-center">
                                        <span>{building.name}</span>
                                        {statusBadge}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="text-center mt-4">
                        {/* Add logout button */}
                        <button
                            className="btn btn-danger me-2"
                            onClick={handleLogout}
                        >
                            <i className="ri-logout-box-line me-1"></i>
                            {t('auth.logout')}
                        </button>

               
                    </div>
                </ModalBody>
            </Modal>
              {/* Building Selection Confirmation Modal */}
            <Modal
                isOpen={buildingModalOpen}
                toggle={() => setBuildingModalOpen(!buildingModalOpen)}
                centered
                fade={true}
                className="building-modal"
                size="md"
            >
                <div className="modal-header-custom">
                    {t('buildingsDrop.buildingSelected')}
                    <button
                        type="button"
                        className="btn-close"
                        onClick={() => setBuildingModalOpen(false)}
                        aria-label={t('buildingsDrop.close')}
                    >
                        <span>×</span>
                    </button>
                </div>

                <ModalBody className="p-4 text-center">
                    <div className="circle-icon mb-4">
                        <i className="ri-check-line"></i>
                    </div>

                    <h4 className="mb-3 building-name">
                        {currentBuilding?.name || t('buildingsDrop.allBuildings')}
                    </h4>

                    <p className="mb-4 building-message">
                        {currentBuilding?.name
                            ? `${t('buildingsDrop.nowViewing')} ${currentBuilding.name}`
                            : t('buildingsDrop.viewingAllBuildings')
                        }
                    </p>

                    <button
                        className="btn continue-btn"
                        onClick={() => setBuildingModalOpen(false)}
                    >
                        {t('buildingsDrop.continue')}
                    </button>
                </ModalBody>
            </Modal>
            <style jsx>{`
                /* Building Dropdown Styling */
                .custom-building-btn {
                    background-color: transparent !important;
                    color: #000000 !important;
                    border-color: #e6485c !important;
                    transition: all 0.3s ease;
                }
                
                .custom-building-btn:hover, 
                .custom-building-btn:focus,
                .show .custom-building-btn {
                    background-color: rgba(230, 72, 92, 0.1) !important;
                    color: #e6485c !important;
                    border-color: #e6485c !important;
                    box-shadow: none !important;
                }

                /* Dropdown Items */
                .custom-building-item {
                    color: #495057;
                    transition: all 0.2s;
                }

/* Disabled building option */
.building-option.disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background-color: #f0f0f0;
}

.building-option.disabled:hover {
    background-color: #f0f0f0;
    color: #495057;
}

/* Dark mode support for disabled items */
[data-layout-mode="dark"] .building-option.disabled {
    background-color: #343a40;
    color: #adb5bd;
}

[data-layout-mode="dark"] .building-option.disabled:hover {
    background-color: #343a40;
    color: #adb5bd;
}
                .custom-building-item:hover, 
                .custom-building-item:focus,
                .custom-building-item:active {
                    color: #e6485c !important;
                    background-color: rgba(230, 72, 92, 0.1) !important;
                }
                
                /* Modal styling to match example */
                .building-modal .modal-content,
                .building-selection-modal .modal-content {
                    border: none;
                    border-radius: 0;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                }
                
                /* Modal header - grey with white text */
                .modal-header-custom {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background-color: #e6485c;
                    color: white;
                    padding: 10px 15px;
                    font-size: 16px;
                    font-weight: 500;
                }
                
                .modal-header-custom .btn-close {
                    padding: 0;
                    margin: 0;
                    font-size: 24px;
                    font-weight: 700;
                    color: white;
                    background: transparent;
                    border: 0;
                    opacity: 0.8;
                }
                
                .modal-header-custom .btn-close:hover {
                    opacity: 1;
                }
                
                /* Circle icon */
                .circle-icon {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background-color: #e6485c;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto;
                }
                
                .circle-icon i {
                    font-size: 40px;
                    color: white;
                }
                
                /* Buildings icon for selection modal */
                .buildings-icon {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background-color: #f8d7dc;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto;
                }
                
                .buildings-icon i {
                    font-size: 40px;
                    color: #e6485c;
                }
                
                /* Building list styling */
                .building-list {
                    max-height: 300px;
                    overflow-y: auto;
                }
                
                .building-option {
                    padding: 12px 16px;
                    border-radius: 6px;
                    margin-bottom: 8px;
                    background-color: #f8f9fa;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 15px;
                    color: #495057;
                    display: flex;
                    align-items: center;
                }
                
                .building-option:hover {
                    background-color: rgba(230, 72, 92, 0.1);
                    color: #e6485c;
                }
                
                /* Building name */
                .building-name {
                    font-size: 18px;
                    font-weight: 600;
                    color: #333;
                }
                
                /* Message */
                .building-message {
                    color: #666;
                    font-size: 14px;
                }
                
                /* Continue button */
                .continue-btn {
                    background-color: #e6485c;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 8px 25px;
                    font-weight: 500;
                }
                
                .continue-btn:hover {
                    background-color: #d13e50;
                    color: white;
                }
                
                /* Dark mode support */
                [data-layout-mode="dark"] .building-name {
                    color: #e9ecef;
                }
                
                [data-layout-mode="dark"] .building-message {
                    color: #a6b0cf;
                }
                
                [data-layout-mode="dark"] .custom-building-btn {
                    color: #f3f3f9 !important;
                }

                [data-layout-mode="dark"] .custom-building-item {
                    color: #e9ecef;
                }
                
                [data-layout-mode="dark"] .building-option {
                    background-color: #2a3042;
                    color: #e9ecef;
                }
                
                [data-layout-mode="dark"] .building-option:hover {
                    background-color: rgba(230, 72, 92, 0.2);
                    color: #e6485c;
                }
            `}</style>
        </React.Fragment>
    );
};

export default Header;