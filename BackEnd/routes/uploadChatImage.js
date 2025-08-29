// In your server-side routes (e.g., chatRoutes.js)
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../Middlewares/AuthMiddleware');
const Chat = require('../Models/Chat');
const Message = require('../Models/Message');

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/ChatFiles');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type. Only images, PDFs, and office documents are allowed.'));
  }
});

router.post('/Uploads/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const { chatId } = req.body;
    if (!chatId) {
      return res.status(400).json({ message: 'Chat ID is required' });
    }
    
    const chat = await Chat.findOne({
      _id: chatId,
      participants: req.user.id
    });
    
    if (!chat) {
      return res.status(403).json({ message: 'Not authorized to send files to this chat' });
    }
    
    // Use BASE_URL environment variable instead of dynamic protocol/host
    const baseUrl = process.env.BASE_URL;
    if (!baseUrl) {
      return res.status(500).json({ 
        message: 'Server configuration error',
        error: 'BASE_URL environment variable is not configured' 
      });
    }
    
    const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
    const isImage = req.file.mimetype.startsWith('image/');
    
    const message = new Message({
      chat: chatId,
      sender: req.user.id,
      content: {
        text: isImage ? null : req.file.originalname,
        media: [{
          type: isImage ? 'image' : 'file',
          url: fileUrl,
          filename: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        }]
      },
      readBy: [{ user: req.user.id }]
    });
    
    const savedMessage = await message.save();
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: savedMessage._id,
      $inc: { messageCount: 1 }
    });
    
    const populatedMessage = await Message.findById(savedMessage._id)
      .populate('sender', 'firstName lastName avatar role')
      .populate('readBy.user', 'firstName lastName');
    
    // Emit via Socket.IO
    const socketManager = req.app.get('socketManager');
    if (socketManager) {
      socketManager.io.to(chatId).emit('newMessage', populatedMessage);
    }
    
    // Update unread counts for other participants
    const recipients = chat.participants.filter(id => 
      id.toString() !== req.user.id.toString()
    );
    
    if (recipients.length > 0) {
      await Chat.updateOne(
        { _id: chatId },
        { $inc: { 'unreadCounts.$[elem].count': 1 } },
        { arrayFilters: [{ 'elem.user': { $in: recipients } }] }
      );
    }
    
    res.status(200).json(populatedMessage);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ message: 'Failed to upload file', error: error.message });
  }
});

module.exports = router;