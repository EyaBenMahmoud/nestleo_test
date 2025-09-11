const mongoose = require('mongoose');

// Points transaction schema - tracks every point awarded
const pointTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: false
  },
  reason: {
    type: String,
    enum: ['early_payment', 'meeting_attendance', 'voting'],
    required: true
  },
  description: String,
  timestamp: {
    type: Date,
    default: Date.now
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'relatedModel'
  },
  relatedModel: {
    type: String,
    enum: ['Invoice', 'Event', 'Poll']
  }
});

// Badge definition schema - defines badge types and requirements
const badgeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: String,
  icon: String,
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: false
  },
  category: {
    type: String,
    enum: ['payment', 'meeting', 'voting', 'general'],
    required: true
  },
  pointThreshold: {
    type: Number,
    required: true
  },
  requirements: {
    type: Object,
    default: {}
  }
});

// User Badge schema - tracks badges earned by users
const userBadgeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  badge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Badge',
    required: true
  },
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: false
  },
  earnedAt: {
    type: Date,
    default: Date.now
  }
});

// Reward/Coupon schema
const rewardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: false
  },
  description: String,
  pointCost: {
    type: Number,
    required: true
  },
  code: String,
  validUntil: Date,
  isActive: {
    type: Boolean,
    default: true
  }
});

// User Reward schema - tracks rewards redeemed by users
const userRewardSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reward: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reward',
    required: true
  },
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: false
  },
  redeemedAt: {
    type: Date,
    default: Date.now
  },
  code: String,
  isUsed: {
    type: Boolean,
    default: false
  }
});

// Create Models from schemas
const PointTransaction = mongoose.model('PointTransaction', pointTransactionSchema);
const Badge = mongoose.model('Badge', badgeSchema);
const UserBadge = mongoose.model('UserBadge', userBadgeSchema);
const Reward = mongoose.model('Reward', rewardSchema);
const UserReward = mongoose.model('UserReward', userRewardSchema);

module.exports = {
  PointTransaction,
  Badge,
  UserBadge,
  Reward,
  UserReward
};