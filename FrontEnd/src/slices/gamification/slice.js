import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchUserGamification = createAsyncThunk(
  'gamification/fetchUserGamification',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/gamification/profile/${userId}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

export const fetchLeaderboard = createAsyncThunk(
  'gamification/fetchLeaderboard',
  async ({ type = 'all-time', limit = 10 }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/gamification/leaderboard?type=${type}&limit=${limit}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

export const fetchTopPerformer = createAsyncThunk(
  'gamification/fetchTopPerformer',
  async ({ period = 'month' }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/gamification/top-performer?period=${period}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

const initialState = {
  profile: null,
  leaderboard: [],
  topPerformer: null,
  recentActivity: [],
  loading: false,
  error: null,
  leaderboardLoading: false,
  leaderboardError: null,
  topPerformerLoading: false,
  topPerformerError: null
};

const gamificationSlice = createSlice({
  name: 'gamification',
  initialState,
  reducers: {
    // Add points from websocket notification
    addPoints: (state, action) => {
      const { points, reason, description } = action.payload;
      
      // Update profile if it exists
      if (state.profile) {
        state.profile.points = (state.profile.points || 0) + points;
        state.profile.monthlyPoints = (state.profile.monthlyPoints || 0) + points;
        
        // Add to recent activity
        state.profile.recentActivity = [
          {
            id: Date.now().toString(),
            reason,
            description,
            points,
            timestamp: new Date().toISOString()
          },
          ...(state.profile.recentActivity || []).slice(0, 9) // Keep last 10 activities
        ];
      }
    },
    
    // Update streaks based on activity
    updateStreak: (state, action) => {
      const { streakType, value } = action.payload;
      
      if (state.profile && streakType) {
        if (streakType === 'payment') {
          state.profile.paymentStreak = value;
        } else if (streakType === 'meeting') {
          state.profile.meetingStreak = value;
        } else if (streakType === 'voting') {
          state.profile.votingStreak = value;
        }
      }
    },
    
    // Update user rank in leaderboard
    updateRank: (state, action) => {
      if (state.profile) {
        state.profile.rank = action.payload;
      }
    },
    
    clearGamification: (state) => {
      return initialState;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch user gamification profile
      .addCase(fetchUserGamification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserGamification.fulfilled, (state, action) => {
        state.profile = action.payload;
        state.loading = false;
      })
      .addCase(fetchUserGamification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch gamification profile';
      })
      
      // Fetch leaderboard
      .addCase(fetchLeaderboard.pending, (state) => {
        state.leaderboardLoading = true;
        state.leaderboardError = null;
      })
      .addCase(fetchLeaderboard.fulfilled, (state, action) => {
        state.leaderboard = action.payload;
        state.leaderboardLoading = false;
      })
      .addCase(fetchLeaderboard.rejected, (state, action) => {
        state.leaderboardLoading = false;
        state.leaderboardError = action.payload?.message || 'Failed to fetch leaderboard';
      })
      
      // Fetch top performer
      .addCase(fetchTopPerformer.pending, (state) => {
        state.topPerformerLoading = true;
        state.topPerformerError = null;
      })
      .addCase(fetchTopPerformer.fulfilled, (state, action) => {
        state.topPerformer = action.payload;
        state.topPerformerLoading = false;
      })
      .addCase(fetchTopPerformer.rejected, (state, action) => {
        state.topPerformerLoading = false;
        state.topPerformerError = action.payload?.message || 'Failed to fetch top performer';
      });
  }
});

export const { addPoints, updateStreak, updateRank, clearGamification } = gamificationSlice.actions;
export default gamificationSlice.reducer;