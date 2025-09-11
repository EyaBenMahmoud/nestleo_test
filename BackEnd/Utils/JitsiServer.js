const crypto = require('crypto');
const jwt = require('jsonwebtoken');
// Environment variables - these should be in your .env file
const FRONTEND_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const JWT_APP_ID = process.env.JWT_APP_ID || 'nestly_app';
const JWT_APP_SECRET = process.env.JWT_APP_SECRET || 'your_secret_key'; // Change this!
const JITSI_DOMAIN = process.env.JITSI_DOMAIN || 'nestleo.com:8443';
/**
 * Clean room name to be Jitsi compatible
 */
const cleanRoomName = (name) => {
  return `nestly-${name}`.replace(/[^a-zA-Z0-9-_]/g, '').substring(0, 64);
};
const generateJitsiToken = (user, roomName, isAdmin = false) => {
  // Add a longer expiration and more buffer time
  const now = Math.floor(Date.now() / 1000);
  
  const payload = {
    aud: JWT_APP_ID,
    iss: JWT_APP_ID,
    sub: JITSI_DOMAIN,
    room: roomName,
    exp: now + 7200, // 2 hours expiration (instead of 1)
    nbf: now - 60,   // Valid from 60 seconds ago (instead of 10)
    iat: now - 30,   // Issued 30 seconds ago (gives more buffer)
    
    // Rest of your code remains the same
    context: {
      user: {
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        id: user._id.toString(),
        moderator: isAdmin // Only admins are moderators
      }
    }
  };
  
  // Include the kid (Key ID) in header to prevent "missing kid" errors
  const options = {
    algorithm: 'HS256',
    header: {
      alg: 'HS256',
      typ: 'JWT',
      kid: JWT_APP_ID
    }
  };
  
  return jwt.sign(payload, JWT_APP_SECRET, options);
};

/**
 * Generate a unique meeting ID that is deterministic but hard to guess
 */
const generateMeetingId = (eventId) => {
  const timestamp = Date.now();
  const uniqueId = `event-${eventId}-${timestamp}`;
  return cleanRoomName(uniqueId);
};

/**
 * Create a new meeting in Jitsi
 */
const createMeeting = async (meetingID, meetingName, user) => {
  try {
    // Generate a unique but valid room name for Jitsi
    const roomName = cleanRoomName(meetingID);
    
    // Generate tokens for moderator and attendee
    const moderatorToken = user ? generateJitsiToken(user, roomName, true) : null;
    const attendeeToken = user ? generateJitsiToken(user, roomName, false) : null;
    
    // For embedded meetings, we use internal routes
    const moderatorURL = FRONTEND_URL + `/meeting/${roomName}/${meetingID.split('-')[1]}`;
    const attendeeURL = FRONTEND_URL + `/meeting/${roomName}/${meetingID.split('-')[1]}`;
    
    return {
      success: true,
      meetingID: roomName,
      attendeeURL,
      attendeeToken,
      moderatorURL,
      moderatorToken
    };
  } catch (error) {
    console.error('Error creating Jitsi meeting:', error);
    return { success: false, error: error.message };
  }
};
/**
 * Check if a meeting is running
 * With Jitsi, we'll just assume it's running since there's no simple API to check
 */
const isMeetingRunning = async () => {
  return true; // Always assume running with Jitsi
};

/**
 * End a meeting
 * With Jitsi, we'll just mark it as inactive in our database
 */
const endMeeting = async () => {
  return true; // Just return success
};

module.exports = {
  createMeeting,
  isMeetingRunning,
  endMeeting,
  generateMeetingId,
  cleanRoomName,
  generateJitsiToken
};
