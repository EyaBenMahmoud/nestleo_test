import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBuilding, FaLayerGroup, FaHome, FaIdCard, FaMapMarkerAlt, FaPlus, FaTrash } from 'react-icons/fa';
import {
    Button,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    FormGroup,
    Label,
    Input,
    InputGroup,
    InputGroupText,
    Row,
    Col,
    FormFeedback,
    Progress,
    Alert,
    Badge,
    Form
} from 'reactstrap';
import { useDispatch } from 'react-redux';
import { createBuilding } from '../../slices/buildings/building';
import { toast } from 'react-toastify';
import { withTranslation } from "react-i18next";
import { isInTrialPeriod, extractFeatureValue } from '../Subscriptions/SubcriptionValidator';

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

const CreateBuildingModal = ({
    isOpen,
    toggle,
    canCreate,
    approachingLimit,
    buildingLimit,
    buildingCount,
    user,
    onSuccess,
    t
}) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [createStepIndex, setCreateStepIndex] = useState(0);
    const createSteps = [
        t('createBuildingModal.buildingInfo'),
        t('createBuildingModal.blocsApartments'),
        t('createBuildingModal.review')
    ];

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

    const [formData, setFormData] = useState({
        name: '',
        matricule: '',
        address_street: '',
        address_number: '',
        address_city: '',
        address_country: '',
        blocs: []
    });

    const [newBloc, setNewBloc] = useState({
        name: '',
        apartments: [],
        isExpanded: true
    });

    const [newApartment, setNewApartment] = useState({
        number: '',
        floor: '',
        bedrooms: '1'
    });

    // Generate random matricule
    const generateMatricule = (countryCode) => {
        const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let randomCode = '';
        for (let i = 0; i < 5; i++) {
            randomCode += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return `${countryCode || 'XX'}${randomCode}`;
    };

    // Update matricule when country changes
    useEffect(() => {
        if (formData.address_country) {
            setFormData(prev => ({
                ...prev,
                matricule: generateMatricule(formData.address_country)
            }));
        }
    }, [formData.address_country]);

    // Validate field
    const validateField = (name, value) => {
        let error = '';
        if (!value) {
            error = t('createBuildingModal.fieldRequired');
        } else {
            switch (name) {
                case 'address_number':
                case 'apartmentNumber':
                case 'apartmentFloor':
                    if (!/^\d+$/.test(value)) {
                        error = t('createBuildingModal.numericOnly');
                    }
                    break;
                case 'matricule':
                    if (!/^[A-Z]{2}[A-Z0-9]{5}$/.test(value)) {
                        error = t('createBuildingModal.invalidMatriculeFormat');
                    }
                    break;
                case 'name':
                case 'blocName':
                    if (value.length < 3) {
                        error = t('createBuildingModal.minLength', { length: 3 });
                    }
                    break;
                case 'address_street':
                    if (value.length < 5) {
                        error = t('createBuildingModal.minLength', { length: 5 });
                    }
                    break;
            }
        }
        return error;
    };

    // Validate apartment number uniqueness
    const validateApartmentNumberUniqueness = (number) => {
        // Check current bloc's apartments
        if (newBloc.apartments.some(apt => apt.number === number)) {
            return t('createBuildingModal.apartmentNumberExists');
        }
        // Check all blocs in formData
        for (const bloc of formData.blocs) {
            if (bloc.apartments.some(apt => apt.number === number)) {
                return t('createBuildingModal.apartmentNumberExists');
            }
        }
        return '';
    };

    // Handle field changes with validation
    const handleFieldChange = (e, fieldName) => {
        const value = e.target.value;
        setFormData(prev => ({ ...prev, [fieldName]: value }));
        setFormErrors(prev => ({ ...prev, [fieldName]: validateField(fieldName, value) }));
    };

    // Handle apartment field changes with validation
    const handleApartmentFieldChange = (e, fieldName) => {
        const value = e.target.value;
        setNewApartment(prev => ({ ...prev, [fieldName]: value }));
        setFormErrors(prev => ({
            ...prev,
            [`apartment${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`]: 
                fieldName === 'number' 
                    ? validateField('apartmentNumber', value) || validateApartmentNumberUniqueness(value)
                    : validateField(`apartment${fieldName}`, value)
        }));
    };

    // Handle bloc name change with validation
    const handleBlocNameChange = (e) => {
        const value = e.target.value;
        setNewBloc(prev => ({ ...prev, name: value }));
        setFormErrors(prev => ({ ...prev, blocName: validateField('blocName', value) }));
    };

    // Validate form
    const validateForm = () => {
        const errors = {
            name: validateField('name', formData.name),
            matricule: validateField('matricule', formData.matricule),
            address_street: validateField('address_street', formData.address_street),
            address_number: validateField('address_number', formData.address_number),
            address_city: validateField('address_city', formData.address_city),
            address_country: validateField('address_country', formData.address_country)
        };

        setFormErrors(errors);
        return !Object.values(errors).some(error => error);
    };

    // Add new apartment to the current new bloc
    const addApartment = () => {
        if (!newApartment.number || !newApartment.floor || !newApartment.bedrooms) {
            toast.warning(t('createBuildingModal.enterApartmentDetails'));
            return;
        }

        // Check for unique apartment number
        const numberError = validateApartmentNumberUniqueness(newApartment.number);
        if (numberError) {
            setFormErrors(prev => ({ ...prev, apartmentNumber: numberError }));
            toast.warning(numberError);
            return;
        }

        // Check apartment limit - if user is in trial period, allow unlimited apartments
        if (!isInTrialPeriod(user)) {
            let maxApartments = null;
            if (user?.subscription?.planId?.features) {
                maxApartments = extractFeatureValue(user.subscription.planId.features, "Appartements par immeuble");
            }

            const currentApartmentCount = newBloc.apartments.length + formData.blocs.reduce(
                (total, bloc) => total + bloc.apartments.length, 0
            );

            if (maxApartments !== -1 && maxApartments !== null && currentApartmentCount >= maxApartments) {
                toast.error(t('createBuildingModal.apartmentLimitReachedMessage', { limit: maxApartments }));
                return;
            }
        }

        setNewBloc({
            ...newBloc,
            apartments: [...newBloc.apartments, newApartment]
        });

        setNewApartment({ number: '', floor: '', bedrooms: '1' });
    };

    // Delete apartment
    const deleteApartment = (index) => {
        setNewBloc({
            ...newBloc,
            apartments: newBloc.apartments.filter((_, i) => i !== index)
        });
    };

    // Add new bloc to formData
    const addBloc = () => {
        const blocNameError = validateField('blocName', newBloc.name);
        if (blocNameError) {
            setFormErrors(prev => ({ ...prev, blocName: blocNameError }));
            return;
        }

        if (newBloc.apartments.length === 0) {
            toast.warning(t('createBuildingModal.addAtLeastOneApartment'));
            return;
        }

        setFormData({
            ...formData,
            blocs: [...formData.blocs, newBloc]
        });
        setNewBloc({ name: '', apartments: [], isExpanded: true });
    };

    // Delete bloc
    const deleteBloc = (blocIndex) => {
        setFormData({
            ...formData,
            blocs: formData.blocs.filter((_, index) => index !== blocIndex)
        });
        toast.success(t('createBuildingModal.blocRemoved'));
    };

    // Handle step navigation
    const nextStep = () => {
        if (createStepIndex === 0 && !validateForm()) {
            toast.error(t('createBuildingModal.fillAllRequiredFields'));
            return;
        } else if (createStepIndex === 1 && formData.blocs.length === 0) {
            toast.warning(t('createBuildingModal.addAtLeastOneBloc'));
            return;
        }
        setCreateStepIndex(Math.min(createStepIndex + 1, createSteps.length - 1));
    };

    const prevStep = () => {
        setCreateStepIndex(Math.max(createStepIndex - 1, 0));
    };

    // Handle create building
    const handleCreate = () => {
        if (!canCreate) {
            toast.error(t('createBuildingModal.buildingLimitReachedMessage', { limit: buildingLimit }));
            return;
        }

        if (!validateForm() || formData.blocs.length === 0) {
            toast.error(t('createBuildingModal.fillAllRequiredFields'));
            return;
        }

        dispatch(createBuilding(formData))
            .unwrap()
            .then(() => {
                toast.success(t('createBuildingModal.createSuccess'));
                setFormData({
                    name: '',
                    matricule: '',
                    address_street: '',
                    address_number: '',
                    address_city: '',
                    address_country: '',
                    blocs: []
                });
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
                setCreateStepIndex(0);
                onSuccess();
            })
            .catch((err) => {
                console.error('CREATE BUILDING ERROR:', err);
                toast.error(err.message || t('createBuildingModal.createFailed'));
            });
    };

    // Close modal handler
    const handleClose = () => {
        setCreateStepIndex(0);
        toggle();
    };

    return (
        <Modal isOpen={isOpen} toggle={handleClose} size="lg" className="building-modal" style={{ maxWidth: '900px' }}>
            <style>
                {`
                    .step-progress {
                        margin-bottom: 2rem;
                    }
                    .step-labels {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 1rem;
                    }
                    .step-label {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        flex: 1;
                        position: relative;
                        text-align: center;
                    }
                    .step-number {
                        width: 30px;
                        height: 30px;
                        line-height: 30px;
                        border-radius: 50%;
                        background-color: #e0e0e0;
                        color: #333;
                        font-weight: bold;
                        margin-bottom: 0.5rem;
                        transition: all 0.3s ease;
                    }
                    .step-label.active .step-number {
                        background-color: #007bff;
                        color: white;
                    }
                    .step-label.completed .step-number {
                        background-color: #28a745;
                        color: white;
                    }
                    .step-text {
                        font-size: 0.9rem;
                        color: #666;
                    }
                    .step-label.active .step-text {
                        color: #007bff;
                        font-weight: bold;
                    }
                    .step-label.completed .step-text {
                        color: #28a745;
                    }
                    .step-progress-bar {
                        height: 8px;
                        border-radius: 4px;
                    }
                    .step-progress-bar .progress-bar {
                        background-color: #007bff;
                        transition: width 0.3s ease;
                    }
                    .step-label:not(:last-child):after {
                        content: '';
                        position: absolute;
                        top: 14px;
                        left: 50%;
                        width: 100%;
                        height: 2px;
                        background-color: #e0e0e0;
                        z-index: -1;
                    }
                    .step-label.completed:not(:last-child):after {
                        background-color: #28a745;
                    }
                    .step-label.active:not(:last-child):after {
                        background-color: #007bff;
                    }
                `}
            </style>
            <ModalHeader toggle={handleClose} className="building-modal-header">
                <div className="d-flex align-items-center">
                    <div className="modal-icon-container">
                        <FaBuilding />
                    </div>
                    <div>
                        <h5 className="modal-title">{t('createBuildingModal.createNewBuilding')}</h5>
                        <small className="text-muted">{t('createBuildingModal.addNewProperty')}</small>
                    </div>
                </div>
            </ModalHeader>
            <ModalBody>
                {canCreate && approachingLimit && (
                    <Alert color="info" className="mb-3">
                        <div className="d-flex">
                            <div className="flex-shrink-0">
                                <i className="fas fa-info-circle" style={{ fontSize: "1.5rem", marginRight: "0.75rem" }}></i>
                            </div>
                            <div>
                                <h5 className="text-info">{t('createBuildingModal.approachingBuildingLimit')}</h5>
                                <p>{t('createBuildingModal.approachingBuildingLimitMessage', { count: buildingCount, limit: buildingLimit })}</p>
                                <Button color="link" className="p-0" onClick={() => {
                                    toggle();
                                    navigate('/subscription');
                                }}>
                                    {t('createBuildingModal.considerUpgrading')}
                                </Button>
                            </div>
                        </div>
                    </Alert>
                )}

                {/* Step Progress */}
                <div className="step-progress">
                    <div className="step-labels" style={{ paddingLeft: '120px' }}>
                        {createSteps.map((step, index) => (
                            <div
                                key={index}
                                className={`step-label ${index === createStepIndex ? 'active' : ''} ${index < createStepIndex ? 'completed' : ''}`}
                            >
                                <div className="step-number">{index + 1}</div>
                                <div className="step-text">{step}</div>
                            </div>
                        ))}
                    </div>
                    <Progress
                        value={((createStepIndex + 1) / createSteps.length) * 100}
                        className="step-progress-bar"
                    />
                </div>

                {/* Step Content */}
                <div className="step-content">
                    {/* Step 1: Building Info */}
                    {createStepIndex === 0 && (
                        <div className="step-pane">
                            <Form>
                                <Row className="mb-3">
                                    <Col md={6}>
                                        <FormGroup>
                                            <Label className="form-label">{t('createBuildingModal.buildingName')} *</Label>
                                            <InputGroup>
                                                <InputGroupText className="input-group-icon">
                                                    <FaBuilding />
                                                </InputGroupText>
                                                <Input
                                                    value={formData.name}
                                                    onChange={(e) => handleFieldChange(e, 'name')}
                                                    placeholder={t('createBuildingModal.enterBuildingName')}
                                                    invalid={!!formErrors.name}
                                                    className="form-control-modern"
                                                />
                                                <FormFeedback>{formErrors.name}</FormFeedback>
                                            </InputGroup>
                                        </FormGroup>
                                    </Col>
                                    <Col md={6}>
                                        <FormGroup>
                                            <Label className="form-label">{t('createBuildingModal.country')} *</Label>
                                            <Input
                                                type="select"
                                                value={formData.address_country}
                                                onChange={(e) => handleFieldChange(e, 'address_country')}
                                                invalid={!!formErrors.address_country}
                                                className="form-control-modern"
                                            >
                                                <option value="">{t('createBuildingModal.selectCountry')}</option>
                                                {countries.map(country => (
                                                    <option key={country.code} value={country.code}>{country.name}</option>
                                                ))}
                                            </Input>
                                            <FormFeedback>{formErrors.address_country}</FormFeedback>
                                        </FormGroup>
                                    </Col>
                                </Row>

                                <Row className="mb-3">
                                    <Col md={6}>
                                        <FormGroup>
                                            <Label className="form-label">{t('createBuildingModal.matricule')} *</Label>
                                            <InputGroup>
                                                <InputGroupText className="input-group-icon">
                                                    <FaIdCard />
                                                </InputGroupText>
                                                <Input
                                                    value={formData.matricule}
                                                    disabled
                                                    className="form-control-modern"
                                                    invalid={!!formErrors.matricule}
                                                />
                                                <FormFeedback>{formErrors.matricule}</FormFeedback>
                                            </InputGroup>
                                        </FormGroup>
                                    </Col>
                                    <Col md={6}>
                                        <FormGroup>
                                            <Label className="form-label">{t('createBuildingModal.city')} *</Label>
                                            <Input
                                                type="select"
                                                value={formData.address_city}
                                                onChange={(e) => handleFieldChange(e, 'address_city')}
                                                invalid={!!formErrors.address_city}
                                                className="form-control-modern"
                                                disabled={!formData.address_country}
                                            >
                                                <option value="">{t('createBuildingModal.selectCity')}</option>
                                                {formData.address_country && cities[formData.address_country]?.map(city => (
                                                    <option key={city} value={city}>{city}</option>
                                                ))}
                                            </Input>
                                            <FormFeedback>{formErrors.address_city}</FormFeedback>
                                        </FormGroup>
                                    </Col>
                                </Row>

                                <FormGroup className="mb-3">
                                    <Label className="form-label">{t('createBuildingModal.streetAddress')} *</Label>
                                    <InputGroup>
                                        <InputGroupText className="input-group-icon">
                                            <FaMapMarkerAlt />
                                        </InputGroupText>
                                        <Input
                                            value={formData.address_street}
                                            onChange={(e) => handleFieldChange(e, 'address_street')}
                                            placeholder={t('createBuildingModal.enterStreetAddress')}
                                            invalid={!!formErrors.address_street}
                                            className="form-control-modern"
                                        />
                                        <FormFeedback>{formErrors.address_street}</FormFeedback>
                                    </InputGroup>
                                </FormGroup>

                                <Row className="mb-3">
                                    <Col md={12}>
                                        <FormGroup>
                                            <Label className="form-label">{t('createBuildingModal.number')} *</Label>
                                            <Input
                                                value={formData.address_number}
                                                onChange={(e) => handleFieldChange(e, 'address_number')}
                                                placeholder={t('createBuildingModal.enterNumber')}
                                                invalid={!!formErrors.address_number}
                                                className="form-control-modern"
                                            />
                                            <FormFeedback>{formErrors.address_number}</FormFeedback>
                                        </FormGroup>
                                    </Col>
                                </Row>
                            </Form>
                        </div>
                    )}

                    {/* Step 2: Blocs & Apartments */}
                    {createStepIndex === 1 && (
                        <>
                            {(() => {
                                // If user is in trial period, don't show apartment limit warnings
                                if (isInTrialPeriod(user)) {
                                    return null;
                                }

                                let maxApartments = null;
                                if (user?.subscription?.planId?.features) {
                                    maxApartments = extractFeatureValue(user.subscription.planId.features, "Appartements par immeuble");
                                }

                                const currentApartmentCount = newBloc.apartments.length + formData.blocs.reduce(
                                    (total, bloc) => total + bloc.apartments.length, 0
                                );

                                if (maxApartments !== -1 && maxApartments !== null && currentApartmentCount >= maxApartments) {
                                    return (
                                        <Alert color="warning" className="mb-3">
                                            <div className="d-flex">
                                                <div className="flex-shrink-0">
                                                    <i className="fas fa-exclamation-triangle" style={{ fontSize: "1.5rem", marginRight: "0.75rem" }}></i>
                                                </div>
                                                <div>
                                                    <h5 className="text-warning">{t('createBuildingModal.apartmentLimitReached')}</h5>
                                                    <p>{t('createBuildingModal.apartmentLimitReachedMessage2', { limit: maxApartments })}</p>
                                                    <Button color="link" className="p-0" onClick={() => {
                                                        toggle();
                                                        navigate('/subscription');
                                                    }}>
                                                        {t('createBuildingModal.upgradeForMoreApartments')}
                                                    </Button>
                                                </div>
                                            </div>
                                        </Alert>
                                    );
                                }
                                return null;
                            })()}

                            <div className="step-pane">
                                <div className="bloc-section">
                                    <div className="section-header">
                                        <h5 className="section-title">
                                            <FaLayerGroup className="me-2" />
                                            {t('createBuildingModal.addBlocsAndApartments')}
                                        </h5>
                                        <p className="section-subtitle">
                                            {t('createBuildingModal.createBuildingStructure')}
                                        </p>
                                    </div>

                                    <Row className="mb-3">
                                        <Col md={8}>
                                            <FormGroup>
                                                <Label className="form-label">{t('createBuildingModal.blocName')} *</Label>
                                                <InputGroup>
                                                    <InputGroupText className="input-group-icon">
                                                        <FaLayerGroup />
                                                    </InputGroupText>
                                                    <Input
                                                        value={newBloc.name}
                                                        onChange={handleBlocNameChange}
                                                        placeholder={t('createBuildingModal.enterBlocName')}
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
                                                onClick={addBloc}
                                                className="btn-modern w-100"
                                                style={{ marginBottom: "16px" }}
                                                disabled={!newBloc.name || newBloc.apartments.length === 0}
                                            >
                                                <FaPlus className="me-1" /> {t('createBuildingModal.addBloc')}
                                            </Button>
                                        </Col>
                                    </Row>

                                    {newBloc.name && (
                                        <div className="bloc-editor">
                                            <div className="bloc-header">
                                                <h6 className="bloc-title">
                                                    <FaLayerGroup className="me-2" />
                                                    {newBloc.name}
                                                </h6>
                                                <Badge color="info" pill className="bloc-count">
                                                    {newBloc.apartments.length} {t('createBuildingModal.apartments')}
                                                </Badge>
                                            </div>

                                            <div className="apartment-section">
                                                {newBloc.apartments.length > 0 && (
                                                    <div className="apartment-tags">
                                                        {newBloc.apartments.map((apt, idx) => (
                                                            <Badge color="light" pill className="apartment-tag" key={idx}>
                                                                <FaHome className="me-1" />
                                                                #{apt.number} ({t('createBuildingModal.floorLabel')} {apt.floor}, {apt.bedrooms} {t('createBuildingModal.bedrooms')})
                                                                <FaTrash
                                                                    className="ms-2 cursor-pointer"
                                                                    onClick={() => deleteApartment(idx)}
                                                                    style={{ color: 'red' }}
                                                                />
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="apartment-form">
                                                    <h6 className="apartment-form-title">
                                                        <FaHome className="me-2" />
                                                        {t('createBuildingModal.addApartments')}
                                                    </h6>

                                                    <Row className="g-2">
                                                        <Col md={3}>
                                                            <FormGroup>
                                                                <Label className="form-label">{t('createBuildingModal.apartmentNumber')} *</Label>
                                                                <Input
                                                                    value={newApartment.number}
                                                                    onChange={(e) => handleApartmentFieldChange(e, 'number')}
                                                                    placeholder={t('createBuildingModal.enterApartmentNumber')}
                                                                    invalid={!!formErrors.apartmentNumber}
                                                                    className="form-control-modern"
                                                                />
                                                                <FormFeedback>{formErrors.apartmentNumber}</FormFeedback>
                                                            </FormGroup>
                                                        </Col>
                                                        <Col md={3}>
                                                            <FormGroup>
                                                                <Label className="form-label">{t('createBuildingModal.floor')} *</Label>
                                                                <Input
                                                                    value={newApartment.floor}
                                                                    onChange={(e) => handleApartmentFieldChange(e, 'floor')}
                                                                    placeholder={t('createBuildingModal.enterFloorNumber')}
                                                                    invalid={!!formErrors.apartmentFloor}
                                                                    className="form-control-modern"
                                                                />
                                                                <FormFeedback>{formErrors.apartmentFloor}</FormFeedback>
                                                            </FormGroup>
                                                        </Col>
                                                        <Col md={4}>
                                                            <FormGroup>
                                                                <Label className="form-label">{t('createBuildingModal.bedrooms')} *</Label>
                                                                <Input
                                                                    type="select"
                                                                    value={newApartment.bedrooms}
                                                                    onChange={(e) => handleApartmentFieldChange(e, 'bedrooms')}
                                                                    className="form-control-modern"
                                                                >
                                                                    {[1, 2, 3, 4, 5].map(num => (
                                                                        <option key={num} value={num}>{num} {t('createBuildingModal.bedrooms')}</option>
                                                                    ))}
                                                                </Input>
                                                            </FormGroup>
                                                        </Col>
                                                        <Col md={2} className="d-flex align-items-end">
                                                            <Button
                                                                color="primary"
                                                                outline
                                                                onClick={addApartment}
                                                                className="btn-modern w-100"
                                                                style={{ marginBottom: "16px" }}
                                                                disabled={!newApartment.number || !newApartment.floor}
                                                            >
                                                                <FaPlus />
                                                            </Button>
                                                        </Col>
                                                    </Row>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {formData.blocs.length > 0 && (
                                        <div className="blocs-list">
                                            <h6 className="blocs-list-title">{t('createBuildingModal.addedBlocs')}:</h6>
                                            {formData.blocs.map((bloc, index) => (
                                                <div className="bloc-item" key={index}>
                                                    <div className="bloc-item-header">
                                                        <h6 className="bloc-item-title">
                                                            <FaLayerGroup className="me-2" />
                                                            {bloc.name}
                                                        </h6>
                                                        <Button
                                                            color="danger"
                                                            size="sm"
                                                            outline
                                                            className="ms-2"
                                                            onClick={() => deleteBloc(index)}
                                                            title={t('createBuildingModal.deleteBloc')}
                                                        >
                                                            <FaTrash />
                                                        </Button>
                                                        <Badge color="info" pill className="bloc-item-count ms-2">
                                                            {bloc.apartments.length} {t('createBuildingModal.apartments')}
                                                        </Badge>
                                                    </div>

                                                    <div className="bloc-item-content">
                                                        {bloc.apartments.map((apt, idx) => (
                                                            <Badge color="light" pill className="apartment-tag" key={idx}>
                                                                <FaHome className="me-1" />
                                                                #{apt.number} ({t('createBuildingModal.floorLabel')} {apt.floor}, {apt.bedrooms} {t('createBuildingModal.bedrooms')})
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Step 3: Review */}
                    {createStepIndex === 2 && (
                        <div className="step-pane">
                            <div className="review-section">
                                <div className="section-header">
                                    <h5 className="section-title">{t('createBuildingModal.reviewBuildingInfo')}</h5>
                                    <p className="section-subtitle">{t('createBuildingModal.verifyAllDetails')}</p>
                                </div>

                                <div className="review-building">
                                    <h6 className="review-section-title">
                                        <FaBuilding className="me-2" />
                                        {t('createBuildingModal.buildingDetails')}
                                    </h6>
                                    <Row className="review-details">
                                        <Col md={6} className="review-item">
                                            <div className="review-label">{t('createBuildingModal.buildingName')}:</div>
                                            <div className="review-value">{formData.name}</div>
                                        </Col>
                                        <Col md={6} className="review-item">
                                            <div className="review-label">{t('createBuildingModal.matricule')}:</div>
                                            <div className="review-value">{formData.matricule}</div>
                                        </Col>
                                        <Col md={12} className="review-item">
                                            <div className="review-label">{t('createBuildingModal.address')}:</div>
                                            <div className="review-value">
                                                {formData.address_street}, {formData.address_number}, {formData.address_city}, {countries.find(c => c.code === formData.address_country)?.name}
                                            </div>
                                        </Col>
                                    </Row>
                                </div>

                                <div className="review-blocs">
                                    <h6 className="review-section-title">
                                        <FaLayerGroup className="me-2" />
                                        {t('createBuildingModal.buildingStructure')}
                                    </h6>
                                    <div className="review-blocs-summary">
                                        <div className="review-summary-item">
                                            <div className="review-summary-label">
                                                <FaLayerGroup className="me-2" />
                                                {t('createBuildingModal.totalBlocs')}:
                                            </div>
                                            <div className="review-summary-value">{formData.blocs.length}</div>
                                        </div>
                                        <div className="review-summary-item">
                                            <div className="review-summary-label">
                                                <FaHome className="me-2" />
                                                {t('createBuildingModal.totalApartments')}:
                                            </div>
                                            <div className="review-summary-value">
                                                {formData.blocs.reduce((acc, bloc) => acc + bloc.apartments.length, 0)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="review-blocs-list">
                                        {formData.blocs.map((bloc, index) => (
                                            <div className="review-bloc-item" key={index}>
                                                <div className="review-bloc-header">
                                                    <Badge color="primary" pill className="bloc-index">
                                                        {index + 1}
                                                    </Badge>
                                                    <h6 className="review-bloc-title">{bloc.name}</h6>
                                                    <Badge color="info" pill>
                                                        {bloc.apartments.length} {t('createBuildingModal.apartments')}
                                                    </Badge>
                                                </div>
                                                <div className="review-apartments">
                                                    {bloc.apartments.map((apt, aptIndex) => (
                                                        <Badge color="light" pill className="review-apartment" key={aptIndex}>
                                                            <FaHome className="me-1" />
                                                            #{apt.number} ({t('createBuildingModal.floorLabel')} {apt.floor}, {apt.bedrooms} {t('createBuildingModal.bedrooms')})
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </ModalBody>
            <ModalFooter>
                {createStepIndex > 0 && (
                    <Button color="light" onClick={prevStep} className="btn-modern">
                        <i className="ri-arrow-left-line me-1"></i> {t('createBuildingModal.back')}
                    </Button>
                )}
                {createStepIndex < createSteps.length - 1 ? (
                    <Button color="primary" onClick={nextStep} className="btn-modern">
                        {t('createBuildingModal.next')} <i className="ri-arrow-right-line ms-1"></i>
                    </Button>
                ) : (
                    <Button color="primary" onClick={handleCreate} className="btn-modern">
                        <i className="ri-building-line me-1"></i> {t('createBuildingModal.createBuilding')}
                    </Button>
                )}
            </ModalFooter>
        </Modal>
    );
};

export default withTranslation()(CreateBuildingModal);