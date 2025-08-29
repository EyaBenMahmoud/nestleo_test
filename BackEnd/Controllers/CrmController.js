const CRM = require("../Models/Crm");

// Get CRM settings and respond with JSON
const getCRMSettings = async (req, res) => {
    try {
        const settings = await CRM.findOne();
        if (!settings) {
            // Create default CRM settings if none exist
            const newSettings = new CRM();
            await newSettings.save();
            return res.status(200).json(newSettings);
        }
        res.status(200).json(settings);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
};

// Update CRM settings with provided values
const updateCRMSettings = async (req, res) => {
    const { WebsiteUrl, phoneNumber, address, email, socialMedia } = req.body;
    try {
        const updates = { WebsiteUrl, phoneNumber, address, email, socialMedia };
        const settings = await CRM.findOneAndUpdate({}, updates, { new: true });
        res.status(200).json(settings);
    } catch (error) {
        res.status(500).json({ error: "Failed to update CRM settings", details: error });
    }
};

// Get a specific policy with language parameter
const getPolicy = async (req, res) => {
    const { policyType } = req.params;
    // Get language from query parameter, default to 'en'
    const lang = req.query.lang || 'en';
    
    try {
        const settings = await CRM.findOne();
        if (!settings || !settings.policies || !settings.policies[policyType]) {
            return res.status(404).json({ error: "Policy not found" });
        }
        
        // Try to get the policy in the requested language
        if (settings.policies[policyType][lang] && settings.policies[policyType][lang].content) {
            return res.status(200).json({
                content: settings.policies[policyType][lang].content,
                lastUpdated: settings.policies[policyType][lang].lastUpdated,
                language: lang
            });
        }
        
        // Fall back to English if the requested language is not available
        if (settings.policies[policyType].en && settings.policies[policyType].en.content) {
            return res.status(200).json({
                content: settings.policies[policyType].en.content,
                lastUpdated: settings.policies[policyType].en.lastUpdated,
                language: 'en',
                fallback: true // Indicate that this is a fallback
            });
        }
        
        return res.status(404).json({ error: "Policy content not found" });
    } catch (error) {
        console.error("Error retrieving policy:", error);
        res.status(500).json({ error: "Failed to retrieve policy", details: error.message });
    }
};

// Update a specific policy with language parameter
const updatePolicy = async (req, res) => {
    const { policyType } = req.params;
    const { content, language } = req.body;
    
    if (!content) {
        return res.status(400).json({ error: "Policy content is required" });
    }
    
    // Default to English if no language specified
    const lang = language || 'en';
    
    try {
        // Get current settings to check if language structure exists
        const settings = await CRM.findOne();
        if (!settings) {
            return res.status(404).json({ error: "CRM settings not found" });
        }
        
        // Check if the language structure exists for this policy
        const hasLanguage = settings.policies[policyType] && 
                          settings.policies[policyType][lang];
        
        let updatedSettings;
        
        if (!hasLanguage) {
            // Language doesn't exist yet - create it first with empty content
            const initUpdate = {};
            initUpdate[`policies.${policyType}.${lang}`] = {
                content: '',
                lastUpdated: new Date()
            };
            
            // Initialize language structure
            await CRM.findOneAndUpdate({}, { $set: initUpdate }, { new: true });
        }
        
        // Now update the content
        const update = {};
        update[`policies.${policyType}.${lang}.content`] = content;
        update[`policies.${policyType}.${lang}.lastUpdated`] = new Date();
        
        // Add language to supported languages if not already there
        if (!settings.supportedLanguages.includes(lang)) {
            update.supportedLanguages = [...settings.supportedLanguages, lang];
        }
        
        updatedSettings = await CRM.findOneAndUpdate({}, { $set: update }, { new: true });
        
        if (!updatedSettings) {
            return res.status(404).json({ error: "CRM settings not found" });
        }
        
        res.status(200).json({
            content: updatedSettings.policies[policyType][lang].content,
            lastUpdated: updatedSettings.policies[policyType][lang].lastUpdated,
            language: lang
        });
    } catch (error) {
        console.error("Error updating policy:", error);
        res.status(500).json({ error: "Failed to update policy", details: error.message });
    }
};

// Get supported languages
const getSupportedLanguages = async (req, res) => {
    try {
        const settings = await CRM.findOne();
        if (!settings) {
            return res.status(404).json({ error: "CRM settings not found" });
        }
        
        res.status(200).json({ languages: settings.supportedLanguages });
    } catch (error) {
        res.status(500).json({ error: "Failed to retrieve supported languages", details: error });
    }
};

// Add a new language
const addLanguage = async (req, res) => {
    const { language } = req.body;
    
    if (!language) {
        return res.status(400).json({ error: "Language code is required" });
    }
    
    try {
        // Find the CRM settings
        const settings = await CRM.findOne();
        if (!settings) {
            return res.status(404).json({ error: "CRM settings not found" });
        }
        
        // Check if language already exists
        if (settings.supportedLanguages.includes(language)) {
            return res.status(400).json({ error: "Language already supported" });
        }
        
        // Add language to supported languages
        settings.supportedLanguages.push(language);
        await settings.save();
        
        res.status(200).json({ 
            message: "Language added successfully",
            languages: settings.supportedLanguages
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to add language", details: error });
    }
};

// Remove a language
const removeLanguage = async (req, res) => {
    const { language } = req.body;
    
    if (!language) {
        return res.status(400).json({ error: "Language code is required" });
    }
    
    // Can't remove English
    if (language === 'en') {
        return res.status(400).json({ error: "Cannot remove default language (English)" });
    }
    
    try {
        // Find the CRM settings
        const settings = await CRM.findOne();
        if (!settings) {
            return res.status(404).json({ error: "CRM settings not found" });
        }
        
        // Check if language exists
        if (!settings.supportedLanguages.includes(language)) {
            return res.status(400).json({ error: "Language not found in supported languages" });
        }
        
        // Remove language from supported languages
        settings.supportedLanguages = settings.supportedLanguages.filter(lang => lang !== language);
        await settings.save();
        
        res.status(200).json({ 
            message: "Language removed successfully",
            languages: settings.supportedLanguages
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to remove language", details: error });
    }
};

module.exports = {
    getCRMSettings,
    updateCRMSettings,
    getPolicy,
    updatePolicy,
    getSupportedLanguages,
    addLanguage,
    removeLanguage
};