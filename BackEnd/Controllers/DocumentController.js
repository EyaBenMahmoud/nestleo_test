const Document = require('../Models/Document');
const Building = require('../Models/Building');
const User = require('../Models/User');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);

const uploadDocument = async (req, res) => {
  try {
    const { name, description } = req.body;
    const { file } = req;
    const { buildingId } = req.params;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Validate building exists and user is associated with it
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    // Check if user is SyndicateAdmin for this building
    if (req.user.role !== 'SyndicateAdmin' || !building.user.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to upload documents for this building' });
    }

    // Create document record
    const document = await Document.create({
      name: name || file.originalname,
      description,
      fileUrl: file.path,
      fileType: path.extname(file.originalname).substring(1),
      fileSize: file.size,
      building: buildingId,
      uploadedBy: req.user._id
    });

    res.status(201).json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getDocumentsByBuilding = async (req, res) => {
  try {
    const { buildingId } = req.params;

    // Validate building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    // Check if user has access to this building's documents
    const hasAccess = req.user.role === 'SyndicateAdmin' && building.user.equals(req.user._id) ||
                     req.user.role === 'SyndicateCoowner' && building.coOwners.includes(req.user._id);

    if (!hasAccess) {
      return res.status(403).json({ message: 'Not authorized to view documents for this building' });
    }

    // Get documents (excluding soft deleted ones)
    const documents = await Document.find({ 
      building: buildingId,
      isDeleted: false 
    }).populate('uploadedBy', 'firstName lastName');

    res.status(200).json({
      success: true,
      count: documents.length,
      data: documents
    });
  } catch (error) {
    console.error('Error getting documents:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const downloadDocument = async (req, res) => {
    try {
      const document = await Document.findById(req.params.id);
      if (!document || document.isDeleted) {
        return res.status(404).json({ message: 'Document not found' });
      }
  
      // Validate building exists
      const building = await Building.findById(document.building);
      if (!building) {
        return res.status(404).json({ message: 'Building not found' });
      }
  
      // Check if user has access to this document
      const hasAccess = req.user.role === 'SyndicateAdmin' && building.user.equals(req.user._id) ||
                       req.user.role === 'SyndicateCoowner' && building.coOwners.includes(req.user._id);
  
      if (!hasAccess) {
        return res.status(403).json({ message: 'Not authorized to access this document' });
      }
  
      // Check if file exists
      if (!fs.existsSync(document.fileUrl)) {
        return res.status(404).json({ message: 'File not found on server' });
      }
  
      // Set appropriate headers
      const fileExtension = document.fileType;
      const mimeTypes = {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      };
  
      res.set({
        'Content-Type': mimeTypes[fileExtension] || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${document.name}.${fileExtension}"`
      });
  
      // Send the file
      fs.createReadStream(document.fileUrl).pipe(res);
    } catch (error) {
      console.error('Error downloading document:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
  
const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document || document.isDeleted) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Validate building exists and user is the SyndicateAdmin
    const building = await Building.findById(document.building);
    if (!building || !building.user.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to delete this document' });
    }

    // Soft delete the document
    await document.softDelete();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


const previewDocument = async (req, res) => {
    try {
      const document = await Document.findById(req.params.id);
      if (!document || document.isDeleted) {
        return res.status(404).json({ message: 'Document not found' });
      }
  
      // Validate building exists
      const building = await Building.findById(document.building);
      if (!building) {
        return res.status(404).json({ message: 'Building not found' });
      }
  
      // Check if user has access to this document
      const hasAccess = req.user.role === 'SyndicateAdmin' && building.user.equals(req.user._id) ||
                       req.user.role === 'SyndicateCoowner' && building.coOwners.includes(req.user._id);
  
      if (!hasAccess) {
        return res.status(403).json({ message: 'Not authorized to access this document' });
      }
  
      // Check if file exists
      if (!fs.existsSync(document.fileUrl)) {
        return res.status(404).json({ message: 'File not found on server' });
      }
  
      // Set appropriate headers for inline viewing
      const fileExtension = document.fileType;
      const mimeTypes = {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      };
  
      res.set({
        'Content-Type': mimeTypes[fileExtension] || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${document.name}.${fileExtension}"`
      });
  
      // Send the file
      fs.createReadStream(document.fileUrl).pipe(res);
    } catch (error) {
      console.error('Error previewing document:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };

module.exports = {
  uploadDocument,
  getDocumentsByBuilding,
  downloadDocument,
  deleteDocument,
  previewDocument
};