const Contact = require('../Models/Contact');
const { sendEmailConatact } = require('../Utils/Email');

exports.submitContactForm = async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const newContact = new Contact({ name, email, subject, message });
        await newContact.save();

        res.status(201).json({ message: 'Message sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get all messages (for admin)
exports.getAllMessages = async (req, res) => {
    try {
        const messages = await Contact.find().sort({ createdAt: -1 });
        res.json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.deleteContact = async (req, res) => {
    const { id } = req.params;
    try {
        const contact = await Contact.findByIdAndDelete(id);
        if (!contact) {
            return res.status(404).json({ error: "Contact not found." });
        }
        res.status(200).json({ message: "Contact deleted successfully." });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete contact", details: error });
    }
};



exports.sendEmail = async (req, res) => {
  try {
    // Validate request body
    if (!req.body) {
      return res.status(400).json({ error: "Request body is missing" });
    }

    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ 
        error: "All fields are required",
        details: { to, subject, message }
      });
    }

    // Send email
    const emailResult = await sendEmailConatact({
      from: `"EliteCom" <${process.env.EMAIL_USERNAME}>`,
      to,
      subject,
      html: `
        <div style="max-width: 600px; margin: auto; font-family: Arial, sans-serif; border: 1px solid #ddd; border-radius: 10px; padding: 20px; background-color: #f9f9f9;">
          <div style="background: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0px 0px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; text-align: center;">${subject}</h2>
            <p style="color: #555; font-size: 16px; line-height: 1.5;">${message}</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="text-align: center; color: #888; font-size: 14px;">
              Need help? <a href="http://localhost:3000/landing#contact" style="color: #007bff; text-decoration: none;">Contact Support</a>
            </p>
          </div>
          <footer style="text-align: center; padding: 15px; font-size: 12px; color: #aaa;">
            &copy; 2024 EliteCom. All rights reserved.
          </footer>
        </div>
      `
    });

    res.status(200).json({ 
      message: "Email sent successfully",
      messageId: emailResult.messageId 
    });

  } catch (error) {
    console.error('Email sending failed:', error);
    res.status(500).json({ 
      error: "Failed to send email",
      details: error.message || "Unknown error occurred" 
    });
  }
};

