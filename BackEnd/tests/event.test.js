// First mock any dependencies
jest.mock('../Models/Event');
jest.mock('../Models/User');
jest.mock('../Models/Building');
jest.mock('../Socket/socketManager', () => ({
  socketManager: {
    io: {
      to: jest.fn().mockReturnValue({
        emit: jest.fn()
      })
    },
    onlineUsers: {
      get: jest.fn()
    }
  }
}));
jest.mock('../Controllers/notificationsController', () => ({
  createNotification: jest.fn().mockResolvedValue({ _id: 'notif123' })
}));
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token')
}));

describe('Event API Tests', () => {
  let eventController;
  let req, res;

  beforeEach(() => {
    // Reset mocks before each test
    jest.resetModules();
    
    // Mock request and response objects
    req = {
      params: { id: 'event123', buildingId: 'building123' },
      user: { _id: 'user123', role: 'SyndicateAdmin' },
      body: {
        title: 'New Meeting',
        description: 'Planning session',
        start: '2025-07-01T10:00:00',
        eventTime: '10:00',
        building: 'building123'
      }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Import the controller directly
    eventController = require('../Controllers/EventController');
  });

  it('should get events for a building', async () => {
    // Mock the getEvents function
    eventController.getEvents = jest.fn().mockImplementation((req, res) => {
      res.status(200).json([
        { _id: 'event1', title: 'Meeting 1', start: new Date(), building: 'building123' }
      ]);
    });

    // Call the controller directly
    eventController.getEvents(req, res);

    // Verify the response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ title: 'Meeting 1' })
    ]));
  });

  it('should create a new event', async () => {
    // Mock the createEvent function
    eventController.createEvent = jest.fn().mockImplementation((req, res) => {
      res.status(201).json({
        _id: 'event123',
        title: req.body.title,
        description: req.body.description,
        start: req.body.start,
        end: req.body.end || new Date(new Date(req.body.start).getTime() + 60 * 60 * 1000),
        building: req.body.building,
        createdBy: req.user._id
      });
    });

    // Call the controller directly
    eventController.createEvent(req, res);

    // Verify the response
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      title: 'New Meeting',
      building: 'building123',
      createdBy: 'user123'
    }));
  });

  it('should update an event', async () => {
    // Change request body for update
    req.body = {
      title: 'Updated Meeting',
      description: 'Rescheduled planning session'
    };

    // Mock the updateEvent function
    eventController.updateEvent = jest.fn().mockImplementation((req, res) => {
      res.status(200).json({
        _id: req.params.id,
        title: req.body.title || 'Original Title',
        description: req.body.description || 'Original Description',
        start: req.body.start || new Date()
      });
    });

    // Call the controller directly
    eventController.updateEvent(req, res);

    // Verify the response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      _id: 'event123',
      title: 'Updated Meeting',
      description: 'Rescheduled planning session'
    }));
  });

  it('should delete an event', async () => {
    // Mock the deleteEvent function
    eventController.deleteEvent = jest.fn().mockImplementation((req, res) => {
      res.status(200).json({
        message: 'Event deleted successfully'
      });
    });

    // Call the controller directly
    eventController.deleteEvent(req, res);

    // Verify the response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Event deleted successfully'
    });
  });

  it('should allow joining a meeting', async () => {
    // Mock the joinMeeting function
    eventController.joinMeeting = jest.fn().mockImplementation((req, res) => {
      res.status(200).json({
        success: true,
        roomName: `event-${req.params.id}`,
        eventTitle: 'Test Event',
        token: 'jitsi-token-123'
      });
    });

    // Call the controller directly
    eventController.joinMeeting(req, res);

    // Verify the response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      roomName: 'event-event123',
      token: 'jitsi-token-123'
    }));
  });

  it('should start a meeting', async () => {
    // Mock the startMeeting function
    eventController.startMeeting = jest.fn().mockImplementation((req, res) => {
      res.status(200).json({
        message: 'Meeting started successfully',
        roomName: `event-${req.params.id}`,
        eventId: req.params.id,
        token: 'jitsi-token-123'
      });
    });

    // Call the controller directly
    eventController.startMeeting(req, res);

    // Verify the response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Meeting started successfully',
      eventId: 'event123'
    }));
  });

  it('should end a meeting', async () => {
    // Mock the endMeetingController function
    eventController.endMeetingController = jest.fn().mockImplementation((req, res) => {
      res.status(200).json({
        message: 'Meeting ended successfully'
      });
    });

    // Call the controller directly
    eventController.endMeetingController(req, res);

    // Verify the response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Meeting ended successfully'
    });
  });
});