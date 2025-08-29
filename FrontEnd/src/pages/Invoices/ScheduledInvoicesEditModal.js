import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
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
  Row,
  Col,
  Table,
  Badge,
  Spinner,
  Alert,
  FormText,
  FormFeedback,
} from "reactstrap";
import {
  fetchBuildingBlocs,
  fetchmultipleApartmentsPerBlocs,
} from "../../slices/buildings/building";
import { fetchCurrencies } from "../../slices/currency/currency";
import { toast } from "react-toastify";
import api from "../../services/api";
import { useTranslation } from "react-i18next";

const EditScheduledInvoiceModal = ({
  isOpen,
  toggle,
  invoice,
  buildings,
  onSuccess,
}) => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    name: "",
    buildingId: "",
    blocIds: [],
    apartmentIds: [],
    items: [],
    frequency: "monthly",
    taxRate: 0,
    currencyId: "",
  });

  // Add validation state
  const [errors, setErrors] = useState({
    name: "",
    buildingId: "",
    currencyId: "",
    items: [],
    frequency: "",
    taxRate: ""
  });
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get data from Redux store
  const { blocs: blocData, apartments: apartmentData, loading: buildingLoading } = useSelector(
    (state) => state.Building
  );
  const { currencies } = useSelector((state) => state.Currency);

  // Get building data
  const selectedBuildingData = buildings.find((b) => b._id === formData.buildingId);
  const blocs = selectedBuildingData?.blocs || [];
  const apartments = apartmentData.filter((apartment) =>
    formData.blocIds.some(
      (blocId) =>
        apartment.bloc === blocId || // For string IDs
        apartment.bloc._id === blocId // If populated as objects
    )
  );
  const { t } = useTranslation();

  // Rest of your existing code...

  // Add validation functions
  const validateName = (name) => {
    if (!name || name.trim() === '') {
      return t('invoices.recurring.errors.nameRequired');
    }
    if (name.length < 3) {
      return t('invoices.recurring.errors.nameLength');
    }
    if (name.length > 100) {
      return t('invoices.recurring.errors.nameTooLong');
    }
    return '';
  };

  const validateBuilding = (buildingId) => {
    if (!buildingId) {
      return t('invoices.recurring.errors.buildingRequired');
    }
    return '';
  };

  const validateCurrency = (currencyId) => {
    if (!currencyId) {
      return t('invoices.recurring.errors.currencyRequired');
    }
    return '';
  };

  const validateFrequency = (frequency) => {
    if (!frequency) {
      return t('invoices.recurring.errors.frequencyRequired');
    }
    return '';
  };

  const validateTaxRate = (taxRate) => {
    if (taxRate < 0 || taxRate > 1) {
      return t('invoices.recurring.errors.invalidTaxRate');
    }
    return '';
  };
  const validateItemDescription = (description) => {
    if (!description || description.trim() === '') {
      return t('invoices.recurring.errors.descriptionRequired');
    }

    // Check if value is only numbers
    if (/^\d+$/.test(description)) {
      return t('invoices.recurring.errors.descriptionOnlyNumbers');
    }

    // Check if value is only special characters
    if (/^[^\w\s]|_+$/.test(description)) {
      return t('invoices.recurring.errors.descriptionOnlySymbols');
    }

    return '';
  };

  const validateItem = (item) => {
    const itemErrors = {};

    const descriptionError = validateItemDescription(item.description);
    if (descriptionError) {
      itemErrors.description = descriptionError;
    }

    if (item.amount <= 0) {
      itemErrors.amount = t('invoices.recurring.errors.positiveAmount');
    }

    return itemErrors;
  };
  const validateForm = () => {
    const nameError = validateName(formData.name);
    const buildingError = validateBuilding(formData.buildingId);
    const currencyError = validateCurrency(formData.currencyId);
    const frequencyError = validateFrequency(formData.frequency);
    const taxRateError = validateTaxRate(formData.taxRate);
    const itemErrors = formData.items.map(validateItem);

    setErrors({
      name: nameError,
      buildingId: buildingError,
      currencyId: currencyError,
      frequency: frequencyError,
      taxRate: taxRateError,
      items: itemErrors
    });

    // Check if any errors exist
    const hasItemErrors = itemErrors.some(item =>
      Object.values(item).some(error => error)
    );

    return !(nameError || buildingError || currencyError || frequencyError || taxRateError || hasItemErrors);
  };
  // Initialize form data when invoice changes
  useEffect(() => {
    if (invoice) {
      setFormData({
        name: invoice.name || "",
        buildingId: invoice.building?._id || "",
        blocIds: invoice.selectedBlocs?.map((b) => b._id) || [],
        apartmentIds: invoice.selectedApartments?.map((a) => a._id) || [],
        items: invoice.items?.map((item) => ({ ...item })) || [],
        frequency: invoice.frequency || "monthly",
        taxRate: invoice.taxRate || 0,
        currencyId: invoice.currency?._id || "",
      });

      // If building is selected, fetch its blocs
      if (invoice.building?._id) {
        dispatch(fetchBuildingBlocs(invoice.building._id));
      }

      // If there are selected blocs, fetch their apartments
      if (invoice.selectedBlocs?.length > 0) {
        dispatch(fetchmultipleApartmentsPerBlocs(invoice.selectedBlocs.map(b => b._id)));
      }
    }
  }, [invoice, dispatch]);

  // Fetch currencies on mount
  useEffect(() => {
    dispatch(fetchCurrencies({ stripeSupported: true }));
  }, [dispatch]);

  const handleBuildingChange = (buildingId) => {
    setFormData((prev) => ({
      ...prev,
      buildingId,
      blocIds: [],
      apartmentIds: [],
    }));

    if (buildingId) {
      dispatch(fetchBuildingBlocs(buildingId));
    }
  };

  const handleSelectAllBlocs = () => {
    if (formData.blocIds.length === blocs.length) {
      // If all are selected, deselect all
      setFormData((prev) => ({
        ...prev,
        blocIds: [],
        apartmentIds: [], // Also clear apartments when deselecting all blocs
      }));
    } else {
      // Select all blocs
      setFormData((prev) => ({
        ...prev,
        blocIds: blocs.map((bloc) => bloc._id),
      }));
      dispatch(fetchmultipleApartmentsPerBlocs(blocs.map((bloc) => bloc._id)));
    }
  };

  const handleSelectAllApartments = () => {
    if (formData.apartmentIds.length === apartments.length) {
      // If all are selected, deselect all
      setFormData((prev) => ({
        ...prev,
        apartmentIds: [],
      }));
    } else {
      // Select all apartments
      setFormData((prev) => ({
        ...prev,
        apartmentIds: apartments.map((apartment) => apartment._id),
      }));
    }
  };

  const handleBlocToggle = (blocId) => {
    setFormData((prev) => {
      const newBlocIds = prev.blocIds.includes(blocId)
        ? prev.blocIds.filter((id) => id !== blocId)
        : [...prev.blocIds, blocId];

      // Fetch apartments when blocs are selected
      if (newBlocIds.length > 0) {
        dispatch(fetchmultipleApartmentsPerBlocs(newBlocIds));
      }

      return {
        ...prev,
        blocIds: newBlocIds,
        apartmentIds: [], // Clear apartments when changing blocs
      };
    });
  };

  const handleApartmentToggle = (apartmentId) => {
    setFormData((prev) => ({
      ...prev,
      apartmentIds: prev.apartmentIds.includes(apartmentId)
        ? prev.apartmentIds.filter((id) => id !== apartmentId)
        : [...prev.apartmentIds, apartmentId],
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = field === "amount" ? parseFloat(value) || 0 : value;
    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { description: "", amount: 0 }],
    }));
  };

  const removeItem = (index) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate the form before submission
    if (!validateForm()) {
      toast.error(t('invoices.recurring.errors.fixErrors'));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.put(`/api/invoices/scheduled-invoices/${invoice._id}`, {
        ...formData,
      });

      if (response.status !== 200) {
        throw new Error(t('invoices.recurring.errors.updateFailed'));
      }

      toast.success(t('invoices.recurring.updateSuccess'));
      onSuccess();
      toggle();
    } catch (error) {
      toast.error(error.message || t('invoices.recurring.errors.updateFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="xl">
      <ModalHeader toggle={toggle}>
        {t('invoices.recurring.editTitle')}
      </ModalHeader>
      <Form onSubmit={handleSubmit}>
        <ModalBody>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label>{t('invoices.recurring.name')}</Label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  invalid={!!errors.name}
                  required
                  placeholder={t('invoices.recurring.namePlaceholder')}
                />
                {errors.name && <FormFeedback>{errors.name}</FormFeedback>}
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label>{t('invoices.recurring.building')}</Label>
                <Input
                  type="select"
                  name="buildingId"
                  value={formData.buildingId}
                  onChange={(e) => handleBuildingChange(e.target.value)}
                  invalid={!!errors.buildingId}
                  required
                >
                  <option value="">{t('invoices.recurring.selectBuilding')}</option>
                  {buildings.map((building) => (
                    <option key={building._id} value={building._id}>
                      {building.name}
                    </option>
                  ))}
                </Input>
                {errors.buildingId && <FormFeedback>{errors.buildingId}</FormFeedback>}
              </FormGroup>
            </Col>
          </Row>

          {formData.buildingId && (
            <Row className="mb-3">
              <Col md={6}>
                <FormGroup>
                  <Form.Label>{t('invoices.recurring.blocs')}</Form.Label>
                  <div className="d-flex justify-content-between mb-2">
                    <Input
                      type="checkbox"
                      label={`Select All (${blocs.length})`}
                      checked={formData.blocIds.length === blocs.length && blocs.length > 0}
                      onChange={handleSelectAllBlocs}
                      disabled={blocs.length === 0}
                    />
                    <small className="text-muted">
                      {formData.blocIds.length} selected
                    </small>
                  </div>
                  {buildingLoading.blocs ? (
                    <div className="text-center">
                      <Spinner size="sm" /> Loading blocs...
                    </div>
                  ) : (
                    <div
                      style={{
                        maxHeight: "200px",
                        overflowY: "auto",
                        border: "1px solid #ddd",
                        padding: "10px",
                      }}
                    >
                      {blocs.map((bloc) => (
                        <FormGroup check key={bloc._id}>
                          <Input
                            type="checkbox"
                            id={`bloc-${bloc._id}`}
                            checked={formData.blocIds.includes(bloc._id)}
                            onChange={() => handleBlocToggle(bloc._id)}
                          />
                          <Label check for={`bloc-${bloc._id}`}>
                            {bloc.name}
                          </Label>
                        </FormGroup>
                      ))}
                    </div>
                  )}
                  <FormText>Leave unselected to include all blocs</FormText>
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Select Apartments (optional)</Label>
                  <div className="d-flex justify-content-between mb-2">
                    <Input
                      type="checkbox"
                      label={`Select All (${apartments.length})`}
                      checked={
                        formData.apartmentIds.length === apartments.length &&
                        apartments.length > 0
                      }
                      onChange={handleSelectAllApartments}
                      disabled={apartments.length === 0}
                    />
                    <small className="text-muted">
                      {formData.apartmentIds.length} selected
                    </small>
                  </div>
                  {buildingLoading.apartments ? (
                    <div className="text-center">
                      <Spinner size="sm" /> Loading apartments...
                    </div>
                  ) : (
                    <div
                      style={{
                        maxHeight: "200px",
                        overflowY: "auto",
                        border: "1px solid #ddd",
                        padding: "10px",
                      }}
                    >
                      {apartments.map((apartment) => (
                        <FormGroup check key={apartment._id}>
                          <Input
                            type="checkbox"
                            id={`apartment-${apartment._id}`}
                            checked={formData.apartmentIds.includes(apartment._id)}
                            onChange={() => handleApartmentToggle(apartment._id)}
                          />
                          <Label check for={`apartment-${apartment._id}`}>
                            {apartment.number} (Floor {apartment.floor})
                          </Label>
                        </FormGroup>
                      ))}
                    </div>
                  )}
                  <FormText>Leave unselected to include all apartments</FormText>
                </FormGroup>
              </Col>
            </Row>
          )}

          <Row>
            <Col md={4}>
              <FormGroup>
                <Label>Frequency</Label>
                <Input
                  type="select"
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleChange}
                  invalid={!!errors.frequency}
                  required
                >
                  <option value="monthly">{t('invoices.recurring.monthly')}</option>
                  <option value="quarterly">{t('invoices.recurring.quarterly')}</option>
                  <option value="biannually">{t('invoices.recurring.biannually')}</option>
                  <option value="annually">{t('invoices.recurring.annually')}</option>
                </Input>
                {errors.frequency && <FormFeedback>{errors.frequency}</FormFeedback>}
              </FormGroup>
            </Col>
            <Col md={4}>
              <FormGroup>
                <Label>Tax Rate (%)</Label>
                <Input
                  type="number"
                  name="taxRate"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.taxRate * 100}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      taxRate: (parseFloat(e.target.value) || 0) / 100,
                    }))
                  }
                  invalid={!!errors.taxRate}
                />
                {errors.taxRate && <FormFeedback>{errors.taxRate}</FormFeedback>}
              </FormGroup>
            </Col>
            <Col md={4}>
              <FormGroup>
                <Label>Currency</Label>
                {currencies?.length > 0 ? (
                  <Input
                    type="select"
                    name="currencyId"
                    value={formData.currencyId}
                    onChange={handleChange}
                    invalid={!!errors.currencyId}
                    required
                  >
                    <option value="">{t('invoices.recurring.selectCurrency')}</option>
                    {currencies.map((currency) => (
                      <option key={currency._id} value={currency._id}>
                        {currency.name} ({currency.code})
                      </option>
                    ))}
                  </Input>
                ) : (
                  <div>
                    <Spinner size="sm" /> Loading currencies...
                  </div>
                )}
                {errors.currencyId && <FormFeedback>{errors.currencyId}</FormFeedback>}
              </FormGroup>
            </Col>
          </Row>

          <h5>Invoice Items</h5>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Description</th>
                <th>Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {formData.items.map((item, index) => (
                <tr key={index}>
                  <td>
                    <Input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, "description", e.target.value)}
                      invalid={errors.items && errors.items[index] && !!errors.items[index].description}
                    />
                    {errors.items && errors.items[index] && errors.items[index].description && (
                      <FormFeedback>{errors.items[index].description}</FormFeedback>
                    )}
                  </td>
                  <td>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.amount}
                      onChange={(e) => handleItemChange(index, "amount", e.target.value)}
                      invalid={errors.items && errors.items[index] && !!errors.items[index].amount}
                    />
                    {errors.items && errors.items[index] && errors.items[index].amount && (
                      <FormFeedback>{errors.items[index].amount}</FormFeedback>
                    )}
                  </td>
                  <td>   <Button
                    color="danger"
                    outline
                    onClick={() => removeItem(index)}
                    disabled={formData.items.length <= 1}
                  >
                    Remove
                  </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Button color="secondary" onClick={addItem} className="mb-3">
            Add Item
          </Button>
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={toggle}>
            Cancel
          </Button>
          <Button color="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Spinner size="sm" /> Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  );
};

export default EditScheduledInvoiceModal;