const Claim = require('../Models/Claim');
const User = require('../Models/User');
const Building = require('../Models/Building');
const Task = require('../Models/Task');
const mongoose = require('mongoose');
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
  claimSubmitted: {
    en: {
      title: 'New Claim Submitted',
      content: '{userName} submitted a new claim: {claimTitle}'
    },
    fr: {
      title: 'Nouvelle réclamation soumise',
      content: '{userName} a soumis une nouvelle réclamation : {claimTitle}'
    },
    it: {
      title: 'Nuovo reclamo inviato',
      content: '{userName} ha inviato un nuovo reclamo: {claimTitle}'
    },
    sp: {
      title: 'Nueva reclamación enviada',
      content: '{userName} envió una nueva reclamación: {claimTitle}'
    }
  },
  claimResolved: {
    en: {
      title: 'Claim Resolved',
      content: 'Your claim "{claimTitle}" has been resolved by the admin',
      contentWithNote: 'Your claim "{claimTitle}" has been resolved by the admin. Note: {adminNote}'
    },
    fr: {
      title: 'Réclamation résolue',
      content: 'Votre réclamation "{claimTitle}" a été résolue par l\'administrateur',
      contentWithNote: 'Votre réclamation "{claimTitle}" a été résolue par l\'administrateur. Note : {adminNote}'
    },
    it: {
      title: 'Reclamo risolto',
      content: 'Il tuo reclamo "{claimTitle}" è stato risolto dall\'amministratore',
      contentWithNote: 'Il tuo reclamo "{claimTitle}" è stato risolto dall\'amministratore. Nota: {adminNote}'
    },
    sp: {
      title: 'Reclamación resuelta',
      content: 'Tu reclamación "{claimTitle}" ha sido resuelta por el administrador',
      contentWithNote: 'Tu reclamación "{claimTitle}" ha sido resuelta por el administrador. Nota: {adminNote}'
    }
  },
  claimRejected: {
    en: {
      title: 'Claim Rejected',
      content: 'Your claim "{claimTitle}" has been rejected by the admin',
      contentWithNote: 'Your claim "{claimTitle}" has been rejected by the admin. Note: {adminNote}'
    },
    fr: {
      title: 'Réclamation rejetée',
      content: 'Votre réclamation "{claimTitle}" a été rejetée par l\'administrateur',
      contentWithNote: 'Votre réclamation "{claimTitle}" a été rejetée par l\'administrateur. Note : {adminNote}'
    },
    it: {
      title: 'Reclamo rifiutato',
      content: 'Il tuo reclamo "{claimTitle}" è stato rifiutato dall\'amministratore',
      contentWithNote: 'Il tuo reclamo "{claimTitle}" è stato rifiutato dall\'amministratore. Nota: {adminNote}'
    },
    sp: {
      title: 'Reclamación rechazada',
      content: 'Tu reclamación "{claimTitle}" ha sido rechazada por el administrador',
      contentWithNote: 'Tu reclamación "{claimTitle}" ha sido rechazada por el administrador. Nota: {adminNote}'
    }
  },
  claimConvertedToTask: {
    en: {
      title: 'Claim Converted to Task',
      content: 'Your claim "{claimTitle}" has been converted to a task'
    },
    fr: {
      title: 'Réclamation convertie en tâche',
      content: 'Votre réclamation "{claimTitle}" a été convertie en tâche'
    },
    it: {
      title: 'Reclamo convertito in attività',
      content: 'Il tuo reclamo "{claimTitle}" è stato convertito in un\'attività'
    },
    sp: {
      title: 'Reclamación convertida en tarea',
      content: 'Tu reclamación "{claimTitle}" ha sido convertida en una tarea'
    }
  }
};

