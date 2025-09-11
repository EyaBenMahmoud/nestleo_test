const { PointTransaction } = require('../Models/gamification');
const Poll = require('../Models/poll');
const Event = require('../Models/Event');
const mongoose = require('mongoose');

// Get all polls for an event
// Update the getEventPolls function to handle 'standalone' as a special eventId
const getEventPolls = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Special case for standalone polls route
    if (eventId === 'standalone') {
      return res.status(400).json({
        message: 'For standalone polls, use the /building/:buildingId/standalone endpoint instead'
      });
    }

    let polls;
    // Check if eventId is a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(eventId)) {
      polls = await Poll.find({ event: eventId })
        .sort({ createdAt: -1 })
        .populate('createdBy', 'firstName lastName');
    } else {
      return res.status(400).json({ message: 'Invalid event ID format' });
    }

    return res.status(200).json(polls);
  } catch (error) {
    console.error('Error fetching polls:', error);
    return res.status(500).json({ message: error.message });
  }
};



// Update a poll
const updatePoll = async (req, res) => {
  try {
    const { id } = req.params;
    // Accept questions array for multi-question polls
    const { title, description, options, duration, order, questions, questionDuration, pauseDuration } = req.body;

    const poll = await Poll.findById(id);
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    // Only allow updates if poll is pending
    if (poll.status !== 'pending') {
      return res.status(400).json({ message: 'Cannot update poll that has already started or completed' });
    }

    // Verify user is the creator or admin
    if (poll.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'SyndicateAdmin') {
      return res.status(403).json({ message: 'Not authorized to update this poll' });
    }

    // Update for new poll model (multi-question)
    if (questions && Array.isArray(questions)) {
      poll.questions = questions.map((q, idx) => ({
        title: q.title,
        description: q.description || '',
        options: q.options.map(opt => ({
          text: typeof opt === 'string' ? opt : opt.text,
          votes: typeof opt.votes === 'number' ? opt.votes : 0
        })),
        order: q.order !== undefined ? q.order : idx + 1
      }));
    }

    // For legacy single-question polls
    if (options && !questions) {
      poll.options = options.map(option => ({
        text: typeof option === 'string' ? option : option.text,
        votes: typeof option.votes === 'number' ? option.votes : 0
      }));
    }

    if (title !== undefined) poll.title = title;
    if (description !== undefined) poll.description = description;
    if (duration !== undefined) poll.duration = duration;
    if (order !== undefined) poll.order = order;
    if (questionDuration !== undefined) poll.questionDuration = questionDuration;
    if (pauseDuration !== undefined) poll.pauseDuration = pauseDuration;

    await poll.save();
    return res.status(200).json(poll);
  } catch (error) {
    console.error('Error updating poll:', error);
    return res.status(500).json({ message: error.message });
  }
};

// Delete a poll
const deletePoll = async (req, res) => {
  try {
    const { id } = req.params;

    const poll = await Poll.findById(id);
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    // Only allow deletion if poll is pending
    if (poll.status !== 'pending') {
      return res.status(400).json({ message: 'Cannot delete poll that has already started or completed' });
    }

    // Verify user is the creator or admin
    if (poll.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'SyndicateAdmin') {
      return res.status(403).json({ message: 'Not authorized to delete this poll' });
    }

    await Poll.findByIdAndDelete(id);
    return res.status(200).json({ message: 'Poll deleted successfully' });
  } catch (error) {
    console.error('Error deleting poll:', error);
    return res.status(500).json({ message: error.message });
  }
};


// Get poll results
const getPollResults = async (req, res) => {
  try {
    const { id } = req.params;

    const poll = await Poll.findById(id)
      .populate('responses.user', 'firstName lastName role')
      .populate('createdBy', 'firstName lastName');

    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    return res.status(200).json(poll);
  } catch (error) {
    console.error('Error fetching poll results:', error);
    return res.status(500).json({ message: error.message });
  }
};



