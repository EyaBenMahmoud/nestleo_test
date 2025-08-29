const request = require('supertest');
const express = require('express');
const claimsRoutes = require('../routes/claimsRoutes');

// Mock dependencies
jest.mock('../Models/Claim');
jest.mock('../Models/User');
jest.mock('../Models/Building');
jest.mock('../Models/Task');
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
  createNotification: jest.fn().mockResolvedValue({ 
    _id: 'notif123',
    toObject: jest.fn().mockReturnValue({
      _id: 'notif123',
      recipient: 'user456',
      type: 'alert',
      title: 'New Claim Submitted',
      createdAt: new Date()
    })
  })
}));

// Mock controller methods
jest.mock('../Controllers/claimsController', () => ({
  createClaim: (req, res) => {
    if (!req.body.title || !req.body.description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }
    return res.status(201).json({
      _id: 'claim123',
      title: req.body.title,
      description: req.body.description,
      userId: req.user.id,
      building: req.body.buildingId || 'building123',
      status: 'Pending',
      createdAt: new Date()
    });
  },
  getUserClaims: (req, res) => res.status(200).json([
    {
      _id: 'claim1',
      title: 'Claim 1',
      description: 'Description 1',
      status: 'Pending',
      building: { _id: 'building1', name: 'Building A' }
    },
    {
      _id: 'claim2',
      title: 'Claim 2',
      description: 'Description 2',
      status: 'Resolved',
      building: { _id: 'building1', name: 'Building A' }
    }
  ]),
  getTasksForClaim: (req, res) => res.status(200).json([
    {
      _id: 'task1',
      title: 'Task 1',
      description: 'Description 1',
      status: 'Available',
      building: { _id: 'building1', name: 'Building A' }
    },
    {
      _id: 'task2',
      title: 'Task 2',
      description: 'Description 2',
      status: 'In Progress',
      building: { _id: 'building2', name: 'Building B' }
    }
  ]),
  updateClaim: (req, res) => res.status(200).json({
    _id: req.params.id,
    title: req.body.title || 'Original Title',
    description: req.body.description || 'Original Description',
    status: req.body.status || 'Pending',
    building: req.body.buildingId || 'building123',
    adminNote: req.body.adminNote || '',
    updatedAt: new Date()
  }),
  deleteClaim: (req, res) => res.status(200).json({ message: 'Claim deleted successfully' }),
  convertClaimToTask: (req, res) => res.status(201).json({
    claimId: req.params.claimId,
    claim: {
      _id: req.params.claimId,
      status: 'Resolved'
    },
    task: {
      _id: 'task123',
      title: req.body.title || 'Converted Task',
      description: req.body.description || 'Task from claim',
      status: 'Available',
      building: req.body.buildingId || 'building123',
      priority: req.body.priority || 'Medium',
      relatedClaim: req.params.claimId
    }
  })
}));

// Mock auth middleware
jest.mock('../Middlewares/AuthMiddleware.js', () => ({
  protect: (req, res, next) => {
    req.user = { 
      id: 'user123', 
      role: req.query.role === 'coowner' ? 'SyndicateCoowner' : 'SyndicateAdmin'
    };
    next();
  }
}));

const app = express();
app.use(express.json());
app.use('/claims', claimsRoutes);

describe('Claims API', () => {
  it('should create a new claim', async () => {
    const claimData = {
      title: 'New Claim',
      description: 'This is a claim description',
      buildingId: 'building123'
    };
    
    const res = await request(app).post('/claims').send(claimData);
    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe('New Claim');
    expect(res.body.status).toBe('Pending');
  });

  it('should reject claim creation with missing required fields', async () => {
    const incompleteData = {
      title: 'Incomplete Claim'
      // Missing description
    };
    
    const res = await request(app).post('/claims').send(incompleteData);
    expect(res.statusCode).toBe(400);
  });

  it('should get user claims', async () => {
    const res = await request(app).get('/claims');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  it('should get user claims filtered by building', async () => {
    const res = await request(app).get('/claims?buildingId=building123');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should get tasks for claim dropdown', async () => {
    const res = await request(app).get('/claims/tasks');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  it('should update a claim', async () => {
    const updateData = {
      title: 'Updated Claim',
      status: 'In Progress',
      adminNote: 'Admin note here'
    };
    
    const res = await request(app).put('/claims/claim123').send(updateData);
    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe('Updated Claim');
    expect(res.body.status).toBe('In Progress');
    expect(res.body.adminNote).toBe('Admin note here');
  });

  it('should delete a claim', async () => {
    const res = await request(app).delete('/claims/claim123');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Claim deleted successfully');
  });

  it('should convert claim to task', async () => {
    const conversionData = {
      title: 'Task from Claim',
      description: 'This is now a task',
      priority: 'High'
    };
    
    const res = await request(app).post('/claims/claim123/convert-to-task').send(conversionData);
    expect(res.statusCode).toBe(201);
    expect(res.body.claim.status).toBe('Resolved');
    expect(res.body.task.title).toBe('Task from Claim');
    expect(res.body.task.priority).toBe('High');
    expect(res.body.task.relatedClaim).toBe('claim123');
  });
});