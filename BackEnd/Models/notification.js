const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['message', 'alert', 'system', 'mention', 'info', 'success'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: null
  },
  content: {
    type: String,
    required: true
  },
  relatedTo: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'onModel'
  },
  onModel: {
    type: String,
    enum: ['Claim', 'Task', 'Chat', 'Message', 'Building', 'Payment', 'Maintenance', 'Invoice', 'Event', 'gamification','Subscription','Contract', 'User', 'Other','coowner'],
    default: 'Chat'
  },
  senderName: String,
  senderAvatar: String,
  isRead: {
    type: Boolean,
    default: false
  },
  isActionable: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Add to your notification schema
  gamification: {
    type: Boolean,
    default: false
  },
  points: Number,
  reason: String,
  progress: {
    current: Number,
    nextMilestone: Number
  }
});

// Auto-delete old notifications after 30 days
notificationSchema.index({ createdAt: 1 }, {
  expireAfterSeconds: 30 * 24 * 60 * 60
});

// Use CommonJS export style
const NotificationModel = mongoose.model('Notification', notificationSchema);
module.exports = NotificationModel;