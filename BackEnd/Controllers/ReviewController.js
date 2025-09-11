const Review = require('../Models/Review');
const User = require('../Models/User');
const Building = require('../Models/Building');
const Task = require('../Models/Task');
const { socketManager } = require('../Socket/socketManager');
const NotificationController = require('./notificationsController');

// Helper function to get user language from database
const getUserLanguage = async (userId) => {
  try {
    const user = await User.findById(userId);
    return user?.language || 'en';
  } catch (error) {
    console.log('Error getting user language:', error);
    return 'en'; // Default fallback
  }
};

// Notification templates for multiple languages
const notificationTemplates = {
  reviewReceived: {
    en: {
      title: 'New Review Received',
      content: '{reviewerName} has reviewed you with a rating of {rating}/5: "{reviewContent}"'
    },
    fr: {
      title: 'Nouvel avis reçu',
      content: '{reviewerName} vous a évalué avec une note de {rating}/5 : "{reviewContent}"'
    },
    it: {
      title: 'Nuova recensione ricevuta',
      content: '{reviewerName} ti ha recensito con un voto di {rating}/5: "{reviewContent}"'
    },
    sp: {
      title: 'Nueva reseña recibida',
      content: '{reviewerName} te ha reseñado con una calificación de {rating}/5: "{reviewContent}"'
    }
  },
  taskReviewReceived: {
    en: {
      title: 'New Task Review Received',
      content: '{reviewerName} has reviewed your work on "{taskTitle}" with a rating of {rating}/5: "{reviewContent}"'
    },
    fr: {
      title: 'Nouvel avis de tâche reçu',
      content: '{reviewerName} a évalué votre travail sur "{taskTitle}" avec une note de {rating}/5 : "{reviewContent}"'
    },
    it: {
      title: 'Nuova recensione attività ricevuta',
      content: '{reviewerName} ha recensito il tuo lavoro su "{taskTitle}" con un voto di {rating}/5: "{reviewContent}"'
    },
    sp: {
      title: 'Nueva reseña de tarea recibida',
      content: '{reviewerName} ha reseñado tu trabajo en "{taskTitle}" con una calificación de {rating}/5: "{reviewContent}"'
    }
  },
  commentOnReview: {
    en: {
      title: 'New Comment on Review',
      content: '{commenterName} ({role}) commented on a review: "{commentText}"'
    },
    fr: {
      title: 'Nouveau commentaire sur un avis',
      content: '{commenterName} ({role}) a commenté un avis : "{commentText}"'
    },
    it: {
      title: 'Nuovo commento su recensione',
      content: '{commenterName} ({role}) ha commentato una recensione: "{commentText}"'
    },
    sp: {
      title: 'Nuevo comentario en reseña',
      content: '{commenterName} ({role}) comentó en una reseña: "{commentText}"'
    }
  }
};

// Helper function to get localized notification content
const getLocalizedNotification = (templateKey, language, variables = {}) => {
  const template = notificationTemplates[templateKey][language] || notificationTemplates[templateKey].en;
  
  let title = template.title;
  let content = template.content;
  
  // Replace variables in title and content
  Object.keys(variables).forEach(key => {
    const placeholder = `{${key}}`;
    title = title.replace(new RegExp(placeholder, 'g'), variables[key]);
    content = content.replace(new RegExp(placeholder, 'g'), variables[key]);
  });
  
  return { title, content };
};

const normalizeLocation = (value) => {
    return (value || '').toLowerCase().trim();
  };