// Helper function to get localized notification content
const getLocalizedNotification = (templateKey, language, variables = {}) => {
  const template = notificationTemplates[templateKey][language] || notificationTemplates[templateKey].en;
  
  let title = template.title;
  let content = template.content;
  
  // Handle special case for contentWithNote
  if (variables.adminNote && template.contentWithNote) {
    content = template.contentWithNote;
  }
  
  // Replace variables in title and content
  Object.keys(variables).forEach(key => {
    const placeholder = `{${key}}`;
    title = title.replace(new RegExp(placeholder, 'g'), variables[key]);
    content = content.replace(new RegExp(placeholder, 'g'), variables[key]);
  });
  
  return { title, content };
};

// @desc    Create a new claim
const createClaim = async (req, res) => {
  const { title, description, taskId, buildingId } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let building;
    if (buildingId) {
      building = await Building.findById(buildingId);
    } else if (taskId) {
      // If task is selected, get building from task
      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      building = await Building.findById(task.building);
    } else {
      // If no task or building selected, get user's first building
      const buildings = await Building.find({
        $or: [
          { user: req.user.id },
          { coOwners: req.user.id }
        ]
      });

      if (!buildings || buildings.length === 0) {
        return res.status(400).json({ message: 'User is not associated with any building' });
      }
      building = buildings[0];
    }

    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    // Check if user has access to this building
    const hasAccess = building.user.equals(req.user.id) ||
      building.coOwners.some(coOwner => coOwner.equals(req.user.id));
    if (!hasAccess) {
      return res.status(403).json({ message: 'Not authorized for this building' });
    }

    // Create the claim
    const claim = await Claim.create({
      userId: req.user.id,
      title,
      description,
      task: taskId || null,
      building: building._id
    });


    if (user.role === 'SyndicateCoowner') {
      const buildingAdmin = await User.findById(building.user);

      if (buildingAdmin) {
        // Get admin's language preference
        const adminLanguage = await getUserLanguage(buildingAdmin._id);
        
        // Get localized notification content
        const notificationData = getLocalizedNotification('claimSubmitted', adminLanguage, {
          userName: `${user.firstName} ${user.lastName}`,
          claimTitle: title
        });

        // Create notification for the admin
        const notification = await NotificationController.createNotification({
          recipient: buildingAdmin._id,
          type: 'alert',
          title: notificationData.title,
          content: notificationData.content,
          relatedTo: claim._id,
          onModel: 'Claim',
          senderName: `${user.firstName} ${user.lastName}`,
          senderAvatar: user._id || null
        });
        // Add debugging in your createClaim function
        if (!socketManager || !socketManager.io) {
          console.error('⚠️ Socket manager not properly initialized in claimsController');
        } else {
          console.log('✓ Socket manager correctly initialized');
        }

        // In the notification sending section:
        const adminSocketId = socketManager.onlineUsers.get(buildingAdmin._id.toString());
        if (adminSocketId) {
          socketManager.io.to(adminSocketId).emit('notification', {
            ...notification.toObject(),
            claimId: claim._id,
            buildingId: building._id,
            buildingName: building.name,
            claimImage: '/claim-icon.png'
          });
        }
      }
    }



    res.status(201).json(claim);
  } catch (error) {
    res.status(400).json({ message: 'Invalid claim data', error: error.message });
  }
};

