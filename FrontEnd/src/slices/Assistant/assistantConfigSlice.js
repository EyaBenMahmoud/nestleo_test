import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async Thunk to Fetch Active Configuration
export const getActiveConfig = createAsyncThunk(
  "assistantConfig/getActive",
  async (language = 'en', { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/assistant-config/active?language=${language}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: "Failed to fetch configuration" });
    }
  }
);

// Async Thunk to Fetch All Active Configurations (one per language)
export const getAllActiveConfigs = createAsyncThunk(
  "assistantConfig/getAllActive",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/api/assistant-config/active-all");
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: "Failed to fetch active configurations" });
    }
  }
);

// Async Thunk to Fetch All Configurations
export const getAllConfigs = createAsyncThunk(
  "assistantConfig/getAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/api/assistant-config");
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: "Failed to fetch configurations" });
    }
  }
);

// Async Thunk to Create a Configuration
export const createConfig = createAsyncThunk(
  "assistantConfig/create",
  async (configData, { rejectWithValue }) => {
    try {
      const response = await api.post("/api/assistant-config", configData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: "Failed to create configuration" });
    }
  }
);

// Async Thunk to Update a Configuration
export const updateConfig = createAsyncThunk(
  "assistantConfig/update",
  async ({ id, configData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/assistant-config/${id}`, configData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: "Failed to update configuration" });
    }
  }
);

// Async Thunk to Delete a Configuration
export const deleteConfig = createAsyncThunk(
  "assistantConfig/delete",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/api/assistant-config/${id}`);
      return { id, ...response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: "Failed to delete configuration" });
    }
  }
);

// Async Thunk to Activate a Configuration
export const activateConfig = createAsyncThunk(
  "assistantConfig/activate",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/api/assistant-config/${id}/activate`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: "Failed to activate configuration" });
    }
  }
);

// Async Thunk to Clone a Configuration
export const cloneConfig = createAsyncThunk(
  "assistantConfig/clone",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/assistant-config/${id}/clone`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: "Failed to clone configuration" });
    }
  }
);

// Initial State
const initialState = {
  active: null,
  activeByLanguage: {}, // Store active configs by language code
  availableLanguages: [], // List of languages with active configs
  currentLanguage: 'en', // Default language
  list: [],
  loading: false,
  error: null,
  successMessage: null,
  actionInProgress: false
};

