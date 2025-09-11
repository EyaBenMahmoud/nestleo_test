import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";
import { toast } from "react-toastify";

// Get all invoices
export const getInvoices = createAsyncThunk(
  "invoices/getInvoices",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/api/invoices");
      console.log("resoinse", response.data)
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// get invoices per building
export const getInvoicesByBuilding = createAsyncThunk(
  'invoices/getInvoicesByBuilding',
  async (buildingId, { rejectWithValue }) => {
    try {
      console.log("building id in param", buildingId)
      const response = await api.get(`/api/invoices/building/${buildingId}`);
      console.log("perBuilding invoice", response.data)
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Add a new invoice
export const addNewInvoice = createAsyncThunk(
  "invoices/addNewInvoice",
  async (invoiceData, { rejectWithValue }) => {
    try {
      const response = await api.post("/api/invoices", invoiceData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Replace the getInvoiceById function:
export const getInvoiceById = createAsyncThunk(
  'invoices/getInvoiceById',
  async (id, { rejectWithValue }) => {
    if (!id) {
      return rejectWithValue('Invoice ID is required');
    }
    try {
      const response = await api.get(`/api/invoices/${id}`);
      console.log("Invoice fetched for edit:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching invoice:", error);
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// In your invoice slice file
export const updateInvoice = createAsyncThunk(
  'invoices/updateInvoice',
  async ({ id, invoiceData }, { rejectWithValue }) => {
    console.log("Redux updateInvoice called with:", { id, invoiceData });
    
    if (!id) {
      console.error("No invoice ID provided");
      return rejectWithValue('Invoice ID is required');
    }
    
    try {
      const response = await api.put(`/api/invoices/${id}`, invoiceData);
      console.log("Update API response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Update API error:", error);
      console.error("Error response:", error.response?.data);
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Delete invoice
export const deleteInvoice = createAsyncThunk(
  "invoices/deleteInvoice",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/api/invoices/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);
// In your invoice slice file
export const getInvoicesByCoOwner = createAsyncThunk(
  'invoices/getByCoOwner',
  async (coOwnerId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/invoices/co-owner/${coOwnerId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const getInvoicesByCoOwnerAndBuilding = createAsyncThunk(
  'invoices/getInvoicesByCoOwnerAndBuilding',
  async ({ coOwnerId, buildingId }, { rejectWithValue }) => {
    try {
      const response = await api.get(
        `/api/invoices/co-owner/${coOwnerId}/building/${buildingId}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const payInvoice = createAsyncThunk(
  'invoices/payInvoice',
  async ({ invoiceId, cashPaymentDetails }, { rejectWithValue }) => {
    try {
      // Make sure this URL matches your route exactly
      const response = await api.post(
        `/api/invoices/cash/pay/${invoiceId}/cash`,
        cashPaymentDetails,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      toast.success("Payment successful and email is sent to the CoOwner");
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Payment failed',
        status: error.response?.status,
        data: error.response?.data
      });
    }
  }
);

// Add this action to your slice file
export const applyCouponToInvoice = createAsyncThunk(
  'invoices/applyCoupon',
  async ({ invoiceId, couponCode }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/invoices/apply-coupon', {
        invoiceId,
        couponCode
      });

      if (response.data.success) {
        toast.success(`Coupon applied! ${response.data.discountApplied}% discount added to your invoice.`);
      }

      return {
        invoiceId,
        newTotal: response.data.newTotal,
        discountApplied: response.data.discountApplied
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to apply coupon';
      toast.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);


const initialState = {
  invoices: [],
  currentInvoice: null,
  loading: false,
  error: null,
  success: false,
};

const invoiceSlice = createSlice({
  name: "invoices",
  initialState,
  reducers: {
    resetInvoiceState: (state) => {
      state.error = null;
      state.success = false;
    },
    clearCurrentInvoice: (state) => {
      state.currentInvoice = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get all invoices
      .addCase(getInvoices.pending, (state) => {
        state.loading = true;
      })
      .addCase(getInvoices.fulfilled, (state, action) => {
        state.loading = false;
        state.invoices = action.payload;
      })
      .addCase(getInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get all InvoicesByBuilding
      .addCase(getInvoicesByBuilding.pending, (state) => {
        state.loading = true;
      })
      .addCase(getInvoicesByBuilding.fulfilled, (state, action) => {
        state.loading = false;
        state.invoices = action.payload;
      })
      .addCase(getInvoicesByBuilding.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Add new invoice
      .addCase(addNewInvoice.pending, (state) => {
        state.loading = true;
      })
      .addCase(addNewInvoice.fulfilled, (state, action) => {
        state.loading = false;
        // Ensure invoices is an array before using unshift
        if (!Array.isArray(state.invoices)) {
          state.invoices = [];
        }
        state.invoices.unshift(action.payload);
        state.success = true;
      })
      .addCase(addNewInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get single invoice
      .addCase(getInvoiceById.pending, (state) => {
        state.loading = true;
      })
      .addCase(getInvoiceById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentInvoice = action.payload;
        console.log("Redux state updated:", action.payload); // Debug log

      })
      .addCase(getInvoiceById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update invoice
      // Then in your extraReducers
      .addCase(updateInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateInvoice.fulfilled, (state, action) => {
        state.loading = false;
        state.currentInvoice = action.payload;
        // Optionally update the invoices list if you maintain one
        if (state.invoices) {
          state.invoices = state.invoices.map(inv =>
            inv._id === action.payload._id ? action.payload : inv
          );
        }
      })
      .addCase(updateInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete invoice
      .addCase(deleteInvoice.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteInvoice.fulfilled, (state, action) => {
        state.invoices = state.invoices.filter(
          invoice => invoice._id !== action.payload
        );
        state.loading = false;
        state.success = true;
      })
      .addCase(deleteInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get Invoices by Co-Owner
      .addCase(getInvoicesByCoOwner.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getInvoicesByCoOwner.fulfilled, (state, action) => {
        state.loading = false;
        state.invoices = action.payload;
      })
      .addCase(getInvoicesByCoOwner.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get Invoices by Co-Owner and Building
      .addCase(getInvoicesByCoOwnerAndBuilding.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getInvoicesByCoOwnerAndBuilding.fulfilled, (state, action) => {
        state.loading = false;
        state.invoices = action.payload;
      })
      .addCase(getInvoicesByCoOwnerAndBuilding.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Pay Invoice
      .addCase(payInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(payInvoice.fulfilled, (state, action) => {
        state.loading = false;
        // Update the specific invoice in the state
        state.invoices = state.invoices.map(invoice =>
          invoice._id === action.payload._id ? action.payload : invoice
        );
      })
      .addCase(payInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(applyCouponToInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(applyCouponToInvoice.fulfilled, (state, action) => {
        state.loading = false;

        // Update the invoice in the invoices array
        state.invoices = state.invoices.map(invoice =>
          invoice._id === action.payload.invoiceId
            ? { ...invoice, total: action.payload.newTotal }
            : invoice
        );

        if (state.currentInvoice && state.currentInvoice._id === action.payload.invoiceId) {
          state.currentInvoice = {
            ...state.currentInvoice,
            total: action.payload.newTotal
          };
        }
      })
      .addCase(applyCouponToInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { resetInvoiceState, clearCurrentInvoice } = invoiceSlice.actions;
export default invoiceSlice.reducer;
