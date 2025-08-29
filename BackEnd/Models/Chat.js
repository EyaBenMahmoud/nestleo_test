const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  isGroup: {
    type: Boolean,
    default: false
  },
  groupName: String,
  groupDescription: String,
  groupImage: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // New field to specify allowed roles for this chat
  allowedRoles: [{
    type: String,
    enum: ['SuperAdmin',"Admin", "SyndicateAdmin", "SyndicateCoowner", "Worker"]
  }],
  // New field to specify group type
  groupType: {
    type: String,
    enum: ["Admin-SyndicateAdmin", "SyndicateAdmin-Worker", "SyndicateAdmin-Coowner", "Worker-Group", "Coowner-Group","Admin-Worker","SyndicateCoowner-SyndicateCoowner"],
    required: function() { return this.isGroup }
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  unreadCounts: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    count: {
      type: Number,
      default: 0
    }
  }]
}, {
  timestamps: true
});

// Add index for better performance
ChatSchema.index({ participants: 1, isGroup: 1, groupType: 1 });

module.exports = mongoose.models.Chat || mongoose.model('Chat', ChatSchema);