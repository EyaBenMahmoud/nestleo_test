import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  createCoowner,
  fetchBlocApartments,
  fetchBuildingBlocs,
  fetchBuildings
} from '../../../slices/buildings/building';
import {
  Button,
  Col,
  Form,
  Input,
  Label,
  Modal,
  Row,
  FormGroup,
  Alert,
  Badge,
  Spinner,
  FormFeedback
} from 'reactstrap';
import SuccessModal from '../../../Components/Common/SucessModal';
import { getAllCoowners } from '../../../slices/buildings/building';

const AddMemberModal = ({ isOpen, toggle, buildingId, onSuccess, t }) => {
  const [mode, setMode] = useState('new'); // 'new' or 'existing'
  const [successModal, setSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingAssignment, setExistingAssignment] = useState(null);
  const [forceAdd, setForceAdd] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const dispatch = useDispatch();

  const { buildings } = useSelector((state) => state.Building?.buildings || []);
  const { usersLoading } = useSelector((state) => state.Building);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'SyndicateCoowner',
    buildingId: buildingId || '',
    blocIds: [],
    apartmentIds: [],
    ownershipStatus: true
  });

  const [formErrors, setFormErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    blocIds: '',
    apartmentIds: ''
  });

  // Reset form when modal opens or after successful submission
  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      role: 'SyndicateCoowner',
      buildingId: buildingId || '',
      blocIds: [],
      apartmentIds: [],
      ownershipStatus: true
    });
    setFormErrors({
      firstName: '',
      lastName: '',
      email: '',
      blocIds: '',
      apartmentIds: ''
    });
    setExistingAssignment(null);
    setForceAdd(false);
    setSelectedUser(null);
    setMode('new');
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, buildingId]);

  // Get nested data with apartment ownership info
  const selectedBuilding = buildings.find(b => b._id === formData.buildingId);
  const blocs = selectedBuilding?.blocs || [];
  const selectedBlocs = blocs.filter(b => formData.blocIds.includes(b._id));
  
  // Get all apartments from selected blocs
  const allApartmentsFromSelectedBlocs = selectedBlocs.reduce((acc, bloc) => {
    return [...acc, ...(bloc.apartments || [])];
  }, []);
  
  const availableApartments = formData.ownershipStatus
    ? allApartmentsFromSelectedBlocs.filter(apt => !apt.coOwner)
    : allApartmentsFromSelectedBlocs;

  // Fetch existing users when in 'existing' mode
  useEffect(() => {
    if (mode === 'existing' && formData.buildingId) {
      dispatch(getAllCoowners())
        .unwrap()
        .then(users => setAvailableUsers(users))
        .catch(() => setAvailableUsers([]));
    }
  }, [mode, formData.buildingId, dispatch]);

  // Fetch buildings on modal open if no buildingId provided
  useEffect(() => {
    if (isOpen && !buildingId) {
      dispatch(fetchBuildings());
    }
  }, [isOpen, buildingId, dispatch]);

  // Fetch blocs when building changes
  useEffect(() => {
    if (formData.buildingId && (!selectedBuilding?.blocs || selectedBuilding.blocs.length === 0)) {
      dispatch(fetchBuildingBlocs(formData.buildingId));
    }
  }, [formData.buildingId, dispatch, selectedBuilding]);

  // Fetch apartments when bloc changes
  useEffect(() => {
    if (formData.blocIds.length > 0) {
      formData.blocIds.forEach(blocId => {
        const bloc = blocs.find(b => b._id === blocId);
        if (!bloc?.apartments || bloc.apartments.length === 0) {
          dispatch(fetchBlocApartments(blocId));
        }
      });
    }
  }, [formData.blocIds, dispatch, blocs]);

  // Validate field
  // Validate field
  const validateField = (name, value) => {
    let error = '';
    if (!value) {
      error = t('createBuildingModal.fieldRequired');
    } else {
      switch (name) {
        case 'email':
          if (!/^(?!\.)[a-zA-Z0-9._%+-]{1,64}@(?!-)[a-zA-Z0-9-]{2,63}(?<!-)\.(?!-)[a-zA-Z]{2,63}(?<!-)$/.test(value.trim())) {
            error = t('createBuildingModal.invalidEmail');
          }
          break;
        case 'firstName':
          if (value.length < 2) {
            error = t('createBuildingModal.minLength', { length: 2 });
          } else if (!/^[A-Za-zÀ-ÖØ-öø-ÿ]+(?: [A-Za-zÀ-ÖØ-öø-ÿ]+)*$/.test(value)) {
            error = t('createBuildingModal.alphaOnly');
          }
          break;

        case 'lastName':
          if (value.length < 2) {
            error = t('createBuildingModal.minLength', { length: 2 });
          } else if (!/^[A-Za-zÀ-ÖØ-öø-ÿ]+(?: [A-Za-zÀ-ÖØ-öø-ÿ]+)*$/.test(value)) {
            error = t('createBuildingModal.alphaOnly');
          }
          break;


      }
    }
    return error;
  };

  // Handle field changes with validation
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'buildingId' && { blocIds: [], apartmentIds: [] })
    }));

    if (name === 'firstName' || name === 'lastName' || name === 'email') {
      setFormErrors(prev => ({
        ...prev,
        [name]: validateField(name, value)
      }));
    }
  };

  // Handle multiple selection for blocs
  const handleBlocChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({
      ...prev,
      blocIds: selectedOptions,
      apartmentIds: [] // Reset apartments when blocs change
    }));
  };

  // Handle multiple selection for apartments
  const handleApartmentChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({
      ...prev,
      apartmentIds: selectedOptions
    }));
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setFormData(prev => ({
      ...prev,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email
    }));
    setFormErrors(prev => ({
      ...prev,
      firstName: '',
      lastName: '',
      email: ''
    }));
  };

  // Validate form
  const validateForm = () => {
    const errors = {
      firstName: mode === 'new' ? validateField('firstName', formData.firstName) : '',
      lastName: mode === 'new' ? validateField('lastName', formData.lastName) : '',
      email: mode === 'new' ? validateField('email', formData.email) : '',
      blocIds: formData.blocIds.length === 0 ? t('createBuildingModal.fieldRequired') : '',
      apartmentIds: formData.apartmentIds.length === 0 ? t('createBuildingModal.fieldRequired') : '',
      userSelected: mode === 'existing' && !selectedUser ? t('createBuildingModal.selectCoowner') : ''
    };

    setFormErrors(errors);

    if (mode === 'existing' && !selectedUser) {
      return false;
    }

    return !Object.values(errors).some(error => error);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      alert(t('createBuildingModal.fillAllRequiredFields'));
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        userId: selectedUser?._id
      };

      const result = await dispatch(createCoowner(payload)).unwrap();

      if (result.existingAssignment) {
        setExistingAssignment(result.existingAssignment);
        setIsSubmitting(false);
        return;
      }

      if (onSuccess) {
        onSuccess();
      }

      setSuccessMessage(
        result.isNewUser
          ? t('createBuildingModal.newCoownerSuccess')
          : t('createBuildingModal.coownerAssignedSuccess')
      );
      setSuccessModal(true);
      resetForm(); // Reset form after successful submission
      resetForm(); // Reset form after successful submission
      setTimeout(() => {
        window.location.reload(); // Refresh the page after showing success modal
      }, 1500); // Delay to allow success modal to be visible briefly
    } catch (error) {
      if (error?.existingCoowner) {
        setExistingAssignment({
          email: error.existingCoowner,
          message: error.message
        });
      } else {
        alert(error.message || t('createBuildingModal.createFailed'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForceAdd = () => {
    setForceAdd(true);
    setFormData(prev => ({
      ...prev,
      ownershipStatus: false
    }));
  };

  const toggleMode = () => {
    setMode(mode === 'new' ? 'existing' : 'new');
    setSelectedUser(null);
    setFormData(prev => ({
      ...prev,
      firstName: '',
      lastName: '',
      email: ''
    }));
    setFormErrors(prev => ({
      ...prev,
      firstName: '',
      lastName: '',
      email: ''
    }));
  };

  return (
    <React.Fragment>
      <Modal isOpen={isOpen} toggle={toggle} size="lg" className="add-member-modal">
        <div className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4 className="modal-title">
              {mode === 'new' ? t('createBuildingModal.addNewCoowner') : t('createBuildingModal.assignExistingCoowner')}
            </h4>
            <Button
              color="primary"
              outline
              onClick={toggleMode}
              className="mode-toggle-btn"
            >
              {mode === 'new' ? (
                <>
                  <i className="ri-user-add-line me-2"></i>
                  {t('createBuildingModal.assignExistingUser')}
                </>
              ) : (
                <>
                  <i className="ri-user-follow-line me-2"></i>
                  {t('createBuildingModal.createNewUser')}
                </>
              )}
            </Button>
          </div>

          {existingAssignment && !forceAdd && (
            <Alert color="warning" className="mb-4">
              <h5 className="alert-heading">{t('createBuildingModal.assignmentConflict')}</h5>
              <p>
                {existingAssignment.message ||
                  t('createBuildingModal.apartmentAssigned', { email: existingAssignment.email })}
              </p>
              <div className="mt-2">
                <Button color="secondary" onClick={() => setExistingAssignment(null)}>
                  {t('createBuildingModal.cancel')}
                </Button>
              </div>
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            {mode === 'existing' && (
              <Col lg={12} className="mb-4">
                <Label className="form-label">{t('createBuildingModal.selectExistingUser')}</Label>
                {usersLoading ? (
                  <div className="text-center">
                    <Spinner size="sm" /> {t('createBuildingModal.loadingUsers')}
                  </div>
                ) : (
                  <div className="user-select-container">
                    {availableUsers.length > 0 ? (
                      <div className="user-grid">
                        {availableUsers.map(user => (
                          <div
                            key={user._id}
                            className={`user-card ${selectedUser?._id === user._id ? 'active' : ''}`}
                            onClick={() => handleUserSelect(user)}
                          >
                            <div className="user-info">
                              <strong>{user.firstName} {user.lastName}</strong>
                              <div className="text-muted">{user.email}</div>
                            </div>
                            <div className="user-buildings">
                              {user.buildings?.slice(0, 2).map(b => (
                                <Badge color="info" className="me-1" key={b._id}>
                                  {b.name}
                                </Badge>
                              ))}
                              {user.buildings?.length > 2 && (
                                <Badge color="light">+{user.buildings.length - 2} more</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Alert color="info">
                        {t('createBuildingModal.noUsersFound')}
                      </Alert>
                    )}
                  </div>
                )}
              </Col>
            )}

            <Row className="g-3">
              {mode === 'new' && (
                <>
                  <Col lg={6}>
                    <FormGroup>
                      <Label className="form-label">{t('createBuildingModal.firstName')} *</Label>
                      <Input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        invalid={!!formErrors.firstName}
                        className="form-control-modern"
                        placeholder={t('createBuildingModal.enterFirstName')}
                      />
                      <FormFeedback>{formErrors.firstName}</FormFeedback>
                    </FormGroup>
                  </Col>

                  <Col lg={6}>
                    <FormGroup>
                      <Label className="form-label">{t('createBuildingModal.lastName')} *</Label>
                      <Input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        invalid={!!formErrors.lastName}
                        className="form-control-modern"
                        placeholder={t('createBuildingModal.enterLastName')}
                      />
                      <FormFeedback>{formErrors.lastName}</FormFeedback>
                    </FormGroup>
                  </Col>

                  <Col lg={12}>
                    <FormGroup>
                      <Label className="form-label">{t('createBuildingModal.email')} *</Label>
                      <Input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        invalid={!!formErrors.email}
                        className="form-control-modern"
                        placeholder={t('createBuildingModal.enterEmail')}
                      />
                      <FormFeedback>{formErrors.email}</FormFeedback>
                    </FormGroup>
                  </Col>
                </>
              )}

              <Col lg={12}>
                <FormGroup>
                  <div className="d-flex justify-content-between align-items-center">
                    <Label className="form-label">{t('createBuildingModal.bloc')} *</Label>
                    {formData.blocIds.length > 0 && (
                      <Badge color="primary" className="selected-items-badge">
                        {formData.blocIds.length} {t('createBuildingModal.selected')}
                      </Badge>
                    )}
                  </div>
                  <div className="multi-select-container">
                    <Input
                      type="select"
                      multiple
                      name="blocIds"
                      value={formData.blocIds}
                      onChange={handleBlocChange}
                      invalid={!!formErrors.blocIds}
                      className="form-control-modern"
                      style={{ minHeight: '120px' }}
                    >
                      {blocs.map(bloc => (
                        <option key={bloc._id} value={bloc._id}>
                          {bloc.name}
                        </option>
                      ))}
                    </Input>
                    <FormFeedback>{formErrors.blocIds}</FormFeedback>
                    {blocs.length === 0 && (
                      <small className="text-warning multi-select-help">
                        {t('createBuildingModal.noBlocsAvailable')}
                      </small>
                    )}
                    <small className="text-info multi-select-help">
                      {t('createBuildingModal.multiSelectBlocsHelp')}
                    </small>
                  </div>
                </FormGroup>
              </Col>

              <Col lg={12}>
                <FormGroup>
                  <div className="d-flex justify-content-between align-items-center">
                    <Label className="form-label">{t('createBuildingModal.apartment')} *</Label>
                    {formData.apartmentIds.length > 0 && (
                      <Badge color="success" className="selected-items-badge">
                        {formData.apartmentIds.length} {t('createBuildingModal.selected')}
                      </Badge>
                    )}
                  </div>
                  <div className="multi-select-container">
                    <Input
                      type="select"
                      multiple
                      name="apartmentIds"
                      value={formData.apartmentIds}
                      onChange={handleApartmentChange}
                      disabled={formData.blocIds.length === 0 || availableApartments.length === 0}
                      invalid={!!formErrors.apartmentIds}
                      className="form-control-modern"
                      style={{ minHeight: '120px' }}
                    >
                      {availableApartments.map(apartment => (
                        <option key={`${apartment._id}-${apartment.number}`} value={apartment._id}>
                          {`#${apartment.number} (${t('createBuildingModal.floorLabel')} ${apartment.floor})`}
                          {apartment.coOwner && ` - ${t('createBuildingModal.alreadyAssigned')}`}
                        </option>
                      ))}
                    </Input>
                    <FormFeedback>{formErrors.apartmentIds}</FormFeedback>
                    {formData.blocIds.length === 0 && (
                      <small className="text-muted multi-select-help">
                        {t('createBuildingModal.firstSelectBloc')}
                      </small>
                    )}
                    {formData.blocIds.length > 0 && availableApartments.length === 0 && (
                      <small className="text-danger multi-select-help">
                        {formData.ownershipStatus
                          ? t('createBuildingModal.noUnassignedApartments')
                          : t('createBuildingModal.noApartmentsAvailable')}
                      </small>
                    )}
                    <small className="text-info multi-select-help">
                      {t('createBuildingModal.multiSelectApartmentsHelp')}
                    </small>
                  </div>
                </FormGroup>
              </Col>

              <Col lg={12} className="mt-4">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                  <Button color="outline-secondary" onClick={toggle} className="btn-modern btn-cancel" size="lg">
                    {t('createBuildingModal.cancel')}
                  </Button>

                  {/* Error message for existing mode */}
                  {mode === 'existing' && !selectedUser && (
                    <div className="text-danger flex-grow-1 text-center">
                      {t('createBuildingModal.selectCoowner')}
                    </div>
                  )}

                  <Button
                    type="submit"
                    color="primary"
                    disabled={
                      isSubmitting ||
                      (mode === 'existing' && !selectedUser) ||
                      (mode === 'new' && (
                        !formData.firstName ||
                        !formData.lastName ||
                        !formData.email ||
                        formData.blocIds.length === 0 ||
                        formData.apartmentIds.length === 0 ||
                        !!formErrors.firstName ||
                        !!formErrors.lastName ||
                        !!formErrors.email
                      ))
                    }
                    className="btn-modern btn-create"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Spinner size="sm" />
                        {t('createBuildingModal.processing')}
                      </>
                    ) : mode === 'new' ? t('createBuildingModal.createCoowner') : t('createBuildingModal.assignCoowner')}
                  </Button>
                </div>
              </Col>
            </Row>
          </Form>
        </div>
      </Modal>

      <SuccessModal
        isOpen={successModal}
        toggle={() => {
          setSuccessModal(false);
          toggle(); // Close the main modal after success
        }}
        message={successMessage}
        messageLowerCase={t('createBuildingModal.checkEmail')}
      />

      <style jsx>{`
        .add-member-modal {
          max-width: 700px;
        }
        .modal-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #2a2f4f;
        }
        .form-label {
          font-weight: 500;
          color: #405189;
          margin-bottom: 0.5rem;
        }
        .form-control-modern {
          border-radius: 6px;
          border: 1px solid #ced4da;
          padding: 0.5rem 1rem;
          transition: all 0.3s ease;
        }
        .form-control-modern:focus {
          border-color: #405189;
          box-shadow: 0 0 0 3px rgba(64, 81, 137, 0.1);
        }
        .btn-modern {
          border-radius: 6px;
          padding: 0.75rem 2rem;
          font-weight: 500;
          transition: all 0.3s ease;
          min-width: 120px;
        }
        .btn-modern:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .btn-create {
          background-color: #405189;
          border-color: #405189;
          color: white;
          font-weight: 600;
          min-width: 180px;
        }
        .btn-create:hover {
          background-color: #334066;
          border-color: #334066;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(64, 81, 137, 0.3);
        }
        .btn-cancel {
          color: #6c757d;
          border-color: #6c757d;
          background-color: transparent;
          min-width: 120px;
        }
        .btn-cancel:hover {
          background-color: #f8f9fa;
          color: #495057;
          border-color: #495057;
        }
        .mode-toggle-btn {
          border: 1px solid #405189;
          border-radius: 6px;
          padding: 0.5rem 1rem;
          color: #405189;
          font-weight: 500;
          background-color: transparent;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .mode-toggle-btn:hover {
          background-color: #f3f6f9;
          color: #405189;
          transform: translateY(-1px);
        }
        .user-select-container {
          border: 1px solid #e0e4e8;
          border-radius: 6px;
          max-height: 250px;
          overflow-y: auto;
          padding: 10px;
          background-color: #f8f9fa;
        }
        .user-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 12px;
        }
        .user-card {
          padding: 12px;
          border: 1px solid #e0e4e8;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          background-color: white;
        }
        .user-card:hover {
          background-color: #f1f4f8;
          transform: translateY(-1px);
        }
        .user-card.active {
          background-color: #e9f7fe;
          border-color: #bee1fa;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .user-info {
          margin-bottom: 8px;
        }
        .user-buildings {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .alert {
          border-radius: 6px;
          padding: 1rem;
        }
        .alert-heading {
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
        }
        .multi-select-container {
          position: relative;
        }
        .multi-select-container select[multiple] {
          min-height: 120px;
          background-image: none;
          border: 1px solid #ced4da;
          border-radius: 6px;
          padding: 8px;
        }
        .multi-select-container select[multiple]:focus {
          border-color: #405189;
          box-shadow: 0 0 0 3px rgba(64, 81, 137, 0.1);
        }
        .multi-select-container select[multiple] option {
          padding: 8px 12px;
          margin: 2px 0;
          border-radius: 4px;
          cursor: pointer;
        }
        .multi-select-container select[multiple] option:checked {
          background-color: #405189;
          color: white;
        }
        .multi-select-container select[multiple] option:hover {
          background-color: #f1f4f8;
        }
        .multi-select-help {
          font-size: 0.875rem;
          color: #6c757d;
          margin-top: 0.25rem;
        }
        .selected-items-count {
          position: absolute;
          top: -8px;
          right: 8px;
          background-color: #405189;
          color: white;
          border-radius: 12px;
          padding: 2px 8px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .selected-items-badge {
          font-size: 0.75rem;
          padding: 4px 8px;
          border-radius: 12px;
        }
      `}</style>
    </React.Fragment>
  );
};

export default AddMemberModal;