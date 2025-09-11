const express = require('express');
const router = express.Router();
const { 
    getCRMSettings, 
    updateCRMSettings, 
    getPolicy, 
    updatePolicy,
    getSupportedLanguages,
    addLanguage,
    removeLanguage
} = require('../Controllers/CrmController');
const { protect } = require('../Middlewares/AuthMiddleware');
const restrictTo = require('../Middlewares/CheckRole');

router.get('/settings', getCRMSettings);
router.post('/updateSettings', updateCRMSettings);

// Policy routes
router.get('/policy/:policyType', getPolicy);
router.post('/policy/:policyType', protect, restrictTo('SuperAdmin', 'Admin'), updatePolicy);

// Language routes
router.get('/supported-languages', getSupportedLanguages);
router.post('/add-language', protect, restrictTo('SuperAdmin', 'Admin'), addLanguage);
router.post('/remove-language', protect, restrictTo('SuperAdmin', 'Admin'), removeLanguage);

module.exports = router;