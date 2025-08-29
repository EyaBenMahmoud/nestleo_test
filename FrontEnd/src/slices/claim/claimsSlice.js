import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../services/api";


// Async Thunk to Create a Claim
export const createClaim = createAsyncThunk(
  "claims/create",
  async (claimData, { rejectWithValue }) => {
    try {
      const response = await api.post("/api/claims", claimData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Async Thunk to Fetch User Claims
export const getUserClaims = createAsyncThunk(
  "claims/getUserClaims",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/api/claims", { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Async Thunk to Fetch Tasks for Claims
export const getTasksForClaims = createAsyncThunk(
  "claims/getTasksForClaims",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/api/claims/tasks", { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Async Thunk to Update a Claim
export const updateClaim = createAsyncThunk(
  "claims/update",
  async ({ id, claimData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/claims/${id}`, claimData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Async Thunk to Delete a Claim
export const deleteClaim = createAsyncThunk(
  "claims/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/api/claims/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Async Thunk to Convert Claim to Task
export const convertClaimToTask = createAsyncThunk(
  "claims/convertToTask",
  async ({ claimId, taskData }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/claims/${claimId}/convert-to-task`, taskData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Initial State
const initialState = {
  list: [],
  tasks: [],
  loading: false,
  tasksLoading: false,
  convertingToTask: false,
  error: null,
  successMessage: null,
};

// Redux Slice
const claimsSlice = createSlice({
  name: "claims",
  initialState,
  reducers: {
    clearSuccessMessage: (state) => {
      state.successMessage = null;
    },
    resetTasks: (state) => {
      state.tasks = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // Create Claim
      .addCase(createClaim.pending, (state) => {
        state.error = null;
        state.successMessage = null;
      })
      .addCase(createClaim.fulfilled, (state, action) => {
        state.list.push(action.payload);
        state.successMessage = "Claim created successfully";
      })
      .addCase(createClaim.rejected, (state, action) => {
        state.error = action.payload?.message || "Failed to create claim";
      })

      // Get User Claims
      .addCase(getUserClaims.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(getUserClaims.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(getUserClaims.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch claims";
      })

      // Get Tasks for Claims
      .addCase(getTasksForClaims.pending, (state) => {
        state.tasksLoading = true;
        state.error = null;
      })
      .addCase(getTasksForClaims.fulfilled, (state, action) => {
        state.tasksLoading = false;
        state.tasks = action.payload;
      })
      .addCase(getTasksForClaims.rejected, (state, action) => {
        state.tasksLoading = false;
        state.error = action.payload?.message || "Failed to fetch tasks";
      })

      // Update Claim
      .addCase(updateClaim.pending, (state) => {
        state.error = null;
        state.successMessage = null;
      })
      .addCase(updateClaim.fulfilled, (state, action) => {
        state.list = state.list.map(claim =>
          claim._id === action.payload._id ? action.payload : claim
        );
        state.successMessage = "Claim updated successfully";
      })
      .addCase(updateClaim.rejected, (state, action) => {
        state.error = action.payload?.message || "Failed to update claim";
      })

      // Delete Claim
      .addCase(deleteClaim.pending, (state) => {
        state.error = null;
        state.successMessage = null;
      })
      .addCase(deleteClaim.fulfilled, (state, action) => {
        state.list = state.list.filter(claim => claim._id !== action.payload);
        state.successMessage = "Claim deleted successfully";
      })
      .addCase(deleteClaim.rejected, (state, action) => {
        state.error = action.payload?.message || "Failed to delete claim";
      })
      
      // Convert Claim to Task
      .addCase(convertClaimToTask.pending, (state) => {
        state.convertingToTask = true;
        state.error = null;
      })
      .addCase(convertClaimToTask.fulfilled, (state, action) => {
        state.convertingToTask = false;
        state.list = state.list.map(claim =>
          claim._id === action.payload.claimId ? action.payload.claim : claim
        );
        state.successMessage = "Claim converted to task successfully";
      })
      .addCase(convertClaimToTask.rejected, (state, action) => {
        state.convertingToTask = false;
        state.error = action.payload?.message || "Failed to convert claim to task";
      });
  },
});

export const { clearSuccessMessage, resetTasks } = claimsSlice.actions;
export default claimsSlice.reducer;