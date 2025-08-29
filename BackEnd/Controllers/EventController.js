const Event = require("../Models/Event");
const User = require("../Models/User");
const Building = require("../Models/Building");
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { socketManager } = require('../Socket/socketManager');
const NotificationController = require('./notificationsController');
// At the top, add:
const { generateJitsiToken } = require('../Utils/JitsiServer');
const Apartment = require("../Models/Appartement");
// Ajouter ces imports au début du fichier
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');




const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/events');

    // Créer le répertoire s'il n'existe pas
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});
const fileFilter = (req, file, cb) => {
  // Définir les types de fichiers autorisés
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non supporté'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // Limite: 10MB
});
// Add this new function for getting a single event with full population:

const getSingleEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId)
      .populate('selectedCoOwners', 'firstName lastName email')
      .populate('selectedBlocs', 'name')
      .populate({
        path: 'selectedApartments',
        select: 'number floor',
        populate: {
          path: 'bloc',
          select: 'name'
        }
      })
      .populate('user', 'firstName lastName email')
      .populate('building', 'name');

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    return res.status(200).json(event);
  } catch (error) {
    console.error("Error fetching single event:", error);
    return res.status(500).json({ message: error.message });
  }
};




const getEvents = async (req, res) => {
  try {
    const buildingId = req.params.buildingId;
    const userId = req.user.id;

    let events;

    if (req.user.role === 'SyndicateAdmin') {
      // Admin can see all events in the building
      events = await Event.find({ building: buildingId })
        .populate('selectedCoOwners', 'firstName lastName email')
        .populate('selectedBlocs', 'name')
        .populate('selectedApartments', 'number floor')
        .populate('user', 'firstName lastName email')
        .populate({
          path: 'building',
          select: 'name'
        });
    } else {
      // For co-owners, we need to find events where:
      // 1. The event is for all co-owners in the building, OR
      // 2. The co-owner is specifically selected, OR
      // 3. The co-owner owns an apartment that's selected, OR
      // 4. The co-owner owns an apartment in a selected bloc

      // First get the apartments owned by this co-owner
      const ownedApartments = await Apartment.find({
        coOwner: userId,
        building: buildingId
      });

      const ownedApartmentIds = ownedApartments.map(apt => apt._id);
      const ownedBlocIds = ownedApartments.map(apt => apt.bloc);

      // Find events that match our criteria
      events = await Event.find({
        building: buildingId,
        $or: [
          { isForAllCoOwners: true }, // For all co-owners
          { selectedCoOwners: userId }, // Legacy: directly selected
          { selectedApartments: { $in: ownedApartmentIds } }, // Apartment-specific
          { selectedBlocs: { $in: ownedBlocIds } } // Bloc-specific
        ]
      })
        .populate('selectedCoOwners', 'firstName lastName email')
        .populate('selectedBlocs', 'name')
        .populate('selectedApartments', 'number floor')
        .populate('user', 'firstName lastName email')
        .populate({
          path: 'building',
          select: 'name'
        });

      // Add delegate handling code here (as in your original function)
      const usersWithDelegate = await User.find({
        'delegates.user': userId,
        'delegates.meetingDelegation.isActive': true,
        $or: [
          { 'delegates.type': 'meeting' },
          { 'delegates.type': 'both' }
        ]
      });

      if (usersWithDelegate && usersWithDelegate.length > 0) {
        // Implementation for delegate functionality remains similar to existing code
        // This includes finding additional events where the user serves as a delegate
        // (left out for brevity - retain your existing implementation)
      }
    }

    return res.status(200).json(events || []);
  } catch (error) {
    console.error("Error fetching events:", error);
    return res.status(500).json({ message: error.message });
  }
};
const updateEvent = async (req, res) => {
  const { id } = req.params;
  
  try {
    console.log("Update Event Request Body:", req.body); // Log the incoming request body
    
    // Extract values with better fallbacks
    const {
      title,
      start,
      eventTime,
      description,
      location,
      className,
      isForAllCoOwners,
      selectedBlocs = [],
      selectedApartments = [],
      documentDescriptions = [],
      endTime,
      removeDocuments = []
    } = req.body;

    // Validation checks
    if (!title || title.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: "Title is required" 
      });
    }

    if (!eventTime || eventTime.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Event time is required"
      });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Parse and validate the start date
    let parsedStartDate;
    try {
      parsedStartDate = new Date(start);
      if (isNaN(parsedStartDate.getTime())) {
        console.error("Invalid date received:", start);
        throw new Error("Invalid date format");
      }
    } catch (error) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid start date format. Please provide a valid date." 
      });
    }

    // Set times to beginning of day for date comparison
    const todayStartOfDay = new Date();
    todayStartOfDay.setHours(0, 0, 0, 0);

    const startDateStartOfDay = new Date(parsedStartDate);
    startDateStartOfDay.setHours(0, 0, 0, 0);

    // Check if the event date is in the past
    if (startDateStartOfDay < todayStartOfDay) {
      return res.status(400).json({
        success: false,
        message: "Cannot update event to a past date. Please select a current or future date."
      });
    }

    // Update basic event fields with validated data
    event.title = title;
    event.start = parsedStartDate;
    event.eventTime = eventTime;
    event.endTime = endTime || "";
    event.description = description || "";
    event.location = location || "";
    event.className = className || "bg-soft-primary";

    // Handle targeting options
    const isForAllCoOwnersValue = isForAllCoOwners === 'true' || isForAllCoOwners === true;
    event.isForAllCoOwners = isForAllCoOwnersValue;
    
    // Only set these if we're not targeting all co-owners
    if (!isForAllCoOwnersValue) {
      // Handle arrays properly - they might come as strings in FormData
      if (selectedBlocs) {
        if (Array.isArray(selectedBlocs)) {
          event.selectedBlocs = selectedBlocs;
        } else if (typeof selectedBlocs === 'string') {
          event.selectedBlocs = [selectedBlocs];
        }
      } else {
        event.selectedBlocs = [];
      }

      if (selectedApartments) {
        if (Array.isArray(selectedApartments)) {
          event.selectedApartments = selectedApartments;
        } else if (typeof selectedApartments === 'string') {
          event.selectedApartments = [selectedApartments];
        }
      } else {
        event.selectedApartments = [];
      }
    } else {
      // If targeting all, clear specific selections
      event.selectedBlocs = [];
      event.selectedApartments = [];
    }

    // Handle document removals if specified
    if (removeDocuments && removeDocuments.length > 0) {
      // Convert string to array if needed
      const documentsToRemove = Array.isArray(removeDocuments)
        ? removeDocuments
        : removeDocuments.split(',');

      for (const docId of documentsToRemove) {
        const documentToDelete = event.documents.id(docId);
        if (documentToDelete) {
          // Remove the physical file
          const fileUrl = documentToDelete.fileUrl;
          const fileName = fileUrl.substring(fileUrl.lastIndexOf('/') + 1);
          const filePath = path.join(__dirname, '../uploads/events', fileName);

          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }

          // Remove from the document array
          event.documents.pull({ _id: docId });
        }
      }
    }

    // Handle new files being uploaded
    if (req.files && req.files.length > 0) {
      const newDocuments = req.files.map((file, index) => {
        // Create the complete file URL
        const fileUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/uploads/events/${file.filename}`;

        return {
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          fileUrl: fileUrl,
          description: Array.isArray(documentDescriptions) && documentDescriptions[index]
            ? documentDescriptions[index]
            : '',
          uploadDate: new Date()
        };
      });

      // Add new documents to existing ones
      if (!event.documents) {
        event.documents = [];
      }

      event.documents.push(...newDocuments);
    }

    // If we're changing from isForAllCoOwners to specific targeting, we need to update selectedCoOwners
    if (!event.isForAllCoOwners) {
      // Get co-owners based on selected apartments/blocs for backward compatibility
      let relevantApartments = [];

      if (event.selectedApartments && event.selectedApartments.length > 0) {
        // Use directly selected apartments
        relevantApartments = await Apartment.find({
          _id: { $in: event.selectedApartments },
          coOwner: { $exists: true, $ne: null }
        }).populate('coOwner');
      } else if (event.selectedBlocs && event.selectedBlocs.length > 0) {
        // Get apartments from selected blocs
        relevantApartments = await Apartment.find({
          bloc: { $in: event.selectedBlocs },
          coOwner: { $exists: true, $ne: null }
        }).populate('coOwner');
      }

      // Extract unique co-owners from the apartments
      const coOwnerIds = new Set();
      relevantApartments.forEach(apt => {
        if (apt.coOwner && apt.coOwner._id) {
          coOwnerIds.add(apt.coOwner._id.toString());
        }
      });

      // Store the selected co-owners IDs for backward compatibility
      event.selectedCoOwners = Array.from(coOwnerIds);
    } else {
      // If targeting all co-owners, clear specific selections
      event.selectedCoOwners = [];
    }

    // Check if meeting exists and update if necessary
    if (event.meeting && event.meeting.roomName) {
      // Just ensure the room name is still valid
      if (!event.meeting.roomName.includes(event._id)) {
        // If the meeting room doesn't contain the event ID, generate a new one for safety
        const roomName = `event-${event._id}-${crypto.randomBytes(8).toString('hex')}`;
        event.meeting.roomName = roomName;
      }
    } else {
      // Create a meeting configuration if none exists
      const roomName = `event-${event._id}-${crypto.randomBytes(8).toString('hex')}`;
      event.meeting = {
        roomName,
        isActive: false
      };
    }

    console.log("Saving updated event:", event); // Log before saving
    const updatedEvent = await event.save();
    console.log("Event updated successfully:", updatedEvent); // Log after saving

    res.status(200).json(updatedEvent);
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ message: error.message });
  }
};

// Delete an event
const deleteEvent = async (req, res) => {
  const { id } = req.params;
  try {
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // End the meeting if it exists and is running
    if (event.meeting && event.meeting.meetingID) {
      await endMeeting(event.meeting.meetingID, event.meeting.moderatorPassword);
    }

    await Event.deleteOne({ _id: id });
    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const createEvent = async (req, res) => {
  try {
    const {
      title,
      start,
      eventTime,
      description,
      location,
      className,
      building,
      user,
      isForAllCoOwners,
      selectedBlocs = [],
      selectedApartments = [],
      documentDescriptions = [],
      endTime

    } = req.body;

    const parsedStartDate = new Date(start);
    const currentDate = new Date();

    // Set times to beginning of day for date comparison
    const todayStartOfDay = new Date(currentDate);
    todayStartOfDay.setHours(0, 0, 0, 0);

    const startDateStartOfDay = new Date(parsedStartDate);
    startDateStartOfDay.setHours(0, 0, 0, 0);

    // Check if the event date is in the past
    if (startDateStartOfDay < todayStartOfDay) {
      return res.status(400).json({
        success: false,
        message: "Cannot create events in the past. Please select a current or future date."
      });
    }
    // CORRECTION IMPORTANTE: Gérer correctement le champ user
    let userId;

    // Si user est fourni et n'est pas "undefined", l'utiliser
    if (user && user !== 'undefined') {
      userId = user;
    }
    // Sinon, utiliser l'ID de l'utilisateur connecté
    else if (req.user && req.user.id) {
      userId = req.user.id;
    }
    // Si on n'a toujours pas d'ID valide, générer une erreur
    else {
      return res.status(400).json({
        message: "Missing required user ID for event creation"
      });
    }
    // Create new event
    const event = new Event({
      title,
      start: parsedStartDate,
      eventTime,
      endTime,
      description,
      location,
      className,
      building,
      user: userId, // Utiliser l'ID validé
      isForAllCoOwners: isForAllCoOwners === 'true' ? true : false,
      selectedBlocs,
      selectedApartments
    });

    // Traiter les fichiers uploadés
    if (req.files && req.files.length > 0) {
      event.documents = req.files.map((file, index) => {
        // Créer l'URL complète du fichier
        const fileUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/uploads/events/${file.filename}`;

        return {
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          fileUrl: fileUrl,
          description: Array.isArray(documentDescriptions) && documentDescriptions[index]
            ? documentDescriptions[index]
            : ''
        };
      });
    }

    // Create a unique room name for meetings
    const roomName = `event-${crypto.randomBytes(16).toString('hex')}`;
    event.meeting = {
      roomName,
      isActive: false
    };

    await event.save();

    // Get building data with co-owners and their delegates
    const buildingData = await Building.findById(building).populate({
      path: 'coOwners',
      populate: {
        path: 'delegates.user',
        select: 'firstName lastName email'
      }
    });

    // Get the admin user for notifications
    const adminUser = await User.findById(req.user.id);

    // Determine which co-owners to notify based on selection criteria
    let coOwnersToNotify = [];

    if (event.isForAllCoOwners) {
      // All co-owners in the building
      coOwnersToNotify = buildingData.coOwners || [];
    } else {
      // Get co-owners based on selected apartments/blocs
      let relevantApartments = [];

      if (selectedApartments && selectedApartments.length > 0) {
        // Use directly selected apartments
        relevantApartments = await Apartment.find({
          _id: { $in: selectedApartments },
          coOwner: { $exists: true, $ne: null }
        }).populate('coOwner');
      } else if (selectedBlocs && selectedBlocs.length > 0) {
        // Get apartments from selected blocs
        relevantApartments = await Apartment.find({
          bloc: { $in: selectedBlocs },
          coOwner: { $exists: true, $ne: null }
        }).populate('coOwner');
      }

      // Extract unique co-owners from the apartments
      const coOwnerIds = new Set();
      relevantApartments.forEach(apt => {
        if (apt.coOwner && apt.coOwner._id) {
          coOwnerIds.add(apt.coOwner._id.toString());
        }
      });

      // Fetch the full co-owner objects
      if (coOwnerIds.size > 0) {
        const User = require('../Models/User');
        coOwnersToNotify = await User.find({
          _id: { $in: Array.from(coOwnerIds) }
        }).populate({
          path: 'delegates.user',
          select: 'firstName lastName email'
        });
      }

      // Store the selected co-owners IDs for backward compatibility
      event.selectedCoOwners = Array.from(coOwnerIds);
      await event.save();
    }

    // Prepare meeting invitation participants
    const { sendMeetingInvitationWithDelegate } = require('../Utils/Email');
    const participants = [];

    // Process each selected co-owner and their delegates
    for (const coOwner of coOwnersToNotify) {
      // Check if coOwner has an active meeting delegate
      const activeDelegate = coOwner.delegates?.find(d =>
        (d.type === 'meeting' || d.type === 'both') &&
        d.meetingDelegation?.isActive
      );

      if (activeDelegate && activeDelegate.user) {
        // Send invitation to delegate (with owner in CC)
        participants.push({
          userId: activeDelegate.user._id,
          email: activeDelegate.email || activeDelegate.user.email,
          name: activeDelegate.user ?
            `${activeDelegate.user.firstName} ${activeDelegate.user.lastName}` :
            activeDelegate.email,
          isDelegate: true,
          delegatorEmail: coOwner.email,
          delegatorName: `${coOwner.firstName} ${coOwner.lastName}`
        });
      } else {
        // Send invitation to co-owner directly
        participants.push({
          userId: coOwner._id,
          email: coOwner.email,
          name: `${coOwner.firstName} ${coOwner.lastName}`,
          isDelegate: false
        });
      }
    }

    // Send meeting invitations with delegate handling
    try {
      const meetingLink = `${process.env.CLIENT_URL}/meeting/${event._id}`;
      await sendMeetingInvitationWithDelegate({
        eventId: event._id,
        eventTitle: title,
        eventDate: parsedStartDate.toLocaleDateString(),
        eventTime: eventTime,
        meetingLink,
        participants
      });
    } catch (emailError) {
      console.error('Error sending meeting invitations:', emailError);
    }

    // Create notifications for each selected coOwner AND their meeting delegates
    const notificationPromises = [];

    coOwnersToNotify.forEach(coOwner => {
      // Check if coOwner has an active meeting delegate
      const activeDelegate = coOwner.delegates?.find(d =>
        (d.type === 'meeting' || d.type === 'both') &&
        d.meetingDelegation?.isActive
      );

      if (activeDelegate && activeDelegate.user) {
        // Send notification to delegate
        notificationPromises.push(
          NotificationController.createNotification({
            recipient: activeDelegate.user._id,
            type: 'alert',
            title: 'New Event Scheduled (Delegate)',
            content: `${adminUser.firstName} ${adminUser.lastName} scheduled a new event: ${title} on ${new Date(parsedStartDate).toLocaleDateString()} (You are attending as delegate for ${coOwner.firstName} ${coOwner.lastName})`,
            relatedTo: event._id,
            onModel: 'Event',
            senderName: `${adminUser.firstName} ${adminUser.lastName}`,
            senderAvatar: adminUser._id || null,
            eventId: event._id
          })
        );

        // ALSO send notification to original coOwner (for awareness)
        notificationPromises.push(
          NotificationController.createNotification({
            recipient: coOwner._id,
            type: 'alert',
            title: 'New Event Scheduled (Your Delegate Will Attend)',
            content: `${adminUser.firstName} ${adminUser.lastName} scheduled a new event: ${title} on ${new Date(parsedStartDate).toLocaleDateString()}. Your delegate will attend on your behalf.`,
            relatedTo: event._id,
            onModel: 'Event',
            senderName: `${adminUser.firstName} ${adminUser.lastName}`,
            senderAvatar: adminUser._id || null,
            eventId: event._id
          })
        );
      } else {
        // Send notification to original coOwner
        notificationPromises.push(
          NotificationController.createNotification({
            recipient: coOwner._id,
            type: 'alert',
            title: 'New Event Scheduled',
            content: `${adminUser.firstName} ${adminUser.lastName} scheduled a new event: ${title} on ${new Date(parsedStartDate).toLocaleDateString()}`,
            relatedTo: event._id,
            onModel: 'Event',
            senderName: `${adminUser.firstName} ${adminUser.lastName}`,
            senderAvatar: adminUser._id || null,
            eventId: event._id
          })
        );
      }
    });

    await Promise.all(notificationPromises);

    // Send real-time notification via socket if available
    if (socketManager && socketManager.io) {
      coOwnersToNotify.forEach(coOwner => {
        // Check for delegate and send notification
        const activeDelegate = coOwner.delegates?.find(d =>
          (d.type === 'meeting' || d.type === 'both') &&
          d.meetingDelegation?.isActive
        );

        if (activeDelegate && activeDelegate.user) {
          const delegateSocketId = socketManager.onlineUsers.get(activeDelegate.user._id.toString());
          if (delegateSocketId) {
            socketManager.io.to(delegateSocketId).emit('notification', {
              type: 'alert',
              title: 'New Event Scheduled (Delegate)',
              content: `${adminUser.firstName} ${adminUser.lastName} scheduled a new event: ${title} on ${new Date(parsedStartDate).toLocaleDateString()} (You are attending as delegate for ${coOwner.firstName} ${coOwner.lastName})`,
              createdAt: new Date(),
              eventId: event._id
            });
          }
        } else {
          const coOwnerSocketId = socketManager.onlineUsers.get(coOwner._id.toString());
          if (coOwnerSocketId) {
            socketManager.io.to(coOwnerSocketId).emit('notification', {
              type: 'alert',
              title: 'New Event Scheduled',
              content: `${adminUser.firstName} ${adminUser.lastName} scheduled a new event: ${title} on ${new Date(parsedStartDate).toLocaleDateString()}`,
              createdAt: new Date(),
              eventId: event._id
            });
          }
        }
      });
    }

    res.status(201).json(event);
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ message: error.message });
  }
};


