import { useTranslation } from 'react-i18next';

// Feature translation mapping - stores features in their original French format but displays them translated
export const FEATURE_TRANSLATION_MAP = {
  // Original French feature names (as stored in DB) mapped to translation keys
  "Nombre d'immeubles": "subscriptions.featureNames.numBuildings",
  "Appartements par immeuble": "subscriptions.featureNames.apartmentsPerBuilding", 
  "Partage de documents": "subscriptions.featureNames.documentSize",
  "Partage de documents (Mo)": "subscriptions.featureNames.documentSize",
  "Factures": "subscriptions.featureNames.monthlyInvoices",
  "Factures mensuelles": "subscriptions.featureNames.monthlyInvoices",
  "Factures récurrentes": "subscriptions.featureNames.scheduledInvoices",
  "Worker Pack": "subscriptions.featureNames.taskManagement",
  "Pack Ouvrier": "subscriptions.featureNames.taskManagement",
  "Système de gamification": "subscriptions.featureNames.gamification",
  "Conférence vidéo": "subscriptions.featureNames.videoConference",
  "Conférence vidéo (minutes)": "subscriptions.featureNames.videoConference",
  // Add english versions that might be stored
  "Document sharing": "subscriptions.featureNames.documentSize",
  "Document sharing (MB)": "subscriptions.featureNames.documentSize",
  "Video Conference": "subscriptions.featureNames.videoConference",
  "Video Conference (minutes)": "subscriptions.featureNames.videoConference"
};

// Subscription type translation mapping
export const SUBSCRIPTION_TYPE_TRANSLATION_MAP = {
  "Découverte": "subscriptions.types.Découverte",
  "Pro": "subscriptions.types.Pro", 
  "Expert": "subscriptions.types.Expert"
};

// Interval translation mapping
export const INTERVAL_TRANSLATION_MAP = {
  "month": "subscriptions.intervals.month",
  "year": "subscriptions.intervals.year"
};

/**
 * Translates a feature name to the current language
 * @param {string} featureName - The original feature name (French)
 * @param {function} t - The translation function from useTranslation
 * @returns {string} - The translated feature name
 */
export const translateFeatureName = (featureName, t) => {
  // Extract the base feature name (before the colon if it exists)
  const baseFeatureName = featureName.split(':')[0].trim();
  
  // First try to find exact match
  let translationKey = FEATURE_TRANSLATION_MAP[baseFeatureName];
  
  // If no exact match, try to find partial matches for features with units
  if (!translationKey) {
    // Try to match patterns like "Partage de documents" in "Partage de documents (Mo)"
    const matchingKey = Object.keys(FEATURE_TRANSLATION_MAP).find(key => {
      // Remove units from both strings for comparison
      const normalizedKey = key.replace(/\s*\([^)]*\)\s*$/, '').trim();
      const normalizedFeature = baseFeatureName.replace(/\s*\([^)]*\)\s*$/, '').trim();
      return normalizedKey === normalizedFeature;
    });
    
    if (matchingKey) {
      translationKey = FEATURE_TRANSLATION_MAP[matchingKey];
    }
  }
  
  if (translationKey) {
    const translatedName = t(translationKey);
    
    // If the original feature had a value (e.g., "Nombre d'immeubles: 5"), 
    // preserve the value part
    if (featureName.includes(':')) {
      const valuePart = featureName.split(':')[1];
      return `${translatedName}:${valuePart}`;
    }
    
    return translatedName;
  }
  
  // Return original name if no translation found
  return featureName;
};

/**
 * Translates subscription type to current language
 * @param {string} subscriptionType - The subscription type
 * @param {function} t - The translation function
 * @returns {string} - Translated subscription type
 */
export const translateSubscriptionType = (subscriptionType, t) => {
  const translationKey = SUBSCRIPTION_TYPE_TRANSLATION_MAP[subscriptionType];
  return translationKey ? t(translationKey) : subscriptionType;
};

/**
 * Translates interval to current language  
 * @param {string} interval - The interval
 * @param {function} t - The translation function
 * @returns {string} - Translated interval
 */
export const translateInterval = (interval, t) => {
  const translationKey = INTERVAL_TRANSLATION_MAP[interval];
  return translationKey ? t(translationKey) : interval;
};

/**
 * Custom hook for subscription translations
 */
export const useSubscriptionTranslations = () => {
  const { t } = useTranslation();
  
  return {
    translateFeatureName: (featureName) => translateFeatureName(featureName, t),
    translateSubscriptionType: (subscriptionType) => translateSubscriptionType(subscriptionType, t),
    translateInterval: (interval) => translateInterval(interval, t),
    t
  };
};

/**
 * Gets the feature name to store in the database (always in French)
 * @param {string} featureId - The feature ID from PREDEFINED_FEATURES
 * @returns {string} - The French feature name to store in DB
 */
export const getStorageFeatureName = (featureId) => {
  const featureMap = {
    'numBuildings': "Nombre d'immeubles",
    'apartmentsPerBuilding': "Appartements par immeuble", 
    'documentSize': "Partage de documents",
    'monthlyInvoices': "Factures",
    'scheduledInvoices': "Factures récurrentes",
    'taskManagement': "Worker Pack",
    'gamification': "Système de gamification",
    'videoConference': "Conférence vidéo"
  };
  
  return featureMap[featureId] || featureId;
};
