const socketio = require('socket.io');
const jwt = require('jsonwebtoken');
const Message = require('../Models/Message');
const User = require('../Models/User');
const Chat = require('../Models/Chat');
const NotificationController = require('../Controllers/notificationsController');
const NotificationModel = require('../Models/notification');
const Poll = require('../Models/poll');
const Event = require('../Models/Event');
const gamificationHooks = require('../Utils/GamificationHooks');
class SocketManager {
  constructor() {
    this.io = null;
    this.onlineUsers = new Map();
  }

  initialize(server) {
    this.io = socketio(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production'
          ? [process.env.CLIENT_URL]
          : ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    console.log('👂 Socket.IO initialized');
  }

  setupMiddleware() {
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication token missing'));

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Handle user online status
      this.handleUserOnline(socket);

      socket.on('getOnlineUsers', () => {
        // Send the current list of online users to the requester
        socket.emit('onlineUsers', Array.from(this.onlineUsers.keys()));
      });

      socket.on('joinChat', (data) => this.handleJoinChat(socket, data));
      socket.on('sendMessage', (data) => this.handleSendMessage(socket, data));
      socket.on('typing', (data) => this.handleTyping(socket, data));

      socket.on('markAsRead', (data, acknowledge) => {
        this.handleMarkAsRead(socket, data, acknowledge);
      });
      socket.on('disconnect', () => this.handleDisconnect(socket));

      socket.on('deleteChat', async ({ chatId }) => {
        try {
          // Handle chat deletion via socket if needed
          console.log(`Chat ${chatId} deleted by user ${socket.userId}`);

          // Notify all participants
          const chat = await Chat.findById(chatId);
          if (chat) {
            chat.participants.forEach(participant => {
              this.io.to(participant.toString()).emit('chatDeleted', { chatId });
            });
          }
        } catch (error) {
          console.error('Error handling chat deletion:', error);
        }
      });

      // Poll event handlers
      socket.on('joinEvent', (data) => this.handleJoinEvent(socket, data));

      socket.on('deleteMessage', async (data) => {
        try {
          const { chatId, messageId } = data;

          // Validate the request
          if (!chatId || !messageId) {
            return socket.emit('error', { message: 'Invalid request data' });
          }

          // Find the message
          const message = await Message.findOne({
            _id: messageId,
            chat: chatId
          });

          if (!message) {
            return socket.emit('error', { message: 'Message not found' });
          }

          // Check permissions
          if (message.sender.toString() !== socket.userId) {
            const chat = await Chat.findById(chatId);
            // Only allow sender or chat creator to delete messages
            if (!chat || chat.createdBy?.toString() !== socket.userId) {
              return socket.emit('error', { message: 'Not authorized to delete this message' });
            }
          }

          // Mark as deleted
          message.deleted = true;
          message.deletedBy = socket.userId;
          message.deletedAt = new Date();

          // Store original content
          if (message.content && !message.originalContent) {
            message.originalContent = JSON.parse(JSON.stringify(message.content));
            message.content = {
              text: "This message was deleted",
              media: []
            };
          }

          await message.save();

          // Update chat's lastMessage if needed
          const chat = await Chat.findById(chatId);
          if (chat && chat.lastMessage && chat.lastMessage.toString() === messageId) {
            chat.lastMessage = message;
            await chat.save();
          }

          // Broadcast to everyone in the chat room
          this.io.to(chatId).emit('messageDeleted', {
            chatId,
            messageId,
            deletedBy: {
              _id: socket.userId
            }
          });

          // Send acknowledgment back to sender
          socket.emit('messageDeleteSuccess', { messageId });

        } catch (error) {
          console.error('Error handling deleteMessage:', error);
          socket.emit('error', { message: 'Failed to delete message' });
        }
      });



      // only for test 
      socket.on('leavePoll', (data) => this.handleLeavePoll(socket, data));
      socket.on('votePoll', (data) => this.handleVotePoll(socket, data));
      socket.on('startPollSequence', (data) => this.handleStartPollSequence(socket, data));
      socket.on('stopPollSequence', (data) => this.handleStopPollSequence(socket, data));
      socket.on('startPoll', (data) => this.handleStartPoll(socket, data));
      socket.on('stopPoll', (data) => this.handleStopPoll(socket, data));
      socket.on('checkActivePoll', (data) => this.handleCheckActivePoll(socket, data));
    });
  }

  async handleUserOnline(socket) {
    const { userId } = socket;
    try {
      const user = await User.findById(userId);
      if (!user) {
        socket.disconnect();
        return;
      }

      // Handle existing connections
      if (this.onlineUsers.has(userId)) {
        const oldSocketId = this.onlineUsers.get(userId);
        const oldSocket = this.io.sockets.sockets.get(oldSocketId);
        oldSocket?.disconnect(true);
      }

      this.onlineUsers.set(userId, socket.id);
      this.io.emit('onlineUsers', Array.from(this.onlineUsers.keys()));
      console.log(`User ${userId} online (socket: ${socket.id})`);

      socket.emit('connectionVerified', { userId, socketId: socket.id });
    } catch (error) {
      console.error('Error handling user online:', error);
      socket.disconnect();
    }
  }

  async handleDisconnect(socket) {
    if (socket.userId && this.onlineUsers.has(socket.userId)) {
      this.onlineUsers.delete(socket.userId);
      this.io.emit('onlineUsers', Array.from(this.onlineUsers.keys()));
      console.log(`User ${socket.userId} disconnected`);
    }
  }
  // Fix the handleJoinChat method to properly handle room joining:

  async handleJoinChat(socket, { chatId }) {
    try {
      // Leave all current chat rooms first
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          socket.leave(room);
          console.log(`User ${socket.userId} left chat room: ${room}`);
        }
      }

      // If no chatId provided, we're just leaving rooms
      if (!chatId) {
        return;
      }

      // Find the chat and check membership
      const chat = await Chat.findOne({
        _id: chatId,
        participants: socket.userId,
      });

      if (!chat) {
        return socket.emit('error', { message: 'Chat not found or access denied' });
      }

      // Join the chat room
      socket.join(chatId);
      console.log(`User ${socket.userId} joined chat room: ${chatId}`);

      // Notify other chat members that this user is viewing the chat
      socket.to(chatId).emit('userViewingChat', {
        chatId,
        userId: socket.userId
      });

    } catch (error) {
      console.error('Error joining chat:', error);
      socket.emit('error', { message: 'Error joining chat' });
    }
  }



  async handleSendMessage(socket, { chatId, content, tempId, media = [], replyTo = null }) {
    try {
      const user = await User.findById(socket.userId);
      const chat = await Chat.findById(chatId)
        .populate('participants', 'firstName lastName avatar role');

      if (!chat || !chat.participants.some(p => p._id.toString() === socket.userId)) {
        return socket.emit('messageError', { tempId, message: 'Not authorized' });
      }
      if (!chat.allowedRoles.includes(user.role)) {
        return socket.emit('messageError', { tempId, message: `Role ${user.role} not allowed` });
      }

      // Validate replyTo message if provided
      if (replyTo) {
        const originalMessage = await Message.findOne({
          _id: replyTo,
          chat: chatId
        });
        
        if (!originalMessage) {
          return socket.emit('messageError', { tempId, message: 'Original message not found' });
        }
      }

      const message = new Message({
        chat: chatId,
        sender: socket.userId,
        content: { text: content, media },
        replyTo: replyTo || null,
        readBy: [{ user: socket.userId }]
      });
      const saved = await message.save();

      await Chat.findByIdAndUpdate(chatId, {
        lastMessage: saved._id,
        $inc: { messageCount: 1 },
        updatedAt: new Date()
      });

      const populated = await Message.findById(saved._id)
        .populate('sender', 'firstName lastName avatar role')
        .populate({
          path: 'replyTo',
          populate: {
            path: 'sender',
            select: 'firstName lastName avatar role'
          }
        })
        .populate('readBy.user', 'firstName lastName');

      const messageData = { ...populated.toObject(), tempId };
      this.io.to(chatId).emit('newMessage', messageData);

      // Mettre à jour les non‐lus
      const recipients = chat.participants.filter(p => p._id.toString() !== socket.userId.toString());
      await Chat.updateOne(
        { _id: chatId },
        { $inc: { 'unreadCounts.$[elem].count': 1 } },
        { arrayFilters: [{ 'elem.user': { $in: recipients.map(p => p._id) } }] }
      );

      for (const recipient of recipients) {
        // Get recipient's socket ID
        const recipientSocketId = this.onlineUsers.get(recipient._id.toString());
        const recipientSocket = this.io.sockets.sockets.get(recipientSocketId);

        // Check if recipient is actively viewing this chat
        const isInChat = recipientSocket &&
          Array.from(recipientSocket.rooms || []).includes(chatId);

        // Debug log to help troubleshoot
        console.log(`Checking notification for ${recipient._id}: 
    Online: ${Boolean(recipientSocketId)}, 
    In Chat Room: ${isInChat}, 
    Socket rooms: ${recipientSocket ? Array.from(recipientSocket.rooms || []) : 'N/A'}`);

        // Create notification if recipient is not in this chat
        if (!isInChat) {
          console.log(`Creating notification for recipient ${recipient._id} who is not in chat ${chatId}`);

          // Create notification in database
          const notification = await NotificationController.createNotification({
            // Your existing notification creation code
            recipient: recipient._id,
            type: 'message',
            title: chat.isGroup ? chat.groupName : `${user.firstName} ${user.lastName}`,
            content: media.length ? 'Sent an attachment' : content,
            relatedTo: chatId,
            onModel: 'Chat',
            senderName: `${user.firstName} ${user.lastName}`,
            senderAvatar: `${user.avatar}`,
          });

          // If recipient is online, send real-time notification
          if (recipientSocketId) {
            this.io.to(recipientSocketId).emit('notification', {
              ...notification.toObject(),
              chatId,
              message: messageData
            });
          }
        } else {
          console.log(`Skipping notification for recipient ${recipient._id} who is already in chat ${chatId}`);
        }
      }

      // Update clients about chat
      this.io.to(chatId).emit('chatUpdated', {
        chatId,
        lastMessage: {
          _id: saved._id,
          content: { text: content, media },
          createdAt: saved.createdAt
        }
      });
    } catch (err) {
      console.error('Error sending message:', err);
      socket.emit('messageError', { tempId, message: 'Error sending message' });
    }
  }



  handleTyping(socket, { chatId, isTyping }) {
    console.log(`Typing event: user ${socket.userId} in chat ${chatId}, isTyping: ${isTyping}`);
    socket.to(chatId).emit('typing', {
      chatId,
      userId: socket.userId,
      isTyping,
    });
  }

  async handleMarkAsRead(socket, { chatId, messageIds }, acknowledge) {
    try {
      const userId = socket.userId;

      // Validate chat membership
      const chat = await Chat.findOne({
        _id: chatId,
        participants: userId
      });

      if (!chat) {
        if (acknowledge) acknowledge({ success: false, message: 'Not authorized' });
        return;
      }

      // Update all specified messages
      const updateResult = await Message.updateMany(
        {
          _id: { $in: messageIds },
          chat: chatId,
          'readBy.user': { $ne: userId }
        },
        { $addToSet: { readBy: { user: userId } } }
      );

      // If no messages were updated, return early
      if (updateResult.modifiedCount === 0) {
        if (acknowledge) acknowledge({ success: true, alreadyRead: true });
        return;
      }

      // Get updated messages with populated readBy AND sender fields
      const updatedMessages = await Message.find({
        _id: { $in: messageIds }
      })
        .populate('sender', 'firstName lastName avatar role')
        .populate('readBy.user', 'firstName lastName avatar');

      // Broadcast to all chat participants with complete message data
      this.io.to(chatId).emit('messagesRead', {
        chatId,
        messageIds,
        readByUserId: userId,
        updatedMessages: updatedMessages.map(msg => msg.toObject())
      });

      if (acknowledge) acknowledge({
        success: true,
        updatedMessages: updatedMessages.map(msg => msg.toObject())
      });

      console.log(`User ${userId} marked messages as read in chat ${chatId}:`, messageIds);
    } catch (error) {
      console.error('Error marking messages as read:', error);
      if (acknowledge) acknowledge({
        success: false,
        message: 'Error marking as read'
      });
    }
  }

  async handleJoinEvent(socket, { eventId }) {
    if (!eventId) return;

    try {
      const event = await Event.findById(eventId);
      if (!event) {
        return socket.emit('error', { message: 'Event not found' });
      }

      // Get user details
      const user = await User.findById(socket.userId);
      if (!user) {
        return socket.emit('error', { message: 'User not found' });
      }

      // Add user to active participants if not already there
      const isAlreadyJoined = event.meeting.activeParticipants.some(
        p => p.userId.toString() === socket.userId.toString()
      );

      if (!isAlreadyJoined) {
        event.meeting.activeParticipants.push({
          userId: socket.userId,
          role: user.role,
          joinedAt: new Date()
        });
        await event.save();

        // Broadcast participant joined
        this.io.to(`event-${eventId}`).emit('participantJoined', {
          userId: socket.userId,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role
        });

        // Award gamification points for meeting attendance - ONLY for co-owners
        if (user.role === 'SyndicateCoowner') {
          try {
            // Check if we've already awarded points for this event/user
            if (!event.meeting.rewardedAttendees) {
              event.meeting.rewardedAttendees = [];
            }

            // Check if user already received points for this meeting
            const alreadyRewarded = event.meeting.rewardedAttendees.some(
              id => id.toString() === socket.userId.toString()
            );

            if (!alreadyRewarded) {
              // Add user to rewarded attendees list
              event.meeting.rewardedAttendees.push(socket.userId);
              await event.save();


              const transaction = await gamificationHooks.handleEventAttendance(event, socket.userId);

              if (transaction) {
                // Create notification
                const NotificationController = require('../Controllers/notificationsController');
                const notification = await NotificationController.createNotification({
                  recipient: socket.userId,
                  type: 'alert',
                  title: 'Meeting Attendance Reward',
                  content: `You earned ${transaction.amount} points for attending "${event.title}"!`,
                  relatedTo: transaction._id,
                  onModel: 'gamification',
                  senderName: 'Gamification System',
                  isActionable: false
                });

                // Send notification to user
                const recipientSocketId = this.onlineUsers.get(socket.userId.toString());
                if (recipientSocketId && notification) {
                  this.io.to(recipientSocketId).emit('notification', {
                    ...notification.toObject(),
                    gamification: true,
                    points: transaction.amount,
                    onModel: 'gamification',
                    reason: transaction.reason,
                    relatedId: event._id,
                    buildingId: event.building._id,
                    progress: {
                      current: user.gamification.monthlyPoints,
                      nextMilestone: 100 // Or calculate based on badge requirements
                    }
                  });
                }

                console.log(`Awarded meeting attendance points to user ${socket.userId} for event ${eventId}`);
              }
            }
          } catch (gamificationError) {
            console.error('Failed to award gamification points:', gamificationError);
            // Don't fail the join process if gamification fails
          }
        }
      }

      // Join the event room
      socket.join(`event-${eventId}`);
      console.log(`User ${socket.userId} joined event room: event-${eventId}`);

      // Find active poll if any
      const activePoll = await Poll.findOne({
        event: eventId,
        status: 'active'
      });

      if (activePoll) {
        socket.emit('pollStarted', activePoll);
      }
    } catch (error) {
      console.error('Error joining event room:', error);
      socket.emit('error', { message: 'Error joining event' });
    }
  }

  async handleLeavePoll(socket, { eventId }) {
    if (!eventId) return;

    try {
      const event = await Event.findById(eventId);
      if (event) {
        // Remove user from active participants
        event.meeting.activeParticipants = event.meeting.activeParticipants.filter(
          p => p.userId.toString() !== socket.userId.toString()
        );
        await event.save();

        // Broadcast participant left
        this.io.to(`event-${eventId}`).emit('participantLeft', {
          userId: socket.userId
        });
      }

      socket.leave(`event-${eventId}`);
      console.log(`User ${socket.userId} left event room: event-${eventId}`);
    } catch (error) {
      console.error('Error leaving event:', error);
    }
  }

  // Add this method to your SocketManager class
  async handleCheckActivePoll(socket, { eventId }) {
    try {
      if (!eventId) {
        return socket.emit('error', { message: 'Event ID is required' });
      }

      // Find active poll for this event
      const activePoll = await Poll.findOne({
        event: eventId,
        status: 'active'
      });

      if (activePoll) {
        console.log(`Active poll found for event ${eventId}, sending to user ${socket.userId}`);
        // Use pollStarted consistently (not pollActive)
        socket.emit('pollStarted', activePoll);

        // If it's a multi-question poll, also send the current question
        if (activePoll.questions && activePoll.questions.length > 0) {
          const currentQuestionIndex = activePoll.currentQuestion > 0 ?
            activePoll.currentQuestion - 1 : 0;

          socket.emit('questionChanged', {
            pollId: activePoll._id,
            questionIndex: currentQuestionIndex,
            question: activePoll.questions[currentQuestionIndex],
            totalQuestions: activePoll.questions.length
          });
        }
      } else {
        console.log(`No active poll found for event ${eventId}`);
        socket.emit('noPollActive', { eventId });
      }
    } catch (error) {
      console.error('Error checking for active poll:', error);
      socket.emit('error', { message: 'Error checking for active poll' });
    }
  }


  async handleVotePoll(socket, { pollId, questionIndex, optionIndex }) {
    try {
      // Validate inputs
      if (pollId === undefined || questionIndex === undefined || optionIndex === undefined) {
        return socket.emit('error', { message: 'Missing required fields' });
      }

      console.log(`User ${socket.userId} voting for poll ${pollId}, question ${questionIndex}, option ${optionIndex}`);

      const poll = await Poll.findById(pollId);
      if (!poll) {
        return socket.emit('error', { message: 'Poll not found' });
      }

      if (poll.status !== 'active') {
        return socket.emit('error', { message: 'Poll is not active' });
      }

      // Validate question and option indices
      if (
        questionIndex < 0 ||
        questionIndex >= poll.questions.length ||
        optionIndex < 0 ||
        optionIndex >= poll.questions[questionIndex].options.length
      ) {
        return socket.emit('error', { message: 'Invalid question or option index' });
      }

      // Check if user already voted for this specific question
      const existingVote = poll.responses.find(
        response =>
          response.user.toString() === socket.userId.toString() &&
          response.questionIndex === questionIndex
      );

      if (existingVote) {
        return socket.emit('error', { message: 'You have already voted for this question' });
      }

      // Add vote to the specific question's option
      poll.questions[questionIndex].options[optionIndex].votes += 1;

      // Record the response
      poll.responses.push({
        user: socket.userId,
        questionIndex,
        optionIndex,
        votedAt: new Date()
      });

      await poll.save();
      // Get active participants count instead of stored participants
      const event = await Event.findById(poll.event);
      const votingParticipants = event.meeting.activeParticipants.filter(
        p => p.role === 'SyndicateAdmin' || p.role === 'SyndicateCoowner'
      );
      const totalParticipants = votingParticipants.length || 1; // At least 1 participant

      // Count unique voters for this question
      const uniqueVoters = new Set();
      poll.responses.forEach(response => {
        if (response.questionIndex === questionIndex) {
          uniqueVoters.add(response.user.toString());
        }
      });
      const votedCount = uniqueVoters.size;

      // Check if time is expired
      const timeExpired = remainingTime <= 0;
      // Broadcast vote update
      this.io.to(`event-${poll.event}`).emit('voteRecorded', {
        pollId: poll._id,
        questionIndex,
        optionIndex,
        userId: socket.userId
      });

      // Confirm vote to sender
      socket.emit('voteConfirmed', { pollId, questionIndex, optionIndex });
      // Broadcast vote completion status
      this.io.to(`event-${poll.event}`).emit('voteCompletionUpdated', {
        pollId: poll._id,
        questionIndex,
        votedCount: uniqueVoters.size,
        totalParticipants,
        timeExpired,
        allVoted: uniqueVoters.size >= totalParticipants
      });
      // Also emit on timer expiry
      if (timeExpired) {
        this.io.to(`event-${poll.event}`).emit('voteCompletionUpdated', {
          pollId: poll._id,
          questionIndex,
          votedCount,
          totalParticipants,
          timeExpired: true
        });
      }



    } catch (error) {
      console.error('Error handling vote:', error);
      socket.emit('error', { message: 'Error recording vote: ' + error.message });
    }
  }

  // Handle stopping poll sequence
  async handleStopPollSequence(socket, { eventId }) {
    try {
      // Verify user is admin
      const user = await User.findById(socket.userId);
      if (!user || user.role !== 'SyndicateAdmin') {
        return socket.emit('error', { message: 'Only SyndicateAdmin can stop poll sequences' });
      }

      // Find and stop any active polls for this event
      const activePolls = await Poll.find({
        event: eventId,
        status: 'active'
      });

      if (activePolls.length === 0) {
        return socket.emit('error', { message: 'No active polls found for this event' });
      }

      for (const poll of activePolls) {
        poll.status = 'completed';
        poll.endedAt = new Date();
        poll.active = false;
        await poll.save();
      }

      // Broadcast sequence stopped
      this.io.to(`event-${eventId}`).emit('pollSequenceStopped', { eventId });

    } catch (error) {
      console.error('Error stopping poll sequence:', error);
      socket.emit('error', { message: 'Error stopping poll sequence' });
    }
  }

  // Handle starting a single poll
  async handleStartPoll(socket, { pollId }) {
    try {
      // Verify user is admin
      const user = await User.findById(socket.userId);
      if (!user || user.role !== 'SyndicateAdmin') {
        return socket.emit('error', { message: 'Only SyndicateAdmin can start polls' });
      }

      const poll = await Poll.findById(pollId);
      if (!poll) {
        return socket.emit('error', { message: 'Poll not found' });
      }

      // Only start if pending
      if (poll.status !== 'pending') {
        return socket.emit('error', { message: 'Poll is already active or completed' });
      }

      poll.status = 'active';
      poll.startedAt = new Date();
      poll.active = true;
      await poll.save();

      // Broadcast poll start
      this.io.to(`event-${poll.event}`).emit('pollStarted', poll);

      // Schedule poll end after duration
      setTimeout(async () => {
        try {
          const updatedPoll = await Poll.findById(pollId);
          if (updatedPoll && updatedPoll.status === 'active') {
            updatedPoll.status = 'completed';
            updatedPoll.endedAt = new Date();
            updatedPoll.active = false;
            await updatedPoll.save();

            // Broadcast poll ended
            this.io.to(`event-${updatedPoll.event}`).emit('pollEnded', updatedPoll);
          }
        } catch (error) {
          console.error('Error ending poll:', error);
        }
      }, poll.duration * 1000);

    } catch (error) {
      console.error('Error starting poll:', error);
      socket.emit('error', { message: 'Error starting poll' });
    }
  }

  async handleStopPoll(socket, { pollId }) {
    try {
      // Verify user is admin
      const user = await User.findById(socket.userId);
      if (!user || user.role !== 'SyndicateAdmin') {
        return socket.emit('error', { message: 'Only SyndicateAdmin can stop polls' });
      }

      const poll = await Poll.findById(pollId);
      if (!poll) {
        return socket.emit('error', { message: 'Poll not found' });
      }

      if (poll.status !== 'active') {
        return socket.emit('error', { message: 'Poll is not active' });
      }

      poll.status = 'completed';
      poll.endedAt = new Date();
      poll.active = false;
      await poll.save();

      // Broadcast poll end
      this.io.to(`event-${poll.event}`).emit('pollEnded', poll);

      // Find and start the next poll if available - ADD THIS CODE
      setTimeout(async () => {
        const nextPoll = await Poll.findOne({
          event: poll.event,
          status: 'pending',
          order: { $gt: poll.order }
        }).sort({ order: 1 });

        if (nextPoll) {
          nextPoll.status = 'active';
          nextPoll.startedAt = new Date();
          nextPoll.active = true;
          await nextPoll.save();

          this.io.to(`event-${nextPoll.event}`).emit('pollStarted', nextPoll);
        }
      }, 5000); // Wait 5 seconds before starting the next poll
    } catch (error) {
      console.error('Error stopping poll:', error);
      socket.emit('error', { message: 'Error stopping poll' });
    }
  }

  async handleStartPollSequence(socket, { eventId }) {
    try {
      // Verify user is admin
      const user = await User.findById(socket.userId);
      if (!user || user.role !== 'SyndicateAdmin') {
        return socket.emit('error', { message: 'Only SyndicateAdmin can start poll sequences' });
      }

      // Find the first pending poll
      const firstPoll = await Poll.findOne({
        event: eventId,
        status: 'pending'
      }).sort({ order: 1 });

      if (!firstPoll) {
        return socket.emit('error', { message: 'No pending polls found for this event' });
      }

      // Start the first poll
      firstPoll.status = 'active';
      firstPoll.startedAt = new Date();
      firstPoll.active = true;
      await firstPoll.save();

      // Broadcast poll start
      this.io.to(`event-${eventId}`).emit('pollStarted', firstPoll);
      this.io.to(`event-${eventId}`).emit('pollSequenceStarted', { eventId });

      // Schedule poll end after duration
      setTimeout(async () => {
        try {
          const updatedPoll = await Poll.findById(firstPoll._id);
          if (updatedPoll && updatedPoll.status === 'active') {
            updatedPoll.status = 'completed';
            updatedPoll.endedAt = new Date();
            updatedPoll.active = false;
            await updatedPoll.save();

            // Broadcast poll ended
            this.io.to(`event-${updatedPoll.event}`).emit('pollEnded', updatedPoll);

            // Find and start the next poll if available
            setTimeout(async () => {
              const nextPoll = await Poll.findOne({
                event: updatedPoll.event,
                status: 'pending',
                order: { $gt: updatedPoll.order }
              }).sort({ order: 1 });

              if (nextPoll) {
                nextPoll.status = 'active';
                nextPoll.startedAt = new Date();
                nextPoll.active = true;
                await nextPoll.save();

                this.io.to(`event-${nextPoll.event}`).emit('pollStarted', nextPoll);
              } else {
                // No more polls, end the sequence
                this.io.to(`event-${eventId}`).emit('pollSequenceCompleted', { eventId });
              }
            }, 5000); // Wait 5 seconds before starting the next poll
          }
        } catch (error) {
          console.error('Error ending poll:', error);
        }
      }, firstPoll.duration * 1000);

    } catch (error) {
      console.error('Error starting poll sequence:', error);
      socket.emit('error', { message: 'Error starting poll sequence' });
    }
  }
}

const socketManager = new SocketManager();
module.exports = {
  socketManager,
  initializeSocket: (server) => socketManager.initialize(server),
};