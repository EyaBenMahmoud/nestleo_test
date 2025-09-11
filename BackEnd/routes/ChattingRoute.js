const express = require('express');
const router = express.Router();
const ChatController = require('../Controllers/ChattingController'); // Import the ChatController
const { protect } = require('../Middlewares/AuthMiddleware'); // Middleware to verify syndicate admin

// send message to chat (with role validation)
router.post('/:chatId/messages', protect, ChatController.sendMessage);

// Get user's allowed chats
router.get('/', protect, ChatController.getUserChats);

// Start a 1:1 chat (with role validation)
router.post('/individual', protect, ChatController.startIndividualChat);


// Create a group chat (with role validation)
router.post('/group', protect, ChatController.createRoleSpecificGroup);

// Add this route to your existing routes
router.get('/contacts', protect, ChatController.getAvailableContacts);

// Get chat messages (with role validation)
router.get('/:chatId/messages', protect, ChatController.getChatMessages);


// Add participants to group (Admin/SyndicateAdmin only)
router.post('/:chatId/participants', protect, ChatController.addParticipants);

// Remove participant from group (Admin/SyndicateAdmin only)
router.delete('/:chatId/participants/:participantId', protect, ChatController.removeParticipant);



// delete message 
router.delete('/:chatId/messages/:messageId', protect, ChatController.deleteMessage);

// Delete chat (Owner/Admin only)
router.delete('/:chatId', protect, ChatController.deleteChat);


// Update group info
router.patch('/:chatId', protect, ChatController.updateGroup);

// Get unread messages count
router.get('/:chatId/unread', protect, ChatController.getUnreadCount);

// Search messages in chat
router.get('/:chatId/search', protect, ChatController.searchMessages);



module.exports = router;