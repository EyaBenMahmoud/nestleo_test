import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Button, Progress, ListGroup, ListGroupItem, Badge } from 'reactstrap';
import { useSelector, useDispatch } from 'react-redux';
import { incrementLiveVotesUpdate } from '../../slices/poll/slice';
import { toast } from 'react-toastify';
import api from '../../services/api';
import './poll.css';

const PollWidget = ({ eventId, inModal = false, initialPoll = null, onVoteSubmitted, showResults = false }) => {
  const dispatch = useDispatch();
  const user = useSelector(state => state.Loginn.user);
  const [activePoll, setActivePoll] = useState(initialPoll);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [voted, setVoted] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({});
  const [showResultsState, setShowResultsState] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allQuestionsCompleted, setAllQuestionsCompleted] = useState(false);

  const [remainingTime, setRemainingTime] = useState(0);


  const [totalParticipants, setTotalParticipants] = useState(0);
  const [votedParticipants, setVotedParticipants] = useState(0);
  const [forceShowResults, setForceShowResults] = useState(false);
  const [pollStatus, setPollStatus] = useState('voting');
  const [pollEnded, setPollEnded] = useState(false);


  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const socketRef = useRef(null);
  const toastsRef = useRef({});
  const fetchParticipants = async () => {
    try {
      const response = await api.get(`/api/polls/${eventId}/active-participants`);
      setTotalParticipants(response.data.length || 1); // Default to at least 1 participant (self)
    } catch (error) {
      console.error('Error fetching participants:', error);
      setTotalParticipants(1); // Default to at least 1 participant (self)
    }
  };
  // Initialize with active poll
  useEffect(() => {
    if (initialPoll) {
      setActivePoll(initialPoll);

      // Check if user has already voted in any questions
      if (initialPoll.responses && initialPoll.responses.length > 0) {
        const userVotedMap = {};
        const userResultsMap = {};

        initialPoll.responses.forEach(response => {
          const respUserId = typeof response.user === 'object' ? response.user._id : response.user;

          if (respUserId === user._id) {
            // User has voted for this question
            userVotedMap[response.questionId] = true;
            userResultsMap[response.questionId] = true;
          }
        });

        setVoted(userVotedMap);

        // Show results automatically if user has voted or showResults is true
        if (showResults) {
          const resultsObj = {};
          initialPoll.questions.forEach(q => {
            resultsObj[q._id] = true;
          });
          setShowResultsState(resultsObj);
        } else {
          setShowResultsState(userResultsMap);
        }
      }
    }
  }, [initialPoll, user._id, showResults]);

    // Submit vote function
  const submitVote = async () => {
    if (isSubmitting) return;
    
    const currentQuestion = activePoll.questions[currentQuestionIndex];
    const selectedOption = selectedOptions[currentQuestion._id];
    
    if (!selectedOption) {
      toast.error('Please select an option to vote');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const payload = {
        pollId: activePoll._id,
        questionId: currentQuestion._id,
        selectedOption: selectedOption
      };
      
      await api.post('/api/polls/vote', payload);
      
      // Mark this question as voted
      setVoted(prev => ({
        ...prev,
        [currentQuestion._id]: true
      }));
      
      // Show results for this question
      setShowResultsState(prev => ({
        ...prev,
        [currentQuestion._id]: true
      }));
      
      // Update live votes in Redux
      dispatch(incrementLiveVotesUpdate());
      
      // If all questions completed or last question
      if (currentQuestionIndex >= activePoll.questions.length - 1) {
        setAllQuestionsCompleted(true);
        
        // Notify parent component that vote was submitted
        if (onVoteSubmitted && typeof onVoteSubmitted === 'function') {
          onVoteSubmitted();
        }
      } else {
        // Move to next question
        setTimeout(() => {
          setCurrentQuestionIndex(prev => prev + 1);
        }, 1000);
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
      toast.error('Failed to submit vote. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  useEffect(() => {
    if (eventId) {
      fetchParticipants();
    }
  }, [eventId]);
  // Set up socket connection and event handlers
  useEffect(() => {
    if (!eventId) return;

    // Set up audio
    if (!audioRef.current) {
      audioRef.current = new Audio('/poll-notification.mp3');
    }

    // Create socket only once
    if (!socketRef.current) {
      socketRef.current = initializeSocket();

      // Socket event listeners
      socketRef.current.on('pollStarted', (data) => {
        console.log('Poll started:', data);
        handlePollStarted(data);
      });

      socketRef.current.on('questionChanged', (data) => {
        console.log('Question changed:', data);
        handleQuestionChanged(data);
      });

      socketRef.current.on('voteRecorded', (data) => {
        console.log('Vote recorded:', data);
        handleVoteRecorded(data);
      });

      socketRef.current.on('pollEnded', (data) => {
        console.log('Poll ended:', data);
        handlePollEnded(data);
      });
      socketRef.current.on('voteCompletionUpdated', handleVoteCompletionUpdated);
      // Add these event listeners to your socket setup
      socketRef.current.on('participantJoined', (data) => {
        // Re-fetch participants count when someone joins
        fetchParticipants();
      });

      socketRef.current.on('participantLeft', (data) => {
        // Re-fetch participants count when someone leaves
        fetchParticipants();
      });

    }

    // Join the event room (only once per event)
    const hasJoined = socketRef.current._hasJoinedEvent === eventId;
    if (!hasJoined) {
      console.log(`Joining event room: ${eventId}`);
      socketRef.current.emit('joinEvent', { eventId });
      socketRef.current._hasJoinedEvent = eventId;

      // Check for active polls
      if (socketRef.current.connected) {
        socketRef.current.emit('checkActivePoll', { eventId });
      } else {
        socketRef.current.once('connect', () => {
          socketRef.current.emit('checkActivePoll', { eventId });
        });
      }
    }

    // Document event listeners (for compatibility with existing code)
    const onPollStarted = (e) => handlePollStarted(e.detail || e);
    const onQuestionChanged = (e) => handleQuestionChanged(e.detail || e);
    const onVoteRecorded = (e) => handleVoteRecorded(e.detail || e);
    const onPollEnded = (e) => handlePollEnded(e.detail || e);
    const onVoteCompletionUpdated = (e) => handleVoteCompletionUpdated(e.detail || e);

    document.addEventListener('pollStarted', onPollStarted);
    document.addEventListener('questionChanged', onQuestionChanged);
    document.addEventListener('voteRecorded', onVoteRecorded);
    document.addEventListener('pollEnded', onPollEnded);
    document.addEventListener('voteCompletionUpdated', onVoteCompletionUpdated);


    return () => {
      // Cleanup listeners
      document.removeEventListener('pollStarted', onPollStarted);
      document.removeEventListener('questionChanged', onQuestionChanged);
      document.removeEventListener('voteRecorded', onVoteRecorded);
      document.removeEventListener('pollEnded', onPollEnded);
      document.removeEventListener('voteCompletionUpdated', onVoteCompletionUpdated);


      // Leave the event room
      if (socketRef.current && socketRef.current._hasJoinedEvent === eventId) {
        socketRef.current.emit('leavePoll', { eventId });
        socketRef.current._hasJoinedEvent = null;
      }

      // Clean up timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [eventId]);

  // Handle initialPoll prop changes
  useEffect(() => {
    if (initialPoll && (!activePoll || initialPoll._id !== activePoll._id)) {
      handlePollStarted(initialPoll);
    }
  }, [initialPoll]);



  // Add this effect to handle votedParticipants count updates
  useEffect(() => {
    if (activePoll && activePoll.responses) {
      // For current question, count unique users who voted
      const uniqueVoters = new Set();
      activePoll.responses.forEach(response => {
        if (response.questionIndex === currentQuestionIndex) {
          uniqueVoters.add(typeof response.user === 'object' ? response.user._id : response.user);
        }
      });

      setVotedParticipants(uniqueVoters.size);
    }
  }, [activePoll?.responses, currentQuestionIndex]);
  // Add this event listener to the socket setup in useEffect

  // Add a handler for vote completion events
  const handleVoteCompletionUpdated = (data) => {
    if (data.pollId === activePoll?._id && data.questionIndex === currentQuestionIndex) {
      setVotedParticipants(data.votedCount);

      // If all participants have voted or time expired, force show results
      if (data.votedCount >= data.totalParticipants || data.timeExpired) {
        setForceShowResults(true);
        setPollStatus(data.timeExpired ? 'expired' : 'completed');
      }
    }
  };
  // Event Handlers
  const handlePollStarted = (poll) => {
    // Reset all state variables for new poll
    setActivePoll(poll);
    setCurrentQuestionIndex(0);
    setRemainingTime(poll.questionDuration || poll.duration || 60);
    setVoted({});
    setShowResults({});
    setSelectedOptions({});
    setAllQuestionsCompleted(false);
    setForceShowResults(false);
    setPollStatus('voting');
    setPollEnded(false);

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Start new timer
    startTimer(poll.questionDuration || poll.duration || 60);

    // Avoid duplicate toasts
    if (!toastsRef.current[poll._id]) {
      toastsRef.current[poll._id] = true;

      // Play notification sound for non-modal views
      if (!inModal && audioRef.current) {
        audioRef.current.play().catch(err => console.error('Error playing audio:', err));
      }

      // Show toast for non-modal views
      if (!inModal) {
        toast.info(`New poll: ${poll.title}`, {
          position: "top-right",
          autoClose: 5000
        });
      }
    }
  };

  const handleQuestionChanged = (data) => {
    if (!activePoll) return;

    // Update state for new question
    setCurrentQuestionIndex(data.questionIndex);
    setRemainingTime(activePoll.questionDuration || activePoll.duration || 60);

    // Start timer for new question
    startTimer(activePoll.questionDuration || activePoll.duration || 60);
  };

  const handleVoteRecorded = (data) => {
    if (!activePoll || activePoll._id !== data.pollId) return;

    // Update local state if this is our vote
    if (data.userId === user._id) {
      setVoted(prev => ({
        ...prev,
        [data.questionIndex]: true
      }));

      setShowResults(prev => ({
        ...prev,
        [data.questionIndex]: true
      }));

      setIsSubmitting(false);
    }

    // Update vote counts in the poll data
    setActivePoll(prev => {
      if (!prev || prev._id !== data.pollId) return prev;

      const updatedPoll = { ...prev };
      const useOldFormat = !updatedPoll.questions;

      if (useOldFormat) {
        if (updatedPoll.options && updatedPoll.options[data.optionIndex]) {
          updatedPoll.options[data.optionIndex].votes += 1;
        }
      } else {
        if (updatedPoll.questions &&
          updatedPoll.questions[data.questionIndex] &&
          updatedPoll.questions[data.questionIndex].options &&
          updatedPoll.questions[data.questionIndex].options[data.optionIndex]) {
          updatedPoll.questions[data.questionIndex].options[data.optionIndex].votes += 1;
        }
      }

      // Add to responses array if not already there
      if (!updatedPoll.responses) {
        updatedPoll.responses = [];
      }

      // Add new response
      updatedPoll.responses.push({
        user: data.userId,
        questionIndex: data.questionIndex,
        optionIndex: data.optionIndex
      });

      return updatedPoll;
    });
  };

  const handlePollEnded = (poll) => {
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Force show all results
    setPollEnded(true);
    setForceShowResults(true);
    setPollStatus('expired');


    if (poll.questions) {
      const results = {};
      for (let i = 0; i < poll.questions.length; i++) {
        results[i] = true;
      }
      setShowResults(results);
    } else {
      setShowResults({ 0: true });
    }

    if (!inModal) {
      toast.info(`Poll ended: ${poll.title}`, {
        position: "top-right",
        autoClose: 5000
      });
    }
  };

  // Timer function
  const startTimer = (duration) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setRemainingTime(duration);

    timerRef.current = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handle option selection
  const handleOptionSelect = (questionIndex, optionIndex) => {
    setSelectedOptions(prev => ({
      ...prev,
      [questionIndex]: optionIndex
    }));
  };

  const handleVoteSubmit = async (questionIndex) => {
    if (!activePoll) return;

    const optionIndex = selectedOptions[questionIndex];
    if (optionIndex === undefined) {
      toast.warning('Please select an option', {
        position: "top-right",
        autoClose: 3000
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Send vote via API
      const response = await api.post(`/api/polls/${activePoll._id}/vote`, {
        questionIndex,
        optionIndex
      });

      console.log("Vote recorded successfully:", response.data);

      // Update voted state to mark this question as voted
      setVoted(prev => ({
        ...prev, [questionIndex]: true
      }));

      // Reset submission state
      setIsSubmitting(false);

      // Socket update for real-time updates to other users
      if (socketRef.current) {
        socketRef.current.emit('votePoll', {
          pollId: activePoll._id,
          questionIndex,
          optionIndex
        });
      }

      // Show success toast
      toast.success('Your vote has been recorded', {
        position: "top-right",
        autoClose: 2000
      });

      // Get total question count
      const useOldFormat = !activePoll.questions;
      const questionCount = useOldFormat ? 1 : activePoll.questions.length;

      // Check if the user has voted on all questions
      const completedQuestionCount = Object.keys(voted).length;
      const isComplete = completedQuestionCount === questionCount;
      setAllQuestionsCompleted(isComplete);


      // Auto-advance to next question if this isn't the last one
      if (questionIndex < questionCount - 1) {
        // Go to next question after a brief pause
        setTimeout(() => {
          setCurrentQuestionIndex(questionIndex + 1);
        }, 500);
      } else {
        // If this is the last question, now we show all results
        const allResults = {};
        for (let i = 0; i < questionCount; i++) {
          allResults[i] = true;
        }
        setShowResults(allResults);
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
      setIsSubmitting(false);

      toast.error(`Failed to submit vote: ${error.response?.data?.message || error.message}`, {
        position: "top-right",
        autoClose: 4000
      });
    }
  };

  // Format time for display
  const formatTimeRemaining = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Calculate vote percentage
  const calculatePercentage = (votes, total) => {
    if (total === 0) return 0;
    return Math.round((votes / total) * 100);
  };

  // Empty state
  if (!activePoll) {
    return (
      <div className="poll-empty-state">
        <i className="ri-bar-chart-grouped-line"></i>
        <Alert color="info" className="d-inline-block border-0">
          No active poll at the moment
        </Alert>
        <p className="text-muted mt-3">
          {inModal ?
            "The meeting host will start a poll soon." :
            "When a poll is started, it will appear here."}
        </p>
      </div>
    );
  }

  // Prepare current question data
  const useOldFormat = !activePoll.questions;
  const questionCount = useOldFormat ? 1 : activePoll.questions.length;

  let currentQuestion;
  try {
    if (useOldFormat) {
      currentQuestion = {
        title: activePoll.title || 'Untitled Poll',
        description: activePoll.description || '',
        options: Array.isArray(activePoll.options) ? activePoll.options : []
      };
    } else {
      const safeIndex = Math.min(currentQuestionIndex, questionCount - 1);
      currentQuestion = activePoll.questions[safeIndex];

      if (!currentQuestion) {
        currentQuestion = { title: 'Question not found', description: '', options: [] };
      }
    }
  } catch (err) {
    console.error('Error getting current question:', err);
    currentQuestion = { title: 'Error loading question', description: '', options: [] };
  }

  // Calculate vote totals
  const totalVotes = Array.isArray(currentQuestion.options) ?
    currentQuestion.options.reduce((sum, option) => sum + (option.votes || 0), 0) : 0;

  // Check if user has voted on current question
  const hasVotedCurrent = voted[currentQuestionIndex] ||
    (activePoll.responses && Array.isArray(activePoll.responses) && activePoll.responses.some(r => {
      if (!r || !r.user) return false;

      const responseUserId = typeof r.user === 'object' ? r.user._id : r.user;
      return responseUserId === user._id &&
        (useOldFormat || r.questionIndex === currentQuestionIndex);
    }));

  const showResultsCurrent = showResults[currentQuestionIndex] || hasVotedCurrent;
  // Update the useEffect that calculates participation rate:

  useEffect(() => {
    if (activePoll) {
      // Get total participants in the event
      const fetchParticipants = async () => {
        try {
          // Get event details to find total attendees
          const response = await api.get(`/api/events/${activePoll.event}`);
          if (response.data && response.data.attendees) {
            setTotalParticipants(response.data.attendees.length);
          }
        } catch (error) {
          console.error('Error fetching event participants:', error);
        }
      };

      // Get votes count
      const fetchVoteCount = async () => {
        try {
          const response = await api.get(`/api/polls/${activePoll._id}/vote-count`);
          if (response.data && response.data.count) {
            setVotedParticipants(response.data.count);
          }
        } catch (error) {
          console.error('Error fetching vote count:', error);
        }
      };

      fetchParticipants();
      fetchVoteCount();
    }
  }, [activePoll]);

  // Add this cleanup effect
  useEffect(() => {
    return () => {
      // Clean up timer when component unmounts
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Reset all state variables
      setActivePoll(null);
      setCurrentQuestionIndex(0);
      setRemainingTime(0);
      setVoted({});
      setShowResults({});
      setSelectedOptions({});
      setAllQuestionsCompleted(false);
      setForceShowResults(false);
      setPollStatus('voting');
      setPollEnded(false);
    };
  }, []);


  return (
    <Card className={`poll-widget mb-3 ${inModal ? 'poll-modal-card' : ''}`}>
      <CardHeader className="d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0 d-flex align-items-center" style={{ color: 'white' }}>
            {activePoll.title}
            {questionCount > 1 && (
              <Badge color="#4e73df" pill className="ms-2 px-3 py-2" style={{ fontSize: '0.75rem' }}>
                {currentQuestionIndex + 1}/{questionCount}
              </Badge>
            )}
          </h5>
          {remainingTime > 0 && (
            <small className=" mt-1" style={{ color: 'white' }}>
              Time remaining: <span className="time-remaining">{formatTimeRemaining(remainingTime)}</span>
            </small>
          )}
        </div>
        {remainingTime > 0 && (
          <Progress
            value={(remainingTime / (useOldFormat ? activePoll.duration : activePoll.questionDuration)) * 100}
            color="info"
            className="poll-timer"
          />
        )}
      </CardHeader>
      <CardBody>
        <h5 className="mb-3">{currentQuestion.title}</h5>
        {currentQuestion.description && (
          <p className="text-muted mb-4">{currentQuestion.description}</p>
        )}

        {/* Voting UI */}
        {!hasVotedCurrent && !showResultsCurrent && (
          <div className={`voting-options ${isSubmitting ? 'voting-disabled' : ''}`}>
            <ListGroup className="mb-4">
              {currentQuestion.options.map((option, index) => (
                <ListGroupItem
                  key={index}
                  className={`voting-option ${selectedOptions[currentQuestionIndex] === index ? 'selected' : ''}`}
                  onClick={() => !isSubmitting && handleOptionSelect(currentQuestionIndex, index)}
                  action
                >
                  <div className="d-flex align-items-center">
                    <div className={`option-selector ${selectedOptions[currentQuestionIndex] === index ? 'selected' : ''}`}>
                      {selectedOptions[currentQuestionIndex] === index && (
                        <i className="ri-check-line"></i>
                      )}
                    </div>
                    <span>{option.text}</span>
                  </div>
                </ListGroupItem>
              ))}
            </ListGroup>

            <div className="text-center">
              <Button
                color="light" // keep a valid Bootstrap color
                size="lg"
                className="px-4 py-2 vote-submit-btn"
                onClick={() => handleVoteSubmit(currentQuestionIndex)}
                disabled={isSubmitting || selectedOptions[currentQuestionIndex] === undefined}
                style={{
                  backgroundColor: '#4e73df',
                  color: 'white',
                  borderColor: '#4e73df',
                }}
              >

                {isSubmitting ? (
                  <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Submitting...</>
                ) : (
                  'Submit Vote'
                )}
              </Button>
            </div>
          </div>
        )}
        {/* Final Results Button - only show when poll has ended and results aren't showing yet */}
        {pollEnded && !forceShowResults && (
          <div className="text-center py-4 final-results-container">
            <div className="mb-3">
              <i className="ri-check-double-line" style={{ fontSize: '3rem', color: '#4caf50' }}></i>
            </div>
            <h5 className="mb-3">Poll Completed</h5>
            <p className="text-muted mb-4">
              All participants have completed this poll. You can now view the final results.
            </p>
            <Button
              color="success"
              size="lg"
              className="px-4 view-results-btn"
              onClick={() => {
                setForceShowResults(true);
                // For multi-question polls, show results for all questions
                if (activePoll.questions) {
                  const allResults = {};
                  for (let i = 0; i < activePoll.questions.length; i++) {
                    allResults[i] = true;
                  }
                  setShowResults(allResults);
                } else {
                  setShowResults({ 0: true });
                }
              }}
            >
              <i className="ri-bar-chart-fill me-2"></i>
              View Final Results
            </Button>
          </div>
        )}
        {/* Results Display */}
        {(showResultsCurrent || forceShowResults) && (pollEnded || allQuestionsCompleted) && (
          <div className="poll-results">
            <h6 className="mb-3 d-flex justify-content-between align-items-center">
              <div>
                Results
                {totalVotes > 0 && (
                  <Badge color="#4e73df" pill className="ms-2 px-3">
                    {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <div>
                <small className="text-muted">
                  {votedParticipants}/{totalParticipants} voted
                  {pollStatus === 'completed' && ' • All votes in'}
                  {pollStatus === 'expired' && ' • Time expired'}
                </small>
              </div>
            </h6>
            <ListGroup>
              {currentQuestion.options.map((option, index) => {
                const isUserVote = hasVotedCurrent &&
                  activePoll.responses && activePoll.responses.some(r => {
                    if (!r || !r.user) return false;

                    const responseUserId = typeof r.user === 'object' ? r.user._id : r.user;
                    return responseUserId === user._id &&
                      (useOldFormat || r.questionIndex === currentQuestionIndex) &&
                      r.optionIndex === index;
                  });

                const percentage = calculatePercentage(option.votes, totalVotes);

                return (
                  <ListGroupItem
                    key={index}
                    className={`d-flex justify-content-between align-items-center mb-2 ${isUserVote ? 'selected' : ''} option-${index % 6}`}
                  >
                    <div className="d-flex align-items-center flex-grow-1">
                      <div className="vote-bar-container">
                        <div
                          className="vote-bar"
                          style={{
                            height: `${percentage}%`
                          }}
                        />
                      </div>
                      <div className="ms-2 d-flex align-items-center">
                        <span className="me-2">{option.text}</span>
                        {isUserVote && (
                          <Badge color="primary" pill className="ms-1 px-2 py-1">Your vote</Badge>
                        )}
                      </div>
                    </div>
                    <div className="d-flex align-items-center">
                      <span className="me-2 text-muted">{option.votes || 0}</span>
                      <Badge
                        color={percentage > 50 ? "success" : "info"}
                        pill
                        className="badge-percentage"
                      >
                        {percentage}%
                      </Badge>
                    </div>
                  </ListGroupItem>
                );
              })}
            </ListGroup>
          </div>
        )}
        {/* Only show view results button when needed */}
        {hasVotedCurrent && !showResultsCurrent && !forceShowResults && (
          <div className="text-center mt-3">
            <p className="text-muted mb-2">
              Waiting for other participants to vote ({votedParticipants}/{totalParticipants} voted)
            </p>
            <Button
              color="outline-primary"
              onClick={() => setShowResults(prev => ({ ...prev, [currentQuestionIndex]: true }))}
            >
              View Current Results
            </Button>
          </div>
        )}
        {/* Navigation for multiple questions */}
        {questionCount > 1 && (
          <div className="question-nav mt-4 text-center">
            <div className="d-flex justify-content-center">
              {Array.from({ length: questionCount }).map((_, index) => {
                const isActive = index === currentQuestionIndex;
                return (
                  <Button
                    key={index}
                    color="light" // Keep default color
                    outline={!isActive}
                    size="sm"
                    className="mx-1 rounded-circle"
                    style={{
                      width: '36px',
                      height: '36px',
                      padding: '0',
                      fontSize: '0.9rem',
                      backgroundColor: isActive ? '#4e73df' : 'transparent',
                      color: isActive ? 'white' : 'black',
                      borderColor: isActive ? '#4e73df' : undefined,
                    }}
                    onClick={() => setCurrentQuestionIndex(index)}
                  >
                    {index + 1}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

      </CardBody>
    </Card>
  );
};

export default PollWidget;