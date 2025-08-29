const express = require('express');
const router = express.Router();
const { protect } = require('../Middlewares/AuthMiddleware');
const restrictTo = require('../Middlewares/CheckRole');
const {
  getConnectedUser,
  toggleUserStatus,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
S_AdmincreateUser,
  getAllUsersforcontract,
  changePassword,
  createCoowner,
  getAllCoowners,
  getUserById
} = require('../Controllers/userController');
const Chat = require('../Models/Chat');
const User = require('../Models/User');

// Public routes
router.get('/allU', getAllUsersforcontract);
// In your routes
router.get('/available', protect, async (req, res) => {
  try {
    // Step 1: Find all direct (non-group) chats involving the current user
    const userChats = await Chat.find({
      participants: req.user.id,
      isGroup: false
    }).select('participants');

    // Step 2: Build a set of user IDs who are already in chat with the current user
    const excludedUserIdsSet = new Set();

    // Add all chat participants except the current user
    userChats.forEach(chat => {
      chat.participants.forEach(participantId => {
        if (participantId.toString() !== req.user.id.toString()) {
          excludedUserIdsSet.add(participantId.toString());
        }
      });
    });

    // Always exclude the current user
    excludedUserIdsSet.add(req.user.id.toString());

    // Base query: exclude users already in chats
    let userQuery = {
      _id: { $nin: Array.from(excludedUserIdsSet) }
    };

    // Role-specific logic for filtering available users
    if (req.user.role === 'SyndicateAdmin') {
      // SyndicateAdmin can chat with: Admins, CoOwners, Workers, and SuperAdmin
      userQuery.role = {
        $in: ['Admin', 'SyndicateCoowner', 'Worker']
      };
    } 
    else if (req.user.role === 'Admin') {
      // Admin can chat with: SyndicateAdmins and Workers ONLY
      userQuery.role = {
        $in: ['SyndicateAdmin', 'Worker','SuperAdmin']
      };
    }
    else if (req.user.role === 'SuperAdmin') {
      // SuperAdmin can chat with ALL roles
      userQuery.role = {
        $in: ['Admin', 'Worker', 'SyndicateAdmin', 'SyndicateCoOwner', 'SuperAdmin']
      };
    }
    else if (req.user.role === 'Worker' || req.user.role === 'SyndicateCoOwner') {
      // Workers & CoOwners can ONLY see SyndicateAdmins in available users
      userQuery.role = 'SyndicateAdmin';
    }

    // Execute query and return results
    const users = await User.find(userQuery)
      .select('firstName lastName avatar role')
      .lean();

    res.json(users);
  } catch (error) {
    console.error('Error fetching available users:', error);
    res.status(500).json({ error: 'Failed to fetch available users' });
  }
});



// Public routes
router.get('/Coowners', getAllCoowners);
// Protected routes
router.use(protect);

router.post("/addCoowner",restrictTo("SyndicateAdmin"),createCoowner)

router.get('/getConnectedUser' ,getConnectedUser);

router.post("/addAdmin",restrictTo("SuperAdmin"),S_AdmincreateUser)
router.put('/change-password', changePassword);
router.get('/all', restrictTo('SuperAdmin','Admin'),getAllUsers);
router.post('/add', restrictTo('SuperAdmin'), createUser);
router.put('/:id', updateUser); 
router.delete('/:id', restrictTo('SuperAdmin',"SyndicateAdmin"), deleteUser );
router.get("/:id", getUserById);

router.patch('/:id/status', restrictTo('SuperAdmin',"SyndicateAdmin"), toggleUserStatus);
router.post('/delete-account', protect, require('../Controllers/userController').deleteOwnAccount);

module.exports = router;