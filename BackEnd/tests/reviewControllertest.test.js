const request = require('supertest');
const express = require('express');
const reviewRoutes = require('../routes/reviewRoutes');

// Mock dependencies
jest.mock('../Models/Review');
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
  createNotification: jest.fn().mockResolvedValue({ _id: 'notif123' })
}));

// Mock controller methods
jest.mock('../Controllers/ReviewController', () => ({
  getAdminReviews: (req, res) => res.status(200).json({ 
    success: true, 
    data: [{ id: 'review1', rating: 4, content: 'Great work' }] 
  }),
  getWorkersForLocation: (req, res) => res.status(200).json({ 
    success: true, 
    data: [{ 
      _id: 'worker1', 
      firstName: 'John', 
      lastName: 'Doe',
      averageRating: 4.5,
      reviewCount: 2
    }] 
  }),
  createReview: (req, res) => res.status(201).json({ 
    success: true, 
    data: {
      _id: 'review123',
      content: req.body.content,
      rating: req.body.rating,
      createdBy: req.user._id,
      worker: req.body.workerId
    }
  }),
  getReviewsForWorker: (req, res) => res.status(200).json({ 
    success: true, 
    data: [
      { _id: 'review1', rating: 4, content: 'Great job' },
      { _id: 'review2', rating: 5, content: 'Excellent work' }
    ]
  }),
  addCommentToReview: (req, res) => res.status(200).json({ 
    success: true, 
    data: {
      _id: 'comment123',
      text: req.body.text,
      createdBy: req.user._id,
      createdAt: new Date()
    }
  }),
  deleteComment: (req, res) => res.status(200).json({ 
    success: true, 
    message: 'Comment deleted successfully' 
  }),
  deleteReview: (req, res) => res.status(200).json({ 
    success: true, 
    message: 'Review deleted successfully' 
  }),
  updateReview: (req, res) => res.status(200).json({ 
    success: true, 
    data: {
      _id: req.params.reviewId,
      content: req.body.content,
      rating: req.body.rating
    }
  }),
  getCompletedTasksForReview: (req, res) => res.status(200).json({ 
    success: true, 
    data: [
      { 
        _id: 'task123', 
        title: 'Completed Task',
        hasReview: false
      }
    ]
  }),
  createTaskReview: (req, res) => res.status(201).json({ 
    success: true, 
    data: {
      _id: 'review123',
      task: req.body.taskId,
      content: req.body.content,
      rating: req.body.rating,
      isTaskReview: true
    }
  }),
  getTaskReview: (req, res) => res.status(200).json({ 
    success: true, 
    data: {
      _id: req.params.reviewId,
      task: {
        _id: 'task123',
        title: 'Task Title'
      },
      content: 'Good work',
      rating: 4
    }
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
app.use('/reviews', reviewRoutes);

describe('Review API', () => {
  it('should get admin reviews', async () => {
    const res = await request(app).get('/reviews/admin');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should get workers for location', async () => {
    const res = await request(app).get('/reviews/workers-location');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data[0].averageRating).toBe(4.5);
  });

  it('should create a review', async () => {
    const reviewData = {
      content: 'Excellent worker',
      rating: 5,
      workerId: 'worker123',
      buildingId: 'building123'
    };
    
    const res = await request(app).post('/reviews').send(reviewData);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.content).toBe('Excellent worker');
    expect(res.body.data.rating).toBe(5);
  });

  it('should get reviews for a worker', async () => {
    const res = await request(app).get('/reviews/worker/worker123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
  });

  it('should add a comment to a review', async () => {
    const commentData = {
      text: 'I agree with this review'
    };
    
    const res = await request(app).post('/reviews/review123/comment').send(commentData);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.text).toBe('I agree with this review');
  });

  it('should delete a comment from a review', async () => {
    const res = await request(app).delete('/reviews/review123/comment/comment123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Comment deleted successfully');
  });

  it('should delete a review', async () => {
    const res = await request(app).delete('/reviews/review123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Review deleted successfully');
  });

  it('should update a review', async () => {
    const updateData = {
      content: 'Updated review content',
      rating: 4
    };
    
    const res = await request(app).put('/reviews/review123').send(updateData);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.content).toBe('Updated review content');
    expect(res.body.data.rating).toBe(4);
  });

  it('should get completed tasks for review', async () => {
    const res = await request(app).get('/reviews/completed-tasks/building123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data[0].title).toBe('Completed Task');
  });

  it('should create a task review', async () => {
    const reviewData = {
      taskId: 'task123',
      content: 'Task completed well',
      rating: 5
    };
    
    const res = await request(app).post('/reviews/task-review').send(reviewData);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isTaskReview).toBe(true);
  });

  it('should get a task review', async () => {
    const res = await request(app).get('/reviews/task-review/review123');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.task.title).toBe('Task Title');
  });
});