// Replace getAdminReviews function with this version
exports.getAdminReviews = async (req, res) => {
  try {
    const adminId = req.user._id;

    // Verify admin role and get location info
    const admin = await User.findById(adminId);
    

    const adminCountry = normalizeLocation(admin.country);
    const adminCity = normalizeLocation(admin.city);

    // Find all reviews in the same location as the admin
    const reviews = await Review.find({
      country: { $regex: new RegExp(adminCountry, 'i') },
      city: { $regex: new RegExp(adminCity, 'i') }
    })
      .populate('worker', 'firstName lastName country city')
      .populate('building', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('comments.createdBy', 'firstName lastName role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: reviews
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
};

// Modify getWorkersForBuilding to be location-based instead
exports.getWorkersForLocation = async (req, res) => {
  try {
    // Verify admin role
    const admin = await User.findOne({
      _id: req.user._id,
      role: 'SyndicateAdmin'
    });
    
    if (!admin) {
      return res.status(403).json({ 
        success: false,
        message: 'Only admins can view workers' 
      });
    }

    const adminCountry = normalizeLocation(admin.country);
    const adminCity = normalizeLocation(admin.city);

    // Find workers in the same location as the admin
    const workers = await User.find({ 
      role: 'Worker',
      country: { $regex: new RegExp(adminCountry, 'i') },
      city: { $regex: new RegExp(adminCity, 'i') }
    }).select('firstName lastName email country city');

    // Get average ratings for each worker
    const workersWithRatings = await Promise.all(
      workers.map(async (worker) => {
        const reviews = await Review.find({ worker: worker._id });
        const averageRating = reviews.length > 0 
          ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length)
          : 0;
        
        return {
          ...worker.toObject(),
          averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
          reviewCount: reviews.length
        };
      })
    );

    res.status(200).json({
      success: true,
      data: workersWithRatings
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
};
// Create a review
exports.createReview = async (req, res) => {
  try {
    const { content, rating, workerId, buildingId } = req.body;
    const adminId = req.user._id;

    // Verify admin role
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'SyndicateAdmin') {
      return res.status(403).json({ 
        success: false,
        message: 'Only SyndicateAdmins can create reviews' 
      });
    }

    // Verify worker exists and is a worker
    const worker = await User.findOne({
      _id: workerId,
      role: 'Worker'
    });
    if (!worker) {
      return res.status(404).json({ 
        success: false,
        message: 'Worker not found' 
      });
    }

    // Check if admin has already reviewed this worker
    const existingReview = await Review.findOne({
      createdBy: adminId,
      worker: workerId,
      isTaskReview: { $ne: true } // Exclude task reviews
    });

    if (existingReview) {
      return res.status(400).json({ 
        success: false,
        message: 'You have already reviewed this worker. Please update the existing review instead.' 
      });
    }

    // Check if admin and worker are in same location
    if (normalizeLocation(admin.country) !== normalizeLocation(worker.country) || 
        normalizeLocation(admin.city) !== normalizeLocation(worker.city)) {
      return res.status(400).json({ 
        success: false,
        message: 'You can only review workers in your location' 
      });
    }

    // Create review
    const review = await Review.create({
      content,
      rating,
      createdBy: adminId,
      worker: workerId,
      building: buildingId,
      country: normalizeLocation(admin.country),
      city: normalizeLocation(admin.city)
    });
    
    // Get admin user info for notification
    const adminUser = await User.findById(adminId).select('firstName lastName email profilePicture');
    
    try {
      // Get worker's language preference
      const workerLanguage = await getUserLanguage(workerId);
      
      // Get localized notification content
      const notificationData = getLocalizedNotification('reviewReceived', workerLanguage, {
        reviewerName: `${adminUser.firstName} ${adminUser.lastName}`,
        rating: rating,
        reviewContent: content.substring(0, 50) + (content.length > 50 ? '...' : '')
      });

      // Send notification to the worker
      await NotificationController.createNotification({
        recipient: workerId,
        type: 'alert',
        title: notificationData.title,
        content: notificationData.content,
        relatedTo: review._id,
        onModel: 'Review',
        senderName: `${adminUser.firstName} ${adminUser.lastName}`,
        senderAvatar: adminUser.profilePicture || null,
        reviewId: review._id
      });
      
      // Send socket notification if worker is online
      if (socketManager?.io) {
        const workerSocketId = socketManager.onlineUsers.get(workerId.toString());
        if (workerSocketId) {
          socketManager.io.to(workerSocketId).emit('notification', {
            type: 'alert',
            title: notificationData.title,
            content: notificationData.content,
            reviewId: review._id,
            createdAt: new Date()
          });
        }
      }
    } catch (notificationError) {
      // Log notification error but don't fail the request
      console.error('Error sending review notification:', notificationError);
    }

    res.status(201).json({
      success: true,
      data: review
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
};

// Get reviews for a worker
exports.getReviewsForWorker = async (req, res) => {
  try {
    const { workerId } = req.params;
    const userId = req.user._id;

    // Verify worker exists and matches the requesting user if worker is requesting
    const worker = await User.findById(workerId);
    if (!worker || worker.role !== 'Worker') {
      return res.status(404).json({ 
        success: false,
        message: 'Worker not found' 
      });
    }

    // If worker is requesting, verify it's their own reviews
    if (req.user.role === 'Worker' && workerId !== userId.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'You can only view your own reviews' 
      });
    }

    const reviews = await Review.find({ worker: workerId })
      .populate('createdBy', 'firstName lastName')
      .populate('building', 'name')
      .populate('comments.createdBy', 'firstName lastName role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: reviews
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
};

// Update the addCommentToReview function to allow admins to comment on other admins' reviews
exports.addCommentToReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    const review = await Review.findById(reviewId)
      .populate('worker', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .populate('comments.createdBy', 'firstName lastName role');

    if (!review) {
      return res.status(404).json({ 
        success: false,
        message: 'Review not found' 
      });
    }

    // Allow SyndicateAdmins to comment on any review, not just reviews they created
    // Worker can still only comment on reviews about themselves
    if (req.user.role === 'SyndicateAdmin' || 
        review.worker._id.toString() === userId.toString() || 
        review.createdBy._id.toString() === userId.toString()) {
      const comment = {
        text, 
        createdBy: userId
      };

      review.comments.push(comment);
      await review.save();

      // Populate the newly added comment's createdBy
      const populatedReview = await Review.populate(review, {
        path: 'comments.createdBy',
        select: 'firstName lastName role'
      });

      const newComment = populatedReview.comments[populatedReview.comments.length - 1];

      // Get commenter details for notification
      const commenter = await User.findById(userId).select('firstName lastName profilePicture role');

      try {
        // Determine who should be notified
        // If worker comments -> notify review creator (admin)
        // If admin comments -> notify worker and review creator (if different admin)
        const notifyUsers = [];
        
        if (commenter.role === 'Worker') {
          // Worker commented, notify the review creator (admin)
          notifyUsers.push(review.createdBy._id);
        } else {
          // Admin commented, notify the worker
          notifyUsers.push(review.worker._id);
          
          // If another admin (not review creator) commented, also notify review creator
          if (review.createdBy._id.toString() !== userId.toString()) {
            notifyUsers.push(review.createdBy._id);
          }
        }

        // Send notifications to all recipients
        for (const recipientId of notifyUsers) {
          // Skip if commenter is the recipient
          if (recipientId.toString() === userId.toString()) continue;

          // Get recipient's language preference
          const recipientLanguage = await getUserLanguage(recipientId);
          
          // Get localized notification content
          const notificationData = getLocalizedNotification('commentOnReview', recipientLanguage, {
            commenterName: `${commenter.firstName} ${commenter.lastName}`,
            role: commenter.role,
            commentText: text.substring(0, 50) + (text.length > 50 ? '...' : '')
          });

          // Create notification
          await NotificationController.createNotification({
            recipient: recipientId,
            type: 'alert',
            title: notificationData.title,
            content: notificationData.content,
            relatedTo: reviewId,
            onModel: 'Review',
            senderName: `${commenter.firstName} ${commenter.lastName}`,
            senderAvatar: commenter.profilePicture || null,
            reviewId: reviewId
          });
          
          // Send socket notification if recipient is online
          if (socketManager?.io) {
            const recipientSocketId = socketManager.onlineUsers.get(recipientId.toString());
            if (recipientSocketId) {
              socketManager.io.to(recipientSocketId).emit('notification', {
                type: 'alert',
                title: notificationData.title,
                content: notificationData.content,
                reviewId: reviewId,
                createdAt: new Date()
              });
            }
          }
        }
      } catch (notificationError) {
        // Log notification error but don't fail the request
        console.error('Error sending comment notification:', notificationError);
      }

      res.status(200).json({
        success: true,
        data: newComment
      });
    } else {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to comment on this review' 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { reviewId, commentId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Find the comment
    const comment = review.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const isCommentAuthor = comment.createdBy.toString() === userId.toString();
    const isReviewAuthor = review.createdBy.toString() === userId.toString();
    
    if (!isCommentAuthor && !isReviewAuthor) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    // Remove the comment
    review.comments.pull(commentId);
    await review.save();

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
};

// Delete review
exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const adminId = req.user._id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ 
        success: false,
        message: 'Review not found' 
      });
    }

    // Only admin who created review can delete it
    if (review.createdBy.toString() !== adminId.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to delete this review' 
      });
    }

    // Replace review.remove() with findByIdAndDelete
    await Review.findByIdAndDelete(reviewId);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
};
exports.updateReview = async (req, res) => {
    try {
      const { reviewId } = req.params;
      const { content, rating } = req.body;
      const adminId = req.user._id;
  
      const review = await Review.findById(reviewId);
      if (!review) {
        return res.status(404).json({ 
          success: false,
          message: 'Review not found' 
        });
      }
  
      // Only admin who created review can update it
      if (review.createdBy.toString() !== adminId.toString()) {
        return res.status(403).json({ 
          success: false,
          message: 'Not authorized to update this review' 
        });
      }
  
      review.content = content;
      review.rating = rating;
      await review.save();
  
      res.status(200).json({
        success: true,
        data: review
      });
  
    } catch (error) {
      res.status(500).json({ 
        success: false,
        message: 'Server error',
        error: error.message 
      });
    }
  };

  exports.getCompletedTasksForReview = async (req, res) => {
    try {
      const { buildingId } = req.params;
      
      // Verify admin role
      const admin = await User.findOne({
        _id: req.user._id,
        role: 'SyndicateAdmin'
      });
      
      if (!admin) {
        return res.status(403).json({ 
          success: false,
          message: 'Only admins can view completed tasks' 
        });
      }
  
      // Get completed tasks for this building where status is 'Completed'
      const tasks = await Task.find({
        building: buildingId,
        status: 'Completed' // Only check top-level status
      })
      .populate('building', 'name')
      .populate('assignedTo', 'firstName lastName')
      .sort({ updatedAt: -1 });
  
      // Filter out tasks that already have reviews from this admin
      const tasksWithReviewStatus = await Promise.all(
        tasks.map(async task => {
          const existingReview = await Review.findOne({
            task: task._id,
            createdBy: req.user._id
          });
          return {
            ...task.toObject(),
            hasReview: !!existingReview,
            existingReviewId: existingReview?._id
          };
        })
      );
  
      res.status(200).json({
        success: true,
        data: tasksWithReviewStatus
      });
  
    } catch (error) {
      res.status(500).json({ 
        success: false,
        message: 'Server error',
        error: error.message 
      });
    }
  };
  
  exports.createTaskReview = async (req, res) => {
    try {
      const { taskId, content, rating, reviewId } = req.body;
      const adminId = req.user._id;
  
      // Verify admin role
      const admin = await User.findOne({
        _id: adminId,
        role: 'SyndicateAdmin'
      });
      if (!admin) {
        return res.status(403).json({ 
          success: false,
          message: 'Only SyndicateAdmins can create task reviews' 
        });
      }
  
      // Verify task exists and is completed
      const task = await Task.findById(taskId)
        .populate('building', 'name')
        .populate('assignmentRequests.worker', 'firstName lastName');
      
      if (!task) {
        return res.status(404).json({ 
          success: false,
          message: 'Task not found' 
        });
      }
      
      if (task.status !== 'Completed') {
        return res.status(400).json({ 
          success: false,
          message: 'Only completed tasks can be reviewed' 
        });
      }
  
      // Get the assigned worker from assignmentRequests or assignedTo field
      let workerId;
      let workerFirstName = '';
      let workerLastName = '';
      
      // First check assignmentRequests
      const assignedRequest = task.assignmentRequests.find(
        req => req.status === 'Accepted' || req.status === 'Completed'
      );
  
      if (assignedRequest && assignedRequest.worker) {
        workerId = assignedRequest.worker._id;
        workerFirstName = assignedRequest.worker.firstName;
        workerLastName = assignedRequest.worker.lastName;
      } 
      // If not found in assignmentRequests, check if task has assignedTo
      else if (task.assignedTo) {
        workerId = task.assignedTo;
        // Get worker details since we only have ID
        const worker = await User.findById(task.assignedTo).select('firstName lastName');
        if (worker) {
          workerFirstName = worker.firstName;
          workerLastName = worker.lastName;
        }
      } 
      // If still no worker found, try to find any worker in assignmentRequests (even if Pending)
      else if (task.assignmentRequests && task.assignmentRequests.length > 0) {
        workerId = task.assignmentRequests[0].worker._id;
        workerFirstName = task.assignmentRequests[0].worker.firstName;
        workerLastName = task.assignmentRequests[0].worker.lastName;
      }
  
      if (!workerId) {
        return res.status(400).json({ 
          success: false,
          message: 'No assigned worker found for this task' 
        });
      }
  
      let review;
      let isNewReview = false;
  
      if (reviewId) {
        // Update existing review
        review = await Review.findByIdAndUpdate(
          reviewId,
          {
            content,
            rating,
            updatedAt: new Date()
          },
          { new: true }
        );
      } else {
        // Check if review already exists for this task
        const existingReview = await Review.findOne({
          task: taskId,
          createdBy: adminId
        });
        
        if (existingReview) {
          return res.status(400).json({ 
            success: false,
            message: 'You have already reviewed this task' 
          });
        }
  
        // Create new review
        review = await Review.create({
          content,
          rating,
          createdBy: adminId,
          worker: workerId,
          building: task.building._id,
          country: task.country,
          city: task.city,
          task: taskId,
          isTaskReview: true
        });
  
        isNewReview = true;
      }
  
      // Send notification to worker if it's a new review
      if (isNewReview) {
        try {
          // Get admin user info for notification
          const adminUser = await User.findById(adminId).select('firstName lastName email profilePicture');
          
          // Get worker's language preference
          const workerLanguage = await getUserLanguage(workerId);
          
          // Get localized notification content
          const notificationData = getLocalizedNotification('taskReviewReceived', workerLanguage, {
            reviewerName: `${adminUser.firstName} ${adminUser.lastName}`,
            taskTitle: task.title,
            rating: rating,
            reviewContent: content.substring(0, 50) + (content.length > 50 ? '...' : '')
          });
          
          // Send notification to the worker
          await NotificationController.createNotification({
            recipient: workerId,
            type: 'alert',
            title: notificationData.title,
            content: notificationData.content,
            relatedTo: review._id,
            onModel: 'Review',
            senderName: `${adminUser.firstName} ${adminUser.lastName}`,
            senderAvatar: adminUser.profilePicture || null,
            reviewId: review._id,
            taskId: taskId
          });
          
          // Send socket notification if worker is online
          if (socketManager?.io) {
            const workerSocketId = socketManager.onlineUsers.get(workerId.toString());
            if (workerSocketId) {
              socketManager.io.to(workerSocketId).emit('notification', {
                type: 'alert',
                title: notificationData.title,
                content: notificationData.content,
                reviewId: review._id,
                taskId: taskId,
                createdAt: new Date()
              });
            }
          }
        } catch (notificationError) {
          // Log notification error but don't fail the request
          console.error('Error sending task review notification:', notificationError);
        }
      }
  
      return res.status(isNewReview ? 201 : 200).json({
        success: true,
        data: review
      });
  
    } catch (error) {
      console.error('Error in createTaskReview:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error',
        error: error.message 
      });
    }
  };
  
  // Get task review details
  exports.getTaskReview = async (req, res) => {
    try {
      const { reviewId } = req.params;
  
      const review = await Review.findById(reviewId)
        .populate('createdBy', 'firstName lastName')
        .populate('worker', 'firstName lastName')
        .populate('building', 'name')
        .populate('task', 'title description');
  
      if (!review) {
        return res.status(404).json({ 
          success: false,
          message: 'Review not found' 
        });
      }
  
      res.status(200).json({
        success: true,
        data: review
      });
  
    } catch (error) {
      res.status(500).json({ 
        success: false,
        message: 'Server error',
        error: error.message 
      });
    }
  };