// @desc    Get all claims for the logged-in user
const getUserClaims = async (req, res) => {
  try {
    const { buildingId } = req.query;
    let query = {};

    if (buildingId) {
      // Check building access first
      const building = await Building.findById(buildingId);
      if (!building) {
        return res.status(404).json({ message: 'Building not found' });
      }

      const hasAccess = building.user.equals(req.user.id) ||
        building.coOwners.some(coOwner => coOwner.equals(req.user.id));
      if (!hasAccess) {
        return res.status(403).json({ message: 'Not authorized for this building' });
      }

      query.building = buildingId;
    } else {
      // If no building specified, get all buildings user has access to
      const buildings = await Building.find({
        $or: [
          { user: req.user.id },
          { coOwners: req.user.id }
        ]
      }).select('_id');

      if (!buildings || buildings.length === 0) {
        return res.status(200).json([]);
      }

      query.building = { $in: buildings.map(b => b._id) };
    }

    // For coowners, only show their own claims
    if (req.user.role === 'SyndicateCoowner') {
      query.userId = req.user.id;
    }

    const claims = await Claim.find(query)
      .populate('task', 'title status')
      .populate('building', 'name')
      .populate('userId', 'firstName lastName email');

    res.status(200).json(claims);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get tasks for claim dropdown (tasks in user's buildings)
const getTasksForClaim = async (req, res) => {
  try {
    const { buildingId } = req.query;
    let buildingQuery = {};

    if (buildingId) {
      buildingQuery._id = buildingId;
    } else {
      buildingQuery.$or = [
        { user: req.user.id },
        { coOwners: req.user.id }
      ];
    }

    // Find buildings where user has access
    const buildings = await Building.find(buildingQuery);

    if (!buildings || buildings.length === 0) {
      return res.status(200).json([]);
    }

    const buildingIds = buildings.map(b => b._id);

    // Find tasks in these buildings
    const tasks = await Task.find({
      building: { $in: buildingIds },
      status: { $in: ['Available', 'Assigned', 'In Progress'] }
    }).select('title description status building')
      .populate('building', 'name');

    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update a claim
const updateClaim = async (req, res) => {
  const { title, description, status, taskId, buildingId, adminNote } = req.body;

  try {
    // Check if the user exists
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const claim = await Claim.findById(req.params.id);

    if (!claim) {
      return res.status(404).json({ message: 'Claim not found' });
    }

    // Check authorization
    if (req.user.role === 'SyndicateCoowner' && claim.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // For admins, check building access
    if (req.user.role === 'SyndicateAdmin') {
      const building = await Building.findById(claim.building);
      const hasAccess = building.user.equals(req.user.id) ||
        building.coOwners.some(coOwner => coOwner.equals(req.user.id));
      if (!hasAccess) {
        return res.status(403).json({ message: 'Not authorized for this building' });
      }
    }

    // Handle task change
    if (taskId && taskId !== claim.task?.toString()) {
      const newTask = await Task.findById(taskId);
      if (!newTask) {
        return res.status(404).json({ message: 'Task not found' });
      }

      claim.task = taskId;
      claim.building = newTask.building;
    }

    // Check if status is being updated and user is admin
    if (status && status !== claim.status && req.user.role === 'SyndicateAdmin') {
      // If changing status to Resolved or Rejected, send notification to claim creator
      if (status === 'Resolved' || status === 'Rejected') {
        const claimCreator = await User.findById(claim.userId);

        if (claimCreator && claimCreator.role === 'SyndicateCoowner') {
          // Get claim creator's language preference
          const creatorLanguage = await getUserLanguage(claimCreator._id);
          
          // Get localized notification content based on status
          const templateKey = status === 'Resolved' ? 'claimResolved' : 'claimRejected';
          const notificationData = getLocalizedNotification(templateKey, creatorLanguage, {
            claimTitle: claim.title,
            adminNote: adminNote
          });
            
          const notification = await NotificationController.createNotification({
            recipient: claimCreator._id,
            type: 'alert',
            title: notificationData.title,
            content: notificationData.content,
            relatedTo: claim._id,
            onModel: 'Claim', 
            senderName: `${req.user.firstName} ${req.user.lastName}`,
            senderAvatar: req.user._id || null
          });

          // Send real-time notification if recipient is online
          const recipientSocketId = socketManager.onlineUsers.get(claimCreator._id.toString());
          if (recipientSocketId) {
            socketManager.io.to(recipientSocketId).emit('notification', {
              ...notification.toObject(),
              claimId: claim._id,
              buildingId: claim.building,
              status: status,
              adminNote: adminNote || null
            });
            console.log(`✓ Status change notification sent to ${claimCreator._id}`);
          }
        }
      }
    }
    
    claim.title = title || claim.title;
    claim.description = description || claim.description;
    claim.status = status || claim.status;
    
    // Only update adminNote if user is an admin and a note is provided
    if (req.user.role === 'SyndicateAdmin' && adminNote !== undefined) {
      claim.adminNote = adminNote;
    }
    
    claim.updatedAt = Date.now();

    await claim.save();

    res.status(200).json(claim);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// @desc    Delete a claim
const deleteClaim = async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id);

    if (!claim) {
      return res.status(404).json({ message: 'Claim not found' });
    }

    // Check authorization
    if (req.user.role === 'SyndicateCoowner' && claim.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // For admins, check building access
    if (req.user.role === 'SyndicateAdmin') {
      const building = await Building.findById(claim.building);
      const hasAccess = building.user.equals(req.user.id) ||
        building.coOwners.some(coOwner => coOwner.equals(req.user.id));
      if (!hasAccess) {
        return res.status(403).json({ message: 'Not authorized for this building' });
      }
    }

    await claim.deleteOne();

    res.status(200).json({ message: 'Claim deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const convertClaimToTask = async (req, res) => {
  try {
    const { claimId } = req.params;
    const { title, description, priority, buildingId } = req.body;

    // Check if user has admin role
    if (req.user.role !== 'SyndicateAdmin') {
      return res.status(403).json({ message: 'Only admins can convert claims to tasks' });
    }

    // Get the claim
    const claim = await Claim.findById(claimId);
    if (!claim) {
      return res.status(404).json({ message: 'Claim not found' });
    }

    // Check if claim is already resolved
    if (claim.status === 'Resolved') {
      return res.status(400).json({ message: 'Claim is already resolved' });
    }

    // Get the building
    const building = buildingId ? await Building.findById(buildingId) : await Building.findById(claim.building);
    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    // Create task from claim
    const task = await Task.create({
      title: title || claim.title,
      description: description || claim.description,
      createdBy: req.user._id,
      building: building._id,
      country: building.address_country.toLowerCase().trim(),
      city: building.address_city.toLowerCase().trim(),
      status: 'Available',
      priority: priority || 'Medium',
      relatedClaim: claim._id
    });

    // Update claim status to resolved
    claim.status = 'Resolved';
    claim.updatedAt = Date.now();
    await claim.save();
    const claimCreator = await User.findById(claim.userId);
    if (claimCreator && claimCreator.role === 'SyndicateCoowner') {
      // Get claim creator's language preference
      const creatorLanguage = await getUserLanguage(claimCreator._id);
      
      // Get localized notification content
      const notificationData = getLocalizedNotification('claimConvertedToTask', creatorLanguage, {
        claimTitle: claim.title
      });

      // Create notification
      const notification = await NotificationController.createNotification({
        recipient: claimCreator._id,
        type: 'alert',
        title: notificationData.title,
        content: notificationData.content,
        relatedTo: task._id, // Reference the created task
        onModel: 'Task', 
        senderName: `${req.user.firstName} ${req.user.lastName}`,
        senderAvatar: req.user._id || null
      });

      // Send real-time notification if recipient is online
      const recipientSocketId = socketManager.onlineUsers.get(claimCreator._id.toString());
      if (recipientSocketId) {
        socketManager.io.to(recipientSocketId).emit('notification', {
          ...notification.toObject(),
          claimId: claim._id,
          taskId: task._id,
          buildingId: task.building,
          conversionNotification: true // Special flag for conversion notifications
        });
        console.log(`✓ Task conversion notification sent to ${claimCreator._id}`);
      }
    }
    res.status(201).json({
      claimId: claim._id,
      claim: claim,
      task: task
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


module.exports = {
  createClaim,
  getUserClaims,
  updateClaim,
  deleteClaim,
  getTasksForClaim,
  convertClaimToTask
};