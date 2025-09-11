import i18n from "i18next";
import detector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import translationGr from "./locales/gr.json";
import translationIT from "./locales/it.json";
import translationRS from "./locales/ru.json";
import translationSP from "./locales/sp.json";
import translationENG from "./locales/en.json";
import translationCN from "./locales/ch.json";
import translationFR from "./locales/fr.json";

// the translations
const resources = {
  it: {
    translation: translationIT,
  },
  sp: {
    translation: translationSP,
  },
  en: {
    translation: translationENG,
  },
  fr: {
    translation: translationFR,
  },
};

// Don't force set language to "en" - let the language detector handle it
const language = localStorage.getItem("I18N_LANGUAGE");

i18n
  .use(detector)
  .use(initReactI18next)
  .init({
    resources,
    // Only use stored language if it exists, otherwise let detector handle it
    lng: language || undefined, // Let detector handle language detection if no stored language
    fallbackLng: "en",
    
    // Configure the language detector
    detection: {
      // Order of detection methods
      order: ['localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
      
      // Keys to look for in localStorage
      lookupLocalStorage: 'I18N_LANGUAGE',
      
      // Cache the detected language in localStorage
      caches: ['localStorage'],
      
      // Don't convert language codes (let our app handle the mapping)
      convertDetectedLanguage: (lng) => {
        console.log('🔍 Language detector found:', lng);
        
        // Map browser language codes to our supported languages
        const langCode = lng.toLowerCase().split('-')[0];
        
        // Map of browser language codes to our app language codes  
        const languageMapping = {
          'es': 'sp', // Spanish -> sp (our app uses 'sp' for Spanish)
          'it': 'it', // Italian 
          'fr': 'fr', // French
          'en': 'en', // English
        };
        
        const mappedLang = languageMapping[langCode] || 'en';
        console.log(`🗺️ Mapped ${lng} -> ${mappedLang}`);
        
        return mappedLang;
      }
    },
    
    // This is important - allows using dot notation in translation keys
    keySeparator: ".", 
    
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    
    // CRITICAL: This ensures components re-render when language changes
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged',
      bindI18nStore: '',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i'],
      skipTransRenderRoot: false
    }
  });

// Add language change event listener for debugging
i18n.on('languageChanged', (lng) => {
  console.log(`Language changed to: ${lng}`);
  
  // Handle RTL for Arabic
  if (lng === 'ar') {
    document.documentElement.dir = 'rtl';
    document.body.classList.add('rtl-mode');
  } else {
    document.documentElement.dir = 'ltr';
    document.body.classList.remove('rtl-mode');
  }
});

export default i18n;