// Créer une route pour télécharger un document
const downloadDocument = async (req, res) => {
  try {
    const { eventId, documentId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const document = event.documents.id(documentId);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Extraire le nom du fichier de l'URL
    const fileUrl = document.fileUrl;
    const fileName = fileUrl.substring(fileUrl.lastIndexOf('/') + 1);
    const filePath = path.join(__dirname, '../uploads/events', fileName);

    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found on server" });
    }

    // Configurer l'en-tête pour le téléchargement
    res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
    res.setHeader('Content-Type', document.fileType);

    // Créer un stream de lecture et le pipe vers la réponse
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error("Error downloading document:", error);
    res.status(500).json({ message: error.message });
  }
};
// Supprimer un document
const deleteDocument = async (req, res) => {
  try {
    const { eventId, documentId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Trouver le document
    const documentToDelete = event.documents.id(documentId);
    if (!documentToDelete) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Supprimer le fichier physique
    const fileUrl = documentToDelete.fileUrl;
    const fileName = fileUrl.substring(fileUrl.lastIndexOf('/') + 1);
    const filePath = path.join(__dirname, '../uploads/events', fileName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Supprimer le document de la base de données
    event.documents.pull({ _id: documentId });
    await event.save();

    res.status(200).json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({ message: error.message });
  }
};
const joinMeeting = async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId);
    if (!event || !event.meeting || !event.meeting.roomName) {
      return res.status(404).json({ message: "Meeting not found" });
    }
    if (!event.meeting.isActive) {
      return res.status(400).json({ message: "Meeting is not currently active" });
    }
    const isModerator = req.user.role === 'SyndicateAdmin';
    const token = generateJitsiToken(req.user, event.meeting.roomName, isModerator);
    return res.status(200).json({
      success: true,
      roomName: event.meeting.roomName,
      eventTitle: event.title,
      isModerator,
      token
    });
  } catch (error) {
    console.error("Error joining meeting:", error);
    return res.status(500).json({ message: "Failed to join meeting" });
  }
};

