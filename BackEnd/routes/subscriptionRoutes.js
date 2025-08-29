const express = require("express");
const router = express.Router();
const subscriptionController = require("../Controllers/SubscriptionController");
const { protect } = require('../Middlewares/AuthMiddleware');
const restrictTo = require('../Middlewares/CheckRole');
const stripe = require('../Config/stripe');
const Subscription = require('../Models/Subscription');
const buildingController = require('../Controllers/BuildingController');
const User = require("../Models/User");

// Helper function to calculate end date
const calculateEndDate = (interval) => {
    const endDate = new Date();
    switch (interval) {
      case 'month': endDate.setMonth(endDate.getMonth() + 1); break;
      case 'year': endDate.setFullYear(endDate.getFullYear() + 1); break;
      case 'week': endDate.setDate(endDate.getDate() + 7); break;
      case 'day': endDate.setDate(endDate.getDate() + 1); break;
      default: endDate.setMonth(endDate.getMonth() + 1);
    }
    return endDate;
  };
  
  router.post('/create-checkout-session', async (req, res) => {
      try {
          const { planId, customerEmail } = req.body;
  
          // Retrieve the plan from the database
          const plan = await Subscription.findById(planId);
          if (!plan) {
              return res.status(404).json({ error: 'Plan not found' });
          }
  
          // Ensure the Stripe Price ID exists
          if (!plan.stripePriceId) {
              return res.status(400).json({ error: 'Plan does not have a Stripe price ID' });
          }
  
          // Find the user by email
          const user = await User.findOne({ email: customerEmail });
          if (!user) {
              return res.status(404).json({ error: 'User not found' });
          }
  
          // Create a Stripe Checkout Session (NO ARCHIVING HERE)
          const session = await stripe.checkout.sessions.create({
              payment_method_types: ['card'],
              mode: 'subscription',
              line_items: [{
                  price: plan.stripePriceId,
                  quantity: 1,
              }],
              customer_email: customerEmail,
              success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}&plan_id=${planId}&user_id=${user._id}`,
              cancel_url: `${process.env.CLIENT_URL}/landing`,
              metadata: {
                  planId: planId.toString(),
                  userId: user._id.toString()
              },
          });
  
          res.json({ sessionId: session.id });
      } catch (error) {
          console.error('Error creating checkout session:', error);
          res.status(500).json({ error: error.message });
      }
  });
  
  router.get('/confirm', async (req, res) => {
    try {
        const { session_id } = req.query;
        const session = await stripe.checkout.sessions.retrieve(session_id, {
            expand: ['subscription', 'customer'],
        });

        if (session.payment_status !== 'paid') {
            return res.status(400).json({ error: 'Payment not completed' });
        }

        const userId = session.metadata.userId;
        const planId = session.metadata.planId;
        const user = await User.findById(userId);
        const plan = await Subscription.findById(planId);

        if (!user || !plan) {
            return res.status(404).json({ error: 'User or plan not found' });
        }

        // Check if already processed
        if (user.subscription?.stripeSubscriptionId === session.subscription.id) {
            const alreadyUpdatedUser = await User.findById(userId)
                .populate('subscription.planId');
            return res.json({ 
                success: true, 
                user: alreadyUpdatedUser,
                message: "Already processed" 
            });
        }

        // Archive only if needed
        if (user.subscription && 
            user.subscription.stripeSubscriptionId !== session.subscription.id &&
            user.subscription.status === 'active') {
            
            user.subscriptionHistory.push({
                ...user.subscription.toObject(),
                status: "inactive",
                archivedAt: new Date(),
                reason: user.subscription.isTrial ? "trial_ended" : "upgraded"
            });
        }

        // Set new subscription
        user.subscription = {
            planId,
            stripeSubscriptionId: session.subscription.id,
            status: "active",
            isTrial: false,
            startDate: new Date(),
            endDate: calculateEndDate(plan.interval)
        };

        await user.save();
        
        // Get the fully populated user
        const updatedUser = await User.findById(userId)
            .populate({
                path: 'subscription.planId',
                model: 'Subscription'
            })
            .populate({
                path: 'subscriptionHistory.planId',
                model: 'Subscription'
            });

        res.json({ 
            success: true, 
            user: updatedUser // Send fully populated user
        });
    } catch (error) {
        console.error('Error confirming subscription:', error);
        res.status(500).json({ error: error.message });
    }
});
  
  router.post('/update-subscription', async (req, res) => {
      try {
          const { userId, planId, stripeSubscriptionId, status } = req.body;
  
          const user = await User.findById(userId);
          const plan = await Subscription.findById(planId);
          
          if (!user || !plan) {
              return res.status(404).json({ message: 'User or plan not found' });
          }
  
          // Archive only if:
          // 1. There's an existing subscription
          // 2. It's not the same as the new one
          // 3. It's active
          if (user.subscription && 
              user.subscription.stripeSubscriptionId !== stripeSubscriptionId &&
              user.subscription.status === 'active') {
              
              user.subscriptionHistory.push({
                  ...user.subscription.toObject(),
                  status: "inactive",
                  archivedAt: new Date(),
                  reason: "admin_updated"
              });
          }
  
          // Update current subscription
          user.subscription = {
              planId,
              stripeSubscriptionId,
              status,
              isTrial: status === 'trialing', // Set trial status appropriately
              startDate: new Date(),
              endDate: calculateEndDate(plan.interval)
          };
  
          await user.save();
  
          const updatedUser = await User.findById(userId)
              .populate('subscription.planId')
              .populate('subscriptionHistory.planId')
              .populate('buildings');
  
          res.json(updatedUser);
      } catch (error) {
          console.error("Error updating subscription:", error);
          res.status(500).json({ message: "Server error" });
      }
  });
// Define Subscription Routes
router.post("/", subscriptionController.addSubscription);
router.get("/", subscriptionController.getSubscriptions);
router.get("/subscriptionfront", subscriptionController.getSubscriptionsfront);
router.get("/:id", subscriptionController.getSubscription);
router.put("/:id", subscriptionController.updateSubscription);
router.delete("/:id", subscriptionController.deleteSubscription);
router.get('/matricule/:matricule', buildingController.getBuildingByMatricule);
module.exports = router;