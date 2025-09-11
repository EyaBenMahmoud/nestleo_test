const cron = require('node-cron');
const User = require('../Models/User');  // Adjust the path based on your project structure
const { checkAndExpireContracts } = require('../Controllers/contractController');


const { deactivateInactiveUsers } = require("../Controllers/SubscriptionController");
const {  scheduleRecurringInvoice } = require('../Controllers/InvoiceController');





// Schedule the cron job to run every day at midnight
cron.schedule("0 0 * * *", () => {
  console.log("Running cron job to deactivate inactive users...");
  deactivateInactiveUsers();
});

const deactivateExpiredAccounts = async () => {
  try {
    const now = new Date();
    console.log('Checking expired accounts at:', now.toISOString());

    const expiredUsers = await User.find({ expiryDate: { $lte: now }, isActive: true });
    console.log('Users to deactivate:', expiredUsers.length);

    if (expiredUsers.length > 0) {
      await User.updateMany(
        { expiryDate: { $lte: now }, isActive: true },
        { $set: { isActive: false } }
      );
      console.log('Deactivated expired accounts.');

      const updatedUsers = await User.find({ expiryDate: { $lte: now }, isActive: false });
      console.log('Updated users count:', updatedUsers.length);
    } else {
      console.log('No expired accounts found.');
    }
  } catch (error) {
    console.error('Error deactivating accounts:', error);
  }
};

cron.schedule('0 0 * * *', deactivateExpiredAccounts);



// Schedule contract expiration cron job
cron.schedule('0 0 * * *', async () => {
    console.log(`[CRON] Running at ${new Date().toISOString()}...`);
    try {
      await checkAndExpireContracts();
      console.log('[CRON] Completed successfully.');
    } catch (error) {
      console.error('[CRON] Error:', error);
    }
  });



const GamificationHooks = require('./GamificationHooks');

// Initialize scheduled tasks
const initScheduledTasks = () => {
  // Reset monthly points on the 1st day of each month at 00:01
  cron.schedule('1 0 1 * *', async () => {
    console.log('Running monthly gamification maintenance...');
    try {
      await GamificationHooks.runMonthlyMaintenance();
      console.log('Monthly maintenance completed successfully');
    } catch (error) {
      console.error('Error in monthly maintenance task:', error);
    }
  });
};
module.exports = { deactivateExpiredAccounts ,   initScheduledTasks
 };
