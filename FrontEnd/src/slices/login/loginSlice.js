import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../services/api";
import { toast } from "react-toastify";



// Fetch Latest User Data
export const fetchUserData = createAsyncThunk(
  "auth/fetchUserData",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to fetch user data");
    }
  }
);

// Login User with Google
export const loginUserWithGoogle = createAsyncThunk(
  "auth/loginWithGoogle",
  async ({ email, token, role, buildingId }, { rejectWithValue }) => {
    try {
      const response = await api.post("/auth/loginWithGoogle", {
        email,
        token,
        role,
        buildingId, // Pass building ID to backend
      });



      // Store token in localStorage
      if (response.data) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", response.data.user);
      }

      if (response.data.role === "SyndicateCoowner") {
        response.data.isActive = false; // Deactivate user
      }

      return {
        user: response.data,
        token: response.data.token,
        message: "Login successful",
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || "Login failed");
    }
  }
);


// Add/update this action
export const updateUserAvatar = createAsyncThunk(
  'login/updateUserAvatar',
  async ({ formData, token }, { rejectWithValue }) => {
    try {
      const response = await api.put('/image/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: "Failed to update avatar" });
    }
  }
);


// Forgot Password
export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/forgot-password', email);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error requesting password reset");
    }
  }
);

// Reset Password
export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, password }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/auth/reset-password/${token}`, { password });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Error resetting password");
    }
  }
);

// Login User
// export const loginUser = createAsyncThunk(
//   "auth/login",
//   async ({ email, password }, { rejectWithValue }) => {
//     try {
//       const response = await api.post("/auth/login", { email, password });

//       // Store token in localStorage
//       if (response.data.token) {
//         localStorage.setItem("token", response.data.token);
//         localStorage.setItem("user", response.data.user);
//       }

//       return {
//         user: response.data,
//         token: response.data.token,
//         message: "Login successful",
//       };
//     } catch (error) {
//       return rejectWithValue(error.response?.data || "Login failed");
//     }
//   }
// );

// Login User
export const loginUser = createAsyncThunk(
  "auth/login",
  async ({ email, password, recaptchaToken } = {}, { rejectWithValue }) => {
    try {
      const payload = { email, password, recaptchaToken };
      const response = await api.post("/auth/login", payload);

      // If server indicates 2FA flow, return the server response directly
        if (response.data && (response.data.twoFaRequired || response.data.mustAcceptPolicies)) {
        // do NOT store token/user here — this is only a temp response
        return response.data;
      }

      // Otherwise store token+user if present (final login)
      if (response.data?.token) {
        localStorage.setItem("token", response.data.token);
        // prefer explicit user field; fallback to response.data
        try {
          localStorage.setItem("user", JSON.stringify(response.data.user || response.data));
        } catch (err) { /* ignore storage errors */ }
      }

      return {
        user: response.data.user || response.data,
        token: response.data.token || null,
        message: "Login successful",
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || "Login failed");
    }
  }
);


export const registerUser = createAsyncThunk(
  "auth/register",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post("/auth/register", userData);
      // Show success message
      toast.success("Registration successful!", {
        autoClose: 5000,
      });
      return {
        message: response.data.message || "Registration successful",
        data: response.data.user,
        buildingId: userData.buildingId
      };
    } catch (error) {
      const errorMsg = error.response?.data?.message ||
        error.response?.data?.error ||
        "Registration failed";
      // Only show toast if error is NOT 'User already exists'
      if (errorMsg !== "User already exists") {
        toast.error(errorMsg);
      }
      // For 'User already exists', let frontend handle field error
      return rejectWithValue(errorMsg);
    }
  }
);
// Async Thunk to Update a User
export const updateUser = createAsyncThunk(
  "users/update",
  async ({ id, userData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/users/${id}`, userData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);


