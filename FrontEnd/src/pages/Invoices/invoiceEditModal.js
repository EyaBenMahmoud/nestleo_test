import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    Button,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Form,
    Input,
    Label,
    Table,
    FormGroup,
    Spinner,
    Badge,
    Row,
    Col,
    Alert
} from "reactstrap";
import Select from 'react-select';
import Flatpickr from "react-flatpickr";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useDispatch, useSelector } from "react-redux";
import { updateInvoice, getInvoiceById } from "../../slices/invoice/slice";
import { fetchCoOwners } from "../../slices/buildings/building";
import { toast } from "react-toastify";
import { fetchCurrencies } from "../../slices/currency/currency";
import { useTranslation } from "react-i18next";

const InvoiceEditModal = ({ isOpen, toggle, invoiceId, onSuccess, currentBuilding }) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const { currencies } = useSelector(state => state.Currency);
    const { coOwners } = useSelector((state) => state.Building);
    const { currentInvoice, loading: invoiceLoading } = useSelector((state) => state.Invoice);
    const user = useSelector(state => state.Loginn.user);
    const [apartmentError, setApartmentError] = useState(null);

    // Local state
    const [selectedCurrency, setSelectedCurrency] = useState(null);
    const [items, setItems] = useState([{ description: "", amount: 0 }]);
    const [taxRate, setTaxRate] = useState(0.2);
    const [itemErrors, setItemErrors] = useState([]);
    const [selectedCoowner, setSelectedCoowner] = useState(null);
    const [availableApartments, setAvailableApartments] = useState([]);
    const [selectedApartments, setSelectedApartments] = useState([]);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [updateSuccessModal, setUpdateSuccessModal] = useState(false);

    // Clear all validation errors
    const clearValidationErrors = useCallback(() => {
        setItemErrors([]);
    }, []);

    // Calculate totals
    const calculateTotals = useCallback((items) => {
        const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        const tax = subtotal * taxRate;
        const total = subtotal + tax;

        return {
            subtotal,
            taxRate,
            tax,
            total,
            currencySymbol: selectedCurrency?.symbol || '€'
        };
    }, [taxRate, selectedCurrency]);

    // Validate items without setting persistent errors
    const validateItems = useCallback((items) => {
        let hasErrors = false;
        const errors = [];

        items.forEach((item, index) => {
            const itemError = {};

            if (!item.description || !item.description.trim()) {
                itemError.description = t("invoices.create.errors.requiredDescription");
                hasErrors = true;
            }

            const amount = parseFloat(item.amount);
            if (isNaN(amount) || amount <= 0) {
                itemError.amount = t("invoices.create.errors.invalidAmount");
                hasErrors = true;
            }

            errors[index] = itemError;
        });

        // Set errors and don't clear them automatically
        if (hasErrors) {
            setItemErrors(errors);
            // Don't set timeout to clear errors - they'll stay until fixed
        }

        return !hasErrors;
    }, [t]);

    // Formik configuration for edit mode
    const formik = useFormik({
        initialValues: {
            syndicateName: `${user.firstName} ${user.lastName}`,
            buildingAddress: currentBuilding?.address_street || "",
            city: currentBuilding?.address_city || "",
            postalCode: currentBuilding?.address_number || "",
            invoiceNumber: "",
            date: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            coOwner: "",
            apartmentNumber: "",
            building: currentBuilding,
            currency: "",
        },

        enableReinitialize: true,


        // Also, update your onSubmit function to use the correct invoice number
        onSubmit: async (values, { setSubmitting, setFieldError }) => {
            try {
                console.log("Starting form submission...");

                // Clear any existing errors
                clearValidationErrors();

                // Validate items
                if (!validateItems(items)) {
                    setSubmitting(false);
                    return;
                }

                // Validate required selections
                if (!selectedCoowner?.value) {
                    toast.error(t("invoices.create.selectCoOwnerError"));
                    setSubmitting(false);
                    return;
                }

                if (selectedApartments.length === 0) {
                    // Show error message below the apartment field
                    setApartmentError(t("invoices.create.selectApartmentError"));
                    toast.error(t("invoices.create.selectApartmentError"));
                    setSubmitting(false);
                    return;
                }

                // Validate currency
                if (!selectedCurrency?.value) {
                    toast.error(t("invoices.create.selectCurrencyError"));
                    setSubmitting(false);
                    return;
                }

                const totals = calculateTotals(items);

                const invoiceData = {
                    syndicateName: values.syndicateName,
                    buildingAddress: values.buildingAddress,
                    city: values.city,
                    postalCode: values.postalCode,
                    // Use the invoice number from formik values, which will have been set by our dedicated useEffect
                    invoiceNumber: values.invoiceNumber,
                    date: new Date(values.date).toISOString(),
                    dueDate: new Date(values.dueDate).toISOString(),
                    taxRate: Number(taxRate),
                    tax: Number(totals.tax),
                    subtotal: Number(totals.subtotal),
                    total: Number(totals.total),
                    items: items.map(item => ({
                        description: item.description,
                        amount: Number(item.amount) || 0
                    })),
                    apartmentIds: selectedApartments.map(apt => apt.value),
                    apartmentNumber: selectedApartments.map(apt => apt.number).join(', '),
                    coOwner: selectedCoowner.value,
                    building: currentBuilding?._id,
                    currency: selectedCurrency.value // Use the selected currency directly
                };

                console.log("Updating invoice with data:", invoiceData);
                console.log("Invoice ID:", invoiceId);
                console.log("Invoice number being sent:", invoiceData.invoiceNumber);

                // Try to update the invoice
                await dispatch(updateInvoice({
                    id: invoiceId,
                    invoiceData
                })).unwrap();

                console.log("Update successful!");
                setUpdateSuccessModal(true);
                onSuccess();

            } catch (error) {
                console.error("Update failed:", error);
                toast.error(error.message || t("invoices.create.failedToUpdate"));
            } finally {
                setSubmitting(false);
            }
        }
    });

    // Load invoice data when modal opens
    useEffect(() => {
        if (isOpen && invoiceId) {
            dispatch(getInvoiceById(invoiceId));
            dispatch(fetchCoOwners(currentBuilding._id));
            dispatch(fetchCurrencies({ stripeSupported: true }));
            setIsDataLoaded(false);
        }
    }, [isOpen, invoiceId, dispatch, currentBuilding]);
    useEffect(() => {
        if (currentInvoice?.invoiceNumber) {
            const timeout = setTimeout(() => {
                console.log("Setting invoice number after 3s:", currentInvoice.invoiceNumber);
                formik.setFieldValue('invoiceNumber', currentInvoice.invoiceNumber);
            }, 3000); // 3 seconds

            // cleanup if component unmounts or currentInvoice changes before 3s
            return () => clearTimeout(timeout);
        }
    }, [currentInvoice, formik]);


    // Initialize form with invoice data
    // Replace the useEffect that initializes form data with this corrected version:
    // Replace the entire useEffect that initializes form data:
    useEffect(() => {
        if (!currentInvoice || !coOwners.length || !currencies.length || isDataLoaded) return;

        console.log("Initializing edit form with:", currentInvoice);
        console.log("Available coOwners:", coOwners);
        console.log("Current invoice coOwner:", currentInvoice.coOwner);

        // Set form values - make sure to handle both string and object IDs
        formik.setValues({
            syndicateName: currentInvoice.syndicateName || `${user.firstName} ${user.lastName}`,
            buildingAddress: currentInvoice.buildingAddress || currentBuilding?.address_street || "",
            city: currentInvoice.city || currentBuilding?.address_city || "",
            postalCode: currentInvoice.postalCode || currentBuilding?.address_number || "",
            date: currentInvoice.date ? new Date(currentInvoice.date) : new Date(),
            dueDate: currentInvoice.dueDate ? new Date(currentInvoice.dueDate) : new Date(),
            building: currentInvoice.building || currentBuilding,
            currency: currentInvoice.currency?._id || currentInvoice.currency || "",
            coOwner: "",
            apartmentNumber: ""
        });

        console.log("Invoice number being set:", currentInvoice.invoiceNumber);

        // Set currency
        if (currentInvoice.currency) {
            const currencyId = currentInvoice.currency?._id || currentInvoice.currency;
            const currency = currencies.find(c => c._id === currencyId);
            if (currency) {
                setSelectedCurrency({
                    value: currency._id,
                    label: `${currency.code} - ${currency.name}`,
                    symbol: currency.symbol
                });
                formik.setFieldValue('currency', currency._id);
            }
        }

        // Set co-owner - handle both populated and non-populated cases
        if (currentInvoice.coOwner) {
            // Extract co-owner ID whether it's populated or just an ID
            const coOwnerId = currentInvoice.coOwner._id || currentInvoice.coOwner;

            // Find co-owner in the list
            const coOwner = coOwners.find(co => co._id === coOwnerId);

            if (coOwner) {
                const coOwnerOption = {
                    value: coOwner._id,
                    label: `${coOwner.firstName} ${coOwner.lastName}`
                };
                setSelectedCoowner(coOwnerOption);
                formik.setFieldValue('coOwner', `${coOwner.firstName} ${coOwner.lastName}`);

                console.log("Co-owner set:", coOwnerOption);

                // Set available apartments for this co-owner
                const allApartments = coOwner?.apartments || [];
                setAvailableApartments(allApartments);
                console.log("Available apartments:", allApartments);

                // Set selected apartments - handle both apartmentIds array and apartmentNumber string
                if (currentInvoice.apartmentIds && currentInvoice.apartmentIds.length > 0) {
                    // Use apartmentIds array if available
                    const aptOptions = allApartments
                        .filter(apt => currentInvoice.apartmentIds.some(id => {
                            const aptId = apt._id.toString();
                            const invoiceAptId = (typeof id === 'object' ? id._id : id).toString();
                            return aptId === invoiceAptId;
                        }))
                        .map(apt => ({
                            value: apt._id,
                            label: `#${apt.number}`,
                            number: apt.number
                        }));
                    setSelectedApartments(aptOptions);
                    formik.setFieldValue('apartmentNumber', aptOptions.map(apt => apt.number).join(', '));
                    console.log("Apartments set from apartmentIds:", aptOptions);
                } else if (currentInvoice.apartmentNumber) {
                    // Fallback: try to match by apartment number string
                    const apartmentNumbers = currentInvoice.apartmentNumber.split(',').map(num => num.trim());
                    const aptOptions = allApartments
                        .filter(apt => apartmentNumbers.includes(apt.number.toString()))
                        .map(apt => ({
                            value: apt._id,
                            label: `#${apt.number}`,
                            number: apt.number
                        }));
                    setSelectedApartments(aptOptions);
                    formik.setFieldValue('apartmentNumber', aptOptions.map(apt => apt.number).join(', '));
                    console.log("Apartments set from apartmentNumber:", aptOptions);
                }
            } else {
                console.error("Co-owner not found in list:", coOwnerId);
            }
        }

        // Set items
        if (currentInvoice.items && currentInvoice.items.length > 0) {
            setItems(currentInvoice.items.map(item => ({
                description: item.description,
                amount: Number(item.amount) || 0
            })));
        }

        // Set tax rate
        if (currentInvoice.taxRate !== undefined) {
            setTaxRate(Number(currentInvoice.taxRate));
        }

        // Clear errors and mark as loaded
        clearValidationErrors();
        setIsDataLoaded(true);

    }, [currentInvoice, coOwners, currencies, isDataLoaded, user, currentBuilding]);

    // Add a function to handle co-owner change
    const handleCoOwnerChange = (selectedOption) => {
        setSelectedCoowner(selectedOption);
        formik.setFieldValue('coOwner', selectedOption ? selectedOption.label : "");

        if (selectedOption) {
            // Find the co-owner and set available apartments
            const coOwner = coOwners.find(co => co._id === selectedOption.value);
            if (coOwner) {
                const allApartments = coOwner?.apartments || [];
                setAvailableApartments(allApartments);
                // Clear selected apartments when co-owner changes
                setSelectedApartments([]);
                formik.setFieldValue('apartmentNumber', "");
            }
        } else {
            setAvailableApartments([]);
            setSelectedApartments([]);
            formik.setFieldValue('apartmentNumber', "");
        }
    };

    // Add a function to handle apartment changes
    const handleApartmentChange = (selectedOptions) => {
        setSelectedApartments(selectedOptions || []);
        const apartmentNumbers = selectedOptions ? selectedOptions.map(apt => apt.number).join(', ') : "";
        formik.setFieldValue('apartmentNumber', apartmentNumbers);

        // Clear apartment error if apartments are selected
        if (selectedOptions && selectedOptions.length > 0) {
            setApartmentError(null);
        }
    };


    // Currency options
    const currencyOptions = useMemo(() =>
        currencies.map(currency => ({
            value: currency._id,
            label: `${currency.code} - ${currency.name}`,
            code: currency.code,
            symbol: currency.symbol,
            stripeSupported: currency.stripeSupported
        })),
        [currencies]
    );

    // Co-owner options
    const coownerOptions = useMemo(() =>
        coOwners.map(coowner => ({
            value: coowner._id,
            label: `${coowner.firstName} ${coowner.lastName}`,
            email: coowner.email
        })),
        [coOwners]
    );

    // Apartment options
    const apartmentOptions = useMemo(() =>
        availableApartments.map(apt => ({
            value: apt._id,
            label: `#${apt.number}`,
            number: apt.number
        })),
        [availableApartments]
    );

    // Item management functions
    const addInvoiceItem = () => {
        setItems([...items, { description: "", amount: 0 }]);
    };

    const removeInvoiceItem = (index) => {
        if (items.length <= 1) {
            toast.info(t("invoices.create.atLeastOneItem"));
            return;
        }
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleItemFieldChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);

        // Clear error only if the new value is valid
        if (itemErrors[index] && itemErrors[index][field]) {
            // For description - clear if not empty
            if (field === 'description' && value && value.trim() !== '') {
                const newErrors = [...itemErrors];
                if (newErrors[index]) {
                    delete newErrors[index].description;
                    setItemErrors(newErrors);
                }
            }

            // For amount - clear if valid number > 0
            if (field === 'amount') {
                const amount = parseFloat(value);
                if (!isNaN(amount) && amount > 0) {
                    const newErrors = [...itemErrors];
                    if (newErrors[index]) {
                        delete newErrors[index].amount;
                        setItemErrors(newErrors);
                    }
                }
            }
        }
    };

    // Reset modal state when closing
    const handleModalToggle = () => {
        if (isOpen) {
            setIsDataLoaded(false);
            setItemErrors([]);
            setApartmentError(null); // Clear apartment errors
            setSelectedCoowner(null);
            setSelectedApartments([]);
            setAvailableApartments([]);
            formik.resetForm();
        }
        toggle();
    };

    return (
        <>
            <Modal isOpen={isOpen} toggle={handleModalToggle} size="xl" centered>
                <ModalHeader toggle={handleModalToggle}>
                    <i className="ri-edit-box-line me-2"></i>
                    {t("invoices.edit.title")}
                    {selectedCoowner && (
                        <Badge color="primary" className="ms-2">
                            {selectedCoowner.label}
                        </Badge>
                    )}
                    {selectedApartments.length > 0 && (
                        <Badge color="info" className="ms-2">
                            {t("invoices.create.apartmentsBadge", { count: selectedApartments.length })}
                        </Badge>
                    )}
                </ModalHeader>

                <ModalBody>
                    {!isDataLoaded && (
                        <div className="text-center py-4">
                            <Spinner color="primary" />
                            <p className="mt-2">{t("invoices.edit.loading")}</p>
                        </div>
                    )}

                    {isDataLoaded && (
                        <Form onSubmit={formik.handleSubmit}>
                            <Alert color="info" className="mb-3">
                                <i className="ri-information-line me-2"></i>
                                {t("invoices.edit.editingNote")}
                            </Alert>

                            <Row>
                                <Col md={12}>
                                    <FormGroup>
                                        <Label>{t("invoices.create.syndicateName")}</Label>
                                        <Input
                                            name="syndicateName"
                                            value={formik.values.syndicateName}
                                            readOnly
                                            className="bg-light"
                                        />
                                    </FormGroup>
                                </Col>

                            </Row>

                            <Row>
                                <Col md={12}>
                                    <FormGroup>
                                        <Label>{t("invoices.create.buildingAddress")}</Label>
                                        <Input
                                            name="buildingAddress"
                                            value={formik.values.buildingAddress}
                                            readOnly
                                            className="bg-light"
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>

                            <Row>
                                <Col md={6}>
                                    <FormGroup>
                                        <Label>{t("invoices.create.city")}</Label>
                                        <Input
                                            name="city"
                                            value={formik.values.city}
                                            readOnly
                                            className="bg-light"
                                        />
                                    </FormGroup>
                                </Col>
                                <Col md={6}>
                                    <FormGroup>
                                        <Label>{t("invoices.create.postalCode")}</Label>
                                        <Input
                                            name="postalCode"
                                            value={formik.values.postalCode}
                                            readOnly
                                            className="bg-light"
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>

                            <Row>
                                <Col md={6}>
                                    <FormGroup>
                                        <Label>{t("invoices.create.issueDate")}</Label>
                                        <Flatpickr
                                            className={`form-control ${formik.touched.date && formik.errors.date ? 'is-invalid' : ''}`}
                                            value={formik.values.date}
                                            onChange={([date]) => formik.setFieldValue("date", date)}
                                        />
                                        {formik.touched.date && formik.errors.date && (
                                            <div className="text-danger small mt-1">{formik.errors.date}</div>
                                        )}
                                    </FormGroup>
                                </Col>
                                <Col md={6}>
                                    <FormGroup>
                                        <Label>{t("invoices.create.dueDate")}</Label>
                                        <Flatpickr
                                            className={`form-control ${formik.touched.dueDate && formik.errors.dueDate ? 'is-invalid' : ''}`}
                                            value={formik.values.dueDate}
                                            onChange={([date]) => formik.setFieldValue("dueDate", date)}
                                        />
                                        {formik.touched.dueDate && formik.errors.dueDate && (
                                            <div className="text-danger small mt-1">{formik.errors.dueDate}</div>
                                        )}
                                    </FormGroup>
                                </Col>
                            </Row>

                            <Row>
                                <Col md={6}>
                                    <FormGroup>
                                        <Label>
                                            {t("invoices.create.coOwner")}
                                        </Label>
                                        <Select
                                            options={coownerOptions}
                                            value={selectedCoowner}
                                            onChange={handleCoOwnerChange}  // Add the onChange handler
                                            placeholder={t("invoices.create.selectCoOwner")}
                                            classNamePrefix="select"
                                            isDisabled={false}  // Make sure it's not disabled
                                        />
                                    </FormGroup>
                                </Col>
                                <Col md={6}>
                                    <FormGroup>
                                        <Label>
                                            {t("invoices.create.apartments")}
                                        </Label>
                                        <Select
                                            options={apartmentOptions}
                                            isMulti
                                            value={selectedApartments}
                                            onChange={handleApartmentChange}
                                            placeholder={t("invoices.create.selectApartments")}
                                            classNamePrefix="select"
                                            isDisabled={!selectedCoowner}
                                            className={apartmentError ? "is-invalid" : ""}
                                        />
                                        {apartmentError && (
                                            <div className="invalid-feedback d-block">{apartmentError}</div>
                                        )}
                                        {!selectedCoowner && (
                                            <small className="text-muted">{t("invoices.edit.selectCoOwnerFirst")}</small>
                                        )}
                                    </FormGroup>
                                </Col>
                            </Row>

                            <Row>
                                <Col md={6}>
                                    <FormGroup>
                                        <Label>{t("invoices.create.currency")}</Label>
                                        <Select
                                            options={currencyOptions}
                                            value={selectedCurrency}
                                            onChange={(selectedOption) => {
                                                setSelectedCurrency(selectedOption);
                                                formik.setFieldValue('currency', selectedOption?.value || "");
                                            }}
                                            placeholder={t("invoices.create.selectCurrency")}
                                            classNamePrefix="select"
                                        />
                                        {formik.touched.currency && formik.errors.currency && (
                                            <div className="text-danger small mt-1">{formik.errors.currency}</div>
                                        )}
                                    </FormGroup>
                                </Col>
                                <Col md={6}>
                                    <FormGroup>
                                        <Label>{t("invoices.create.taxRate")}</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.1"
                                            value={(taxRate * 100).toFixed(1)}
                                            onChange={(e) => {
                                                const value = parseFloat(e.target.value) || 0;
                                                setTaxRate(Math.min(Math.max(value / 100, 0), 1));
                                            }}
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>

                            {/* Items Table */}
                            <div className="table-responsive mt-3">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <h5 className="mb-0">{t("invoices.create.invoiceItems")}</h5>
                                    <Button color="success" size="sm" onClick={addInvoiceItem}>
                                        <i className="ri-add-line align-middle me-1"></i>
                                        {t("invoices.create.addItem")}
                                    </Button>
                                </div>
                                <Table bordered className="mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th style={{ width: "60%" }}>{t("invoices.create.description")}</th>
                                            <th style={{ width: "25%" }}>{t("invoices.create.amount")} ({selectedCurrency?.symbol || '€'})</th>
                                            <th style={{ width: "15%" }}>{t("invoices.create.action")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item, index) => (
                                            <tr key={index}>
                                                <td>
                                                    <Input
                                                        type="text"
                                                        placeholder={t("invoices.create.enterItemDescription")}
                                                        value={item.description}
                                                        onChange={(e) => handleItemFieldChange(index, 'description', e.target.value)}
                                                        className={itemErrors[index]?.description ? 'is-invalid' : ''}
                                                    />
                                                    {itemErrors[index]?.description && (
                                                        <div className="text-danger small mt-1">{itemErrors[index].description}</div>
                                                    )}
                                                </td>
                                                <td>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={item.amount}
                                                        onChange={(e) => handleItemFieldChange(index, 'amount', e.target.value)}
                                                        className={`text-end ${itemErrors[index]?.amount ? 'is-invalid' : ''}`}
                                                    />
                                                    {itemErrors[index]?.amount && (
                                                        <div className="text-danger small mt-1">{itemErrors[index].amount}</div>
                                                    )}
                                                </td>
                                                <td className="text-center">
                                                    <Button
                                                        color="danger"
                                                        size="sm"
                                                        onClick={() => removeInvoiceItem(index)}
                                                    >
                                                        <i className="ri-delete-bin-line align-middle"></i>
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="table-light">
                                        <tr>
                                            <th className="text-end">{t("invoices.create.subtotal")}:</th>
                                            <th className="text-end">
                                                {calculateTotals(items).subtotal.toFixed(2)} {selectedCurrency?.symbol || '€'}
                                            </th>
                                            <th></th>
                                        </tr>
                                        <tr>
                                            <th className="text-end">{t("invoices.create.vat")} {(taxRate * 100).toFixed(1)}%:</th>
                                            <th className="text-end">
                                                {calculateTotals(items).tax.toFixed(2)} {selectedCurrency?.symbol || '€'}
                                            </th>
                                            <th></th>
                                        </tr>
                                        <tr>
                                            <th className="text-end">{t("invoices.create.total")}:</th>
                                            <th className="text-end">
                                                <strong>{calculateTotals(items).total.toFixed(2)} {selectedCurrency?.symbol || '€'}</strong>
                                            </th>
                                            <th></th>
                                        </tr>
                                    </tfoot>
                                </Table>
                            </div>
                        </Form>
                    )}
                </ModalBody>

                <ModalFooter>
                    <Button color="light" onClick={handleModalToggle}>
                        {t("invoices.create.cancel")}
                    </Button>
                    <Button
                        color="primary"
                        onClick={formik.handleSubmit}
                        disabled={formik.isSubmitting || invoiceLoading || !isDataLoaded}
                    >
                        {formik.isSubmitting ? (
                            <>
                                <Spinner size="sm" className="me-2" />
                                {t("invoices.edit.updating")}
                            </>
                        ) : (
                            <>
                                <i className="ri-save-line me-1"></i>
                                {t("invoices.edit.updateInvoice")}
                            </>
                        )}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Success Modal */}
            <Modal isOpen={updateSuccessModal} toggle={() => setUpdateSuccessModal(false)} centered>
                <ModalHeader toggle={() => setUpdateSuccessModal(false)}>
                    <i className="ri-checkbox-circle-fill text-success me-2"></i>
                    {t("invoices.edit.successTitle")}
                </ModalHeader>
                <ModalBody>
                    <div className="text-center">
                        <div className="mb-4">
                            <i className="ri-checkbox-circle-fill text-success" style={{ fontSize: '5rem' }}></i>
                        </div>
                        <h4>{t("invoices.edit.successMessage")}</h4>
                        {currentInvoice?.invoiceNumber && (
                            <p className="text-muted mt-3">
                                {t("invoices.create.invoiceNumber")}: <strong>{currentInvoice.invoiceNumber}</strong>
                            </p>
                        )}
                        <div className="alert alert-success mt-3">
                            <i className="ri-information-line me-2"></i>
                            {t("invoices.edit.successDetails")}
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter className="justify-content-center">
                    <Button
                        color="success"
                        onClick={() => {
                            setUpdateSuccessModal(false);
                            handleModalToggle();
                        }}
                    >
                        {t("invoices.edit.ok")}
                    </Button>
                </ModalFooter>
            </Modal>
        </>
    );
};

export default InvoiceEditModal;