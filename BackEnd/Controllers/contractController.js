const mongoose = require('mongoose');
const ContractModel = require('../Models/Contract'); 
const User = require('../Models/User'); 
const Building = require('../Models/Building');
const NotificationController = require('./notificationsController');
const { socketManager } = require('../Socket/socketManager');

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
  contractExpired: {
    en: {
      title: 'Contract Expired',
      content: 'Contract "{contractTitle}" has expired on {endDate}.'
    },
    fr: {
      title: 'Contrat expiré',
      content: 'Le contrat "{contractTitle}" a expiré le {endDate}.'
    },
    it: {
      title: 'Contratto scaduto',
      content: 'Il contratto "{contractTitle}" è scaduto il {endDate}.'
    },
    sp: {
      title: 'Contrato expirado',
      content: 'El contrato "{contractTitle}" ha expirado el {endDate}.'
    }
  },
  contractCreated: {
    en: {
      title: 'New Contract',
      content: 'You have a new contract "{contractTitle}" that has been created on the platform.'
    },
    fr: {
      title: 'Nouveau contrat',
      content: 'Vous avez un nouveau contrat "{contractTitle}" qui a été créé sur la plateforme.'
    },
    it: {
      title: 'Nuovo contratto',
      content: 'Hai un nuovo contratto "{contractTitle}" che è stato creato sulla piattaforma.'
    },
    sp: {
      title: 'Nuevo contrato',
      content: 'Tienes un nuevo contrato "{contractTitle}" que ha sido creado en la plataforma.'
    }
  },
  contractCoOwnerAssigned: {
    en: {
      title: 'Contract Co-Owner Assignment',
      content: 'You\'ve been assigned as a co-owner in contract "{contractTitle}".'
    },
    fr: {
      title: 'Attribution de copropriétaire de contrat',
      content: 'Vous avez été désigné comme copropriétaire du contrat "{contractTitle}".'
    },
    it: {
      title: 'Assegnazione comproprietario contratto',
      content: 'Sei stato assegnato come comproprietario nel contratto "{contractTitle}".'
    },
    sp: {
      title: 'Asignación de copropietario de contrato',
      content: 'Has sido asignado como copropietario en el contrato "{contractTitle}".'
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

const checkAndExpireContracts = async () => {
  const now = new Date();
  try {
    const contracts = await ContractModel.find({
      status: { $in: ['Active', 'Draft'] },
      endDate: { $lt: now },
      archived: false
    }).populate('signedBy')
      .populate('coOwner')
      .populate('building');

    for (const contract of contracts) {
      // Update contract status
      contract.status = 'Expired';
      contract.archived = true;
      contract.archivedAt = now;
      await contract.save();
      
      // Format the end date
      const formattedEndDate = contract.endDate.toLocaleDateString();
      
      // Send notification to signedBy user if exists
      if (contract.signedBy) {
        await sendContractNotification(
          contract.signedBy._id,
          contract._id,
          contract.title,
          'contractExpired',
          { contractTitle: contract.title, endDate: formattedEndDate },
          null, 
          "System"
        );
      }
      
      // Send notification to coOwner if exists
      if (contract.coOwner) {
        await sendContractNotification(
          contract.coOwner._id,
          contract._id,
          contract.title,
          'contractExpired',
          { contractTitle: contract.title, endDate: formattedEndDate },
          null,
          "System"
        );
      }
      
      // Send notification to building admin if applicable
      if (contract.building && contract.building.admin) {
        await sendContractNotification(
          contract.building.admin,
          contract._id,
          contract.title,
          'contractExpired',
          { contractTitle: contract.title, endDate: formattedEndDate },
          null,
          "System"
        );
      }
    }
    
    console.log(`Expired ${contracts.length} contracts. Notifications sent.`);
  } catch (error) {
    console.error('Error expiring contracts:', error);
  }
};


const createContract = async (req, res) => {
  try {
    const { 
      contractNumber, 
      title, 
      description, 
      startDate, 
      endDate, 
      terms, 
      signedBy, 
      status, 
      coOwner,
      building,
      contractType,
      createdBy
    } = req.body;

    console.log("Creating contract with createdBy:", createdBy);
    
    const contract = new ContractModel({
      contractNumber,
      title,
      description,
      startDate,
      endDate,
      status: status || 'Draft',  
      terms,
      signedBy,
      coOwner: coOwner || null,
      building: building || null,
      contractType: contractType || 'standard',
      archived: false,  
      archivedAt: null,
      createdBy: createdBy || null
    });

    await contract.save();

    // Get creator information for notification
    const creator = await User.findById(createdBy);
    const creatorName = creator ? `${creator.firstName} ${creator.lastName}` : "System";

    // Send notification to the signedBy user if different from creator
    if (signedBy && signedBy !== createdBy) {
      await sendContractNotification(
        signedBy, 
        contract._id, 
        title,
        'contractCreated',
        { contractTitle: title },
        createdBy,
        creatorName
      );
    }

    // Send notification to the coOwner if present
    if (coOwner) {
      await sendContractNotification(
        coOwner, 
        contract._id, 
        title,
        'contractCoOwnerAssigned',
        { contractTitle: title },
        createdBy,
        creatorName
      );
    }

    res.status(201).json(contract);
  } catch (error) {
    console.error('Error creating Contract:', error);
    res.status(500).json({ message: 'Error creating Contract', error: error.message });
  }
};

// Helper function to send contract notifications
const sendContractNotification = async (recipientId, contractId, contractTitle, templateKey, variables, senderId, senderName) => {
  try {
    // Get recipient's language preference
    const recipientLanguage = await getUserLanguage(recipientId);
    
    // Get localized notification content
    const notificationData = getLocalizedNotification(templateKey, recipientLanguage, variables);

    // Create notification in the database
    await NotificationController.createNotification({
      recipient: recipientId,
      type: 'alert',
      title: notificationData.title,
      content: notificationData.content,
      relatedTo: contractId,
      onModel: 'Contract', // May need to add 'Contract' to your notification model onModel enum
      senderName: senderName,
      senderAvatar: senderId,
      isActionable: true
    });
    
    // Send real-time notification if user is online
    if (socketManager && socketManager.io) {
      const userSocketId = socketManager.onlineUsers.get(recipientId.toString());
      if (userSocketId) {
        socketManager.io.to(userSocketId).emit('notification', {
          type: 'alert',
          title: notificationData.title,
          content: notificationData.content,
          contractId: contractId,
          createdAt: new Date()
        });
        console.log(`Real-time notification sent to user: ${recipientId}`);
      }
    }
  } catch (error) {
    console.error(`Error sending contract notification: ${error}`);
    // Don't throw the error as this is a non-critical operation
  }
};


const getAllContract = async (req, res) => {
  try {
    const contracts = await ContractModel.find({ archived: false })
      .populate('signedBy')
      .populate('coOwner')
      .populate('building');
  
    res.status(200).json(contracts);
  } catch (error) {
    console.error('Error fetching Contract:', error);
    res.status(500).json({ message: 'Error fetching Contract', error: error.message });
  }
};

const getArchivedContracts = async (req, res) => {
  try {
    const contracts = await ContractModel.find({ archived: true })
      .populate('signedBy')
      .populate('coOwner')
      .populate('building');
    res.status(200).json(contracts);
  } catch (error) {
    console.error('Error fetching archived Contract:', error);
    res.status(500).json({ message: 'Error fetching archived Contract', error: error.message });
  }
};

const getContractById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid Contract ID' });
  }

  try {
    const contract = await ContractModel.findById(id)
      .populate('signedBy')
      .populate('coOwner')
      .populate('building');
    
    if (!contract) return res.status(404).json({ message: 'Contract not found' });

    res.status(200).json(contract);
  } catch (error) {
    console.error('Error fetching Contract:', error);
    res.status(500).json({ message: 'Error fetching Contract', error: error.message });
  }
};

