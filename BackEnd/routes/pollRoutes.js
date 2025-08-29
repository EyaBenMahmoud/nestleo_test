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

const getPollStats = async (req, res) => {
  try {
    const { buildingId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(buildingId)) {
      return res.status(400).json({ success: false, message: 'Invalid building ID' });
    }

    // Get the building with the correct field name for co-owners
    // Try different possible field names based on your schema
    const Building = mongoose.model('Building');
    const building = await Building.findById(buildingId).lean();
      
    if (!building) {
      return res.status(404).json({ success: false, message: 'Building not found' });
    }
    
    // Determine the right field name by checking what exists
    // This approach is more resilient to schema differences
    let totalCoowners = 0;
    if (Array.isArray(building.coOwners)) {
      totalCoowners = building.coOwners.length;
    } else if (Array.isArray(building.residents)) {
      totalCoowners = building.residents.length;
    } else if (Array.isArray(building.users)) {
      totalCoowners = building.users.length;
    } else {
      // If no co-owner field is found, use a fixed value or query a related collection
      // Let's try to get this from the User model with a role query
      const User = mongoose.model('User');
      const coownerUsers = await User.countDocuments({ 
        'role': { $in: ['coowner', 'co-owner', 'resident'] },
        'building': buildingId 
      });
      totalCoowners = coownerUsers || 2; // Default to 2 if nothing found
    }
    
    // Get all events for this building
    const events = await Event.find({ building: buildingId });
    
    if (!events || events.length === 0) {
      return res.json({
        total: 0,
        active: 0,
        completed: 0,
        participation: 0,
        recentPolls: []
      });
    }

    // Get event IDs for query
    const eventIds = events.map(event => event._id);

    // Get all polls for these events
    const polls = await Poll.find({ event: { $in: eventIds } })
      .populate('event', 'title')
      .lean();

    const totalPolls = polls.length;
    
    // Calculate active and completed polls
    const now = new Date();
    const activePollsCount = polls.filter(poll => 
      poll.isActive === true || 
      (poll.endDate && new Date(poll.endDate) > now)
    ).length;
    
    const completedPollsCount = polls.filter(poll => 
      poll.isActive === false || 
      (poll.endDate && new Date(poll.endDate) <= now)
    ).length;
    
    // Calculate average participation
    let totalVotes = 0;
    let totalPossibleVotes = 0;
    
    // Process each poll to count votes
    polls.forEach(poll => {
      let pollVotes = 0;
      
      // Count votes from all questions and options
      if (poll.questions && Array.isArray(poll.questions)) {
        poll.questions.forEach(question => {
          if (question.options && Array.isArray(question.options)) {
            question.options.forEach(option => {
              pollVotes += option.votes || 0;
            });
          }
        });
      }
      
      totalVotes += pollVotes;
      // Each poll could potentially be voted on by all coowners
      totalPossibleVotes += totalCoowners;
    });
    
    // Calculate participation percentage
    const avgParticipation = totalPossibleVotes > 0 
      ? Math.min(100, Math.round((totalVotes / totalPossibleVotes) * 100))
      : 0;
    
    // Get the 5 most recent polls
    const recentPolls = polls
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5)
      .map(poll => {
        // Calculate total votes in this poll
        let pollTotalVotes = 0;
        
        if (poll.questions && Array.isArray(poll.questions)) {
          poll.questions.forEach(question => {
            if (question.options && Array.isArray(question.options)) {
              question.options.forEach(option => {
                pollTotalVotes += option.votes || 0;
              });
            }
          });
        }
        
        // Calculate poll participation rate
        const pollParticipationRate = totalCoowners > 0 
          ? Math.min(100, Math.round((pollTotalVotes / totalCoowners) * 100)) 
          : 0;
        
        return {
          id: poll._id,
          title: poll.title,
          event: poll.event?.title || 'N/A',
          status: poll.isActive === false || (poll.endDate && new Date(poll.endDate) <= now) 
            ? 'completed' 
            : 'active',
          endDate: poll.endDate,
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
module.exports = router;