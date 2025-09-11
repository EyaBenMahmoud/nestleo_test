import React, { useEffect, useState } from 'react';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import { get } from "lodash";
import { useDispatch } from 'react-redux';

// Import the assistant action for setting language
import { setCurrentLanguage, getActiveConfig } from '../../slices/Assistant/assistantConfigSlice';

//i18n
import i18n from "../../i18n";
import languages from "../../common/languages";

const LanguageDropdown = () => {
    const dispatch = useDispatch();
    // Declare a new state variable, which we'll call "menu"
    const [selectedLang, setSelectedLang] = useState("");

    useEffect(() => {
        // Get the current language from i18n (which handles detection automatically)
        const currentLang = i18n.language;
        console.log('🔄 Current i18n language:', currentLang);
        
        setSelectedLang(currentLang);
        
        // Sync the assistant language with the current language
        syncAssistantLanguage(currentLang);
        
        // Listen for language changes from i18n
        const handleLanguageChange = (lng) => {
            console.log('🔄 i18n language changed to:', lng);
            setSelectedLang(lng);
            syncAssistantLanguage(lng);
        };
        
        i18n.on('languageChanged', handleLanguageChange);
        
        // Cleanup listener on unmount
        return () => {
            i18n.off('languageChanged', handleLanguageChange);
        };
    }, []);

// Map i18n language codes to assistant language codes
const mapToAssistantLanguage = (i18nLang) => {
    const baseLang = i18nLang.split('-')[0];   
    console.log(`🗣️ Mapping language from i18n: ${i18nLang} (base: ${baseLang})`); 
    // Special case: 'sp' in i18n should map to 'es' in assistant
    if (i18nLang === 'sp' || baseLang === 'sp') {
        console.log('🇪🇸 Spanish language code (sp) detected! Mapping to es');
        return 'es';
    }
    // Map of supported assistant languages
    const supportedLanguages = {
        'en': 'en',
        'fr': 'fr',
        'es': 'es',
        'it': 'it',
        'sp': 'es'  // Add explicit mapping for sp → es
    };
    
    // Check if this is a Spanish variant
    const isSpanish = baseLang === 'es' || i18nLang.startsWith('es-') || 
                     baseLang === 'sp' || i18nLang.startsWith('sp-');
    
    if (isSpanish) {
        console.log('🇪🇸 Spanish language detected! Mapping to es');
        return 'es';
    }
    
    // Return mapped language or default to 'en' if not supported
    const result = supportedLanguages[baseLang] || 'en';
    console.log(`🔄 Mapped to assistant language: ${result}`);
    return result;
};

    // Sync the assistant language with the selected app language
const syncAssistantLanguage = (lang) => {
    const assistantLang = mapToAssistantLanguage(lang);
    console.log('🤖 Syncing assistant language to:', assistantLang);
    
    // 1. First dispatch language change
    dispatch(setCurrentLanguage(assistantLang));
    
    // 2. Get the config for this language 
    dispatch(getActiveConfig(assistantLang));
    
    // 3. Add a custom action to reset the chat (with console debugging)
    console.log(`🔄 Resetting assistant chat to language: ${assistantLang}`);
    
    // Use setTimeout to ensure the language change happens first
    setTimeout(() => {
        // Force reset chat history
        dispatch({
            type: 'assistant/resetState',
            payload: {
                language: assistantLang,
                forceReset: true
            }
        });
    }, 100);
};

    const changeLanguageAction = lang => {
        console.log('🔄 Changing language to:', lang);
        //set language as i18n
        i18n.changeLanguage(lang);
        localStorage.setItem("I18N_LANGUAGE", lang);
        setSelectedLang(lang);
        
        // Also update the assistant language whenever app language changes
        syncAssistantLanguage(lang);
    };

    const [isLanguageDropdown, setIsLanguageDropdown] = useState(false);
    const toggleLanguageDropdown = () => {
        setIsLanguageDropdown(!isLanguageDropdown);
    };
    
    return (
        <React.Fragment>
            <Dropdown isOpen={isLanguageDropdown} toggle={toggleLanguageDropdown} className="ms-1 topbar-head-dropdown header-item">
                <DropdownToggle className="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle" tag="button">
                    <img
                        src={get(languages, `${selectedLang}.flag`)}
                        alt="Header Language"
                        height="20"
                        className="rounded"
                    />
                </DropdownToggle>
                <DropdownMenu className="notify-item language py-2">
                    {Object.keys(languages).map(key => (
                        <DropdownItem
                            key={key}
                            onClick={() => changeLanguageAction(key)}
                            className={`notify-item ${selectedLang === key ? "active" : "none"
                                }`}
                        >
                            <img
                                src={get(languages, `${key}.flag`)}
                                alt="Skote"
                                className="me-2 rounded"
                                height="18"
                            />
                            <span className="align-middle">
                                {get(languages, `${key}.label`)}
                            </span>
                        </DropdownItem>
                    ))}
                </DropdownMenu>
            </Dropdown>
        </React.Fragment>
    );
};

export default LanguageDropdown;