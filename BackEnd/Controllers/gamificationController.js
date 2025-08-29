const gamificationService = require('../Socket/gamificationService');
const User = require('../Models/User');
const { PointTransaction, UserBadge, Reward, UserReward } = require('../Models/gamification');
const Invoice = require('../Models/Invoice');
const Poll = require('../Models/poll');
const Event = require('../Models/Event');
const Building = require('../Models/Building');

// Common response formatter
const formatResponse = (success, data = null, message = '') => ({
  success,
  data,
  message
});

const gamificationController = {
  // Initialize the gamification system
  async initialize(req, res) {
    try {
      const badges = await gamificationService.initializeDefaultBadges();
      const rewards = await gamificationService.initializeDefaultRewards();

      return res.status(200).json(formatResponse(true, { badges, rewards }, 'Gamification system initialized'));
    } catch (error) {
      console.error('Error initializing gamification:', error);
      return res.status(500).json(formatResponse(false, null, 'Error initializing gamification system'));
    }
  },

  // Award points for early invoice payment
  async awardEarlyPaymentPoints(req, res) {
    try {
      const { invoiceId } = req.params;
      const { userId } = req.body;

      if (!invoiceId || !userId) {
        return res.status(400).json(formatResponse(false, null, 'Invoice ID and User ID are required'));
      }

      // Verify the invoice is valid and was paid early
      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        return res.status(404).json(formatResponse(false, null, 'Invoice not found'));
      }

      if (invoice.status !== 'paid') {
        return res.status(400).json(formatResponse(false, null, 'Invoice is not paid'));
      }

      // Calculate days early
      const dueDate = new Date(invoice.dueDate);
      const paymentDate = new Date(invoice.paymentDate || Date.now());
      const daysEarly = Math.max(0, Math.ceil((dueDate - paymentDate) / (1000 * 60 * 60 * 24)));

      if (daysEarly <= 0) {
        return res.status(400).json(formatResponse(false, null, 'Invoice was not paid early'));
      }

      const result = await gamificationService.awardEarlyPaymentPoints(userId, invoiceId, daysEarly);

      return res.status(200).json(formatResponse(true, result, `Awarded points for paying ${daysEarly} days early`));
    } catch (error) {
      console.error('Error awarding payment points:', error);
      return res.status(500).json(formatResponse(false, null, 'Error awarding points'));
    }
  },

  // Award points for meeting attendance
  async awardMeetingPoints(req, res) {
    try {
      const { eventId } = req.params;
      const { userId } = req.body;

      if (!eventId || !userId) {
        return res.status(400).json(formatResponse(false, null, 'Event ID and User ID are required'));
      }

      // Verify the event exists and user attended
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json(formatResponse(false, null, 'Event not found'));
      }

      // Check if user actually attended the event
      const userAttended = event.attendees?.some(a => a.toString() === userId) ||
        event.meeting?.activeParticipants?.some(p => p.userId.toString() === userId);

      if (!userAttended) {
        return res.status(400).json(formatResponse(false, null, 'User did not attend this event'));
      }

      // Avoid double-awarding points
      const existingPoints = await PointTransaction.findOne({
        user: userId,
        reason: 'meeting_attendance',
        relatedId: eventId
      });

      if (existingPoints) {
        return res.status(400).json(formatResponse(false, null, 'Points already awarded for this event'));
      }

      const result = await gamificationService.awardMeetingPoints(userId, eventId);

      return res.status(200).json(formatResponse(true, result, 'Awarded points for meeting attendance'));
    } catch (error) {
      console.error('Error awarding meeting points:', error);
      return res.status(500).json(formatResponse(false, null, 'Error awarding points'));
    }
  },

  // Award points for voting in a poll
  async awardVotingPoints(req, res) {
    try {
      const { pollId } = req.params;
      const { userId } = req.body;

      if (!pollId || !userId) {
        return res.status(400).json(formatResponse(false, null, 'Poll ID and User ID are required'));
      }

      // Verify the poll exists and user voted
      const poll = await Poll.findById(pollId);
      if (!poll) {
        return res.status(404).json(formatResponse(false, null, 'Poll not found'));
      }

      // Check if user actually voted in the poll
      const userVoted = poll.responses?.some(response =>
        response.user.toString() === userId
      );

      if (!userVoted) {
        return res.status(400).json(formatResponse(false, null, 'User did not vote in this poll'));
      }

      // Avoid double-awarding points
      const existingPoints = await PointTransaction.findOne({
        user: userId,
        reason: 'voting',
        relatedId: pollId
      });

      if (existingPoints) {
        return res.status(400).json(formatResponse(false, null, 'Points already awarded for this poll'));
      }

      const result = await gamificationService.awardVotingPoints(userId, pollId);

      return res.status(200).json(formatResponse(true, result, 'Awarded points for voting'));
    } catch (error) {
      console.error('Error awarding voting points:', error);
      return res.status(500).json(formatResponse(false, null, 'Error awarding points'));
    }
  },



  // Get leaderboard
  async getLeaderboard(req, res) {
    try {
      const { type = 'all-time', limit = 10 } = req.query;

      const leaderboard = await gamificationService.getLeaderboard(type, parseInt(limit));

      return res.status(200).json(formatResponse(true, leaderboard));
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return res.status(500).json(formatResponse(false, null, 'Error fetching leaderboard'));
    }
  },

  // Get top performer
  async getTopPerformer(req, res) {
    try {
      const { period = 'day' } = req.query;

      if (!['day', 'week', 'month'].includes(period)) {
        return res.status(400).json(formatResponse(false, null, 'Invalid period. Use day, week, or month.'));
      }

      const performer = await gamificationService.getTopPerformer(period);

      return res.status(200).json(formatResponse(true, performer));
    } catch (error) {
      console.error('Error fetching top performer:', error);
      return res.status(500).json(formatResponse(false, null, 'Error fetching top performer'));
    }
  },


