const Subscription = require("../Models/Subscription");
const stripe = require('../Config/stripe');
const User = require("../Models/User");
const { default: mongoose } = require("mongoose");
const cron = require('node-cron');
const NotificationController = require('./notificationsController');
const { socketManager } = require('../Socket/socketManager');

// Helper function to get user language from database
const getUserLanguage = async (userId) => {
  try {
    const user = await User.findById(userId);
    return user?.language || 'en';
  } catch (error) {
    console.log('Error getting user language:', error);
    return 'en'; // Default fallback
  }
};

// Notification templates for multiple languages
const notificationTemplates = {
  subscriptionExpiring: {
    en: {
      title: 'Subscription Expiring Soon',
      content: '{planName} will expire on {expirationDate}. Please renew to avoid service interruption.'
    },
    fr: {
      title: 'Abonnement expirant bientôt',
      content: '{planName} expirera le {expirationDate}. Veuillez renouveler pour éviter une interruption de service.'
    },
    it: {
      title: 'Abbonamento in scadenza',
      content: '{planName} scadrà il {expirationDate}. Si prega di rinnovare per evitare interruzioni del servizio.'
    },
    sp: {
      title: 'Suscripción expirando pronto',
      content: '{planName} expirará el {expirationDate}. Por favor renueva para evitar la interrupción del servicio.'
    }
  }
};

// Helper function to get localized notification content
const getLocalizedNotification = (templateKey, language, variables = {}) => {
  const template = notificationTemplates[templateKey][language] || notificationTemplates[templateKey].en;
  
  let title = template.title;
  let content = template.content;
  
  // Replace variables in title and content
  Object.keys(variables).forEach(key => {
    const placeholder = `{${key}}`;
    title = title.replace(new RegExp(placeholder, 'g'), variables[key]);
    content = content.replace(new RegExp(placeholder, 'g'), variables[key]);
  });
  
  return { title, content };
};

const scheduleSubscriptionExpirationNotifications = () => {
  // Schedule job to run daily at 09:00 AM to check for subscriptions expiring in 3 days
  cron.schedule('0 9 * * *', async () => {
    try {
      console.log('Running subscription expiration notification check...');

      // Calculate the date 3 days from now
      const threeFromNow = new Date();
      threeFromNow.setDate(threeFromNow.getDate() + 3);
      threeFromNow.setHours(0, 0, 0, 0);

      // Calculate the date 2 days from now (to create a date range)
      const twoDaysFromNow = new Date(threeFromNow);
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() - 1);

      // Find users whose subscriptions expire in exactly 3 days
      const usersWithExpiringSubscriptions = await User.find({
        "subscription.status": "active",
        "subscription.endDate": {
          $gte: twoDaysFromNow,
          $lt: threeFromNow
        }
      });

      console.log(`Found ${usersWithExpiringSubscriptions.length} users with subscriptions expiring in 3 days`);

      // Process each user with an expiring subscription
      for (const user of usersWithExpiringSubscriptions) {
        try {
          // Get user's language preference
          const userLanguage = await getUserLanguage(user._id);
          
          // Format expiration date for display
          const expirationDate = new Date(user.subscription.endDate).toLocaleDateString();

          // Get subscription plan details
          const subscriptionPlan = await Subscription.findById(user.subscription.planId);
          const planName = subscriptionPlan ? subscriptionPlan.subscriptionType : "Your subscription";

          // Get localized notification content
          const notificationData = getLocalizedNotification('subscriptionExpiring', userLanguage, {
            planName: planName,
            expirationDate: expirationDate
          });

          // Create notification for the user
          await NotificationController.createNotification({
            recipient: user._id,
            type: 'alert',
            title: notificationData.title,
            content: notificationData.content,
            relatedTo: user.subscription.planId,
            onModel: 'Subscription',
            isActionable: true
          });

          console.log(`Created expiration notification for user: ${user.email}`);

          // Send real-time notification via socket if user is online
          if (socketManager && socketManager.io) {
            const userSocketId = socketManager.onlineUsers.get(user._id.toString());
            if (userSocketId) {
              socketManager.io.to(userSocketId).emit('notification', {
                type: 'alert',
                title: notificationData.title,
                content: notificationData.content,
                createdAt: new Date()
              });
              console.log(`Real-time notification sent to user: ${user.email}`);
            }
          }
        } catch (userError) {
          console.error(`Error creating notification for user ${user._id}:`, userError);
        }
      }

      console.log('Subscription expiration notification check completed');
    } catch (error) {
      console.error('Error in subscription expiration notification job:', error);
    }
  }, {
    timezone: "Africa/Tunis" // Tunisia timezone
  });

  console.log('Subscription expiration notification scheduler initialized - Daily at 09:00');
};
const excludedRoles = ["SyndicateCoowner", "Worker", "Admin", "SuperAdmin"];

