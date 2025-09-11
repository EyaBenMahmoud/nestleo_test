import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async thunks
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/notifications');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch notifications');
    }
  }
);

export const markNotificationsAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationIds, { rejectWithValue }) => {
    try {
      await api.post('/api/notifications/mark-read', { notificationIds });
      return { notificationIds };
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to mark notifications as read');
    }
  }
);

export const markAllNotificationsAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      await api.post('/api/notifications/mark-all-read');
      return {};
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to mark all notifications as read');
    }
  }
);

export const deleteNotification = createAsyncThunk(
  'notifications/deleteNotification',
  async (notificationId, { rejectWithValue }) => {
    try {
      await api.delete(`/api/notifications/${notificationId}`);
      return { notificationId };
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to delete notification');
    }
  }
);

// Initial state
const initialState = {
  notifications: [],
  unreadCount: 0,
  recentNotification: null,
  loading: false,
  error: null
};

// Slice
const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action) => {
      state.notifications.unshift(action.payload);
      state.unreadCount += 1;
      state.recentNotification = action.payload;
    },
    clearRecentNotification: (state) => {
      state.recentNotification = null;
    },
    resetNotifications: () => initialState
  },
  extraReducers: (builder) => {
    builder
      // Fetch notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload.notifications;
        state.unreadCount = action.payload.unreadCount;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch notifications';
      })
      
      // Mark as read
      .addCase(markNotificationsAsRead.fulfilled, (state, action) => {
        const { notificationIds } = action.payload;
        state.notifications = state.notifications.map(notification => {
          if (notificationIds.includes(notification._id)) {
            return { ...notification, isRead: true };
          }
          return notification;
        });
        
        // Recalculate unread count
        state.unreadCount = state.notifications.filter(n => !n.isRead).length;
      })
      
      // Mark all as read
      .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
        state.notifications = state.notifications.map(notification => ({
          ...notification,
          isRead: true
        }));
        state.unreadCount = 0;
      })
      
      // Delete notification
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const { notificationId } = action.payload;
        const deletedNotification = state.notifications.find(n => n._id === notificationId);
        state.notifications = state.notifications.filter(n => n._id !== notificationId);
        
        // Update unread count if we deleted an unread notification
        if (deletedNotification && !deletedNotification.isRead) {
          state.unreadCount -= 1;
        }
      });
  }
});

export const { addNotification, clearRecentNotification, resetNotifications } = notificationsSlice.actions;
export default notificationsSlice.reducer;