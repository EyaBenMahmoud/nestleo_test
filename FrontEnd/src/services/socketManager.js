import io from 'socket.io-client';
import { store } from '../store';
import { toast } from 'react-toastify';
import {
  addNewMessage,
  deleteChat,
  messageDeleted,
  removeOptimisticMessage,
  setActiveChat,
  setOnlineUsers,
  setTyping,
  updateMessagesReadStatus
} from '../slices/chat/reducer';
import { addNotification } from '../slices/Notification/slice';
import { showNotification } from './notificationService';
import { updateUserGamification } from '../slices/login/loginSlice';

let socketInstance = null;
let pendingMessages = [];


const initializeSocket = () => {
  if (socketInstance?.connected) return socketInstance;

  const token = localStorage.getItem('token');
  if (!token) {
    console.error('No token found for socket authentication');
    return;
  }

  socketInstance = io(process.env.REACT_APP_API_URL || 'http://localhost:8000', {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socketInstance.on('connect', () => {
    console.log('Socket connected:', socketInstance.id);
    const userId = store.getState().Loginn.user?.id;
    if (userId) {
      socketInstance.emit('userOnline', { userId });
      processPendingMessages();
    }
  });

  socketInstance.on('connectionVerified', ({ userId, socketId }) => {
    console.log(`Connection verified for user ${userId}, socket ${socketId}`);
  });

  // event listener for online users before returning
  socketInstance.on('onlineUsers', (users) => {
    console.log('Received online users update:', users?.length || 0);

    // Update Redux store
    store.dispatch(setOnlineUsers(users));

    // IMPORTANT: Also emit custom DOM event for components not connected to Redux
    document.dispatchEvent(new CustomEvent('onlineUsersUpdated', {
      detail: { users, count: users?.length || 0 }
    }));
  });

  const playNotificationSound = () => {
    const audio = new Audio('/notif.mp3');
    audio.play().catch(e => console.log('Error playing sound:', e));
  };
  // function to check if user is in the same chat (this is only for test)
  const isUserInChat = (chatId) => {
    // Don't use localStorage or other complex logic - this is causing issues
    // Just directly check the current Redux state
    const state = store.getState();
    return state.chat.activeChatId === chatId;
  };

  // Update the 'newMessage' event handler
  socketInstance.on('newMessage', (data) => {
    // Check if this is a confirmation of a temp message we sent
    if (data.tempId) {
      // Remove any loading temporary message with this tempId
      const state = store.getState();
      const chatId = data.chat;
      const messages = state.chat.messages[chatId] || [];
      const tempMessage = messages.find(m =>
        m._id === `temp-${data.tempId}` ||
        m.tempId === data.tempId
      );

      if (tempMessage) {
        // Remove the temporary message first
        store.dispatch(removeOptimisticMessage({ chatId, tempId: data.tempId }));
      }
    }

    // Add the confirmed message from the server
    store.dispatch(addNewMessage(data));
  });


  socketInstance.on('chatUpdated', (data) => {
    store.dispatch({
      type: 'chat/updateChatLastMessage',
      payload: data
    });
  });
  socketInstance.on('messageDeleted', (data) => {
    console.log("Message deleted event received:", data);

    // Dispatch to Redux
    store.dispatch(messageDeleted(data));

    // Force UI update with DOM event
    document.dispatchEvent(new CustomEvent('messageDeleted', {
      detail: data
    }));
  });

  socketInstance.on('notification', (data) => {
    console.log('Received notification:', data);
    // Check if this is a badge notification
    if (data.gamification && (data.reason === 'badge_earned' || data.badge)) {
      console.log('Badge notification received - delaying display by 5s');

      // For badge notifications, wait 5 seconds before showing
      setTimeout(() => {
        store.dispatch(addNotification(data));
        showNotification(data);
        playNotificationSound();
      }, 3000); // 5 second delay
    }
    if (data.type === 'message' && data.chatId) {
      const state = store.getState();
      if (state.chat.activeChatId !== data.chatId) {
        // Important: Dispatch to store first
        store.dispatch(addNotification(data));
        // Then show the toast notification
        showNotification(data);
        playNotificationSound();
      }

    } else {
      store.dispatch(addNotification(data));
      showNotification(data);
      playNotificationSound();
    }

    // Check if this is a gamification notification and update user state
    if (data.gamification && data.points) {
      console.log('Gamification notification received:', data);

      // Get the current user
      const currentUser = store.getState().Loginn?.user;

      if (currentUser && currentUser.id) {
        try {
          // Create a proper update object
          let updatedGamification = {
            // Keep existing gamification data
            ...(currentUser.gamification || {})
          };

          // Update total and monthly points
          updatedGamification.totalPoints = (updatedGamification.totalPoints || 0) + data.points;
          updatedGamification.monthlyPoints = (updatedGamification.monthlyPoints || 0) + data.points;

          // Initialize buildings map if it doesn't exist
          if (!updatedGamification.buildings) {
            updatedGamification.buildings = new Map();
          }

          // If we have building-specific data, update it
          if (data.buildingId) {
            const buildingId = data.buildingId.toString();
            const buildingData = updatedGamification.buildings.get(buildingId) || {
              totalPoints: 0,
              monthlyPoints: 0
            };

            // Update building-specific points
            buildingData.totalPoints = (buildingData.totalPoints || 0) + data.points;
            buildingData.monthlyPoints = (buildingData.monthlyPoints || 0) + data.points;

            // Update specific streaks based on notification reason
            if (data.reason === 'voting') {
              buildingData.votingStreak = (data.streak || (buildingData.votingStreak || 0) + 1);
              buildingData.lastVote = new Date().toISOString();
            }
            else if (data.reason === 'early_payment') {
              buildingData.paymentStreak = (data.streak || (buildingData.paymentStreak || 0) + 1);
              buildingData.lastPayment = new Date().toISOString();
            }
            else if (data.reason === 'meeting_attendance') {
              buildingData.meetingStreak = (data.streak || (buildingData.meetingStreak || 0) + 1);
              buildingData.lastMeeting = new Date().toISOString();
            }

            // Update the building in the map
            updatedGamification.buildings.set(buildingId, buildingData);
          }

          // Dispatch the action to update user's gamification data
          store.dispatch(updateUserGamification(updatedGamification));


        } catch (error) {
          console.error('Error updating gamification data:', error);
        }
      }
    }
  });
  socketInstance.on('messageError', ({ tempId, message }) => {
    console.error('Message error:', message);
    store.dispatch(removeOptimisticMessage({ chatId: message.chat, tempId }));
  });


  socketInstance.on('onlineUsers', (users) => store.dispatch(setOnlineUsers(users)));
  socketInstance.on('typing', ({ chatId, userId, isTyping }) => store.dispatch(setTyping({ chatId, userId, isTyping })));
  socketInstance.on('messagesRead', handleMessagesRead);
  socketInstance.on('connect_error', (error) => console.error('Socket connection error:', error.message));
  socketInstance.on('disconnect', () => console.log('Socket disconnected'));

  return socketInstance;
};

export const getSocketInstance = () => {
  if (!socketInstance?.connected) {
    return initializeSocket();
  }
  return socketInstance;
};

const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};


//when a user joins a chat, emit an event to the server
const joinChat = (chatId) => {
  if (socketInstance?.connected) {
    socketInstance.emit('joinChat', { chatId });
    console.log(`Joined chat room: ${chatId || 'none'}`);
  } else {
    pendingMessages.push({ event: 'joinChat', data: { chatId } });
    initializeSocket();
  }
};


//  function to manually refresh online users
const refreshOnlineUsers = () => {
  if (socketInstance?.connected) {
    socketInstance.emit('getOnlineUsers');
    return true;
  } else {
    // Initialize if not connected
    const socket = initializeSocket();
    if (socket) {
      socket.emit('getOnlineUsers');
      return true;
    }
    return false;
  }
};


// send message 
const sendMessage = async (chatId, content, tempId, file = null, replyToObject = null, replyToId = null) => {
  // Clear typing indicator immediately
  emitTyping(chatId, false);

  // Get the current user info from Redux store
  const currentUser = store.getState().Loginn.user;
  const userId = currentUser?.id || currentUser?._id;

  // Create a consistent sender object for the optimistic message
  const senderObject = {
    _id: userId,
    firstName: currentUser?.firstName || '',
    lastName: currentUser?.lastName || '',
    avatar: currentUser?.avatar || null
  };

  // Create optimistic message with proper identification
  const optimisticMessage = {
    _id: `temp-${tempId}`,
    chat: chatId,
    sender: senderObject,
    content: { text: content, media: [] },
    replyTo: replyToObject ? { 
      _id: replyToObject._id || replyToObject,
      sender: replyToObject.sender || { firstName: 'User' },
      content: replyToObject.content || { text: 'Message' }
    } : null,
    createdAt: new Date().toISOString(),
    tempId,
    // Add this field to clearly mark the message as coming from the current user
    isFromCurrentUser: true
  };

  // Add loading message to UI
  if (!file) {
    store.dispatch(addNewMessage(optimisticMessage));
  }

  try {
    // If there's a file, handle it first
    if (file) {
      const loadingToast = toast.loading("Uploading file...");

      // Upload the file
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/upload`, {
        method: 'POST',
        body: form,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!res.ok) {
        throw new Error(`Upload failed with status ${res.status}`);
      }

      const data = await res.json();
      const media = [{
        type: file.type.startsWith('image/') ? 'image' : 'file',
        url: data.url,
        filename: data.filename,
        mimetype: data.mimetype,
        size: data.size
      }];

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      // Send the message with media
      if (socketInstance?.connected) {
        socketInstance.emit('sendMessage', { chatId, content, tempId, media, replyTo: replyToId });
      } else {
        pendingMessages.push({ event: 'sendMessage', data: { chatId, content, tempId, media, replyTo: replyToId } });
        initializeSocket();
      }
    } else {
      // For text-only messages
      if (socketInstance?.connected) {
        socketInstance.emit('sendMessage', { chatId, content, tempId, media: [], replyTo: replyToId });
      } else {
        pendingMessages.push({ event: 'sendMessage', data: { chatId, content, tempId, media: [], replyTo: replyToId } });
        initializeSocket();
      }

      // Set a timeout to show error if message isn't confirmed within 5 seconds
      setTimeout(() => {
        const state = store.getState();
        const messages = state.chat.messages[chatId] || [];
        const tempMessage = messages.find(m => m._id === `temp-${tempId}` || m.tempId === tempId);

        if (tempMessage && tempMessage.loading) {
          // Message still showing as loading after timeout - mark as failed
          store.dispatch(removeOptimisticMessage({ chatId, tempId }));
          toast.error("Message failed to send. Please try again.");
        }
      }, 5000);
    }
  } catch (err) {
    console.error('Message sending failed:', err);
    store.dispatch(removeOptimisticMessage({ chatId, tempId }));
    toast.error(file ? 'Failed to upload file' : 'Failed to send message');
  }
};


const emitTyping = (chatId, isTyping) => {
  const userId = store.getState().Loginn.user?.id;
  if (!chatId || !userId) return;
  if (socketInstance?.connected) {
    socketInstance.emit('typing', { chatId, userId, isTyping });
  } else {
    initializeSocket();
  }
};


// UPDATED: Mark as read with acknowledgment callback
const markAsRead = (chatId, messageIds) => {
  if (socketInstance?.connected) {
    socketInstance.emit('markAsRead', { chatId, messageIds }, response => {
      if (!response?.success) {
        console.error('Failed to mark messages as read:', response?.message);
      }
    });
  } else {
    const socket = initializeSocket();
    if (socket) {
      socket.emit('markAsRead', { chatId, messageIds }, response => {
        if (!response?.success) {
          console.error('Failed to mark messages as read:', response?.message);
        }
      });
    }
  }
};

const handleMessagesRead = (data) => {
  store.dispatch(updateMessagesReadStatus(data));
};


const processPendingMessages = () => {
  if (socketInstance?.connected && pendingMessages.length) {
    pendingMessages.forEach(({ event, data }) => socketInstance.emit(event, data));
    pendingMessages = [];
  }
};


// UPDATED: Handle delete chat more directly
const handleDeleteChat = () => {
  const activeChatId = store.getState().chat.activeChatId;

  if (activeChatId) {
    // Leave the chat room
    if (socketInstance?.connected) {
      socketInstance.emit('joinChat', { chatId: null });
    }

    // Delete the chat
    store.dispatch(deleteChat({ chatId: activeChatId }))
      .unwrap()
      .then(() => {
        store.dispatch(setActiveChat(null));
        toast.success("Chat deleted successfully");
      })
      .catch((error) => {
        console.error("Error deleting chat:", error);
        toast.error("Failed to delete chat");
      });
  }
};

const leaveChat = () => {
  if (socketInstance?.connected) {
    socketInstance.emit('joinChat', { chatId: null });
    console.log('Left all chat rooms');

    // When leaving chat, make sure the Redux state is updated
    // This ensures notifications work when you're not viewing any chat
    if (store) {
      store.dispatch(setActiveChat(null));
    }
  }
};

// Add a new function to delete messages via socket
export const deleteMessageSocket = (chatId, messageId) => {
  console.log(`Requesting message deletion: chat=${chatId}, message=${messageId}`);

  // Show loading indicator
  const loadingToast = toast.loading("Deleting message...");

  return new Promise((resolve, reject) => {
    if (socketInstance?.connected) {
      // First try socket-based deletion (faster)
      socketInstance.emit('deleteMessage', { chatId, messageId });

      // Set up a one-time listener for success
      const successListener = ({ messageId: deletedMsgId }) => {
        if (deletedMsgId === messageId) {
          socketInstance.off('messageDeleteSuccess', successListener);
          socketInstance.off('error', errorListener);
          toast.dismiss(loadingToast);
          toast.success("Message deleted");
          resolve();
        }
      };

      // Set up error listener
      const errorListener = (error) => {
        console.error("Socket delete message error:", error);
        socketInstance.off('messageDeleteSuccess', successListener);
        socketInstance.off('error', errorListener);

        // Fall back to REST API
        deleteMessageREST(chatId, messageId)
          .then(() => {
            toast.dismiss(loadingToast);
            resolve();
          })
          .catch(err => {
            toast.dismiss(loadingToast);
            toast.error("Failed to delete message");
            reject(err);
          });
      };

      // Set timeout to fall back to REST API if no response
      setTimeout(() => {
        socketInstance.off('messageDeleteSuccess', successListener);
        socketInstance.off('error', errorListener);

        // Fall back to REST API
        deleteMessageREST(chatId, messageId)
          .then(() => {
            toast.dismiss(loadingToast);
            resolve();
          })
          .catch(err => {
            toast.dismiss(loadingToast);
            toast.error("Failed to delete message");
            reject(err);
          });
      }, 3000); // 3 second timeout

      socketInstance.once('messageDeleteSuccess', successListener);
      socketInstance.once('error', errorListener);
    } else {
      // Fall back to REST API if socket isn't connected
      deleteMessageREST(chatId, messageId)
        .then(() => {
          toast.dismiss(loadingToast);
          resolve();
        })
        .catch(err => {
          toast.dismiss(loadingToast);
          toast.error("Failed to delete message");
          reject(err);
        });
    }
  });
};
// REST API fallback for message deletion
export const deleteMessageREST = (chatId, messageId) => {
  const token = localStorage.getItem('token');

  if (!token) {
    return Promise.reject(new Error("Authentication token not found"));
  }

  return fetch(`${process.env.REACT_APP_API_URL}/api/chats/${chatId}/messages/${messageId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  })
    .then(response => {
      if (!response.ok) throw new Error('Failed to delete message');
      return response.json();
    });
};

export {
  initializeSocket,
  disconnectSocket,
  joinChat,
  sendMessage,
  refreshOnlineUsers,
  emitTyping,
  leaveChat,
  handleDeleteChat,
  markAsRead,
  handleMessagesRead
};