// Function to deactivate users with inactive subscriptions
const deactivateInactiveUsers = async () => {
  try {
    console.log("Running cron job to check and deactivate users...");

    // Get current date
    const currentDate = new Date();

    // 1. First, find all active users with active subscriptions that have expired
    const usersWithExpiredSubscriptions = await User.find({
      "subscription.status": "active",
      "subscription.endDate": { $lte: currentDate },
      isActive: true
    });

    // Move expired subscriptions to history and mark as inactive
    for (const user of usersWithExpiredSubscriptions) {
      if (user.subscription) {
        // Add current subscription to history before modifying it
        user.subscriptionHistory.push({
          ...user.subscription.toObject(),
          status: "inactive"
        });

        // Update current subscription to inactive
        user.subscription.status = "inactive";
        await user.save();
        console.log(`Moved expired subscription to history for user: ${user.email}`);
      }
    }

    // 2. Now handle users who should be deactivated
    // This includes:
    // - Users with inactive subscriptions past trial period
    // - Users with no subscription at all past trial period

    // Find users who should potentially be deactivated
    const usersToCheck = await User.find({
      $or: [
        {
          "subscription.status": "inactive",
          isActive: true,
          role: { $nin: excludedRoles } // Exclude specific roles
        },
        {
          subscription: { $exists: false },
          isActive: true,
          role: { $nin: excludedRoles } // Exclude specific roles
        }
      ]
    });

    for (const user of usersToCheck) {
      let startDate;

      // Determine the start date based on whether they have a subscription or not
      if (user.subscription) {
        startDate = new Date(user.subscription.startDate);
      } else {
        // For users with no subscription, use their creation date
        startDate = new Date(user.createdAt);
      }

      const timeDifference = currentDate - startDate;
      const daysDifference = timeDifference / (1000 * 60 * 60 * 24);

      // If more than 7 days have passed, deactivate the user
      if (daysDifference > 7) {
        user.isActive = false;
        await user.save();
        console.log(`Deactivated user: ${user.email}`);
      }
    }

    console.log("Cron job completed successfully.");
  } catch (error) {
    console.error("Error in deactivateInactiveUsers cron job:", error);
  }
};


// Get All Subscriptions (Admin only - gets all languages)
const getSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find();
    res.status(200).json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Subscriptions for Frontend (filtered by language)
