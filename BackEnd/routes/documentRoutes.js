const express = require('express');
const router = express.Router();
const documentController = require('../Controllers/DocumentController');
const { protect } = require('../Middlewares/AuthMiddleware');
const multer = require('multer');

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/documents/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// File filter for allowed types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX are allowed.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Upload document (SyndicateAdmin only)
router.post(
  '/buildings/:buildingId/documents',
  protect,
  upload.single('file'),
  documentController.uploadDocument
);

// Get all documents for a building
router.get(
  '/buildings/:buildingId/documents',
  protect,
  documentController.getDocumentsByBuilding
);

// Download a document
router.get(
  '/documents/:id/download',
  protect,
  documentController.downloadDocument
);

// Preview a document
router.get(
  '/documents/:id/preview',
  protect,
  documentController.previewDocument
);

// Delete a document (soft delete)
router.delete(
  '/documents/:id',
  protect,
  documentController.deleteDocument
);
router.get(
    '/documents/:id/preview',
    protect,
    documentController.previewDocument
  );
module.exports = router;