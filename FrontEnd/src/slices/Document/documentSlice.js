// documentSlice.js
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../services/api";
import { toast } from "react-toastify";

export const fetchDocuments = createAsyncThunk(
  'document/fetchDocuments',
  async (buildingId, { getState, rejectWithValue }) => {
    try {
      const response = await api.get(`/api/Documents/buildings/${buildingId}/documents`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch documents");
    }
  }
);

export const uploadDocument = createAsyncThunk(
  'document/uploadDocument',
  async ({ buildingId, formData }, { rejectWithValue, dispatch }) => {
    try {
      const response = await api.post(`/api/Documents/buildings/${buildingId}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      dispatch(fetchDocuments(buildingId));
      toast.success("Document uploaded successfully");
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to upload document");
      return rejectWithValue(error.response?.data?.message || "Failed to upload document");
    }
  }
);

export const downloadDocument = createAsyncThunk(
    'document/downloadDocument',
    async (documentId, { rejectWithValue }) => {
      try {
        const response = await api.get(`/api/Documents/documents/${documentId}/download`, {
          responseType: 'blob'
        });
        
        // Extract filename from content-disposition header
        const contentDisposition = response.headers['content-disposition'];
        let filename = 'document';
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch && filenameMatch.length === 2) {
            filename = filenameMatch[1];
          }
        }
  
        // Create blob URL
        const blob = new Blob([response.data], { type: response.headers['content-type'] });
        const url = window.URL.createObjectURL(blob);
        
        // Create link and trigger download
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        window.URL.revokeObjectURL(url);
        link.parentNode.removeChild(link);
  
        return { documentId };
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to download document");
        return rejectWithValue(error.response?.data?.message || "Failed to download document");
      }
    }
  );

  
export const deleteDocument = createAsyncThunk(
  'document/deleteDocument',
  async ({ documentId, buildingId }, { rejectWithValue, dispatch }) => {
    try {
      await api.delete(`/api/Documents/documents/${documentId}`);
      dispatch(fetchDocuments(buildingId));
      toast.success("Document deleted successfully");
      return documentId;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete document");
      return rejectWithValue(error.response?.data?.message || "Failed to delete document");
    }
  }
);
export const previewDocument = createAsyncThunk(
    'document/previewDocument',
    async (documentId, { rejectWithValue }) => {
      try {
        const response = await api.get(`/api/Documents/documents/${documentId}/preview`, {
          responseType: 'blob'
        });
        
        // Create blob URL for preview
        const blob = new Blob([response.data], { type: response.headers['content-type'] });
        const url = window.URL.createObjectURL(blob);
        return url;
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to preview document");
        return rejectWithValue(error.response?.data?.message || "Failed to preview document");
      }
    }
  );
  const initialState = {
    documents: [],
    loading: false,
    error: null,
    uploadLoading: false,
    downloadLoading: false,
    deleteLoading: false,
    previewLoading: false,
    previewUrl: null
  };

const documentSlice = createSlice({
  name: "document",
  initialState,
  reducers: {
    clearDocumentError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Documents
      .addCase(fetchDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.documents = action.payload.data || [];
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Upload Document
      .addCase(uploadDocument.pending, (state) => {
        state.uploadLoading = true;
        state.error = null;
      })
      .addCase(uploadDocument.fulfilled, (state) => {
        state.uploadLoading = false;
      })
      .addCase(uploadDocument.rejected, (state, action) => {
        state.uploadLoading = false;
        state.error = action.payload;
      })
      .addCase(previewDocument.pending, (state) => {
        state.previewLoading = true;
        state.error = null;
        state.previewUrl = null; // Clear previous preview
      })
      .addCase(previewDocument.fulfilled, (state, action) => {
        state.previewLoading = false;
        state.previewUrl = action.payload;
      })
      .addCase(previewDocument.rejected, (state, action) => {
        state.previewLoading = false;
        state.error = action.payload;
        state.previewUrl = null;
      })
      // Download Document
    .addCase(downloadDocument.pending, (state) => {
        state.downloadLoading = true;
        state.error = null;
      })
      .addCase(downloadDocument.fulfilled, (state, action) => {
        state.downloadLoading = false;
      })
      .addCase(downloadDocument.rejected, (state, action) => {
        state.downloadLoading = false;
        state.error = action.payload;
      })
      
      // Delete Document
      .addCase(deleteDocument.pending, (state) => {
        state.deleteLoading = true;
        state.error = null;
      })
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.deleteLoading = false;
        state.documents = state.documents.filter(doc => doc._id !== action.payload);
      })
      .addCase(deleteDocument.rejected, (state, action) => {
        state.deleteLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearDocumentError } = documentSlice.actions;
export default documentSlice.reducer;