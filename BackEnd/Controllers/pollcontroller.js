const { PointTransaction } = require('../Models/gamification');
const Poll = require('../Models/poll');
const Event = require('../Models/Event');
const mongoose = require('mongoose');

// Get all polls for an event
const getEventPolls = async (req, res) => {
  try {
    const { eventId } = req.params;

    const polls = await Poll.find({ event: eventId })
      .sort({ order: 1 })
      .populate('createdBy', 'firstName lastName');

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
    const { title, description, options, duration, order } = req.body;

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

    // Format options
    let updatedOptions = poll.options;
    if (options) {
      updatedOptions = options.map(option => {
        if (typeof option === 'string') {
          return { text: option, votes: 0 };
        }
        return option;
      });
    }

    poll.title = title || poll.title;
    poll.description = description || poll.description;
    poll.options = updatedOptions;
    poll.duration = duration || poll.duration;
    poll.order = order !== undefined ? order : poll.order;

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

module.exports = {
  createPoll,
  getEventPolls,
  updatePoll,
  deletePoll,
  votePoll,
  getPollResults,
  startPoll,
  stopPoll,
  startPollSequence,
  getPollById,
  stopPollSequence
};