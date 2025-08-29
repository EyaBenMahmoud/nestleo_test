import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Col
} from "reactstrap";
import Select from 'react-select';
import Flatpickr from "react-flatpickr";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useDispatch, useSelector } from "react-redux";
import { addNewInvoice, clearCurrentInvoice, getInvoiceById, updateInvoice } from "../../slices/invoice/slice";
import { fetchCoOwners, getAllCoowners } from "../../slices/buildings/building";
import { toast } from "react-toastify";
import { fetchCurrencies, getCurrencies } from "../../slices/currency/currency";
import { useTranslation } from "react-i18next";
import { Link } from "feather-icons-react/build/IconComponents";

const InvoiceModal = ({ isOpen, toggle, invoiceId, onSuccess, currentBuilding }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { currencies } = useSelector(state => state.Currency);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const { coOwners, loading: coOwnersLoading } = useSelector((state) => state.Building);
  const { currentInvoice, loading: invoiceLoading } = useSelector((state) => state.Invoice);
  const user = useSelector(state => state.Loginn.user);
  const prevInvoiceIdRef = useRef(invoiceId);

  // Initialize with empty items array instead of defaults
  const [items, setItems] = useState([{ description: "", amount: 0 }]);
  const [taxRate, setTaxRate] = useState(0.2);
  const [itemErrors, setItemErrors] = useState([]);

  // Component state
  const [selectedCoowner, setSelectedCoowner] = useState(null);
  const [availableApartments, setAvailableApartments] = useState([]);
  const [selectedApartments, setSelectedApartments] = useState([]);
  const [selectAllApartments, setSelectAllApartments] = useState(false);

  // Generate invoice number with useCallback
  const generateInvoiceNumber = useCallback(() => {
    const randomNum = Math.floor(Math.random() * 90000) + 10000;
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `INV-${year}${month}-${randomNum}`;
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

  // Validate items
  const validateItems = useCallback((items) => {
    const errors = [];
    items.forEach((item, index) => {
      const itemError = {};
      
      if (!item.description || !item.description.trim()) {
        itemError.description = t("invoices.create.errors.requiredDescription");
      }
      
      const amount = parseFloat(item.amount);
      if (isNaN(amount) || amount <= 0) {
        itemError.amount = t("invoices.create.errors.invalidAmount");
      }
      
      errors[index] = itemError;
    });
    
    setItemErrors(errors);
    
    // Return true if there are no errors
    return errors.every(error => !error.description && !error.amount);
  }, [t]);
  const [successModal, setSuccessModal] = useState(false);

  // Formik configuration
  const formik = useFormik({
    initialValues: {
      syndicateName: `${user.firstName} ${user.lastName}`,
      buildingAddress: `${currentBuilding.address_street}`,
      city: `${currentBuilding.address_city}`,
      postalCode: `${currentBuilding.address_number}`,
      invoiceNumber: generateInvoiceNumber(),
      date: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      coOwner: "",
      apartmentNumber: "",
      building: currentBuilding,
      currency: "",
    },
    validationSchema: Yup.object({
      syndicateName: Yup.string().required(t("invoices.create.required")),
      buildingAddress: Yup.string().required(t("invoices.create.required")),
      city: Yup.string().required(t("invoices.create.required")),
      postalCode: Yup.string().required(t("invoices.create.required")),
      invoiceNumber: Yup.string().required(t("invoices.create.required")),
      date: Yup.date().required(t("invoices.create.errors.requiredDate")),
      dueDate: Yup.date()
        .required(t("invoices.create.errors.requiredDueDate"))
        .min(Yup.ref('date'), t("invoices.create.errors.invalidDueDate")),
      coOwner: Yup.string().required(t("invoices.create.selectCoOwnerError")),
      apartmentNumber: Yup.string().required(t("invoices.create.selectApartmentError")),
      currency: Yup.string().required(t("invoices.create.selectCurrencyError")),
    }),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        // Validate required fields
        if (!selectedCoowner?.value) {
          formik.setFieldError('coOwner', t("invoices.create.selectCoOwnerError"));
          setSubmitting(false);
          return;
        }
        if (selectedApartments.length === 0) {
          formik.setFieldError('apartmentNumber', t("invoices.create.selectApartmentError"));
          setSubmitting(false);
          return;
        }

        // Validate items
        if (!validateItems(items)) {
          setSubmitting(false);
          return;
        }

        const totals = calculateTotals(items);

        const invoiceData = {
          ...values,
          // Convert dates to ISO strings
          date: new Date(values.date).toISOString(),
          dueDate: new Date(values.dueDate).toISOString(),
          // Ensure all numbers are properly formatted
          taxRate: Number(taxRate),
          tax: Number(totals.tax),
          subtotal: Number(totals.subtotal),
          total: Number(totals.total),
          // Format items array
          items: items.map(item => ({
            description: item.description,
            amount: Number(item.amount) || 0
          })),
          status: values.status || "unpaid",
          // Format apartment data
          apartmentIds: selectedApartments.map(apt => apt.value),
          apartmentNumber: selectedApartments.map(apt => apt.number).join(', '),
          // Single co-owner ID
          coOwner: selectedCoowner.value,
          building: currentBuilding?._id,
          currency: values.currency
        };

        console.log("Submitting invoice data:", invoiceData);

        if (invoiceId) {
          // Update existing invoice
          const result = await dispatch(
            updateInvoice({
              id: invoiceId,
              invoiceData
            })
          ).unwrap();

          console.log("Update successful:", result);
          toast.success(t("invoices.create.invoiceUpdated"));
        } else {
          // Create new invoice
          const result = await dispatch(
            addNewInvoice(invoiceData)
          ).unwrap();

        setSuccessModal(true);
        }

        onSuccess();
        toggle();
      } catch (error) {
        console.error("Submission failed:", error);
        toast.error(error.message || t("invoices.create.failedToSave"));
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Reset form state
  const handleFormReset = useCallback(() => {
    formik.resetForm({
      values: {
        syndicateName: `${user.firstName} ${user.lastName}`,
        buildingAddress: `${currentBuilding.address_street}`,
        city: `${currentBuilding.address_city}`,
        postalCode: `${currentBuilding.address_number}`,
        invoiceNumber: generateInvoiceNumber(),
        date: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        coOwner: "",
        apartmentNumber: "",
        building: currentBuilding,
        currency: selectedCurrency?.value || "",
      }
    });
    // Start with one empty item when creating a new invoice
    setItems([{ description: "", amount: 0 }]);
    setItemErrors([{}]);
    setSelectedCoowner(null);
    setSelectedApartments([]);
    setSelectAllApartments(false);
    setAvailableApartments([]);
    setTaxRate(0.2);
  }, [user, currentBuilding, selectedCurrency, generateInvoiceNumber]);

  // Fetch co-owners and currencies on mount
  useEffect(() => {
    if (!currentBuilding) {
      dispatch(getAllCoowners());
      dispatch(fetchCurrencies({ stripeSupported: true }));
    } else {
      dispatch(fetchCoOwners(currentBuilding._id));
      dispatch(fetchCurrencies({ stripeSupported: true }));
    }
  }, [dispatch, currentBuilding]);

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

  // Set default currency
  useEffect(() => {
    if (currencies.length > 0 && !selectedCurrency) {
      const defaultCurrency = currencies.find(c => c.isDefault) || currencies[0];
      setSelectedCurrency({
        value: defaultCurrency._id,
        label: `${defaultCurrency.code} - ${defaultCurrency.name}`,
        symbol: defaultCurrency.symbol
      });
      formik.setFieldValue('currency', defaultCurrency._id);
    }
  }, [currencies]);

  // Load invoice data when invoiceId changes
  useEffect(() => {
    if (!isOpen) return;

    if (invoiceId && invoiceId !== prevInvoiceIdRef.current) {
      dispatch(getInvoiceById(invoiceId));
    } else if (!invoiceId) {
      dispatch(clearCurrentInvoice());
      handleFormReset();
    }

    prevInvoiceIdRef.current = invoiceId;
  }, [invoiceId, isOpen, dispatch, handleFormReset]);

  // Initialize form for edit mode
  useEffect(() => {
    if (!isOpen || !currentInvoice || !coOwners.length) return;

    // Set basic form values
    formik.setValues({
      syndicateName: currentInvoice.syndicateName || `${user.firstName} ${user.lastName}`,
      buildingAddress: `${currentBuilding.address_street}`,
      city: `${currentBuilding.address_city}`,
      postalCode: `${currentBuilding.address_number}`,
      invoiceNumber: currentInvoice.invoiceNumber,
      date: currentInvoice.date ? new Date(currentInvoice.date) : new Date(),
      dueDate: currentInvoice.dueDate ? new Date(currentInvoice.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      building: currentInvoice.building,
      currency: currentInvoice.currency
    });

    // Set currency
    if (currentInvoice.currency) {
      const currency = currencies.find(c => c._id === currentInvoice.currency);
      if (currency) {
        setSelectedCurrency({
          value: currency._id,
          label: `${currency.code} - ${currency.name}`,
          symbol: currency.symbol
        });
      }
    }

    // Set co-owner (single)
    if (currentInvoice.coOwner) {
      const coOwner = coOwners.find(co => co._id === currentInvoice.coOwner);
      if (coOwner) {
        setSelectedCoowner({
          value: coOwner._id,
          label: `${coOwner.firstName} ${coOwner.lastName}`
        });
        formik.setFieldValue('coOwner', `${coOwner.firstName} ${coOwner.lastName}`);
      }
    }

    // Set items from existing invoice
    if (currentInvoice.items && currentInvoice.items.length > 0) {
      setItems(currentInvoice.items.map(item => ({
        description: item.description,
        amount: Number(item.amount) || 0
      })));
    } else {
      // If no items, set one empty item
      setItems([{ description: "", amount: 0 }]);
    }

    // Set tax rate
    if (currentInvoice.taxRate) {
      setTaxRate(Number(currentInvoice.taxRate));
    }
  }, [currentInvoice, isOpen, coOwners, currencies, user]);

  // Update available apartments when co-owner changes
  useEffect(() => {
    if (!isOpen || !selectedCoowner) return;

    const timer = setTimeout(() => {
      const coOwner = coOwners.find(co => co._id === selectedCoowner.value);
      const allApartments = coOwner?.apartments || [];
      setAvailableApartments(allApartments);

      if (currentInvoice?.apartmentIds) {
        const aptOptions = allApartments
          .filter(apt => currentInvoice.apartmentIds.some(id => id.toString() === apt._id.toString()))
          .map(apt => ({
            value: apt._id,
            label: `#${apt.number}`,
            number: apt.number
          }));
        setSelectedApartments(aptOptions);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [selectedCoowner, coOwners, isOpen, currentInvoice]);

  // Memoized options for better performance
  const coownerOptions = useMemo(() =>
    coOwners.map(coowner => ({
      value: coowner._id,
      label: `${coowner.firstName} ${coowner.lastName}`,
      email: coowner.email
    })),
    [coOwners]
  );

  const apartmentOptions = useMemo(() =>
    availableApartments.map(apt => ({
      value: apt._id,
      label: `#${apt.number} (${apt.building?.name || t("invoices.create.noBuilding")})`,
      number: apt.number
    })),
    [availableApartments, t]
  );

  // Functions to handle items
  const addInvoiceItem = () => {
    setItems([...items, { description: "", amount: 0 }]);
    setItemErrors([...itemErrors, {}]);
  };

  const removeInvoiceItem = (index) => {
    if (items.length <= 1) {
      // Always keep at least one item row
      toast.info(t("invoices.create.atLeastOneItem"));
      return;
    }
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
    
    const newErrors = [...itemErrors];
    newErrors.splice(index, 1);
    setItemErrors(newErrors);
  };

  const handleItemFieldChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
    
    // Clear error for this field when user starts typing
    const newErrors = [...itemErrors];
    if (newErrors[index]) {
      newErrors[index] = { ...newErrors[index] };
      delete newErrors[index][field];
    }
    setItemErrors(newErrors);
  };

  // Sync apartment number with formik
  useEffect(() => {
    formik.setFieldValue(
      'apartmentNumber',
      selectedApartments.map(apt => apt.number).join(', ')
    );
  }, [selectedApartments]);

  // Sync co-owner with formik
  useEffect(() => {
    if (selectedCoowner) {
      formik.setFieldValue('coOwner', selectedCoowner.label);
    }
  }, [selectedCoowner]);

  // Toggle select all apartments
  const toggleSelectAllApartments = () => {
    if (selectAllApartments) {
      setSelectedApartments([]);
    } else {
      setSelectedApartments(apartmentOptions);
    }
    setSelectAllApartments(!selectAllApartments);
  };

  // Handle modal close with reset
  const handleModalToggle = () => {
    if (isOpen) {
      // Reset form when closing modal
      handleFormReset();
    }
    toggle();
  };

  return (
    <>
    <Modal isOpen={isOpen} toggle={handleModalToggle} size="xl" centered>
      <ModalHeader toggle={handleModalToggle}>
        {invoiceId ? t("invoices.create.editInvoice") : t("invoices.create.createInvoice")}
        {selectedCoowner && (
          <Badge color="primary" className="ms-2">
            {t("invoices.create.coOwnerBadge", { count: 1 })}
          </Badge>
        )}
        {selectedApartments.length > 0 && (
          <Badge color="info" className="ms-2">
            {t("invoices.create.apartmentsBadge", { count: selectedApartments.length })}
          </Badge>
        )}
      </ModalHeader>
      <ModalBody>
        <Form onSubmit={formik.handleSubmit}>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label>{t("invoices.create.syndicateName")}</Label>
                <Input
                  name="syndicateName"
                  value={formik.values.syndicateName}
                  onChange={formik.handleChange}
                   readOnly
                     className="bg-light"
                  invalid={formik.touched.syndicateName && !!formik.errors.syndicateName}
                />
                {formik.touched.syndicateName && formik.errors.syndicateName && (
                  <div className="text-danger small">{formik.errors.syndicateName}</div>
                )}
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label>{t("invoices.create.invoiceNumber")}</Label>
                <Input
                  name="invoiceNumber"
                  value={formik.values.invoiceNumber}
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
                  onChange={formik.handleChange}
                     readOnly
                     className="bg-light"
                  invalid={formik.touched.buildingAddress && !!formik.errors.buildingAddress}
                />
                {formik.touched.buildingAddress && formik.errors.buildingAddress && (
                  <div className="text-danger small">{formik.errors.buildingAddress}</div>
                )}
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
                  onChange={formik.handleChange}
                     readOnly
                     className="bg-light"
                  invalid={formik.touched.city && !!formik.errors.city}
                />
                {formik.touched.city && formik.errors.city && (
                  <div className="text-danger small">{formik.errors.city}</div>
                )}
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label>{t("invoices.create.postalCode")}</Label>
                <Input
                  name="postalCode"
                  value={formik.values.postalCode}
                  onChange={formik.handleChange}
                     readOnly
                     className="bg-light"
                  invalid={formik.touched.postalCode && !!formik.errors.postalCode}
                />
                {formik.touched.postalCode && formik.errors.postalCode && (
                  <div className="text-danger small">{formik.errors.postalCode}</div>
                )}
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
                <Label>{t("invoices.create.coOwner")}</Label>
                <Select
                  options={coownerOptions}
                  value={selectedCoowner}
                  onChange={(selectedOption) => {
                    setSelectedCoowner(selectedOption);
                  }}
                  isLoading={coOwnersLoading}
                  placeholder={t("invoices.create.selectCoOwner")}
                  classNamePrefix="select"
                />
                {formik.touched.coOwner && formik.errors.coOwner && (
                  <div className="text-danger small mt-1">{formik.errors.coOwner}</div>
                )}
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <Label>{t("invoices.create.apartments")}</Label>
                  <Button
                    color="link"
                    size="sm"
                    onClick={toggleSelectAllApartments}
                    className="p-0"
                    disabled={!selectedCoowner}
                  >
                    {selectAllApartments ? t("invoices.create.deselectAll") : t("invoices.create.selectAll")}
                  </Button>
                </div>
                <Select
                  options={apartmentOptions}
                  isMulti
                  value={selectedApartments}
                  onChange={(selectedOptions) => {
                    setSelectedApartments(selectedOptions || []);
                    setSelectAllApartments(selectedOptions?.length === apartmentOptions.length);
                  }}
                  placeholder={selectedCoowner ? t("invoices.create.selectApartments") : t("invoices.create.selectCoOwnerFirst")}
                  isDisabled={!selectedCoowner}
                  isLoading={coOwnersLoading}
                  classNamePrefix="select"
                  closeMenuOnSelect={false}
                />
                {formik.touched.apartmentNumber && formik.errors.apartmentNumber && (
                  <div className="text-danger small mt-1">{formik.errors.apartmentNumber}</div>
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
                {items.length === 0 && (
                  <tr>
                    <td colSpan="3" className="text-center py-3">
                      {t("invoices.create.noItemsAdded")}
                    </td>
                  </tr>
                )}
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
                  <th className="text-end">{t("invoices.create.vat")} {taxRate * 100} %</th>
                  <th className="text-end">{calculateTotals(items).tax.toFixed(2)} {calculateTotals(items).currencySymbol}</th>
                  <th></th>
                </tr>
                <tr>
                  <th className="text-end">{t("invoices.create.total")}:</th>
                  <th className="text-end">{calculateTotals(items).total.toFixed(2)} {calculateTotals(items).currencySymbol}</th>
                  <th></th>
                </tr>
              </tfoot>
            </Table>
          </div>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button color="light" onClick={handleModalToggle}>
          {t("invoices.create.cancel")}
        </Button>
        <Button
          color="primary"
          onClick={formik.handleSubmit}
          disabled={formik.isSubmitting || invoiceLoading}
        >
          {formik.isSubmitting ? (
            <>
              <Spinner size="sm" className="me-2" />
              {invoiceId ? t("invoices.create.updating") : t("invoices.create.creating")}
            </>
          ) : invoiceId ? t("invoices.create.updateInvoice") : t("invoices.create.createInvoice")}
        </Button>
      </ModalFooter>
    </Modal>
  <Modal isOpen={successModal} toggle={() => setSuccessModal(false)} centered>
  <ModalHeader toggle={() => setSuccessModal(false)}>
    <i className="ri-checkbox-circle-fill text-success me-2"></i>
    Invoice Created Successfully
  </ModalHeader>
  <ModalBody>
    <div className="text-center">
      <div className="mb-4">
        <i className="ri-checkbox-circle-fill text-success" style={{ fontSize: '5rem' }}></i>
      </div>
      <h4>Your invoice has been created successfully!</h4>
      {currentInvoice?.invoiceNumber && (
        <p className="text-muted mt-3">
          Invoice Number: <strong>{currentInvoice?.invoiceNumber}</strong>
        </p>
      )}
    </div>
  </ModalBody>
  <ModalFooter className="justify-content-center">
    <Button 
      color="success" 
      onClick={() => setSuccessModal(false)}
      className="me-2"
    >
      OK
    </Button>
  </ModalFooter>
</Modal>

        </>

          
  );
};

export default InvoiceModal;