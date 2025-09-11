import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  FormGroup,
  Label,
  Input,
  Alert,
  Spinner,
  Card,
  CardBody,
  Badge,
  Progress
} from 'reactstrap';
import { FaExchangeAlt, FaBuilding, FaUser, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaEnvelope, FaClock } from 'react-icons/fa';
import { checkTransferEligibility, transferBuilding, clearTransferState, clearAllBuildingState } from '../../slices/buildings/building';
import { withTranslation } from 'react-i18next';
import { logout } from '../../slices/login/loginSlice';

const BuildingTransferModal = ({ isOpen, toggle, building, t }) => {
  const dispatch = useDispatch();
  const { transfer } = useSelector((state) => state.Building);

  const [formData, setFormData] = useState({
    targetEmail: '',
    confirmEmail: ''
  });
  const [step, setStep] = useState(1); // 1: Email entry, 2: Eligibility check, 3: Final confirmation
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setFormData({ targetEmail: '', confirmEmail: '' });
      setStep(1);
      setErrors({});
      dispatch(clearTransferState());
    }
  }, [isOpen, dispatch]);



  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.targetEmail.trim()) {
      newErrors.targetEmail = t('buildingTransfer.errors.targetEmailRequired');
    } else if (!validateEmail(formData.targetEmail)) {
      newErrors.targetEmail = t('buildingTransfer.errors.invalidEmail');
    }

    if (!formData.confirmEmail.trim()) {
      newErrors.confirmEmail = t('buildingTransfer.errors.confirmEmailRequired');
    } else if (formData.targetEmail !== formData.confirmEmail) {
      newErrors.confirmEmail = t('buildingTransfer.errors.emailMismatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleCheckEligibility = () => {
    if (validateForm()) {
      dispatch(checkTransferEligibility({
        buildingId: building._id,
        email: formData.targetEmail
      })).then((result) => {
        if (result.type === 'building/checkTransferEligibility/fulfilled') {
          setStep(2);
        }
      });
    }
  };

  const handleTransfer = async () => {
    try {
      const result = await dispatch(transferBuilding({
        buildingId: building._id,
        targetEmail: formData.targetEmail,
        confirmEmail: formData.confirmEmail
      }));
      
      if (result.type === 'building/transferBuilding/fulfilled') {
        // Email sent successfully - just show success message
        console.log('Transfer email sent successfully');
        // No immediate logout needed - user can close modal
      } else {
        console.log('Transfer email failed:', result);
      }
    } catch (error) {
      console.error('Transfer email failed:', error);
    }
  };



  const resetToFirstStep = () => {
    setStep(1);
    setErrors({});
    dispatch(clearTransferState());
  };

  const renderStepIndicator = () => (
    <div className="mb-4">
      <div className="d-flex justify-content-between align-items-center">
        <div className={`text-center ${step >= 1 ? 'text-primary' : 'text-muted'}`}>
          <div className={`rounded-circle d-inline-flex align-items-center justify-content-center ${
            step >= 1 ? 'bg-primary text-white' : 'bg-light'
          }`} style={{ width: '30px', height: '30px' }}>
            {step > 1 ? <FaCheckCircle size={12} /> : '1'}
          </div>
          <div className="small mt-1">{t('buildingTransfer.steps.enterEmail')}</div>
        </div>
        
        <div className={`flex-grow-1 mx-2 ${step >= 2 ? 'bg-primary' : 'bg-light'}`} style={{ height: '2px' }}></div>
        
        <div className={`text-center ${step >= 2 ? 'text-primary' : 'text-muted'}`}>
          <div className={`rounded-circle d-inline-flex align-items-center justify-content-center ${
            step >= 2 ? 'bg-primary text-white' : 'bg-light'
          }`} style={{ width: '30px', height: '30px' }}>
            {step > 2 ? <FaCheckCircle size={12} /> : '2'}
          </div>
          <div className="small mt-1">{t('buildingTransfer.steps.checkEligibility')}</div>
        </div>
        
        <div className={`flex-grow-1 mx-2 ${step >= 3 ? 'bg-primary' : 'bg-light'}`} style={{ height: '2px' }}></div>
        
        <div className={`text-center ${step >= 3 ? 'text-success' : 'text-muted'}`}>
          <div className={`rounded-circle d-inline-flex align-items-center justify-content-center ${
            step >= 3 ? 'bg-success text-white' : 'bg-light'
          }`} style={{ width: '30px', height: '30px' }}>
            {step >= 3 ? <FaCheckCircle size={12} /> : '3'}
          </div>
          <div className="small mt-1">{t('buildingTransfer.steps.complete')}</div>
        </div>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div>
      <Alert color="info" className="mb-4">
        <FaExclamationTriangle className="me-2" />
        {t('buildingTransfer.warning')}
      </Alert>

      <Card className="mb-4">
        <CardBody>
          <h6 className="mb-3">
            <FaBuilding className="me-2" />
            {t('buildingTransfer.buildingInfo')}
          </h6>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <div className="fw-bold">{building.name}</div>
              <div className="text-muted small">{building.matricule}</div>
            </div>
            <div className="text-end">
              <Badge color="info">{building.blocs?.length || 0} {t('buildingTransfer.blocs')}</Badge>
              <br />
              <Badge color="secondary" className="mt-1">
                {building.blocs?.reduce((total, bloc) => total + (bloc.apartments?.length || 0), 0) || 0} {t('buildingTransfer.apartments')}
              </Badge>
            </div>
          </div>
        </CardBody>
      </Card>

      <Form>
        <FormGroup>
          <Label for="targetEmail">{t('buildingTransfer.targetEmail')}</Label>
          <Input
            type="email"
            id="targetEmail"
            name="targetEmail"
            value={formData.targetEmail}
            onChange={handleInputChange}
            invalid={!!errors.targetEmail}
            placeholder={t('buildingTransfer.targetEmailPlaceholder')}
          />
          {errors.targetEmail && <div className="invalid-feedback">{errors.targetEmail}</div>}
        </FormGroup>

        <FormGroup>
          <Label for="confirmEmail">{t('buildingTransfer.confirmEmail')}</Label>
          <Input
            type="email"
            id="confirmEmail"
            name="confirmEmail"
            value={formData.confirmEmail}
            onChange={handleInputChange}
            invalid={!!errors.confirmEmail}
            placeholder={t('buildingTransfer.confirmEmailPlaceholder')}
          />
          {errors.confirmEmail && <div className="invalid-feedback">{errors.confirmEmail}</div>}
        </FormGroup>
      </Form>

      {transfer?.error && (
        <Alert color="danger" className="mt-3">
          {transfer.error}
        </Alert>
      )}
    </div>
  );

  const renderStep2 = () => {
    const { eligibilityCheck } = transfer || {};

    if (!eligibilityCheck) return null;

    return (
      <div>
        <Card className="mb-4">
          <CardBody>
            <h6 className="mb-3">
              <FaUser className="me-2" />
              {t('buildingTransfer.targetUserInfo')}
            </h6>
            <div className="mb-3">
              <strong>{eligibilityCheck.user.firstName} {eligibilityCheck.user.lastName}</strong>
              <br />
              <span className="text-muted">{eligibilityCheck.user.email}</span>
            </div>

            <div className="row">
              <div className="col-md-6">
                <h6 className="text-primary">{t('buildingTransfer.buildingLimits')}</h6>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span>{t('buildingTransfer.current')}: {eligibilityCheck.limits.buildings.current}</span>
                  <span>{t('buildingTransfer.limit')}: {eligibilityCheck.limits.buildings.limit}</span>
                </div>
                <Progress 
                  value={(eligibilityCheck.limits.buildings.current / eligibilityCheck.limits.buildings.limit) * 100}
                  color={eligibilityCheck.limits.buildings.eligible ? 'success' : 'danger'}
                />
                <div className="text-center mt-1">
                  {eligibilityCheck.limits.buildings.eligible ? (
                    <Badge color="success">
                      <FaCheckCircle className="me-1" />
                      {t('buildingTransfer.eligible')}
                    </Badge>
                  ) : (
                    <Badge color="danger">
                      <FaTimesCircle className="me-1" />
                      {t('buildingTransfer.notEligible')}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="col-md-6">
                <h6 className="text-primary">{t('buildingTransfer.apartmentLimits')}</h6>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span>{t('buildingTransfer.current')}: {eligibilityCheck.limits.apartments.current}</span>
                  <span>{t('buildingTransfer.limit')}: {eligibilityCheck.limits.apartments.limit}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span>{t('buildingTransfer.transferringAmount')}: {eligibilityCheck.limits.apartments.transferAmount}</span>
                </div>
                <Progress 
                  value={((eligibilityCheck.limits.apartments.current + eligibilityCheck.limits.apartments.transferAmount) / eligibilityCheck.limits.apartments.limit) * 100}
                  color={eligibilityCheck.limits.apartments.eligible ? 'success' : 'danger'}
                />
                <div className="text-center mt-1">
                  {eligibilityCheck.limits.apartments.eligible ? (
                    <Badge color="success">
                      <FaCheckCircle className="me-1" />
                      {t('buildingTransfer.eligible')}
                    </Badge>
                  ) : (
                    <Badge color="danger">
                      <FaTimesCircle className="me-1" />
                      {t('buildingTransfer.notEligible')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {eligibilityCheck.eligible ? (
          <Alert color="success">
            <FaCheckCircle className="me-2" />
            {t('buildingTransfer.readyToTransfer')}
          </Alert>
        ) : (
          <Alert color="danger">
            <FaTimesCircle className="me-2" />
            {t('buildingTransfer.cannotTransfer')}
          </Alert>
        )}

        {transfer?.error && (
          <Alert color="danger" className="mt-3">
            {transfer.error}
          </Alert>
        )}
      </div>
    );
  };

  const renderStep3 = () => {
    if (!transfer?.success) {
      // Before transfer - show confirmation
      return (
        <div className="text-center">
          <div className="mb-4">
            <FaExclamationTriangle size={64} className="text-warning" />
          </div>
          <h4 className="text-warning mb-3">{t('buildingTransfer.finalConfirmation')}</h4>
          <p className="text-muted mb-4">
            {t('buildingTransfer.emailConfirmationMessage', {
              buildingName: building?.name || '',
              targetEmail: formData.targetEmail
            })}
          </p>
          
          <Alert color="info" className="mb-3">
            <FaEnvelope className="me-2" />
            <strong>{t('buildingTransfer.emailConfirmationRequired')}</strong>
          </Alert>
        </div>
      );
    }

    // After transfer email sent - show success
    return (
      <div className="text-center">
        <div className="mb-4">
          <FaCheckCircle size={64} className="text-success" />
        </div>
        <h4 className="text-success mb-3">{t('buildingTransfer.emailSent')}</h4>
        <p className="text-muted mb-4">
          {t('buildingTransfer.emailSentMessage', {
            buildingName: building?.name || '',
            targetEmail: formData.targetEmail
          })}
        </p>
        
        <Alert color="info" className="mb-3">
          <FaEnvelope className="me-2" />
          <strong>{t('buildingTransfer.nextStepsEmail')}</strong>
        </Alert>
        
        <Alert color="warning" className="mb-3">
          <FaClock className="me-2" />
          <strong>{t('buildingTransfer.emailExpiry')}</strong>
        </Alert>
      </div>
    );
  };

  const handleModalToggle = () => {
    toggle();
  };

  return (
    <Modal isOpen={isOpen} toggle={handleModalToggle} size="lg" centered>
      <ModalHeader toggle={step === 3 ? null : handleModalToggle} className="bg-light">
        <div className="d-flex align-items-center">
          <FaExchangeAlt className="me-2 text-primary" />
          {t('buildingTransfer.title')}
        </div>
      </ModalHeader>

      <ModalBody>
        {renderStepIndicator()}
        
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ModalBody>

      <ModalFooter>
        {step === 1 && (
          <>
            <Button color="secondary" onClick={toggle}>
              {t('common.cancel')}
            </Button>
            <Button 
              color="primary" 
              onClick={handleCheckEligibility}
              disabled={transfer?.loading}
            >
              {transfer?.loading ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  {t('buildingTransfer.checking')}
                </>
              ) : (
                t('buildingTransfer.checkEligibility')
              )}
            </Button>
          </>
        )}

        {step === 2 && (
          <>
            <Button 
              color="secondary" 
              onClick={resetToFirstStep}
              disabled={transfer?.loading}
            >
              {t('common.back')}
            </Button>
            {transfer?.eligibilityCheck?.eligible && (
              <Button 
                color="primary" 
                onClick={() => setStep(3)}
              >
                {t('buildingTransfer.proceedToTransfer')}
              </Button>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <Button 
              color="secondary" 
              onClick={() => setStep(2)}
              disabled={transfer?.loading || transfer?.success}
            >
              {t('common.back')}
            </Button>
            {!transfer?.success && (
              <Button 
                color="primary" 
                onClick={handleTransfer}
                disabled={transfer?.loading}
              >
                {transfer?.loading ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    {t('buildingTransfer.sendingEmail')}
                  </>
                ) : (
                  t('buildingTransfer.sendConfirmationEmail')
                )}
              </Button>
            )}
            {transfer?.success && (
              <Button 
                color="success" 
                onClick={toggle}
              >
                {t('common.close')}
              </Button>
            )}
          </>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default withTranslation()(BuildingTransferModal);
