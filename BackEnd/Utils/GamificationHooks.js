const gamificationService = require('../Socket/gamificationService');
const Invoice = require('../Models/Invoice');
const Poll = require('../Models/poll');
const Event = require('../Models/Event');
const User = require('../Models/User');
const Building = require('../Models/Building');
const Apartment = require('../Models/Appartement');

/**
 * Check if gamification is enabled for a user's building
 * @param {String} userId - ID of the user (co-owner)
 * @param {String} buildingId - ID of the building (if known)
 */
async function isGamificationEnabledForBuilding(buildingId) {
  try {
    if (!buildingId) return false;

    const building = await Building.findById(buildingId);
    return building?.gamificationEnabled || false;
  } catch (error) {
    console.error('Error checking gamification status:', error);
    return false;
  }
}


/**
 * Find building ID for a user
 * @param {String} userId - ID of the user
 * @returns {String|null} - Building ID or null if not found
 */
async function findBuildingIdForUser(userId) {
  try {
    // Try to find user in building.coOwners
    const building = await Building.findOne({ coOwners: userId });
    if (building) return building._id;

    // If not found, try to find user's apartment
    const apartment = await Apartment.findOne({ owner: userId });
    if (apartment) return apartment.buildingId;

    return null;
  } catch (error) {
    console.error('Error finding building for user:', error);
    return null;
  }
}

/**
 * Service to integrate gamification with existing functionality
 */
