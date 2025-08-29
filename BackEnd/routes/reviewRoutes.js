const express = require('express');
const router = express.Router();
const { protect } = require('../Middlewares/AuthMiddleware');
const {
  createReview,
  getReviewsForWorker,
  addCommentToReview,
  getAdminReviews,
  deleteReview,
  getWorkersForLocation,
  updateReview,
  deleteComment,
  getCompletedTasksForReview,
  createTaskReview,
  getTaskReview
} = require('../Controllers/ReviewController');
const Task = require('../Models/Task');
router.post('/', protect, createReview);
router.get('/worker/:workerId', protect, getReviewsForWorker);
router.get('/admin', protect, getAdminReviews);
router.post('/:reviewId/comment', protect, addCommentToReview);
router.delete('/:reviewId', protect, deleteReview);
router.put('/:reviewId', protect, updateReview);
router.get('/workers-location', protect, getWorkersForLocation);
router.delete('/:reviewId/comment/:commentId', protect, deleteComment);
router.get('/completed-tasks/:buildingId', protect, getCompletedTasksForReview);
router.post('/task-review', protect, createTaskReview);
router.get('/task-review/:reviewId', protect, getTaskReview);

module.exports = router;