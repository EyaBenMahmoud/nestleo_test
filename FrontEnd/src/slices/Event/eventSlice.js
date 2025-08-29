import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../services/api";

export const fetchEvents = createAsyncThunk(
  "events/fetchEvents",
  async (buildingId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/events/${buildingId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

export const addEvent = createAsyncThunk(
  "events/addEvent",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await api.post("/api/events", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

const fetchEventDetails = async (eventId) => {
  try {
    const response = await api.get(`/api/events/single/${eventId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching event details:', error);
    return null;
  }
};
export const updateEvent = createAsyncThunk(
  "events/updateEvent",
  async ({ id, eventData }, { rejectWithValue }) => {
    try {
      console.log(`Updating event ${id}`);
      
      // ⚠️ IMPORTANT: Use POST instead of PUT for FormData
      // This is because some servers handle multipart/form-data differently with PUT
      const response = await api.post(`/api/events/${id}/update`, eventData);
      
      return response.data;
    } catch (error) {
      console.error("Update event error:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

export const deleteEvent = createAsyncThunk(
  "events/deleteEvent",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/api/events/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

export const startMeeting = createAsyncThunk(
  "events/startMeeting",
  async (eventId, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/events/${eventId}/start`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

export const joinMeeting = createAsyncThunk(
  "events/joinMeeting",
  async (eventId, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/events/${eventId}/join`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

export const endMeeting = createAsyncThunk(
  "events/endMeeting",
  async (eventId, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/events/${eventId}/end`);
      return { eventId, ...response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

const initialState = {
  events: [],
  loading: false,
  error: null,
  successMessage: null,
  currentMeeting: null,
};

const eventSlice = createSlice({
  name: "events",
  initialState,
  reducers: {
    clearSuccessMessage: (state) => {
      state.successMessage = null;
    },
    clearEvents: (state) => {
      state.events = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.events = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addEvent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addEvent.fulfilled, (state, action) => {
        state.loading = false;
        state.events.push(action.payload);
        state.successMessage = "Event added successfully";
      })
      .addCase(addEvent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateEvent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateEvent.fulfilled, (state, action) => {
        state.loading = false;
        state.events = state.events.map((event) =>
          event._id === action.payload._id ? action.payload : event
        );
        state.successMessage = "Event updated successfully";
      })
      .addCase(updateEvent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(startMeeting.pending, (state) => {
        state.loading = true;
      })
      .addCase(startMeeting.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload && action.payload.eventId) {
          const eventIndex = state.events.findIndex(e => e._id === action.payload.eventId);
          if (eventIndex !== -1 && state.events[eventIndex].meeting) {
            state.events[eventIndex].meeting.isActive = true;
          }
          state.currentMeeting = {
            roomName: action.payload.roomName,
            eventId: action.payload.eventId,
            isModerator: action.payload.isModerator,
            token: action.payload.token
          };
          state.successMessage = "Meeting started successfully";
        }
      })
      .addCase(startMeeting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(joinMeeting.pending, (state) => {
        state.loading = true;
      })
      .addCase(joinMeeting.fulfilled, (state, action) => {
        state.loading = false;
        state.currentMeeting = {
          roomName: action.payload.roomName,
          eventId: action.payload.eventId,
          isModerator: action.payload.isModerator,
          token: action.payload.token
        };
        state.successMessage = "Joined meeting successfully";
      })
      .addCase(joinMeeting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(endMeeting.pending, (state) => {
        state.loading = true;
      })
      .addCase(endMeeting.fulfilled, (state, action) => {
        state.loading = false;
        const eventIndex = state.events.findIndex(e => e._id === action.payload.eventId);
        if (eventIndex !== -1 && state.events[eventIndex].meeting) {
          state.events[eventIndex].meeting.isActive = false;
        }
        state.currentMeeting = null;
        state.successMessage = "Meeting ended successfully";
      })
      .addCase(endMeeting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteEvent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteEvent.fulfilled, (state, action) => {
        state.loading = false;
        state.events = state.events.filter((event) => event._id !== action.payload);
        state.successMessage = "Event deleted successfully";
      })
      .addCase(deleteEvent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearSuccessMessage, clearEvents } = eventSlice.actions;
export default eventSlice.reducer;