// Redux Slice
const assistantConfigSlice = createSlice({
  name: "assistantConfig",
  initialState,
  reducers: {
    setCurrentLanguage: (state, action) => {
      state.currentLanguage = action.payload;
      // Set active to the current language's configuration if available
      if (state.activeByLanguage[action.payload]) {
        state.active = state.activeByLanguage[action.payload];
      }
    },
    clearSuccessMessage: (state) => {
      state.successMessage = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    // Add a reset action to clear the slice state
    resetAssistantConfig: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Get Active Configuration
      .addCase(getActiveConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getActiveConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.active = action.payload;
        // Also store in the language map
        if (action.payload) {
          state.activeByLanguage[action.payload.language] = action.payload;
          // Add to available languages if not already present
          if (!state.availableLanguages.includes(action.payload.language)) {
            state.availableLanguages.push(action.payload.language);
          }
        }
      })
      .addCase(getActiveConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch active configuration";
      })

      // Get All Active Configurations
      .addCase(getAllActiveConfigs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllActiveConfigs.fulfilled, (state, action) => {
        state.loading = false;
        
        // Build the language map and available languages list
        state.activeByLanguage = {};
        state.availableLanguages = [];
        
        action.payload.forEach(config => {
          state.activeByLanguage[config.language] = config;
          state.availableLanguages.push(config.language);
        });
        
        // Set active to current language's config or first available
        if (state.currentLanguage && state.activeByLanguage[state.currentLanguage]) {
          state.active = state.activeByLanguage[state.currentLanguage];
        } else if (action.payload.length > 0) {
          state.active = action.payload[0];
          state.currentLanguage = action.payload[0].language;
        }
      })
      .addCase(getAllActiveConfigs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch active configurations";
      })

      // Get All Configurations
      .addCase(getAllConfigs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllConfigs.fulfilled, (state, action) => {
  state.loading = false;
  
  const transformedConfigs = action.payload.map(config => {
    if (config.roleSpecificQuestions && config.roleSpecificQuestions.length > 0) {
    }
    return config;
  });
  state.list = transformedConfigs;
})
      .addCase(getAllConfigs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch configurations";
      })
      
      // Create Configuration
      .addCase(createConfig.pending, (state) => {
        state.actionInProgress = true;
        state.error = null;
      })
      .addCase(createConfig.fulfilled, (state, action) => {
        state.actionInProgress = false;
        state.list = [action.payload, ...state.list];
        state.successMessage = "Configuration created successfully";
        
        // If this is active, update active config for this language
        if (action.payload.isActive) {
          state.activeByLanguage[action.payload.language] = action.payload;
          
          // If it's the current language, set it as active
          if (action.payload.language === state.currentLanguage) {
            state.active = action.payload;
          }
          
          // Add to available languages if not present
          if (!state.availableLanguages.includes(action.payload.language)) {
            state.availableLanguages.push(action.payload.language);
          }
        }
      })
      .addCase(createConfig.rejected, (state, action) => {
        state.actionInProgress = false;
        state.error = action.payload?.message || "Failed to create configuration";
      })
      
      // Update Configuration
      .addCase(updateConfig.pending, (state) => {
        state.actionInProgress = true;
        state.error = null;
      })
      .addCase(updateConfig.fulfilled, (state, action) => {
        state.actionInProgress = false;
        
        // Update in list
        state.list = state.list.map(config => 
          config._id === action.payload._id ? action.payload : config
        );
        
        state.successMessage = "Configuration updated successfully";
        
        // If this is active, update active config for this language
        if (action.payload.isActive) {
          state.activeByLanguage[action.payload.language] = action.payload;
          
          // If it's the current language, set it as active
          if (action.payload.language === state.currentLanguage) {
            state.active = action.payload;
          }
          
          // Add to available languages if not present
          if (!state.availableLanguages.includes(action.payload.language)) {
            state.availableLanguages.push(action.payload.language);
          }
        }
        // If it was active but is no longer, remove from active map
        else if (state.activeByLanguage[action.payload.language]?._id === action.payload._id) {
          delete state.activeByLanguage[action.payload.language];
          
          // Remove from available languages
          state.availableLanguages = state.availableLanguages.filter(
            lang => lang !== action.payload.language
          );
          
          // If it was the active config, set active to null
          if (state.active?._id === action.payload._id) {
            state.active = null;
          }
        }
      })
      .addCase(updateConfig.rejected, (state, action) => {
        state.actionInProgress = false;
        state.error = action.payload?.message || "Failed to update configuration";
      })
      
      // Delete Configuration
      .addCase(deleteConfig.pending, (state) => {
        state.actionInProgress = true;
        state.error = null;
      })
      .addCase(deleteConfig.fulfilled, (state, action) => {
        state.actionInProgress = false;
        
        // Find the config that was deleted to get its language
        const deletedConfig = state.list.find(c => c._id === action.payload.id);
        const language = deletedConfig?.language;
        
        // Remove from list
        state.list = state.list.filter(config => config._id !== action.payload.id);
        
        state.successMessage = "Configuration deleted successfully";
        
        // If it was active, remove from active map
        if (language && state.activeByLanguage[language]?._id === action.payload.id) {
          delete state.activeByLanguage[language];
          
          // Remove from available languages
          state.availableLanguages = state.availableLanguages.filter(
            lang => lang !== language
          );
          
          // If it was the active config, set active to null
          if (state.active?._id === action.payload.id) {
            state.active = null;
          }
        }
      })
      .addCase(deleteConfig.rejected, (state, action) => {
        state.actionInProgress = false;
        state.error = action.payload?.message || "Failed to delete configuration";
      })
      
      // Activate Configuration
      .addCase(activateConfig.pending, (state) => {
        state.actionInProgress = true;
        state.error = null;
      })
      .addCase(activateConfig.fulfilled, (state, action) => {
        state.actionInProgress = false;
        
        // Update list: make this one active, others with same language inactive
        state.list = state.list.map(config => {
          if (config._id === action.payload._id) {
            return { ...config, isActive: true };
          } else if (config.language === action.payload.language) {
            return { ...config, isActive: false };
          }
          return config;
        });
        
        // Update active config for this language
        state.activeByLanguage[action.payload.language] = action.payload;
        
        // If it's the current language, set it as active
        if (action.payload.language === state.currentLanguage) {
          state.active = action.payload;
        }
        
        // Add to available languages if not present
        if (!state.availableLanguages.includes(action.payload.language)) {
          state.availableLanguages.push(action.payload.language);
        }
        
        state.successMessage = "Configuration activated successfully";
      })
      .addCase(activateConfig.rejected, (state, action) => {
        state.actionInProgress = false;
        state.error = action.payload?.message || "Failed to activate configuration";
      })
      
      // Clone Configuration
      .addCase(cloneConfig.pending, (state) => {
        state.actionInProgress = true;
        state.error = null;
      })
      .addCase(cloneConfig.fulfilled, (state, action) => {
        state.actionInProgress = false;
        state.list = [action.payload, ...state.list];
        state.successMessage = "Configuration cloned successfully";
      })
      .addCase(cloneConfig.rejected, (state, action) => {
        state.actionInProgress = false;
        state.error = action.payload?.message || "Failed to clone configuration";
      });
  },
});

export const { clearSuccessMessage, clearError, setCurrentLanguage } = assistantConfigSlice.actions;
export default assistantConfigSlice.reducer;