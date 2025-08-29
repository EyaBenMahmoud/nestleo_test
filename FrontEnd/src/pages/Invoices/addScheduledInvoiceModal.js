import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Modal,
    Button,
    Form,
    Row,
    Col,
    Table,
    Badge,
    Spinner,
    Alert
} from 'react-bootstrap';
import {
    fetchBuildingBlocs,
    fetchmultipleApartmentsPerBlocs,
} from '../../slices/buildings/building';
import { fetchCurrencies } from "../../slices/currency/currency";
import api from '../../services/api';
import { useTranslation } from 'react-i18next';

const RecurringInvoiceModal = ({ show, onHide, buildings, onSuccess, currentBuilding }) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();

    // Form fields
    const [name, setName] = useState('');
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [selectedBlocs, setSelectedBlocs] = useState([]);
    const [selectedApartments, setSelectedApartments] = useState([]);
    const [frequency, setFrequency] = useState('monthly');
    const [items, setItems] = useState([{ description: '', amount: 0 }]);
    const [taxRate, setTaxRate] = useState(0.2);
    const [selectedCurrency, setSelectedCurrency] = useState(null);

    // UI states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successModal, setSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Validation states
    const [errors, setErrors] = useState({
        name: '',
        building: '',
        currency: '',
        items: [],
        blocs: '',
        apartments: '',
        general: ''
    });
    const [touched, setTouched] = useState({
        name: false,
        building: false,
        currency: false,
        items: []
    });

    const user = useSelector(state => state.Loginn.user);

    // Get data from Redux store
    const { blocs: blocData, apartments: apartmentData, loading } = useSelector((state) => state.Building);
    const { currencies } = useSelector(state => state.Currency);
    const selectedBuildingData = buildings.find(b => b._id === selectedBuilding);
    const blocs = selectedBuildingData?.blocs || [];
    const apartments = apartmentData.filter(apartment =>
        selectedBlocs.some(blocId =>
            apartment.bloc === blocId ||  // For string IDs
            apartment.bloc._id === blocId // If populated as objects
        )
    );
    const validateItemDescription = (value) => {
        // Check if value is empty or only whitespace
        if (!value || value.trim() === '') {
            return t('invoices.recurring.errors.descriptionRequired');
        }

        // Check if value is only numbers
        if (/^\d+$/.test(value)) {
            return t('invoices.recurring.errors.descriptionOnlyNumbers');
        }

        // Check if value is only special characters
        if (/^[^\w\s]|_+$/.test(value)) {
            return t('invoices.recurring.errors.descriptionOnlySymbols');
        }

        return '';
    };
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const taxAmount = subtotal * taxRate;
    const totalWithTax = subtotal + taxAmount;
    useEffect(() => {
        if (currentBuilding && currentBuilding._id) {
            setSelectedBuilding(currentBuilding._id);
            // Also fetch blocs for this building right away
            if (!selectedBuildingData?.blocs || selectedBuildingData.blocs.length === 0) {
                dispatch(fetchBuildingBlocs(currentBuilding._id));
            }
        }
    }, [currentBuilding, dispatch]);
    // Field validation functions
    const validateName = (value) => {
        if (!value || value.trim() === '') {
            return t('invoices.recurring.errors.nameRequired');
        }
        if (value.length < 3) {
            return t('invoices.recurring.errors.nameLength');
        }
        if (value.length > 100) {
            return t('invoices.recurring.errors.nameTooLong');
        }
        return '';
    };
    // Add validation functions for blocs and apartments
    const validateBlocs = (selectedBlocs, selectedApartments) => {
        // If apartments are selected, then blocs selection is not required
        if (selectedApartments && selectedApartments.length > 0) {
            return '';
        }

        // Otherwise at least one bloc should be selected
        if (!selectedBlocs || selectedBlocs.length === 0) {
            return t('invoices.recurring.errors.selectAtLeastOneBloc');
        }

        return '';
    };

    const validateApartments = (selectedApartments, selectedBlocs) => {
        // If blocs are selected, then apartments selection is not required
        if (selectedBlocs && selectedBlocs.length > 0) {
            return '';
        }

        // Otherwise at least one apartment should be selected
        if (!selectedApartments || selectedApartments.length === 0) {
            return t('invoices.recurring.errors.selectAtLeastOneApartment');
        }

        return '';
    };
    const validateBuilding = (value) => {
        if (!value) {
            return t('invoices.recurring.errors.buildingRequired');
        }
        return '';
    };

    const validateCurrency = (value) => {
        if (!value) {
            return t('invoices.recurring.errors.currencyRequired');
        }
        return '';
    };
    const validateFrequency = (value) => {
        if (!value) {
            return t('invoices.recurring.errors.frequencyRequired');
        }
        return '';
    };

    const validateTaxRate = (value) => {
        if (value < 0 || value > 1) {
            return t('invoices.recurring.errors.invalidTaxRate');
        }
        return '';
    };
    const validateItem = (item, index) => {
        const itemErrors = {};

        // Use the new validation function for description
        const descriptionError = validateItemDescription(item.description);
        if (descriptionError) {
            itemErrors.description = descriptionError;
        }

        if (item.amount <= 0) {
            itemErrors.amount = t('invoices.recurring.errors.positiveAmount');
        }

        return itemErrors;
    };

    // Mark field as touched when blurred
    const handleBlur = (field) => {
        setTouched(prev => ({ ...prev, [field]: true }));
    };

    const handleItemBlur = (index, field) => {
        setTouched(prev => {
            const itemsTouched = [...(prev.items || [])];
            if (!itemsTouched[index]) {
                itemsTouched[index] = {};
            }
            itemsTouched[index][field] = true;
            return { ...prev, items: itemsTouched };
        });
    };

    // Validate on field change
    useEffect(() => {
        if (touched.name) {
            setErrors(prev => ({ ...prev, name: validateName(name) }));
        }
    }, [name, touched.name]);

    useEffect(() => {
        if (touched.building) {
            setErrors(prev => ({ ...prev, building: validateBuilding(selectedBuilding) }));
        }
    }, [selectedBuilding, touched.building]);

    useEffect(() => {
        if (touched.currency) {
            setErrors(prev => ({ ...prev, currency: validateCurrency(selectedCurrency) }));
        }
    }, [selectedCurrency, touched.currency]);

    // Validate items
    useEffect(() => {
        if (items.some((_, index) => touched.items && touched.items[index])) {
            const itemErrors = items.map((item, index) =>
                touched.items && touched.items[index] ? validateItem(item, index) : {}
            );
            setErrors(prev => ({ ...prev, items: itemErrors }));
        }
    }, [items, touched.items]);

    const handleSelectAllBlocs = () => {
        if (selectedBlocs.length === blocs.length) {
            // If all are selected, deselect all
            setSelectedBlocs([]);
        } else {
            // Select all blocs
            setSelectedBlocs(blocs.map(bloc => bloc._id));
        }
    };

    const handleSelectAllApartments = () => {
        if (selectedApartments.length === apartments.length) {
            // If all are selected, deselect all
            setSelectedApartments([]);
        } else {
            // Select all apartments
            setSelectedApartments(apartments.map(apartment => apartment._id));
        }
    };

    // Fetch currencies on mount
    useEffect(() => {
        dispatch(fetchCurrencies({ stripeSupported: true }));
    }, [dispatch]);

    // Set default currency if available
    useEffect(() => {
        if (currencies?.length > 0 && !selectedCurrency) {
            setSelectedCurrency(currencies[0]._id);
        }
    }, [currencies, selectedCurrency]);

    // Fetch blocs when building changes
    useEffect(() => {
        if (selectedBuilding && (!selectedBuildingData?.blocs || selectedBuildingData.blocs.length === 0)) {
            dispatch(fetchBuildingBlocs(selectedBuilding));
        }
    }, [selectedBuilding, dispatch, selectedBuildingData]);

    // Fetch apartments when blocs are selected
    useEffect(() => {
        if (selectedBlocs.length > 0) {
            dispatch(fetchmultipleApartmentsPerBlocs(selectedBlocs));
        }
    }, [selectedBlocs, dispatch]);

    const handleBuildingChange = (buildingId) => {
        setSelectedBuilding(buildingId);
        setSelectedBlocs([]);
        setSelectedApartments([]);
        setTouched(prev => ({ ...prev, building: true }));
    };

    const handleBlocToggle = (blocId) => {
        setSelectedBlocs(prev =>
            prev.includes(blocId)
                ? prev.filter(id => id !== blocId)
                : [...prev, blocId]
        );
    };

    const handleApartmentToggle = (apartmentId) => {
        setSelectedApartments(prev =>
            prev.includes(apartmentId)
                ? prev.filter(id => id !== apartmentId)
                : [...prev, apartmentId]
        );
    };

    const handleAddItem = () => {
        setItems([...items, { description: '', amount: 0 }]);
        setErrors(prev => ({ ...prev, items: [...(prev.items || []), {}] }));
        setTouched(prev => ({ ...prev, items: [...(prev.items || []), {}] }));
    };

    const handleRemoveItem = (index) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);

        // Update errors and touched arrays
        const newItemErrors = [...(errors.items || [])];
        newItemErrors.splice(index, 1);
        setErrors(prev => ({ ...prev, items: newItemErrors }));

        const newItemsTouched = [...(touched.items || [])];
        newItemsTouched.splice(index, 1);
        setTouched(prev => ({ ...prev, items: newItemsTouched }));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = field === 'amount' ? parseFloat(value) || 0 : value;
        setItems(newItems);

        // Mark as touched and validate
        handleItemBlur(index, field);
    };

    const validateAll = () => {
        // Validate all fields
        const nameError = validateName(name);
        const buildingError = validateBuilding(selectedBuilding);
        const currencyError = validateCurrency(selectedCurrency);
        const itemErrors = items.map(validateItem);
        const blocsError = validateBlocs(selectedBlocs, selectedApartments);
        const apartmentsError = validateApartments(selectedApartments, selectedBlocs);
        const frequencyError = validateFrequency(frequency);
        const taxRateError = validateTaxRate(taxRate);


        // Mark all as touched
        setTouched({
            name: true,
            building: true,
            currency: true,
            blocs: true,
            apartments: true,
            frequency: true,
            taxRate: true,
            items: items.map(() => ({ description: true, amount: true }))
        });

        // Set all errors
        setErrors({
            name: nameError,
            building: buildingError,
            currency: currencyError,
            items: itemErrors,
            blocs: blocsError,
            apartments: apartmentsError,
            frequency: frequencyError,
            taxRate: taxRateError,
            general: ''
        });

        // Check if any error exists
        const hasItemErrors = itemErrors.some(item =>
            Object.values(item).some(error => error)
        );

        return !(nameError || buildingError || currencyError || blocsError || apartmentsError || frequencyError || taxRateError || hasItemErrors);
    };

    const handleSubmit = async () => {
        // Validate all fields
        const isValid = validateAll();
        if (!isValid) {
            setErrors(prev => ({
                ...prev,
                general: t('invoices.recurring.errors.fixErrors')
            }));
            return;
        }

        setIsSubmitting(true);
        setErrors(prev => ({ ...prev, general: '' }));

        try {
            const response = await api.post('/api/invoices/CreateNewScueduledInvoice', {
                name,
                buildingId: selectedBuilding,
                blocIds: selectedBlocs,
                apartmentIds: selectedApartments,
                items,
                frequency,
                taxRate,
                currencyId: selectedCurrency,
                createdById: user.id
            });

            if (onSuccess) {
                onSuccess(response.data);
            }
            console.log("Response of create new recurring invoice:", response);

            onHide();
            setSuccessMessage(t('invoices.recurring.success'));
            setSuccessModal(true);

            // Reset form
            setName('');
            setSelectedBuilding(null);
            setSelectedBlocs([]);
            setSelectedApartments([]);
            setItems([{ description: '', amount: 0 }]);
            setTaxRate(0.2);
            setTouched({
                name: false,
                building: false,
                currency: false,
                items: []
            });

        } catch (error) {
            console.error('Error creating recurring invoice:', error);
            setErrors(prev => ({
                ...prev,
                general: error.response?.data?.message || t('invoices.recurring.errors.failed')
            }));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Modal show={show} onHide={onHide} size="xl">
                <Modal.Header closeButton>
                    <Modal.Title>{t('invoices.recurring.title')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {errors.general && (
                        <Alert variant="danger" className="mb-3">
                            {errors.general}
                        </Alert>
                    )}

                    <Form noValidate>
                        <Row className="mb-3">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>{t('invoices.recurring.name')}</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        onBlur={() => handleBlur('name')}
                                        isInvalid={!!errors.name}
                                        placeholder={t('invoices.recurring.namePlaceholder')}
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        {errors.name}
                                    </Form.Control.Feedback>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>{t('invoices.recurring.building')}</Form.Label>
                                    <Form.Select
                                        value={selectedBuilding || ''}
                                        onChange={(e) => handleBuildingChange(e.target.value)}
                                        onBlur={() => handleBlur('building')}
                                        isInvalid={!!errors.building}
                                    >
                                        <option value="">{t('invoices.recurring.selectBuilding')}</option>
                                        {buildings.map(building => (
                                            <option key={building._id} value={building._id}>
                                                {building.name}
                                            </option>
                                        ))}
                                    </Form.Select>
                                    <Form.Control.Feedback type="invalid">
                                        {errors.building}
                                    </Form.Control.Feedback>
                                </Form.Group>
                            </Col>
                        </Row>

                        {selectedBuilding && (
                            <Row className="mb-3">
                                {/* In the Blocs column */}
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>{t('invoices.recurring.blocs')}</Form.Label>
                                        <div className="d-flex justify-content-between mb-2">
                                            <Form.Check
                                                type="checkbox"
                                                label={`${t('invoices.recurring.selectAll')} (${blocs.length})`}
                                                checked={selectedBlocs.length === blocs.length && blocs.length > 0}
                                                onChange={handleSelectAllBlocs}
                                                disabled={blocs.length === 0}
                                            />
                                            <small className="text-muted">
                                                {selectedBlocs.length} {t('invoices.recurring.selected')}
                                            </small>
                                        </div>
                                        {loading.blocs ? (
                                            <div className="text-center">
                                                <Spinner size="sm" /> {t('invoices.recurring.loadingBlocs')}
                                            </div>
                                        ) : (
                                            <div
                                                style={{
                                                    maxHeight: '200px',
                                                    overflowY: 'auto',
                                                    border: errors.blocs ? '1px solid #dc3545' : '1px solid #ddd',
                                                    padding: '10px'
                                                }}
                                            >
                                                {blocs.length > 0 ? (
                                                    blocs.map(bloc => (
                                                        <Form.Check
                                                            key={bloc._id}
                                                            type="checkbox"
                                                            label={bloc.name}
                                                            checked={selectedBlocs.includes(bloc._id)}
                                                            onChange={() => handleBlocToggle(bloc._id)}
                                                        />
                                                    ))
                                                ) : (
                                                    <div className="text-center text-muted">
                                                        {t('invoices.recurring.noBlocs')}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <Form.Text>{t('invoices.recurring.blocHelp')}</Form.Text>
                                        {errors.blocs && (
                                            <div className="text-danger mt-1">
                                                {errors.blocs}
                                            </div>
                                        )}
                                    </Form.Group>
                                </Col>

                                {/* In the Apartments column */}
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>{t('invoices.recurring.apartments')}</Form.Label>
                                        <div className="d-flex justify-content-between mb-2">
                                            <Form.Check
                                                type="checkbox"
                                                label={`${t('invoices.recurring.selectAll')} (${apartments.length})`}
                                                checked={selectedApartments.length === apartments.length && apartments.length > 0}
                                                onChange={handleSelectAllApartments}
                                                disabled={apartments.length === 0}
                                            />
                                            <small className="text-muted">
                                                {selectedApartments.length} {t('invoices.recurring.selected')}
                                            </small>
                                        </div>
                                        {loading.apartments ? (
                                            <div className="text-center">
                                                <Spinner size="sm" /> {t('invoices.recurring.loadingApartments')}
                                            </div>
                                        ) : (
                                            <div
                                                style={{
                                                    maxHeight: '200px',
                                                    overflowY: 'auto',
                                                    border: errors.apartments ? '1px solid #dc3545' : '1px solid #ddd',
                                                    padding: '10px'
                                                }}
                                            >
                                                {apartments.length > 0 ? (
                                                    apartments.map(apartment => (
                                                        <Form.Check
                                                            key={apartment._id}
                                                            type="checkbox"
                                                            label={`${apartment.number} (${t('invoices.recurring.floor')} ${apartment.floor})`}
                                                            checked={selectedApartments.includes(apartment._id)}
                                                            onChange={() => handleApartmentToggle(apartment._id)}
                                                        />
                                                    ))
                                                ) : (
                                                    <div className="text-center text-muted">
                                                        {selectedBlocs.length > 0
                                                            ? t('invoices.recurring.noApartments')
                                                            : t('invoices.recurring.selectBlocFirst')}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <Form.Text>{t('invoices.recurring.apartmentHelp')}</Form.Text>
                                        {errors.apartments && (
                                            <div className="text-danger mt-1">
                                                {errors.apartments}
                                            </div>
                                        )}
                                    </Form.Group>
                                </Col>
                            </Row>
                        )}

                        <Row className="mb-3">
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label>{t('invoices.recurring.frequency')}</Form.Label>
                                        <Form.Select
                                            value={frequency}
                                            onChange={(e) => setFrequency(e.target.value)}
                                            onBlur={() => handleBlur('frequency')}
                                            isInvalid={!!errors.frequency}
                                        >
                                            <option value="monthly">{t('invoices.recurring.monthly')}</option>
                                            <option value="quarterly">{t('invoices.recurring.quarterly')}</option>
                                            <option value="biannually">{t('invoices.recurring.biannually')}</option>
                                            <option value="annually">{t('invoices.recurring.annually')}</option>
                                        </Form.Select>
                                        <Form.Control.Feedback type="invalid">
                                            {errors.frequency}
                                        </Form.Control.Feedback>
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label>{t('invoices.recurring.taxRate')}</Form.Label>
                                        <Form.Control
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.1"
                                            value={taxRate * 100}
                                            onChange={(e) => setTaxRate((parseFloat(e.target.value) || 0) / 100)}
                                            onBlur={() => handleBlur('taxRate')}
                                            isInvalid={!!errors.taxRate}
                                        />
                                        <Form.Control.Feedback type="invalid">
                                            {errors.taxRate}
                                        </Form.Control.Feedback>
                                    </Form.Group>
                                </Col>
                                {/* Rest of the code remains the same */}
                            
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label>{t('invoices.recurring.currency')}</Form.Label>
                                    {currencies?.length > 0 ? (
                                        <Form.Select
                                            value={selectedCurrency || ''}
                                            onChange={(e) => setSelectedCurrency(e.target.value)}
                                            onBlur={() => handleBlur('currency')}
                                            isInvalid={!!errors.currency}
                                        >
                                            <option value="">{t('invoices.recurring.selectCurrency')}</option>
                                            {currencies.map(currency => (
                                                <option key={currency._id} value={currency._id}>
                                                    {currency.name} ({currency.code})
                                                </option>
                                            ))}
                                        </Form.Select>
                                    ) : (
                                        <div>
                                            <Spinner size="sm" /> {t('invoices.recurring.loadingCurrencies')}
                                        </div>
                                    )}
                                    <Form.Control.Feedback type="invalid">
                                        {errors.currency}
                                    </Form.Control.Feedback>
                                </Form.Group>
                            </Col>
                        </Row>

                        <h5>{t('invoices.recurring.items')}</h5>
                        <Table striped bordered hover>
                            <thead>
                                <tr>
                                    <th>{t('invoices.recurring.description')}</th>
                                    <th>{t('invoices.recurring.amount')}</th>
                                    <th>{t('invoices.recurring.action')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={index}>
                                        <td>
                                            <Form.Control
                                                type="text"
                                                value={item.description}
                                                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                onBlur={() => handleItemBlur(index, 'description')}
                                                isInvalid={!!(errors.items?.[index]?.description)}
                                                placeholder={t('invoices.recurring.descriptionPlaceholder')}
                                            />
                                            <Form.Control.Feedback type="invalid">
                                                {errors.items?.[index]?.description}
                                            </Form.Control.Feedback>
                                        </td>
                                        <td>
                                            <Form.Control
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.amount}
                                                onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                                                onBlur={() => handleItemBlur(index, 'amount')}
                                                isInvalid={!!(errors.items?.[index]?.amount)}
                                            />
                                            <Form.Control.Feedback type="invalid">
                                                {errors.items?.[index]?.amount}
                                            </Form.Control.Feedback>
                                        </td>
                                        <td>
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                onClick={() => handleRemoveItem(index)}
                                                disabled={items.length <= 1}
                                            >
                                                {t('invoices.recurring.remove')}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                        <Button variant="secondary" onClick={handleAddItem}>
                            {t('invoices.recurring.addItem')}
                        </Button>

                        {/* Total Calculation Display */}
                        <Row className="mb-3">
                            <Col md={6} className="ms-auto">
                                <div className="border p-3 bg-light">
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>{t('invoices.recurring.subtotal')}:</span>
                                        <span>{subtotal.toFixed(2)} {currencies?.find(c => c._id === selectedCurrency)?.code || ''}</span>
                                    </div>
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>{t('invoices.recurring.tax')} ({(taxRate * 100).toFixed(1)}%):</span>
                                        <span>{taxAmount.toFixed(2)} {currencies?.find(c => c._id === selectedCurrency)?.code || ''}</span>
                                    </div>
                                    <hr />
                                    <div className="d-flex justify-content-between fw-bold">
                                        <span>{t('invoices.recurring.total')}:</span>
                                        <span>{totalWithTax.toFixed(2)} {currencies?.find(c => c._id === selectedCurrency)?.code || ''}</span>
                                    </div>
                                </div>
                            </Col>
                        </Row>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide}>
                        {t('invoices.recurring.cancel')}
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Spinner size="sm" animation="border" /> {t('invoices.recurring.creating')}
                            </>
                        ) : t('invoices.recurring.create')}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Success Modal */}
            <Modal show={successModal} onHide={() => setSuccessModal(false)} centered backdrop="static">
                <Modal.Body className="text-center p-5">
                    {/* Success Icon */}
                    <div className="mb-3">
                        <i className="bi bi-check-circle-fill text-success" style={{ fontSize: "4rem" }}></i>
                    </div>

                    {/* Title */}
                    <h4 className="mb-3">{t('invoices.recurring.successTitle')}</h4>

                    {/* Message */}
                    <p className="text-muted">{successMessage}</p>

                    {/* Action Button */}
                    <div className="mt-4">
                        <Button variant="success" size="lg" onClick={() => setSuccessModal(false)}>
                            {t('common.ok')}
                        </Button>
                    </div>
                </Modal.Body>
            </Modal>


        </>
    );
};

export default RecurringInvoiceModal;