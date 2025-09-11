const Chat = require('../Models/Chat');
const User = require('../Models/User');
const Message = require('../Models/Message');
const { socketManager } = require('../Socket/socketManager');
const NotificationController = require('./notificationsController');
const Building = require('../Models/Building');

class ChatController {

  static async sendMessage(req, res) {
    try {
      const { chatId } = req.params;
      const { content, replyTo } = req.body;
      const userId = req.user._id;

      // Validate chat and permissions
      const chat = await Chat.findOne({
        _id: chatId,
        participants: userId
      });

      if (!chat) {
        return res.status(403).json({ error: "Not authorized to send messages in this chat" });
      }

      // Validate replyTo message if provided
      if (replyTo) {
        const originalMessage = await Message.findOne({
          _id: replyTo,
          chat: chatId
        });

        if (!originalMessage) {
          return res.status(400).json({ error: "Original message not found" });
        }
      }

      // Create and save message
      const message = new Message({
        chat: chatId,
        sender: userId,
        content,
        replyTo: replyTo || null
      });

      const savedMessage = await message.save();

      // Update chat's last message
      await Chat.findByIdAndUpdate(chatId, {
        lastMessage: savedMessage._id
      });

      // Update unread counts for other participants
      const recipients = chat.participants.filter(id => id.toString() !== userId.toString());
      await Chat.updateOne(
        { _id: chatId },
        { $inc: { 'unreadCounts.$[elem].count': 1 } },
        { arrayFilters: [{ 'elem.user': { $in: recipients } }] }
      );

      // Populate sender info and replyTo message
      const populatedMessage = await Message.populate(savedMessage, [
        {
          path: 'sender',
          select: 'firstName lastName avatar role'
        },
        {
          path: 'replyTo',
          populate: {
            path: 'sender',
            select: 'firstName lastName avatar role'
          }
        }
      ]);

      const io = req.app.get('socketio');
      io.to(chatId).emit('newMessage', populatedMessage);

      res.status(201).json(populatedMessage);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  // Get user's allowed chats
  static async getUserChats(req, res) {
    try {
      const userId = req.user._id;
      const user = await User.findById(userId);

      const chats = await Chat.find({ participants: userId })
        .populate('participants', 'firstName lastName avatar role email phoneNumber city country')
        .populate('lastMessage')
        .sort({ updatedAt: -1 });

      res.status(200).json(chats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Start a 1:1 chat with role validation
  static async startIndividualChat(req, res) {
    try {
      const { participantId } = req.body;
      const userId = req.user._id;
      const user = await User.findById(userId);
      const participant = await User.findById(participantId);

      if (!participant) {
        return res.status(404).json({ error: "Participant not found" });
      }

      // Role-based communication rules
      const allowedPairs = {
        'SuperAdmin': ['Admin', 'SyndicateAdmin', 'Worker', 'SyndicateCoowner'],
        'Admin': ['SyndicateAdmin', 'Worker', 'SuperAdmin'],
        'SyndicateAdmin': ['Admin', 'SyndicateCoowner', 'Worker'],
        'SyndicateCoowner': ['SyndicateAdmin', 'SyndicateCoowner', 'Worker'],
        'Worker': ['SyndicateAdmin', 'Admin', 'SyndicateCoowner', 'Worker'],
      };

      if (!allowedPairs[user.role] || !allowedPairs[user.role].includes(participant.role)) {
        return res.status(403).json({
          error: `Not allowed to chat with ${participant.role} as ${user.role}`
        });
      }

      // Check if chat exists
      const existingChat = await Chat.findOne({
        isGroup: false,
        participants: { $all: [userId, participantId], $size: 2 }
      });

      if (existingChat) {
        return res.status(200).json(existingChat);
      }

      const chat = new Chat({
        participants: [userId, participantId],
        isGroup: false,
        allowedRoles: [user.role, participant.role]
      });

      await chat.save();
      res.status(201).json(chat);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  static async getAvailableContacts(req, res) {
    try {
      const userId = req.user._id;
      const user = await User.findById(userId);
      const buildingId = req.query.buildingId;

      // Get pagination parameters from query string
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      console.log("Fetching contacts for:");
      console.log("- User ID:", userId);
      console.log("- User Role:", user.role);
      console.log("- Building ID:", buildingId || "none");
      console.log("- Page:", page);
      console.log("- Limit:", limit);

      // Base query to exclude the current user
      const baseQuery = { _id: { $ne: userId } };

      // Add search functionality
      if (req.query.search) {
        const searchRegex = new RegExp(req.query.search, 'i');
        baseQuery.$or = [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex }
        ];
      }

      let contacts = [];
      let totalUsers = 0;

      switch (user.role) {
        case 'SuperAdmin': {
          // SuperAdmin can only see Admin users
          totalUsers = await User.countDocuments({
            ...baseQuery,
            role: 'Admin'
          });

          contacts = await User.find({
            ...baseQuery,
            role: 'Admin'
          })
            .select('firstName lastName avatar role email phoneNumber city country')
            .skip(skip)
            .limit(limit);
          break;
        }

        case 'Admin': {
          // Admin can see all SyndicateAdmins and SuperAdmin users
          totalUsers = await User.countDocuments({
            ...baseQuery,
            role: { $in: ['SyndicateAdmin', 'SuperAdmin', 'Worker'] }
          });

          contacts = await User.find({
            ...baseQuery,
            role: { $in: ['SyndicateAdmin', 'SuperAdmin', 'Worker'] }
          })
            .select('firstName lastName avatar role email phoneNumber city country')
            .skip(skip)
            .limit(limit);
          break;
        }

        case 'SyndicateAdmin': {
          // In ChatController.getAvailableContacts method

          // For SyndicateAdmin case with buildingId, update this block:
          if (buildingId) {
            // Get coOwners for the selected building
            const building = await Building.findById(buildingId).populate('coOwners');
            if (!building) {
              return res.status(404).json({ error: 'Building not found' });
            }

            // Get coOwner IDs from the building
            const coOwnerIds = building.coOwners.map(coOwner => coOwner._id);

            // Count total users across all categories
            const coOwnersCount = await User.countDocuments({
              _id: { $in: coOwnerIds, $ne: userId },
              ...(req.query.search ? { $or: baseQuery.$or } : {})
            });

            const workersCount = await User.countDocuments({
              ...baseQuery,
              role: 'Worker',
              ...(req.query.search ? { $or: baseQuery.$or } : {})
            });

            const adminsCount = await User.countDocuments({
              ...baseQuery,
              role: 'Admin',
              ...(req.query.search ? { $or: baseQuery.$or } : {})
            });

            totalUsers = coOwnersCount ;

            // IMPORTANT CHANGE: Get all users first, then apply pagination to the combined result
            // This ensures pages 2+ have proper data

            // Get all coOwners
            const coOwners = await User.find({
              _id: { $in: coOwnerIds, $ne: userId },
              ...(req.query.search ? { $or: baseQuery.$or } : {})
            })
              .select('firstName lastName avatar role email phoneNumber city country');

            // Combine all contacts
            const allContacts = [...coOwners];

            // Apply pagination to the combined result
            const startIndex = skip;
            const endIndex = Math.min(startIndex + limit, allContacts.length);
            contacts = allContacts.slice(startIndex, endIndex);

            console.log(`Page ${page}: returning contacts from index ${startIndex} to ${endIndex - 1} of ${allContacts.length} total`);
          } 
            
          break;
        }

        case 'SyndicateCoowner': {
          try {
            const buildings = await Building.find({ coOwners: userId }).populate('coOwners user');
            const buildingIds = buildings.map(b => b._id.toString());

            if (buildingId) {
              // 🔹 Check if user is actually a coOwner in this building
              if (!buildingIds.includes(buildingId.toString())) {
                console.log(`User ${userId} is not a coOwner in building ${buildingId}`);
                return res.status(200).json({
                  users: [],
                  pagination: {
                    totalUsers: 0,
                    totalPages: 0,
                    currentPage: page,
                    usersPerPage: limit,
                    hasNextPage: false,
                    hasPrevPage: false
                  },
                  warning: 'You are not a coOwner in this building'
                });
              }

              // 🔹 Get that specific building
              const building = await Building.findById(buildingId).populate('coOwners user');
              if (!building) {
                console.log(`Building ${buildingId} not found`);
                return res.status(200).json({
                  users: [],
                  pagination: {
                    totalUsers: 0,
                    totalPages: 0,
                    currentPage: page,
                    usersPerPage: limit,
                    hasNextPage: false,
                    hasPrevPage: false
                  },
                  warning: 'Building not found'
                });
              }

              // Prepare user IDs to fetch
              let userIdsToFetch = [];

              // Add SyndicateAdmin of this building
              if (building.user) {
                userIdsToFetch.push(building.user);
              }

              // Add other co-owners (excluding current user)
              building.coOwners.forEach(coOwnerId => {
                if (coOwnerId.toString() !== userId.toString()) {
                  userIdsToFetch.push(coOwnerId);
                }
              });

              // Count total matching users
              totalUsers = await User.countDocuments({
                _id: { $in: userIdsToFetch },
                ...(req.query.search ? { $or: baseQuery.$or } : {})
              });

              // Fetch paginated users
              contacts = await User.find({
                _id: { $in: userIdsToFetch },
                ...(req.query.search ? { $or: baseQuery.$or } : {})
              })
                .select('firstName lastName avatar role email phoneNumber city country')
                .skip(skip)
                .limit(limit);
            } else {
              // 🔹 If no building selected, return all syndicateAdmins of user's buildings
              const syndicateAdminIds = [
                ...new Set(
                  buildings
                    .map(b => (b.user ? b.user.toString() : null))
                    .filter(Boolean)
                ),
              ];

              // Count total matching users
              totalUsers = await User.countDocuments({
                _id: { $in: syndicateAdminIds },
                ...(req.query.search ? { $or: baseQuery.$or } : {})
              });

              // Fetch paginated users
              contacts = await User.find({
                _id: { $in: syndicateAdminIds },
                ...(req.query.search ? { $or: baseQuery.$or } : {})
              })
                .select('firstName lastName avatar role email phoneNumber city country')
                .skip(skip)
                .limit(limit);
            }
          } catch (error) {
            console.error('Error in SyndicateCoowner case:', error);
            return res.status(200).json({
              users: [],
              pagination: {
                totalUsers: 0,
                totalPages: 0,
                currentPage: page,
                usersPerPage: limit,
                hasNextPage: false,
                hasPrevPage: false
              },
              error: 'Error fetching contacts'
            });
          }
          break;
        }

        case 'Worker': {
          // Workers can only see other Workers and SyndicateAdmins
          totalUsers = await User.countDocuments({
            ...baseQuery,
            role: { $in: ['Worker', 'SyndicateAdmin', 'Admin'] },
            ...(req.query.search ? { $or: baseQuery.$or } : {})
          });

          contacts = await User.find({
            ...baseQuery,
            role: { $in: ['Worker', 'SyndicateAdmin', 'Admin'] },
            ...(req.query.search ? { $or: baseQuery.$or } : {})
          })
            .select('firstName lastName avatar role email phoneNumber city country')
            .skip(skip)
            .limit(limit);
          break;
        }

        default:
          contacts = [];
          totalUsers = 0;
      }

      // Add cache control headers to prevent 304 responses
      res.setHeader('Cache-Control', 'no-cache, no-store');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      console.log(`Returning ${contacts.length} of ${totalUsers} contacts`);

      // Return paginated response
      res.status(200).json({
        users: contacts,
        pagination: {
          totalUsers,
          totalPages: Math.ceil(totalUsers / limit),
          currentPage: page,
          usersPerPage: limit,
          hasNextPage: page * limit < totalUsers,
          hasPrevPage: page > 1
        }
      });
    } catch (error) {
      console.error('Error getting available contacts:', error);
      res.status(500).json({ error: error.message });
    }
  }
  // Create role-specific group chat
  static async createRoleSpecificGroup(req, res) {
    try {
      const { name, description, participantIds, groupType } = req.body;
      const userId = req.user._id;
      const user = await User.findById(userId);

      // Validate group type based on user role
      const allowedGroupTypes = {
        'Admin': ['Admin-SyndicateAdmin', 'Admin-Worker'],
        'SyndicateAdmin': ['SyndicateAdmin-Worker', 'SyndicateAdmin-Coowner']
      };

      if (!allowedGroupTypes[user.role] || !allowedGroupTypes[user.role].includes(groupType)) {
        return res.status(403).json({
          error: `Not allowed to create ${groupType} group as ${user.role}`
        });
      }

      // Verify participant roles
      const participants = await User.find({ _id: { $in: participantIds } });
      const requiredRoles = {
        'Admin-SyndicateAdmin': ['SyndicateAdmin'],
        'Admin-Worker': ['Worker'],
        'SyndicateAdmin-Worker': ['Worker'],
        'SyndicateAdmin-Coowner': ['SyndicateCoowner']
      };

      const invalidParticipants = participants.filter(
        p => !requiredRoles[groupType].includes(p.role)
      );

      if (invalidParticipants.length > 0) {
        return res.status(400).json({
          error: `These participants have invalid roles for ${groupType} group`
        });
      }

      const chat = new Chat({
        participants: [...participantIds, userId],
        isGroup: true,
        groupName: name,
        groupDescription: description,
        groupType,
        createdBy: userId,
        allowedRoles: [...requiredRoles[groupType], user.role]
      });

      await chat.save();


      // Get creator's full name
      const creator = await User.findById(userId).select('firstName lastName');

      // Send notifications to all participants except the creator
      for (const participantId of participantIds) {
        try {
          // Create notification in database
          const notification = await NotificationController.createNotification({
            recipient: participantId,
            type: 'alert',
            title: 'Added to New Group Chat',
            content: `${creator.firstName} ${creator.lastName} added you to "${name}" group chat`,
            relatedTo: chat._id,
            onModel: 'Chat',
            senderName: `${creator.firstName} ${creator.lastName}`,
            senderAvatar: userId
          });


          // Send real-time notification if user is online
          const recipientSocketId = socketManager.onlineUsers.get(participantId.toString());
          if (recipientSocketId) {
            console.log(`Sending new group notification to socket: ${recipientSocketId}`);
            socketManager.io.to(recipientSocketId).emit('notification', {
              ...notification.toObject(),
              chatId: chat._id
            });
          }
        } catch (notifError) {
          console.error(`Error creating notification for user ${participantId}:`, notifError);
          // Continue with other participants even if one notification fails
        }
      }

      // Notify all participants via socketIO to refresh their chat list
      const io = req.app.get('socketio');
      if (io) {
        for (const participantId of participantIds) {
          const recipientSocketId = socketManager.onlineUsers.get(participantId.toString());
          if (recipientSocketId) {
            io.to(recipientSocketId).emit('newChat', {
              chatId: chat._id
            });
          }
        }
      }


      res.status(201).json(chat);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get chat messages with role validation
  static async getChatMessages(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user._id;
      const user = await User.findById(userId);

      const chat = await Chat.findOne({
        _id: chatId,
        participants: userId
      });

      if (!chat) {
        return res.status(403).json({ error: "Not authorized to access this chat" });
      }

      // Additional role validation
      if (!chat.allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: "Your role is not allowed in this chat" });
      }

      const messages = await Message.find({ chat: chatId })
        .populate('sender', 'firstName lastName avatar role')
        .populate({
          path: 'replyTo',
          populate: {
            path: 'sender',
            select: 'firstName lastName avatar role'
          }
        })
        .sort({ createdAt: 1 });

      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  // Update the addParticipants method

  static async addParticipants(req, res) {
    try {
      const { chatId } = req.params;
      const { participantIds } = req.body;
      const userId = req.user._id;

      // Convert strings to ObjectIds if needed
      const userIdStr = userId.toString();

      // Find the chat with proper query and populate creator
      const chat = await Chat.findOne({
        _id: chatId,
        isGroup: true
      }).populate('createdBy', 'firstName lastName avatar');

      if (!chat) {
        return res.status(404).json({ error: "Group chat not found" });
      }

      // Check if user is creator
      if (chat.createdBy._id.toString() !== userIdStr) {
        return res.status(403).json({ error: "Not authorized to modify this group" });
      }

      // Check if participants have valid roles
      const participants = await User.find({
        _id: { $in: participantIds }
      });

      if (participants.length !== participantIds.length) {
        return res.status(400).json({ error: "Some users were not found" });
      }

      // Check if participants have allowed roles
      const invalidParticipants = participants.filter(
        p => !chat.allowedRoles.includes(p.role)
      );

      if (invalidParticipants.length > 0) {
        return res.status(400).json({
          error: "Some users have invalid roles for this group"
        });
      }

      // Filter to only add participants that aren't already in the chat
      const existingParticipantIds = chat.participants.map(p => p.toString());
      const newParticipantIds = participantIds.filter(
        id => !existingParticipantIds.includes(id.toString())
      );

      if (newParticipantIds.length === 0) {
        return res.status(200).json({
          message: "All participants are already in the group",
          chat: chat
        });
      }

      // Use proper MongoDB update operation
      await Chat.findByIdAndUpdate(
        chatId,
        { $addToSet: { participants: { $each: newParticipantIds } } },
        { new: true }
      );

      // Fetch the updated chat with populated fields to return
      const updatedChat = await Chat.findById(chatId)
        .populate('participants', 'firstName lastName avatar role email phoneNumber city country')
        .populate('lastMessage');

      // Get user who is adding participants
      const currentUser = await User.findById(userId).select('firstName lastName');

      // Import NotificationController
      const NotificationController = require('./notificationsController');
      const { socketManager } = require('../Socket/socketManager');

      // Create and send notifications to new participants
      for (const participantId of newParticipantIds) {
        try {
          // Create notification in database
          const notification = await NotificationController.createNotification({
            recipient: participantId,
            type: 'alert',
            title: 'Added to Group Chat',
            content: `${currentUser.firstName} ${currentUser.lastName} added you to "${chat.groupName}" group chat`,
            relatedTo: chatId,
            onModel: 'Chat',
            senderName: `${currentUser.firstName} ${currentUser.lastName}`,
            senderAvatar: userId
          });

          // Send real-time notification if user is online
          const recipientSocketId = socketManager.onlineUsers.get(participantId.toString());
          if (recipientSocketId) {
            console.log(`Sending group add notification to socket: ${recipientSocketId}`);
            socketManager.io.to(recipientSocketId).emit('notification', {
              ...notification.toObject(),
              chatId: chatId
            });
          }
        } catch (notifError) {
          console.error(`Error creating notification for user ${participantId}:`, notifError);
          // Continue with other participants even if one notification fails
        }
      }

      // Notify via WebSocket about new participants
      const io = req.app.get('socketio');
      if (io) {
        newParticipantIds.forEach(participantId => {
          io.to(chatId).emit('newParticipant', {
            chatId,
            participantId,
            addedBy: {
              id: userId,
              name: `${currentUser.firstName} ${currentUser.lastName}`
            }
          });
        });
      }

      res.status(200).json(updatedChat);
    } catch (error) {
      console.error("Add participants error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // Update the removeParticipant method

  static async removeParticipant(req, res) {
    try {
      const { chatId, participantId } = req.params;
      const userId = req.user._id;

      // Convert IDs to strings for comparison
      const userIdStr = userId.toString();

      // Find chat with proper query
      const chat = await Chat.findOne({
        _id: chatId,
        isGroup: true
      }).populate('createdBy', 'firstName lastName avatar');

      if (!chat) {
        return res.status(404).json({ error: "Group chat not found" });
      }

      // Check if user is creator
      if (chat.createdBy._id.toString() !== userIdStr) {
        return res.status(403).json({ error: "Not authorized to modify this group" });
      }

      // Check if participant exists in the chat
      const participantExists = chat.participants.some(
        p => p.toString() === participantId
      );

      if (!participantExists) {
        return res.status(404).json({ error: "Participant not found in this group" });
      }

      // Get participant details before removal
      const removedParticipant = await User.findById(participantId);
      const currentUser = await User.findById(userId);

      // Use proper MongoDB update operation
      await Chat.findByIdAndUpdate(
        chatId,
        { $pull: { participants: participantId } },
        { new: true }
      );

      // Fetch the updated chat with populated fields to return
      const updatedChat = await Chat.findById(chatId)
        .populate('participants', 'firstName lastName avatar role email phoneNumber city country')
        .populate('lastMessage');

      // Import NotificationController
      const NotificationController = require('./notificationsController');
      const { socketManager } = require('../Socket/socketManager');

      // Create notification for the removed participant
      if (removedParticipant) {
        try {
          // Create notification in database
          const notification = await NotificationController.createNotification({
            recipient: participantId,
            type: 'alert',
            title: 'Removed from Group Chat',
            content: `${currentUser.firstName} ${currentUser.lastName} removed you from "${chat.groupName}" group chat`,
            relatedTo: null, // No relatedTo since they can't access the chat anymore
            onModel: 'Chat',
            senderName: `${currentUser.firstName} ${currentUser.lastName}`,
            senderAvatar: userId
          });

          // Send real-time notification to the removed user if they're online
          const recipientSocketId = socketManager.onlineUsers.get(participantId.toString());
          if (recipientSocketId) {
            console.log(`Sending group removal notification to socket: ${recipientSocketId}`);
            socketManager.io.to(recipientSocketId).emit('notification', {
              ...notification.toObject(),
              chatId: null // Don't include chatId as they're removed
            });
          }
        } catch (notifError) {
          console.error(`Error creating notification for removed user ${participantId}:`, notifError);
        }
      }

      // Notify remaining participants via WebSocket
      const io = req.app.get('socketio');
      if (io) {
        io.to(chatId).emit('participantRemoved', {
          chatId,
          participantId,
          removedBy: {
            id: userId,
            name: `${currentUser.firstName} ${currentUser.lastName}`
          },
          participantName: removedParticipant ? `${removedParticipant.firstName} ${removedParticipant.lastName}` : 'User'
        });
      }

      res.status(200).json(updatedChat);
    } catch (error) {
      console.error("Remove participant error:", error);
      res.status(500).json({ error: error.message });
    }
  }
  //delete chat
  static async deleteChat(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user._id;

      const chat = await Chat.findOne({
        _id: chatId,
        $or: [
          { createdBy: userId },
          { participants: userId, isGroup: false }
        ]
      });

      if (!chat) {
        return res.status(403).json({ error: "Not authorized to delete this chat" });
      }

      // Delete all messages in the chat
      await Message.deleteMany({ chat: chatId });

      // Delete the chat itself
      await Chat.deleteOne({ _id: chatId });

      // Notify via WebSocket - fixed version
      const io = req.app.get('socketio');
      if (io) {
        // Emit to all participants (using the chat room)
        io.to(chatId).emit('chatDeleted', { chatId });
      }

      res.status(200).json({ message: "Chat deleted successfully" });
    } catch (error) {
      console.error("Delete chat error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // Update group info
  static async updateGroup(req, res) {
    try {
      const { chatId } = req.params;
      const { name, description } = req.body;
      const userId = req.user._id;

      // First find the chat to verify it exists and user has access
      const chatExists = await Chat.findOne({
        _id: chatId,
        isGroup: true
      });

      if (!chatExists) {
        return res.status(404).json({ error: "Group chat not found" });
      }

      // Check if user is creator
      if (chatExists.createdBy.toString() !== userId.toString()) {
        return res.status(403).json({ error: "Not authorized to update this group" });
      }

      // Now perform the update with proper validation
      const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        {
          $set: {
            groupName: name,
            groupDescription: description
          }
        },
        {
          new: true,
          runValidators: true
        }
      ).populate('participants', 'firstName lastName avatar role email phoneNumber city country')
        .populate('lastMessage');

      // Notify via WebSocket
      const io = req.app.get('socketio');
      if (io) {
        io.to(chatId).emit('groupUpdated', updatedChat);
      }

      console.log("Group updated successfully:", updatedChat);
      res.status(200).json(updatedChat);
    } catch (error) {
      console.error("Error updating group:", error);
      res.status(500).json({ error: error.message });
    }
  }
  // Get unread messages count
  static async getUnreadCount(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user._id;

      const chat = await Chat.findOne({
        _id: chatId,
        participants: userId
      });

      if (!chat) {
        return res.status(403).json({ error: "Not authorized to access this chat" });
      }

      const unreadEntry = chat.unreadCounts.find(
        entry => entry.user.toString() === userId.toString()
      );

      res.status(200).json({ count: unreadEntry?.count || 0 });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Search messages
  // Update the searchMessages method
  static async searchMessages(req, res) {
    try {
      const { chatId } = req.params;
      const { query } = req.query;
      const userId = req.user._id;

      if (!query || query.trim() === '') {
        return res.status(400).json({ error: "Search query is required" });
      }

      const chat = await Chat.findOne({
        _id: chatId,
        participants: userId
      });

      if (!chat) {
        return res.status(403).json({ error: "Not authorized to search this chat" });
      }

      // Improved search query using text index or regex
      // First try using text index if available
      let messages;
      try {
        messages = await Message.find({
          chat: chatId,
          $text: { $search: query },
          deleted: { $ne: true } // Exclude deleted messages
        })
          .populate('sender', 'firstName lastName avatar')
          .sort({ score: { $meta: "textScore" } }) // Sort by relevance
          .limit(50); // Limit results
      } catch (error) {
        // Fall back to regex search if text index fails
        messages = await Message.find({
          chat: chatId,
          'content.text': { $regex: query, $options: 'i' }, // Case-insensitive search
          deleted: { $ne: true } // Exclude deleted messages
        })
          .populate('sender', 'firstName lastName avatar')
          .sort({ createdAt: -1 }) // Sort by date (newest first)
          .limit(50); // Limit results
      }

      res.status(200).json(messages);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // Update the deleteMessage method
  static async deleteMessage(req, res) {
    try {
      const { chatId, messageId } = req.params;
      const userId = req.user._id;

      // First check if user has access to this chat
      const chat = await Chat.findOne({
        _id: chatId,
        participants: userId
      });

      if (!chat) {
        return res.status(403).json({ error: "Not authorized to access this chat" });
      }

      // Find the message and check if user is sender
      const message = await Message.findOne({
        _id: messageId,
        chat: chatId
      });

      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      // Only allow message sender or group admin to delete
      if (message.sender.toString() !== userId.toString() &&
        chat.createdBy?.toString() !== userId.toString()) {
        return res.status(403).json({ error: "Not authorized to delete this message" });
      }

      // Instead of deleting, mark as deleted
      message.deleted = true;
      message.deletedBy = userId;
      message.deletedAt = new Date();

      // Save the original content before replacing it
      if (message.content && !message.originalContent) {
        message.originalContent = { ...message.content };
        message.content.text = "This message was deleted";
      }

      await message.save();

      // Check if this is the last message in the chat
      if (chat.lastMessage && chat.lastMessage.toString() === messageId) {
        // Find the new last message
        const newLastMessage = await Message.findOne(
          { chat: chatId, deleted: { $ne: true } }, // Skip deleted messages
          {},
          { sort: { createdAt: -1 } }
        );

        // Update chat's lastMessage
        if (newLastMessage) {
          await Chat.findByIdAndUpdate(chatId, { lastMessage: newLastMessage._id });
        } else {
          // No messages left
          await Chat.findByIdAndUpdate(chatId, { $unset: { lastMessage: 1 } });
        }
      }

      // Notify via socket
      const io = req.app.get('socketio');
      if (io) {
        io.to(chatId).emit('messageDeleted', { chatId, messageId });
      }

      res.status(200).json({ message: "Message deleted successfully" });
    } catch (error) {
      console.error("Delete message error:", error);
      res.status(500).json({ error: error.message });
    }
  }
}



module.exports = ChatController;