const startPollSequence = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Verify user is admin
    if (req.user.role !== 'SyndicateAdmin') {
      return res.status(403).json({ message: 'Only SyndicateAdmin can start poll sequences' });
    }

    // Find the first pending poll
    const firstPoll = await Poll.findOne({
      event: eventId,
      status: 'pending'
    }).sort({ order: 1 });

    if (!firstPoll) {
      return res.status(404).json({ message: 'No pending polls found for this event' });
    }

    // Start the first poll
    firstPoll.status = 'active';
    firstPoll.startedAt = new Date();
    firstPoll.active = true;
    await firstPoll.save();

    // Get socketManager from global variable or import
    const socketManager = require('../Socket/socketManager').socketManager;

    // Broadcast poll start using socketManager's io instance
    if (socketManager && socketManager.io) {
      socketManager.io.to(`event-${eventId}`).emit('pollStarted', firstPoll);
      socketManager.io.to(`event-${eventId}`).emit('pollSequenceStarted', { eventId });
    } else {
      console.warn("Socket.io instance not available for broadcasting");
    }

    return res.status(200).json({
      message: 'Poll sequence started',
      currentPoll: firstPoll
    });
  } catch (error) {
    console.error('Error starting poll sequence:', error);
    return res.status(500).json({ message: error.message });
  }
};

// Stop an active poll (admin only)
const stopPoll = async (req, res) => {
  try {
    const { id } = req.params;

    const poll = await Poll.findById(id);
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    // Verify user is admin
    if (req.user.role !== 'SyndicateAdmin') {
      return res.status(403).json({ message: 'Only SyndicateAdmin can stop polls' });
    }

    if (poll.status !== 'active') {
      return res.status(400).json({ message: 'Poll is not active' });
    }

    poll.status = 'completed';
    poll.endedAt = new Date();
    poll.active = false;

    await poll.save();

    const socketManager = require('../Socket/socketManager').socketManager;
    if (socketManager && socketManager.io) {
      socketManager.io.to(`event-${poll.event}`).emit('pollEnded', poll);
    }


    return res.status(200).json(poll);
  } catch (error) {
    console.error('Error stopping poll:', error);
    return res.status(500).json({ message: error.message });
  }
};

// Stop the poll sequence for an event (admin only)
const stopPollSequence = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Verify user is admin
    if (req.user.role !== 'SyndicateAdmin') {
      return res.status(403).json({ message: 'Only SyndicateAdmin can stop poll sequences' });
    }

    // Find and stop any active polls for this event
    const activePolls = await Poll.find({
      event: eventId,
      status: 'active'
    });

    if (activePolls.length === 0) {
      return res.status(404).json({ message: 'No active polls found for this event' });
    }

    for (const poll of activePolls) {
      poll.status = 'completed';
      poll.endedAt = new Date();
      poll.active = false;
      await poll.save();
    } const socketManager = require('../Socket/socketManager').socketManager;

    // Broadcast sequence stopped
    if (socketManager && socketManager.io) {
      socketManager.io.to(`event-${eventId}`).emit('pollSequenceStopped', { eventId });
    } else {
      console.warn("Socket.io instance not available for broadcasting");
    }

    return res.status(200).json({
      message: 'Poll sequence stopped',
      stoppedPolls: activePolls
    });
  } catch (error) {
    console.error('Error stopping poll sequence:', error);
    return res.status(500).json({ message: error.message });
  }
};
// Create a new poll with multiple questions
// In your createPoll function
const createPoll = async (req, res) => {
  try {
    const { eventId, title, description, questions, questionDuration, pauseDuration } = req.body;

    // Validate event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Validate user has permission
    if (req.user.role !== 'SyndicateAdmin') {
      return res.status(403).json({ message: 'Only SyndicateAdmin can create polls' });
    }

    // Format questions correctly
    const formattedQuestions = questions.map((q, index) => ({
      title: q.title,
      description: q.description || '',
      // This is the key change - don't put objects inside options, use simple text strings
      options: q.options.map(opt => ({
        text: typeof opt === 'string' ? opt : opt.text,
        votes: 0
      })),
      order: index + 1
    }));

    // Log what's being sent to MongoDB for debugging
    console.log('Creating poll with questions:', JSON.stringify(formattedQuestions, null, 2));

    const poll = new Poll({
      event: eventId,
      title,
      description,
      questions: formattedQuestions,
      questionDuration: questionDuration || 60,
      pauseDuration: pauseDuration || 5,
      createdBy: req.user._id
    });

    await poll.save();
    return res.status(201).json(poll);
  } catch (error) {
    console.error('Error creating poll:', error);
    return res.status(500).json({ message: error.message });
  }
};
// Start poll sequence
const startPoll = async (req, res) => {
  try {
    const { id } = req.params;

    const poll = await Poll.findById(id);
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    // Verify user is admin
    if (req.user.role !== 'SyndicateAdmin') {
      return res.status(403).json({ message: 'Only SyndicateAdmin can start polls' });
    }

    // Only start if pending
    if (poll.status !== 'pending') {
      return res.status(400).json({ message: 'Poll is already active or completed' });
    }

    // Initialize the poll
    poll.status = 'active';
    poll.startedAt = new Date();
    poll.active = true;
    poll.currentQuestion = 1; // Start with first question
    await poll.save();

    const socketManager = require('../Socket/socketManager').socketManager;
    if (socketManager && socketManager.io) {
      // Send the full poll data with current question info
      const pollData = {
        ...poll.toObject(),
        currentQuestionData: poll.questions[0], // First question
        totalQuestions: poll.questions.length
      };

      socketManager.io.to(`event-${poll.event}`).emit('pollStarted', pollData);
      socketManager.io.to(`event-${poll.event}`).emit('questionChanged', {
        pollId: poll._id,
        questionIndex: 0,
        question: poll.questions[0],
        totalQuestions: poll.questions.length
      });
    }

    // Schedule progression through questions
    scheduleNextQuestions(poll, socketManager);

    return res.status(200).json({
      message: 'Poll started',
      currentQuestion: 1,
      totalQuestions: poll.questions.length
    });
  } catch (error) {
    console.error('Error starting poll:', error);
    return res.status(500).json({ message: error.message });
  }
};

