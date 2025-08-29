const request = require('supertest');
const express = require('express');
const taskRoutes = require('../routes/taskRoutes');

// Mock dependencies
jest.mock('../Models/Task');
jest.mock('../Models/User');
jest.mock('../Models/Building');
jest.mock('../Socket/socketManager', () => ({
  socketManager: {
    io: {
      to: jest.fn().mockReturnValue({
        emit: jest.fn()
      })
    },
    onlineUsers: {
      get: jest.fn()
    }
  }
}));
jest.mock('../Controllers/notificationsController', () => ({
  createNotification: jest.fn().mockResolvedValue({ _id: 'notif123' })
}));

// Mock controller methods
jest.mock('../Controllers/TaskController', () => ({
  createTask: (req, res) => res.status(201).json({ 
    success: true, 
    data: { 
      _id: 'task123', 
      title: req.body.title,
      status: 'Available' 
    } 
  }),
  getAvailableTasks: (req, res) => res.status(200).json([
    { _id: 'task123', title: 'Task 1', status: 'Available' }
  ]),
  assignTaskToWorker: (req, res) => res.status(200).json({ 
    success: true, 
    data: { 
      _id: req.params.taskId, 
      assignmentRequests: [{ worker: req.body.workerId, status: 'Pending' }] 
    } 
  }),
  respondToAssignment: (req, res) => res.status(200).json({ 
    success: true, 
    data: { 
      _id: req.params.taskId, 
      status: req.body.response === 'Accepted' ? 'In Progress' : 'Available' 
    } 
  }),
  getMyTasks: (req, res) => res.status(200).json([
    { _id: 'task123', title: 'My Task', status: 'In Progress' }
  ]),
  updateTaskStatus: (req, res) => res.status(200).json({ 
    success: true, 
    data: { 
      _id: req.params.taskId, 
      status: req.body.status 
    } 
  }),
  addCommentToTask: (req, res) => res.status(200).json({ 
    success: true, 
    data: { 
      _id: req.params.taskId, 
      comments: [{ text: req.body.text, createdBy: req.user._id }] 
    } 
  }),
  getWorkersByBuilding: (req, res) => res.status(200).json([
    { _id: 'worker1', firstName: 'John', lastName: 'Doe' }
  ]),
  getAllTasks: (req, res) => res.status(200).json([
    { _id: 'task123', title: 'Task 1' },
    { _id: 'task456', title: 'Task 2' }
  ]),
  updateTask: (req, res) => res.status(200).json({ 
    success: true, 
    data: { 
      _id: req.params.taskId, 
      title: req.body.title 
    } 
  }),
  deleteTask: (req, res) => res.status(200).json({ 
    success: true, 
    message: 'Task deleted successfully' 
  }),
  getTaskRequests: (req, res) => res.status(200).json([
    { _id: 'task123', taskRequests: [{ worker: 'worker1', status: 'Pending' }] }
  ]),
  respondToTaskRequest: (req, res) => res.status(200).json({ 
    success: true, 
    message: `Task request ${req.body.response.toLowerCase()}`,
    data: { _id: req.params.taskId }
  }),
  requestTaskAssignment: (req, res) => res.status(200).json({ 
    success: true, 
    message: 'Task request submitted',
    data: { _id: req.params.taskId }
  })
}));

// Mock auth middleware
jest.mock('../Middlewares/AuthMiddleware.js', () => ({
  protect: (req, res, next) => {
    req.user = { _id: 'user123', role: 'SyndicateAdmin' };
    next();
  }
}));

const app = express();
app.use(express.json());
app.use('/', taskRoutes);  // Notice we're using '/' instead of '/tasks' because routes already include 'tasks/'

describe('Task API', () => {
  it('should create a new task', async () => {
    const taskData = {
      title: 'New Task',
      description: 'Task description',
      building: 'building123',
      priority: 'High'
    };
    
    const res = await request(app).post('/tasks').send(taskData);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('New Task');
  });

  it('should get available tasks', async () => {
    const res = await request(app).get('/tasks/available');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].status).toBe('Available');
  });

  it('should assign a task to a worker', async () => {
    const res = await request(app).post('/tasks/task123/assign').send({ workerId: 'worker1' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.assignmentRequests[0].worker).toBe('worker1');
  });

  it('should allow worker to respond to assignment', async () => {
    const res = await request(app).post('/tasks/task123/respond').send({ response: 'Accepted' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('In Progress');
  });

  it('should get tasks assigned to me', async () => {
    const res = await request(app).get('/tasks/my-tasks');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].title).toBe('My Task');
  });

  it('should update task status', async () => {
    const res = await request(app).put('/tasks/task123/status').send({ status: 'Completed' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Completed');
  });

  it('should add a comment to a task', async () => {
    const res = await request(app).post('/tasks/task123/comment').send({ text: 'Great work!' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.comments[0].text).toBe('Great work!');
  });

  it('should get workers by building', async () => {
    const res = await request(app).get('/workers/building123');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].firstName).toBe('John');
  });

  it('should get all tasks', async () => {
    const res = await request(app).get('/tasks/all');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  it('should update a task', async () => {
    const res = await request(app).put('/tasks/task123').send({ title: 'Updated Task' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Updated Task');
  });

  it('should delete a task', async () => {
    const res = await request(app).delete('/tasks/task123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Task deleted successfully');
  });

  it('should get task requests', async () => {
    const res = await request(app).get('/tasks/requests');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].taskRequests[0].status).toBe('Pending');
  });

  it('should respond to a task request', async () => {
    const res = await request(app).post('/tasks/task123/respond/worker1').send({ response: 'Accepted' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Task request accepted');
  });

  it('should request task assignment', async () => {
    const res = await request(app).post('/tasks/task123/request');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Task request submitted');
  });
});