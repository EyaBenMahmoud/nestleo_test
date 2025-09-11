import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card, CardBody, CardHeader, Col, Container, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Input, Label, Nav, NavItem, NavLink, Pagination, PaginationItem, PaginationLink, Progress, Row, TabContent, Table, TabPane, UncontrolledCollapse, UncontrolledDropdown } from 'reactstrap';
import classnames from 'classnames';
import { Swiper, SwiperSlide } from "swiper/react";
import SwiperCore from "swiper";
import { useTranslation } from 'react-i18next';

//Images
import profileBg from '../../../../assets/images/profile-bg.jpg';

import { getMaxDocumentSize, getRemainingDocumentStorage, isGamificationEnabledForBuilding, isGamificationEnabledForBuildingPerAdminSubcription } from '../../../../Components/Subscriptions/SubcriptionValidator';

import { projects, document } from '../../../../common/data';
import { useDispatch, useSelector } from 'react-redux';
import { getUser } from '../../../../services/api';
import { setUser } from '../../../../slices/login/loginSlice';
import DelegationTabs from '../../../../Components/Delegate/DelegationTabs';
import AvatarDisplay from '../../../../Components/Common/displayAvatar';
import DropImage from '../../../../Components/Common/displayDropdown';
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { toast } from 'react-toastify';
import buildingImage from "../../../../assets/images/office-building.png";
import { fetchDocuments, uploadDocument, downloadDocument, deleteDocument, previewDocument } from '../../../../slices/Document/documentSlice';
import GamificationProfile from '../../../../Components/Hooks/gamification';
import ProfileContractList from "./ProfileContractList";