const startMeeting = async (req, res) => {
  const { id } = req.params;

  try {
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (!event.meeting || !event.meeting.roomName) {
      return res.status(400).json({ message: "No meeting associated with this event" });
    }

    if (req.user.role !== 'SyndicateAdmin') {
      return res.status(403).json({ message: "Only SyndicateAdmin can start meetings" });
    }

    event.meeting.isActive = true;
    await event.save();

    // Get building and co-owners info to send notifications
    const buildingData = await Building.findById(event.building).populate('coOwners');

    if (buildingData && buildingData.coOwners && buildingData.coOwners.length > 0) {
      // Determine which coowners to notify based on event settings
      let coOwnersToNotify = [];
      if (event.isForAllCoOwners) {
        coOwnersToNotify = buildingData.coOwners;
      } else if (event.selectedCoOwners && event.selectedCoOwners.length > 0) {
        // Filter coowners to only include selected ones
        coOwnersToNotify = buildingData.coOwners.filter(coOwner =>
          event.selectedCoOwners.some(selectedId => selectedId.toString() === coOwner._id.toString())
        );
      }

      // Create notifications for selected co-owners
      const notificationPromises = coOwnersToNotify.map(coOwner => {
        // Don't send notification to the user who started the meeting
        if (coOwner._id.toString() === req.user.id) return Promise.resolve();

        return NotificationController.createNotification({
          recipient: coOwner._id,
          type: 'alert',
          title: 'Live Meeting Started',
          content: `A meeting for event "${event.title}" has just started. Join now!`,
          relatedTo: event._id,
          onModel: 'Event',
          eventId: event._id
        });
      }).filter(Boolean); // Remove any undefined promises

      await Promise.all(notificationPromises);

      // Send real-time notifications via socket
      if (socketManager && socketManager.io) {
        coOwnersToNotify.forEach(coOwner => {
          // Don't send notification to the user who started the meeting
          if (coOwner._id.toString() === req.user.id) return;

          const coOwnerSocketId = socketManager.onlineUsers.get(coOwner._id.toString());
          if (coOwnerSocketId) {
            socketManager.io.to(coOwnerSocketId).emit('notification', {
              type: 'alert',
              title: 'Live Meeting Started',
              content: `A meeting for event "${event.title}" has just started. Join now!`,
              eventId: event._id,
              createdAt: new Date()
            });
          }
        });
      }
    }

    const token = generateJitsiToken(req.user, event.meeting.roomName, true);
    return res.status(200).json({
      message: "Meeting started successfully",
      roomName: event.meeting.roomName,
      eventId: id,
      isModerator: true,
      token
    });
  } catch (error) {
    console.error("Start meeting error:", error);
    return res.status(500).json({ message: error.message || "An error occurred" });
  }
};