const updateContract = async (req, res) => {
  const { id } = req.params;
  const { 
    title, 
    description, 
    startDate, 
    endDate, 
    terms, 
    status, 
    signedBy,
    coOwner,
    building,
    contractType
  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid Contract ID' });
  }

  try {
    const contract = await ContractModel.findById(id);
    if (!contract) return res.status(404).json({ message: 'Contract not found' });

    // Update fields
    if (title) contract.title = title;
    if (description) contract.description = description;
    if (startDate) contract.startDate = startDate;
    if (terms) contract.terms = terms;
    if (signedBy) contract.signedBy = signedBy;
    if (coOwner) contract.coOwner = coOwner;
    if (building) contract.building = building;
    if (contractType) contract.contractType = contractType;

    if (endDate) {
      contract.endDate = endDate;

      // Auto-expire if new endDate is in the past
      if (new Date(endDate) < new Date()) {
        contract.status = 'Expired';
        contract.archived = true;  // Ensure it's archived if expired
        contract.archivedAt = new Date();  // Set archived date
      }
    }

    // Update status if provided
    if (status) {
      contract.status = status;

      // Auto-archive if status is Expired or Terminated
      if (status === 'Expired' || status === 'Terminated') {
        contract.archived = true;
        contract.archivedAt = new Date();
      }
    }

    await contract.save();
    res.status(200).json(contract);
  } catch (error) {
    console.error('Error updating Contract:', error);
    res.status(500).json({ message: 'Error updating Contract', error: error.message });
  }
};