const SimplePage = () => {
const { t } = useTranslation();
    SwiperCore.use([]);

    const [activeTab, setActiveTab] = useState('1');
    const [activityTab, setActivityTab] = useState('1');
    const [previewModal, setPreviewModal] = useState(false);
    const [currentPreviewDoc, setCurrentPreviewDoc] = useState(null);
    const dispatch = useDispatch();
    const { documents, loading, error, uploadLoading } = useSelector((state) => state.document);
    const { user } = useSelector(state => state.Loginn);
    const currentBuilding = useSelector(state => state.Building.currentBuilding);
    const [previewUrl, setPreviewUrl] = useState(null);
    useEffect(() => {
        if (!user) {
            const fetchUser = async () => {
                const userData = await getUser(); // Fetch user data from API
                dispatch(setUser(userData)); // Dispatch action to set user in Redux store
            };
            fetchUser();

        }
    }, [dispatch, user]);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (currentBuilding?._id) {
            dispatch(fetchDocuments(currentBuilding._id));
        }
    }, [currentBuilding, dispatch]);

    // Handle initial tab selection based on URL hash
    useEffect(() => {
        const hash = window.location.hash;
        if (hash === '#delegations' && user?.role === 'SyndicateCoowner') {
            setActiveTab('5');
        } else if (hash === '#documents') {
            setActiveTab('4');
        } else if (hash === '#contracts') {
            setActiveTab('3');
        } else if (hash === '#activities') {
            setActiveTab('2');
        } else if (hash === '#overview-tab' || !hash) {
            setActiveTab('1');
        }
    }, [user]);



    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.type !== 'application/pdf') {
            toast.error('Only PDF files are allowed');
            e.target.value = '';
            return;
        }
        // Calculate file size in MB
        const fileSizeMB = file.size / (1024 * 1024);
        // Check against subscription limits
        if (user?.subscription?.planId?.features) {
            const maxDocSize = getMaxDocumentSize(user);
            if (maxDocSize !== -1 && maxDocSize !== Infinity) {
                // Calculate current usage
                const usedStorageMB = documents.reduce((total, doc) =>
                    total + ((doc.fileSize || 0) / (1024 * 1024)), 0);
                // Check if this upload would exceed limits
                if ((usedStorageMB + fileSizeMB) > maxDocSize) {
                    const remainingMB = Math.max(0, maxDocSize - usedStorageMB);
                    toast.error(`File too large. You have ${remainingMB.toFixed(2)} MB remaining of your ${maxDocSize} MB storage limit.`);
                    e.target.value = '';
                    return;
                }
            }
        }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', file.name);
        dispatch(uploadDocument({ buildingId: currentBuilding._id, formData }));
        e.target.value = '';
    };












    const handlePreview = async (document) => {
        try {
            setCurrentPreviewDoc(document);
            const result = await dispatch(previewDocument(document._id)).unwrap();
            setPreviewUrl(result); // Use the URL returned from the action
            setPreviewModal(true);
        } catch (error) {
            console.error('Error previewing document:', error);
            toast.error("Failed to preview document");
        }
    };
    // Add cleanup effect for blob URLs
    useEffect(() => {
        return () => {
            if (previewUrl) {
                window.URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);
    const handleDownload = async (documentId) => {
        try {
            await dispatch(downloadDocument(documentId)).unwrap();
        } catch (error) {
            console.error('Error downloading document:', error);
        }
    };

    const handleDelete = async (documentId) => {
        if (window.confirm('Are you sure you want to delete this document?')) {
            try {
                await dispatch(deleteDocument({
                    documentId,
                    buildingId: currentBuilding._id
                })).unwrap();
            } catch (error) {
                console.error('Error deleting document:', error);
            }
        }
    };

    const toggleTab = (tab) => {
        if (activeTab !== tab) {
            setActiveTab(tab);
        }
    };

    const toggleActivityTab = (tab) => {
        if (activityTab !== tab) {
            setActivityTab(tab);
        }
    };

    document.title = t('profile.pageTitle') || "Profile | Nestleo";
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [currentPage, setCurrentPage] = useState(1);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const toggleDropdown = () => setDropdownOpen(!dropdownOpen);
    const totalPages = Math.ceil(documents.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentDocuments = documents.slice(indexOfFirstItem, indexOfLastItem);


    // Add a function to handle page changes
    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };
    return (
    <React.Fragment>
        <div className="page-content">
            <Container fluid>
                <div className="profile-foreground position-relative mx-n4 mt-n4">
                    <div className="profile-wid-bg">
                        <img src={profileBg} alt="" className="profile-wid-img" />
                    </div>
                </div>
                <div className="pt-4 mb-4 mb-lg-3 pb-lg-4">
                    <Row className="g-4">
                        <div className="col-auto">
                            <div className="avatar-lg">
                                <DropImage
                                    userId={user}
                                    className={"img-thumbnail rounded-circle"} />
                            </div>
                        </div>

                        <Col>
                            <div className="p-2">
                                <h3 className="text-white mb-1">{user?.firstName} {user?.lastName}</h3>
                                <p className="text-white-75">{user?.role}</p>
                                <div className="hstack text-white-50 gap-1">
                                    <div className="me-2"><i
                                        className="ri-map-pin-user-line me-1 text-white-75 fs-16 align-middle"></i>{user?.city}, {user?.country}</div>
                                    <div><i
                                        className="ri-building-line me-1 text-white-75 fs-16 align-middle"></i>{user?.website}</div>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </div>

                <Row>
                    <Col lg={12}>
                        <div>
                            <div className="d-flex">
                                <Nav pills className="animation-nav profile-nav gap-2 gap-lg-3 flex-grow-1"
                                    role="tablist">
                                    <NavItem>
                                        <NavLink
                                            href="#overview-tab"
                                            className={classnames({ active: activeTab === '1' })}
                                            onClick={() => { toggleTab('1'); }}
                                        >
                                            <i className="ri-airplay-fill d-inline-block d-md-none"></i> <span
                                                className="d-none d-md-inline-block">{t('profile.overview')}</span>
                                        </NavLink>
                                    </NavItem>
                                    {isGamificationEnabledForBuildingPerAdminSubcription(currentBuilding) &&
                                        isGamificationEnabledForBuilding(currentBuilding) &&
                                        user?.role === 'SyndicateCoowner' && (
                                            <NavItem>
                                                <NavLink
                                                    href="#activities"
                                                    className={classnames({ active: activeTab === '2' })}
                                                    onClick={() => { toggleTab('2'); }}
                                                >
                                                    <i className="ri-list-unordered d-inline-block d-md-none"></i>
                                                    <span className="d-none d-md-inline-block">{t('profile.gamification')}</span>
                                                </NavLink>
                                            </NavItem>
                                        )}

                                    <NavItem>
                                        <NavLink
                                            href="#contracts"
                                            className={classnames({ active: activeTab === '3' })}
                                            onClick={() => { toggleTab('3'); }}
                                        >
                                            <i className="ri-file-contract-line d-inline-block d-md-none"></i> <span
                                                className="d-none d-md-inline-block">{t('profile.contracts')}</span>
                                        </NavLink>
                                    </NavItem>
                                    <NavItem>
                                        {(user?.role === 'SyndicateAdmin' || user?.role === 'SyndicateCoowner') && (
                                            <NavLink
                                                href="#documents"
                                                className={classnames({ active: activeTab === '4' })}
                                                onClick={() => { toggleTab('4'); }}
                                            >
                                                <i className="ri-folder-4-line d-inline-block d-md-none"></i> <span
                                                    className="d-none d-md-inline-block">{t('profile.documents')}</span>
                                            </NavLink>
                                        )}
                                    </NavItem>
                                    <NavItem>
                                        {(user?.role === 'SyndicateCoowner') && (
                                            <NavLink
                                                href="#delegations"
                                                className={classnames({ active: activeTab === '5' })}
                                                onClick={(e) => { 
                                                    e.preventDefault();
                                                    // Force page refresh when navigating to delegations tab
                                                    window.location.href = window.location.pathname + '#delegations';
                                                    window.location.reload();
                                                }}
                                            >
                                                <i className="ri-user-settings-line d-inline-block d-md-none"></i> <span
                                                    className="d-none d-md-inline-block">{t('delegation.title')}</span>
                                            </NavLink>
                                        )}
                                    </NavItem>
                                </Nav>
                                <div className="flex-shrink-0">
                                    <Link to="/pages-profile-settings" className="btn btn-success"><i
                                        className="ri-edit-box-line align-bottom"></i> {t('profile.editProfile')}</Link>
                                </div>
                            </div>

                            <TabContent activeTab={activeTab} className="pt-4">
                                <TabPane tabId="1">
                                    <Row>
                                        <Col xxl={3}>
                                            <Card>
                                                <CardBody>
                                                    <h5 className="card-title mb-3">{t('profile.info')}</h5>
                                                    <div className="table-responsive">
                                                        <Table className="table-borderless mb-0">
                                                            <tbody>
                                                                <tr>
                                                                    <th className="ps-0" scope="row">{t('profile.fullName')}:</th>
                                                                    <td className="text-muted">{user?.firstName} {user?.lastName}</td>
                                                                </tr>
                                                                <tr>
                                                                    <th className="ps-0" scope="row">{t('profile.mobile')}:</th>
                                                                    <td className="text-muted">{user?.phoneNumber}</td>
                                                                </tr>
                                                                <tr>
                                                                    <th className="ps-0" scope="row">{t('profile.email')}:</th>
                                                                    <td className="text-muted">{user?.email}</td>
                                                                </tr>
                                                                <tr>
                                                                    <th className="ps-0" scope="row">{t('profile.location')}:</th>
                                                                    <td className="text-muted">{user?.city}, {user?.country}</td>
                                                                </tr>
                                                                
                                                            </tbody>
                                                        </Table>
                                                    </div>
                                                </CardBody>
                                            </Card>
                                        </Col>
                                        <Col xxl={9}>
                                            <Card>
                                                <CardBody>
                                                    <h5 className="card-title mb-3">{t('profile.about')}</h5>
                                                    <p>{user?.description}</p>
                                                </CardBody>
                                            </Card>
                                            <Card>
                                                <CardBody>
                                                    <h5 className="card-title mb-3">{t('profile.details')}</h5>
                                                    <Row>
                                                        {/* First Name */}
                                                        <Col xs={6} md={4}>
                                                            <div className="d-flex mt-4">
                                                                <div className="flex-shrink-0 avatar-xs align-self-center me-3">
                                                                    <div className="avatar-title bg-light rounded-circle fs-16 text-navbar">
                                                                        <i className="ri-user-2-fill"></i>
                                                                    </div>
                                                                </div>
                                                                <div className="flex-grow-1 overflow-hidden">
                                                                    <p className="mb-1">{t('profile.firstName')}:</p>
                                                                    <h6 className="text-truncate mb-0">{user?.firstName}</h6>
                                                                </div>
                                                            </div>
                                                        </Col>

                                                        {/* Last Name */}
                                                        <Col xs={6} md={4}>
                                                            <div className="d-flex mt-4">
                                                                <div className="flex-shrink-0 avatar-xs align-self-center me-3">
                                                                    <div className="avatar-title bg-light rounded-circle fs-16 text-navbar">
                                                                        <i className="ri-user-2-fill"></i>
                                                                    </div>
                                                                </div>
                                                                <div className="flex-grow-1 overflow-hidden">
                                                                    <p className="mb-1">{t('profile.lastName')}:</p>
                                                                    <h6 className="text-truncate mb-0">{user?.lastName}</h6>
                                                                </div>
                                                            </div>
                                                        </Col>

                                                        {/* Email */}
                                                        <Col xs={6} md={4}>
                                                            <div className="d-flex mt-4">
                                                                <div className="flex-shrink-0 avatar-xs align-self-center me-3">
                                                                    <div className="avatar-title bg-light rounded-circle fs-16 text-navbar">
                                                                        <i className="ri-mail-fill"></i>
                                                                    </div>
                                                                </div>
                                                                <div className="flex-grow-1 overflow-hidden">
                                                                    <p className="mb-1">{t('profile.email')}:</p>
                                                                    <h6 className="text-truncate mb-0">{user?.email}</h6>
                                                                </div>
                                                            </div>
                                                        </Col>

                                                        {/* Phone Number */}
                                                        <Col xs={6} md={4}>
                                                            <div className="d-flex mt-4">
                                                                <div className="flex-shrink-0 avatar-xs align-self-center me-3">
                                                                    <div className="avatar-title bg-light rounded-circle fs-16 text-navbar">
                                                                        <i className="ri-phone-fill"></i>
                                                                    </div>
                                                                </div>
                                                                <div className="flex-grow-1 overflow-hidden">
                                                                    <p className="mb-1">{t('profile.phoneNumber')}:</p>
                                                                    <h6 className="text-truncate mb-0">{user?.phoneNumber}</h6>
                                                                </div>
                                                            </div>
                                                        </Col>

                                                        {/* City */}
                                                        <Col xs={6} md={4}>
                                                            <div className="d-flex mt-4">
                                                                <div className="flex-shrink-0 avatar-xs align-self-center me-3">
                                                                    <div className="avatar-title bg-light rounded-circle fs-16 text-navbar">
                                                                        <i className="ri-map-pin-fill"></i>
                                                                    </div>
                                                                </div>
                                                                <div className="flex-grow-1 overflow-hidden">
                                                                    <p className="mb-1">{t('profile.city')}:</p>
                                                                    <h6 className="text-truncate mb-0">{user?.city}</h6>
                                                                </div>
                                                            </div>
                                                        </Col>

                                                        {/* Country */}
                                                        <Col xs={6} md={4}>
                                                            <div className="d-flex mt-4">
                                                                <div className="flex-shrink-0 avatar-xs align-self-center me-3">
                                                                    <div className="avatar-title bg-light rounded-circle fs-16 text-navbar">
                                                                        <i className="ri-global-fill"></i>
                                                                    </div>
                                                                </div>
                                                                <div className="flex-grow-1 overflow-hidden">
                                                                    <p className="mb-1">{t('profile.country')}:</p>
                                                                    <h6 className="text-truncate mb-0">{user?.country}</h6>
                                                                </div>
                                                            </div>
                                                        </Col>

                                                        {/* Zip Code */}
                                                        <Col xs={6} md={4}>
                                                            <div className="d-flex mt-4">
                                                                <div className="flex-shrink-0 avatar-xs align-self-center me-3">
                                                                    <div className="avatar-title bg-light rounded-circle fs-16 text-navbar">
                                                                        <i className="ri-map-pin-2-fill"></i>
                                                                    </div>
                                                                </div>
                                                                <div className="flex-grow-1 overflow-hidden">
                                                                    <p className="mb-1">{t('profile.zipCode')}:</p>
                                                                    <h6 className="text-truncate mb-0">{user?.zipCode}</h6>
                                                                </div>
                                                            </div>
                                                        </Col>
                                                    </Row>
                                                </CardBody>
                                            </Card>
                                    
                                        </Col>
                                    </Row>
                                </TabPane>
                                {isGamificationEnabledForBuildingPerAdminSubcription(currentBuilding) &&
                                    isGamificationEnabledForBuilding(currentBuilding) &&
                                    user?.role === 'SyndicateCoowner' && (
                                        <TabPane tabId="2">
                                            <Card>
                                                <CardBody>
                                                    <h5 className="card-title mb-3">{t('profile.gamification')}</h5>
                                                    <div className="acitivity-timeline">
                                                        <GamificationProfile userId={user.id} />
                                                    </div>
                                                </CardBody>
                                            </Card>
                                        </TabPane>)}
                                <TabPane tabId="3">
                                    <Card>
                                        <CardBody>
                                            <h5 className="card-title mb-3">{t('profile.contracts')}</h5>
                                            <ProfileContractList />
                                        </CardBody>
                                    </Card>
                                </TabPane>

                                <TabPane tabId="4">
                                    <Card>
                                        <CardBody>
                                            <div className="d-flex align-items-center mb-4">
                                                <h5 className="card-title flex-grow-1 mb-0">{t('profile.documentsTitle')}</h5>
                                                <div className="flex-shrink-0">
                                                    <Input
                                                        innerRef={fileInputRef}
                                                        className="form-control d-none"
                                                        type="file"
                                                        id="documentUpload"
                                                        onChange={handleFileChange}
                                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                                        disabled={!currentBuilding?._id}
                                                    />
                                                    {(user.role === 'SyndicateAdmin') && (
                                                        <Label
                                                            htmlFor="documentUpload"
                                                            className={`btn btn-danger ${uploadLoading ? 'disabled' : ''} ${!currentBuilding?._id ? 'disabled' : ''}`}
                                                        >
                                                            {uploadLoading ? t('profile.uploading') : (
                                                                <>
                                                                    <i className="ri-upload-2-fill me-1 align-bottom"></i> {t('profile.uploadFile')}
                                                                </>
                                                            )}
                                                        </Label>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Add Storage Usage Indicator */}
                                            {currentBuilding?._id && user?.subscription?.planId?.features && (
                                                <div className="mb-4">
                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                        <h6 className="mb-0">{t('profile.storageUsage')}</h6>
                                                        <span>
                                                            {(() => {
                                                                // Find the document storage limit feature in the subscription
                                                                const docFeature = user.subscription.planId.features.find(f =>
                                                                    f.name.toLowerCase().includes("partage de documents") ||
                                                                    f.name.toLowerCase().includes("document") ||
                                                                    (f.name.toLowerCase().includes("mo") && !f.name.toLowerCase().includes("immeuble"))
                                                                );

                                                                // Calculate document sizes directly from the documents array in state
                                                                const usedStorageMB = documents.reduce((total, doc) =>
                                                                    total + ((doc.fileSize || 0) / (1024 * 1024)), 0);

                                                                // Extract max size from the feature or use subscription type
                                                                let maxStorageMB = 0;

                                                                // Set default values based on subscription type
                                                                if (user.subscription.planId.subscriptionType === 'Pro') {
                                                                    maxStorageMB = 50; // Pro plan has 50MB
                                                                    console.log("Using Pro plan default: 50MB");
                                                                } else if (user.subscription.planId.subscriptionType === 'Expert') {
                                                                    maxStorageMB = 100; // Expert plan has 100MB
                                                                    console.log("Using Expert plan default: 100MB");
                                                                } else if (user.subscription.planId.subscriptionType === 'Découverte') {
                                                                    maxStorageMB = 5; // Basic plan has 5MB
                                                                    console.log("Using Découverte plan default: 5MB");
                                                                }

                                                                // If feature found, try to extract value from it
                                                                if (docFeature) {
                                                                    console.log("Feature name:", docFeature.name);

                                                                    // Check if the feature has a numeric value in the name
                                                                    const valueMatch = docFeature.name.match(/:\s*(\d+|Illimité)/i);
                                                                    console.log("Value match:", valueMatch);

                                                                    if (valueMatch && valueMatch[1] !== '0') {
                                                                        // Only use the value if it's not zero
                                                                        maxStorageMB = valueMatch[1].toLowerCase() === 'illimité' ? -1 : parseInt(valueMatch[1]);
                                                                        console.log("Using value from feature name:", maxStorageMB);
                                                                    } else if (docFeature.metadata?.value !== undefined && docFeature.metadata.value !== '0') {
                                                                        // Only use metadata value if it's not zero
                                                                        maxStorageMB = docFeature.metadata.value === 'Illimité' ? -1 : parseInt(docFeature.metadata.value);
                                                                        console.log("Using metadata value:", maxStorageMB);
                                                                    }
                                                                    // If the feature value is 0, stick with the subscription type default
                                                                }

                                                                console.log("Final max storage MB:", maxStorageMB);

                                                                if (maxStorageMB === -1) {
                                                                    return `${usedStorageMB.toFixed(2)} MB ${t('profile.of')} ${t('profile.unlimited')}`;
                                                                }

                                                                return `${usedStorageMB.toFixed(2)} MB ${t('profile.of')} ${maxStorageMB} MB (${Math.max(0, maxStorageMB - usedStorageMB).toFixed(2)} MB ${t('profile.remaining')})`;
                                                            })()}
                                                        </span>
                                                    </div>
                                                    {(() => {
                                                        // Find the document storage feature in the subscription
                                                        const docFeature = user.subscription.planId.features.find(f =>
                                                            f.name.toLowerCase().includes("partage de documents") ||
                                                            f.name.toLowerCase().includes("document") ||
                                                            (f.name.toLowerCase().includes("mo") && !f.name.toLowerCase().includes("immeuble"))
                                                        );

                                                        // Calculate document sizes from the documents array
                                                        const usedStorageMB = documents.reduce((total, doc) =>
                                                            total + ((doc.fileSize || 0) / (1024 * 1024)), 0);

                                                        // Set default values based on subscription type
                                                        let maxStorageMB = 0;
                                                        if (user.subscription.planId.subscriptionType === 'Pro') {
                                                            maxStorageMB = 50; // Pro plan has 50MB
                                                        } else if (user.subscription.planId.subscriptionType === 'Expert') {
                                                            maxStorageMB = 100; // Expert plan has 100MB
                                                        } else if (user.subscription.planId.subscriptionType === 'Découverte') {
                                                            maxStorageMB = 5; // Basic plan has 5MB
                                                        }

                                                        // If feature found, try to extract value from it
                                                        if (docFeature) {
                                                            // Check if the feature has a numeric value in the name
                                                            const valueMatch = docFeature.name.match(/:\s*(\d+|Illimité)/i);
                                                            if (valueMatch && valueMatch[1] !== '0') {
                                                                // Only use the value if it's not zero
                                                                maxStorageMB = valueMatch[1].toLowerCase() === 'illimité' ? -1 : parseInt(valueMatch[1]);
                                                            } else if (docFeature.metadata?.value !== undefined && docFeature.metadata.value !== '0') {
                                                                // Only use metadata value if it's not zero
                                                                maxStorageMB = docFeature.metadata.value === 'Illimité' ? -1 : parseInt(docFeature.metadata.value);
                                                            }
                                                            // If the feature value is 0, stick with the subscription type default
                                                        }

                                                        // Only show progress bar for limited storage plans
                                                        if (maxStorageMB !== -1 && maxStorageMB > 0) {
                                                            const percentage = Math.min((usedStorageMB / maxStorageMB) * 100, 100);
                                                            let progressColor = 'success';

                                                            if (percentage > 90) progressColor = 'danger';
                                                            else if (percentage > 70) progressColor = 'warning';

                                                            return (
                                                                <div className="progress" style={{ height: "10px" }}>
                                                                    <div
                                                                        className={`progress-bar bg-${progressColor}`}
                                                                        role="progressbar"
                                                                        style={{ width: `${percentage}%` }}
                                                                        aria-valuenow={percentage}
                                                                        aria-valuemin="0"
                                                                        aria-valuemax="100"
                                                                    ></div>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </div>
                                            )}
                                            {error && (
                                                <div className="alert alert-danger" role="alert">
                                                    {error}
                                                </div>
                                            )}

                                            {!currentBuilding?._id ? (
                                                <div className="text-center py-5">
                                                    <div className="avatar-xl mx-auto">
                                                        <div className="avatar-title bg-soft-navbar text-navbar rounded-circle">
                                                            <img
                                                                src={buildingImage}
                                                                alt={t('profile.buildingIcon')}
                                                                className="align-middle"
                                                                style={{ width: "80px", height: "80px" }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <h4 className="mt-3">{t('profile.noBuildingSelected')}</h4>
                                                    <p className="text-muted mb-4">{t('profile.selectBuildingFirst')}</p>
                                                </div>
                                            ) : (
                                                <Row>
                                                    <Col lg={12}>
                                                        <div className="table-responsive">
                                                            <Table className="table-borderless align-middle mb-0">
                                                                <thead className="table-light">
                                                                    <tr>
                                                                        <th scope="col">{t('profile.fileName')}</th>
                                                                        <th scope="col">{t('profile.type')}</th>
                                                                        <th scope="col">{t('profile.size')}</th>
                                                                        <th scope="col">{t('profile.uploadedBy')}</th>
                                                                        <th scope="col">{t('profile.uploadDate')}</th>
                                                                        <th scope="col">{t('profile.action')}</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {loading ? (
                                                                        <tr>
                                                                            <td colSpan="6" className="text-center">
                                                                                <div className="spinner-border text-navbar" role="status">
                                                                                    <span className="visually-hidden">{t('profile.loading')}</span>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    ) : currentDocuments.length === 0 ? (
                                                                        <tr>
                                                                            <td colSpan="6" className="text-center text-muted">
                                                                                {t('profile.noDocumentsFound')}
                                                                            </td>
                                                                        </tr>
                                                                    ) : (
                                                                        documents.map((document) => (
                                                                            <tr key={document._id}>
                                                                                <td>
                                                                                    <div className="d-flex align-items-center">
                                                                                        <div className="avatar-sm">
                                                                                            <div className={`avatar-title bg-soft-${getFileIconClass(document.fileType)} text-${getFileIconClass(document.fileType)} rounded fs-20`}>
                                                                                                <i className={getFileIcon(document.fileType)}></i>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="ms-3 flex-grow-1">
                                                                                            <h6 className="fs-15 mb-0">
                                                                                                {document.name}
                                                                                            </h6>
                                                                                            {document.description && (
                                                                                                <small className="text-muted">{document.description}</small>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </td>
                                                                                <td>{document.fileType.toUpperCase()}</td>
                                                                                <td>{formatFileSize(document.fileSize)}</td>
                                                                                <td>
                                                                                    {document.uploadedBy?.firstName} {document.uploadedBy?.lastName}
                                                                                </td>
                                                                                <td>
                                                                                    {new Date(document.createdAt).toLocaleDateString()}
                                                                                </td>
                                                                                <td>
                                                                                    <UncontrolledDropdown direction='start'>
                                                                                        <DropdownToggle tag="a" className="btn btn-light btn-icon" id={`dropdownMenuLink-${document._id}`}>
                                                                                            <i className="ri-equalizer-fill"></i>
                                                                                        </DropdownToggle>
                                                                                        <DropdownMenu>
                                                                                            <DropdownItem onClick={() => handlePreview(document)}>
                                                                                                <i className="ri-eye-fill me-2 align-middle text-muted" /> {t('profile.preview')}
                                                                                            </DropdownItem>
                                                                                            <DropdownItem onClick={() => handleDownload(document._id)}>
                                                                                                <i className="ri-download-2-fill me-2 align-middle text-muted" /> {t('profile.download')}
                                                                                            </DropdownItem>
                                                                                            {user.role === 'SyndicateAdmin' && (
                                                                                                <DropdownItem onClick={() => handleDelete(document._id)}>
                                                                                                    <i className="ri-delete-bin-5-line me-2 align-middle text-muted" /> {t('profile.delete')}
                                                                                                </DropdownItem>
                                                                                            )}
                                                                                        </DropdownMenu>
                                                                                    </UncontrolledDropdown>
                                                                                </td>
                                                                            </tr>
                                                                        ))
                                                                    )}
                                                                </tbody>
                                                            </Table>
                                                        </div>
                                                    </Col>
                                                </Row>
                                            )}
                                        </CardBody>
                                        {!loading && currentBuilding?._id && documents.length > 0 && (
                                            <div className="d-flex justify-content-end align-items-center mt-3" style={{ marginBottom: '20px' }}>
                                                <div className="d-flex align-items-center me-3">
                                                    <span className="me-2">{t('profile.showPerPage')}</span>
                                                    <Dropdown isOpen={dropdownOpen} toggle={toggleDropdown}>
                                                        <DropdownToggle caret color="navbar">
                                                            {itemsPerPage}
                                                        </DropdownToggle>
                                                        <DropdownMenu>
                                                            <DropdownItem onClick={() => setItemsPerPage(5)}>5</DropdownItem>
                                                            <DropdownItem onClick={() => setItemsPerPage(10)}>10</DropdownItem>
                                                            <DropdownItem onClick={() => setItemsPerPage(20)}>20</DropdownItem>
                                                        </DropdownMenu>
                                                    </Dropdown>
                                                    <span className="ms-2">{t('profile.perPage')}</span>
                                                </div>

                                                <Pagination aria-label="Page navigation">
                                                    <PaginationItem disabled={currentPage === 1}>
                                                        <PaginationLink
                                                            previous
                                                            onClick={() => setCurrentPage(currentPage - 1)}
                                                        />
                                                    </PaginationItem>
                                                    {Array.from({ length: totalPages }, (_, i) => (
                                                        <PaginationItem active={currentPage === i + 1} key={i}>
                                                            <PaginationLink onClick={() => setCurrentPage(i + 1)}>
                                                                {i + 1}
                                                            </PaginationLink>
                                                        </PaginationItem>
                                                    ))}
                                                    <PaginationItem disabled={currentPage === totalPages}>
                                                        <PaginationLink
                                                            next
                                                            onClick={() => setCurrentPage(currentPage + 1)}
                                                        />
                                                    </PaginationItem>
                                                </Pagination>
                                            </div>
                                        )}
                                    </Card>
                                </TabPane>

                                {(user?.role === 'SyndicateCoowner') && (
                                    <TabPane tabId="5">
                                        <Card>
                                            <CardBody>
                                                <DelegationTabs user={user} />
                                            </CardBody>
                                        </Card>
                                    </TabPane>
                                )}
                            </TabContent>
                        </div>
                    </Col>
                </Row>

            </Container>
        </div>
        <Modal
            isOpen={previewModal}
            toggle={() => {
                setPreviewModal(false);
                // Clean up the blob URL when closing
                if (previewUrl) {
                    window.URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                }
            }}
            size="xl"
            fullscreen="lg"
        >
            <ModalHeader toggle={() => {
                setPreviewModal(false);
                if (previewUrl) {
                    window.URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                }
            }}>
                {currentPreviewDoc?.name}
            </ModalHeader>
            <ModalBody style={{ height: '80vh' }}>
                {previewUrl ? (
                    <iframe
                        src={previewUrl}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        title={t('profile.documentPreview')}
                    />
                ) : (
                    <div className="text-center py-5">
                        <div className="spinner-border text-navbar" role="status">
                            <span className="visually-hidden">{t('profile.loading')}</span>
                        </div>
                        <p className="mt-2">{t('profile.loadingPreview')}</p>
                    </div>
                )}
            </ModalBody>
            <ModalFooter>
                <button
                    className="btn btn-secondary"
                    onClick={() => {
                        setPreviewModal(false);
                        if (previewUrl) {
                            window.URL.revokeObjectURL(previewUrl);
                            setPreviewUrl(null);
                        }
                    }}
                >
                    {t('profile.close')}
                </button>
                <button
                    className="btn btn-navbar"
                    onClick={() => currentPreviewDoc && handleDownload(currentPreviewDoc._id)}
                >
                    {t('profile.download')}
                </button>
            </ModalFooter>
        </Modal>
    </React.Fragment>
);
};
const getFileIcon = (fileType) => {
    switch (fileType.toLowerCase()) {
        case 'pdf':
            return 'ri-file-pdf-fill';
        case 'doc':
        case 'docx':
            return 'ri-file-word-fill';
        case 'xls':
        case 'xlsx':
            return 'ri-file-excel-fill';
        case 'ppt':
        case 'pptx':
            return 'ri-file-ppt-fill';
        default:
            return 'ri-file-fill';
    }
};

const getFileIconClass = (fileType) => {
    switch (fileType.toLowerCase()) {
        case 'pdf':
            return 'danger';
        case 'doc':
        case 'docx':
            return 'navbar';
        case 'xls':
        case 'xlsx':
            return 'success';
        case 'ppt':
        case 'pptx':
            return 'warning';
        default:
            return 'secondary';
    }
};

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]);
};
export default SimplePage;