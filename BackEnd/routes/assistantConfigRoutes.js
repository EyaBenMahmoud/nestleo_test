const express = require('express');
const router = express.Router();
const { protect } = require('../Middlewares/AuthMiddleware');
const assistantConfigController = require('../Controllers/AssistantConfigController');

// Public routes to get active configurations
router.get('/active', assistantConfigController.getActiveConfig);
router.get('/active-all', assistantConfigController.getAllActiveConfigs);

// Protected routes - only for authenticated users
router.get('/', protect, assistantConfigController.getAllConfigs);
router.post('/', protect, assistantConfigController.createConfig);
router.put('/:id', protect, assistantConfigController.updateConfig);
router.delete('/:id', protect, assistantConfigController.deleteConfig);
router.patch('/:id/activate', protect, assistantConfigController.activateConfig);
router.post('/:id/clone', protect, assistantConfigController.cloneConfig);

module.exports = router;