const deleteContract = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid Contract ID' });
  }

  try {
    const Contract = await ContractModel.findByIdAndDelete(id);
    if (!Contract) return res.status(404).json({ message: 'Contract not found' });

    res.status(200).json({ message: 'Contract deleted successfully' });
  } catch (error) {
    console.error('Error deleting Contract:', error);
    res.status(500).json({ message: 'Error deleting Contract', error: error.message });
  }
};

const archiveContract = async (req, res) => {
  const { id } = req.params;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid Contract ID' });
  }

  try {
    const contract = await ContractModel.findById(id);
    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    contract.archived = true;
    contract.status = 'Archived';
    contract.archivedAt = Date.now();
    await contract.save();

    res.status(200).json({ message: 'Contract archived successfully', contract });
  } catch (error) {
    console.error('Error archiving Contract:', error);
    res.status(500).json({ message: 'Error archiving Contract', error: error.message });
  }
};

const getContractsByUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Get contracts where the user is signedBy (contracts created by SuperAdmin for this SyndicateAdmin)
    const signedContracts = await ContractModel.find({ signedBy: userId })
      .populate('signedBy', 'firstName lastName email role')
      .populate('coOwner')
      .populate('building');
    
    const coOwnerContracts = await ContractModel.find({ 
      coOwner: userId,
      contractType: 'co-owner'
    })
    .populate('signedBy', 'firstName lastName email role')
    .populate('coOwner')
    .populate('building');
    
    const createdContracts = await ContractModel.find({ 
      createdBy: userId,
      contractType: 'co-owner',
      signedBy: { $ne: userId } // This prevents duplication with signedContracts
    })
    .populate('signedBy', 'firstName lastName email role')
    .populate('coOwner')
    .populate('building');
    
    // Combine all types of contracts and ensure unique documents
    let allContracts = [...signedContracts, ...coOwnerContracts, ...createdContracts];
    
    // Create a map of contract IDs to ensure uniqueness
    const uniqueContracts = allContracts.filter((contract, index, self) =>
      index === self.findIndex((c) => (c._id.toString() === contract._id.toString()))
    );
    
    res.status(200).json(uniqueContracts);
  } catch (error) {
    console.error('Error fetching user contracts:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get contracts for a specific building
const getContractsByBuilding = async (req, res) => {
  try {
    const buildingId = req.params.buildingId;
    
    const contracts = await ContractModel.find({ 
      building: buildingId,
      archived: false
    })
    .populate('signedBy')
    .populate('coOwner')
    .populate('building');
    
    res.status(200).json(contracts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createContract,
  getAllContract,
  getArchivedContracts,
  getContractById,
  updateContract,
  deleteContract,
  archiveContract,
  checkAndExpireContracts,
  getContractsByUser,
  getContractsByBuilding
};