import api from "../../services/api";
import { createAsyncThunk } from "@reduxjs/toolkit";

// Get all chats
export const getChats = createAsyncThunk(
  "chat/getChats",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/api/chats");
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Get chat messages
export const getMessages = createAsyncThunk(
  "chat/getMessages",
  async (chatId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/chats/${chatId}/messages`);
      console.log('Processed payload:', { chatId, messages: response.data });

      // Return both chatId and messages
      return { chatId, messages: response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Send message
export const sendMessage = createAsyncThunk(
  "chat/sendMessage",
  async ({ chatId, content }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/chats/${chatId}/messages`, { content });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Create group chat
export const createGroup = createAsyncThunk(
  "chat/createGroup",
  async (groupData, { rejectWithValue }) => {
    try {
      const response = await api.post("/api/chats/group", groupData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);