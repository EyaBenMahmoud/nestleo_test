const NotificationModel = require('../Models/notification');
const User = require('../Models/User');

class NotificationController {
  // Get user's notifications
  static async getUserNotifications(req, res) {
    try {
      const userId = req.user._id;
      
      const notifications = await NotificationModel.find({ recipient: userId })
        .sort({ createdAt: -1 })
        .limit(50);
      
      const unreadCount = await NotificationModel.countDocuments({ 
        recipient: userId, 
        isRead: false 
      });
      
      return res.status(200).json({
        notifications,
        unreadCount
      });
    } catch (error) {
      console.error('Error getting notifications:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  }

  // Mark notifications as read
  static async markAsRead(req, res) {
    try {
      const { notificationIds } = req.body;
      const userId = req.user._id;
      
      if (!notificationIds || !Array.isArray(notificationIds)) {
        return res.status(400).json({ error: 'Invalid notification IDs' });
      }
      
      await NotificationModel.updateMany(
        { 
          _id: { $in: notificationIds },
          recipient: userId 
        },
        { isRead: true }
      );
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      return res.status(500).json({ error: 'Failed to mark notifications as read' });
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(req, res) {
    try {
      const userId = req.user._id;
      
      await NotificationModel.updateMany(
        { recipient: userId, isRead: false },
        { isRead: true }
      );
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return res.status(500).json({ error: 'Failed to mark notifications as read' });
    }
  }

  // Delete notification
  static async deleteNotification(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user._id;
      
      const result = await NotificationModel.deleteOne({
        _id: notificationId,
        recipient: userId
      });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting notification:', error);
      return res.status(500).json({ error: 'Failed to delete notification' });
    }
  }
  
  // Create a notification (internal usage)
  static async createNotification(data) {
    try {
      const newNotification = new NotificationModel(data);
      await newNotification.save();
      return newNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }
}

module.exports = NotificationController;