// Get user's gamification profile
async getUserProfile(req, res) {
  try {
    const { userId } = req.params;
    const { buildingId } = req.query; // Get buildingId from query

    if (!userId) {
      return res.status(400).json(formatResponse(false, null, 'User ID is required'));
    }

    const profile = await gamificationService.getUserProfile(userId, buildingId);

    return res.status(200).json(formatResponse(true, profile));
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json(formatResponse(false, null, 'Error fetching user profile'));
  }
},

// Get available rewards
async getAvailableRewards(req, res) {
  try {
    const { userId } = req.params;
    const { buildingId } = req.query; // Get buildingId from query

    if (!userId) {
      return res.status(400).json(formatResponse(false, null, 'User ID is required'));
    }

    const rewards = await gamificationService.getAvailableRewards(userId, buildingId);

    return res.status(200).json(formatResponse(true, rewards));
  } catch (error) {
    console.error('Error fetching available rewards:', error);
    return res.status(500).json(formatResponse(false, null, 'Error fetching available rewards'));
  }
},

// Redeem a reward
async redeemReward(req, res) {
  try {
    const { userId, rewardId, buildingId } = req.body;

    if (!userId || !rewardId) {
      return res.status(400).json(formatResponse(false, null, 'User ID and Reward ID are required'));
    }

    const result = await gamificationService.redeemReward(userId, rewardId, buildingId);

    return res.status(200).json(formatResponse(true, result, 'Reward redeemed successfully'));
  } catch (error) {
    console.error('Error redeeming reward:', error);
    return res.status(500).json(formatResponse(false, null, error.message || 'Error redeeming reward'));
  }
},

// Simplify the Building Leaderboard Controller
async getBuildingLeaderboard(req, res) {
  try {
    const { buildingId } = req.params;
    const { type = 'all-time', limit = 10 } = req.query;
    
    // No access check - all authenticated users can view
    const leaderboard = await gamificationService.getBuildingLeaderboard(buildingId, type, parseInt(limit));
    return res.status(200).json(formatResponse(true, leaderboard));
  } catch (error) {
    console.error('Error fetching building leaderboard:', error);
    return res.status(500).json(formatResponse(false, null, 'Error fetching building leaderboard'));
  }
},

// Simplify the Top Performer Controller
async getBuildingTopPerformer(req, res) {
  try {
    const { buildingId } = req.params;
    const { period = 'month' } = req.query;
    
    if (!['day', 'week', 'month'].includes(period)) {
      return res.status(400).json(formatResponse(false, null, 'Invalid period. Use day, week, or month.'));
    }

    // No access check - all authenticated users can view
    const performer = await gamificationService.getBuildingTopPerformer(buildingId, period);
    return res.status(200).json(formatResponse(true, performer));
  } catch (error) {
    console.error('Error fetching building top performer:', error);
    return res.status(500).json(formatResponse(false, null, 'Error fetching building top performer'));
  }
}

};




module.exports = gamificationController;