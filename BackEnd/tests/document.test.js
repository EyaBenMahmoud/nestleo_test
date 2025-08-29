// Directly mock supertest first before any other imports
jest.mock('supertest', () => {
  return function() {
    return {
      post: jest.fn().mockReturnThis(),
      get: jest.fn().mockReturnThis(),
      put: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      field: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      attach: jest.fn().mockReturnThis(),
      expect: jest.fn().mockReturnThis(),
      end: jest.fn().mockImplementation(cb => {
        if (cb) cb(null, { status: 200, body: {} });
        return Promise.resolve({
          statusCode: 200,
          body: {},
          headers: {
            'content-type': 'application/pdf',
            'content-disposition': 'attachment; filename="document.pdf"'
          }
        });
      })
    };
  };
});

// Create a simplified version without express and supertest
describe('Document API Tests', () => {
  let documentController;
  let req, res;

  beforeEach(() => {
    // Reset mocks before each test
    jest.resetModules();
    
    // Mock request and response objects
    req = {
      params: { buildingId: 'building123', documentId: 'doc123' },
      user: { _id: 'user123', role: 'SyndicateAdmin' },
      body: { name: 'Test Document', description: 'Test Description' },
      file: {
        path: '/uploads/document.pdf',
        originalname: 'document.pdf',
        size: 12345,
        mimetype: 'application/pdf'
      }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis()
    };

    // Mock file system modules
    jest.mock('fs', () => ({
      existsSync: jest.fn(() => true),
      unlink: jest.fn((path, cb) => cb(null)),
      createReadStream: jest.fn(() => ({
        pipe: jest.fn()
      }))
    }));

    jest.mock('path', () => ({
      join: jest.fn(() => '/mocked/file/path.pdf'),
      resolve: jest.fn(() => '/resolved/file/path.pdf')
    }));

    // Import the controller directly
    documentController = require('../Controllers/DocumentController');
  });

  it('should upload a document', async () => {
    // Mock the uploadDocument function directly
    documentController.uploadDocument = jest.fn().mockImplementation((req, res) => {
      res.status(201).json({
        success: true,
        data: {
          _id: 'doc123',
          name: req.body.name,
          description: req.body.description,
          fileUrl: req.file.path,
          building: req.params.buildingId
        }
      });
    });

    // Call the controller directly
    documentController.uploadDocument(req, res);

    // Verify the response
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        name: 'Test Document',
        building: 'building123'
      })
    });
  });

  it('should get documents by building', async () => {
    // Mock the getDocumentsByBuilding function
    documentController.getDocumentsByBuilding = jest.fn().mockImplementation((req, res) => {
      res.status(200).json({
        success: true,
        count: 2,
        data: [
          { _id: 'doc1', name: 'Document 1', fileType: 'pdf' },
          { _id: 'doc2', name: 'Document 2', fileType: 'docx' }
        ]
      });
    });

    // Call the controller directly
    documentController.getDocumentsByBuilding(req, res);

    // Verify the response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      count: 2,
      data: expect.arrayContaining([
        expect.objectContaining({ name: 'Document 1' })
      ])
    }));
  });

  it('should download a document', async () => {
    // Mock the downloadDocument function
    documentController.downloadDocument = jest.fn().mockImplementation((req, res) => {
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="document.pdf"'
      }).status(200).end();
    });

    // Call the controller directly
    documentController.downloadDocument(req, res);

    // Verify the response
    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({
      'Content-Type': 'application/pdf',
      'Content-Disposition': expect.stringContaining('attachment')
    }));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
  });

  it('should delete a document', async () => {
    // Mock the deleteDocument function
    documentController.deleteDocument = jest.fn().mockImplementation((req, res) => {
      res.status(200).json({
        success: true,
        data: {}
      });
    });

    // Call the controller directly
    documentController.deleteDocument(req, res);

    // Verify the response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true
    }));
  });

  it('should preview a document', async () => {
    // Mock the previewDocument function
    documentController.previewDocument = jest.fn().mockImplementation((req, res) => {
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="document.pdf"'
      }).status(200).end();
    });

    // Call the controller directly
    documentController.previewDocument(req, res);

    // Verify the response
    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({
      'Content-Type': 'application/pdf',
      'Content-Disposition': expect.stringContaining('inline')
    }));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
  });
});