const initialState = {
  list: [],
  user: JSON.parse(localStorage.getItem("user")), // Load from localStorage,
  token: localStorage.getItem("token") || null,  // Load from localStorage,
  loading: false,
  error: null,
  message: null,
  userAvatarUrl: '', // Add this line
  successMessage: null, // For success message handling
  isUserLogout: false,
  isUserLoggedIn: false,
  fakePassword: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
     logout: (state) => {
    // Backup language keys
    const i18nextLng = localStorage.getItem('i18nextLng');
    const I18N_LANGUAGE = localStorage.getItem('I18N_LANGUAGE');
    
    // Check if "remember me" was set
    const rememberMe = localStorage.getItem('rememberMe');
    const rememberedEmail = rememberMe === 'true' ? 
      JSON.parse(localStorage.getItem('user'))?.email : null;
      const rememberedPassword = rememberMe === 'true' ?
      localStorage.getItem('rememberedPassword') : null;

    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    
    // Restore language keys
    if (i18nextLng) localStorage.setItem('i18nextLng', i18nextLng);
    if (I18N_LANGUAGE) localStorage.setItem('I18N_LANGUAGE', I18N_LANGUAGE);
    
    // Restore remember me data if it was set
    if (rememberMe === 'true' && rememberedEmail) {
      localStorage.setItem('rememberMe', 'true');
      localStorage.setItem('rememberedEmail', rememberedEmail);
      localStorage.setItem('rememberedPassword', rememberedPassword);
    }
    
    // Reset state
    state.user = null;
    state.token = null;
    state.isUserLogout = true;
    state.isUserLoggedIn = false;
  },

    updateUserAvatarUrl: (state, action) => {
      state.userAvatarUrl = action.payload; // Add this reducer
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
    clearSuccessMessage: (state) => {
      state.successMessage = null; // Clears success message
    },
    setFakePassword: (state, action) => {
      state.fakePassword = action.payload;
    },
    clearFakePassword: (state) => {
      state.fakePassword = null;
    },
    setisUserLoggedIn: (state, action) => {
      state.isUserLoggedIn = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateUserGamification: (state, action) => {
      if (state.user) {
        // Initialize gamification object if it doesn't exist yet
        if (!state.user.gamification) {
          state.user.gamification = {};
        }

        // Update gamification fields with the new values
        state.user.gamification = {
          ...state.user.gamification,
          ...action.payload
        };

        // Also update localStorage to persist the changes
        try {
          localStorage.setItem("user", JSON.stringify(state.user));
          console.log('User gamification updated in Redux and localStorage:', state.user.gamification);
        } catch (error) {
          console.error('Failed to save updated user to localStorage:', error);
        }
      } else {
        console.warn('Cannot update gamification: No user in state');
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle loginUser
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null; // Clear previous message
      })
.addCase(loginUser.fulfilled, (state, action) => {
  state.loading = false;

  // If backend required 2FA, action.payload may be { twoFaRequired: true, tempToken: '...' }
  if (action.payload && action.payload.twoFaRequired) {
    state.message = action.payload.message || null;
    state.error = null;
    // Do NOT set state.user/state.token — final auth not yet granted
    return;
  }

  // Normal successful login (final token + user)
  state.user = action.payload.user;
  state.token = action.payload.token;
  state.message = action.payload.message || "Login successful";

  try {
    if (action.payload.user) {
      localStorage.setItem("user", JSON.stringify(action.payload.user));
    }
    if (action.payload.token) {
      localStorage.setItem("token", action.payload.token);
    }
  } catch (err) {
    console.warn('Failed to save login to localStorage', err);
  }

  state.isUserLoggedIn = true;
  state.error = null;
})

      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Login failed";
        state.message = null; // Clear any success message
      })


      // Update user
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.successMessage = "User updated successfully"; // Success message
        state.error = null; // Clear any previous error

      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to update user";
      })

      // Handle registerUser
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null; // Clear previous message
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload.message || "Registration successful";
        state.error = null; // Clear any previous error

      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Registration failed";
        state.message = null; // Clear any success message
      })

      // Handle updateUserAvatar
      .addCase(updateUserAvatar.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
      })

      .addCase(updateUserAvatar.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Error updating avatar";
        state.message = null;
      })

      // Handle forgotPassword
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
      })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.message = "Password reset email sent successfully";
        state.error = null; // Clear any previous error
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Error requesting password reset";
        state.message = null;
      })

      // Handle resetPassword
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.message = "Password reset successful";
        state.error = null; // Clear any previous error
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Error resetting password";
        state.message = null;
      })
      // Handle loginUserWithGoogle
      .addCase(loginUserWithGoogle.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null; // Clear previous message
      })
      .addCase(loginUserWithGoogle.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.message = action.payload.message || "Login successful";
        // Save user state in localStorage
        localStorage.setItem("user", JSON.stringify(action.payload.user));
        localStorage.setItem("token", action.payload.token);
        state.isUserLoggedIn = true;
        state.error = null; // Clear any previous error
      })
      .addCase(loginUserWithGoogle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Login failed";
        state.message = null; // Clear any success message
      })    // Handle fetchUserData
      .addCase(fetchUserData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserData.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload; // Update the user in the Redux store
        localStorage.setItem("user", JSON.stringify(action.payload)); // Update localStorage
        state.error = null; // Clear any previous error
      })
      .addCase(fetchUserData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch user data";
      })
      .addCase(updateUserAvatar.fulfilled, (state, action) => {
        state.loading = false;
        if (state.user && action.payload.avatar) {
          state.user.avatar = action.payload.avatar;
        }
      });


  },
});

export const { clearError, setisUserLoggedIn, clearFakePassword, logout, setUser, clearSuccessMessage, updateUserAvatarUrl, setFakePassword, updateUserGamification } = authSlice.actions;
export default authSlice.reducer;