// Helper function to schedule question progression
const scheduleNextQuestions = async (poll, socketManager) => {
  try {
    // For each question, schedule when to show it
    const questionCount = poll.questions.length;
    let totalDelay = 0;

    // Skip the first question as it's already shown
    for (let i = 1; i < questionCount; i++) {
      const previousQuestionDuration = poll.questionDuration;
      const pauseTime = poll.pauseDuration;

      totalDelay += previousQuestionDuration + pauseTime;

      setTimeout(async () => {
        try {
          // Get fresh poll data
          const updatedPoll = await Poll.findById(poll._id);

          if (!updatedPoll || updatedPoll.status !== 'active') {
            console.log('Poll no longer active, stopping question progression');
            return;
          }

          // Update to the next question
          updatedPoll.currentQuestion = i + 1;
          await updatedPoll.save();

          // Emit the question change event
          if (socketManager && socketManager.io) {
            socketManager.io.to(`event-${updatedPoll.event}`).emit('questionChanged', {
              pollId: updatedPoll._id,
              questionIndex: i,
              question: updatedPoll.questions[i],
              totalQuestions: questionCount
            });
          }

          // If this is the last question, schedule poll end
          if (i === questionCount - 1) {
            setTimeout(async () => {
              const finalPoll = await Poll.findById(poll._id);
              if (finalPoll && finalPoll.status === 'active') {
                finalPoll.status = 'completed';
                finalPoll.endedAt = new Date();
                finalPoll.active = false;
                await finalPoll.save();

                if (socketManager && socketManager.io) {
                  socketManager.io.to(`event-${finalPoll.event}`).emit('pollEnded', finalPoll);
                }
              }
            }, updatedPoll.questionDuration * 1000);
          }
        } catch (err) {
          console.error('Error progressing to next question:', err);
        }
      }, totalDelay * 1000);
    }
  } catch (error) {
    console.error('Error scheduling questions:', error);
  }
};