const integrationService = {
  /**
   * Hook to call when an invoice is marked as paid
   */
  /**
   * Hook to call when an invoice is paid early
   */
  async handleInvoicePayment(invoice) {
    try {
      if (!invoice || !invoice.coOwner) {
        console.log('Missing invoice or coOwner in handleInvoicePayment');
        return null;
      }

      // Skip if invoice is not paid early
      if (!invoice.paymentDate || !invoice.dueDate) {
        console.log('Missing payment date or due date for invoice');
        return null;
      }
      // Check if gamification is enabled for this user's building
      const gamificationEnabled = await isGamificationEnabledForBuilding(invoice?.building?._id);
      if (!gamificationEnabled) {
        console.log(`Gamification not enabled for building ${invoice.buildingId}`);
        return null;
      }
      const dueDate = new Date(invoice.dueDate);
      const paymentDate = new Date(invoice.paymentDate);
      const daysEarly = Math.max(0, Math.ceil((dueDate - paymentDate) / (1000 * 60 * 60 * 24)));

      if (daysEarly < 1) {
        console.log(`Payment not early enough: ${daysEarly} days`);
        return null;
      }

      // Get coOwner ID (may be an object or just the ID)
      const userId = invoice.coOwner._id || invoice.coOwner;
      const buildingId = invoice.building._id; // Pass building ID

      console.log(`Attempting to award points for invoice ${invoice._id} paid ${daysEarly} days early to user ${userId}`);

      // Award points for early payment
      const gamificationService = require('../Socket/gamificationService');
      const transaction = await gamificationService.awardEarlyPaymentPoints(
        userId,
        invoice._id,
        buildingId,
        daysEarly
      );

      if (transaction) {
        console.log(`Successfully awarded ${transaction.amount} points to user ${userId} for early payment`);

        // Create notification for early payment
        const NotificationController = require('../Controllers/notificationsController');
        const user = await require('../Models/User').findById(userId);

        const notification = await NotificationController.createNotification({
          recipient: userId,
          type: 'alert',
          title: 'Early Payment Reward',
          content: `You earned ${transaction.amount} points for paying your invoice ${daysEarly} day${daysEarly > 1 ? 's' : ''} early!`,
          relatedTo: transaction._id,
          onModel: 'gamification',
          senderName: 'Gamification System',
          isActionable: false
        });

        // Send notification to user via socket
        const socketManager = require('../Socket/socketManager').socketManager;
        const recipientSocketId = socketManager.onlineUsers.get(userId.toString());

        if (recipientSocketId && notification) {
          socketManager.io.to(recipientSocketId).emit('notification', {
            ...notification.toObject(),
            gamification: true,
            points: transaction.amount,
            onModel: 'gamification',
            reason: 'early_payment',
            relatedId: invoice._id,
            progress: {
              current: user?.gamification?.monthlyPoints || 0,
              nextMilestone: 100
            }
          });
        }
      } else {
        console.log(`Failed to award points to user ${userId} for early payment`);
      }

      return transaction;
    } catch (error) {
      console.error('Error handling invoice payment for gamification:', error);
      return null;
    }
  },

  /**
* Hook to call when a user attends an event
*/
  async handleEventAttendance(event, userId) {
    try {
      if (!event || !event._id || !userId) {
        console.log('Missing event or userId in handleEventAttendance');
        return null;
      }
      console.log(`Attempting to award points for event ${event._id} to user ${userId}`);
      // Check if gamification is enabled for this user's building
      const gamificationEnabled = await isGamificationEnabledForBuilding(event?.building?._id);
      if (!gamificationEnabled) {
        console.log(`Gamification not enabled for building ${event?.building?._id}`);
        return null;
      }
      // Award meeting attendance points - make sure gamificationService is imported
      const gamificationService = require('../Socket/gamificationService');
      const transaction = await gamificationService.awardMeetingPoints(userId, event._id, event.building._id);

      // Log whether points were awarded
      if (transaction) {
        console.log(`Successfully awarded ${transaction.amount} points to user ${userId} for event ${event._id}`);
      } else {
        console.log(`Failed to award points to user ${userId} for event ${event._id}`);
      }

      return transaction;
    } catch (error) {
      console.error('Error handling event attendance for gamification:', error);
      return null;
    }
  },

  /**
   * Hook to call when a user votes in a poll
   */
  async handlePollVote(poll, userId) {
    try {
      if (!poll || !poll._id || !userId) {
        console.log('Missing poll or userId in handlePollVote');
        return null;
      }

      // Get building ID for this user
      const buildingId = await findBuildingIdForUser(userId);
      if (!buildingId) {
        console.log(`No building found for user ${userId}`);
        return null;
      }

      // Check if gamification is enabled for this building
      const gamificationEnabled = await isGamificationEnabledForBuilding(buildingId);
      if (!gamificationEnabled) {
        console.log(`Gamification not enabled for building ${buildingId}`);
        return null;
      }

      // Award points for voting in poll
      const gamificationService = require('../Socket/gamificationService');
      const transaction = await gamificationService.awardVotingPoints(userId, poll._id, buildingId);

      // Log whether points were awarded
      if (transaction) {
        console.log(`Successfully awarded ${transaction.amount} points to user ${userId} for voting in poll ${poll._id}`);

        // Create notification for poll voting
        const NotificationController = require('../Controllers/notificationsController');
        const user = await require('../Models/User').findById(userId);

        const notification = await NotificationController.createNotification({
          recipient: userId,
          type: 'alert',
          title: 'Voting Reward',
          content: `You earned ${transaction.amount} points for participating in the community poll!`,
          relatedTo: transaction._id,
          onModel: 'gamification',
          senderName: 'Gamification System',
          isActionable: false
        });

        // Send notification to user via socket
        const socketManager = require('../Socket/socketManager').socketManager;
        const recipientSocketId = socketManager.onlineUsers.get(userId.toString());

        if (recipientSocketId && notification) {
          socketManager.io.to(recipientSocketId).emit('notification', {
            ...notification.toObject(),
            gamification: true,
            points: transaction.amount,
            onModel: 'gamification',
            reason: 'voting',
            relatedId: poll._id,
            progress: {
              current: user?.gamification?.monthlyPoints || 0,
              nextMilestone: 100
            }
          });
        }
      } else {
        console.log(`Failed to award points to user ${userId} for poll ${poll._id}`);
      }

      return transaction;
    } catch (error) {
      console.error('Error handling poll vote for gamification:', error);
      return null;
    }
  },

  /**
   * Run monthly maintenance tasks
   * Should be called via a scheduled task once per month
   */
  async runMonthlyMaintenance() {
    try {
      await gamificationService.resetMonthlyPoints();
    } catch (error) {
      console.error('Error running monthly gamification maintenance:', error);
    }
  }
};

module.exports = integrationService;