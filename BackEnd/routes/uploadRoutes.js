const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Configuration for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = file.fieldname + '-' + Date.now();
    cb(null, name + ext);
  }
});

// Initialize multer with storage configuration
const upload = multer({ storage });

// File upload route
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
  
  // Always use BASE_URL environment variable
  const baseUrl = process.env.BASE_URL;
  
  if (!baseUrl) {
    return res.status(500).json({ 
      error: 'BASE_URL environment variable is not configured' 
    });
  }
  
  const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
  
  res.json({ 
    url: fileUrl, 
    filename: req.file.originalname, 
    mimetype: req.file.mimetype, 
    size: req.file.size 
  });
});

module.exports = router;