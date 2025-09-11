const express = require('express');
const router = express.Router();
const gamificationController = require('../Controllers/gamificationController');
const mongoose = require('mongoose');
const { protect } = require('../Middlewares/AuthMiddleware');
const User = require('../Models/User');
const { PointTransaction, UserBadge, Badge } = require('../Models/gamification');
const { checkBuildingGamification } = require('../Controllers/BuildingController');

// Initialize gamification system (admin only)
router.post('/initialize', 
  protect,  // Authentication middleware
  gamificationController.initialize
);

// Award points
router.post('/points/payment/:invoiceId', 
  protect,  // Authentication middleware
  gamificationController.awardEarlyPaymentPoints
);

router.post('/points/meeting/:eventId', 
  protect,  // Authentication middleware
  gamificationController.awardMeetingPoints
);

router.post('/points/voting/:pollId', 
  protect,  // Authentication middleware
  gamificationController.awardVotingPoints
);

// Get user profile
router.get('/profile/:userId', 
  protect,  // Authentication middleware
  gamificationController.getUserProfile
);

// Get leaderboards
router.get('/leaderboard', 
  protect,  // Authentication middleware
  gamificationController.getLeaderboard
);

router.get('/top-performer', 
  protect,  // Authentication middleware
  gamificationController.getTopPerformer
);

// Rewards
router.get('/rewards/:userId', 
  protect,  // Authentication middleware

  gamificationController.getAvailableRewards
);

router.post('/rewards/redeem', 
  protect,  // Authentication middleware

  gamificationController.redeemReward
);

// Building-specific leaderboards
router.get('/leaderboard/:buildingId', 
  protect,
  checkBuildingGamification,  
  gamificationController.getBuildingLeaderboard
);

router.get('/top-performer/:buildingId', 
  protect,  
  checkBuildingGamification,
  gamificationController.getBuildingTopPerformer
);


/**
 * Get the gamification profile for a user
 */
router.get('/profile/:userId', protect, async (req, res) => {
  const { userId } = req.params;
  
  try {
    // Check for valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // If user doesn't have gamification data yet, return basic structure
    if (!user.gamification) {
      return res.status(200).json({
        success: true,
        data: {
          userId,
          totalPoints: 0,
          monthlyPoints: 0,
          badges: [],
          paymentStreak: 0,
          meetingStreak: 0,
          votingStreak: 0,
          pointsByCategory: {
            payment: 0,
            meeting: 0,
            voting: 0
          },
          recentTransactions: []
        }
      });
    }
      
    // Get the user's badges
    const userBadges = await UserBadge.find({ user: userId })
      .populate('badge')
      .sort({ earnedAt: -1 });
      
    // Get points transactions
    const transactions = await PointTransaction.find({ user: userId })
      .sort({ timestamp: -1 })
      .limit(20);
      
    // Get points by category
    const pointsByCategory = {
      payment: 0,
      meeting: 0,
      voting: 0
    };
    
    transactions.forEach(t => {
      if (t.reason === 'early_payment') pointsByCategory.payment += t.amount;
      if (t.reason === 'meeting_attendance') pointsByCategory.meeting += t.amount;
      if (t.reason === 'voting') pointsByCategory.voting += t.amount;
    });
    
    // Format badges for the response
    const badges = userBadges.map(ub => ({
      _id: ub.badge._id,
      name: ub.badge.name,
      description: ub.badge.description,
      icon: ub.badge.icon,
      category: ub.badge.category,
      earnedAt: ub.earnedAt
    }));
    
    const profile = {
      userId,
      totalPoints: user.gamification?.totalPoints || 0,
      monthlyPoints: user.gamification?.monthlyPoints || 0,
      badges,
      paymentStreak: user.gamification?.paymentStreak || 0,
      meetingStreak: user.gamification?.meetingStreak || 0,
      votingStreak: user.gamification?.votingStreak || 0,
      lastPayment: user.gamification?.lastPayment,
      lastMeeting: user.gamification?.lastMeeting,
      lastVote: user.gamification?.lastVote,
      pointsByCategory,
      recentTransactions: transactions
    };
    
    return res.status(200).json({ success: true, data: profile });
  } catch (error) {
    console.error('Error getting gamification profile:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error retrieving gamification profile',
      error: error.message
    });
  }
});

module.exports = router;