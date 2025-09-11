const Task = require('../Models/Task');
const User = require('../Models/User');
const Building = require('../Models/Building');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const { socketManager } = require('../Socket/socketManager');
const NotificationController = require('./notificationsController');

// location normalization (for both country and city)
const normalizeLocation = (value) => {
  return (value || '').toLowerCase().trim();
};

const createTask = async (req, res) => {
  const { title, description, building } = req.body;
  const createdBy = req.user._id;

  try {
    // Check if user is a SyndicateAdmin 
    const admin = await User.findOne({
      _id: createdBy,
      role: 'SyndicateAdmin'
    });
    
    if (!admin) {
      return res.status(403).json({ 
        success: false,
        message: 'Only SyndicateAdmins can create tasks' 
      });
    }

    // Get building's country and city
    const buildingDoc = await Building.findById(building).select('address_country address_city');
    if (!buildingDoc) {
      return res.status(404).json({ 
        success: false,
        message: 'Building not found' 
      });
    }

    // Create task (use building's location)
    const task = await Task.create({
      title,
      description,
      createdBy,
      building,
      country: normalizeLocation(buildingDoc.address_country),
      city: normalizeLocation(buildingDoc.address_city),
      status: 'Available',
      priority: req.body.priority || 'Medium'
    });

    // Get admin user info for notification
    const adminUser = await User.findById(createdBy).select('firstName lastName email profilePicture');
    
    try {
      // NOTIFICATIONS PART 1: NOTIFY CO-OWNERS
      // Get building with coOwners to send notifications
      const buildingWithCoOwners = await Building.findById(building).populate('coOwners');
      
      if (buildingWithCoOwners?.coOwners?.length > 0) {
        console.log(`Creating notifications for ${buildingWithCoOwners.coOwners.length} co-owners`);
        
        for (const coOwner of buildingWithCoOwners.coOwners) {
          await NotificationController.createNotification({
            recipient: coOwner._id,
            type: 'alert',
            title: 'New Task Created',
            content: `${adminUser.firstName} ${adminUser.lastName} created a new task: "${title}" (${req.body.priority || 'Medium'} priority)`,
            relatedTo: task._id,
            onModel: 'Task',
            senderName: `${adminUser.firstName} ${adminUser.lastName}`,
            senderAvatar: adminUser.profilePicture || null,
            taskId: task._id
          });
          
          // Send socket notification if user is online
          if (socketManager?.io) {
            const coOwnerSocketId = socketManager.onlineUsers.get(coOwner._id.toString());
            if (coOwnerSocketId) {
              socketManager.io.to(coOwnerSocketId).emit('notification', {
                type: 'alert',
                title: 'New Task Created',
                content: `${adminUser.firstName} ${adminUser.lastName} created a new task: "${title}" (${req.body.priority || 'Medium'} priority)`,
                taskId: task._id,
                createdAt: new Date()
              });
            }
          }
        }
      }
      
      // NOTIFICATIONS PART 2: NOTIFY WORKERS IN SAME LOCATION
      const workersInArea = await User.find({
        role: 'Worker',
        country: { $regex: new RegExp(normalizeLocation(buildingDoc.address_country), 'i') },
        city: { $regex: new RegExp(normalizeLocation(buildingDoc.address_city), 'i') }
      });
      
      if (workersInArea?.length > 0) {
        console.log(`Creating notifications for ${workersInArea.length} workers in the area`);
        
        for (const worker of workersInArea) {
          await NotificationController.createNotification({
            recipient: worker._id,
            type: 'alert',
            title: 'New Task Available in Your Area',
            content: `A new task "${title}" (${req.body.priority || 'Medium'} priority) is available in your area`,
            relatedTo: task._id,
            onModel: 'Task',
            senderName: `${adminUser.firstName} ${adminUser.lastName}`,
            senderAvatar: adminUser.profilePicture || null,
            taskId: task._id
          });
          
          // Send socket notification if worker is online
          if (socketManager?.io) {
            const workerSocketId = socketManager.onlineUsers.get(worker._id.toString());
            if (workerSocketId) {
              socketManager.io.to(workerSocketId).emit('notification', {
                type: 'alert',
                title: 'New Task Available in Your Area',
                content: `A new task "${title}" (${req.body.priority || 'Medium'} priority) is available in your area`,
                taskId: task._id,
                createdAt: new Date()
              });
            }
          }
        }
      }
    } catch (notificationError) {
      // Log notification error but don't fail the request
      console.error('Error sending notifications:', notificationError);
    }

    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
};
const getAvailableTasks = async (req, res) => {
  try {
    const worker = await User.findById(req.user._id).select('city country ');
    console.log('Worker:', worker);
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    const workerCountry = normalizeLocation(worker.country);
    const workerCity = normalizeLocation(worker.city);
    console.log(workerCity)
    
    const tasks = await Task.find({
      country: workerCountry,
      city: workerCity,
      status: 'Available'
    })
    .populate('building', 'name address_country address_city')
    .populate('createdBy', 'firstName lastName');

    res.status(200).json(tasks);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



const respondToAssignment = async (req, res) => {
  const { taskId } = req.params;
  const { response } = req.body;
  const workerId = req.user._id;

  try {
    // Verify worker role
    if (req.user.role !== 'Worker') {
      return res.status(403).json({ 
        success: false,
        message: 'Only workers can respond to assignments' 
      });
    }

    // Find task
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ 
        success: false,
        message: 'Task not found' 
      });
    }

    // Find pending assignment
    const assignment = task.assignmentRequests.find(
      req => req.worker.toString() === workerId.toString() && req.status === 'Pending'
    );
    if (!assignment) {
      return res.status(400).json({ 
        success: false,
        message: 'No pending assignment found for this worker' 
      });
    }

    // Update based on response
    assignment.status = response;
    assignment.respondedAt = new Date();

    if (response === 'Accepted') {
      task.assignedTo = workerId;
      task.status = 'In Progress';
    } else {
      // Remove this assignment request when declined
      task.assignmentRequests = task.assignmentRequests.filter(
        req => !(req.worker.toString() === workerId.toString() && req.status === 'Pending')
      );
      task.status = 'Available';
    }

    await task.save();

    res.status(200).json({
      success: true,
      data: task
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
};

const getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({
      $or: [
        { 
          'assignmentRequests.worker': req.user._id,
          'assignmentRequests.status': 'Pending'
        },
        { 
          assignedTo: req.user._id,
          status: { $in: ['Assigned', 'In Progress'] }
        }
      ]
    })
    .populate('building', 'name address_country address_city')
    .populate('createdBy', 'firstName lastName');

    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateTaskStatus = async (req, res) => {
  const { taskId } = req.params;
  const { status } = req.body;
  const userId = req.user._id;

  try {
    const task = await Task.findById(taskId).populate('createdBy', '_id firstName lastName');
    if (!task) {
      return res.status(404).json({ 
        success: false,
        message: 'Task not found' 
      });
    }

    // Workers can only update their own tasks
    if (req.user.role === 'Worker') {
      // Check if task is assigned to this worker
      const isAssigned = task.assignedTo && task.assignedTo.toString() === userId.toString();
      const hasPendingAssignment = task.assignmentRequests?.some(
        req => req.worker.toString() === userId.toString() && req.status === 'Pending'
      );
      
      if (!isAssigned && !hasPendingAssignment) {
        return res.status(403).json({ 
          success: false,
          message: 'You can only update your own tasks' 
        });
      }
    }

    // Validate status transitions
    const validTransitions = {
      'Available': ['Assigned'],
      'Assigned': ['In Progress', 'Declined', 'Available'],
      'In Progress': ['Completed', 'Assigned'],
      'Completed': [],
      'Declined': ['Available', 'Assigned']
    };

    // Admins can override restrictions
    const isAdmin = req.user.role === 'SyndicateAdmin';
    
    if (!isAdmin) {
      if (!validTransitions[task.status] || !validTransitions[task.status].includes(status)) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid status transition',
          currentStatus: task.status,
          allowedTransitions: validTransitions[task.status] || []
        });
      }
    }

    // Save the previous status for notification
    const previousStatus = task.status;

    // If admin changes status back to Available, clear assignments
    if (isAdmin && status === 'Available') {
      task.assignedTo = null;
      task.assignmentRequests = task.assignmentRequests.filter(
        req => req.status !== 'Pending'
      );
    }

    task.status = status;
    
    // If completing a task, mark assignment as completed
    if (status === 'Completed' && task.assignedTo) {
      const assignment = task.assignmentRequests.find(
        req => req.worker.toString() === task.assignedTo.toString()
      );
      if (assignment) {
        assignment.status = 'Completed';
      }
    }

    await task.save();

    // Send notification to syndicate admin if a worker updated the status
    if (req.user.role === 'Worker' && task.createdBy) {
      try {
        // Get worker details
        const worker = await User.findById(userId).select('firstName lastName profilePicture');
        if (!worker) {
          throw new Error('Worker not found');
        }

        // Send notification to the syndicate admin
        await NotificationController.createNotification({
          recipient: task.createdBy._id,
          type: 'alert',
          title: 'Task Status Updated',
          content: `${worker.firstName} ${worker.lastName} has updated task "${task.title}" status from ${previousStatus} to ${status}`,
          relatedTo: task._id,
          onModel: 'Task',
          senderName: `${worker.firstName} ${worker.lastName}`,
          senderAvatar: worker.profilePicture || null,
          taskId: task._id
        });
        
        // Send socket notification if admin is online
        if (socketManager?.io) {
          const adminSocketId = socketManager.onlineUsers.get(task.createdBy._id.toString());
          if (adminSocketId) {
            socketManager.io.to(adminSocketId).emit('notification', {
              type: 'alert',
              title: 'Task Status Updated',
              content: `${worker.firstName} ${worker.lastName} has updated task "${task.title}" status from ${previousStatus} to ${status}`,
              taskId: task._id,
              createdAt: new Date()
            });
          }
        }
      } catch (notificationError) {
        // Log notification error but don't fail the request
        console.error('Error sending task status update notification:', notificationError);
      }
    }

    res.status(200).json({
      success: true,
      data: task
    });

  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
};

const addCommentToTask = async (req, res) => {
  const { taskId } = req.params;
  const { text } = req.body;
  const createdBy = req.user._id;

  try {
    // Find task with creator info
    const task = await Task.findById(taskId).populate('createdBy', '_id firstName lastName');
    if (!task) {
      return res.status(404).json({ 
        success: false,
        message: 'Task not found' 
      });
    }

    // Get commenter details
    const commenter = await User.findById(createdBy).select('firstName lastName profilePicture role');
    if (!commenter) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    task.comments.push({ 
      text, 
      createdBy,
      createdAt: new Date()
    });
    await task.save();

    // Populate the updated task with all necessary fields
    const updatedTask = await Task.findById(taskId)
      .populate('building', 'name address_country address_city')
      .populate('createdBy', 'firstName lastName')
      .populate('assignedTo', 'firstName lastName')
      .populate({
        path: 'comments.createdBy',
        select: 'firstName lastName'
      })
      .populate({
        path: 'assignmentRequests.worker',
        select: 'firstName lastName'
      });

    // Send notification to the task creator (syndicate admin)
    try {
      // Don't notify if the commenter is the task creator
      if (task.createdBy._id.toString() !== createdBy.toString()) {
        await NotificationController.createNotification({
          recipient: task.createdBy._id,
          type: 'alert',
          title: 'New Comment on Task',
          content: `${commenter.firstName} ${commenter.lastName} (${commenter.role}) commented on task: "${task.title}": "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
          relatedTo: task._id,
          onModel: 'Task',
          senderName: `${commenter.firstName} ${commenter.lastName}`,
          senderAvatar: commenter.profilePicture || null,
          taskId: task._id
        });
        
        // Send socket notification if admin is online
        if (socketManager?.io) {
          const adminSocketId = socketManager.onlineUsers.get(task.createdBy._id.toString());
          if (adminSocketId) {
            socketManager.io.to(adminSocketId).emit('notification', {
              type: 'alert',
              title: 'New Comment on Task',
              content: `${commenter.firstName} ${commenter.lastName} (${commenter.role}) commented on task: "${task.title}": "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
              taskId: task._id,
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
      data: updatedTask
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
};

const assignTaskToWorker = async (req, res) => {
  const { taskId } = req.params;
  const { workerId } = req.body;
  const adminId = req.user._id;

  try {
    const admin = await User.findOne({
      _id: adminId,
      role: 'SyndicateAdmin'
    });
    if (!admin) {
      return res.status(403).json({ 
        success: false,
        message: 'Only SyndicateAdmins can assign tasks' 
      });
    }

    // Verify worker exists
    const worker = await User.findOne({
      _id: workerId,
      role: 'Worker'
    });
    if (!worker) {
      return res.status(400).json({ 
        success: false,
        message: 'Worker not found' 
      });
    }

    // Verify task exists and is available
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ 
        success: false,
        message: 'Task not found' 
      });
    }
    if (task.status !== 'Available') {
      return res.status(400).json({ 
        success: false,
        message: 'Task is not available for assignment' 
      });
    }

    // Create assignment
    task.assignmentRequests.push({
      worker: workerId,
      status: 'Pending',
      requestedAt: new Date()
    });
    task.status = 'Assigned';
    task.assignedTo = workerId; // Add this line to set assignedTo
    await task.save();

    // Get updated task with populated fields
    const updatedTask = await Task.findById(taskId)
      .populate('building', 'name address_country address_city')
      .populate('createdBy', 'firstName lastName')
      .populate('assignedTo', 'firstName lastName')
      .populate({
        path: 'comments.createdBy',
        select: 'firstName lastName'
      })
      .populate({
        path: 'assignmentRequests.worker',
        select: 'firstName lastName'
      });

    // Get admin user info for notification
    const adminUser = await User.findById(adminId).select('firstName lastName email profilePicture');
    
    try {
      // Send notification to the worker
      await NotificationController.createNotification({
        recipient: workerId,
        type: 'alert',
        title: 'New Task Assigned',
        content: `${adminUser.firstName} ${adminUser.lastName} has assigned you a task: "${task.title}" (${task.priority} priority)`,
        relatedTo: task._id,
        onModel: 'Task',
        senderName: `${adminUser.firstName} ${adminUser.lastName}`,
        senderAvatar: adminUser.profilePicture || null,
        taskId: task._id
      });
      
      // Send socket notification if worker is online
      if (socketManager?.io) {
        const workerSocketId = socketManager.onlineUsers.get(workerId.toString());
        if (workerSocketId) {
          socketManager.io.to(workerSocketId).emit('notification', {
            type: 'alert',
            title: 'New Task Assigned',
            content: `${adminUser.firstName} ${adminUser.lastName} has assigned you a task: "${task.title}" (${task.priority} priority)`,
            taskId: task._id,
            createdAt: new Date()
          });
        }
      }
    } catch (notificationError) {
      // Log notification error but don't fail the request
      console.error('Error sending assignment notification:', notificationError);
    }

    res.status(200).json({
      success: true,
      data: updatedTask
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
};

const getWorkersByBuilding = async (req, res) => {
  const { buildingId } = req.params;

  try {
    // Verify admin (but no location check)
    const admin = await User.findOne({
      _id: req.user._id,
      role: 'SyndicateAdmin'
    });
    
    if (!admin) {
      return res.status(403).json({ message: 'Only admins can view workers' });
    }

    // Get the building's country and city
    const building = await Building.findById(buildingId).select('address_country address_city');
    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    const buildingCountry = normalizeLocation(building.address_country);
    const buildingCity = normalizeLocation(building.address_city);

    // Find workers in the same location as the building
    const workers = await User.find({ 
      role: 'Worker',
      country: { $regex: new RegExp(buildingCountry, 'i') },
      city: { $regex: new RegExp(buildingCity, 'i') }
    }).select('firstName lastName email country city');

    res.status(200).json(workers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllTasks = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || (user.role !== 'SyndicateAdmin' && user.role !== 'SyndicateCoowner')) {
      return res.status(403).json({ 
        success: false,
        message: 'Only admins or coowners can view tasks' 
      });
    }

    let query = {};
    
    if (user.role === 'SyndicateAdmin') {
      // Admins see tasks they created
      query.createdBy = user._id;
    } else {
      // Coowners see tasks for buildings they co-own
      const buildings = await Building.find({ 
        $or: [
          { coOwners: user._id }
        ]
      }).select('_id');
      
      if (!buildings.length) {
        return res.status(200).json([]);
      }
      
      query.building = { $in: buildings.map(b => b._id) };
    }

    const tasks = await Task.find(query)
      .populate('building', 'name address_country address_city')
      .populate('createdBy', 'firstName lastName')
      .populate('assignedTo', 'firstName lastName')
      .populate({
        path: 'comments.createdBy',
        select: 'firstName lastName'
      })
      .populate({
        path: 'assignmentRequests.worker',
        select: 'firstName lastName'
      })
      .sort({ createdAt: -1 });

    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
};

const updateTask = async (req, res) => {
  const { taskId } = req.params;
  const { title, description,priority  } = req.body;
  const userId = req.user._id;

  try {
    // Verify admin
    const admin = await User.findOne({
      _id: userId,
      role: 'SyndicateAdmin'
    });
    
    if (!admin) {
      return res.status(403).json({ 
        success: false,
        message: 'Only SyndicateAdmins can update tasks' 
      });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ 
        success: false,
        message: 'Task not found' 
      });
    }

    // Update task fields
    if (title) task.title = title;
    if (description) task.description = description;
    if (priority) task.priority = priority;

    await task.save();

    res.status(200).json({
      success: true,
      data: task
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
};

const deleteTask = async (req, res) => {
  const { taskId } = req.params;
  const userId = req.user._id;

  try {
    // Verify admin
    const admin = await User.findOne({
      _id: userId,
      role: 'SyndicateAdmin'
    });
    
    if (!admin) {
      return res.status(403).json({ 
        success: false,
        message: 'Only SyndicateAdmins can delete tasks' 
      });
    }

    const task = await Task.findByIdAndDelete(taskId);
    if (!task) {
      return res.status(404).json({ 
        success: false,
        message: 'Task not found' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
};

const requestTaskAssignment = async (req, res) => {
  const { taskId } = req.params;
  const workerId = req.user._id;

  try {
    // Verify worker role
    if (req.user.role !== 'Worker') {
      return res.status(403).json({ 
        success: false,
        message: 'Only workers can request tasks' 
      });
    }

    // Get worker's location and details
    const worker = await User.findById(workerId).select('firstName lastName country city profilePicture');
    if (!worker) {
      return res.status(404).json({ 
        success: false,
        message: 'Worker not found' 
      });
    }

    // Find task with creator info
    const task = await Task.findById(taskId)
      .populate('building', 'address_country address_city')
      .populate('createdBy', '_id firstName lastName');
    
    if (!task) {
      return res.status(404).json({ 
        success: false,
        message: 'Task not found' 
      });
    }

    // Check if task is in same location
    if (normalizeLocation(task.building.address_country) !== normalizeLocation(worker.country) ||
        normalizeLocation(task.building.address_city) !== normalizeLocation(worker.city)) {
      return res.status(400).json({ 
        success: false,
        message: 'Task is not available in your location' 
      });
    }

    // Check if task is available
    if (task.status !== 'Available') {
      return res.status(400).json({ 
        success: false,
        message: 'Task is not available for assignment' 
      });
    }

    // Check if worker already requested this task
    const existingRequest = task.taskRequests.find(
      req => req.worker.toString() === workerId.toString()
    );
    
    if (existingRequest) {
      return res.status(400).json({ 
        success: false,
        message: 'You have already requested this task' 
      });
    }

    // Add request
    task.taskRequests.push({
      worker: workerId,
      status: 'Pending',
      requestedAt: new Date()
    });
    
    await task.save();

    // Get the task creator/syndicate admin ID for notification
    const syndicateAdminId = task.createdBy._id;

    try {
      // Send notification to the syndicate admin
      await NotificationController.createNotification({
        recipient: syndicateAdminId,
        type: 'alert',
        title: 'New Task Assignment Request',
        content: `${worker.firstName} ${worker.lastName} has requested to be assigned to task: "${task.title}" (${task.priority} priority)`,
        relatedTo: task._id,
        onModel: 'Task',
        senderName: `${worker.firstName} ${worker.lastName}`,
        senderAvatar: worker.profilePicture || null,
        taskId: task._id
      });
      
      // Send socket notification if syndicate admin is online
      if (socketManager?.io) {
        const adminSocketId = socketManager.onlineUsers.get(syndicateAdminId.toString());
        if (adminSocketId) {
          socketManager.io.to(adminSocketId).emit('notification', {
            type: 'alert',
            title: 'New Task Assignment Request',
            content: `${worker.firstName} ${worker.lastName} has requested to be assigned to task: "${task.title}" (${task.priority} priority)`,
            taskId: task._id,
            createdAt: new Date()
          });
        }
      }
    } catch (notificationError) {
      // Log notification error but don't fail the request
      console.error('Error sending task request notification:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: 'Task request submitted',
      data: task
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
};

const respondToTaskRequest = async (req, res) => {
  const { taskId, workerId } = req.params;
  const { response } = req.body;
  const adminId = req.user._id;

  try {
    // Verify admin role
    const admin = await User.findOne({
      _id: adminId,
      role: 'SyndicateAdmin'
    });
    
    if (!admin) {
      return res.status(403).json({ 
        success: false,
        message: 'Only admins can respond to task requests' 
      });
    }

    // Find task
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ 
        success: false,
        message: 'Task not found' 
      });
    }

    // Find the request
    const requestIndex = task.taskRequests.findIndex(
      req => req.worker.toString() === workerId.toString() && req.status === 'Pending'
    );
    
    if (requestIndex === -1) {
      return res.status(404).json({ 
        success: false,
        message: 'No pending request found for this worker' 
      });
    }

    // Update the request
    task.taskRequests[requestIndex].status = response;
    task.taskRequests[requestIndex].respondedAt = new Date();

    // If accepted, assign the task and reject other requests
    if (response === 'Accepted') {
      task.assignedTo = workerId;
      task.status = 'Assigned';
      
      // Reject all other pending requests
      task.taskRequests.forEach(req => {
        if (req.status === 'Pending' && req.worker.toString() !== workerId.toString()) {
          req.status = 'Rejected';
          req.respondedAt = new Date();
        }
      });
    }

    await task.save();

    // Get admin user info for notification
    const adminUser = await User.findById(adminId).select('firstName lastName email profilePicture');
    
    try {
      // Send notification to the worker
      await NotificationController.createNotification({
        recipient: workerId,
        type: 'alert',
        title: response === 'Accepted' ? 'Task Request Accepted' : 'Task Request Rejected',
        content: response === 'Accepted' 
          ? `${adminUser.firstName} ${adminUser.lastName} has accepted your request for task: "${task.title}" (${task.priority} priority)`
          : `${adminUser.firstName} ${adminUser.lastName} has rejected your request for task: "${task.title}" (${task.priority} priority)`,
        relatedTo: task._id,
        onModel: 'Task',
        senderName: `${adminUser.firstName} ${adminUser.lastName}`,
        senderAvatar: adminUser.profilePicture || null,
        taskId: task._id
      });
      
      // Send socket notification if worker is online
      if (socketManager?.io) {
        const workerSocketId = socketManager.onlineUsers.get(workerId.toString());
        if (workerSocketId) {
          socketManager.io.to(workerSocketId).emit('notification', {
            type: 'alert',
            title: response === 'Accepted' ? 'Task Request Accepted' : 'Task Request Rejected',
            content: response === 'Accepted' 
              ? `${adminUser.firstName} ${adminUser.lastName} has accepted your request for task: "${task.title}" (${task.priority} priority)`
              : `${adminUser.firstName} ${adminUser.lastName} has rejected your request for task: "${task.title}" (${task.priority} priority)`,
            taskId: task._id,
            createdAt: new Date()
          });
        }
      }
    } catch (notificationError) {
      // Log notification error but don't fail the request
      console.error('Error sending task response notification:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: `Task request ${response.toLowerCase()}`,
      data: task
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
};

const getTaskRequests = async (req, res) => {
  try {
    // Verify admin role
    const admin = await User.findOne({
      _id: req.user._id,
      role: 'SyndicateAdmin'
    });
    
    if (!admin) {
      return res.status(403).json({ 
        success: false,
        message: 'Only admins can view task requests' 
      });
    }

    // Find tasks with pending requests created by this admin
    const tasks = await Task.find({
      createdBy: req.user._id,
      'taskRequests.status': 'Pending'
    })
    .populate('building', 'name address_country address_city')
    .populate('taskRequests.worker', 'firstName lastName country city')
    .populate('assignedTo', 'firstName lastName');

    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
};

module.exports = {
  createTask,
  getAvailableTasks,
  assignTaskToWorker,
  respondToAssignment,
  getMyTasks,
  updateTaskStatus,
  addCommentToTask,
  getWorkersByBuilding: getWorkersByBuilding,
  getAllTasks,
  updateTask,
  deleteTask,
  getTaskRequests,
  respondToTaskRequest,
  requestTaskAssignment,
};