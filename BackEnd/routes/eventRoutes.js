const express = require("express");
const router = express.Router();
const { protect } = require("../Middlewares/AuthMiddleware");
const {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  joinMeeting,
  startMeeting,
  endMeetingController,
  upload,
  downloadDocument,
  deleteDocument,
  getSingleEvent
} = require("../Controllers/EventController");








router.use((req, res, next) => {
  // Skip auth for diagnostic routes
  if (req.path.includes('diagnostics') || req.path.includes('direct-test')) {
    return next();
  }
  
  // For all other routes, apply protection
  protect(req, res, next);
});
// Update the diagnostic route to use Jitsi
router.get("/jitsi-diagnostics", async (req, res) => {
  try {
    const { testJitsiConnection, createMeeting } = require("../Utils/JitsiServer");
    const os = require('os');
    
    // System info
    const systemInfo = {
      hostname: os.hostname(),
      platform: os.platform(),
      release: os.release(),
      cpus: os.cpus().length,
      totalMemory: `${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB`,
      freeMemory: `${Math.round(os.freemem() / (1024 * 1024 * 1024))} GB`,
      uptime: `${Math.round(os.uptime() / 3600)} hours`,
    };
    
    // Test Jitsi server connection
    const connectionTest = await testJitsiConnection();
    
    // Create a test meeting
    let meetingTest = { success: false };
    
    if (connectionTest) {
      // Create test meeting
      const testMeetingID = `diagnostics-${Date.now()}`;
      meetingTest = await createMeeting(
        testMeetingID,
        "Diagnostic Test",
        "attendee123",
        "moderator123",
        "Welcome to diagnostics test"
      );
    }
    
    res.json({
      systemInfo,
      jitsiServer: {
        domain: process.env.JITSI_DOMAIN || 'meet.jit.si',
        connectionTest,
        meetingTest
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

// Update the direct test route too
router.get("/jitsi-direct-test", async (req, res) => {
  try {
    const { createMeeting } = require("../Utils/JitsiServer");
    
    // Create a test meeting
    const testMeetingID = `direct-test-${Date.now()}`;
    const result = await createMeeting(
      testMeetingID,
      "Direct Test Meeting",
      "ap123",
      "mp456"
    );
    
    // Create a simple HTML page with direct links
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Jitsi Direct Test</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 2em; }
          .btn { display: inline-block; padding: 10px 15px; background: #4CAF50; color: white; 
                text-decoration: none; border-radius: 4px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <h1>Jitsi Meet Direct Test</h1>
        <p>Meeting ID: ${result.meetingID}</p>
        <p>Click one of these links to test joining:</p>
        <a class="btn" href="${result.moderatorURL}" target="_blank">Join as Moderator</a><br>
        <a class="btn" href="${result.attendeeURL}" target="_blank">Join as Attendee</a>
        <hr>
        <h3>Technical Details:</h3>
        <pre>${JSON.stringify(result, null, 2)}</pre>
      </body>
      </html>
    `;
    
    res.send(html);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});
router.get("/single/:id", getSingleEvent);
// Basic event routes
router.get("/:buildingId", getEvents);
router.post("/", protect, upload.array('documents', 5), createEvent);
router.post("/:id/update", upload.array('documents'), updateEvent);
router.delete("/:id", deleteEvent);




router.get("/:eventId/documents/:documentId", downloadDocument);
router.delete("/:eventId/documents/:documentId", protect, deleteDocument);

router.post("/:id/join", joinMeeting);
router.post("/:id/start", startMeeting);
router.post("/:id/end", endMeetingController);

module.exports = router;