const express = require('express');
const router = express.Router();
const contactController = require('../Controllers/contactController');
const { protect } = require('../Middlewares/AuthMiddleware');
const restrictTo = require('../Middlewares/CheckRole');
const Contact = require('../Models/Contact');
const { sendEmail } = require('../Utils/Email');

router.post('/contact', contactController.submitContactForm);
router.post('/sendEmail', contactController.sendEmail);
router.get('/contact/messages', contactController.getAllMessages);
// Delete contacts endpoint
router.delete('/delete', async (req, res) => {
    try {
      const { ids } = req.body;
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'No contact IDs provided' });
      }
  
      const result = await Contact.deleteMany({ _id: { $in: ids } });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, message: 'No contacts found to delete' });
      }
  
      res.json({ 
        success: true, 
        message: `Successfully deleted ${result.deletedCount} contact(s)`,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      console.error('Error deleting contacts:', error);
      res.status(500).json({ success: false, message: 'Server error while deleting contacts' });
    }
  });
router.delete('/contacts/:id', contactController.deleteContact);

module.exports = router;
