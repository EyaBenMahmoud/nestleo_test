import { createAsyncThunk, createSlice, createSelector } from "@reduxjs/toolkit";
import api from "../../services/api";


export const deleteOwnAccount = createAsyncThunk(
  "users/deleteOwnAccount",
  async (password, { rejectWithValue }) => {
    try {
      const response = await api.post('/users/delete-account', { password });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);
// Async Thunk to Fetch Users
export const getAllCoowners = createAsyncThunk(
  "Coowners/getAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/users/Coowners");
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Change password in profile
export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ oldPassword, newPassword, confirmPassword }, { rejectWithValue }) => {
    try {
      const response = await api.put('/users/change-password', {
        oldPassword,
        newPassword,
        confirmPassword
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Toggle status
export const toggleUserStatus = createAsyncThunk(
  'users/toggleStatus',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/users/${userId}/status`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Async Thunk to Fetch Users
export const getAllUsers = createAsyncThunk(
  "users/getAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/users/all");
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Async Thunk to Create a User
export const createUser = createAsyncThunk(
  "users/create",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post("/users/add", userData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);


// Async Thunk to Delete a User
export const deleteUser = createAsyncThunk(
  "users/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/users/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Initial State
const initialState = {
  list: [],
  loading: false,
  error: null,
  successMessage: null, // For success message handling
  passwordChangeMessage: null, // For password change message
};

// Redux Slice
const userSlice = createSlice({
  name: "users",
  initialState,
  reducers: {  
    clearpasswordChangeMessage: (state) => {
      state.passwordChangeMessage = null; // Clears success message
  },
    clearSuccessMessage: (state) => {
      state.successMessage = null; // Clears success message
  },
    updateUserInList: (state, action) => {
    state.list = action.payload;
  },
  },
  extraReducers: (builder) => {
    builder
      // Change password
      .addCase(changePassword.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.passwordChangeMessage = null; // Clear password change message
      })
      .addCase(changePassword.fulfilled, (state, action) => {
        state.loading = false;
        state.passwordChangeMessage = "Password changed successfully"; // Success message
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to change password";
      })

      // Get all users
      .addCase(getAllUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null; // Clear success message
      })
      .addCase(getAllUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
        state.successMessage = "Users fetched successfully"; // Success message
      })
      .addCase(getAllUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch users";
      })

      // Get all coowners
      .addCase(getAllCoowners.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null; // Clear success message
      })
      .addCase(getAllCoowners.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
        state.successMessage = "Users fetched successfully"; // Success message
      })
      .addCase(getAllCoowners.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch users";
      })

      // Create user
      .addCase(createUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.loading = false;
        state.list.push(action.payload);
        state.successMessage = "User created successfully"; // Success message
      })
      .addCase(createUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to create user";
      })

   

      // Delete user
      .addCase(deleteUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.loading = false;
        state.list = state.list.filter(user => user._id !== action.payload);
        state.successMessage = "User deleted successfully"; // Success message
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to delete user";
      })

      // Toggle user status
      .addCase(toggleUserStatus.fulfilled, (state, action) => {
        state.list = state.list.map(user =>
          user._id === action.payload._id
            ? { ...user, isActive: action.payload.isActive }
            : user
        );
      })
      .addCase(deleteOwnAccount.pending, (state) => {
  state.loading = true;
  state.error = null;
})
.addCase(deleteOwnAccount.fulfilled, (state) => {
  state.loading = false;
  state.successMessage = "Account deleted successfully";
})
.addCase(deleteOwnAccount.rejected, (state, action) => {
  state.loading = false;
  state.error = action.payload?.message || "Failed to delete account";
});
  },
});



export const { clearSuccessMessage , updateUserInList, clearpasswordChangeMessage } = userSlice.actions;
export default userSlice.reducer;
