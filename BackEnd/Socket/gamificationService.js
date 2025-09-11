const Building = require('../Models/Building');
const User = require('../Models/User');
const { PointTransaction, Badge, UserBadge, Reward, UserReward } = require('../Models/gamification');
const mongoose = require('mongoose');





/**
 * Core gamification service that handles points, badges, and rewards
 */
const gamificationService = {
  // Point configuration - easy to adjust point values
  POINTS: {
    EARLY_PAYMENT: 50,
    MEETING_ATTENDANCE: 30,
    VOTING: 20,
  },

  /**
   * Award points to a user for a specific action in a specific building
   */
  async awardPoints(userId, buildingId, reason, amount, description = '', relatedId = null, relatedModel = null) {
    try {
      // Validate reason
      if (!['early_payment', 'meeting_attendance', 'voting'].includes(reason)) {
        throw new Error('Invalid reason for points');
      }

      // Validate buildingId
      if (!buildingId) {
        throw new Error('Building ID is required for awarding points');
      }

      // Create transaction record with buildingId
      const transaction = await PointTransaction.create({
        user: userId,
        buildingId, // Store buildingId in the transaction
        amount,
        reason,
        description,
        relatedId,
        relatedModel
      });

      // Update user's gamification data
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      // Initialize gamification object if it doesn't exist
      if (!user.gamification) {
        user.gamification = {
          totalPoints: 0,
          monthlyPoints: 0,
          lastMonthReset: new Date(),
          paymentStreak: 0,
          meetingStreak: 0,
          votingStreak: 0,
          buildings: new Map()
        };
      }

      // Ensure buildings Map exists
      if (!user.gamification.buildings) {
        user.gamification.buildings = new Map();
      }

      const now = new Date();
      const buildingIdStr = buildingId.toString();

      // Initialize building-specific gamification data if it doesn't exist for this building
      if (!user.gamification.buildings.get(buildingIdStr)) {
        user.gamification.buildings.set(buildingIdStr, {
          totalPoints: 0,
          monthlyPoints: 0,
          lastMonthReset: now,
          paymentStreak: 0,
          meetingStreak: 0,
          votingStreak: 0
        });
      }

      // Get building-specific data
      const buildingGamification = user.gamification.buildings.get(buildingIdStr);

      // Reset monthly points if it's a new month for this building
      const lastReset = buildingGamification.lastMonthReset || now;
      if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        buildingGamification.monthlyPoints = 0;
        buildingGamification.lastMonthReset = now;
      }

      // Update streak counters and timestamps for this building
      if (reason === 'early_payment') {
        buildingGamification.paymentStreak = (buildingGamification.lastPayment &&
          (now - buildingGamification.lastPayment) < 60 * 24 * 60 * 60 * 1000) ? // 60 days
          buildingGamification.paymentStreak + 1 : 1;
        buildingGamification.lastPayment = now;
      } else if (reason === 'meeting_attendance') {
        buildingGamification.meetingStreak = (buildingGamification.lastMeeting &&
          (now - buildingGamification.lastMeeting) < 30 * 24 * 60 * 60 * 1000) ? // 30 days
          buildingGamification.meetingStreak + 1 : 1;
        buildingGamification.lastMeeting = now;
      } else if (reason === 'voting') {
        buildingGamification.votingStreak = (buildingGamification.lastVote &&
          (now - buildingGamification.lastVote) < 30 * 24 * 60 * 60 * 1000) ? // 30 days
          buildingGamification.votingStreak + 1 : 1;
        buildingGamification.lastVote = now;
      }

      // Update point totals for this building
      buildingGamification.totalPoints += amount;
      buildingGamification.monthlyPoints += amount;

      // Update the building data in the Map
      user.gamification.buildings.set(buildingIdStr, buildingGamification);

      // Also update global gamification values for backwards compatibility
      user.gamification.totalPoints += amount;
      user.gamification.monthlyPoints += amount;

      await user.save();

      // Check for badge eligibility for this building
      await this.checkBadgeEligibility(userId, buildingId);

      // Update ranks for all co-owners in this building after points change
      if (user.role === 'SyndicateCoowner') {
        await this.updateCoOwnerRanks(buildingId);
      }

      return transaction;
    } catch (error) {
      console.error('Error awarding points:', error);
      throw error;
    }
  },

  /**
   * Update ranks for all co-owners based on their total points within a specific building
   */
  async updateCoOwnerRanks(buildingId) {
    try {
      // Find the building and its co-owners
      const building = await Building.findById(buildingId);
      if (!building || !building.coOwners || building.coOwners.length === 0) {
        return { success: false, message: 'Building not found or has no co-owners' };
      }

      // Find all co-owners with gamification data for this building
      const coOwners = await User.find({
        _id: { $in: building.coOwners },
        role: 'SyndicateCoowner',
        'gamification.buildings': { $exists: true }
      });

      // Sort co-owners by their points in this specific building
      const sortedCoOwners = coOwners
        .filter(user => user.gamification?.buildings?.get(buildingId.toString()))
        .sort((a, b) => {
          const aPoints = a.gamification.buildings.get(buildingId.toString())?.totalPoints || 0;
          const bPoints = b.gamification.buildings.get(buildingId.toString())?.totalPoints || 0;
          return bPoints - aPoints; // Sort descending
        });

      // Update rank for each co-owner in this building
      for (let i = 0; i < sortedCoOwners.length; i++) {
        const coOwner = sortedCoOwners[i];
        const rank = i + 1; // Rank starts from 1

        const buildingGamification = coOwner.gamification.buildings.get(buildingId.toString()) || {};
        buildingGamification.rank = rank;

        coOwner.gamification.buildings.set(buildingId.toString(), buildingGamification);
        await coOwner.save();
      }

      return { success: true, message: `Updated ranks for ${sortedCoOwners.length} co-owners in building ${buildingId}` };
    } catch (error) {
      console.error('Error updating co-owner ranks for building:', error);
      throw error;
    }
  },

  /**
   * Check if user is eligible for any new badges in a specific building
   */
  async checkBadgeEligibility(userId, buildingId) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.gamification) return;

      // Get building-specific gamification data
      const buildingIdStr = buildingId.toString();
      const buildingGamification = user.gamification.buildings?.get(buildingIdStr);

      if (!buildingGamification) return;

      // Get all available badges for this building
      const badges = await Badge.find({
        $or: [
          { buildingId: buildingId },
          { buildingId: { $exists: false } }, // Include global badges too
          { buildingId: null }
        ]
      });

      // Get badges user already has for this building
      const userBadges = await UserBadge.find({
        user: userId,
        buildingId: buildingId
      }).select('badge');

      const userBadgeIds = userBadges.map(ub => ub.badge.toString());

      // Find eligible badges that user doesn't already have
      const eligibleBadges = badges.filter(badge => {
        // Skip if user already has this badge
        if (userBadgeIds.includes(badge._id.toString())) return false;

        // Check point threshold
        if (badge.pointThreshold > buildingGamification.totalPoints) return false;

        // Check specific requirements
        switch (badge.category) {
          case 'payment':
            return !badge.requirements.streak ||
              buildingGamification.paymentStreak >= badge.requirements.streak;
          case 'meeting':
            return !badge.requirements.streak ||
              buildingGamification.meetingStreak >= badge.requirements.streak;
          case 'voting':
            return !badge.requirements.streak ||
              buildingGamification.votingStreak >= badge.requirements.streak;
          case 'general':
            return true; // General badges just need the point threshold
          default:
            return false;
        }
      });

      // Award new badges
      for (const badge of eligibleBadges) {
        await UserBadge.create({
          user: userId,
          badge: badge._id,
          buildingId: buildingId // Associate badge with this building
        });

        // Notify user about new badge
        try {
          const NotificationController = require('../Controllers/notificationsController');
          await NotificationController.createNotification({
            recipient: userId,
            type: 'achievement',
            title: 'New Badge Earned!',
            content: `You've earned the "${badge.name}" badge in ${building.name || 'your building'}!`,
            relatedTo: badge._id,
            onModel: 'Badge'
          });
        } catch (err) {
          console.error('Failed to send badge notification:', err);
        }
      }

      return eligibleBadges;
    } catch (error) {
      console.error('Error checking badge eligibility:', error);
      throw error;
    }
  },
  /**
   * Award points for early invoice payment
   */
  async awardEarlyPaymentPoints(userId, buildingId,invoiceId, daysEarly) {
    const points = this.POINTS.EARLY_PAYMENT;
    // Bonus points for very early payments (up to 2x points for 15+ days early)
    const bonusMultiplier = Math.min(1 + (daysEarly / 15), 2);
    const totalPoints = Math.round(points * bonusMultiplier);

    return this.awardPoints(
      userId,
      buildingId,
      'early_payment',
      totalPoints,
      `Early payment bonus (${daysEarly} days early)`,
      invoiceId,
      'Invoice'
    );
  },

  /**
   * Award points for meeting attendance
   */
  async awardMeetingPoints(userId, eventId,buildingId) {
    return this.awardPoints(
      userId,
      buildingId,
      'meeting_attendance',
      this.POINTS.MEETING_ATTENDANCE,
      'Meeting attendance',
      eventId,
      'Event'
    );
  },

  /**
   * Award points for participating in a vote/poll
   */
  async awardVotingPoints(userId, pollId, buildingId) {
    return this.awardPoints(
      userId,
      buildingId,
      'voting',
      this.POINTS.VOTING,
      'Poll participation',
      pollId,
      'Poll'
    );
  },



  /**
   * Get available rewards for a user based on their points in a specific building
   */
  async getAvailableRewards(userId, buildingId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { availablePoints: 0, rewards: [] };
      }

      // Get building-specific gamification data
      const buildingGamification = buildingId && user.gamification?.buildings?.get(buildingId.toString());
      const availablePoints = buildingGamification?.totalPoints || 0;

      // Get all active rewards for this building
      const rewardQuery = { isActive: true };
      if (buildingId) {
        rewardQuery.$or = [
          { buildingId: buildingId },
          { buildingId: { $exists: false } },
          { buildingId: null }
        ];
      }

      const rewards = await Reward.find({
        ...rewardQuery,
        pointCost: { $lte: availablePoints }
      }).sort({ pointCost: 1 });

      return {
        availablePoints,
        rewards
      };
    } catch (error) {
      console.error('Error getting available rewards:', error);
      throw error;
    }
  },

  /**
   * Redeem a reward for a user in a specific building
   */
  async redeemReward(userId, rewardId, buildingId) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const user = await User.findById(userId).session(session);
      if (!user) {
        throw new Error('User not found');
      }

      const reward = await Reward.findOne({
        _id: rewardId,
        isActive: true
      }).session(session);

      if (!reward) {
        throw new Error('Reward not found or inactive');
      }

      // Check if building-specific and if user has enough points
      const buildingGamification = buildingId && user.gamification?.buildings?.get(buildingId.toString());
      const availablePoints = buildingGamification?.totalPoints || 0;

      if (availablePoints < reward.pointCost) {
        throw new Error('Not enough points to redeem this reward');
      }

      // Generate a unique code for this redemption
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();

      // Create user reward record with buildingId
      const userReward = await UserReward.create([{
        user: userId,
        reward: rewardId,
        buildingId: buildingId, // Associate with building
        code
      }], { session });

      // Deduct points from building-specific gamification data
      if (buildingId && buildingGamification) {
        buildingGamification.totalPoints -= reward.pointCost;
        buildingGamification.monthlyPoints = Math.max(
          0,
          buildingGamification.monthlyPoints - reward.pointCost
        );

        user.gamification.buildings.set(buildingId.toString(), buildingGamification);

        // Also update global points for backward compatibility
        user.gamification.totalPoints -= reward.pointCost;
        user.gamification.monthlyPoints = Math.max(
          0,
          user.gamification.monthlyPoints - reward.pointCost
        );

        await user.save({ session });
      }

      await session.commitTransaction();

      // Notify user about successful redemption
      try {
        const NotificationController = require('../Controllers/notificationsController');
        const buildingInfo = buildingId ? await Building.findById(buildingId) : null;
        const buildingName = buildingInfo?.name || 'your building';

        await NotificationController.createNotification({
          recipient: userId,
          type: 'reward',
          title: 'Reward Redeemed!',
          content: `You've successfully redeemed "${reward.name}" in ${buildingName}. Your code: ${code}`,
          relatedTo: reward._id,
          onModel: 'Reward'
        });
      } catch (err) {
        console.error('Failed to send reward notification:', err);
      }

      return userReward[0];
    } catch (error) {
      await session.abortTransaction();
      console.error('Error redeeming reward:', error);
      throw error;
    } finally {
      session.endSession();
    }
  },

  /**getUserProfile
   * Get user's gamification profile with badges and recent activities for a specific building
   */
  async getUserProfile(userId, buildingId) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      // Get building-specific gamification data
      const buildingIdStr = buildingId ? buildingId.toString() : null;
      const buildingGamification = buildingId && user.gamification?.buildings?.get(buildingIdStr);

      // Get user badges for this building
      const badgeQuery = { user: userId };
      if (buildingId) {
        badgeQuery.buildingId = buildingId;
      }

      const userBadges = await UserBadge.find(badgeQuery)
        .populate('badge')
        .sort({ earnedAt: -1 });

      // Get recent point transactions for this building
      const transactionQuery = { user: userId };
      if (buildingId) {
        transactionQuery.buildingId = buildingId;
      }

      const recentTransactions = await PointTransaction.find(transactionQuery)
        .sort({ timestamp: -1 })
        .limit(10);

      // Get redeemed rewards for this building
      const rewardQuery = { user: userId };
      if (buildingId) {
        rewardQuery.buildingId = buildingId;
      }

      const redeemedRewards = await UserReward.find(rewardQuery)
        .populate('reward')
        .sort({ redeemedAt: -1 });

      // Determine what points data to return
      const pointsData = buildingGamification || user.gamification || { totalPoints: 0, monthlyPoints: 0 };

      return {
        userId,
        name: `${user.firstName} ${user.lastName}`,
        points: pointsData.totalPoints || 0,
        monthlyPoints: pointsData.monthlyPoints || 0,
        rank: pointsData.rank || 0,
        badges: userBadges.map(ub => ({
          id: ub.badge._id,
          name: ub.badge.name,
          description: ub.badge.description,
          icon: ub.badge.icon,
          category: ub.badge.category,
          earnedAt: ub.earnedAt
        })),
        recentActivity: recentTransactions.map(t => ({
          id: t._id,
          points: t.amount,
          reason: t.reason,
          description: t.description,
          timestamp: t.timestamp
        })),
        redeemedRewards: redeemedRewards.map(r => ({
          id: r._id,
          name: r.reward.name,
          description: r.reward.description,
          pointCost: r.reward.pointCost,
          code: r.code,
          redeemedAt: r.redeemedAt,
          isUsed: r.isUsed
        }))
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  },

  /**
   * Get leaderboard data (all-time, monthly, or specific category)
   */
  async getLeaderboard(type = 'all-time', limit = 10) {
    try {
      let sortField = { 'gamification.totalPoints': -1 };

      if (type === 'monthly') {
        sortField = { 'gamification.monthlyPoints': -1 };
      }

      // This assumes SyndicateCoowner is the role for co-owners
      const users = await User.find({
        role: 'SyndicateCoowner',
        'gamification.totalPoints': { $gt: 0 }
      })
        .select('firstName lastName avatar gamification.totalPoints gamification.monthlyPoints')
        .sort(sortField)
        .limit(limit);

      return users.map(user => ({
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        avatar: user.avatar,
        points: type === 'monthly' ?
          user.gamification?.monthlyPoints || 0 :
          user.gamification?.totalPoints || 0
      }));
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw error;
    }
  },

  /**
   * Get top performer of the day/week/month
   */
  async getTopPerformer(period = 'day') {
    try {
      let startDate;
      const now = new Date();

      switch (period) {
        case 'day':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          const day = now.getDay();
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          throw new Error('Invalid period');
      }

      // Aggregate points earned during the specified period
      const result = await PointTransaction.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$user',
            totalPoints: { $sum: '$amount' }
          }
        },
        {
          $sort: { totalPoints: -1 }
        },
        {
          $limit: 1
        }
      ]);

      if (!result.length) return null;

      // Get user details
      const user = await User.findById(result[0]._id);
      if (!user) return null;

      return {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        avatar: user.avatar,
        points: result[0].totalPoints,
        period,
        gamification: user.gamification || {}
      };
    } catch (error) {
      console.error(`Error getting top ${period} performer:`, error);
      throw error;
    }
  },

  /**
   * Initialize default badges in the system
   */
  async initializeDefaultBadges() {
    const defaultBadges = [
      // Payment badges
      {
        name: 'Early Bird',
        description: 'Pay a bill early for the first time',
        icon: 'ri-time-line',
        category: 'payment',
        pointThreshold: 50,
        requirements: {}
      },
      {
        name: 'Punctual Payer',
        description: 'Pay 3 bills early in a row',
        icon: 'ri-calendar-check-line',
        category: 'payment',
        pointThreshold: 150,
        requirements: { streak: 3 }
      },
      {
        name: 'Financial Guru',
        description: 'Accumulate 500 points from early payments',
        icon: 'ri-money-dollar-circle-line',
        category: 'payment',
        pointThreshold: 500,
        requirements: {}
      },

      // Meeting badges
      {
        name: 'First Timer',
        description: 'Attend your first building meeting',
        icon: 'ri-group-line',
        category: 'meeting',
        pointThreshold: 30,
        requirements: {}
      },
      {
        name: 'Active Participant',
        description: 'Attend 5 meetings',
        icon: 'ri-team-line',
        category: 'meeting',
        pointThreshold: 150,
        requirements: { streak: 5 }
      },
      {
        name: 'Community Pillar',
        description: 'Attend 10 meetings',
        icon: 'ri-building-line',
        category: 'meeting',
        pointThreshold: 300,
        requirements: { streak: 10 }
      },

      // Voting badges
      {
        name: 'Voter',
        description: 'Vote in your first poll',
        icon: 'ri-checkbox-circle-line',
        category: 'voting',
        pointThreshold: 20,
        requirements: {}
      },
      {
        name: 'Democracy Champion',
        description: 'Vote in 10 polls',
        icon: 'ri-government-line',
        category: 'voting',
        pointThreshold: 200,
        requirements: { streak: 10 }
      },

      // General badges
      {
        name: 'Rising Star',
        description: 'Earn your first 100 points',
        icon: 'ri-star-line',
        category: 'general',
        pointThreshold: 100,
        requirements: {}
      },
      {
        name: 'Engaged Resident',
        description: 'Earn 500 total points',
        icon: 'ri-medal-line',
        category: 'general',
        pointThreshold: 500,
        requirements: {}
      },
      {
        name: 'Building VIP',
        description: 'Earn 1000 total points',
        icon: 'ri-vip-crown-line',
        category: 'general',
        pointThreshold: 1000,
        requirements: {}
      }
    ];

    for (const badge of defaultBadges) {
      await Badge.findOneAndUpdate(
        { name: badge.name },
        badge,
        { upsert: true, new: true }
      );
    }

    console.log('Default badges initialized');
    return defaultBadges;
  },

  /**
   * Initialize default rewards in the system
   */
  async initializeDefaultRewards() {
    const defaultRewards = [
      {
        name: '5% Discount on Next Service Fee',
        description: 'Get a 5% discount on your next monthly service fee',
        pointCost: 200,
        isActive: true
      },
      {
        name: '10% Discount on Next Service Fee',
        description: 'Get a 10% discount on your next monthly service fee',
        pointCost: 500,
        isActive: true
      },
      {
        name: 'Skip One Month Service Fee',
        description: 'Skip one month of service fees (up to $100)',
        pointCost: 1000,
        isActive: true
      }
    ];

    for (const reward of defaultRewards) {
      await Reward.findOneAndUpdate(
        { name: reward.name },
        reward,
        { upsert: true, new: true }
      );
    }

    console.log('Default rewards initialized');
    return defaultRewards;
  },

  /**
   * Reset monthly points for all users
   * (should be called via a monthly scheduled job)
   */
  async resetMonthlyPoints() {
    try {
      const result = await User.updateMany(
        { 'gamification.monthlyPoints': { $gt: 0 } },
        {
          $set: {
            'gamification.monthlyPoints': 0,
            'gamification.lastMonthReset': new Date()
          }
        }
      );

      console.log(`Reset monthly points for ${result.modifiedCount} users`);
      return result;
    } catch (error) {
      console.error('Error resetting monthly points:', error);
      throw error;
    }
  },


  /**
   * Get leaderboard data for a specific building
   */
  async getBuildingLeaderboard(buildingId, type = 'all-time', limit = 10) {
    try {
      // Find building and get co-owners
      const building = await Building.findById(buildingId);
      if (!building) {
        return [];
      }

      // Get co-owners for this building
      const coOwnerIds = building.coOwners || [];

      // Find all co-owner users with their data
      const coOwners = await User.find({
        _id: { $in: coOwnerIds },
        role: 'SyndicateCoowner'
      }).select('_id firstName lastName avatar gamification');

      // Format and return the leaderboard using building-specific data
      return coOwners
        .map(user => {
          // Get building-specific points
          const buildingData = user.gamification?.buildings?.get(buildingId.toString());
          const points = type === 'all-time'
            ? (buildingData?.totalPoints || 0)
            : (buildingData?.monthlyPoints || 0);

          return {
            id: user._id,
            name: `${user.firstName} ${user.lastName}`,
            avatar: user.avatar,
            points: points,
            rank: buildingData?.rank || 0
          };
        })
        .sort((a, b) => b.points - a.points)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting building leaderboard:', error);
      return [];
    }
  },


  async getBuildingTopPerformer(buildingId, period = 'month') {
    try {
      // Get the leaderboard for this building
      // Change from:
      // const leaderboard = await getBuildingLeaderboard(buildingId, 'monthly', 1);

      // To:
      const leaderboard = await this.getBuildingLeaderboard(buildingId, 'monthly', 1);

      if (leaderboard.length === 0) {
        return null;
      }

      // Get additional details for the top performer
      const topPerformerId = leaderboard[0].id;
      const user = await User.findById(topPerformerId);

      if (!user) {
        return null;
      }

      return {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        avatar: user.avatar,
        points: user.gamification?.monthlyPoints || 0,
        gamification: user.gamification || {}
      };
    } catch (error) {
      console.error('Error getting building top performer:', error);
      throw error;
    }
  }





};

module.exports = gamificationService;