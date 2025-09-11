import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Dropdown,
    DropdownMenu,
    DropdownToggle,
    DropdownItem,
    Modal,
    ModalBody,
    Input,
    Button
} from 'reactstrap';
import { useTranslation } from 'react-i18next';
import api from "../../src/services/api";
import { FaBuilding, FaSearch } from 'react-icons/fa';
//import images
import logoSm from "../assets/images/logo-sm.png";
import logoDark from "../assets/images/logo-dark.png";
import logoLight from "../assets/images/logo-light.png";

//import Components
import LanguageDropdown from '../Components/Common/LanguageDropdown';
import FullScreenDropdown from '../Components/Common/FullScreenDropdown';
import NotificationDropdown from '../Components/Common/NotificationDropdown';
import ProfileDropdown from '../Components/Common/ProfileDropdown';

import { changeSidebarVisibility } from '../slices/thunks';
import { useSelector, useDispatch } from "react-redux";
import { fetchBuildings, SetCurrentBuilding } from '../slices/buildings/building';
import { isBuildingAdminSubscriptionActive } from '../Components/Subscriptions/subcriptionStatus';
import { logout } from '../slices/login/loginSlice';

const Header = ({ onChangeLayoutMode, layoutModeType, headerClass }) => {
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);

    const dispatch = useDispatch();
    const { t } = useTranslation();
    const { sidebarVisibilitytype } = useSelector(state => ({
        sidebarVisibilitytype: state.Layout.sidebarVisibilitytype
    }));

    // Get user from redux state
    const user = useSelector(state => state.Loginn.user || {});

    // Get buildings and current building from redux state
    const { buildings = [] } = useSelector(state => state.Building.buildings || []);
    const currentBuilding = useSelector(state => state.Building.currentBuilding || {});

    // All state declarations at the top
    const [buildingAssociations, setBuildingAssociations] = useState([]);
    const [search, setSearch] = useState(false);
    const [buildingModalOpen, setBuildingModalOpen] = useState(false);
    const [buildingSelectionModalOpen, setBuildingSelectionModalOpen] = useState(false);
    const [loadingBuildings, setLoadingBuildings] = useState(false);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [buildingSearchText, setBuildingSearchText] = useState(''); // New state for building search

    // Function definitions
    const handleLogout = () => {
        dispatch(logout());
        window.location.href = '/connect';
    };

    const toogleSearch = () => {
        setSearch(!search);
    };

    // Modified function to open building selection with loading indicator
    const openBuildingSelectionModal = () => {
        setIsModalLoading(true); // Start loading animation
        setBuildingSearchText(''); // Clear search text when opening modal

        // Show loading spinner for a brief moment before showing the modal
        setTimeout(() => {
            setBuildingSelectionModalOpen(true); // Open the modal
            setModalVisible(true); // Make modal content visible with animation

            // After modal appears, we can stop the loading animation
            setTimeout(() => {
                setIsModalLoading(false);
            }, 400); // Timing matches the modal fade-in duration
        }, 600); // Adjust time as needed for your loading animation
    };

    // When closing the modal, reset the visibility state
    const closeModal = () => {
        setModalVisible(false);
        setTimeout(() => {
            setBuildingSelectionModalOpen(false);
        }, 300); // Time for fade-out animation
    };

    // Handle building selection
    const handleBuildingSelect = (building) => {
        if (building === null) {
            dispatch(SetCurrentBuilding(null)); // Clear current building for "All Buildings"
            setBuildingModalOpen(true);
        } else {
            dispatch(SetCurrentBuilding(building));
            setBuildingModalOpen(true);
        }

        closeModal();
    };

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

    // Filter buildings based on search text
    const filteredBuildings = buildings.filter(building => {
        // First apply role-based filtering
        if (user.role === "SyndicateCoowner") {
            const association = buildingAssociations.find(
                assoc => assoc.building?._id === building._id
            );
            if (!association || !association.isActive) {
                return false;
            }
        }

        // Then apply search text filtering
        if (!buildingSearchText) return true;
        return building.name.toLowerCase().includes(buildingSearchText.toLowerCase());
    });

    // Effects
    // Fetch building associations
    useEffect(() => {
        const fetchBuildingAssociations = async () => {
            if (user.role === "SyndicateCoowner") {
                try {
                    console.log("Fetching building associations for co-owner");
                    setLoadingBuildings(true);

                    // First, get the associations to check active status
                    const associationsResponse = await api.get('/api/Building/my-associations');
                    console.log("Associations fetched:", associationsResponse.data);
                    setBuildingAssociations(associationsResponse.data);

                    // Also fetch buildings that are active
                    const buildingsResponse = await api.get('/api/Building/my-buildings');
                    console.log("Active buildings fetched:", buildingsResponse.data);

                    // Force refresh the buildings list in Redux
                    await dispatch(fetchBuildings());
                } catch (error) {
                    console.error('Error fetching building associations:', error);
                } finally {
                    setLoadingBuildings(false);
                }
            }
        };

        fetchBuildingAssociations();
    }, [user, dispatch]);

    // Fetch buildings and filter active ones
    useEffect(() => {
        const loadBuildings = async () => {
            setLoadingBuildings(true);
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
            setLoadingBuildings(false);
        };
        loadBuildings();
    }, [dispatch, buildingAssociations]);

    // Add this effect to show loading right after login
    useEffect(() => {
        // Show loading immediately after login for roles that need building selection
        if ((user.role === "SyndicateCoowner" || user.role === "SyndicateAdmin") &&
            !currentBuilding?._id && !initialLoadComplete) {
            setIsModalLoading(true);
        }
    }, [user.role, currentBuilding, initialLoadComplete]);

    // Replace the auto-select building useEffect with this version:
    useEffect(() => {
        // Only run this when buildings are available but we haven't shown initial load animation yet
        if (!initialLoadComplete &&
            (user.role === "SyndicateCoowner" || user.role === "SyndicateAdmin") &&
            buildings && buildings.length > 0) {

            // Show loading first, then process building selection after delay
            setIsModalLoading(true);

            // Delay building selection to show loading animation
            setTimeout(() => {
                // For SyndicateCoowner, check if any buildings have active associations first
                if (user.role === "SyndicateCoowner") {
                    // Filter for active building associations
                    const activeBuildingIds = buildingAssociations
                        .filter(assoc => assoc.isActive)
                        .map(assoc => assoc.building?._id);

                    // Get buildings with active associations
                    const availableBuildings = buildings.filter(building =>
                        activeBuildingIds.includes(building._id));

                    // If no active buildings, don't show any modals
                    if (availableBuildings.length === 0) {
                        console.log("No active building associations found for co-owner");
                        setIsModalLoading(false); // Hide loading
                    }
                    // If there's only one active building and no current building is set
                    else if (availableBuildings.length === 1 && !currentBuilding?._id) {
                        dispatch(SetCurrentBuilding(availableBuildings[0]));
                        setIsModalLoading(false); // Hide loading
                        setBuildingModalOpen(true);
                    }
                    // If there are multiple active buildings and none selected
                    else if (availableBuildings.length > 1 && !currentBuilding?._id) {
                        // Show modal with animation
                        setBuildingSelectionModalOpen(true);
                        setModalVisible(true);

                        // After a slight delay to let modal appear
                        setTimeout(() => {
                            setIsModalLoading(false);
                        }, 400);
                    } else {
                        setIsModalLoading(false); // Hide loading in other cases
                    }
                }
                // For SyndicateAdmin - similar logic
                else if (user.role === "SyndicateAdmin") {
                    // If there's only one building and no current building is set
                    if (buildings.length === 1 && !currentBuilding?._id) {
                        dispatch(SetCurrentBuilding(buildings[0]));
                        setIsModalLoading(false); // Hide loading
                        setBuildingModalOpen(true);
                    }
                    // If there are multiple buildings and none selected
                    else if (buildings.length > 1 && !currentBuilding?._id) {
                        // Show modal with animation
                        setBuildingSelectionModalOpen(true);
                        setModalVisible(true);

                        // After a slight delay to let modal appear
                        setTimeout(() => {
                            setIsModalLoading(false);
                        }, 400);
                    } else {
                        setIsModalLoading(false); // Hide loading in other cases
                    }
                } else {
                    setIsModalLoading(false); // Hide loading in other cases
                }

                // Mark initial load as complete so this only runs once
                setInitialLoadComplete(true);
            }, 1000); // Show loading for a full second
        }
    }, [buildings, currentBuilding, user.role, buildingAssociations, dispatch, initialLoadComplete]);

    // If modal is closed, reset modal visible state
    useEffect(() => {
        if (!buildingSelectionModalOpen) {
            setModalVisible(false);
        }
    }, [buildingSelectionModalOpen]);

    // Auto-close modal after delay
    useEffect(() => {
        if (buildingModalOpen) {
            const timer = setTimeout(() => {
                setBuildingModalOpen(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [buildingModalOpen]);

    // Add this effect to specifically handle SyndicateAdmin with no buildings
    useEffect(() => {
        // This effect only runs for SyndicateAdmin with no buildings
        if (user.role === "SyndicateAdmin" &&
            buildings !== undefined &&
            buildings.length === 0 &&
            isModalLoading &&
            !initialLoadComplete) {

            console.log("SyndicateAdmin with no buildings - showing brief loading");

            // Show brief loading animation (2 seconds) then dismiss
            const timer = setTimeout(() => {
                console.log("Brief loading complete for admin with no buildings");
                setIsModalLoading(false);
                setInitialLoadComplete(true);

                // Optional: Show a toast notification informing the admin
                // toast.info(t('buildingsDrop.adminNoBuildingsMessage'));
            }, 2000); // 2 second loading

            return () => clearTimeout(timer);
        }
    }, [user.role, buildings, isModalLoading, initialLoadComplete]);

    return (
        <React.Fragment>
            {/* Pre-modal loading spinner (visible when isModalLoading is true) */}
            {isModalLoading && (
                <div className="global-modal-loading">
                    <div className="loading-animation">
                        <div className="loading-bar"></div>
                        <div className="loading-bar"></div>
                        <div className="loading-bar"></div>
                        <div className="loading-building">
                            <FaBuilding />
                        </div>
                    </div>
                    <p className="loading-text">{t('buildingsDrop.preparingBuildings')}</p>
                </div>
            )}

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
                            {/* Building Selector Button - Only show for certain roles */}
                            {(user.role === "SyndicateCoowner" || user.role === "SyndicateAdmin") && (
                                <div className="me-2">
                                    <Button
                                        color="light"
                                        className="btn-building-select"
                                        onClick={openBuildingSelectionModal}
                                    >
                                        <i className="ri-building-line me-1"></i>
                                        {currentBuilding && currentBuilding.name
                                            ? currentBuilding.name
                                            : t('buildingsDrop.selectBuilding')}
                                    </Button>
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

            {/* Building Selection Modal with Loading Animation */}
            <Modal
                isOpen={buildingSelectionModalOpen}
                toggle={closeModal}
                centered
                fade={true}
                backdrop="static"
                className={`building-selection-modal ${modalVisible ? 'modal-visible' : ''}`}
                size="md"
            >
                <div className="modal-header-custom d-flex justify-content-between align-items-center">
                    <span>{t('buildingsDrop.selectYourBuilding')}</span>
                    <button
                        type="button"
                        className="btn-close btn-close-white"
                        onClick={closeModal}
                        aria-label="Close"
                    ></button>
                </div>

                <ModalBody className="p-4">
                    {/* Loading animation when buildings are loading */}
                    {loadingBuildings ? (
                        <div className="loading-container">
                            <div className="loading-animation">
                                <div className="loading-bar"></div>
                                <div className="loading-bar"></div>
                                <div className="loading-bar"></div>
                                <div className="loading-building">
                                    <FaBuilding />
                                </div>
                            </div>
                            <p className="loading-text">{t('buildingsDrop.loadingBuildings')}</p>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-4">
                                <div className="buildings-icon">
                                    <i className="ri-building-4-line"></i>
                                </div>
                            </div>

                            <h5 className="mb-4 text-center">
                                {t('buildingsDrop.pleaseSelectBuilding')}
                            </h5>

                            {/* Building Search Input */}
                            <div className="mb-4">
                                <div className="search-box">
                                    <Input
                                        type="text"
                                        className="form-control search"
                                        placeholder={t('buildingsDrop.searchBuildings')}
                                        value={buildingSearchText}
                                        onChange={(e) => setBuildingSearchText(e.target.value)}
                                    />
                                    <i className="ri-search-line search-icon"></i>
                                    {buildingSearchText && (
                                        <Button
                                            color="link"
                                            className="btn-close-search"
                                            onClick={() => setBuildingSearchText("")}
                                        >
                                            <i className="ri-close-line"></i>
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* No active buildings case */}
                            {user.role === "SyndicateCoowner" &&
                                (buildingAssociations.filter(assoc => assoc.isActive).length === 0) && (
                                    <div className="alert alert-warning text-center mb-4">
                                        <i className="ri-alert-line me-2"></i>
                                        {t('buildingsDrop.noActiveBuildings')}
                                        <p className="mt-2 small">
                                            {t('buildingsDrop.waitForApproval')}
                                        </p>
                                    </div>
                                )}

                            {/* Existing all buildings inactive check */}
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

                            {/* Building list - now using filteredBuildings */}
                            <div className="building-list">
                                {filteredBuildings.map((building) => {
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

                                {/* Show message if no buildings to display after filtering */}
                                {!loadingBuildings && filteredBuildings.length === 0 && (
                                    <div className="text-center py-4">
                                        <i className="ri-building-line fs-1 mb-2 text-muted"></i>
                                        <p className="text-muted">
                                            {buildingSearchText
                                                ? t('buildingsDrop.noSearchResults')
                                                : t('buildingsDrop.noBuildingsAvailable')
                                            }
                                        </p>


                                        {/* No buildings actions */}
                                        <div className="mt-3">
                                            {user.role === "SyndicateAdmin" ? (
                                                <div className="d-flex flex-column flex-sm-row justify-content-center gap-2">
                                                    <Button
                                                        color="primary"
                                                        tag={Link}
                                                        to="/BuildingInterface"
                                                        className="px-4 btn-sm"
                                                        onClick={closeModal}
                                                    >
                                                        <i className="ri-add-circle-line me-1"></i>
                                                        {t('buildingsDrop.createNewBuilding')}
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button
                                                    color="light"
                                                    onClick={closeModal}
                                                    className="px-4 btn-sm"
                                                >
                                                    <i className="ri-close-line me-1"></i>
                                                    {t('buildingsDrop.close')}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>


                            <div className="text-center mt-3">
                                <div className="d-flex justify-content-center gap-2">
                                    {/* Cancel button */}
                                    <Button
                                        color="light"
                                        size="sm"
                                        className="me-2"
                                        onClick={closeModal}
                                    >
                                        <i className="ri-close-line me-1"></i>
                                        {t('buildingsDrop.close')}
                                    </Button>

                                    {/* Logout button */}
                                    <Button
                                        color="danger"
                                        size="sm"
                                        onClick={handleLogout}
                                    >
                                        <i className="ri-logout-box-line me-1"></i>
                                        {t('auth.logout')}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
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
    /* Building Selection Button Styling */
    .btn-building-select {
        background-color: transparent !important;
        color: #000000 !important;
        border-color: #e6485c !important;
        transition: all 0.3s ease;
        text-transform: uppercase;
        font-weight: bold;
    }
    
    .btn-building-select:hover, 
    .btn-building-select:focus {
        background-color: rgba(230, 72, 92, 0.1) !important;
        color: #e6485c !important;
        border-color: #e6485c !important;
        box-shadow: none !important;
    }
    
    /* Search input styling */
    .search-box {
        position: relative;
        margin-bottom: 1rem;
    }
    
    .search-box .search {
        padding-left: 38px;
        padding-right: 38px;
        border-radius: 30px;
    }
    
    .search-box .search-icon {
        position: absolute;
        left: 13px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 16px;
        color: #74788d;
    }
    
    .search-box .btn-close-search {
        position: absolute;
        right: 13px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 16px;
        color: #74788d;
        background: transparent;
        border: none;
        padding: 0;
        cursor: pointer;
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
    
    /* Loading animation styles */
    .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 300px;
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
        color: #e6485c; /* Updated to match modal header */
    }
    
    .loading-bar {
        width: 12px;
        height: 5px;
        background: #e6485c; /* Updated to match modal header */
        margin: 0 4px;
        border-radius: 10px;
        animation: loading-wave 1s infinite ease-in-out;
        transform-origin: bottom;
        box-shadow: 0 2px 4px rgba(230, 72, 92, 0.3);
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
        color: #e6485c; /* Updated to match modal header */
        font-size: 1.8rem;
        animation: loading-bounce 1s infinite alternate ease-in-out;
        filter: drop-shadow(0 3px 3px rgba(230, 72, 92, 0.3));
    }
    
    /* Global modal loading overlay */
    .global-modal-loading {
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
    
    [data-layout-mode="dark"] .global-modal-loading {
        background: rgba(30, 34, 40, 0.9);
    }
    
    /* Modal visibility animations */
    .modal-visible .modal-content {
        animation: modalFadeIn 0.4s ease forwards;
    }
    
    @keyframes modalFadeIn {
        from {
            opacity: 0;
            transform: translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes loading-wave {
        0%, 100% { height: 5px; }
        50% { height: 35px; }
    }
    
    @keyframes loading-bounce {
        0% { transform: translateY(0); }
        100% { transform: translateY(-12px); }
    }
    
    /* Dark mode support */
    [data-layout-mode="dark"] .building-name {
        color: #e9ecef;
    }
    
    [data-layout-mode="dark"] .building-message {
        color: #a6b0cf;
    }
    
    [data-layout-mode="dark"] .btn-building-select {
        color: #f3f3f9 !important;
    }

    [data-layout-mode="dark"] .building-option {
        background-color: #2a3042;
        color: #e9ecef;
    }
    
    [data-layout-mode="dark"] .building-option:hover {
        background-color: rgba(230, 72, 92, 0.2);
        color: #e6485c;
    }
    
    [data-layout-mode="dark"] .search-box .search {
        background-color: #2a3042;
        border-color: #32394e;
        color: #e9ecef;
    }
    
    [data-layout-mode="dark"] .search-box .search-icon,
    [data-layout-mode="dark"] .search-box .btn-close-search {
        color: #a6b0cf;
    }
`}</style>
        </React.Fragment>
    );
};

export default Header;