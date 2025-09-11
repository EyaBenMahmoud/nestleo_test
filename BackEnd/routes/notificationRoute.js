const express = require('express');
const router = express.Router();
const NotificationController = require('../Controllers/notificationsController');
const { protect } = require('../Middlewares/AuthMiddleware');

// Get user's notifications
router.get('/', protect, NotificationController.getUserNotifications);

// Mark notifications as read
router.post('/mark-read', protect, NotificationController.markAsRead);

// Mark all notifications as read
router.post('/mark-all-read', protect, NotificationController.markAllAsRead);

// Delete notification
router.delete('/:notificationId', protect, NotificationController.deleteNotification);

module.exports = router;