// src/.../Settings.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert, Button, Card, CardBody, CardHeader, Col, Container, Form, Input, Label,
  Modal, ModalBody, ModalFooter, ModalHeader, Nav, NavItem, NavLink, Row, TabContent, TabPane
} from 'reactstrap';
import classnames from "classnames";
import Flatpickr from "react-flatpickr";
import { useTranslation } from 'react-i18next'; // Import translation hook

// import images
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
// replace existing services import line with:
import {
  transferSyndicAccount, finalizeTransfer, cancelTransfer,
  getConnectedUser as fetchConnectedUser,
  sendTwoFaCode, verifyTwoFaCode, disableTwoFa, enableTwoFaDirect
} from '../../../../services/api';


const Settings = () => {
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

  // --- 2FA states ---
  const [twoFAEnabled, setTwoFAEnabled] = useState(!!user?.twoStepsVerify);
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [twoFAMessage, setTwoFAMessage] = useState(null);
  const [twoFAError, setTwoFAError] = useState(null);
  // -------------------

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const connectedUser = await fetchConnectedUser();
        dispatch(setUser(connectedUser));
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      }
    };

    if (!user) {
      const u = getUser();
      if (u) dispatch(setUser(u));
    }
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // keep local twoFAEnabled in sync with user from redux
  useEffect(() => {
    setTwoFAEnabled(!!user?.twoStepsVerify);
  }, [user?.twoStepsVerify]);

  // other states (delete, transfer etc)
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
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await dispatch(deleteOwnAccount(deleteAccountPassword)).unwrap();
      dispatch(logout());
      window.location.href = '/connect';
    } catch (error) {
      setDeleteAccountError(error.message || t('settings.deleteFailed'));
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Transfer handlers (unchanged)
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
      dispatch(setUser(response.user));
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
        dispatch(clearSuccessMessage());
      }, 500);
    }
  }, [successMessage, dispatch]);

  useEffect(() => {
    if (passwordChangeMessage) {
      setShowSuccessModaloassword(true);
      setTimeout(() => {
        dispatch(clearpasswordChangeMessage());
      }, 500);
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
    await dispatch(updateUser({ id: user?._id, userData: updatedData }));
  };

  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    if (user?.authMethod === 'google') {
      setPasswords(prev => ({ ...prev, oldPassword: fakePassword || '' }));
    }
  }, [fakePassword, user?.authMethod]);

  const [passwordVisibility, setPasswordVisibility] = useState({ oldPassword: false, newPassword: false, confirmPassword: false });
  const togglePasswordVisibility = (field) => setPasswordVisibility(prev => ({ ...prev, [field]: !prev[field] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      setAlertMessage(t('settings.passwordsDoNotMatch'));
      setShowErrorAlert(true);
      return;
    }
    try {
      await dispatch(changePassword(passwords)).unwrap();
      dispatch(clearFakePassword());
      setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setShowAlert(false);
      setShowErrorAlert(false);
    } catch (error) {
      if (error.message === "Old password is incorrect") setAlertMessage(t('settings.oldPasswordIncorrect'));
      else if (error.message === "passwords do not match") setAlertMessage(t('settings.passwordsDoNotMatch'));
      else setAlertMessage(t('settings.passwordChangeFailed') + ": " + error.message);
      setShowErrorAlert(true);
    }
  };

  useEffect(() => {
    if (user?.fakePassword == null) dispatch(clearFakePassword());
  }, [user, dispatch]);

  const tabChange = (tab) => {
    if (activeTab !== tab) {
      setActiveTab(tab);
      setShowSuccessModal(false);
    }
  };

  document.title = t('settings.pageTitle') || "Profile Settings | Nestleo";

  // --- 2FA handlers ---
  const refreshUser = async () => {
    try {
      const fresh = await fetchConnectedUser();
      if (fresh) {
        dispatch(setUser(fresh));
      }
    } catch (err) {
      console.warn('refresh user failed', err);
    }
  };

// import enableTwoFaDirect (or enableTwoFa) at top of file:
// import { ..., enableTwoFaDirect } from '../../../../services/api';

const handleStartEnableTwoFa = async () => {
  setTwoFAError(null);
  setTwoFAMessage(null);
  setTwoFALoading(true);

  try {
    const result = await enableTwoFaDirect();
    // result should contain { message, twoStepsVerify: true }
    setTwoFAMessage(t('settings.twoFa.enabled') || 'Two-step authentication enabled');
    setTwoFAEnabled(true);
    await refreshUser(); // update Redux user
  } catch (err) {
    console.error('enable 2fa (direct) error:', err);
    setTwoFAError(err?.message || err?.message || t('settings.twoFa.enableFailed') || 'Failed to enable 2FA');
  } finally {
    setTwoFALoading(false);
  }
};



  const handleVerifyTwoFa = async () => {
    setTwoFAError(null);
    setTwoFAMessage(null);
    setTwoFALoading(true);
    try {
      const token = localStorage.getItem('token');
      await (typeof verifyTwoFaCode === 'function' ? verifyTwoFaCode({ token, code: verificationCode }) : Promise.reject(new Error('verifyTwoFaCode missing')));
      setTwoFAMessage(t('settings.twoFa.enabled') || 'Two-step authentication enabled');
      setVerificationCode('');
      setCodeSent(false);
      // refresh user to get updated flag
      await refreshUser();
    } catch (err) {
      console.error('2FA verify error:', err);
      setTwoFAError(err?.message || t('settings.twoFa.verifyFailed') || 'Invalid verification code.');
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleDisableTwoFa = async () => {
    setTwoFAError(null);
    setTwoFAMessage(null);
    if (!window.confirm(t('settings.twoFa.disableConfirm') || 'Disable two-step authentication?')) return;
    setTwoFALoading(true);
    try {
      const token = localStorage.getItem('token');
      await (typeof disableTwoFa === 'function' ? disableTwoFa({ token }) : Promise.reject(new Error('disableTwoFa missing')));
      setTwoFAMessage(t('settings.twoFa.disabled') || 'Two-step authentication disabled');
      // refresh user
      await refreshUser();
    } catch (err) {
      console.error('disableTwoFa err', err);
      setTwoFAError(err?.message || t('settings.twoFa.disableFailed') || 'Failed to disable 2FA');
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleResendTwoFa = async () => {
    setTwoFAError(null);
    setTwoFAMessage(null);
    setTwoFALoading(true);
    try {
      const token = localStorage.getItem('token');
      await (typeof sendTwoFaCode === 'function' ? sendTwoFaCode({ token }) : Promise.reject(new Error('sendTwoFaCode missing')));
      setTwoFAMessage(t('settings.twoFa.resent') || 'Verification code resent.');
      setCodeSent(true);
    } catch (err) {
      console.error('resend 2fa err', err);
      setTwoFAError(err?.message || t('settings.twoFa.sendFailed') || 'Failed to resend');
    } finally {
      setTwoFALoading(false);
    }
  };
  // -------------------------

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
            </Col>

            <Col xxl={9}>
              <Card className="mt-xxl-n5">
                <CardHeader>
                  <Nav className="nav-tabs-custom rounded card-header-tabs border-bottom-0" role="tablist">
                    <NavItem>
                      <NavLink className={classnames({ active: activeTab === "1" })} onClick={() => tabChange("1")}>
                        <i className="fas fa-home"></i> {t('settings.personalDetails')}
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink className={classnames({ active: activeTab === "2" })} onClick={() => tabChange("2")} type="button">
                        <i className="far fa-user"></i> {t('settings.changePassword')}
                      </NavLink>
                    </NavItem>

                    {/* NEW: Account Security tab (3) */}
                    <NavItem>
                      <NavLink className={classnames({ active: activeTab === "3" })} onClick={() => tabChange("3")} type="button">
                        <i className="ri-shield-check-line"></i> {t('settings.accountSecurity') || 'Account Security'}
                      </NavLink>
                    </NavItem>

                    {/* Transfer remains but moved to tab 4 for SyndicateAdmin */}
                    {user?.role === 'SyndicateAdmin' && (
                      <NavItem>
                        <NavLink className={classnames({ active: activeTab === "4" })} onClick={() => tabChange("4")} type="button">
                          <i className="ri-mail-line"></i> {t('settings.transfer.transferAccount')}
                        </NavLink>
                      </NavItem>
                    )}
                  </Nav>
                </CardHeader>

                <CardBody className="p-4">
                  <TabContent activeTab={activeTab}>

                    {/* Tab 1 - Personal Details */}
                    <TabPane tabId="1">
                      <Form onSubmit={handleUpdate}>
                        {loading ? t('settings.updating') : t('settings.updateProfile')}
                        <Row>
                          <Col lg={6}><div className="mb-3"><Label htmlFor="firstnameInput" className="form-label">{t('settings.firstName')}</Label>
                            <Input id="firstnameInput" defaultValue={user?.firstName} placeholder={t('settings.enterFirstName')} /></div></Col>

                          <Col lg={6}><div className="mb-3"><Label htmlFor="lastnameInput" className="form-label">{t('settings.lastName')}</Label>
                            <Input id="lastnameInput" defaultValue={user?.lastName} placeholder={t('settings.enterLastName')} /></div></Col>

                          <Col lg={6}><div className="mb-3"><Label htmlFor="phonenumberInput" className="form-label">{t('settings.phoneNumber')}</Label>
                            <Input id="phonenumberInput" defaultValue={user?.phoneNumber} placeholder={t('settings.enterPhoneNumber')} /></div></Col>

                          <Col lg={6}>
                            <div className="mb-3">
                              <Label htmlFor="emailInput" className="form-label">{t('settings.emailAddress')}</Label>
                              <Input id="emailInput" type="email" defaultValue={user?.email} disabled style={{ backgroundColor: "#e9ecef", cursor: "not-allowed" }} />
                            </div>
                          </Col>

                          <Col lg={4}><div className="mb-3"><Label htmlFor="cityInput" className="form-label">{t('settings.city')}</Label>
                            <Input id="cityInput" defaultValue={user?.city} placeholder={t('settings.enterCity')} /></div></Col>

                          <Col lg={4}><div className="mb-3"><Label htmlFor="countryInput" className="form-label">{t('settings.country')}</Label>
                            <Input id="countryInput" defaultValue={user?.country} placeholder={t('settings.enterCountry')} /></div></Col>

                          <Col lg={4}><div className="mb-3"><Label htmlFor="zipcodeInput" className="form-label">{t('settings.zipCode')}</Label>
                            <Input id="zipcodeInput" defaultValue={user?.zipCode} placeholder={t('settings.enterZipCode')} /></div></Col>

                          <Col lg={12}>
                            <div className="mb-3 pb-2">
                              <Label htmlFor="exampleFormControlTextarea" className="form-label">{t('settings.description')}</Label>
                              <textarea id="exampleFormControlTextarea" className="form-control" rows="3" defaultValue={user?.description}></textarea>
                            </div>
                          </Col>

                          <Col lg={12}>
                            <div className="hstack gap-2 justify-content-end">
                              <button type="submit" className="btn btn-primary">{t('settings.update')}</button>
                            </div>
                          </Col>
                        </Row>
                      </Form>
                    </TabPane>

                    {/* Tab 2 - Change Password */}
                    <TabPane tabId="2">
                      <div className="security-section">
                        <h5 className="mb-4">{t('settings.changePasswordTitle')}</h5>
                        {showAlert && fakePassword && (<Alert color="warning">{t('settings.temporaryPasswordAlert')}</Alert>)}
                        {showErrorAlert && (<Alert color="danger" className="text-center">{alertMessage}</Alert>)}
                        <Form onSubmit={handleSubmit}>
                          <Row className="g-3">
                            <Col md={6}>
                              <div className="form-group position-relative">
                                <Label>{t('settings.oldPassword')}</Label>
                                <div className="position-relative">
                                  <Input type={passwordVisibility.oldPassword ? "text" : "password"} value={passwords.oldPassword}
                                    onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })} required className="pe-5" />
                                  <button type="button" className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-decoration-none text-muted" onClick={() => togglePasswordVisibility("oldPassword")} style={{ right: "12px", padding: "5px" }}>
                                    <i className={passwordVisibility.oldPassword ? "ri-eye-off-fill" : "ri-eye-fill"}></i>
                                  </button>
                                </div>
                              </div>
                            </Col>

                            <Col md={6}>
                              <div className="form-group position-relative">
                                <Label>{t('settings.newPassword')}</Label>
                                <Input type={passwordVisibility.newPassword ? "text" : "password"} value={passwords.newPassword}
                                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} required minLength="8" />
                                <button type="button" className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-decoration-none text-muted" onClick={() => togglePasswordVisibility("newPassword")}>
                                  <i className={passwordVisibility.newPassword ? "ri-eye-off-fill" : "ri-eye-fill"}></i>
                                </button>
                                <small className="form-text text-muted">{t('settings.passwordRequirements')}</small>
                              </div>
                            </Col>

                            <Col md={6}>
                              <div className="form-group position-relative">
                                <Label>{t('settings.confirmPassword')}</Label>
                                <div className="position-relative">
                                  <Input type={passwordVisibility.confirmPassword ? "text" : "password"} value={passwords.confirmPassword}
                                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} required className="pe-5" />
                                  <button type="button" className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-decoration-none text-muted" onClick={() => togglePasswordVisibility("confirmPassword")} style={{ right: "12px", padding: "5px" }}>
                                    <i className={passwordVisibility.confirmPassword ? "ri-eye-off-fill" : "ri-eye-fill"}></i>
                                  </button>
                                </div>
                              </div>
                            </Col>

                            <Col md={12}>
                              <div className="text-end mt-4">
                                <Button color="primary" type="submit" disabled={loading}>{loading ? t('settings.loading') : t('settings.update')}</Button>
                              </div>
                            </Col>
                          </Row>
                        </Form>
                      </div>
                    </TabPane>

                    {/* Tab 3 - Account Security (2FA) */}
                    <TabPane tabId="3">
                      <div className="account-security-section">
                        <h5 className="mb-3">{t('settings.accountSecurity') || 'Account Security'}</h5>

                        <Row className="mb-3 align-items-center">
                          <Col md={6}>
                            <Label className="form-label">{t('settings.twoFa.useEmail') || 'Use email verification'}</Label>
                            <div>
                              <small className="text-muted">{t('settings.twoFa.emailWillBe') || 'Code will be sent to:'} <strong>{user?.email}</strong></small>
                            </div>
                          </Col>

                          <Col md={6} className="text-md-end">
                            <div className="d-flex align-items-center justify-content-end gap-2">
                              <span className={`badge ${twoFAEnabled ? 'bg-success' : 'bg-secondary'} fs-12 py-2 px-3`}>
                                {twoFAEnabled ? (t('settings.twoFa.enabledBadge') || 'Enabled') : (t('settings.twoFa.disabledBadge') || 'Disabled')}
                              </span>

                              {/* Toggle button */}
                              {!twoFAEnabled ? (
                                <Button color="primary" size="sm" onClick={handleStartEnableTwoFa} disabled={twoFALoading}>
                                  {twoFALoading ? t('settings.loading') : (t('settings.twoFa.enable') || 'Enable 2FA')}
                                </Button>
                              ) : (
                                <Button color="danger" size="sm" onClick={handleDisableTwoFa} disabled={twoFALoading}>
                                  {twoFALoading ? t('settings.loading') : (t('settings.twoFa.disable') || 'Disable 2FA')}
                                </Button>
                              )}
                            </div>
                          </Col>
                        </Row>

                        {/* Messages */}
                        {twoFAMessage && <Alert color="success">{twoFAMessage}</Alert>}
                        {twoFAError && <Alert color="danger">{twoFAError}</Alert>}

                        {/* Verification UI (shown after send) */}
                        {codeSent && !twoFAEnabled && (
                          <div className="mt-3">
                            <Label className="form-label">{t('settings.twoFa.enterCode') || 'Enter verification code'}</Label>
                            <div className="d-flex align-items-center gap-2">
                              <Input type="text" value={verificationCode} maxLength={6}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                placeholder="123456" style={{ width: '150px', letterSpacing: '6px', fontSize: '1.1rem' }} />
                              <Button color="primary" onClick={handleVerifyTwoFa} disabled={twoFALoading || verificationCode.length !== 6}>
                                {twoFALoading ? t('settings.verifying') || 'Verifying...' : t('settings.verify') || 'Verify'}
                              </Button>
                              <Button color="link" onClick={handleResendTwoFa} disabled={twoFALoading}>
                                {t('settings.twoFa.resend') || 'Resend'}
                              </Button>
                            </div>
                            <small className="text-muted d-block mt-2">{t('settings.twoFa.codeExpires') || 'The code expires in 10 minutes.'}</small>
                          </div>
                        )}

                      </div>
                    </TabPane>

                    {/* Tab 4 - Transfer (SyndicateAdmin only) */}
                    {user?.role === 'SyndicateAdmin' && (
                      <TabPane tabId="4">
                        {/* transfer-account-section content unchanged from your original code */}
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

                          {transferError && (<Alert color="danger" className="text-center">{transferError}</Alert>)}

                          <Form onSubmit={handleTransferAccount}>
                            <fieldset disabled={user?.transferStatus === 'pending_email_confirmation' || user?.transferStatus === 'pending_final_approval'}>
                              <Row className="g-3">
                                <Col md={12}>
                                  <div className="mb-3">
                                    <Label className="form-label">{t('settings.transfer.currentEmail')}</Label>
                                    <Input type="email" value={user?.email || ''} disabled className="bg-light" />
                                  </div>
                                </Col>

                                <Col md={6}>
                                  <div className="mb-3">
                                    <Label className="form-label">{t('settings.transfer.newEmail')}</Label>
                                    <Input type="email" value={transferData.newEmail} onChange={(e) => setTransferData({ ...transferData, newEmail: e.target.value })} placeholder={t('settings.transfer.enterNewEmail')} required />
                                  </div>
                                </Col>

                                <Col md={6}>
                                  <div className="mb-3">
                                    <Label className="form-label">{t('settings.transfer.confirmEmail')}</Label>
                                    <Input type="email" value={transferData.confirmEmail} onChange={(e) => setTransferData({ ...transferData, confirmEmail: e.target.value })} placeholder={t('settings.transfer.confirmNewEmail')} required className={transferData.newEmail && transferData.confirmEmail && transferData.newEmail !== transferData.confirmEmail ? 'is-invalid' : ''} />
                                    {transferData.newEmail && transferData.confirmEmail && transferData.newEmail !== transferData.confirmEmail && (
                                      <div className="invalid-feedback">{t('settings.transfer.emailsDoNotMatch')}</div>
                                    )}
                                  </div>
                                </Col>

                                <Col md={12}>
                                  <div className="mb-3">
                                    <Label className="form-label">{t('settings.transfer.confirmPassword')}</Label>
                                    <Input type="password" value={transferData.password} onChange={(e) => setTransferData({ ...transferData, password: e.target.value })} placeholder={t('settings.transfer.enterPassword')} required />
                                    <small className="form-text text-muted">{t('settings.transfer.passwordConfirmInfo')}</small>
                                  </div>
                                </Col>

                                <Col md={12}>
                                  <div className="text-end mt-4">
                                    <Button color="warning" type="submit" disabled={transferLoading} className="btn-label">
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

      {/* Transfer confirm modal */}
      <Modal isOpen={showTransferConfirmModal} toggle={() => setShowTransferConfirmModal(false)} centered>
        <ModalHeader toggle={() => setShowTransferConfirmModal(false)}>{t('settings.transfer.confirmTransferTitle')}</ModalHeader>
        <ModalBody>
          <p>{t('settings.transfer.confirmTransferMessage')}</p>
          <div className="alert alert-info">
            <strong>{t('settings.transfer.from')}:</strong> {user?.email} <br />
            <strong>{t('settings.transfer.to')}:</strong> {transferData.newEmail}
          </div>
          <p className="text-muted">{t('settings.transfer.confirmTransferExplanation')}</p>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowTransferConfirmModal(false)}>{t('settings.cancel')}</Button>
          <Button color="primary" onClick={confirmAndSendTransfer} disabled={transferLoading}>{transferLoading ? t('settings.sending') : t('settings.confirmedAndSend')}</Button>
        </ModalFooter>
      </Modal>

      {/* Success/other modals (unchanged) */}
      <Modal isOpen={showSuccessModal} toggle={() => setShowSuccessModal(false)} centered>
        <ModalBody className="text-center p-5">
          <div className="mt-4">
            <lord-icon src="https://cdn.lordicon.com/tqywkdcz.json" trigger="hover" style={{ width: "150px", height: "150px" }} />
            <h4 className="mb-3 mt-4">{t('settings.profileUpdated')}</h4>
            <p className="text-muted fs-15 mb-4">{t('settings.changesSaved')}</p>
            <div className="hstack gap-2 justify-content-center">
              <button className="btn btn-primary" onClick={() => setShowSuccessModal(false)}>{t('settings.close')}</button>
            </div>
          </div>
        </ModalBody>
      </Modal>

      <Modal isOpen={showDeleteModal} toggle={() => setShowDeleteModal(false)} centered>
        <ModalBody className='text-center p-5'>
          <div className="text-end">
            <button type="button" onClick={() => setShowDeleteModal(false)} className="btn-close text-end" />
          </div>
          <div className="mt-2">
            <lord-icon src="https://cdn.lordicon.com/gsqxdxog.json" trigger="loop" colors="primary:#f7b84b,secondary:#f06548" style={{ width: "100px", height: "100px" }} />
            <div className="mt-4 pt-2 fs-15 mx-4 mx-sm-5">
              <h4>{t('settings.areYouSure')}</h4>
              <p className="text-muted mx-4 mb-0">{t('settings.permanentDeleteWarning')}</p>
            </div>
          </div>
          <div className="d-flex gap-2 justify-content-center mt-4 mb-2">
            <button type="button" className="btn w-sm btn-light" onClick={() => setShowDeleteModal(false)}>{t('settings.cancel')}</button>
            <button type="button" className="btn w-sm btn-danger" onClick={confirmDeleteAccount} disabled={isDeleting}>{isDeleting ? t('settings.deleting') : t('settings.yesDelete')}</button>
          </div>
        </ModalBody>
      </Modal>

      <Modal isOpen={showSuccessModaloassword} toggle={() => setShowSuccessModaloassword(false)} centered>
        <ModalBody className='text-center p-5'>
          <div className="text-end">
            <button type="button" onClick={() => setShowSuccessModaloassword(false)} className="btn-close text-end" />
          </div>
          <div className="mt-2">
            <lord-icon src="https://cdn.lordicon.com/tqywkdcz.json" trigger="hover" style={{ width: "150px", height: "150px" }} />
            <h4 className="mb-3 mt-4">{t('settings.passwordUpdated')}</h4>
            <p className="text-muted fs-15 mb-4">{t('settings.changesSaved')}</p>
            <div className="hstack gap-2 justify-content-center">
              <button className="btn btn-primary" onClick={() => setShowSuccessModaloassword(false)}>{t('settings.close')}</button>
            </div>
          </div>
        </ModalBody>
      </Modal>

      <Modal isOpen={showTransferSuccessModal} toggle={() => setShowTransferSuccessModal(false)} centered>
        <ModalBody className='text-center p-5'>
          <div className="text-end">
            <button type="button" onClick={() => setShowTransferSuccessModal(false)} className="btn-close text-end" />
          </div>
          <div className="mt-2">
            <lord-icon src="https://cdn.lordicon.com/lupuorrc.json" trigger="hover" style={{ width: "150px", height: "150px" }} />
            <h4 className="mb-3 mt-4">{t('settings.transfer.confirmationSentTitle')}</h4>
            <p className="text-muted fs-15 mb-4">{t('settings.transfer.confirmationSentMessage')}</p>
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
              <button className="btn btn-primary" onClick={() => setShowTransferSuccessModal(false)}>{t('settings.close')}</button>
            </div>
          </div>
        </ModalBody>
      </Modal>

      <Modal isOpen={showFinalizeConfirmModal} toggle={() => setShowFinalizeConfirmModal(false)} centered>
        <ModalHeader toggle={() => setShowFinalizeConfirmModal(false)}>{t('settings.transfer.finalizeTransferTitle', 'Finalize Account Transfer')}</ModalHeader>
        <ModalBody>
          <div className="alert alert-warning">
            <i className="ri-alert-line me-2 fs-16 align-middle"></i>
            <strong>{t('settings.transfer.warning', 'Warning')}:</strong> {t('settings.transfer.finalizeWarningMessage', 'Completing this transfer will immediately log you out of this account and transfer all administrative access to the new email address.')}
          </div>
          <p>{t('settings.transfer.finalizeConfirmMessage', 'Are you sure you want to finalize the transfer of your account to the new email address? This action cannot be undone.')}</p>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowFinalizeConfirmModal(false)}>{t('settings.cancel', 'Cancel')}</Button>
          <Button color="primary" onClick={handleFinalizeTransfer} disabled={finalizing}>{finalizing ? t('settings.transfer.finalizing', 'Finalizing...') : t('settings.transfer.finalize', 'Finalize Transfer')}</Button>
        </ModalFooter>
      </Modal>
    </React.Fragment>
  );
};

export default Settings;
