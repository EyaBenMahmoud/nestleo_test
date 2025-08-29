import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../services/api";
import { toast } from "react-toastify";

export const fetchWorkerReviews = createAsyncThunk(
    'review/fetchWorkerReviews',
    async (workerId, { rejectWithValue }) => {
      try {
        const response = await api.get(`/api/review/worker/${workerId}`);
        return response.data.data || []; // Extract data array
      } catch (error) {
        return rejectWithValue(error.response?.data?.message || "Failed to fetch reviews");
      }
    }
  );
  
  export const fetchAdminReviews = createAsyncThunk(
    'review/fetchAdminReviews',
    async (_, { rejectWithValue }) => {
      try {
        const response = await api.get('/api/review/admin');
        return response.data.data || []; // Extract data array
      } catch (error) {
        return rejectWithValue(error.response?.data?.message || "Failed to fetch reviews");
      }
    }
  );

  export const fetchWorkersByLocation = createAsyncThunk(
    'review/fetchWorkersByLocation',
    async (_, { rejectWithValue }) => {
      try {
        const response = await api.get('/api/review/workers-location');
        return response.data.data || [];
      } catch (error) {
        return rejectWithValue(error.response?.data?.message || "Failed to fetch workers");
      }
    }
  );


export const createReview = createAsyncThunk(
  'review/createReview',
  async (reviewData, { rejectWithValue, dispatch }) => {
    try {
      const response = await api.post('/api/review', reviewData);
      dispatch(fetchAdminReviews());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to create review");
    }
  }
);

export const addReviewComment = createAsyncThunk(
    'review/addReviewComment',
    async ({ reviewId, text }, { rejectWithValue, getState }) => {
      try {
        const response = await api.post(`/api/review/${reviewId}/comment`, { text });
        
        // Return the new comment data
        return response.data.data;
      } catch (error) {
        return rejectWithValue(error.response?.data?.message || "Failed to add comment");
      }
    }
  );
  export const deleteComment = createAsyncThunk(
    'review/deleteComment',
    async ({ reviewId, commentId }, { rejectWithValue, dispatch }) => {
      try {
        const response = await api.delete(`/api/review/${reviewId}/comment/${commentId}`);
        dispatch(fetchAdminReviews());
        return { reviewId, commentId, message: response.data?.message || "Comment deleted successfully" };
      } catch (error) {
        return rejectWithValue(error.response?.data?.message || "Failed to delete comment");
      }
    }
  );
  export const fetchCompletedTasksForReview = createAsyncThunk(
    'review/fetchCompletedTasksForReview',
    async (buildingId, { rejectWithValue }) => {
      try {
        const response = await api.get(`/api/review/completed-tasks/${buildingId}`);
        return response.data.data || [];
      } catch (error) {
        return rejectWithValue(error.response?.data?.message || "Failed to fetch completed tasks");
      }
    }
  );
  
  export const createTaskReview = createAsyncThunk(
    'review/createTaskReview',
    async (reviewData, { rejectWithValue, dispatch }) => {
      try {
        const response = await api.post('/api/review/task-review', reviewData);
        dispatch(fetchAdminReviews());
        return response.data;
      } catch (error) {
        return rejectWithValue(error.response?.data?.message || "Failed to create task review");
      }
    }
  );
  export const fetchTaskReview = createAsyncThunk(
    'review/fetchTaskReview',
    async (reviewId, { rejectWithValue }) => {
      try {
        const response = await api.get(`/api/review/task-review/${reviewId}`);
        return response.data.data;
      } catch (error) {
        return rejectWithValue(error.response?.data?.message || "Failed to fetch task review");
      }
    }
  );
export const deleteReview = createAsyncThunk(
  'review/deleteReview',
  async (reviewId, { rejectWithValue, dispatch }) => {
    try {
      const response = await api.delete(`/api/review/${reviewId}`);
      dispatch(fetchAdminReviews());
      return { reviewId, message: response.data?.message || "Review deleted successfully" };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to delete review");
    }
  }
);
export const updateReview = createAsyncThunk(
    'review/updateReview',
    async ({ reviewId, reviewData }, { rejectWithValue, dispatch }) => {
      try {
        const response = await api.put(`/api/review/${reviewId}`, reviewData);
        dispatch(fetchAdminReviews());
        return response.data;
      } catch (error) {
        return rejectWithValue(error.response?.data?.message || "Failed to update review");
      }
    }
  );
const initialState = {
  reviews: [],
  adminReviews: [],
  workers: [],
  currentReview: null,
  loading: false,
  workersLoading: false,
  error: null,
  message: null,
};

