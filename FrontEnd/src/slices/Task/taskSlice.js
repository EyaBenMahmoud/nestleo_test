import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../services/api";
import { toast } from "react-toastify";

export const fetchTasks = createAsyncThunk(
    'task/fetchTasks',
    async (_, { getState, rejectWithValue }) => {
      try {
        const { user } = getState().Loginn || {};
        console.log("Fetching tasks for user:", user?.role);
        if (user?.role === 'Worker') {
          const [myTasks, availableTasks] = await Promise.all([
            api.get("/api/tasks/tasks/my-tasks"),
            api.get("/api/tasks/tasks/available")
          ]);
          const allTasks = [...myTasks.data, ...availableTasks.data];
          const uniqueTasks = allTasks.filter(
            (task, index, self) => index === self.findIndex(t => t._id === task._id)
          );
          return uniqueTasks;
        } else {
          const response = await api.get("/api/tasks/tasks/all");
          return response.data;
        }
      } catch (error) {
        return rejectWithValue(error.response?.data?.message || "Failed to fetch tasks");
      }
    }
  );

export const createTask = createAsyncThunk(
  'task/createTask',
  async (taskData, { rejectWithValue, dispatch }) => {
    try {
      const response = await api.post("/api/tasks/tasks", taskData);
      dispatch(fetchTasks());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to create task");
    }
  }
);

export const assignTask = createAsyncThunk(
  'task/assignTask',
  async ({ taskId, workerId }, { rejectWithValue, dispatch }) => {
    try {
      const response = await api.post(`/api/tasks/tasks/${taskId}/assign`, { workerId });
      dispatch(fetchTasks());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to assign task");
    }
  }
);

export const respondToAssignment = createAsyncThunk(
  'task/respondToAssignment',
  async ({ taskId, response }, { rejectWithValue, dispatch }) => {
    try {
      const result = await api.post(`/api/tasks/tasks/${taskId}/respond`, { response });
      dispatch(fetchTasks());
      return { taskId, response, task: result.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to respond to assignment");
    }
  }
);

export const updateTaskStatus = createAsyncThunk(
  'task/updateTaskStatus',
  async ({ taskId, status }, { rejectWithValue, dispatch }) => {
    try {
      const response = await api.put(`/api/tasks/tasks/${taskId}/status`, { status });
      dispatch(fetchTasks());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to update task status");
    }
  }
);

export const addComment = createAsyncThunk(
  'task/addComment',
  async ({ taskId, text }, { rejectWithValue, dispatch }) => {
    try {
      const response = await api.post(`/api/tasks/tasks/${taskId}/comment`, { text });
      dispatch(fetchTasks());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to add comment");
    }
  }
);

export const fetchWorkersForBuilding = createAsyncThunk(
    'task/fetchWorkersForBuilding',
    async (buildingId, { rejectWithValue }) => {
      try {
        // Updated endpoint to include buildingId in URL
        const response = await api.get(`/api/tasks/workers/${buildingId}`);
        return response.data || [];
      } catch (error) {
        return rejectWithValue(error.response?.data?.message || "Failed to fetch workers");
      }
    }
  );

export const updateTaskDetails = createAsyncThunk(
  'task/updateTaskDetails',
  async ({ taskId, taskData }, { rejectWithValue, dispatch }) => {
    try {
      const response = await api.put(`/api/tasks/tasks/${taskId}`, taskData);
      dispatch(fetchTasks());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to update task");
    }
  }
);

export const deleteTask = createAsyncThunk(
  'task/deleteTask',
  async (taskId, { rejectWithValue, dispatch }) => {
    try {
      const response = await api.delete(`/api/tasks/tasks/${taskId}`);
      dispatch(fetchTasks());
      return { taskId, message: response.data?.message || "Task deleted successfully" };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to delete task");
    }
  }
);
export const requestTaskAssignment = createAsyncThunk(
    'task/requestTaskAssignment',
    async (taskId, { rejectWithValue, dispatch }) => {
      try {
        const response = await api.post(`/api/tasks/tasks/${taskId}/request`);
        dispatch(fetchTasks());
        return response.data;
      } catch (error) {
        return rejectWithValue(error.response?.data?.message || "Failed to request task assignment");
      }
    }
  );
  
  export const respondToTaskRequest = createAsyncThunk(
    'task/respondToTaskRequest',
    async ({ taskId, workerId, response }, { rejectWithValue, dispatch }) => {
      try {
        const result = await api.post(`/api/tasks/tasks/${taskId}/respond/${workerId}`, { response });
        dispatch(fetchTasks());
        return { taskId, workerId, response, task: result.data };
      } catch (error) {
        return rejectWithValue(error.response?.data?.message || "Failed to respond to task request");
      }
    }
  );
  
  export const fetchTaskRequests = createAsyncThunk(
    'task/fetchTaskRequests',
    async (_, { rejectWithValue }) => {
      try {
        const response = await api.get('/api/tasks/tasks/requests');
        return response.data;
      } catch (error) {
        return rejectWithValue(error.response?.data?.message || "Failed to fetch task requests");
      }
    }
  );
const initialState = {
  tasks: [],
  workers: [],
  currentTask: null,
  loading: false,
  workersLoading: false,
  error: null,
  message: null,
};

const taskSlice = createSlice({
  name: "task",
  initialState,
  reducers: {
    setCurrentTask: (state, action) => {
      state.currentTask = action.payload;
    },
    clearCurrentTask: (state) => {
      state.currentTask = null;
    },
    clearTaskError: (state) => {
      state.error = null;
    },
    clearTaskMessage: (state) => {
      state.message = null;
    },
    updateTaskInList: (state, action) => {
      state.tasks = state.tasks.map(task => 
        task._id === action.payload._id ? action.payload : task
      );
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload || [];
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.tasks = [];
      })
      .addCase(createTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.loading = false;
        state.message = null;
      })
      .addCase(createTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(assignTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(assignTask.fulfilled, (state, action) => {
        state.loading = false;
        state.message = null;
      })
      .addCase(assignTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(respondToAssignment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(respondToAssignment.fulfilled, (state, action) => {
        state.loading = false;
        state.message = `Assignment ${action.payload.response.toLowerCase()}`;
      })
      .addCase(respondToAssignment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateTaskStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTaskStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.message = "Task status updated";
        state.tasks = state.tasks.map(task => 
          task._id === action.payload._id ? action.payload : task
        );
      })
      .addCase(updateTaskStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addComment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addComment.fulfilled, (state, action) => {
        state.loading = false;
        state.message = "Comment added";
      })
      .addCase(addComment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchWorkersForBuilding.pending, (state) => {
        state.workersLoading = true;
        state.error = null;
      })
      .addCase(fetchWorkersForBuilding.fulfilled, (state, action) => {
        state.workersLoading = false;
        state.workers = action.payload || [];
      })
      .addCase(fetchWorkersForBuilding.rejected, (state, action) => {
        state.workersLoading = false;
        state.error = action.payload;
        state.workers = [];
      })
      .addCase(updateTaskDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTaskDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.message = null;
        state.tasks = state.tasks.map(task => 
          task._id === action.payload._id ? action.payload : task
        );
      })
      .addCase(updateTaskDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload.message;
        state.tasks = state.tasks.filter(task => task._id !== action.payload.taskId);
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { 
  setCurrentTask, 
  clearCurrentTask, 
  clearTaskError, 
  clearTaskMessage,
  updateTaskInList
} = taskSlice.actions;

export default taskSlice.reducer;