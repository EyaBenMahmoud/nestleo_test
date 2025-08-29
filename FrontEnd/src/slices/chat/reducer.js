import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';
import { toast } from 'react-toastify';

export const fetchUserChats = createAsyncThunk('chat/fetchUserChats', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/api/chats');
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || 'Failed to fetch chats');
  }
});
// fetch available users for groups
export const fetchAvailableUsersForGroups = createAsyncThunk(
  'chat/fetchAvailableUsersForGroups',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/users/available-for-groups');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch users');
    }
  }
);
export const fetchChatMessages = createAsyncThunk(
  "chat/fetchMessages",
  async (chatId, { rejectWithValue }) => {
    try {
      // Check if chatId is valid before making the API call
      if (!chatId) {
        throw new Error("No chat ID provided");
      }

      const response = await api.get(`/api/chats/${chatId}/messages`);
      return { chatId, messages: response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const startIndividualChat = createAsyncThunk('chat/startIndividualChat', async ({ participantId }, { rejectWithValue }) => {
  try {
    const response = await api.post('/api/chats/individual', { participantId });
    return response.data;
  } catch (error) {
    toast.error(error.response?.data?.error || 'Failed to start chat');
    return rejectWithValue(error.response?.data || 'Failed to start chat');
  }
});


// Add participants to a group chat
export const addParticipants = createAsyncThunk(
  'chat/addParticipants',
  async ({ chatId, participantIds }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/chats/${chatId}/participants`, {
        participantIds
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to add participants');
    }
  }
);

// Remove a participant from a group chat
export const removeParticipant = createAsyncThunk(
  'chat/removeParticipant',
  async ({ chatId, participantId }, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/api/chats/${chatId}/participants/${participantId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to remove participant');
    }
  }
);

export const deleteChat = createAsyncThunk('chat/deleteChat', async ({ chatId }, { rejectWithValue }) => {
  try {
    await api.delete(`/api/chats/${chatId}`);
    toast.success('Chat deleted successfully');
    return { chatId };
  } catch (error) {
    toast.error(error.response?.data?.error || 'Failed to delete chat');
    return rejectWithValue(error.response?.data || 'Failed to delete chat');
  }
});

export const updateGroup = createAsyncThunk('chat/updateGroup', async ({ chatId, name, description }, { rejectWithValue }) => {
  try {
    const response = await api.patch(`/api/chats/${chatId}`, { name, description });
    toast.success('Group updated successfully');
    return response.data;
  } catch (error) {
    toast.error(error.response?.data?.error || 'Failed to update group');
    return rejectWithValue(error.response?.data || 'Failed to update group');
  }
});

export const getUnreadCount = createAsyncThunk('chat/getUnreadCount', async ({ chatId }, { rejectWithValue }) => {
  try {
    const response = await api.get(`/api/chats/${chatId}/unread`);
    return { chatId, count: response.data.count };
  } catch (error) {
    return rejectWithValue(error.response?.data || 'Failed to fetch unread count');
  }
});

export const searchMessages = createAsyncThunk('chat/searchMessages', async ({ chatId, query }, { rejectWithValue }) => {
  try {
    const response = await api.get(`/api/chats/${chatId}/search?query=${encodeURIComponent(query)}`);
    return { chatId, messages: response.data };
  } catch (error) {
    toast.error(error.response?.data?.error || 'Failed to search messages');
    return rejectWithValue(error.response?.data || 'Failed to search messages');
  }
});

// In your chat slice (reducer)
export const fetchAvailableUsers = createAsyncThunk('chat/fetchAvailableUsers', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/users/available');
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || 'Failed to fetch users');
  }
});
export const createRoleSpecificGroup = createAsyncThunk(
  'chat/createRoleSpecificGroup',
  async (groupData, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/chats/group', {
        name: groupData.groupName,
        description: groupData.groupDescription || '',
        participantIds: groupData.participants,
        groupType: groupData.groupType,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create group');
    }
  }
);


export const deleteMessage = createAsyncThunk(
  'chat/deleteMessage',
  async ({ chatId, messageId, isOptimistic = false, tempId = null }, { dispatch, rejectWithValue }) => {
    try {
      // If this is an optimistic message, we don't need to call the API
      if (isOptimistic) {
        // We still want the UI to update immediately
        dispatch(messageDeleted({ chatId, messageId, tempId }));
        return { chatId, messageId, tempId };
      }

      // For regular messages, call the API
      await api.delete(`/api/chats/${chatId}/messages/${messageId}`);

      // Return the necessary data
      return { chatId, messageId };
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to delete message');
    }
  }
);
// Add this new thunk action
export const fetchAvailableContacts = createAsyncThunk(
  'chat/fetchAvailableContacts',
  async (buildingId, { rejectWithValue }) => {
    try {
      const url = buildingId
        ? `/api/chats/contacts?buildingId=${buildingId}`
        : '/api/chats/contacts';

      const response = await api.get(url);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch contacts');
    }
  }
);


const initialState = {
  chats: [],
  messages: {},
  unreadCounts: {},
  searchResults: {},
  activeChatId: null,
  loading: false,
  error: null,
  successMessage: null,
  onlineUsers: [],
  contacts: [],
  typingUsers: {},
  availableUsers: [],
  groupAvailableUsers: [],
  searchResults: {},
  searchActive: false,
  searchQuery: '',
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveChat: (state, action) => {
      state.activeChatId = action.payload;
    },
    clearSuccessMessage: (state) => {
      state.successMessage = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    // Inside the chatSlice reducers section, replace the messageDeleted reducer

    // Update the messageDeleted reducer

    messageDeleted: (state, action) => {
      const { chatId, messageId } = action.payload;

      console.log("Processing message deletion in Redux:", action.payload);

      // First find and update the message in the messages array
      if (state.messages[chatId]) {
        const messageIndex = state.messages[chatId].findIndex(
          msg => msg._id === messageId
        );

        if (messageIndex !== -1) {
          // Mark the message as deleted and update its content
          state.messages[chatId][messageIndex] = {
            ...state.messages[chatId][messageIndex],
            deleted: true,
            content: {
              text: "This message was deleted",
              media: []
            }
          };
        }
      }

      // Then check if we need to update the chat's lastMessage
      const chatIndex = state.chats.findIndex(c => c._id === chatId);
      if (chatIndex !== -1) {
        const chat = state.chats[chatIndex];
        if (chat.lastMessage && chat.lastMessage._id === messageId) {
          chat.lastMessage = {
            ...chat.lastMessage,
            deleted: true,
            content: {
              text: "This message was deleted",
              media: []
            }
          };
        }
      }
    },

    // Simple additions from fetched data
    addNewMessage: (state, action) => {
      const message = action.payload;
      const chatId = message.chat;

      if (!state.messages[chatId]) {
        state.messages[chatId] = [];
      }

      // Check for duplicates (might happen due to socket re-connections)
      const existingMsgIndex = state.messages[chatId].findIndex(m => m._id === message._id);
      if (existingMsgIndex === -1) {
        state.messages[chatId].push(message);

        // Sort messages by createdAt
        state.messages[chatId].sort((a, b) =>
          new Date(a.createdAt) - new Date(b.createdAt)
        );
      }
    },
    updateChatLastMessage: (state, action) => {
      const { chatId, lastMessage } = action.payload;
      const chatIndex = state.chats.findIndex(chat => chat._id === chatId);

      if (chatIndex !== -1) {
        // Update lastMessage
        state.chats[chatIndex].lastMessage = lastMessage;

        // Move to top
        const chat = state.chats[chatIndex];
        state.chats.splice(chatIndex, 1);
        state.chats.unshift(chat);
      }
    },
    removeOptimisticMessage: (state, action) => {
      const { chatId, tempId } = action.payload;
      if (state.messages[chatId]) {
        state.messages[chatId] = state.messages[chatId].filter(msg => msg.tempId !== tempId);
      }
    },
    clearSearchResults: (state, action) => {
      const chatId = action.payload;
      state.searchResults[chatId] = [];
    },
    setOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    },
    setTyping(state, action) {
      const { chatId, userId, isTyping } = action.payload;


      // Safeguard: Ensure typingUsers is an object
      if (!state.typingUsers) {
        console.warn('typingUsers was undefined, initializing as {}');
        state.typingUsers = {};
      }

      // Initialize chatId array if it doesn't exist
      if (!state.typingUsers[chatId]) {
        state.typingUsers[chatId] = [];
      }

      if (isTyping) {
        if (userId && !state.typingUsers[chatId].includes(userId)) {
          state.typingUsers[chatId].push(userId);
        }
      } else {
        if (userId) {
          state.typingUsers[chatId] = state.typingUsers[chatId].filter((id) => id !== userId);
        }
      }

    },
    updateMessagesReadStatus: (state, action) => {
      const { chatId, messageIds, readByUserId, updatedMessages } = action.payload;

      if (state.messages && state.messages[chatId]) {
        // Replace messages with their updated versions
        if (updatedMessages && Array.isArray(updatedMessages) && updatedMessages.length > 0) {
          updatedMessages.forEach(updatedMsg => {
            const index = state.messages[chatId].findIndex(m => m && m._id === updatedMsg._id);
            if (index !== -1) {
              state.messages[chatId][index] = updatedMsg;
            }
          });
        }
        // Fallback if updatedMessages not provided
        else if (messageIds && Array.isArray(messageIds) && messageIds.length > 0 && readByUserId) {
          messageIds.forEach(msgId => {
            const msgIndex = state.messages[chatId].findIndex(msg => msg && msg._id === msgId);
            if (msgIndex !== -1) {
              // Find if user already in readBy
              const msg = state.messages[chatId][msgIndex];
              const readBy = Array.isArray(msg.readBy) ? msg.readBy : [];
              const userReadIndex = readBy.findIndex(r => r && r.user && r.user._id === readByUserId);

              // Add user to readBy if not already there
              if (userReadIndex === -1) {
                state.messages[chatId][msgIndex].readBy = [
                  ...readBy,
                  {
                    user: { _id: readByUserId },
                    status: 'seen',
                    timestamp: new Date().toISOString()
                  }
                ];
              }
            }
          });
        }
      }
    },
    clearMessages: (state) => {
      if (state.activeChatId) {
        state.messages[state.activeChatId] = [];
      }
    },


    updateChat: (state, action) => {
      const updatedChat = action.payload;
      const index = state.chats.findIndex(chat => chat._id === updatedChat._id);

      if (index !== -1) {
        state.chats[index] = updatedChat;
      }
    },
    // Update participant info in a chat
    updateParticipantInfo: (state, action) => {
      const { chatId, participantId, name, avatar, role } = action.payload;
      const chatIndex = state.chats.findIndex(chat => chat._id === chatId);

      if (chatIndex !== -1) {
        const participantIndex = state.chats[chatIndex].participants.findIndex(
          p => p._id === participantId
        );

        if (participantIndex !== -1) {
          const firstName = name?.split(' ')[0] || '';
          const lastName = name?.split(' ').slice(1).join(' ') || '';

          state.chats[chatIndex].participants[participantIndex] = {
            ...state.chats[chatIndex].participants[participantIndex],
            firstName,
            lastName,
            avatar,
            role
          };
        }
      }
    },
    // Move a chat to the top of the list
    moveToTop: (state, action) => {
      const chatId = action.payload;
      const chatIndex = state.chats.findIndex(chat => chat._id === chatId);

      if (chatIndex > 0) { // Only move if not already at top
        const chat = state.chats[chatIndex];
        state.chats.splice(chatIndex, 1);
        state.chats.unshift(chat);
      }
    }

  },
  extraReducers: (builder) => {
    builder
      //
      .addCase(fetchAvailableUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAvailableUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.availableUsers = action.payload;
      })
      .addCase(fetchAvailableUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      //
      .addCase(fetchUserChats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserChats.fulfilled, (state, action) => {
        state.loading = false;
        state.chats = action.payload;
        if (action.payload.length > 0 && !state.activeChatId) {
          state.activeChatId = action.payload[0]._id;
        }
      })
      .addCase(fetchUserChats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchChatMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChatMessages.fulfilled, (state, action) => {
        state.loading = false;
        const { chatId, messages } = action.payload;
        state.messages[chatId] = messages;
      })
      .addCase(fetchChatMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(startIndividualChat.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startIndividualChat.fulfilled, (state, action) => {
        const newChat = action.payload;

        // Check if we already have this chat
        const existingChatIndex = state.chats.findIndex(c => c._id === newChat._id);

        if (existingChatIndex !== -1) {
          // Replace existing chat with updated version
          state.chats[existingChatIndex] = newChat;
        } else {
          // Add new chat to the beginning of the list
          state.chats.unshift(newChat);
        }

        // Set this as the active chat
        state.activeChatId = newChat._id;
        state.loading = false;
      })
      // Add these cases to your extraReducers
      .addCase(fetchAvailableContacts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAvailableContacts.fulfilled, (state, action) => {
        state.loading = false;
        state.contacts = action.payload;
      })
      .addCase(fetchAvailableContacts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(startIndividualChat.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createRoleSpecificGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createRoleSpecificGroup.fulfilled, (state, action) => {
        state.chats.unshift(action.payload);
        state.activeChatId = action.payload._id;
        state.loading = false;
      })
      .addCase(createRoleSpecificGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteMessage.fulfilled, (state, action) => {
        const { chatId, messageId, tempId } = action.payload;
        if (state.messages[chatId]) {
          state.messages[chatId] = state.messages[chatId].map(message => {
            // Match by either regular ID or temp ID
            if (message._id === messageId ||
              (tempId && message.tempId === tempId) ||
              (message._id && message._id.includes(`temp-${tempId}`))) {

              return {
                ...message,
                deleted: true,
                content: {
                  ...message.content,
                  originalText: message.content.text,
                  text: "This message was deleted"
                }
              };
            }
            return message;
          });
        }
      })
      .addCase(addParticipants.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addParticipants.fulfilled, (state, action) => {
        const updatedChat = action.payload;
        const index = state.chats.findIndex(chat => chat._id === updatedChat._id);
        if (index !== -1) {
          state.chats[index] = updatedChat;
        }
        state.loading = false;
      })
      .addCase(addParticipants.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(removeParticipant.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeParticipant.fulfilled, (state, action) => {
        const updatedChat = action.payload;
        const index = state.chats.findIndex(chat => chat._id === updatedChat._id);
        if (index !== -1) {
          state.chats[index] = updatedChat;
        }
        state.loading = false;
      })
      .addCase(removeParticipant.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteChat.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteChat.fulfilled, (state, action) => {
        state.loading = false;
        const { chatId } = action.payload;
        // Filter out the deleted chat
        state.chats = state.chats.filter((chat) => chat._id !== chatId);
        // Remove messages, unread counts, and search results for the chat
        delete state.messages[chatId];
        delete state.unreadCounts[chatId];
        delete state.searchResults[chatId];
        // Clean up typing users for the deleted chat
        delete state.typingUsers[chatId];
        // Reset activeChatId if the deleted chat was active
        if (state.activeChatId === chatId) {
          state.activeChatId = state.chats.length > 0 ? state.chats[0]._id : null;
        }
      })
      .addCase(deleteChat.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateGroup.fulfilled, (state, action) => {
        const updatedChat = action.payload;
        const index = state.chats.findIndex(chat => chat._id === updatedChat._id);
        if (index !== -1) {
          state.chats[index] = updatedChat;
          // If this is the active chat, update it
          if (state.activeChatId === updatedChat._id) {
            state.currentChat = updatedChat;
          }
        }
        state.loading = false;
      })
      .addCase(updateGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getUnreadCount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUnreadCount.fulfilled, (state, action) => {
        state.loading = false;
        const { chatId, count } = action.payload;
        state.unreadCounts[chatId] = count;
      })
      .addCase(getUnreadCount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(searchMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.searchActive = true;
      })
      .addCase(searchMessages.fulfilled, (state, action) => {
        state.loading = false;
        const { chatId, messages } = action.payload;
        state.searchResults[chatId] = messages;
      })
      .addCase(searchMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.searchActive = false;
      })
      .addCase(fetchAvailableUsersForGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAvailableUsersForGroups.fulfilled, (state, action) => {
        state.loading = false;
        state.groupAvailableUsers = action.payload; // Store in a separate state property
      })
      .addCase(fetchAvailableUsersForGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
  },
});

export const {
  setActiveChat,
  clearSuccessMessage,
  clearError,
  addNewMessage,
  removeOptimisticMessage,
  updateMessageReadStatus,
  clearSearchResults,
  setOnlineUsers,
  setTyping,
  updateMessagesReadStatus,
  clearMessages,
  updateChat,
  updateChatParticipant,
  updateParticipantInfo,
  moveToTop,
  messageDeleted,
  updateChatLastMessage,
} = chatSlice.actions;

export default chatSlice.reducer;