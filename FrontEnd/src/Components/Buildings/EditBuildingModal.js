import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEdit, FaLayerGroup, FaHome, FaIdCard, FaMapMarkerAlt, FaPlus, FaTrash, FaBuilding, FaBed } from 'react-icons/fa';
import {
    Button,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Form,
    FormGroup,
    Label,
    Input,
    InputGroup,
    InputGroupText,
    Row,
    Col,
    Alert,
    Badge,
    FormFeedback
} from 'reactstrap';
import { toast } from 'react-toastify';
import { useDispatch } from 'react-redux';
import { updateBuilding } from '../../slices/buildings/building';
import { withTranslation } from "react-i18next";
import { isInTrialPeriod, extractFeatureValue } from '../Subscriptions/SubcriptionValidator';

// Same country and city data as in CreateBuildingModal
const countries = [
    { code: 'TN', name: 'Tunisia' },
    { code: 'US', name: 'United States' },
    { code: 'FR', name: 'France' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'DE', name: 'Germany' },
    { code: 'IT', name: 'Italy' },
    { code: 'ES', name: 'Spain' },
    { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' },
    { code: 'BR', name: 'Brazil' },
    { code: 'IN', name: 'India' },
    { code: 'CN', name: 'China' },
    { code: 'JP', name: 'Japan' },
    { code: 'RU', name: 'Russia' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'EG', name: 'Egypt' },
    { code: 'MA', name: 'Morocco' },
    { code: 'DZ', name: 'Algeria' },
    { code: 'AE', name: 'United Arab Emirates' },
    { code: 'SA', name: 'Saudi Arabia' }
];

const cities = {
    'TN': ['Tunis', 'Sfax', 'Sousse', 'Kairouan', 'Bizerte', 'Gabès', 'Ariana', 'Gafsa'],
    'US': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'],
    'FR': ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille'],
    'GB': ['London', 'Birmingham', 'Manchester', 'Glasgow', 'Liverpool', 'Newcastle', 'Sheffield', 'Leeds', 'Bristol', 'Nottingham'],
    'DE': ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Dortmund', 'Essen', 'Leipzig'],
    'IT': ['Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Genoa', 'Bologna', 'Florence', 'Bari', 'Catania'],
    'ES': ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Málaga', 'Murcia', 'Palma', 'Las Palmas', 'Bilbao'],
    'CA': ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec City', 'Hamilton', 'Halifax'],
    'AU': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Canberra', 'Newcastle', 'Wollongong', 'Hobart'],
    'BR': ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Manaus', 'Curitiba', 'Recife', 'Porto Alegre'],
    'IN': ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Surat', 'Pune', 'Jaipur'],
    'CN': ['Shanghai', 'Beijing', 'Chongqing', 'Tianjin', 'Guangzhou', 'Shenzhen', 'Chengdu', 'Nanjing', 'Wuhan', 'Xi\'an'],
    'JP': ['Tokyo', 'Yokohama', 'Osaka', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 'Kyoto', 'Kawasaki', 'Saitama'],
    'RU': ['Moscow', 'Saint Petersburg', 'Novosibirsk', 'Yekaterinburg', 'Nizhny Novgorod', 'Kazan', 'Chelyabinsk', 'Omsk', 'Samara', 'Rostov-on-Don'],
    'ZA': ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth', 'Bloemfontein', 'East London', 'Polokwane'],
    'EG': ['Cairo', 'Alexandria', 'Giza', 'Shubra El Kheima', 'Port Said', 'Suez', 'Mansoura', 'Tanta'],
    'MA': ['Casablanca', 'Rabat', 'Fes', 'Marrakesh', 'Agadir', 'Tangier', 'Meknes', 'Oujda'],
    'DZ': ['Algiers', 'Oran', 'Constantine', 'Annaba', 'Blida', 'Batna', 'Djelfa', 'Sétif'],
    'AE': ['Dubai', 'Abu Dhabi', 'Sharjah', 'Al Ain', 'Ajman', 'Ras Al Khaimah', 'Fujairah'],
    'SA': ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar', 'Ta\'if', 'Tabuk']
};

