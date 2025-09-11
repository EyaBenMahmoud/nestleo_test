const express = require('express');
const router = express.Router();
const { protect } = require('../Middlewares/AuthMiddleware');
const {
  createTask,
  getAvailableTasks,
  assignTaskToWorker,
  respondToAssignment,
  getMyTasks,
  updateTaskStatus,
  addCommentToTask,
  getWorkersByBuilding,
  getAllTasks,
  updateTask,
  deleteTask,
  requestTaskAssignment,
  getTaskRequests,
  respondToTaskRequest,
} = require('../Controllers/TaskController');

// Protect all routes
router.use(protect);
// Worker routes
router.post('/tasks/:taskId/request', requestTaskAssignment);

// Admin routes
router.get('/tasks/requests', getTaskRequests);
router.post('/tasks/:taskId/respond/:workerId', respondToTaskRequest);
// Admin routes
router.post('/tasks', createTask);
router.post('/tasks/:taskId/assign', assignTaskToWorker);
router.get('/workers/:buildingId', getWorkersByBuilding);
router.get('/tasks/all', getAllTasks);
router.put('/tasks/:taskId', updateTask);
router.delete('/tasks/:taskId', deleteTask);

// Worker routes
router.get('/tasks/available', getAvailableTasks);
router.post('/tasks/:taskId/respond', respondToAssignment);
router.get('/tasks/my-tasks', getMyTasks);

// Shared routes
router.put('/tasks/:taskId/status', updateTaskStatus);
router.post('/tasks/:taskId/comment', addCommentToTask);

module.exports = router;