const reviewSlice = createSlice({
  name: "review",
  initialState,
  reducers: {
    setCurrentReview: (state, action) => {
      state.currentReview = action.payload;
    },
    clearCurrentReview: (state) => {
      state.currentReview = null;
    },
    clearReviewError: (state) => {
      state.error = null;
    },
    clearReviewMessage: (state) => {
      state.message = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkerReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkerReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.reviews = action.payload || [];
      })
      .addCase(fetchWorkerReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.reviews = [];
      })
      // Add this to your extraReducers
.addCase(updateReview.pending, (state) => {
    state.loading = true;
    state.error = null;
  })
  .addCase(updateReview.fulfilled, (state, action) => {
    state.loading = false;
    state.message = "Review updated successfully";
  })
  .addCase(updateReview.rejected, (state, action) => {
    state.loading = false;
    state.error = action.payload;
  })
      .addCase(fetchAdminReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.adminReviews = action.payload || [];
      })
      .addCase(fetchAdminReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.adminReviews = [];
      })
      .addCase(createReview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createReview.fulfilled, (state, action) => {
        state.loading = false;
        state.message = "Review created successfully";
      })
      .addCase(createReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addReviewComment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addReviewComment.fulfilled, (state, action) => {
        state.loading = false;
        state.message = "Comment added successfully";
        
        // Find the review and update its comments
        const reviewIndex = state.reviews.findIndex(
          review => review._id === action.meta.arg.reviewId
        );
        
        if (reviewIndex !== -1) {
          if (!state.reviews[reviewIndex].comments) {
            state.reviews[reviewIndex].comments = [];
          }
          state.reviews[reviewIndex].comments.push(action.payload);
        }
        
        // Also update adminReviews if needed
        const adminReviewIndex = state.adminReviews.findIndex(
          review => review._id === action.meta.arg.reviewId
        );
        
        if (adminReviewIndex !== -1) {
          if (!state.adminReviews[adminReviewIndex].comments) {
            state.adminReviews[adminReviewIndex].comments = [];
          }
          state.adminReviews[adminReviewIndex].comments.push(action.payload);
        }
      })
      .addCase(addReviewComment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteReview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteReview.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload.message;
        state.adminReviews = state.adminReviews.filter(
          review => review._id !== action.payload.reviewId
        );
      })
      .addCase(deleteReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchWorkersByLocation.pending, (state) => {
        state.workersLoading = true;
        state.error = null;
      })
      .addCase(fetchWorkersByLocation.fulfilled, (state, action) => {
        state.workersLoading = false;
        state.workers = action.payload || [];
      })
      .addCase(fetchWorkersByLocation.rejected, (state, action) => {
        state.workersLoading = false;
        state.error = action.payload;
        state.workers = [];
      })
      .addCase(fetchCompletedTasksForReview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompletedTasksForReview.fulfilled, (state, action) => {
        state.loading = false;
        state.completedTasks = action.payload;
      })
      .addCase(fetchCompletedTasksForReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.completedTasks = [];
      })
      .addCase(createTaskReview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTaskReview.fulfilled, (state, action) => {
        state.loading = false;
        state.message = "Task review submitted successfully";
      })
      .addCase(createTaskReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchTaskReview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTaskReview.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTaskReview = action.payload;
      })
      .addCase(fetchTaskReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
     
.addCase(deleteComment.pending, (state) => {
    state.loading = true;
    state.error = null;
  })
  .addCase(deleteComment.fulfilled, (state, action) => {
    state.loading = false;
    state.message = action.payload.message;
    
    // Update reviews array
    const reviewIndex = state.reviews.findIndex(
      review => review._id === action.payload.reviewId
    );
    
    if (reviewIndex !== -1) {
      state.reviews[reviewIndex].comments = state.reviews[reviewIndex].comments.filter(
        comment => comment._id !== action.payload.commentId
      );
    }
    
    // Update adminReviews array
    const adminReviewIndex = state.adminReviews.findIndex(
      review => review._id === action.payload.reviewId
    );
    
    if (adminReviewIndex !== -1) {
      state.adminReviews[adminReviewIndex].comments = state.adminReviews[adminReviewIndex].comments.filter(
        comment => comment._id !== action.payload.commentId
      );
    }
  })
  .addCase(deleteComment.rejected, (state, action) => {
    state.loading = false;
    state.error = action.payload;
  });
  },
});

export const { 
  setCurrentReview, 
  clearCurrentReview, 
  clearReviewError, 
  clearReviewMessage 
} = reviewSlice.actions;

export default reviewSlice.reducer;