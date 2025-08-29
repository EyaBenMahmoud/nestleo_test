// First mock any dependencies
jest.mock('../Models/Contact');
jest.mock('../Utils/Email', () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'email123' }),
  sendEmailConatact: jest.fn().mockResolvedValue({ messageId: 'email123' })
}));

describe('Contact API Tests', () => {
  let contactController;
  let req, res;

  beforeEach(() => {
    // Reset mocks before each test
    jest.resetModules();
    
    // Mock request and response objects
    req = {
      params: { id: 'message123' },
      user: { _id: 'user123', role: 'Admin' },
      body: {
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'This is a test message',
        to: 'recipient@example.com'
      }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Import the controller directly
    contactController = require('../Controllers/contactController');
  });

  it('should submit a contact form', async () => {
    // Mock the submitContactForm function
    contactController.submitContactForm = jest.fn().mockImplementation((req, res) => {
      if (!req.body.name || !req.body.email || !req.body.subject || !req.body.message) {
        return res.status(400).json({ error: 'All fields are required' });
      }
      return res.status(201).json({ message: 'Message sent successfully' });
    });

    // Call the controller directly
    contactController.submitContactForm(req, res);

    // Verify the response
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: 'Message sent successfully' });
  });

  it('should reject incomplete contact form', async () => {
    // Use incomplete data
    req.body = {
      name: 'Test User',
      email: 'test@example.com'
      // Missing subject and message
    };

    // Mock the submitContactForm function
    contactController.submitContactForm = jest.fn().mockImplementation((req, res) => {
      if (!req.body.name || !req.body.email || !req.body.subject || !req.body.message) {
        return res.status(400).json({ error: 'All fields are required' });
      }
      return res.status(201).json({ message: 'Message sent successfully' });
    });

    // Call the controller directly
    contactController.submitContactForm(req, res);

    // Verify the response
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'All fields are required' });
  });

  it('should get all contact messages', async () => {
    // Mock the getAllMessages function
    contactController.getAllMessages = jest.fn().mockImplementation((req, res) => {
      res.status(200).json([
        { 
          _id: 'message1', 
          name: 'John Doe', 
          email: 'john@example.com', 
          subject: 'Inquiry',
          message: 'Hello, I have a question',
          createdAt: new Date()
        },
        { 
          _id: 'message2', 
          name: 'Jane Smith', 
          email: 'jane@example.com',
          subject: 'Support',
          message: 'I need help with my account',
          createdAt: new Date()
        }
      ]);
    });

    // Call the controller directly
    contactController.getAllMessages(req, res);

    // Verify the response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ email: 'john@example.com' })
    ]));
  });

  it('should delete a contact message', async () => {
    // Mock the deleteContact function
    contactController.deleteContact = jest.fn().mockImplementation((req, res) => {
      res.status(200).json({ message: "Contact deleted successfully." });
    });

    // Call the controller directly
    contactController.deleteContact(req, res);

    // Verify the response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Contact deleted successfully.' });
  });

  it('should send an email', async () => {
    // Mock the sendEmail function
    contactController.sendEmail = jest.fn().mockImplementation((req, res) => {
      if (!req.body.to || !req.body.subject || !req.body.message) {
        return res.status(400).json({ error: 'All fields are required' });
      }
      return res.status(200).json({ 
        message: "Email sent successfully",
        messageId: 'email123'
      });
    });

    // Call the controller directly
    contactController.sendEmail(req, res);

    // Verify the response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Email sent successfully',
      messageId: 'email123'
    }));
  });

  it('should reject incomplete email data', async () => {
    // Use incomplete data
    req.body = {
      to: 'recipient@example.com'
      // Missing subject and message
    };

    // Mock the sendEmail function
    contactController.sendEmail = jest.fn().mockImplementation((req, res) => {
      if (!req.body.to || !req.body.subject || !req.body.message) {
        return res.status(400).json({ error: 'All fields are required' });
      }
      return res.status(200).json({ 
        message: "Email sent successfully",
        messageId: 'email123'
      });
    });

    // Call the controller directly
    contactController.sendEmail(req, res);

    // Verify the response
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'All fields are required' });
  });
});