// Updated vote handler for the new model
const votePoll = async (req, res) => {
  try {
    const { id } = req.params;
    const { questionIndex, optionIndex } = req.body;

    console.log(`Vote for poll ${id}, question ${questionIndex}, option ${optionIndex} by user ${req.user._id}`);

    const poll = await Poll.findById(id);
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    if (poll.status !== 'active') {
      return res.status(400).json({ message: 'Poll is not active' });
    }

    // Validate question and option indices
    if (
      questionIndex < 0 ||
      questionIndex >= poll.questions.length ||
      optionIndex < 0 ||
      optionIndex >= poll.questions[questionIndex].options.length
    ) {
      return res.status(400).json({ message: 'Invalid question or option index' });
    }

    // Check if user already voted for this specific question
    const existingVote = poll.responses.find(
      response =>
        response.user.toString() === req.user._id.toString() &&
        response.questionIndex === questionIndex
    );

    if (existingVote) {
      return res.status(400).json({ message: 'You have already voted for this question' });
    }

    // Add vote to the specific question's option
    poll.questions[questionIndex].options[optionIndex].votes += 1;

    // Record the response
    poll.responses.push({
      user: req.user._id,
      questionIndex,
      optionIndex,
      votedAt: new Date()
    });

    await poll.save();

    // Emit update via socket
    const socketManager = require('../Socket/socketManager').socketManager;
    if (socketManager && socketManager.io) {
      socketManager.io.to(`event-${poll.event}`).emit('voteRecorded', {
        pollId: poll._id,
        questionIndex,
        optionIndex,
        userId: req.user._id
      });
    }

    if (req.user.role === 'SyndicateCoowner') {

      const existingPoints = await PointTransaction.findOne({
        user: req.user._id,
        reason: 'voting',
        relatedId: poll._id
      });

      if (!existingPoints) {
        try {
          // Import gamification hooks if not already imported
          const gamificationHooks = require('../Utils/GamificationHooks');
          await gamificationHooks.handlePollVote(poll, req.user._id);
          console.log(`Awarded voting points to user ${req.user._id} for poll ${poll._id}`);
        } catch (gamificationError) {
          console.error('Failed to award gamification points:', gamificationError);
        }
      }
    }
    return res.status(200).json({
      message: 'Vote recorded successfully',
      question: poll.questions[questionIndex]
    });
  } catch (error) {
    console.error('Error recording vote:', error);
    return res.status(500).json({ message: error.message });
  }
};
const getPollById = async (req, res) => {
  try {
    const { id } = req.params;

    const poll = await Poll.findById(id)
      .populate('createdBy', 'firstName lastName')
      .populate('responses.user', 'firstName lastName role');

    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    return res.status(200).json(poll);
  } catch (error) {
    console.error('Error fetching poll by id:', error);
    return res.status(500).json({ message: error.message });
  }
};

// Create a standalone poll
// Update the createStandalonePoll function
const createStandalonePoll = async (req, res) => {
  try {
    const { title, description, questions, questionDuration, pauseDuration, building } = req.body;

    // Validate user has permission
    if (req.user.role !== 'SyndicateAdmin') {
      return res.status(403).json({ message: 'Only SyndicateAdmin can create polls' });
    }

    if (!building) {
      return res.status(400).json({ message: 'Building ID is required' });
    }

    // Check for a duplicate title to prevent confusion
    const existingPoll = await Poll.findOne({ 
      title: title,
      building: building,
      status: { $ne: 'completed' } // Only check active or pending polls
    });

    if (existingPoll) {
      return res.status(400).json({ 
        message: 'A poll with this title already exists in this building. Please choose a different title.' 
      });
    }

    // Format questions correctly
    const formattedQuestions = questions.map((q, index) => ({
      title: q.title,
      description: q.description || '',
      options: q.options.map(opt => ({
        text: typeof opt === 'string' ? opt : opt.text,
        votes: 0
      })),
      order: index + 1
    }));

    const poll = new Poll({
      title,
      description,
      questions: formattedQuestions,
      questionDuration: questionDuration || 60,
      pauseDuration: pauseDuration || 5,
      createdBy: req.user._id,
      isStandalone: true,
      building
    });

    await poll.save();
    return res.status(201).json(poll);
  } catch (error) {
    console.error('Error creating standalone poll:', error);
    return res.status(500).json({ message: error.message });
  }
};

// Get standalone polls for a building
const getStandalonePolls = async (req, res) => {
  try {
    const { buildingId } = req.params;

    const polls = await Poll.find({ building: buildingId, isStandalone: true })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'firstName lastName');

    return res.status(200).json(polls);
  } catch (error) {
    console.error('Error fetching standalone polls:', error);
    return res.status(500).json({ message: error.message });
  }
};

