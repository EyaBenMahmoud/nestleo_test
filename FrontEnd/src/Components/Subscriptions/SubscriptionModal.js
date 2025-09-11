import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalHeader, ModalBody, Form, Button, Input, FormFeedback, Alert } from 'reactstrap';
import { createSubscription, updateSubscription, getSubscriptionsfront } from '../../services/subscriptionservice';
import { Link } from 'react-router-dom';
import { getStorageFeatureName, useSubscriptionTranslations } from '../../utils/subscriptionTranslations';

// Language options for subscription creation
const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'sp', label: 'Español' },
  { value: 'it', label: 'Italiano' }
];

// Predefined features with default values for each subscription type
// Note: These are stored in French as the canonical format, but displayed translated
const PREDEFINED_FEATURES = [
  {
    id: 'numBuildings',
    name: 'Nombre d\'immeubles',
    type: 'number',
    defaultValues: {
      'Découverte': 1,
      'Pro': 5,
      'Expert': -1 // -1 represents unlimited
    }
  },
  {
    id: 'apartmentsPerBuilding',
    name: 'Appartements par immeuble',
    type: 'number',
    defaultValues: {
      'Découverte': 5,
      'Pro': 100,
      'Expert': -1
    }
  },
  {
    id: 'documentSize',
    name: 'Partage de documents (Mo)',
    type: 'number',
    defaultValues: {
      'Découverte': 5,
      'Pro': 50,
      'Expert': 100
    }
  },
  {
    id: 'monthlyInvoices',
    name: 'Factures ',
    type: 'number',
    defaultValues: {
      'Découverte': 1,
      'Pro': 50,
      'Expert': -1
    }
  },
  {
    id: 'scheduledInvoices',
    name: 'Factures récurrentes',
    type: 'number',
    defaultValues: {
      'Découverte': 2,
      'Pro': 5,
      'Expert': -1
    }
  },
  {
    id: 'taskManagement',
    name: 'Worker Pack',
    type: 'boolean',
    defaultValues: {
      'Découverte': 0,
      'Pro': 1,
      'Expert': 1
    }
  },
  {
    id: 'gamification',
    name: 'Système de gamification',
    type: 'boolean',
    defaultValues: {
      'Découverte': false,
      'Pro': true,
      'Expert': true
    }
  },
  {
    id: 'videoConference',
    name: 'Conférence vidéo (minutes)',
    type: 'number',
    defaultValues: {
      'Découverte': 30,
      'Pro': 180,
      'Expert': -1
    }
  }
];

