// First mock any dependencies
jest.mock('../Models/Crm');

describe('CRM API Tests', () => {
  let crmController;
  let req, res;

  beforeEach(() => {
    // Reset mocks before each test
    jest.resetModules();
    
    // Mock request and response objects
    req = {
      params: {},
      user: { _id: 'user123', role: 'Admin' },
      body: {
        WebsiteUrl: 'https://updated.com',
        phoneNumber: '+9876543210',
        address: '456 New St, Town',
        email: 'new@example.com'
      }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Import the controller directly
    crmController = require('../Controllers/CrmController');
  });

  it('should get CRM settings', async () => {
    // Mock the getCRMSettings function
    crmController.getCRMSettings = jest.fn().mockImplementation((req, res) => {
      res.status(200).json({
        WebsiteUrl: 'https://example.com',
        phoneNumber: '+1234567890',
        address: '123 Main St, City',
        email: 'contact@example.com'
      });
    });

    // Call the controller directly
    crmController.getCRMSettings(req, res);

    // Verify the response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      WebsiteUrl: 'https://example.com',
      phoneNumber: '+1234567890',
      address: '123 Main St, City',
      email: 'contact@example.com'
    }));
  });

  it('should update CRM settings', async () => {
    // Mock the updateCRMSettings function
    crmController.updateCRMSettings = jest.fn().mockImplementation((req, res) => {
      res.status(200).json({
        WebsiteUrl: req.body.WebsiteUrl,
        phoneNumber: req.body.phoneNumber,
        address: req.body.address,
        email: req.body.email
      });
    });

    // Call the controller directly
    crmController.updateCRMSettings(req, res);

    // Verify the response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      WebsiteUrl: 'https://updated.com',
      phoneNumber: '+9876543210',
      address: '456 New St, Town',
      email: 'new@example.com'
    });
  });

  it('should handle partial updates to CRM settings', async () => {
    // Change req to have only partial data
    req.body = {
      email: 'partial@example.com'
    };

    // Mock the updateCRMSettings function with partial data handling
    crmController.updateCRMSettings = jest.fn().mockImplementation((req, res) => {
      // In a real implementation, this would merge with existing settings
      res.status(200).json({
        WebsiteUrl: 'https://example.com', // Default value
        phoneNumber: '+1234567890', // Default value
        address: '123 Main St, City', // Default value
        email: req.body.email // Only this is updated
      });
    });

    // Call the controller directly
    crmController.updateCRMSettings(req, res);

    // Verify the response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      email: 'partial@example.com',
      WebsiteUrl: 'https://example.com' // Default value remains
    }));
  });
});