const getSubscriptionsfront = async (req, res) => {
  try {
    const { language = 'en' } = req.query;
    const subscriptions = await Subscription.find({ language, status: 'active' });
    const featureSet = new Set();
    subscriptions.forEach(sub => {
      sub.features.forEach(feature => {
        featureSet.add(feature.name);
      });
    });
    const allFeatures = Array.from(featureSet);
    res.status(200).json({ subscriptions, allFeatures });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// Get Single Subscription
const getSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    res.status(200).json(subscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update Subscription
const addSubscription = async (req, res) => {
  try {
    const { subscriptionType, description, price, interval, status, features, language = 'en' } = req.body;


    // Validate required fields
    if (typeof price === 'undefined' || price === null || subscriptionType === undefined) {
      return res.status(400).json({ error: "Missing required fields: subscriptionType, price" });
    }
    // Only require interval if price is not 0
    if (price !== 0 && !interval) {
      return res.status(400).json({ error: "Missing required field: interval" });
    }

    // Validate the interval only if price is not 0
    const validIntervals = ["month", "year", "week", "day"];
    if (price !== 0 && !validIntervals.includes(interval)) {
      return res.status(400).json({
        error: "Invalid interval. Must be one of: month, year, week, day"
      });
    }

    // Validate price is a number and >= 0
    if (isNaN(price)) {
      return res.status(400).json({ error: "Price must be a number" });
    }
    if (price < 0) {
      return res.status(400).json({ error: "Price must be greater than or equal to 0" });
    }

    // Step 1: Validate features if provided
    const featureObjects = features ? features.map(feature => ({
      name: feature.name,
      isActive: feature.isActive !== false // Default to true if not specified
    })) : [];


    let newSubscription;
    // If price is 0, do not create Stripe product/price and do not set interval
    if (price === 0) {
      newSubscription = new Subscription({
        subscriptionType,
        description: description || "",
        price,
        status: status || "active",
        language,
        features: featureObjects
      });
    } else {
      // Step 2: Create a Stripe Product
      const stripeProduct = await stripe.products.create({
        name: subscriptionType,
        description: description || "",
        active: true
      });

      // Step 3: Create a Stripe Price
      const stripePrice = await stripe.prices.create({
        unit_amount: Math.round(price * 100), // Convert to cents
        currency: 'usd',
        recurring: {
          interval: interval,
          interval_count: 1
        },
        product: stripeProduct.id,
      });

      newSubscription = new Subscription({
        subscriptionType,
        description: description || "",
        price,
        interval,
        status: status || "active",
        language,
        stripeProductId: stripeProduct.id,
        stripePriceId: stripePrice.id,
        features: featureObjects
      });
    }

    await newSubscription.save();

    // Step 4: Return success response
    res.status(201).json({
      success: true,
      message: "Subscription added successfully",
      subscription: newSubscription
    });
  } catch (error) {
    console.error("Error in addSubscription:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: "Failed to create subscription. Please check your input and try again."
    });
  }
};

const updateSubscription = async (req, res) => {
  try {
    const {
      subscriptionType,
      description,
      price,
      status,
      features,
      interval,
      language
    } = req.body;

    const subscriptionId = req.params.id;

    // Validate subscription ID
    if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
      return res.status(400).json({ error: "Invalid subscription ID" });
    }

    // Get existing subscription
    const existingSubscription = await Subscription.findById(subscriptionId);
    if (!existingSubscription) {
      return res.status(404).json({
        success: false,
        error: "Subscription not found"
      });
    }

    // Prepare update objects
    const dbUpdates = {};
    const stripeProductUpdates = {};
    let newStripePriceId = existingSubscription.stripePriceId;

    // Handle subscription type update
    if (subscriptionType && subscriptionType !== existingSubscription.subscriptionType) {
      dbUpdates.subscriptionType = subscriptionType;
      stripeProductUpdates.name = subscriptionType;
    }

    // Handle description update
    if (description !== undefined && description !== existingSubscription.description) {
      dbUpdates.description = description;
      stripeProductUpdates.description = description;
    }

    // Handle language update
    if (language && language !== existingSubscription.language) {
      dbUpdates.language = language;
    }

    // Handle status update
    if (status && status !== existingSubscription.status) {
      dbUpdates.status = status;
      if (existingSubscription.stripeProductId) {
        stripeProductUpdates.active = (status === "active");
      }
    }

    // Handle features update
    if (features) {
      dbUpdates.features = features.map(feature => ({
        name: feature.name,
        isActive: feature.isActive !== false,
        metadata: feature.metadata
      }));
    }

    // Handle price and interval updates
    const newPrice = price !== undefined ? parseFloat(price) : existingSubscription.price;
    const isPriceChanging = price !== undefined && newPrice !== existingSubscription.price;
    const isIntervalChanging = interval !== undefined && interval !== existingSubscription.interval;

    const validIntervals = ["month", "year", "week", "day"];

    if (isPriceChanging || isIntervalChanging) {
      if (isNaN(newPrice)) {
        return res.status(400).json({
          success: false,
          error: "Price must be a number"
        });
      }
      if (newPrice < 0) {
        return res.status(400).json({
          success: false,
          error: "Price must be greater than or equal to 0"
        });
      }

      const effectiveInterval = interval || existingSubscription.interval;

      if (newPrice > 0) {
        // For paid subscriptions
        if (!effectiveInterval || !validIntervals.includes(effectiveInterval)) {
          return res.status(400).json({
            success: false,
            error: "Interval is required for paid subscriptions and must be one of: month, year, week, day"
          });
        }

        // Create or update Stripe product if needed
        let stripeProductId = existingSubscription.stripeProductId;

        if (!stripeProductId) {
          // Create new product if it didn't exist (e.g., upgrading from free)
          const stripeProduct = await stripe.products.create({
            name: subscriptionType || existingSubscription.subscriptionType,
            description: description || existingSubscription.description || "",
            active: status === "active" || existingSubscription.status === "active"
          });
          stripeProductId = stripeProduct.id;
          dbUpdates.stripeProductId = stripeProductId;
        } else if (Object.keys(stripeProductUpdates).length > 0) {
          await stripe.products.update(stripeProductId, stripeProductUpdates);
        }

        // Create new price
        const newStripePrice = await stripe.prices.create({
          unit_amount: Math.round(newPrice * 100),
          currency: 'usd',
          recurring: {
            interval: effectiveInterval,
            interval_count: 1
          },
          product: stripeProductId,
        });

        newStripePriceId = newStripePrice.id;
        dbUpdates.stripePriceId = newStripePriceId;
        dbUpdates.interval = effectiveInterval;

      } else {
        // Changing to free (price = 0)
        if (existingSubscription.stripeProductId) {
          // Archive existing Stripe product
          await stripe.products.update(existingSubscription.stripeProductId, { active: false });
        }
        // Clear Stripe references and interval
        dbUpdates.stripeProductId = null;
        dbUpdates.stripePriceId = null;
        dbUpdates.interval = null;
      }

      dbUpdates.price = newPrice;
    }

    // Update database
    const updatedSubscription = await Subscription.findByIdAndUpdate(
      subscriptionId,
      dbUpdates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Subscription updated successfully",
      subscription: updatedSubscription
    });

  } catch (error) {
    console.error("Error updating subscription:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: "Failed to update subscription. Please try again."
    });
  }
};
// Delete Subscription
const deleteSubscription = async (req, res) => {
  try {
    const subscriptionId = req.params.id;

    // First get the existing subscription
    const existingSubscription = await Subscription.findById(subscriptionId);
    if (!existingSubscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    // Step 1: Check if any users are using this subscription
    const usersWithThisSubscription = await User.find({
      "subscription.planId": subscriptionId
    });

    if (usersWithThisSubscription.length > 0) {
      return res.status(400).json({
        message: "Cannot delete subscription - users are still subscribed",
        userCount: usersWithThisSubscription.length
      });
    }

    // Step 2: Archive the Stripe product (don't fully delete to maintain history)
    if (existingSubscription.stripeProductId) {
      await stripe.products.update(existingSubscription.stripeProductId, {
        active: false
      });
    }

    // Step 3: Delete from database
    const deletedSubscription = await Subscription.findByIdAndDelete(subscriptionId);

    res.status(200).json({
      message: "Subscription deleted successfully",
      subscription: deletedSubscription
    });
  } catch (error) {
    console.error("Error deleting subscription:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  addSubscription,
  getSubscriptions,
  deactivateInactiveUsers,
  getSubscription,
  updateSubscription,
  deleteSubscription,
  getSubscriptionsfront,
  scheduleSubscriptionExpirationNotifications
};