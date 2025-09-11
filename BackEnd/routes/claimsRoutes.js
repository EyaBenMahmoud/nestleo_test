const express = require('express');
const { protect } = require('../Middlewares/AuthMiddleware');
const { 
  createClaim, 
  getUserClaims, 
  updateClaim, 
  deleteClaim,
  getTasksForClaim,
  convertClaimToTask
} = require('../Controllers/claimsController');

const router = express.Router();

router.use(protect);

router.post('/', createClaim);
router.get('/', getUserClaims);
router.get('/tasks', getTasksForClaim); 
router.put('/:id', updateClaim);
router.delete('/:id', deleteClaim);
router.post('/:claimId/convert-to-task', convertClaimToTask);
module.exports = router;