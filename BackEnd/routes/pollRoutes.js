const express = require("express");
const router = express.Router();
const pollController = require('../Controllers/pollcontroller'); // Note the capitalization
const { protect } = require('../Middlewares/AuthMiddleware');
const Event = require("../Models/Event");
const { default: mongoose } = require("mongoose");
const Poll = require("../Models/poll");
// Poll routes
router.post('/', protect, pollController.createPoll);
router.get('/events/:eventId/polls', protect, pollController.getEventPolls);
router.put('/:id', protect, pollController.updatePoll);
router.get('/:id/onepoll', protect, pollController.getPollById);
router.delete('/:id', protect, pollController.deletePoll);
router.post('/:id/vote', protect, pollController.votePoll);
router.get('/:id/results', protect, pollController.getPollResults);
router.post('/:id/start', protect, pollController.startPoll);
router.post('/:id/stop', protect, pollController.stopPoll);
router.get("/:eventId/active-participants", protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .populate('meeting.activeParticipants.userId', 'firstName lastName role avatar');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Only return participants who can vote (admins and co-owners)
    const votingParticipants = event.meeting.activeParticipants.filter(
      p => p.role === 'SyndicateAdmin' || p.role === 'SyndicateCoowner'
    );

    res.json(votingParticipants);
  } catch (error) {
    console.error('Error fetching event participants:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
router.post('/events/:eventId/start-sequence', protect, pollController.startPollSequence);
router.post('/events/:eventId/stop-sequence', protect, pollController.stopPollSequence);

// Replace the getPollStats function with this improved version
const getPollStats = async (req, res) => {
  try {
    const { buildingId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(buildingId)) {
      return res.status(400).json({ success: false, message: 'Invalid building ID' });
    }

    // Get the building data
    const Building = mongoose.model('Building');
    const building = await Building.findById(buildingId).lean();
      
    if (!building) {
      return res.status(404).json({ success: false, message: 'Building not found' });
    }
    
    // Get total co-owners count
    const User = mongoose.model('User');
    const coownersCount = await User.countDocuments({ 
      'role': { $in: ['coowner', 'co-owner', 'SyndicateCoowner'] },
      'building': buildingId 
    });
    
    const totalCoowners = Math.max(coownersCount, 1); // Ensure at least 1 to avoid division by zero
    
    // Get all events for this building
    const events = await Event.find({ building: buildingId }, '_id');
    const eventIds = events.map(event => event._id);
    
    // Find all polls for this building (both standalone and event polls)
    const polls = await Poll.find({
      $or: [
        { event: { $in: eventIds } },
        { building: buildingId, isStandalone: true }
      ]
    }).populate('event', 'title').populate('responses.user', 'firstName lastName');
    
    if (!polls || polls.length === 0) {
      return res.json({
        total: 0,
        active: 0,
        completed: 0,
        participation: 0,
        recentPolls: []
      });
    }

    const totalPolls = polls.length;
    const activePollsCount = polls.filter(poll => poll.status === 'active').length;
    const completedPollsCount = polls.filter(poll => poll.status === 'completed').length;
    
    // Calculate participation rate from responses
    let totalUniqueParticipants = 0;
    let totalPossibleParticipants = 0;
    
    // Get completed polls for participation calculation
    const completedPolls = polls.filter(poll => poll.status === 'completed');
    
    // For each completed poll, count unique participants
    completedPolls.forEach(poll => {
      if (Array.isArray(poll.responses)) {
        // Create a set of unique user IDs who responded
        const uniqueRespondents = new Set();
        
        poll.responses.forEach(response => {
          if (response.user) {
            uniqueRespondents.add(response.user.toString());
          }
        });
        
        totalUniqueParticipants += uniqueRespondents.size;
        totalPossibleParticipants += totalCoowners; // Each poll could be participated in by all co-owners
      }
    });
    
    // Calculate participation percentage
    const avgParticipation = totalPossibleParticipants > 0 
      ? Math.min(100, Math.round((totalUniqueParticipants / totalPossibleParticipants) * 100))
      : 0;
    
    // Get 5 most recent polls with proper participation calculation
    const recentPolls = polls
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5)
      .map(poll => {
        // Calculate unique respondents for this poll
        const uniqueRespondents = new Set();
        
        if (Array.isArray(poll.responses)) {
          poll.responses.forEach(response => {
            if (response.user) {
              uniqueRespondents.add(response.user.toString());
            }
          });
        }
        
        // Calculate poll participation rate
        const pollParticipationRate = totalCoowners > 0 
          ? Math.min(100, Math.round((uniqueRespondents.size / totalCoowners) * 100)) 
          : 0;
        
        return {
          id: poll._id,
          title: poll.title,
          event: poll.event?.title || 'Standalone Poll',
          status: poll.status,
          endDate: poll.endedAt,
          participationRate: pollParticipationRate
        };
      });
    
    res.json({
      total: totalPolls,
      active: activePollsCount,
      completed: completedPollsCount,
      participation: avgParticipation,
      recentPolls
    });

  } catch (error) {
    console.error('Error getting poll stats:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
router.get('/stats/:buildingId', protect, getPollStats);
// Add these routes to your existing file
router.post('/standalone', protect, pollController.createStandalonePoll);
router.get('/building/:buildingId/standalone', protect, pollController.getStandalonePolls);
router.get('/building/:buildingId/archived', protect, pollController.getArchivedPolls);
router.post('/:pollId/attach/:eventId', protect, pollController.attachPollToEvent);
router.post('/:pollId/detach', protect, pollController.detachPollFromEvent);
router.get('/building/:buildingId/stats', protect, getPollStats);

module.exports = router;