const endMeetingController = async (req, res) => {
  const { id } = req.params;

  try {
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (!event.meeting || !event.meeting.roomName) {
      return res.status(400).json({ message: "No meeting associated with this event" });
    }

    if (req.user.role !== 'SyndicateAdmin') {
      return res.status(403).json({ message: "Only SyndicateAdmin can end meetings" });
    }

    event.meeting.isActive = false;
    await event.save();
    res.status(200).json({ message: "Meeting ended successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const cron = require('node-cron');

const scheduleEventReminders = () => {
  // Schedule job to run at 8:00 AM for same-day reminders
  cron.schedule('0 8 * * *', async () => {
    try {
      console.log('Running daily event reminder check at 08:00...');
      // Get today's date (start of day and end of day)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Find all events scheduled for today
      const todaysEvents = await Event.find({
        start: {
          $gte: today,
          $lt: tomorrow
        }
      }).populate('building');

      console.log(`Found ${todaysEvents.length} events scheduled for today`);

      // Process each event
      for (const event of todaysEvents) {
        try {
          await sendEventReminders(event, "Reminder: Today's event");
        } catch (eventError) {
          console.error(`Error processing event ${event._id}:`, eventError);
        }
      }
    } catch (error) {
      console.error('Error running daily event reminders:', error);
    }
  }, {
    timezone: "Africa/Tunis" // Tunisia timezone
  });

  // Schedule job to check every hour for 1-hour-before reminders
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('Running hourly event reminder check...');

      const now = new Date();
      console.log(`Current time: ${now.toLocaleTimeString()}`);

      // Get today's date (start of day)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Find all events scheduled for today
      const todaysEvents = await Event.find({
        start: {
          $gte: today,
          $lt: tomorrow
        }
      }).populate('building');

      console.log(`Found ${todaysEvents.length} total events for today`);

      // Calculate target hour for checking events
      const targetHour = (now.getHours() + 1) % 24; // Next hour, wrapping around at midnight
      console.log(`Looking for events scheduled at hour ${targetHour}:xx`);

      // Filter events by time - looking for events in the next hour
      const upcomingEvents = todaysEvents.filter(event => {
        // First try to parse the eventTime string (e.g., "18:00")
        if (event.eventTime) {
          const timeParts = event.eventTime.split(':');
          if (timeParts.length >= 1) {
            const eventHour = parseInt(timeParts[0], 10);
            const match = eventHour === targetHour;
            console.log(`Checking event ${event.title} with time ${event.eventTime}: hour ${eventHour} matches target ${targetHour}? ${match}`);
            return match;
          }
        }

        // Fallback to using the start datetime
        const eventDate = new Date(event.start);
        const match = eventDate.getHours() === targetHour;
        console.log(`Checking event ${event.title} with start ${eventDate.toLocaleTimeString()}: hour ${eventDate.getHours()} matches target ${targetHour}? ${match}`);
        return match;
      });

      console.log(`Found ${upcomingEvents.length} events starting in about 1 hour`);

      // Process each upcoming event
      for (const event of upcomingEvents) {
        try {
          await sendEventReminders(event, "Starting soon: Event in 1 hour");
        } catch (eventError) {
          console.error(`Error processing upcoming event ${event._id}:`, eventError);
        }
      }
    } catch (error) {
      console.error('Error running hourly event reminders:', error);
    }
  }, {
    timezone: "Africa/Tunis" // Tunisia timezone
  });

  console.log('Event reminder scheduler initialized - Daily at 08:00 and 1-hour before events');
};

// Helper function to send reminders for an event
const sendEventReminders = async (event, titlePrefix) => {
  // Get the building with coOwners for this event
  const buildingData = await Building.findById(event.building._id).populate('coOwners');

  if (!buildingData || !buildingData.coOwners || buildingData.coOwners.length === 0) {
    console.log(`No recipients found for event ${event._id}`);
    return;
  }

  // Format the time properly
  const timeDisplay = event.eventTime || new Date(event.start).toLocaleTimeString();

  // Create notifications for all users in this building
  const notificationPromises = buildingData.coOwners.map(coOwner => {
    return NotificationController.createNotification({
      recipient: coOwner._id,
      type: 'alert',
      title: `${titlePrefix}`,
      content: `"${event.title}" is scheduled for ${timeDisplay}`,
      relatedTo: event._id,
      onModel: 'Event',
      eventId: event._id
    });
  });

  await Promise.all(notificationPromises);
  console.log(`Created ${notificationPromises.length} notifications for event ${event._id}`);

  // Send real-time notifications via socket if available
  if (socketManager && socketManager.io) {
    buildingData.coOwners.forEach(coOwner => {
      const coOwnerSocketId = socketManager.onlineUsers.get(coOwner._id.toString());
      if (coOwnerSocketId) {
        socketManager.io.to(coOwnerSocketId).emit('notification', {
          type: 'alert',
          title: `${titlePrefix}`,
          content: `"${event.title}" is scheduled for ${timeDisplay}`,
          eventId: event._id,
          createdAt: new Date()
        });
      }
    });
  } else {
    console.error('⚠️ Socket manager not properly initialized for event reminders');
  }
};

module.exports = {
  scheduleEventReminders,
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getSingleEvent, // Add this

  joinMeeting,
  startMeeting,
  endMeetingController,
  downloadDocument,
  deleteDocument,
  upload
};