const SubscriptionModal = ({ isOpen, toggle, subscription, onSave, onClose }) => {
  const { t } = useTranslation();
  const { translateFeatureName } = useSubscriptionTranslations();
  
  const [formData, setFormData] = useState({
    subscriptionType: '',
    description: '',
    price: '',
    interval: '',
    language: localStorage.getItem("I18N_LANGUAGE") || 'en',
    features: []
  });

  const [errors, setErrors] = useState({
    subscriptionType: '',
    description: '',
    price: '',
    interval: '',
    language: '',
    features: '',
    freeSubscription: ''
  });

  const [successModal, setSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Added');
  const [customFeatures, setCustomFeatures] = useState([
    { name: '', isActive: true }
  ]);

  useEffect(() => {
    if (subscription) {
      console.log('Initializing with subscription:', subscription);
      console.log('Existing features:', subscription.features);

      const { mappedFeatures, extractedCustomFeatures } = processExistingFeatures(subscription.features);
      console.log('Mapped features:', mappedFeatures);
      console.log('Custom features:', extractedCustomFeatures);

      setFormData({
        subscriptionType: subscription.subscriptionType,
        description: subscription.description,
        price: subscription.price.toString(),
        interval: subscription.interval || '',
        language: subscription.language || 'en',
        features: mappedFeatures
      });
      
      if (extractedCustomFeatures.length > 0) {
        setCustomFeatures(extractedCustomFeatures);
      } else {
        setCustomFeatures([{ name: '', isActive: true }]);
      }
    } else {
      setFormData({
        subscriptionType: '',
        description: '',
        price: '',
        interval: '',
        language: localStorage.getItem("I18N_LANGUAGE") || 'en',
        features: initializeDefaultFeatures()
      });
      setCustomFeatures([{ name: '', isActive: true }]);
    }
    setErrors({});
  }, [subscription, isOpen]);

  const processExistingFeatures = (existingFeatures) => {
    const mappedFeatures = initializeDefaultFeatures();
    const extractedCustomFeatures = [];

    existingFeatures.forEach(existingFeature => {
      // Check if it's a custom feature (not predefined)
      if (existingFeature.metadata && existingFeature.metadata.isPredefined === false) {
        extractedCustomFeatures.push({
          name: existingFeature.name,
          isActive: existingFeature.isActive
        });
        return;
      }
      
      // For predefined features, use metadata.id if available for accurate matching
      if (existingFeature.metadata && existingFeature.metadata.id) {
        const index = mappedFeatures.findIndex(f => f.id === existingFeature.metadata.id);
        if (index !== -1) {
          mappedFeatures[index] = {
            ...mappedFeatures[index],
            value: existingFeature.metadata.value !== undefined ? existingFeature.metadata.value : 0,
            isActive: existingFeature.isActive
          };
          return;
        }
      }

      // Fallback: try to match by feature name (improved logic)
      const baseFeatureName = existingFeature.name.split(':')[0].trim();
      const predefinedFeature = PREDEFINED_FEATURES.find(pf => {
        // Use getStorageFeatureName to get the canonical French name for comparison
        const canonicalName = getStorageFeatureName(pf.id);
        return baseFeatureName === canonicalName || 
               baseFeatureName === pf.name ||
               canonicalName === pf.name;
      });

      if (predefinedFeature) {
        const index = mappedFeatures.findIndex(f => f.id === predefinedFeature.id);
        if (index !== -1) {
          let value = 0;

          // Try to get value from metadata first
          if (existingFeature.metadata && existingFeature.metadata.value !== undefined) {
            value = existingFeature.metadata.value;
          } else {
            // Extract value from feature name as fallback
            const valueMatch = existingFeature.name.match(/:\s*(\d+|Illimité|Unlimited)/i);
            if (valueMatch) {
              if (valueMatch[1].toLowerCase() === 'illimité' || valueMatch[1].toLowerCase() === 'unlimited') {
                value = -1;
              } else {
                value = parseInt(valueMatch[1], 10);
              }
              console.log(`Extracted value from name ${existingFeature.name}: ${value}`);
            }
          }

          mappedFeatures[index] = {
            ...mappedFeatures[index],
            value: value,
            isActive: existingFeature.isActive
          };
        }
      } else {
        // If no predefined feature match found, treat as custom feature
        extractedCustomFeatures.push({
          name: existingFeature.name,
          isActive: existingFeature.isActive
        });
      }
    });

    return { mappedFeatures, extractedCustomFeatures };
  };

  const initializeDefaultFeatures = () => {
    return PREDEFINED_FEATURES.map(feature => ({
      id: feature.id,
      name: feature.name,
      value: -1,
      isActive: true
    }));
  };

  const handleCustomFeatureChange = (index, e) => {
    const { name, value, type, checked } = e.target;
    const updatedFeatures = [...customFeatures];

    if (type === 'checkbox') {
      updatedFeatures[index].isActive = checked;
    } else {
      updatedFeatures[index].name = value;
    }

    setCustomFeatures(updatedFeatures);
  };

  const addCustomFeature = () => {
    setCustomFeatures([...customFeatures, { name: '', isActive: true }]);
  };

  const removeCustomFeature = (index) => {
    if (customFeatures.length === 1) {
      setCustomFeatures([{ name: '', isActive: true }]);
      return;
    }

    const updatedFeatures = [...customFeatures];
    updatedFeatures.splice(index, 1);
    setCustomFeatures(updatedFeatures);
  };

  const mapExistingFeaturesToPredefined = (existingFeatures) => {
    const mappedFeatures = [...initializeDefaultFeatures()];

    existingFeatures.forEach(existingFeature => {
      // For predefined features, use metadata.id if available for accurate matching
      if (existingFeature.metadata && existingFeature.metadata.id) {
        const index = mappedFeatures.findIndex(f => f.id === existingFeature.metadata.id);
        if (index !== -1) {
          mappedFeatures[index] = {
            ...mappedFeatures[index],
            value: existingFeature.metadata.value !== undefined ? existingFeature.metadata.value : 0,
            isActive: existingFeature.isActive
          };
          return;
        }
      }

      // Fallback: try to match by feature name (improved logic)
      const baseFeatureName = existingFeature.name.split(':')[0].trim();
      const predefinedFeature = PREDEFINED_FEATURES.find(pf => {
        // Use getStorageFeatureName to get the canonical French name for comparison
        const canonicalName = getStorageFeatureName(pf.id);
        return baseFeatureName === canonicalName || 
               baseFeatureName === pf.name ||
               canonicalName === pf.name;
      });

      if (predefinedFeature) {
        const index = mappedFeatures.findIndex(f => f.id === predefinedFeature.id);
        if (index !== -1) {
          let value = 0;

          // Try to get value from metadata first
          if (existingFeature.metadata && existingFeature.metadata.value !== undefined) {
            value = existingFeature.metadata.value;
          } else {
            // Extract value from feature name as fallback
            const valueMatch = existingFeature.name.match(/:\s*(\d+|Illimité|Unlimited)/i);
            if (valueMatch) {
              if (valueMatch[1].toLowerCase() === 'illimité' || valueMatch[1].toLowerCase() === 'unlimited') {
                value = -1;
              } else {
                value = parseInt(valueMatch[1], 10);
              }
              console.log(`Extracted value from name ${existingFeature.name}: ${value}`);
            }
          }

          mappedFeatures[index] = {
            ...mappedFeatures[index],
            value: value,
            isActive: existingFeature.isActive
          };
        }
      }
    });

    return mappedFeatures;
  };

  const validateForm = async () => {
    const newErrors = {};
    const priceValue = parseFloat(formData.price);

    if (!formData.subscriptionType.trim()) {
      newErrors.subscriptionType = t('subscriptions.validation.subscriptionTypeRequired');
    }

    if (!formData.description.trim()) {
      newErrors.description = t('subscriptions.validation.descriptionRequired');
    }

    if (formData.price === '' || formData.price === null || formData.price === undefined) {
      newErrors.price = t('subscriptions.validation.priceRequired');
    } else if (isNaN(priceValue)) {
      newErrors.price = t('subscriptions.validation.invalidPriceFormat');
    } else if (priceValue < 0) {
      newErrors.price = t('subscriptions.validation.priceGreaterThanOrEqualZero') || 'Le prix doit être supérieur ou égal à 0';
    }

    if (parseFloat(formData.price) !== 0 && !formData.interval) {
      newErrors.interval = t('subscriptions.validation.intervalRequired');
    }

    // Check for existing free subscription only when creating a new subscription
    if (!subscription && priceValue === 0) {
      try {
        const response = await getSubscriptionsfront(formData.language);
        const subscriptions = response.data?.subscriptions || response.subscriptions || [];
        const hasFreeSubscription = subscriptions.some(sub => 
          parseFloat(sub.price) === 0
        );
        if (hasFreeSubscription) {
          newErrors.freeSubscription = t('subscriptions.validation.freeSubscriptionExists') || 'A free subscription already exists for this language';
        }
      } catch (error) {
        console.error('Error checking existing subscriptions:', error);
        newErrors.freeSubscription = t('subscriptions.validation.errorCheckingSubscriptions') || 'Error checking existing subscriptions';
      }
    }

    const invalidFeatures = formData.features.filter(feature =>
      feature.isActive && (isNaN(feature.value) || feature.value < -1)
    );

    if (invalidFeatures.length > 0) {
      newErrors.features = t('subscriptions.validation.featureValuesInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name] || (name === 'price' || name === 'language') && errors.freeSubscription) {
      setErrors(prev => ({ ...prev, [name]: '', freeSubscription: '' }));
    }
  };

  const handleFeatureChange = (index, e) => {
    const { name, value, type, checked } = e.target;
    const updatedFeatures = [...formData.features];

    if (type === 'checkbox') {
      updatedFeatures[index].isActive = checked;
    } else if (name === 'value') {
      console.log(`Feature value changed for index ${index}: ${value}`);

      if (value === t('subscriptions.unlimited') || value === 'Illimité') {
        updatedFeatures[index].value = -1;
      } else {
        const cleanValue = value.replace(/\s*Mo\s*$/i, '');
        const numValue = parseInt(cleanValue, 10);
        updatedFeatures[index].value = isNaN(numValue) ? -1 : numValue;
      }
    }

    setFormData(prev => ({
      ...prev,
      features: updatedFeatures
    }));
  };

  const formatFeaturesForSubmission = (predefinedFeatures) => {
    const formattedPredefinedFeatures = predefinedFeatures.map(feature => {
      const storageFeatureName = getStorageFeatureName(feature.id);
      
      let displayName = storageFeatureName;
      if (feature.value === -1) {
        displayName = `${storageFeatureName}: ${t('subscriptions.unlimited')}`;
      } else {
        displayName = `${storageFeatureName}: ${feature.value}`;
      }

      return {
        name: displayName,
        isActive: feature.isActive,
        metadata: {
          id: feature.id,
          value: feature.value,
          isPredefined: true
        }
      };
    });
    
    const formattedCustomFeatures = customFeatures
      .filter(feature => feature.name.trim() !== '')
      .map(feature => ({
        name: feature.name,
        isActive: feature.isActive,
        metadata: {
          isPredefined: false
        }
      }));
    
    return [...formattedPredefinedFeatures, ...formattedCustomFeatures];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isValid = await validateForm();
    if (!isValid) {
      return;
    }

    try {
      const submissionData = {
        subscriptionType: formData.subscriptionType,
        description: formData.description,
        price: parseFloat(formData.price),
        interval: formData.interval,
        language: formData.language,
        features: formatFeaturesForSubmission(formData.features)
      };

      if (subscription) {
        await updateSubscription(subscription._id, submissionData);
        setSuccessModal(true);
        setSuccessMessage(t('subscriptions.updated'));
      } else {
        await createSubscription(submissionData);
        setSuccessModal(true);
        setSuccessMessage(t('subscriptions.added'));
      }
      onSave();
      if (onClose) {
        onClose();
      }
      toggle();
    } catch (error) {
      console.error('Error saving subscription:', error);
      setErrors(prev => ({
        ...prev,
        freeSubscription: t('subscriptions.validation.errorSavingSubscription') || 'Error saving subscription'
      }));
    }
  };

  const getValueDisplay = (value) => {
    if (value === -1 || value === '-1') {
      return t('subscriptions.unlimited');
    }
    if (value === 0 || value === '0') {
      return "0";
    }
    return value.toString();
  };

  const getFeatureOptions = (featureId) => {
    switch (featureId) {
      case 'numBuildings':
        return [
          <option key="unlimited" value={-1}>{t('subscriptions.unlimited')}</option>,
          <option key="1" value="1">1</option>,
          <option key="5" value="5">5</option>,
          <option key="10" value="10">10</option>,
          <option key="20" value="20">20</option>
        ];

      case 'apartmentsPerBuilding':
        return [
          <option key="unlimited" value={-1}>{t('subscriptions.unlimited')}</option>,
          <option key="5" value="5">5</option>,
          <option key="10" value="10">10</option>,
          <option key="50" value="50">50</option>,
          <option key="100" value="100">100</option>,
          <option key="200" value="200">200</option>
        ];

      case 'documentSize':
        return [
          <option key="unlimited" value={-1}>{t('subscriptions.unlimited')}</option>,
          <option key="5" value="5">5 {t('subscriptions.mb')}</option>,
          <option key="10" value="10">10 {t('subscriptions.mb')}</option>,
          <option key="50" value="50">50 {t('subscriptions.mb')}</option>,
          <option key="100" value="100">100 {t('subscriptions.mb')}</option>
        ];

      case 'monthlyInvoices':
        return [
          <option key="unlimited" value={-1}>{t('subscriptions.unlimited')}</option>,
          <option key="1" value="1">1</option>,
          <option key="2" value="2">2</option>,
          <option key="5" value="5">5</option>,
          <option key="10" value="10">10</option>,
          <option key="20" value="20">20</option>,
          <option key="50" value="50">50</option>,
        ];

      case 'scheduledInvoices':
        return [
          <option key="unlimited" value={-1}>{t('subscriptions.unlimited')}</option>,
          <option key="2" value="2">2</option>,
          <option key="5" value="5">5</option>,
          <option key="10" value="10">10</option>,
          <option key="20" value="20">20</option>
        ];

      default:
        return [<option key="unlimited" value={-1}>{t('subscriptions.unlimited')}</option>];
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} toggle={toggle} onClosed={onClose}>
        <ModalHeader toggle={toggle}>
          {subscription ? t('subscriptions.editSubscription') : t('subscriptions.addSubscription')}
        </ModalHeader>
        <ModalBody>
          <Form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label>{t('subscriptions.subscriptionType')}</label>
              <Input
                type="text"
                name="subscriptionType"
                value={formData.subscriptionType}
                onChange={handleChange}
                invalid={!!errors.subscriptionType}
              />
              <FormFeedback>{errors.subscriptionType}</FormFeedback>
            </div>

            <div className="mb-3">
              <label>{t('subscriptions.description')}</label>
              <Input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                invalid={!!errors.description}
              />
              <FormFeedback>{errors.description}</FormFeedback>
            </div>

            <div className="mb-3">
              <label>{t('subscriptions.language')}</label>
              <Input
                type="select"
                name="language"
                value={formData.language}
                onChange={handleChange}
                invalid={!!errors.language}
              >
                {LANGUAGE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Input>
              <FormFeedback>{errors.language}</FormFeedback>
            </div>

            <div className="mb-3">
              <label>{t('subscriptions.price')}</label>
              <Input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                min="0"
                step="0.01"
                invalid={!!errors.price}
              />
              <FormFeedback>{errors.price}</FormFeedback>
            </div>

            <div className="mb-3">
              <label>{t('subscriptions.interval')}</label>
              <Input
                type="select"
                name="interval"
                value={formData.interval}
                onChange={handleChange}
                invalid={!!errors.interval}
                disabled={parseFloat(formData.price) === 0}
              >
                <option value="">{t('subscriptions.selectInterval')}</option>
                <option value="month">{t('subscriptions.intervals.month')}</option>
                <option value="year">{t('subscriptions.intervals.year')}</option>
              </Input>
              <FormFeedback>{errors.interval}</FormFeedback>
            </div>

            <div className="mb-3">
              <label>{t('subscriptions.features')}</label>
              {formData.features.map((feature, index) => (
                <div key={index} className="d-flex justify-content-between align-items-center mb-2 border-bottom pb-2">
                  <div className="d-flex align-items-center">
                    <Input
                      type="checkbox"
                      name="isActive"
                      checked={feature.isActive}
                      onChange={(e) => handleFeatureChange(index, e)}
                      className="me-2"
                    />
                    <span className="me-2">{translateFeatureName(feature.name)}</span>
                  </div>
                  <div className="d-flex align-items-center">
                    {(() => {
                      const predefined = PREDEFINED_FEATURES.find(f => f.id === feature.id);
                      if (predefined && predefined.type === 'number') {
                        return (
                          <Input
                            type="number"
                            name="value"
                            value={feature.value === -1 ? '' : feature.value}
                            onChange={(e) => handleFeatureChange(index, e)}
                            disabled={!feature.isActive}
                            invalid={!!errors.features}
                            className="me-2"
                            style={{ width: '120px' }}
                            placeholder={t('subscriptions.unlimited')}
                            min="-1"
                          />
                        );
                      } else if (predefined && predefined.type === 'boolean') {
                        return (
                          <span className="ms-2">{feature.isActive ? t('subscriptions.enabled') : t('subscriptions.disabled')}</span>
                        );
                      } else {
                        return null;
                      }
                    })()}
                  </div>
                </div>
              ))}
              <FormFeedback>{errors.features}</FormFeedback>
            </div>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <label className="mb-0">{t('subscriptions.additionalFeatures')}</label>
              <Button
                color="light"
                size="sm"
                onClick={addCustomFeature}
                type="button"
              >
                <i className="ri-add-line"></i> {t('subscriptions.addFeature')}
              </Button>
            </div>
            {customFeatures.map((feature, index) => (
              <div key={`custom-${index}`} className="d-flex justify-content-between align-items-center mb-2 border-bottom pb-2">
                <div className="d-flex align-items-center flex-grow-1">
                  <Input
                    type="checkbox"
                    checked={feature.isActive}
                    onChange={(e) => handleCustomFeatureChange(index, e)}
                    className="me-2"
                  />
                  <Input
                    type="text"
                    value={feature.name}
                    onChange={(e) => handleCustomFeatureChange(index, e)}
                    placeholder={t('subscriptions.enterFeatureName')}
                    className="me-2"
                  />
                </div>
                <Button
                  color="light"
                  size="sm"
                  onClick={() => removeCustomFeature(index)}
                  type="button"
                >
                  <i className="ri-delete-bin-line"></i>
                </Button>
              </div>
            ))}
            {customFeatures.length === 0 && (
              <div className="text-center text-muted py-3">
                <p>{t('subscriptions.noAdditionalFeatures')}</p>
              </div>
            )}
            {errors.freeSubscription && (
              <Alert color="danger" className="mb-3">
                {errors.freeSubscription}
              </Alert>
            )}
            <div className="d-flex justify-content-end gap-2">
              <Button color="secondary" onClick={toggle}>{t('Common.cancel')}</Button>
              <Button color="primary" type="submit" disabled={!!errors.freeSubscription}>
                {subscription ? t('Common.update') : t('Common.save')}
              </Button>
            </div>
          </Form>
        </ModalBody>
      </Modal>

      <Modal isOpen={successModal} toggle={() => setSuccessModal(false)} centered>
        <ModalBody className='text-center p-5'>
          <div className="text-end">
            <button type="button" onClick={() => setSuccessModal(false)} className="btn-close text-end" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="mt-2">
            <lord-icon src="https://cdn.lordicon.com/tqywkdcz.json" trigger="hover" style={{ width: "150px", height: "150px" }}></lord-icon>
            <h4 className="mb-3 mt-4">{t('subscriptions.subscriptionActionSuccess', { action: successMessage })}</h4>
            <p className="text-muted fs-15 mb-4">{t('subscriptions.subscriptionActionDescription', { action: successMessage.toLowerCase() })}</p>
            <div className="hstack gap-2 justify-content-center">
              <button className="btn btn-primary" onClick={() => setSuccessModal(false)}>{t('Common.close')}</button>
            </div>
          </div>
        </ModalBody>
      </Modal>
    </>
  );
};

export default SubscriptionModal;