import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, CardBody, CardHeader, Col, Container, Form, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader, Nav, NavItem, NavLink, Row, TabContent, TabPane } from 'reactstrap';
import classnames from "classnames";
import Flatpickr from "react-flatpickr";
import { useTranslation } from 'react-i18next'; // Import translation hook

//import images
import progileBg from '../../../../assets/images/profile-bg.jpg';
import AvatarDisplay from '../../../../Components/Common/displayAvatar';
import { useDispatch, useSelector } from 'react-redux';
import { clearFakePassword, clearSuccessMessage, setUser, updateUser } from '../../../../slices/login/loginSlice';
import { changePassword, clearpasswordChangeMessage } from '../../../../slices/users/userSlice';
import { getUser } from '../../../../services/api';
import avatar from "../../../../assets/images/users/avatar-1.jpg";
import BuildingSettings from '../../../../Components/Hooks/buildingSelectGamification';
import { deleteOwnAccount } from "../../../../slices/users/userSlice";
import { logout } from "../../../../slices/login/loginSlice";
import { transferSyndicAccount, finalizeTransfer, cancelTransfer, getConnectedUser as fetchConnectedUser } from '../../../../services/api';

const Settings = () => {
    // Initialize translation hook
    const { t } = useTranslation();

    const [activeTab, setActiveTab] = useState("1");
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const dispatch = useDispatch();
    const { user, successMessage, loading, error, fakePassword } = useSelector(state => ({
        user: state.Loginn.user,
        successMessage: state.Loginn.successMessage,
        loading: state.Loginn.loading,
        error: state.Loginn.error,
        fakePassword: state.Loginn.fakePassword,
    }));

    const [showAlert, setShowAlert] = useState(!!fakePassword);
    const [alertMessage, setAlertMessage] = useState("");
    const [showErrorAlert, setShowErrorAlert] = useState(false);

    const [showSuccessModaloassword, setShowSuccessModaloassword] = useState(false);

    const { passwordChangeMessage } = useSelector((state) => state.Userss);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const connectedUser = await fetchConnectedUser();
                dispatch(setUser(connectedUser));
            } catch (error) {
                console.error("Failed to fetch user data:", error);
                // Optional: handle error, e.g., by logging out the user
            }
        };

        if (!user) {
            const u = getUser();
            if (u) {
                dispatch(setUser(u));
            }
        }
        fetchUser(); // Fetch latest user data on component mount
    }, [dispatch]);

    const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
    const [deleteAccountError, setDeleteAccountError] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Transfer account states
    const [transferData, setTransferData] = useState({
        newEmail: '',
        confirmEmail: '',
        password: ''
    });
    const [transferLoading, setTransferLoading] = useState(false);
    const [transferError, setTransferError] = useState('');
    const [showTransferSuccessModal, setShowTransferSuccessModal] = useState(false);
    const [showTransferConfirmModal, setShowTransferConfirmModal] = useState(false);
    const [transferResult, setTransferResult] = useState(null);
    const [finalizing, setFinalizing] = useState(false);
    const [canceling, setCanceling] = useState(false);
    const [showFinalizeConfirmModal, setShowFinalizeConfirmModal] = useState(false);

    const handleDeleteAccount = async () => {
        if (!deleteAccountPassword) {
            setDeleteAccountError(t('settings.passwordRequired'));
            return;
        }

        // Show the confirmation modal instead of deleting immediately
        setShowDeleteModal(true);
    };

    // New function to perform the actual deletion
    const confirmDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            await dispatch(deleteOwnAccount(deleteAccountPassword)).unwrap();
            dispatch(logout());
            // Redirect to login page
            window.location.href = '/connect';
        } catch (error) {
            setDeleteAccountError(error.message || t('settings.deleteFailed'));
            setShowDeleteModal(false); // Close modal on error
        } finally {
            setIsDeleting(false);
        }
    };

    // Handle transfer account
    const handleTransferAccount = (e) => {
        e.preventDefault();
        setTransferError('');
        
        if (!transferData.newEmail || !transferData.confirmEmail || !transferData.password) {
            setTransferError(t('settings.transfer.allFieldsRequired'));
            return;
        }

        if (transferData.newEmail !== transferData.confirmEmail) {
            setTransferError(t('settings.transfer.emailsDoNotMatch'));
            return;
        }

        if (transferData.newEmail === user?.email) {
            setTransferError(t('settings.transfer.sameEmail'));
            return;
        }

        // Show confirmation modal instead of sending immediately
        setShowTransferConfirmModal(true);
    };

    const confirmAndSendTransfer = async () => {
        setShowTransferConfirmModal(false);
        setTransferLoading(true);
        try {
            const result = await transferSyndicAccount(transferData.newEmail, transferData.password);
            setTransferResult(result.data);
            setShowTransferSuccessModal(true);
            setTransferData({ newEmail: '', confirmEmail: '', password: '' });
            
            // Refresh user data to update transfer status
            const connectedUser = await fetchConnectedUser();
            dispatch(setUser(connectedUser));
        } catch (error) {
            setTransferError(error.response?.data?.message || error.message || t('settings.transfer.failed'));
        } finally {
            setTransferLoading(false);
        }
    };

    const handleFinalizeTransfer = async () => {
        setFinalizing(true);
        setTransferError('');
        try {
            await finalizeTransfer();
            dispatch(logout());
            window.location.href = '/connect';
        } catch (error) {
            setTransferError(error.message || 'Failed to finalize transfer.');
        } finally {
            setFinalizing(false);
        }
    };

    const handleCancelTransfer = async () => {
        setCanceling(true);
        setTransferError('');
        try {
            const response = await cancelTransfer();
            dispatch(setUser(response.user)); // Update user state in Redux
            setTransferError('');
        } catch (error) {
            setTransferError(error.message || 'Failed to cancel transfer.');
        } finally {
            setCanceling(false);
        }
    };

    useEffect(() => {
        if (successMessage) {
            setShowSuccessModal(true);
            setTimeout(() => {
                dispatch(clearSuccessMessage()); // Reset successMessage in Redux
            }, 500); // Delay to ensure the modal opens first
        }
    }, [successMessage]);

    // Handle password change success
    useEffect(() => {
        if (passwordChangeMessage) {
            setShowSuccessModaloassword(true);
            setTimeout(() => {
                dispatch(clearpasswordChangeMessage()); // Clear the password change message
            }, 500); // Delay to ensure the modal opens first
        }
    }, [passwordChangeMessage, dispatch]);

    const handleUpdate = async (e) => {
        e.preventDefault();

        // Only include the fields that need to be updated from the form
        // Explicitly exclude subscription and other sensitive fields
        const updatedData = {
            // Form fields that user is updating
            firstName: document.getElementById("firstnameInput")?.value || '',
            lastName: document.getElementById("lastnameInput")?.value || '',
            email: document.getElementById("emailInput")?.value || '',
            phoneNumber: document.getElementById("phonenumberInput")?.value || '',
            website: document.getElementById("websiteInput1")?.value || '',
            city: document.getElementById("cityInput")?.value || '',
            country: document.getElementById("countryInput")?.value || '',
            zipCode: document.getElementById("zipcodeInput")?.value || '',
            description: document.getElementById("exampleFormControlTextarea")?.value || '',
            socials: {
                github: document.getElementById("githubInput")?.value || '',
                website: document.getElementById("websiteInput")?.value || '',
                dribbble: document.getElementById("dribbbleInput")?.value || '',
                pinterest: document.getElementById("pinterestInput")?.value || '',
                linkedin: document.getElementById("linkedinInput")?.value || '',
                twitter: document.getElementById("twitterInput")?.value || '',
                instagram: document.getElementById("instagramInput")?.value || '',
                facebook: document.getElementById("facebookInput")?.value || '',
            }
        };
        await dispatch(updateUser({ id: user?._id, userData: updatedData }));
    };

    const [passwords, setPasswords] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Update passwords state when fakePassword changes
    useEffect(() => {
        if (user?.authMethod === 'google') {
            setPasswords((prev) => ({
                ...prev,
                oldPassword: fakePassword || '' // Ensure it's always a string
            }));
        }
    }, [fakePassword, user?.authMethod]);

    const [passwordVisibility, setPasswordVisibility] = useState({
        oldPassword: false,
        newPassword: false,
        confirmPassword: false
    });

    const togglePasswordVisibility = (field) => {
        setPasswordVisibility((prev) => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (passwords.newPassword !== passwords.confirmPassword) {
            setAlertMessage(t('settings.passwordsDoNotMatch'));
            setShowErrorAlert(true);
            return;
        }

        try {
            await dispatch(changePassword(passwords)).unwrap(); // Unwrap to handle errors correctly

            dispatch(clearFakePassword());

            setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" }); // Reset form
            setShowAlert(false); // Hide the alert
            setShowErrorAlert(false);
        } catch (error) {
            if (error.message === "Old password is incorrect") {
                setAlertMessage(t('settings.oldPasswordIncorrect'));
            } else if (error.message === "passwords do not match") {
                setAlertMessage(t('settings.passwordsDoNotMatch'));
            } else {
                setAlertMessage(t('settings.passwordChangeFailed') + ": " + error.message);
            }
            setShowErrorAlert(true);
        }
    };

    // Watch Redux state changes
    useEffect(() => {
        if (user?.fakePassword == null) {
            dispatch(clearFakePassword());
        }
    }, [user]);

    const tabChange = (tab) => {
        if (activeTab !== tab) {
            setActiveTab(tab);
            setShowSuccessModal(false); // Hide modal when switching tabs
        }
    };

    document.title = t('settings.pageTitle') || "Profile Settings | Nestleo";

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <div className="position-relative mx-n4 mt-n4">
                        <div className="profile-wid-bg profile-setting-img">
                            <img src={progileBg} className="profile-wid-img" alt="" />
                            <div className="overlay-content"></div>
                        </div>
                    </div>
                    <Row>
                        <Col xxl={3}>
                            <Card className="mt-n5">
                                <CardBody className="p-4">
                                    <div className="text-center">
                                        <div className="profile-user position-relative d-inline-block mx-auto mb-4">
                                            <AvatarDisplay userId={user?._id} />
                                        </div>
                                        <h5 className="fs-16 mb-1">{user?.firstName} {user?.lastName}</h5>
                                        <p className="text-muted mb-0">{user?.role}</p>
                                    </div>
                                </CardBody>
                            </Card>

                            {/* <Card>
                                <CardBody>
                                    <div className="d-flex align-items-center mb-5">
                                        <div className="flex-grow-1">
                                            <h5 className="card-title mb-0">{t('settings.completeProfile')}</h5>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <Link to="#" className="badge bg-light text-primary fs-12">
                                                <i className="ri-edit-box-line align-bottom me-1"></i> {t('settings.edit')}
                                            </Link>
                                        </div>
                                    </div>
                                    <div className="progress animated-progress custom-progress progress-label">
                                        <div className="progress-bar bg-danger" role="progressbar" style={{ "width": "30%" }}
                                            aria-valuenow="30" aria-valuemin="0" aria-valuemax="100">
                                            <div className="label">30%</div>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card> */}



                        </Col>

                        <Col xxl={9}>
                            <Card className="mt-xxl-n5">
                                <CardHeader>
                                    <Nav className="nav-tabs-custom rounded card-header-tabs border-bottom-0"
                                        role="tablist">
                                        <NavItem>
                                            <NavLink
                                                className={classnames({ active: activeTab === "1" })}
                                                onClick={() => {
                                                    tabChange("1");
                                                }}>
                                                <i className="fas fa-home"></i>
                                                {t('settings.personalDetails')}
                                            </NavLink>
                                        </NavItem>
                                        <NavItem>
                                            <NavLink to="#"
                                                className={classnames({ active: activeTab === "2" })}
                                                onClick={() => {
                                                    tabChange("2");
                                                }}
                                                type="button">
                                                <i className="far fa-user"></i>
                                                {t('settings.changePassword')}
                                            </NavLink>
                                        </NavItem>
                                        {user?.role === 'SyndicateAdmin' && (
                                            <NavItem>
                                                <NavLink to="#"
                                                    className={classnames({ active: activeTab === "3" })}
                                                    onClick={() => {
                                                        tabChange("3");
                                                    }}
                                                    type="button">
                                                    <i className="ri-mail-line"></i>
                                                    {t('settings.transfer.transferAccount')}
                                                </NavLink>
                                            </NavItem>
                                        )}
                                     
                                    </Nav>
                                </CardHeader>
                                <CardBody className="p-4">
                                    <TabContent activeTab={activeTab}>
                                        <TabPane tabId="1">
                                            <Form onSubmit={handleUpdate}>
                                                {loading ? t('settings.updating') : t('settings.updateProfile')}

                                                <Row>
                                                    <Col lg={6}>
                                                        <div className="mb-3">
                                                            <Label htmlFor="firstnameInput" className="form-label">{t('settings.firstName')}</Label>
                                                            <Input type="text" className="form-control" id="firstnameInput"
                                                                placeholder={t('settings.enterFirstName')} defaultValue={user?.firstName} />
                                                        </div>
                                                    </Col>
                                                    <Col lg={6}>
                                                        <div className="mb-3">
                                                            <Label htmlFor="lastnameInput" className="form-label">{t('settings.lastName')}</Label>
                                                            <Input type="text" className="form-control" id="lastnameInput"
                                                                placeholder={t('settings.enterLastName')} defaultValue={user?.lastName} />
                                                        </div>
                                                    </Col>
                                                    <Col lg={6}>
                                                        <div className="mb-3">
                                                            <Label htmlFor="phonenumberInput" className="form-label">{t('settings.phoneNumber')}</Label>
                                                            <Input type="text" className="form-control"
                                                                id="phonenumberInput"
                                                                placeholder={t('settings.enterPhoneNumber')}
                                                                defaultValue={user?.phoneNumber} />
                                                        </div>
                                                    </Col>
                                                    <Col lg={6}>
                                                        <div className="mb-3">
                                                            <Label htmlFor="emailInput" className="form-label">
                                                                {t('settings.emailAddress')}
                                                            </Label>
                                                            <Input
                                                                type="email"
                                                                className="form-control"
                                                                id="emailInput"
                                                                placeholder={t('settings.enterEmail')}
                                                                defaultValue={user?.email}
                                                                disabled
                                                                style={{ backgroundColor: "#e9ecef", cursor: "not-allowed" }} // Optional for better UX
                                                            />
                                                        </div>
                                                    </Col>

                                                    {/* <Col lg={6}>
                                                        <div className="mb-3">
                                                            <Label htmlFor="linkedinInput" className="form-label">{t('settings.linkedin')}</Label>
                                                            <Input type="text" className="form-control" id="linkedinInput" 
                                                                placeholder={t('settings.enterLinkedin')}
                                                                defaultValue={user?.socials?.linkedin} />
                                                        </div>
                                                    </Col> */}
                                                    {/* <Col lg={6}>
                                                        <div className="mb-3">
                                                            <Label htmlFor="twitterInput" className="form-label">{t('settings.twitter')}</Label>
                                                            <Input type="text" className="form-control" id="twitterInput" 
                                                                placeholder={t('settings.enterTwitter')}
                                                                defaultValue={user?.socials?.twitter} />
                                                        </div>
                                                    </Col>
                                                    <Col lg={6}>
                                                        <div className="mb-3">
                                                            <Label htmlFor="instagramInput" className="form-label">{t('settings.instagram')}</Label>
                                                            <Input type="text" className="form-control" id="instagramInput" 
                                                                placeholder={t('settings.enterInstagram')}
                                                                defaultValue={user?.socials?.instagram} />
                                                        </div>
                                                    </Col>
                                                    <Col lg={6}>
                                                        <div className="mb-3">
                                                            <Label htmlFor="facebookInput" className="form-label">{t('settings.facebook')}</Label>
                                                            <Input type="text" className="form-control" id="facebookInput" 
                                                                placeholder={t('settings.enterFacebook')}
                                                                defaultValue={user?.socials?.facebook} />
                                                        </div>
                                                    </Col> */}
                                                    <Col lg={4}>
                                                        <div className="mb-3">
                                                            <Label htmlFor="cityInput" className="form-label">{t('settings.city')}</Label>
                                                            <Input type="text" className="form-control" id="cityInput"
                                                                placeholder={t('settings.enterCity')} defaultValue={user?.city} />
                                                        </div>
                                                    </Col>
                                                    <Col lg={4}>
                                                        <div className="mb-3">
                                                            <Label htmlFor="countryInput" className="form-label">{t('settings.country')}</Label>
                                                            <Input type="text" className="form-control" id="countryInput"
                                                                placeholder={t('settings.enterCountry')} defaultValue={user?.country} />
                                                        </div>
                                                    </Col>
                                                    <Col lg={4}>
                                                        <div className="mb-3">
                                                            <Label htmlFor="zipcodeInput" className="form-label">{t('settings.zipCode')}</Label>
                                                            <Input type="text" className="form-control" minLength="5"
                                                                maxLength="6" id="zipcodeInput"
                                                                placeholder={t('settings.enterZipCode')} defaultValue={user?.zipCode} />
                                                        </div>
                                                    </Col>
                                                    <Col lg={12}>
                                                        <div className="mb-3 pb-2">
                                                            <Label htmlFor="exampleFormControlTextarea"
                                                                className="form-label">{t('settings.description')}</Label>
                                                            <textarea className="form-control"
                                                                id="exampleFormControlTextarea"
                                                                rows="3" defaultValue={user?.description}></textarea>
                                                        </div>
                                                    </Col>
                                                    <Col lg={12}>
                                                        <div className="hstack gap-2 justify-content-end">
                                                            <button type="submit"
                                                                className="btn btn-primary">{t('settings.update')}</button>
                                                        </div>
                                                    </Col>
                                                </Row>
                                            </Form>
                                        </TabPane>

                                        <TabPane tabId="2">
                                            <div className="security-section">
                                                <h5 className="mb-4">{t('settings.changePasswordTitle')}</h5>
                                                {showAlert && fakePassword && (
                                                    <Alert color="warning">
                                                        {t('settings.temporaryPasswordAlert')}
                                                    </Alert>
                                                )}

                                                {showErrorAlert && (
                                                    <Alert color="danger" className="text-center">
                                                        {alertMessage}
                                                    </Alert>
                                                )}

                                                <Form onSubmit={handleSubmit}>
                                                    <Row className="g-3">
                                                        {/* Old Password Field */}
                                                        <Col md={6}>
                                                            <div className="form-group position-relative">
                                                                <Label>{t('settings.oldPassword')}</Label>
                                                                <div className="position-relative">
                                                                    <Input
                                                                        type={passwordVisibility.oldPassword ? "text" : "password"}
                                                                        value={passwords.oldPassword}
                                                                        onChange={(e) =>
                                                                            setPasswords({ ...passwords, oldPassword: e.target.value })
                                                                        }
                                                                        required
                                                                        className="pe-5"
                                                                    />
                                                                    <button
                                                                        className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-decoration-none text-muted"
                                                                        type="button"
                                                                        onClick={() => togglePasswordVisibility("oldPassword")}
                                                                        style={{ right: "12px", padding: "5px" }}
                                                                    >
                                                                        <i
                                                                            className={
                                                                                passwordVisibility.oldPassword
                                                                                    ? "ri-eye-off-fill"
                                                                                    : "ri-eye-fill"
                                                                            }
                                                                        ></i>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </Col>

                                                        {/* New Password Field */}
                                                        <Col md={6}>
                                                            <div className="form-group position-relative">
                                                                <Label>{t('settings.newPassword')}</Label>
                                                                <Input
                                                                    type={passwordVisibility.newPassword ? "text" : "password"}
                                                                    value={passwords.newPassword}
                                                                    onChange={(e) =>
                                                                        setPasswords({ ...passwords, newPassword: e.target.value })
                                                                    }
                                                                    required
                                                                    minLength="8"
                                                                />
                                                                <button
                                                                    className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-decoration-none text-muted"
                                                                    type="button"
                                                                    onClick={() => togglePasswordVisibility("newPassword")}
                                                                >
                                                                    <i
                                                                        className={
                                                                            passwordVisibility.newPassword
                                                                                ? "ri-eye-off-fill"
                                                                                : "ri-eye-fill"
                                                                        }
                                                                    ></i>
                                                                </button>
                                                                <small className="form-text text-muted">
                                                                    {t('settings.passwordRequirements')}
                                                                </small>
                                                            </div>
                                                        </Col>

                                                        {/* Confirm Password Field */}
                                                        <Col md={6}>
                                                            <div className="form-group position-relative">
                                                                <Label>{t('settings.confirmPassword')}</Label>
                                                                <div className="position-relative">
                                                                    <Input
                                                                        type={passwordVisibility.confirmPassword ? "text" : "password"}
                                                                        value={passwords.confirmPassword}
                                                                        onChange={(e) =>
                                                                            setPasswords({ ...passwords, confirmPassword: e.target.value })
                                                                        }
                                                                        required
                                                                        className="pe-5"
                                                                    />
                                                                    <button
                                                                        className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-decoration-none text-muted"
                                                                        type="button"
                                                                        onClick={() => togglePasswordVisibility("confirmPassword")}
                                                                        style={{ right: "12px", padding: "5px" }}
                                                                    >
                                                                        <i
                                                                            className={
                                                                                passwordVisibility.confirmPassword
                                                                                    ? "ri-eye-off-fill"
                                                                                    : "ri-eye-fill"
                                                                            }
                                                                        ></i>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </Col>

                                                        <Col md={12}>
                                                            <div className="text-end mt-4">
                                                                <Button color="primary" type="submit" disabled={loading}>
                                                                    {loading ? t('settings.loading') : t('settings.update')}
                                                                </Button>
                                                            </div>
                                                        </Col>
                                                    </Row>
                                                </Form>
                                            </div>
                                        </TabPane>

                                        {user?.role === 'SyndicateAdmin' && (
                                            <TabPane tabId="3">
                                                <div className="transfer-account-section">
                                                    <h5 className="mb-4">{t('settings.transfer.transferAccountTitle')}</h5>

                                                    {user?.transferStatus && user.transferStatus !== 'none' && (
                                                        <Alert color={
                                                            user.transferStatus === 'pending_email_confirmation' ? 'warning' :
                                                            user.transferStatus === 'pending_final_approval' ? 'info' :
                                                            user.transferStatus === 'failed' ? 'danger' : 'secondary'
                                                        }>
                                                            <strong>{t('settings.transfer.currentStatus', 'Current Status')}: </strong>
                                                            <span className="fw-semibold text-capitalize">
                                                                {t(`settings.transfer.statuses.${user.transferStatus}`, user.transferStatus.replace(/_/g, ' '))}
                                                            </span>
                                                            
                                                            {user.transferStatus === 'pending_email_confirmation' && (
                                                                <div className="mt-3">
                                                                    <p>{t('settings.transfer.pendingInfo', 'A transfer is pending email confirmation. Check the new email address to confirm.')}</p>
                                                                    <Button color="danger" outline onClick={handleCancelTransfer} disabled={canceling}>
                                                                        {canceling ? t('settings.transfer.canceling', 'Canceling...') : t('settings.transfer.cancel', 'Cancel Transfer')}
                                                                    </Button>
                                                                </div>
                                                            )}

                                                            {user.transferStatus === 'pending_final_approval' && (
                                                                <div className="mt-3">
                                                                    <p>{t('settings.transfer.approvalInfo', 'The new email has been confirmed. Click "Complete Transfer" to finalize the process. This will log you out.')}</p>
                                                                    <div className="d-flex gap-2">
                                                                        <Button color="success" onClick={() => setShowFinalizeConfirmModal(true)} disabled={finalizing}>
                                                                            {finalizing ? t('settings.transfer.completing', 'Completing...') : t('settings.transfer.complete', 'Complete Transfer')}
                                                                        </Button>
                                                                        <Button color="danger" outline onClick={handleCancelTransfer} disabled={canceling}>
                                                                            {canceling ? t('settings.transfer.canceling', 'Canceling...') : t('settings.transfer.cancel', 'Cancel Transfer')}
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                             {user.transferStatus === 'failed' && (
                                                                <div className="mt-3">
                                                                    <p>{t('settings.transfer.failedInfo', 'The transfer has failed or was cancelled. You can start a new transfer.')}</p>
                                                                </div>
                                                            )}
                                                        </Alert>
                                                    )}

                                                    <div className="alert alert-info" style={{ display: (user?.transferStatus === 'pending_email_confirmation' || user?.transferStatus === 'pending_final_approval') ? 'none' : 'block' }}>
                                                        <i className="ri-information-line me-2"></i>
                                                        {t('settings.transfer.transferInfoNew')}
                                                    </div>

                                                    {transferError && (
                                                        <Alert color="danger" className="text-center">
                                                            {transferError}
                                                        </Alert>
                                                    )}

                                                    <Form onSubmit={handleTransferAccount}>
                                                        <fieldset disabled={user?.transferStatus === 'pending_email_confirmation' || user?.transferStatus === 'pending_final_approval'}>
                                                            <Row className="g-3">
                                                                {/* Current Email Display */}
                                                                <Col md={12}>
                                                                    <div className="mb-3">
                                                                        <Label className="form-label">{t('settings.transfer.currentEmail')}</Label>
                                                                        <Input
                                                                            type="email"
                                                                            value={user?.email || ''}
                                                                            disabled
                                                                            className="bg-light"
                                                                        />
                                                                    </div>
                                                                </Col>

                                                                {/* New Email Field */}
                                                                <Col md={6}>
                                                                    <div className="mb-3">
                                                                        <Label className="form-label">{t('settings.transfer.newEmail')}</Label>
                                                                        <Input
                                                                            type="email"
                                                                            value={transferData.newEmail}
                                                                            onChange={(e) =>
                                                                                setTransferData({ ...transferData, newEmail: e.target.value })
                                                                            }
                                                                            placeholder={t('settings.transfer.enterNewEmail')}
                                                                            required
                                                                        />
                                                                    </div>
                                                                </Col>

                                                                {/* Confirm Email Field */}
                                                                <Col md={6}>
                                                                    <div className="mb-3">
                                                                        <Label className="form-label">{t('settings.transfer.confirmEmail')}</Label>
                                                                        <Input
                                                                            type="email"
                                                                            value={transferData.confirmEmail}
                                                                            onChange={(e) =>
                                                                                setTransferData({ ...transferData, confirmEmail: e.target.value })
                                                                            }
                                                                            placeholder={t('settings.transfer.confirmNewEmail')}
                                                                            required
                                                                            className={transferData.newEmail && transferData.confirmEmail && transferData.newEmail !== transferData.confirmEmail ? 'is-invalid' : ''}
                                                                        />
                                                                        {transferData.newEmail && transferData.confirmEmail && transferData.newEmail !== transferData.confirmEmail && (
                                                                            <div className="invalid-feedback">
                                                                                {t('settings.transfer.emailsDoNotMatch')}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </Col>

                                                                {/* Password Confirmation */}
                                                                <Col md={12}>
                                                                    <div className="mb-3">
                                                                        <Label className="form-label">{t('settings.transfer.confirmPassword')}</Label>
                                                                        <Input
                                                                            type="password"
                                                                            value={transferData.password}
                                                                            onChange={(e) =>
                                                                                setTransferData({ ...transferData, password: e.target.value })
                                                                            }
                                                                            placeholder={t('settings.transfer.enterPassword')}
                                                                            required
                                                                        />
                                                                        <small className="form-text text-muted">
                                                                            {t('settings.transfer.passwordConfirmInfo')}
                                                                        </small>
                                                                    </div>
                                                                </Col>

                                                                <Col md={12}>
                                                                    <div className="text-end mt-4">
                                                                        <Button
                                                                            color="warning"
                                                                            type="submit"
                                                                            disabled={transferLoading}
                                                                            className="btn-label"
                                                                        >
                                                                            <i className="ri-mail-send-line label-icon align-middle fs-16 me-2"></i>
                                                                            {transferLoading ? t('settings.transfer.transferring') : t('settings.transfer.transferAccount')}
                                                                        </Button>
                                                                    </div>
                                                                </Col>
                                                            </Row>
                                                        </fieldset>
                                                    </Form>
                                                </div>
                                            </TabPane>
                                        )}

                                    </TabContent>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>

            {/* Confirmation Modal for Account Transfer */}
            <Modal isOpen={showTransferConfirmModal} toggle={() => setShowTransferConfirmModal(false)} centered>
                <ModalHeader toggle={() => setShowTransferConfirmModal(false)}>
                    {t('settings.transfer.confirmTransferTitle')}
                </ModalHeader>
                <ModalBody>
                    <p>{t('settings.transfer.confirmTransferMessage')}</p>
                    <div className="alert alert-info">
                        <strong>{t('settings.transfer.from')}:</strong> {user?.email} <br />
                        <strong>{t('settings.transfer.to')}:</strong> {transferData.newEmail}
                    </div>
                    <p className="text-muted">
                        {t('settings.transfer.confirmTransferExplanation')}
                    </p>
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setShowTransferConfirmModal(false)}>
                        {t('settings.cancel')}
                    </Button>
                    <Button color="primary" onClick={confirmAndSendTransfer} disabled={transferLoading}>
                        {transferLoading ? t('settings.sending') : t('settings.confirmedAndSend')}
                    </Button>
                </ModalFooter>
            </Modal>

            <Modal isOpen={showSuccessModal} toggle={() => setShowSuccessModal(false)} centered>
                <ModalBody className="text-center p-5">
                    <div className="mt-4">
                        <lord-icon
                            src="https://cdn.lordicon.com/tqywkdcz.json"
                            trigger="hover"
                            style={{ width: "150px", height: "150px" }}
                        />
                        <h4 className="mb-3 mt-4">{t('settings.profileUpdated')}</h4>
                        <p className="text-muted fs-15 mb-4">{t('settings.changesSaved')}</p>
                        <div className="hstack gap-2 justify-content-center">
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowSuccessModal(false)}
                            >
                                {t('settings.close')}
                            </button>
                        </div>
                    </div>
                </ModalBody>
            </Modal>

            {/* Delete Account Confirmation Modal */}
            <Modal isOpen={showDeleteModal} toggle={() => setShowDeleteModal(false)} centered>
                <ModalBody className='text-center p-5'>
                    <div className="text-end">
                        <button
                            type="button"
                            onClick={() => setShowDeleteModal(false)}
                            className="btn-close text-end"
                        />
                    </div>
                    <div className="mt-2">
                        <lord-icon
                            src="https://cdn.lordicon.com/gsqxdxog.json"
                            trigger="loop"
                            colors="primary:#f7b84b,secondary:#f06548"
                            style={{ width: "100px", height: "100px" }}
                        />
                        <div className="mt-4 pt-2 fs-15 mx-4 mx-sm-5">
                            <h4>{t('settings.areYouSure')}</h4>
                            <p className="text-muted mx-4 mb-0">
                                {t('settings.permanentDeleteWarning')}
                            </p>
                        </div>
                    </div>
                    <div className="d-flex gap-2 justify-content-center mt-4 mb-2">
                        <button
                            type="button"
                            className="btn w-sm btn-light"
                            onClick={() => setShowDeleteModal(false)}
                        >
                            {t('settings.cancel')}
                        </button>
                        <button
                            type="button"
                            className="btn w-sm btn-danger"
                            onClick={confirmDeleteAccount}
                            disabled={isDeleting}
                        >
                            {isDeleting ? t('settings.deleting') : t('settings.yesDelete')}
                        </button>
                    </div>
                </ModalBody>
            </Modal>

            <Modal isOpen={showSuccessModaloassword} toggle={() => setShowSuccessModaloassword(false)} centered>
                <ModalBody className='text-center p-5'>
                    <div className="text-end">
                        <button
                            type="button"
                            onClick={() => setShowSuccessModaloassword(false)}
                            className="btn-close text-end"
                        />
                    </div>
                    <div className="mt-2">
                        <lord-icon
                            src="https://cdn.lordicon.com/tqywkdcz.json"
                            trigger="hover"
                            style={{ width: "150px", height: "150px" }}
                        />
                        <h4 className="mb-3 mt-4">{t('settings.passwordUpdated')}</h4>
                        <p className="text-muted fs-15 mb-4">{t('settings.changesSaved')}</p>
                        <div className="hstack gap-2 justify-content-center">
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowSuccessModaloassword(false)}
                            >
                                {t('settings.close')}
                            </button>
                        </div>
                    </div>
                </ModalBody>
            </Modal>

            {/* Transfer Success Modal */}
            <Modal isOpen={showTransferSuccessModal} toggle={() => setShowTransferSuccessModal(false)} centered>
                <ModalBody className='text-center p-5'>
                    <div className="text-end">
                        <button
                            type="button"
                            onClick={() => setShowTransferSuccessModal(false)}
                            className="btn-close text-end"
                        />
                    </div>
                    <div className="mt-2">
                        <lord-icon
                            src="https://cdn.lordicon.com/lupuorrc.json"
                            trigger="hover"
                            style={{ width: "150px", height: "150px" }}
                        />
                        <h4 className="mb-3 mt-4">{t('settings.transfer.confirmationSentTitle')}</h4>
                        <p className="text-muted fs-15 mb-4">
                            {t('settings.transfer.confirmationSentMessage')}
                        </p>
                        {transferResult && (
                            <div className="bg-light p-3 rounded mb-4">
                                <p className="mb-1"><strong>{t('settings.transfer.currentEmail')}:</strong> {transferResult.currentEmail}</p>
                                <p className="mb-1"><strong>{t('settings.transfer.newEmail')}:</strong> {transferResult.newEmail}</p>
                                <p className="mb-0"><strong>{t('settings.transfer.expiresIn')}:</strong> {transferResult.expiresIn}</p>
                            </div>
                        )}
                        <div className="alert alert-info text-start">
                            <i className="ri-information-line me-2"></i>
                            <small>{t('settings.transfer.checkEmailInstructions')}</small>
                        </div>
                        <div className="hstack gap-2 justify-content-center">
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowTransferSuccessModal(false)}
                            >
                                {t('settings.close')}
                            </button>
                        </div>
                    </div>
                </ModalBody>
            </Modal>

            <Modal isOpen={showFinalizeConfirmModal} toggle={() => setShowFinalizeConfirmModal(false)} centered>
                <ModalHeader toggle={() => setShowFinalizeConfirmModal(false)}>
                    {t('settings.transfer.finalizeTransferTitle', 'Finalize Account Transfer')}
                </ModalHeader>
                <ModalBody>
                    <div className="alert alert-warning">
                        <i className="ri-alert-line me-2 fs-16 align-middle"></i>
                        <strong>{t('settings.transfer.warning', 'Warning')}:</strong> {t('settings.transfer.finalizeWarningMessage', 'Completing this transfer will immediately log you out of this account and transfer all administrative access to the new email address.')}
                    </div>
                    <p>{t('settings.transfer.finalizeConfirmMessage', 'Are you sure you want to finalize the transfer of your account to the new email address? This action cannot be undone.')}</p>
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setShowFinalizeConfirmModal(false)}>
                        {t('settings.cancel', 'Cancel')}
                    </Button>
                    <Button color="primary" onClick={handleFinalizeTransfer} disabled={finalizing}>
                        {finalizing ? t('settings.transfer.finalizing', 'Finalizing...') : t('settings.transfer.finalize', 'Finalize Transfer')}
                    </Button>
                </ModalFooter>
            </Modal>
        </React.Fragment>
    );
};

export default Settings;