// Get archived standalone polls
const getArchivedPolls = async (req, res) => {
  try {
    const { buildingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(buildingId)) {
      return res.status(400).json({ message: 'Invalid building ID format' });
    }

    // First get all events for this building
    const events = await Event.find({ building: buildingId }, '_id title');
    const eventIds = events.map(e => e._id);

    // Find all completed polls, both standalone and from events
    const completedPolls = await Poll.find({
      $or: [
        { building: buildingId, isStandalone: true, status: 'completed' },
        { event: { $in: eventIds }, status: 'completed' }
      ]
    })
      .sort({ endedAt: -1 })
      .populate('createdBy', 'firstName lastName')
      .populate('event', 'title')
      .populate('building', 'name');

    return res.status(200).json(completedPolls);
  } catch (error) {
    console.error('Error fetching archived polls:', error);
    return res.status(500).json({ message: error.message });
  }
};

// Update attachPollToEvent to better handle errors
const attachPollToEvent = async (req, res) => {
  try {
    const { pollId, eventId } = req.params;

    console.log(`Attaching poll ${pollId} to event ${eventId}`);

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(pollId) || !mongoose.Types.ObjectId.isValid(eventId)) {
      console.error('Invalid ID format:', { pollId, eventId });
      return res.status(400).json({ message: 'Invalid poll or event ID format' });
    }

    // Verify permissions
    if (req.user.role !== 'SyndicateAdmin') {
      return res.status(403).json({ message: 'Only SyndicateAdmin can attach polls to events' });
    }

    // Find the poll
    const poll = await Poll.findById(pollId);
    if (!poll) {
      console.error('Poll not found:', pollId);
      return res.status(404).json({ message: 'Poll not found' });
    }

    // Check if poll is already attached to another event
    if (poll.event && poll.event.toString() !== eventId) {
      console.error(`Poll ${pollId} is already attached to event ${poll.event}`);
      return res.status(400).json({ 
        message: 'This poll is already attached to another event. A poll can only be associated with one event at a time.' 
      });
    }

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      console.error('Event not found:', eventId);
      return res.status(404).json({ message: 'Event not found' });
    }

    // Attach poll to event
    poll.event = eventId;
    poll.isStandalone = false;

    // Store the building ID from the event if not already set
    if (!poll.building) {
      poll.building = event.building;
    }

    await poll.save();

    // Also add the poll to the event's polls array
    if (!event.polls) {
      event.polls = [];
    }

    // Check if poll is already in event.polls
    if (!event.polls.some(id => id.toString() === pollId)) {
      event.polls.push(pollId);
      await event.save();
    }

    console.log('Poll successfully attached to event');

    return res.status(200).json({
      message: 'Poll attached to event successfully',
      poll
    });
  } catch (error) {
    console.error('Error attaching poll to event:', error);
    return res.status(500).json({ message: error.message });
  }
};
// Add this function to detach a poll from an event
const detachPollFromEvent = async (req, res) => {
  try {
    const { pollId } = req.params;

    console.log(`Detaching poll ${pollId} from its event`);

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(pollId)) {
      return res.status(400).json({ message: 'Invalid poll ID format' });
    }

    // Verify permissions
    if (req.user.role !== 'SyndicateAdmin') {
      return res.status(403).json({ message: 'Only SyndicateAdmin can detach polls from events' });
    }

    // Find the poll
    const poll = await Poll.findById(pollId);
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    // Check if poll is attached to an event
    if (!poll.event) {
      return res.status(400).json({ message: 'This poll is not attached to any event' });
    }

    // Get the eventId before detaching
    const eventId = poll.event;

    // Update the event to remove this poll from its polls array
    await Event.findByIdAndUpdate(eventId, {
      $pull: { polls: pollId }
    });

    // Update the poll to be standalone again
    poll.event = undefined;
    poll.isStandalone = true;
    await poll.save();

    return res.status(200).json({
      message: 'Poll successfully detached from event',
      poll
    });
  } catch (error) {
    console.error('Error detaching poll from event:', error);
    return res.status(500).json({ message: error.message });
  }
};


module.exports = {
  createPoll,
  detachPollFromEvent,
  getEventPolls,
  updatePoll,
  deletePoll,
  votePoll,
  getPollResults,
  startPoll,
  stopPoll,
  startPollSequence,
  getPollById,
  stopPollSequence,
  createStandalonePoll,
  getStandalonePolls,
  getArchivedPolls,
  attachPollToEvent
};