const EditBuildingModal = ({
    isOpen,
    toggle,
    buildingData,
    canAddApartmentsToBuilding,
    approachingApartmentLimit,
    apartmentLimit,
    buildingApartmentCount,
    canCreate,
    approachingLimit,
    buildingLimit,
    buildingCount,
    onSuccess,
    onUpdateBuilding,
    t
}) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Form state
    const [editFormData, setEditFormData] = useState(null);
    const [newBloc, setNewBloc] = useState({ name: '', apartments: [], isExpanded: true });
    const [newApartment, setNewApartment] = useState({
        number: '',
        floor: '',
        bedrooms: '1'
    });
    const [deletedBlocIds, setDeletedBlocIds] = useState([]);

    // Form validation states
    const [formErrors, setFormErrors] = useState({
        name: '',
        matricule: '',
        address_street: '',
        address_number: '',
        address_city: '',
        address_country: '',
        blocName: '',
        apartmentNumber: '',
        apartmentFloor: '',
        apartmentBedrooms: ''
    });

    // Update local state when buildingData changes
    useEffect(() => {
        if (buildingData) {
            setEditFormData(buildingData);
            setFormErrors({
                name: '',
                matricule: '',
                address_street: '',
                address_number: '',
                address_city: '',
                address_country: '',
                blocName: '',
                apartmentNumber: '',
                apartmentFloor: '',
                apartmentBedrooms: ''
            });
        }
    }, [buildingData]);

    // Validate field
    const validateField = (name, value) => {
        let error = '';
        if (!value && value !== 0) { // Allow 0 for numeric fields like floor
            error = t('editBuildingModal.fieldRequired');
        } else {
            switch (name) {
                case 'address_number':
                case 'apartmentNumber':
                    if (!/^(0|[1-9]\d*)$/.test(value)) {
                        error = t('editBuildingModal.numericOnly');
                    }
                    break;
                case 'apartmentFloor':
                    if (!/^-?(0|[1-9]\d*)$/.test(value)) {
                        error = t('editBuildingModal.numericOnly');
                    }
                    break;
                case 'matricule':
                    if (!/^[A-Z]{2}[A-Z0-9]{5}$/.test(value)) {
                        error = t('editBuildingModal.invalidMatriculeFormat');
                    }
                    break;
                case 'name':
                case 'blocName':
                    if (value.length < 3) {
                        error = t('editBuildingModal.minLength', { length: 3 });
                    }
                    break;
                case 'address_street':
                    if (value.length < 5) {
                        error = t('editBuildingModal.minLength', { length: 5 });
                    }
                    break;
                case 'apartmentBedrooms':
                    if (!value) {
                        error = t('editBuildingModal.bedroomsRequired');
                    }
                    break;
            }
        }
        return error;
    };

    // Validate apartment number uniqueness
    const validateApartmentNumberUniqueness = (number, blocIndex) => {
        if (!editFormData) return '';

        // Check if the number exists in any bloc
        for (let i = 0; i < editFormData.blocs.length; i++) {
            // Skip the current bloc (when editing existing apartment)
            if (i === blocIndex) continue;

            const bloc = editFormData.blocs[i];
            if (bloc.apartments && bloc.apartments.some(apt => apt.number === number)) {
                return t('editBuildingModal.apartmentNumberExists');
            }
        }
        return '';
    };
    const generateMatricule = (countryCode) => {
        const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let randomCode = '';
        for (let i = 0; i < 5; i++) {
            randomCode += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return `${countryCode || 'XX'}${randomCode}`;
    };

    // Handle building field change with validation
    const handleFieldChange = (e, fieldName) => {
        const value = e.target.value;

        // Special handling for country field
        if (fieldName === 'address_country' && value !== editFormData?.address_country) {
            // Update matricule when country changes
            const newMatricule = generateMatricule(value);

            setEditFormData(prev => ({
                ...prev,
                [fieldName]: value,
                address_city: '', // Reset city when country changes
                matricule: newMatricule // Update matricule with new country code
            }));

            // Clear any matricule validation errors since we have a new valid matricule
            setFormErrors(prev => ({
                ...prev,
                [fieldName]: validateField(fieldName, value),
                address_city: '',
                matricule: ''
            }));
        } else {
            setEditFormData(prev => ({ ...prev, [fieldName]: value }));
            setFormErrors(prev => ({ ...prev, [fieldName]: validateField(fieldName, value) }));
        }
    };

    // Handle bloc deletion in the UI
    const handleDeleteBloc = (blocIndex) => {
        if (!editFormData) return;

        const blocToDelete = editFormData.blocs[blocIndex];

        // If the bloc has an ID (existing bloc), track it for deletion
        if (blocToDelete._id) {
            setDeletedBlocIds([...deletedBlocIds, blocToDelete._id]);
        }

        // Remove the bloc from form data
        const updatedBlocs = [...editFormData.blocs];
        updatedBlocs.splice(blocIndex, 1);
        setEditFormData({ ...editFormData, blocs: updatedBlocs });

        toast.success(t('editBuildingModal.blocRemoved'));
    };

    // Handle apartment deletion
    const handleDeleteApartment = (blocIndex, apartmentIndex) => {
        if (!editFormData) return;

        // Create a deep copy of the editFormData to avoid reference issues
        const updatedFormData = JSON.parse(JSON.stringify(editFormData));

        // Remove the apartment from the bloc
        updatedFormData.blocs[blocIndex].apartments.splice(apartmentIndex, 1);

        // Update the state with the new data
        setEditFormData(updatedFormData);

        // Show feedback to user
        toast.success(t('editBuildingModal.apartmentRemoved'));
    };

    // Validate new apartment fields
    const validateNewApartment = () => {
        const errors = {
            apartmentNumber: validateField('apartmentNumber', newApartment.number),
            apartmentFloor: validateField('apartmentFloor', newApartment.floor),
            apartmentBedrooms: validateField('apartmentBedrooms', newApartment.bedrooms)
        };

        setFormErrors(prev => ({
            ...prev,
            ...errors
        }));

        return !Object.values(errors).some(error => error);
    };

    // For editing: add a new apartment to a bloc
    const editAddApartment = (blocIndex) => {
        if (!editFormData) return;

        if (!validateNewApartment()) {
            toast.warning(t('editBuildingModal.pleaseFixErrors'));
            return;
        }

        // Check for unique apartment number
        const numberError = validateApartmentNumberUniqueness(newApartment.number, blocIndex);
        if (numberError) {
            setFormErrors(prev => ({ ...prev, apartmentNumber: numberError }));
            toast.warning(numberError);
            return;
        }

        // Check apartment limit - if user is in trial period, allow unlimited apartments
        if (!isInTrialPeriod(editFormData?.user)) {
            let maxApartments = null;
            if (editFormData?.user?.subscription?.planId?.features) {
                maxApartments = extractFeatureValue(editFormData.user.subscription.planId.features, "Appartements par immeuble");
            }

            const currentApartmentCount = editFormData.blocs.reduce(
                (total, bloc) => total + bloc.apartments.length, 0
            ) + 1; // +1 for the one we're adding

            if (maxApartments !== -1 && maxApartments !== null && currentApartmentCount > maxApartments) {
                toast.error(t('editBuildingModal.apartmentLimitReachedMessage', { limit: maxApartments }));
                return;
            }
        }

        // Create a deep copy of the editFormData
        const updatedFormData = JSON.parse(JSON.stringify(editFormData));

        // Make sure all required fields are included
        const apartmentToAdd = {
            number: newApartment.number,
            floor: newApartment.floor,
            bedrooms: newApartment.bedrooms || '1'
        };

        // Add apartment to the bloc
        if (!updatedFormData.blocs[blocIndex].apartments) {
            updatedFormData.blocs[blocIndex].apartments = [];
        }
        updatedFormData.blocs[blocIndex].apartments.push(apartmentToAdd);

        // Update state
        setEditFormData(updatedFormData);

        // Reset new apartment form
        setNewApartment({ number: '', floor: '', bedrooms: '1' });

        // Clear validation errors
        setFormErrors(prev => ({
            ...prev,
            apartmentNumber: '',
            apartmentFloor: '',
            apartmentBedrooms: ''
        }));

        toast.success(t('editBuildingModal.apartmentAdded'));
    };

    // Validate new bloc fields
    const validateNewBloc = () => {
        const blocNameError = validateField('blocName', newBloc.name);
        setFormErrors(prev => ({ ...prev, blocName: blocNameError }));
        return !blocNameError;
    };

    // For editing: add a new bloc
    const editAddBloc = () => {
        if (!editFormData) return;

        if (!validateNewBloc()) {
            toast.warning(t('editBuildingModal.pleaseFixErrors'));
            return;
        }

        // Require at least one apartment in the bloc (like in CreateBuildingModal)
        if (newBloc.apartments.length === 0) {
            toast.warning(t('editBuildingModal.addAtLeastOneApartment'));
            return;
        }

        // Create a deep copy of the current state
        const updatedFormData = JSON.parse(JSON.stringify(editFormData));

        // Add the new bloc
        if (!updatedFormData.blocs) {
            updatedFormData.blocs = [];
        }
        updatedFormData.blocs.push({
            name: newBloc.name,
            apartments: [...newBloc.apartments], // Make sure to copy apartments
            isExpanded: true
        });

        // Update state
        setEditFormData(updatedFormData);

        // Reset new bloc form
        setNewBloc({ name: '', apartments: [], isExpanded: true });

        // Clear validation error
        setFormErrors(prev => ({ ...prev, blocName: '' }));

        toast.success(t('editBuildingModal.blocAdded'));
    };

    // Add apartment to the current new bloc (before adding the bloc)
    const addApartmentToNewBloc = () => {
        if (!newApartment.number || !newApartment.floor || !newApartment.bedrooms) {
            toast.warning(t('editBuildingModal.enterApartmentDetails'));
            return;
        }

        // Check for unique apartment number across all blocs
        for (const bloc of editFormData?.blocs || []) {
            if (bloc.apartments && bloc.apartments.some(apt => apt.number === newApartment.number)) {
                setFormErrors(prev => ({
                    ...prev,
                    apartmentNumber: t('editBuildingModal.apartmentNumberExists')
                }));
                toast.warning(t('editBuildingModal.apartmentNumberExists'));
                return;
            }
        }

        // Check for unique apartment number within the current new bloc
        if (newBloc.apartments.some(apt => apt.number === newApartment.number)) {
            setFormErrors(prev => ({
                ...prev,
                apartmentNumber: t('editBuildingModal.apartmentNumberExists')
            }));
            toast.warning(t('editBuildingModal.apartmentNumberExists'));
            return;
        }

        setNewBloc({
            ...newBloc,
            apartments: [...newBloc.apartments, { ...newApartment }]
        });

        // Reset new apartment form
        setNewApartment({ number: '', floor: '', bedrooms: '1' });

        // Clear validation errors
        setFormErrors(prev => ({
            ...prev,
            apartmentNumber: '',
            apartmentFloor: '',
            apartmentBedrooms: ''
        }));
    };

    // Delete apartment from the new bloc (before adding the bloc)
    const deleteApartmentFromNewBloc = (index) => {
        setNewBloc({
            ...newBloc,
            apartments: newBloc.apartments.filter((_, i) => i !== index)
        });
    };

    // Handle apartment field changes with validation
    const handleApartmentFieldChange = (e, fieldName) => {
        const value = e.target.value;
        setNewApartment(prev => ({ ...prev, [fieldName]: value }));

        // Validate the field
        if (fieldName === 'number') {
            const error = validateField('apartmentNumber', value);
            setFormErrors(prev => ({ ...prev, apartmentNumber: error }));
        } else if (fieldName === 'floor') {
            const error = validateField('apartmentFloor', value);
            setFormErrors(prev => ({ ...prev, apartmentFloor: error }));
        } else if (fieldName === 'bedrooms') {
            const error = validateField('apartmentBedrooms', value);
            setFormErrors(prev => ({ ...prev, apartmentBedrooms: error }));
        }
    };

    // Handle bloc name change with validation
    const handleBlocNameChange = (e) => {
        const value = e.target.value;
        setNewBloc(prev => ({ ...prev, name: value }));
        setFormErrors(prev => ({ ...prev, blocName: validateField('blocName', value) }));
    };

    // Validate the entire form
    const validateForm = () => {
        const errors = {
            name: validateField('name', editFormData?.name || ''),
            matricule: validateField('matricule', editFormData?.matricule || ''),
            address_street: validateField('address_street', editFormData?.address_street || ''),
            address_number: validateField('address_number', editFormData?.address_number || ''),
            address_city: validateField('address_city', editFormData?.address_city || ''),
            address_country: validateField('address_country', editFormData?.address_country || '')
        };

        // Check for empty floors in all apartments
        let hasEmptyFloors = false;
        if (editFormData?.blocs) {
            for (const bloc of editFormData.blocs) {
                if (bloc.apartments) {
                    for (const apartment of bloc.apartments) {
                        if (apartment.floor === null || apartment.floor === undefined || apartment.floor === '') {
                            hasEmptyFloors = true;
                            break;
                        }
                    }
                    if (hasEmptyFloors) break;
                }
            }
        }

        setFormErrors(prev => ({
            ...prev,
            ...errors,
            hasEmptyFloors: hasEmptyFloors ? t('editBuildingModal.floorRequiredForAllApartments') : ''
        }));

        // Check if any bloc is empty (has no apartments)
        const hasEmptyBlocs = editFormData?.blocs?.some(bloc =>
            !bloc.apartments || bloc.apartments.length === 0
        );

        if (hasEmptyBlocs) {
            toast.warning(t('editBuildingModal.noEmptyBlocsAllowed'));
            return false;
        }

        if (hasEmptyFloors) {
            toast.error(t('editBuildingModal.floorRequiredForAllApartments'));
            return false;
        }

        return !Object.values(errors).some(error => error) && !hasEmptyFloors;
    };
    // Handle save changes
    const handleSaveChanges = async () => {
        if (!editFormData) return;

        if (!validateForm()) {
            toast.error(t('editBuildingModal.pleaseFixFormErrors'));
            return;
        }

        try {
            // Create a clean copy of the data to send to the backend
            const buildingData = {
                name: editFormData.name,
                matricule: editFormData.matricule,
                address_street: editFormData.address_street,
                address_number: editFormData.address_number,
                address_city: editFormData.address_city,
                address_country: editFormData.address_country,

                // Include only the blocs that remain after editing
                blocs: editFormData.blocs.map(bloc => ({
                    _id: bloc._id,
                    name: bloc.name,
                    apartments: bloc.apartments.map(apt => ({
                        _id: apt._id,
                        number: apt.number,
                        floor: apt.floor,
                        bedrooms: apt.bedrooms || '1'
                    }))
                })),

                // Include deleted blocs if any
                deletedBlocIds: deletedBlocIds
            };

            console.log("Sending update with data:", JSON.stringify(buildingData));

            const result = await dispatch(updateBuilding({
                buildingId: editFormData._id,
                buildingData
            }));

            if (result.meta.requestStatus === 'fulfilled') {
                toast.success(t('editBuildingModal.updateSuccess'));
                // Reset states
                setDeletedBlocIds([]);
                setNewBloc({ name: '', apartments: [], isExpanded: true });
                setNewApartment({ number: '', floor: '', bedrooms: '1' });
                setFormErrors({
                    name: '',
                    matricule: '',
                    address_street: '',
                    address_number: '',
                    address_city: '',
                    address_country: '',
                    blocName: '',
                    apartmentNumber: '',
                    apartmentFloor: '',
                    apartmentBedrooms: ''
                });
                onSuccess();  // Call the success callback function
            } else {
                toast.error(t('editBuildingModal.updateFailed'));
            }
        } catch (error) {
            console.error("Error updating building:", error);
            toast.error(error.message || t('editBuildingModal.updateFailed'));
        }
    };

    // Update apartment fields in a bloc
    const handleUpdateApartment = (blocIndex, aptIndex, field, value) => {
        const updatedFormData = JSON.parse(JSON.stringify(editFormData));
        updatedFormData.blocs[blocIndex].apartments[aptIndex][field] = value;
        setEditFormData(updatedFormData);
    };

    if (!editFormData) return null;

    return (
        <Modal isOpen={isOpen} toggle={toggle} size="lg" className="building-modal" style={{ maxWidth: '900px' }}>
            <ModalHeader toggle={toggle} className="building-modal-header">
                <div className="d-flex align-items-center">
                    <div className="modal-icon-container edit-icon">
                        <FaEdit />
                    </div>
                    <div>
                        <h5 className="modal-title">{t('editBuildingModal.editBuilding')}</h5>
                        <small className="text-muted">{editFormData?.name || t('editBuildingModal.updateBuildingInfo')}</small>
                    </div>
                </div>
            </ModalHeader>
            <ModalBody>
                {canAddApartmentsToBuilding && approachingApartmentLimit && (
                    <Alert color="info" className="mb-3">
                        <div className="d-flex">
                            <div className="flex-shrink-0">
                                <i className="fas fa-info-circle" style={{ fontSize: "1.5rem", marginRight: "0.75rem" }}></i>
                            </div>
                            <div>
                                <h5 className="text-info">{t('editBuildingModal.approachingApartmentLimit')}</h5>
                                <p>{t('editBuildingModal.approachingApartmentLimitMessage', { limit: apartmentLimit, count: buildingApartmentCount })}</p>
                                <Button color="link" className="p-0" onClick={() => {
                                    toggle();
                                    navigate('/subscription');
                                }}>
                                    {t('editBuildingModal.considerUpgrading')}
                                </Button>
                            </div>
                        </div>
                    </Alert>
                )}

                {/* Display a warning if apartment limit is reached */}
                {!canAddApartmentsToBuilding && (
                    <Alert color="warning" className="mb-3">
                        <div className="d-flex">
                            <div className="flex-shrink-0">
                                <i className="fas fa-exclamation-triangle" style={{ fontSize: "1.5rem", marginRight: "0.75rem" }}></i>
                            </div>
                            <div>
                                <h5 className="text-warning">{t('editBuildingModal.apartmentLimitReached')}</h5>
                                <p>{t('editBuildingModal.apartmentLimitReachedMessage', { limit: apartmentLimit })}</p>
                                <Button color="link" className="p-0" onClick={() => {
                                    toggle();
                                    navigate('/subscription');
                                }}>
                                    {t('editBuildingModal.upgradeForMoreApartments')}
                                </Button>
                            </div>
                        </div>
                    </Alert>
                )}

                {canCreate && approachingLimit && (
                    <Alert color="info" className="mb-3">
                        <div className="d-flex">
                            <div className="flex-shrink-0">
                                <i className="fas fa-info-circle" style={{ fontSize: "1.5rem", marginRight: "0.75rem" }}></i>
                            </div>
                            <div>
                                <h5 className="text-info">{t('editBuildingModal.approachingBuildingLimit')}</h5>
                                <p>{t('editBuildingModal.approachingBuildingLimitMessage', { limit: buildingLimit, count: buildingCount })}</p>
                                <Button color="link" className="p-0" onClick={() => {
                                    toggle();
                                    navigate('/subscription');
                                }}>
                                    {t('editBuildingModal.considerUpgrading')}
                                </Button>
                            </div>
                        </div>
                    </Alert>
                )}

                <Form>
                    <div className="edit-building-form">
                        <div className="section-header">
                            <h5 className="section-title">{t('editBuildingModal.buildingInformation')}</h5>
                        </div>
                        <Row className="mb-3">
                            <Col md={6}>
                                <FormGroup>
                                    <Label className="form-label">{t('editBuildingModal.buildingName')} *</Label>
                                    <InputGroup>
                                        <InputGroupText className="input-group-icon">
                                            <FaBuilding />
                                        </InputGroupText>
                                        <Input
                                            value={editFormData.name}
                                            onChange={(e) => handleFieldChange(e, 'name')}
                                            className="form-control-modern"
                                            invalid={!!formErrors.name}
                                        />
                                        <FormFeedback>{formErrors.name}</FormFeedback>
                                    </InputGroup>
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label className="form-label">{t('editBuildingModal.matricule')} <span className="text-danger">*</span></Label>
                                    <InputGroup>
                                        <InputGroupText className="input-group-icon">
                                            <FaIdCard />
                                        </InputGroupText>
                                        <Input
                                            value={editFormData.matricule || ''}
                                            readOnly
                                            className="form-control-modern form-control-disabled"
                                            invalid={!!formErrors.matricule}
                                        />
                                        <FormFeedback>{formErrors.matricule}</FormFeedback>
                                    </InputGroup>
                                </FormGroup>
                            </Col>
                        </Row>

                        <FormGroup className="mb-3">
                            <Label className="form-label">{t('editBuildingModal.streetAddress')} *</Label>
                            <InputGroup>
                                <InputGroupText className="input-group-icon">
                                    <FaMapMarkerAlt />
                                </InputGroupText>
                                <Input
                                    value={editFormData.address_street}
                                    onChange={(e) => handleFieldChange(e, 'address_street')}
                                    className="form-control-modern"
                                    invalid={!!formErrors.address_street}
                                />
                                <FormFeedback>{formErrors.address_street}</FormFeedback>
                            </InputGroup>
                        </FormGroup>

                        <Row className="mb-4">
                            <Col md={4}>
                                <FormGroup>
                                    <Label className="form-label">{t('editBuildingModal.number')} *</Label>
                                    <Input
                                        value={editFormData.address_number}
                                        onChange={(e) => handleFieldChange(e, 'address_number')}
                                        className="form-control-modern"
                                        invalid={!!formErrors.address_number}
                                    />
                                    <FormFeedback>{formErrors.address_number}</FormFeedback>
                                </FormGroup>
                            </Col>
                            <Col md={4}>
                                <FormGroup>
                                    <Label className="form-label">{t('editBuildingModal.country')} *</Label>
                                    <Input
                                        type="select"
                                        value={editFormData.address_country}
                                        onChange={(e) => handleFieldChange(e, 'address_country')}
                                        className="form-control-modern"
                                        invalid={!!formErrors.address_country}
                                    >
                                        <option value="">{t('editBuildingModal.selectCountry')}</option>
                                        {countries.map(country => (
                                            <option key={country.code} value={country.code}>{country.name}</option>
                                        ))}
                                    </Input>
                                    <FormFeedback>{formErrors.address_country}</FormFeedback>
                                </FormGroup>
                            </Col>
                            <Col md={4}>
                                <FormGroup>
                                    <Label className="form-label">{t('editBuildingModal.city')} *</Label>
                                    <Input
                                        type="select"
                                        value={editFormData.address_city}
                                        onChange={(e) => handleFieldChange(e, 'address_city')}
                                        className="form-control-modern"
                                        invalid={!!formErrors.address_city}
                                        disabled={!editFormData.address_country}
                                    >
                                        <option value="">{t('editBuildingModal.selectCity')}</option>
                                        {editFormData.address_country && cities[editFormData.address_country]?.map(city => (
                                            <option key={city} value={city}>{city}</option>
                                        ))}
                                    </Input>
                                    <FormFeedback>{formErrors.address_city}</FormFeedback>
                                </FormGroup>
                            </Col>
                        </Row>

                        <div className="section-header">
                            <h5 className="section-title">
                                <FaLayerGroup className="me-2" />
                                {t('editBuildingModal.buildingStructure')}
                                <small className="text-muted ms-2">{t('editBuildingModal.blocsAndApartments')}</small>
                            </h5>
                        </div>

                        {/* New bloc creation section */}
                        <div className="bloc-editor mb-4">
                            <div className="bloc-header">
                                <h6 className="bloc-title">
                                    <FaLayerGroup className="me-2" />
                                    {t('editBuildingModal.addNewBloc')}
                                </h6>
                            </div>

                            <div className="bloc-content p-3 bg-light border rounded">
                                <Row className="mb-3">
                                    <Col md={8}>
                                        <FormGroup>
                                            <Label className="form-label">{t('editBuildingModal.blocName')} *</Label>
                                            <InputGroup>
                                                <InputGroupText className="input-group-icon">
                                                    <FaLayerGroup />
                                                </InputGroupText>
                                                <Input
                                                    value={newBloc.name}
                                                    onChange={handleBlocNameChange}
                                                    placeholder={t('editBuildingModal.enterBlocName')}
                                                    invalid={!!formErrors.blocName}
                                                    className="form-control-modern"
                                                />
                                                <FormFeedback>{formErrors.blocName}</FormFeedback>
                                            </InputGroup>
                                        </FormGroup>
                                    </Col>
                                    <Col md={4} className="d-flex align-items-end">
                                        <Button
                                            color="primary"
                                            onClick={editAddBloc}
                                            className="btn-modern w-100"
                                            style={{ marginBottom: "1px" }}
                                            disabled={!newBloc.name || newBloc.apartments.length === 0 || !!formErrors.blocName}
                                        >
                                            <FaPlus className="me-1" /> {t('editBuildingModal.addBloc')}
                                        </Button>
                                    </Col>
                                </Row>

                                {newBloc.name && (
                                    <div className="apartment-section bg-white p-3 border rounded">
                                        {newBloc.apartments.length > 0 && (
                                            <div className="apartment-tags mb-3">
                                                <div className="d-flex flex-wrap gap-2">
                                                    {newBloc.apartments.map((apt, idx) => (
                                                        <Badge color="light" pill className="apartment-tag p-2 d-flex align-items-center" key={idx}>
                                                            <FaHome className="me-1" />
                                                            <span>#{apt.number} ({t('editBuildingModal.floorLabel')} {apt.floor}, {apt.bedrooms} {t('editBuildingModal.bedrooms')})</span>
                                                            <Button
                                                                color="link"
                                                                className="p-0 ms-2 text-danger"
                                                                onClick={() => deleteApartmentFromNewBloc(idx)}
                                                                title={t('editBuildingModal.removeApartment')}
                                                            >
                                                                <FaTrash size={12} />
                                                            </Button>
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="apartment-form">
                                            <h6 className="apartment-form-title">
                                                <FaHome className="me-2" />
                                                {t('editBuildingModal.addApartments')}
                                            </h6>

                                            <Row className="g-2">
                                                <Col md={3}>
                                                    <FormGroup>
                                                        <Label className="form-label">{t('editBuildingModal.apartmentNumber')} *</Label>
                                                        <Input
                                                            value={newApartment.number}
                                                            onChange={(e) => handleApartmentFieldChange(e, 'number')}
                                                            placeholder={t('editBuildingModal.enterApartmentNumber')}
                                                            invalid={!!formErrors.apartmentNumber}
                                                            className="form-control-modern"
                                                        />
                                                        <FormFeedback>{formErrors.apartmentNumber}</FormFeedback>
                                                    </FormGroup>
                                                </Col>
                                                <Col md={3}>
                                                    <FormGroup>
                                                        <Label className="form-label">{t('editBuildingModal.floor')} *</Label>
                                                        <Input
                                                            value={newApartment.floor}
                                                            onChange={(e) => handleApartmentFieldChange(e, 'floor')}
                                                            placeholder={t('editBuildingModal.enterFloorNumber')}
                                                            invalid={!!formErrors.apartmentFloor}
                                                            className="form-control-modern"
                                                        />
                                                        <FormFeedback>{formErrors.apartmentFloor}</FormFeedback>
                                                    </FormGroup>
                                                </Col>
                                                <Col md={4}>
                                                    <FormGroup>
                                                        <Label className="form-label">{t('editBuildingModal.bedrooms')} *</Label>
                                                        <Input
                                                            type="select"
                                                            value={newApartment.bedrooms}
                                                            onChange={(e) => handleApartmentFieldChange(e, 'bedrooms')}
                                                            className="form-control-modern"
                                                            invalid={!!formErrors.apartmentBedrooms}
                                                        >
                                                            {[1, 2, 3, 4, 5].map(num => (
                                                                <option key={num} value={num}>{num} {t('editBuildingModal.bedrooms')}</option>
                                                            ))}
                                                        </Input>
                                                        <FormFeedback>{formErrors.apartmentBedrooms}</FormFeedback>
                                                    </FormGroup>
                                                </Col>
                                                <Col md={2} className="d-flex align-items-end">
                                                    <Button
                                                        color="primary"
                                                        outline
                                                        onClick={addApartmentToNewBloc}
                                                        className="btn-modern w-100 mb-1"
                                                        disabled={
                                                            !newApartment.number ||
                                                            !newApartment.floor ||
                                                            !newApartment.bedrooms ||
                                                            !!formErrors.apartmentNumber ||
                                                            !!formErrors.apartmentFloor ||
                                                            !!formErrors.apartmentBedrooms
                                                        }
                                                    >
                                                        <FaPlus /> {t('editBuildingModal.addApartment')}
                                                    </Button>
                                                </Col>
                                            </Row>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="existing-blocs-header">
                            <h6 className="blocs-list-title">{t('editBuildingModal.existingBlocs')}</h6>
                        </div>

                        <div className="edit-blocs-list">
                            {editFormData.blocs?.map((bloc, bIndex) => (
                                <div className="edit-bloc-item" key={bIndex}>
                                    <div className="edit-bloc-header">
                                        <div className="edit-bloc-title">
                                            <FaLayerGroup className="me-2" />
                                            <Input
                                                type="text"
                                                value={bloc.name}
                                                onChange={(e) => {
                                                    const updatedBlocs = editFormData.blocs.map((b, idx) =>
                                                        idx === bIndex ? { ...b, name: e.target.value } : b
                                                    );
                                                    setEditFormData({
                                                        ...editFormData,
                                                        blocs: updatedBlocs
                                                    });
                                                }}
                                                className="form-control-modern border-0 p-0 bg-transparent bloc-name-input"
                                                placeholder={t('editBuildingModal.blocName')}
                                                invalid={bloc.name.length < 3}
                                            />
                                            {bloc.name.length < 3 && (
                                                <div className="invalid-feedback d-block">{t('editBuildingModal.minLength', { length: 3 })}</div>
                                            )}
                                        </div>
                                        <Button
                                            color="danger"
                                            className="mx-1"
                                            size="sm"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleDeleteBloc(bIndex);
                                            }}
                                            title={t('editBuildingModal.deleteBloc')}
                                        >
                                            <FaTrash />
                                        </Button>
                                        <Badge color="info" pill className="edit-bloc-count">
                                            {bloc.apartments?.length || 0} {t('editBuildingModal.apartments')}
                                        </Badge>
                                    </div>

                                    <div className="edit-apartments-list">
                                        {bloc.apartments?.map((apt, aIndex) => (
                                            <div className="edit-apartment-item" key={aIndex}>
                                                <div className="apartment-number">
                                                    <Label className="form-label small">{t('editBuildingModal.apartmentNumber')} *</Label>
                                                    <Input
                                                        value={apt.number}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            handleUpdateApartment(bIndex, aIndex, 'number', value);
                                                        }}
                                                        className="form-control-modern"
                                                        placeholder={t('editBuildingModal.number')}
                                                        invalid={!apt.number || !/^\d+$/.test(apt.number)}
                                                    />
                                                    {!apt.number && (
                                                        <div className="invalid-feedback">{t('editBuildingModal.fieldRequired')}</div>
                                                    )}
                                                    {apt.number && !/^\d+$/.test(apt.number) && (
                                                        <div className="invalid-feedback">{t('editBuildingModal.numericOnly')}</div>
                                                    )}
                                                </div>
                                                <div className="apartment-floor">
                                                    <Label className="form-label small">{t('editBuildingModal.floor')} *</Label>
                                                    <Input
                                                        value={apt.floor}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            handleUpdateApartment(bIndex, aIndex, 'floor', value);
                                                        }}
                                                        className="form-control-modern"
                                                        placeholder={t('editBuildingModal.floor')}
                                                        invalid={!apt.floor || !/^-?\d+$/.test(apt.floor)}
                                                    />
                                                    {!apt.floor && (
                                                        <div className="invalid-feedback">{t('editBuildingModal.fieldRequired')}</div>
                                                    )}
                                                    {apt.floor && !/^-?\d+$/.test(apt.floor) && (
                                                        <div className="invalid-feedback">{t('editBuildingModal.numericOnly')}</div>
                                                    )}
                                                </div>
                                                <div className="apartment-bedrooms">
                                                    <Label className="form-label small">{t('editBuildingModal.bedrooms')} *</Label>
                                                    <Input
                                                        type="select"
                                                        value={apt.bedrooms || '1'}
                                                        onChange={(e) => {
                                                            handleUpdateApartment(bIndex, aIndex, 'bedrooms', e.target.value);
                                                        }}
                                                        className="form-control-modern"
                                                    >
                                                        {[1, 2, 3, 4, 5].map(num => (
                                                            <option key={num} value={num}>{num} {t('editBuildingModal.bedrooms')}</option>
                                                        ))}
                                                    </Input>
                                                </div>
                                                <Button
                                                    color="danger"
                                                    size="sm"
                                                    outline
                                                    className="delete-apartment-btn"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleDeleteApartment(bIndex, aIndex);
                                                    }}
                                                    title={t('editBuildingModal.deleteApartment')}
                                                    disabled={bloc.apartments?.length <= 1} // Prevent deleting the last apartment
                                                >
                                                    <FaTrash />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="add-apartment-form">
                                        <Row className="g-2">
                                            <Col md={3}>
                                                <FormGroup>
                                                    <Label className="form-label small">{t('editBuildingModal.apartmentNumber')} *</Label>
                                                    <Input
                                                        value={newApartment.number}
                                                        onChange={(e) => handleApartmentFieldChange(e, 'number')}
                                                        placeholder={t('editBuildingModal.newApartmentNumber')}
                                                        className="form-control-modern"
                                                        invalid={!!formErrors.apartmentNumber}
                                                    />
                                                    <FormFeedback>{formErrors.apartmentNumber}</FormFeedback>
                                                </FormGroup>
                                            </Col>
                                            <Col md={3}>
                                                <FormGroup>
                                                    <Label className="form-label small">{t('editBuildingModal.floor')} *</Label>
                                                    <Input
                                                        value={newApartment.floor}
                                                        onChange={(e) => handleApartmentFieldChange(e, 'floor')}
                                                        placeholder={t('editBuildingModal.newApartmentFloor')}
                                                        className="form-control-modern"
                                                        invalid={!!formErrors.apartmentFloor}
                                                    />
                                                    <FormFeedback>{formErrors.apartmentFloor}</FormFeedback>
                                                </FormGroup>
                                            </Col>
                                            <Col md={3}>
                                                <FormGroup>
                                                    <Label className="form-label small">{t('editBuildingModal.bedrooms')} *</Label>
                                                    <Input
                                                        type="select"
                                                        value={newApartment.bedrooms}
                                                        onChange={(e) => handleApartmentFieldChange(e, 'bedrooms')}
                                                        className="form-control-modern"
                                                        invalid={!!formErrors.apartmentBedrooms}
                                                    >
                                                        {[1, 2, 3, 4, 5].map(num => (
                                                            <option key={num} value={num}>{num} {t('editBuildingModal.bedrooms')}</option>
                                                        ))}
                                                    </Input>
                                                    <FormFeedback>{formErrors.apartmentBedrooms}</FormFeedback>
                                                </FormGroup>
                                            </Col>
                                            <Col md={3} className="d-flex align-items-end">
                                                <Button
                                                    color="info"
                                                    outline
                                                    onClick={() => editAddApartment(bIndex)}
                                                    className="btn-modern w-100"
                                                    disabled={
                                                        !newApartment.number ||
                                                        !newApartment.floor ||
                                                        !newApartment.bedrooms ||
                                                        !!formErrors.apartmentNumber ||
                                                        !!formErrors.apartmentFloor ||
                                                        !!formErrors.apartmentBedrooms ||
                                                        !canAddApartmentsToBuilding
                                                    }
                                                    title={!canAddApartmentsToBuilding ? t('editBuildingModal.apartmentLimitReachedTooltip', { limit: apartmentLimit }) : ""}
                                                    style={{ marginBottom: "16px" }}
                                                >
                                                    <FaPlus /> {t('editBuildingModal.add')}
                                                </Button>
                                            </Col>
                                        </Row>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Form>
            </ModalBody>
            <ModalFooter>
                <Button color="light" onClick={toggle} className="btn-modern">
                    <i className="ri-close-line me-1"></i> {t('editBuildingModal.cancel')}
                </Button>
                <Button
                    color="primary"
                    onClick={handleSaveChanges}
                    className="btn-modern"
                    disabled={
                        Object.values(formErrors).some(error => !!error) ||
                        editFormData?.blocs?.some(bloc =>
                            bloc.apartments?.some(apt =>
                                apt.floor === null || apt.floor === undefined || apt.floor === '' ||
                                apt.number === null || apt.number === undefined || apt.number === '' ||
                                apt.bedrooms === null || apt.bedrooms === undefined || apt.bedrooms === ''
                            )
                        )
                    }
                >
                    <i className="ri-save-line me-1"></i> {t('editBuildingModal.saveChanges')}
                </Button>
            </ModalFooter>

            <style jsx>{`
                /* Apartment Edit Styling */
                .edit-building-form {
                    padding: 10px;
                }
                
                .section-header {
                    margin-bottom: 20px;
                    border-bottom: 1px solid #e9e9ef;
                    padding-bottom: 10px;
                }
                
                .section-title {
                    color: #495057;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    margin-bottom: 0;
                }
                
                .edit-blocs-list {
                    margin-bottom: 20px;
                }
                
                .edit-bloc-item {
                    background-color: #f8f9fa;
                    border: 1px solid #e9e9ef;
                    border-radius: 8px;
                    padding: 16px;
                    margin-bottom: 16px;
                }
                
                .edit-bloc-header {
                    display: flex;
                    align-items: center;
                    margin-bottom: 16px;
                }
                
                .edit-bloc-title {
                    display: flex;
                    align-items: center;
                    margin-bottom: 0;
                    margin-right: auto;
                    flex: 1;
                }
                
                .bloc-name-input {
                    font-weight: 600;
                    font-size: 1.1rem;
                    color: #495057;
                    transition: all 0.2s;
                }
                
                .bloc-name-input:focus {
                    border-bottom: 1px solid #e9e9ef !important;
                    background-color: rgba(255,255,255,0.5) !important;
                }
                
                .edit-bloc-count {
                    font-size: 12px;
                }
                
                .edit-apartments-list {
                    background-color: #ffffff;
                    border: 1px solid #e9e9ef;
                    border-radius: 8px;
                    padding: 16px;
                    margin-bottom: 16px;
                }
                
                .edit-apartment-item {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12px;
                    margin-bottom: 12px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid #e9e9ef;
                }
                
                .edit-apartment-item:last-child {
                    border-bottom: none;
                    padding-bottom: 0;
                    margin-bottom: 0;
                }
                
                .apartment-number, .apartment-floor, .apartment-bedrooms {
                    flex: 1;
                    min-width: 100px;
                }
                
                .delete-apartment-btn {
                    align-self: flex-end;
                    margin-bottom: 16px;
                }
                
                .add-apartment-form {
                    background-color: #ffffff;
                    border: 1px solid #e9e9ef;
                    border-radius: 8px;
                    padding: 16px;
                }
                
                .add-bloc-form {
                    background-color: #f8f9fa;
                    border: 1px solid #e9e9ef;
                    border-radius: 8px;
                    padding: 16px;
                }
                
                /* Form controls */
                .form-control-modern {
                    border-radius: 4px;
                    border-color: #e9e9ef;
                    padding: 0.47rem 0.75rem;
                    font-size: 14px;
                }
                
                .form-control-modern:focus {
                    border-color: #0ab39c;
                    box-shadow: 0 0 0 0.15rem rgba(10, 179, 156, 0.25);
                }
                
                .input-group-icon {
                    background-color: #f8f9fa;
                    border-color: #e9e9ef;
                    color: #495057;
                }
                
                .btn-modern {
                    padding: 0.47rem 0.75rem;
                    font-weight: 500;
                    border-radius: 4px;
                    font-size: 14px;
                }
                
                /* Modal Header */
                .building-modal-header {
                    background-color: #f8f9fa;
                    border-bottom: 1px solid #e9e9ef;
                }
                
                .modal-icon-container {
                    width: 48px;
                    height: 48px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    margin-right: 16px;
                }
                
                .edit-icon {
                    background-color: #f7b84b;
                    color: white;
                }
                
                /* New Bloc Editor */
                .bloc-editor {
                    border: 1px solid #e9e9ef;
                    border-radius: 8px;
                    overflow: hidden;
                }
                
                .bloc-header {
                    background-color: #f8f9fa;
                    padding: 12px 16px;
                    border-bottom: 1px solid #e9e9ef;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                
                .bloc-title {
                    margin: 0;
                    display: flex;
                    align-items: center;
                    font-weight: 600;
                }
                
                .bloc-count {
                    font-size: 12px;
                }
                
                .apartment-section {
                    padding: 16px;
                }
                
                .apartment-tags {
                    margin-bottom: 16px;
                }
                
                .apartment-tag {
                    margin-right: 8px;
                    margin-bottom: 8px;
                    padding: 6px 12px;
                    font-size: 13px;
                    background-color: #f8f9fa;
                    border: 1px solid #e9e9ef;
                }
                
                .apartment-form-title {
                    font-size: 15px;
                    margin-bottom: 16px;
                    color: #495057;
                    display: flex;
                    align-items: center;
                }
                
                .existing-blocs-header {
                    margin: 24px 0 16px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid #e9e9ef;
                }
                
                .blocs-list-title {
                    font-weight: 600;
                    color: #495057;
                    margin: 0;
                }
            `}</style>
        </Modal>
    );
};

export default withTranslation()(EditBuildingModal);