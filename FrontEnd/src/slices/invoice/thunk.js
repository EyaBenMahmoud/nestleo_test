// invoices/thunk.js
import axios from 'axios';
import { createAsyncThunk } from '@reduxjs/toolkit';
import api from "../../services/api";
const API_BASE_URL = '/api/invoices';

// Get all invoices
export const getInvoices = createAsyncThunk(
  'invoices/getInvoices',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(API_BASE_URL);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: error.message });
    }
  }
);

// Add new invoice
export const addNewInvoice = createAsyncThunk(
  'invoices/addNewInvoice',
  async (invoiceData, { rejectWithValue }) => {
    try {
      const response = await api.post(API_BASE_URL, invoiceData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: error.message });
    }
  }
);

// Update invoice
export const updateInvoice = createAsyncThunk(
  'invoices/updateInvoice',
  async ({ id, invoiceData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`${API_BASE_URL}/${id}`, invoiceData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: error.message });
    }
  }
);

// Delete invoice
export const deleteInvoice = createAsyncThunk(
  'invoices/deleteInvoice',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`${API_BASE_URL}/${id}`);
      return { id };
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: error.message });
    }
  }
);

// Mark invoice as paid
export const markInvoiceAsPaid = createAsyncThunk(
  'invoices/markInvoiceAsPaid',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.patch(`${API_BASE_URL}/${id}/pay`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: error.message });
    }
  }
);