import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, CardBody, CardHeader, Col, Container, Form, Input, Label, Modal, ModalBody, Nav, NavItem, NavLink, Row, TabContent, TabPane } from 'reactstrap';
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
        if (!user) {
            const u = getUser();
            dispatch(setUser(u));
        }
    }, []);

    const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
    const [deleteAccountError, setDeleteAccountError] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [showDeleteModal, setShowDeleteModal] = useState(false);

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

        const updatedData = {
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
        await dispatch(updateUser({ id: user?.id, userData: updatedData }));
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
                                            <AvatarDisplay userId={user?.id} />
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

                                    </TabContent>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>

            <Modal isOpen={showSuccessModal} toggle={() => setShowSuccessModal(false)} centered>
                <ModalBody className='text-center p-5'>
                    <div className="text-end">
                        <button
                            type="button"
                            onClick={() => setShowSuccessModal(false)}
                            className="btn-close text-end"
                        />
                    </div>
                    <div className="mt-2">
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
        </React.Fragment>
    );
};

export default Settings;