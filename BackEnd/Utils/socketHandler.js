const Chat = require('../Models/Chat');
const User = require('../Models/User');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Join room for each chat the user is part of
    socket.on('joinChats', async (userId) => {
      try {
        const chats = await Chat.find({ participants: userId });
        chats.forEach(chat => {
          socket.join(chat._id.toString());
        });
        console.log(`User ${userId} joined their chats`);
      } catch (error) {
        console.error('Error joining chats:', error);
      }
    });

    // Handle new messages
    socket.on('sendMessage', async ({ chatId, senderId, content }) => {
      try {
        // Save message to database
        const chat = await Chat.findByIdAndUpdate(
          chatId,
          {
            $push: {
              messages: {
                sender: senderId,
                content: content
              }
            },
            $set: { lastMessage: new Date() }
          },
          { new: true }
        ).populate('messages.sender', 'firstName lastName avatar');

        if (!chat) {
          throw new Error('Chat not found');
        }

        const newMessage = chat.messages[chat.messages.length - 1];

        // Emit to all participants in the chat room
        io.to(chatId).emit('newMessage', {
          chatId,
          message: newMessage
        });

        // Emit notification to other participants
        chat.participants.forEach(participantId => {
          if (participantId.toString() !== senderId) {
            io.emit('newMessageNotification', {
              chatId,
              senderId,
              message: content.substring(0, 30) + (content.length > 30 ? '...' : '')
            });
          }
        });

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('messageError', { error: error.message });
      }
    });

    // Handle read receipts
    socket.on('markAsRead', async ({ chatId, userId }) => {
      try {
        await Chat.updateMany(
          { 
            _id: chatId,
            'messages.read': false,
            'messages.sender': { $ne: userId }
          },
          { $set: { 'messages.$[].read': true } }
        );

        io.to(chatId).emit('messagesRead', { chatId, userId });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
};