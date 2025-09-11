const express = require('express');
const router = express.Router();
const { protect } = require('../Middlewares/AuthMiddleware');
const { 
  assignDelegate, 
  removeDelegate, 
  getUserDelegates, 
  getCoownersInBuilding,
  activateDelegation,
  updateDelegatePayment,
  getDelegationsForUser,
  acceptDelegation,
  declineDelegation
} = require('../Controllers/delegateController');

// Public route for delegate activation (no auth needed)
router.get('/activate/:token', activateDelegation);

// Protected routes
router.use(protect);
router.post('/assign', assignDelegate);
router.post('/remove', removeDelegate);
router.get('/user/:userId', getUserDelegates);
router.get('/delegations/:userId', getDelegationsForUser);
router.post('/accept', acceptDelegation);
router.post('/decline', declineDelegation);
router.get('/coowners/:userId', getCoownersInBuilding);
router.put('/payment/:delegateId', updateDelegatePayment);

module.exports = router;