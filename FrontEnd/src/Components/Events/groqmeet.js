import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import {
  Container, Row, Col, Button, Card, CardHeader, CardBody,
  Badge, Progress
} from 'reactstrap';
import PollCreator from './PollManagement';
import { initializeSocket } from '../../services/socketManager';
import api from '../../services/api';
import { toast } from 'react-toastify';
import './poll.css';
import PollModal from './pollModal';
import PollStatsChart from './PollStats';
import PollResultsModal from './PollResults';
import {
  setActivePoll,
  setShowPollModal,
  setShowLiveResults,
  incrementLiveVotesUpdate,
  resetPollState,
  updatePollKey
} from '../../slices/poll/slice';
import { 
  hasVideoConferenceAccess, 
  getMaxVideoConferenceDuration, 
  getRemainingVideoConferenceTime,
  canContinueVideoConference
} from '../Subscriptions/SubcriptionValidator';

const Meeting = () => {
  const { t } = useTranslation();
  const { eventId } = useParams();
  const navigate = useNavigate();
  const event = useSelector(state => state.events.events.find(e => e._id === eventId));
  const currentMeeting = useSelector(state => state.events?.currentMeeting);
  const user = useSelector(state => state.Loginn.user);
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);
  const pollNotificationPlayed = useRef(false);
  const socketRef = useRef(null);
  const toastShownRef = useRef({});  // Track which toasts have been shown
  const pollIdRef = useRef(null);
  const dispatch = useDispatch();
  const [currentPoll, setCurrentPoll] = useState(null);
  // State variables
  const [showPollManagement, setShowPollManagement] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCompletedPollsModal, setShowCompletedPollsModal] = useState(false);
  const [selectedCompletedPoll, setSelectedCompletedPoll] = useState(null);
  
  // Video conference time tracking
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [meetingStartTime, setMeetingStartTime] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null); // in minutes
  const timerIntervalRef = useRef(null);
  const warningShownRef = useRef(false);
  const endNotificationShownRef = useRef(false);
  const adminUser = useSelector(state => {
    const eventCreator = event?.creator;
    if (!eventCreator) return null;
    
    // If the creator object is already populated
    if (typeof eventCreator === 'object' && eventCreator._id) {
      return eventCreator;
    }
    
    // Otherwise try to find the admin in attendees
    return event?.attendees?.find(a => 
      (typeof a.user === 'object' && a.user.role === 'SyndicateAdmin') || 
      (a.role === 'SyndicateAdmin')
    )?.user;
  });

  const [lastPollUpdate, setLastPollUpdate] = useState(null);  // Prevent duplicate updates

  const roomName = event?.meeting?.roomName;
  const displayName = `${user.firstName} ${user.lastName}`;
  const isModerator = user.role === 'SyndicateAdmin';
  const token = currentMeeting?.token;
  const {
    activePoll,
    showPollModal,
    showLiveResults,
    polls,
    completedPolls,
    liveVotesUpdate,
    pollKey
  } = useSelector(state => state.polls);

  // Initialize Jitsi meeting
  useEffect(() => {
    if (!roomName || !token) return;
    
    const domain = 'nestleo.com:8443';
    const options = {
      roomName: roomName,
      jwt: token,
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      userInfo: {
        displayName: displayName,
      },
      configOverwrite: {
        // Enforce roles and permissions via JWT token
        enableUserRolesBasedOnToken: true,
        enableFeaturesBasedOnToken: true,

        // General settings
        startWithAudioMuted: true,
        startWithVideoMuted: true,
        prejoinPageEnabled: false,
        enableWelcomePage: false,
        requireDisplayName: true,
        enableEmailInStats: false,

        // Moderator-specific settings
        disableModeratorIndicator: !isModerator,
        enableLobby: !isModerator, // Lobby for non-moderators only
        disableRemoteMute: !isModerator,
        disableKick: !isModerator,
        disableRemoteVideoMute: !isModerator,
        disableGrantModerator: true, // Prevent promoting others
        disablePolls: true, // Disable Jitsi's native polls, we'll use our own
        disableRecording: !isModerator,
      },
      interfaceConfigOverwrite: {
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
        SHOW_CHROME_EXTENSION_BANNER: false,
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'desktop', 'fullscreen',
          'fodeviceselection', 'hangup', 'chat', 'settings',
          'raisehand', 'videoquality', 'filmstrip', 'tileview',
          'download', 'help',
          ...(isModerator
            ? ['recording', 'livestreaming', 'mute-everyone', 'security', 'kick', 'etherpad', 'sharedvideo']
            : [])
        ],
      },
    };

    const script = document.createElement('script');
    script.src = 'https://nestleo.com:8443/external_api.js';
    script.async = true;
    script.onload = () => {
      console.log('Jitsi API loaded, initializing meeting...');
      try {
        const api = new window.JitsiMeetExternalAPI(domain, options);

        // Event listeners for role enforcement and debugging
        api.addEventListener('videoConferenceJoined', () => {
          console.log('Meeting joined. Moderator status:', isModerator);
          if (isModerator) {
            api.executeCommand('toggleLobby', false);
            console.log('Moderator joined and disabled lobby');
          } else {
            console.log('Participant joined without moderator privileges');
          }
        });

        api.addEventListener('participantRoleChanged', (event) => {
          console.log('Participant role changed:', event);
          if (event.role === 'moderator' && !isModerator) {
            console.warn('Non-moderator incorrectly assigned moderator role!');
          }
        });

        // Add navigation on meeting end
        api.addEventListener('readyToClose', () => {
          console.log('Meeting closed');
          navigate('/calendar');
        });

        // Add error handler
        api.addEventListener('errorOccurred', (error) => {
          console.error('Jitsi error:', error);
        });

        jitsiContainerRef.current.api = api;
      } catch (error) {
        console.error('Failed to initialize Jitsi API:', error);
      }
    };

    script.onerror = () => {
      console.error('Failed to load Jitsi API');
    };

    document.body.appendChild(script);

    return () => {
      if (script && document.body.contains(script)) {
        document.body.removeChild(script);
      }
      if (jitsiContainerRef.current && jitsiContainerRef.current.api) {
        jitsiContainerRef.current.api.dispose();
      }
    };
  }, [roomName, displayName, isModerator, token, navigate]);


  const fetchCompletedPolls = async () => {
    try {
      console.log('Fetching completed polls...');
      const response = await api.get(`/api/polls/events/${eventId}/polls`);

      // Filter for completed/ended polls
      const completed = response.data.filter(p =>
        p.status === 'completed' || p.status === 'ended' || p.isEnded === true);

      console.log('Found completed polls:', completed);

      // Update Redux with completed polls
      dispatch({
        type: 'polls/setCompletedPolls',
        payload: completed
      });

      // If modal is open, update selected poll too
      if (showCompletedPollsModal && selectedCompletedPoll) {
        const updatedSelectedPoll = completed.find(p => p._id === selectedCompletedPoll._id);
        if (updatedSelectedPoll) {
          setSelectedCompletedPoll(updatedSelectedPoll);
        }
      }

      return completed;
    } catch (error) {
      console.error('Error fetching completed polls:', error);
      return [];
    }
  };
  // Add this useEffect at the end of your existing useEffects
  useEffect(() => {
    // This will run when component unmounts (user leaves meeting)
    return () => {
      // Reset all poll-related state when leaving the meeting
      dispatch(resetPollState());

      // Clear active poll and results
      dispatch(setActivePoll(null));
      dispatch(setShowLiveResults(false));

      // Clear local state
      setLastPollUpdate(null);
      pollIdRef.current = null;

      console.log('Meeting cleanup: poll state reset');
    };
  }, [dispatch]);
  
  // Timer and subscription limit effect
  useEffect(() => {
    // Only apply video conference limits to SyndicateAdmin users
    // Co-owners have unrestricted access
    if (user.role !== 'SyndicateAdmin') {
      console.log('Co-owner detected, skipping video conference time limits');
      return;
    }

    // Initialize meeting start time if not set
    if (!meetingStartTime) {
      setMeetingStartTime(new Date());
    }
    
    // Get the admin user's subscription limit (only for SyndicateAdmin)
    const relevantUser = adminUser || user;
    const maxDuration = getMaxVideoConferenceDuration(relevantUser);
    const initialRemaining = getRemainingVideoConferenceTime(relevantUser);
    
    setRemainingTime(initialRemaining === Infinity ? null : initialRemaining);
    
    // Start the timer to track elapsed time (only for SyndicateAdmin)
    timerIntervalRef.current = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now - meetingStartTime) / 1000); // in seconds
      setElapsedTime(elapsed);
      
      // Calculate remaining time (if not unlimited)
      if (initialRemaining !== Infinity && initialRemaining !== -1) {
        const elapsedMinutes = Math.floor(elapsed / 60);
        const remaining = Math.max(0, initialRemaining - elapsedMinutes);
        setRemainingTime(remaining);
        
        // Show warning at 5 minutes remaining (only once) - only for admin
        if (remaining <= 5 && !warningShownRef.current) {
          warningShownRef.current = true;
          toast.warning(t('meeting.videoTimeWarning', { minutes: remaining }), {
            position: "top-center",
            autoClose: 7000
          });
        }
        
        // End meeting when time is up (only show notification once to admin)
        if (remaining <= 0 && !endNotificationShownRef.current) {
          endNotificationShownRef.current = true;
          
          toast.error(t('meeting.videoTimeExceeded'), {
            position: "top-center",
            autoClose: false
          });
          
          // End the meeting for everyone
          forceEndMeeting();
        }
      }
    }, 1000);
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [meetingStartTime, adminUser, user, navigate, t]);
  
  const fetchActivePollData = async () => {
    if (!activePoll) return;

    // Throttle requests - if we just made a request, skip this one
    const now = Date.now();
    if (lastPollUpdate && now - lastPollUpdate < 1000) {
      return;
    }

    try {
      setLastPollUpdate(now); // Mark that we're making a request
      const response = await api.get(`/api/polls/${activePoll._id}/onepoll`);
      if (response.data) {
        // Only update if data actually changed
        if (JSON.stringify(response.data) !== JSON.stringify(activePoll)) {
          console.log('Poll data changed, updating');
          dispatch(setActivePoll(response.data));
          dispatch(incrementLiveVotesUpdate());
        }
      }
    } catch (error) {
      console.error('Error fetching active poll data:', error);
    }
  };
  
  // Fetch polls for admin
  const fetchPolls = async () => {
    if (!isModerator) return;

    try {
      const response = await api.get(`/api/polls/events/${eventId}/polls`);
      console.log('Fetched polls:', response.data);
      // In a real app, you'd dispatch an action to update Redux
    } catch (error) {
      console.error('Error fetching polls:', error);
      toast.error(t('meeting.failedToLoadPolls'));
    }
  };

  // Use a ref to track socket connection state
  const socketConnectedRef = useRef(false);

  // Update the useEffect for live results polling
  useEffect(() => {
    let pollInterval;

    if (showLiveResults && activePoll && user.role === 'SyndicateAdmin') {
      const lastUpdateTime = lastPollUpdate || 0;
      const now = Date.now();
      if (now - lastUpdateTime > 1000) {
        console.log('Setting up poll interval');
        pollInterval = setInterval(fetchActivePollData, 2500);

        // Fetch immediately upon showLiveResults becoming true
        fetchActivePollData();
      }
    }

    return () => {
      if (pollInterval) {
        console.log('Clearing poll interval');
        clearInterval(pollInterval);
      }
    };
  }, [showLiveResults, activePoll?._id, user.role]);

  // Fetch completed polls on mount
  useEffect(() => {
    if (eventId) {
      fetchCompletedPolls();
    }
  }, [eventId]);

  // Set up socket connection for polls
  useEffect(() => {
    if (!eventId) return;

    // Clear any existing socket reference
    if (socketRef.current) {
      socketRef.current.off();
    }

    // Initialize new socket connection
    socketRef.current = initializeSocket();

    // Set up connection monitoring
    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      socketConnectedRef.current = true;

      // Join event room
      socketRef.current.emit('joinEvent', { eventId });

      // Request active poll info
      socketRef.current.emit('checkActivePoll', { eventId });

      // Special handling for SyndicateCoowner to ensure they get active polls
      if (user.role === 'SyndicateCoowner') {
        console.log('SyndicateCoowner connected, checking for active polls');
        api.get(`/api/polls/events/${eventId}/active`)
          .then(response => {
            if (response.data && response.data._id) {
              console.log('Found active poll for SyndicateCoowner:', response.data.title);
              dispatch(setActivePoll(response.data));
              dispatch(setShowPollModal(true));
              dispatch(updatePollKey());
            }
          })
          .catch(error => {
            // 404 is normal when no active poll
            if (error.response && error.response.status !== 404) {
              console.error('Error checking for active polls for SyndicateCoowner:', error);
            }
          });
      }

      // Load polls if admin
      if (user.role === 'SyndicateAdmin') {
        fetchPolls();
      }
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
      socketConnectedRef.current = false;
    });

    // Poll socket event handlers
    const handlePollStarted = (poll) => {
      console.log('Poll started received:', poll);

      // IMPORTANT: Clear the active poll first to reset state
      dispatch(resetPollState());
      dispatch(updatePollKey());

      // Check if this is a new poll
      const isNewPoll = !pollIdRef.current || pollIdRef.current !== poll._id;

      // Update the poll ID reference
      pollIdRef.current = poll._id;

      // Only show toast once per poll
      if (!toastShownRef.current[`start-${poll._id}`]) {
        toast.info(`${t('meeting.pollStarted')}: ${poll.title}`, {
          position: "top-right",
          autoClose: 3000
        });
        toastShownRef.current[`start-${poll._id}`] = true;
      }

      // Force fetch complete poll data with responses
      api.get(`/api/polls/${poll._id}/onepoll`)
        .then(response => {
          if (response.data) {
            console.log('Setting active poll from socket event:', response.data);

            // Update Redux with active poll
            dispatch(setActivePoll(response.data));
            dispatch(updatePollKey());

            // For co-owners, always show modal for active poll
            if (user.role === 'SyndicateCoowner') {
              dispatch(setShowPollModal(true));
            }
            // For admin, always show the modal for new polls
            else if (user.role === 'SyndicateAdmin') {
              dispatch(setShowPollModal(true));
              dispatch(setShowLiveResults(true));
            }

            // For admin, update poll lists
            if (user.role === 'SyndicateAdmin') {
              fetchPolls();
              fetchCompletedPolls();
            }
          }
        })
        .catch(error => {
          console.error('Error fetching complete poll data:', error);
          dispatch(setActivePoll(poll));

          // Show modal for all users on error
          dispatch(setShowPollModal(true));
        });

      // Play notification sound
      const audio = document.getElementById('poll-notification');
      if (audio) {
        audio.play().catch(err => console.error('Error playing audio:', err));
      }
    };

    const handlePollEnded = (poll) => {
      console.log('Poll ended received:', poll);

      // Only show toast once per poll end
      if (!toastShownRef.current[`end-${poll._id}`]) {
        toast.info(`${t('meeting.pollEnded')}: ${poll.title}`, {
          position: "top-right",
          autoClose: 3000
        });
        toastShownRef.current[`end-${poll._id}`] = true;
      }

      // Play end poll sound
      const audio = document.getElementById('poll-end');
      if (audio) {
        audio.play().catch(err => console.error('Error playing audio:', err));
      }

      // Update completed polls list immediately
      fetchCompletedPolls();

      // IMPORTANT: Force fetch updated poll results with all votes
      api.get(`/api/polls/${poll._id}/onepoll?includeResults=true`)
        .then(response => {
          if (response.data) {
            console.log('Updated poll ended data with all results:', response.data);

            // Mark the poll as ended but preserve all data
            const pollWithResults = {
              ...response.data,
              status: 'ended',
              isEnded: true
            };

            // Update Redux with the complete poll data
            dispatch(setActivePoll(pollWithResults));

            // For modal display, make sure it's showing
            if (activePoll && activePoll._id === poll._id) {
              dispatch(setShowPollModal(true));
              dispatch(incrementLiveVotesUpdate());
            }

            // Don't hide live results for admin
            if (user.role === 'SyndicateAdmin') {
              dispatch(setShowLiveResults(true));
            }
          }
        })
        .catch(error => {
          console.error('Error fetching complete poll results on end:', error);
        });

      // Only reset the poll ID reference for next poll after delay
      setTimeout(() => {
        pollIdRef.current = null;
        dispatch(updatePollKey());

        // Refresh polls for admin
        if (user.role === 'SyndicateAdmin') {
          fetchPolls();
        }
      }, 5000);
    };

    // Update the handleVoteRecorded function
    const handleVoteRecorded = (data) => {
      console.log('Vote recorded:', data);

      // For live results update
      if (activePoll && activePoll._id === data.pollId) {
        // Force fetch updated poll data to refresh live results
        api.get(`/api/polls/${data.pollId}/onepoll`)
          .then(response => {
            if (response.data) {
              console.log('Updated poll data after vote:', response.data);
              dispatch(setActivePoll(response.data));
              dispatch(incrementLiveVotesUpdate());
              setLastPollUpdate(Date.now());
            }
          })
          .catch(error => {
            console.error('Error fetching updated poll data:', error);
            // Still increment counter to trigger UI refresh
            dispatch(incrementLiveVotesUpdate());
          });
      }
    };

    const handleActivePoll = (poll) => {
      console.log('Active poll received:', poll);

      if (poll) {
        api.get(`/api/polls/${poll._id}/onepoll`)
          .then(response => {
            if (response.data) {
              console.log('Setting active poll from checkActivePoll:', response.data);
              dispatch(setActivePoll(response.data));
              dispatch(updatePollKey());

              // For co-owners, always show modal for active poll
              if (user.role === 'SyndicateCoowner') {
                dispatch(setShowPollModal(true));
              }
              // For admin, update live results state
              else if (user.role === 'SyndicateAdmin') {
                dispatch(setShowLiveResults(true));
              }
            }
          })
          .catch(error => {
            console.error('Error fetching active poll details:', error);
            dispatch(setActivePoll(poll));
          });
      }
    };

    // Register socket event handlers
    socketRef.current.on('pollStarted', handlePollStarted);
    socketRef.current.on('pollEnded', handlePollEnded);
    socketRef.current.on('voteRecorded', handleVoteRecorded);
    socketRef.current.on('activePoll', handleActivePoll);

    // Clean up on unmount
    return () => {
      if (socketRef.current) {
        // Leave the event room
        socketRef.current.emit('leavePoll', { eventId });

        // Remove all event handlers
        socketRef.current.off('pollStarted');
        socketRef.current.off('pollEnded');
        socketRef.current.off('voteRecorded');
        socketRef.current.off('activePoll');
        socketRef.current.off('connect');
        socketRef.current.off('disconnect');
      }
    };
  }, [eventId, user.role, dispatch, t]);


  // Function to handle meeting ending for any participant
  const forceEndMeeting = () => {
    // Only end meetings due to time limits for SyndicateAdmin users
    if (user.role !== 'SyndicateAdmin') {
      console.log('Co-owner detected, not applying time-based meeting end');
      return;
    }

    if (jitsiContainerRef.current && jitsiContainerRef.current.api) {
      // Display message only to admin
      jitsiContainerRef.current.api.executeCommand('displayNotification', {
        title: t('meeting.videoTimeExceeded'),
        description: t('meeting.videoConferenceTimeExhausted'),
        type: 'error',
        timeout: 5000
      });
      
      // Close the meeting after a short delay for everyone
      setTimeout(() => {
        jitsiContainerRef.current.api.executeCommand('hangup');
        navigate('/calendar');
      }, 5000);
    }
  };

  if (!event || !event.meeting || !event.meeting.roomName) {
    return (
      <Container fluid className="py-5" style={{ marginTop: '80px' }}>
        <Card className="nestly-card text-center">
          <CardBody className="py-5">
            <div className="nestly-icon-container nestly-icon-container-coral mx-auto mb-3" style={{ width: '80px', height: '80px' }}>
              <i className="ri-error-warning-line fs-1"></i>
            </div>
            <h3 className="poll-subtitle mb-3">{t('meeting.meetingNotFound')}</h3>
            <p className="text-muted mb-4">{t('meeting.meetingNotFoundDesc')}</p>
            <Button className="nestly-btn-teal" onClick={() => navigate('/calendar')}>
              <i className="ri-arrow-left-line me-2"></i> {t('meeting.backToCalendar')}
            </Button>
          </CardBody>
        </Card>
      </Container>
    );
  }

  if (!event.meeting.isActive && user.role === 'SyndicateCoowner') {
    return (
      <Container fluid className="py-5" style={{ marginTop: '80px' }}>
        <Card className="nestly-card text-center">
          <CardBody className="py-5">
            <div className="nestly-icon-container nestly-icon-container-teal mx-auto mb-3" style={{ width: '80px', height: '80px' }}>
              <i className="ri-time-line fs-1"></i>
            </div>
            <h3 className="poll-subtitle mb-3">{t('meeting.meetingNotStarted')}</h3>
            <p className="text-muted mb-4">{t('meeting.meetingNotStartedDesc')}</p>
            <Button className="nestly-btn-coral" onClick={() => navigate('/calendar')}>
              <i className="ri-arrow-left-line me-2"></i> {t('meeting.backToCalendar')}
            </Button>
          </CardBody>
        </Card>
      </Container>
    );
  }

  if (!currentMeeting || !currentMeeting.token) {
    return (
      <Container fluid className="py-5" style={{ marginTop: '80px' }}>
        <Card className="nestly-card text-center">
          <CardBody className="py-5">
            <div className="nestly-icon-container nestly-icon-container-coral mx-auto mb-3" style={{ width: '80px', height: '80px' }}>
              <i className="ri-error-warning-line fs-1"></i>
            </div>
            <h3 className="poll-subtitle mb-3">{t('meeting.tokenNotAvailable')}</h3>
            <p className="text-muted mb-4">{t('meeting.tokenNotAvailableDesc')}</p>
            <Button className="nestly-btn-teal" onClick={() => navigate('/calendar')}>
              <i className="ri-arrow-left-line me-2"></i> {t('meeting.backToCalendar')}
            </Button>
          </CardBody>
        </Card>
      </Container>
    );
  }

  // Toggle poll management panel visibility
  const togglePollManagement = () => {
    setShowPollManagement(!showPollManagement);
  };

  const toggleLiveResults = () => {
    // Directly dispatch to Redux to ensure state is properly toggled
    dispatch(setShowLiveResults(!showLiveResults));
  };

  // End active poll
  const endActivePoll = async () => {
    if (!activePoll) return;

    try {
      const response = await api.post(`/api/polls/${activePoll._id}/stop`);
      toast.success(t('meeting.pollEndedSuccess'));

      // Immediately refresh completed polls list to show new ended poll
      fetchCompletedPolls();

      // Fetch the complete poll data to ensure we have all results
      const pollData = await api.get(`/api/polls/${activePoll._id}/onepoll`);

      if (pollData.data) {
        // Update active poll with ended status but keep it visible
        dispatch(setActivePoll({
          ...pollData.data,
          status: 'ended',
          isEnded: true
        }));

        // Force UI refresh
        dispatch(incrementLiveVotesUpdate());

        // Don't hide live results
        dispatch(setShowLiveResults(true));
      }

      // Also refresh polls for the admin
      if (user.role === 'SyndicateAdmin') {
        fetchPolls();
      }

      // Don't clear active poll or hide live results immediately
      // Only reset the poll ID reference for next poll detection
      pollIdRef.current = null;
    } catch (error) {
      console.error('Error ending poll:', error);
      toast.error(t('meeting.failedToEndPoll'));
    }
  };

  return (
    <Container fluid className="meeting-container py-3">
      {/* Meeting title and controls */}
      <div className="meeting-header mb-4" style={{ marginTop: '80px' }}>
        <Card className="nestly-card mb-3">
          <CardHeader className="nestly-card-header">
            <div className="nestly-card-pattern"></div>
            <div className="d-flex justify-content-between align-items-center position-relative" style={{ zIndex: '1' }}>
              <div className="d-flex align-items-center">
                <div className="nestly-icon-container nestly-icon-container-coral me-3">
                  <i className="ri-vidicon-line fs-4"></i>
                </div>
                <h4 className="poll-title mb-0">{event.title}</h4>
                {remainingTime !== null && user.role === 'SyndicateAdmin' && (
                  <div className="ms-3 d-flex align-items-center">
                    <Badge 
                      color={remainingTime > 10 ? "info" : remainingTime > 5 ? "warning" : "danger"} 
                      className="p-2 d-flex align-items-center"
                    >
                      <i className="ri-time-line me-1"></i>
                      {t('meeting.timeRemaining')}: {remainingTime} {t('meeting.minutes')}
                    </Badge>
                  </div>
                )}
              </div>
              <div className="d-flex align-items-center">
                {/* Live Poll indicator and controls for Admin */}
                {isModerator && activePoll && (
                  <Button
                    className={`nestly-btn-${showLiveResults ? "teal" : "outline-teal"} me-2`}
                    onClick={toggleLiveResults}
                  >
                    <i className={`ri-${showLiveResults ? 'eye-fill' : 'eye-line'} me-1`}></i>
                    {showLiveResults ? t('meeting.hideLiveResults') : t('meeting.liveResults')}
                    <span className="nestly-badge nestly-badge-coral ms-2">{activePoll.responses?.length || 0}</span>
                  </Button>
                )}

                {/* Poll results button */}
                {completedPolls && completedPolls.length > 0 && (
                  <Button
                    className="nestly-btn-outline-teal me-2"
                    onClick={() => {
                      // Force refresh completed polls when opening the modal
                      fetchCompletedPolls().then(() => {
                        setSelectedCompletedPoll(null);
                        setShowCompletedPollsModal(true);
                      });
                    }}
                  >
                    <i className="ri-history-line me-1"></i>
                    {t('meeting.pollResults')}
                    <span className="nestly-badge nestly-badge-teal ms-2">{completedPolls.length}</span>
                  </Button>
                )}

                {/* Admin poll management button */}
                {isModerator && (
                  <Button
                    className={`nestly-btn-${showPollManagement ? "coral" : "outline-coral"} me-2`}
                    onClick={togglePollManagement}
                  >
                    {showPollManagement ? (
                      <><i className="ri-close-line me-1"></i> {t('meeting.hidePollManager')}</>
                    ) : (
                      <><i className="ri-questionnaire-line me-1"></i> {t('meeting.pollManager')}</>
                    )}
                  </Button>
                )}

                <Button className="nestly-btn-outline-coral" onClick={() => navigate('/calendar')}>
                  <i className="ri-logout-box-line me-1"></i> {t('meeting.exitMeeting')}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Live Results Display for Admin */}
      {isModerator && activePoll && showLiveResults && (
        <Card className="nestly-card mb-3">
          <CardHeader className="nestly-card-header">
            <div className="nestly-card-pattern"></div>
            <div className="d-flex justify-content-between align-items-center position-relative" style={{ zIndex: '1' }}>
              <div className="d-flex align-items-center">
                <div className="nestly-icon-container nestly-icon-container-teal me-2">
                  <i className="ri-bar-chart-grouped-line"></i>
                </div>
                <h5 className="poll-title mb-0">{t('meeting.livePollResults')}: {activePoll.title}</h5>
              </div>
              <span className="nestly-badge nestly-badge-coral">
                <i className="ri-user-voice-line me-1"></i> {activePoll.responses ? activePoll.responses.length : 0} {t('meeting.votes')}
              </span>
            </div>
          </CardHeader>
          <CardBody>
            <Row>
              <Col md={4}>
                <Card className="nestly-card h-100">
                  <CardBody>
                    <h5 className="poll-subtitle mb-3">{t('meeting.voteStatistics')}</h5>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-muted">{t('meeting.totalVotes')}:</span>
                      <span className="nestly-badge nestly-badge-teal">{activePoll.responses?.length || 0}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-muted">{t('meeting.totalParticipants')}:</span>
                      <span className="nestly-badge nestly-badge-coral">{event.attendees?.length || 2}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-muted">{t('meeting.participationRate')}:</span>
                      <span className="nestly-badge nestly-badge-coral">
                        {(() => {
                          // Get unique users who have submitted at least one response
                          const uniqueRespondents = new Set();
                          if (activePoll.responses && Array.isArray(activePoll.responses)) {
                            activePoll.responses.forEach(response => {
                              const userId = typeof response.user === 'object' ?
                                response.user._id : response.user;
                              uniqueRespondents.add(userId);
                            });
                          }

                          // Calculate rate based on unique respondents
                          const totalParticipants = event.attendees?.length || 2;
                          return Math.round((uniqueRespondents.size / totalParticipants) * 100);
                        })()}%
                      </span>
                    </div>
                    <Progress
                      value={(() => {
                        // Get unique users who have submitted at least one response
                        const uniqueRespondents = new Set();
                        if (activePoll.responses && Array.isArray(activePoll.responses)) {
                          activePoll.responses.forEach(response => {
                            const userId = typeof response.user === 'object' ?
                              response.user._id : response.user;
                            uniqueRespondents.add(userId);
                          });
                        }

                        // Calculate rate based on unique respondents
                        const totalParticipants = event.attendees?.length || 2;
                        return Math.round((uniqueRespondents.size / totalParticipants) * 100);
                      })()}
                      className="mb-4 mt-1"
                      style={{ height: '8px', backgroundColor: 'rgba(12, 139, 141, 0.1)', borderRadius: '4px' }}
                    >
                      <div
                        className="progress-bar"
                        style={{
                          backgroundColor: 'var(--teal)',
                          borderRadius: '4px'
                        }}
                      ></div>
                    </Progress>
                    <Button
                      className="nestly-btn-coral w-100"
                      onClick={endActivePoll}
                    >
                      <i className="ri-stop-circle-line me-1"></i> {t('meeting.endPoll')}
                    </Button>
                  </CardBody>
                </Card>
              </Col>
              <Col md={8}>
                <PollStatsChart
                  poll={{
                    ...activePoll,
                    participantCount: event.attendees?.length || 2,
                    event: { attendees: event.attendees || [] }
                  }}
                  key={`live-poll-stats-${activePoll._id}-${Math.floor(liveVotesUpdate / 5)}`}
                />
              </Col>
            </Row>
          </CardBody>
        </Card>
      )}

      <Row>
        {isModerator && showPollManagement ? (
          <>
            {/* Jitsi video container - reduced width */}
            <Col md={8} className="mb-4">
              <Card className="nestly-card h-100">
                <CardBody className="p-0">
                  <div
                    ref={jitsiContainerRef}
                    style={{
                      height: 'calc(100vh - 260px - (showLiveResults ? 320px : 0px))',
                      width: '100%',
                      borderRadius: '16px',
                      overflow: 'hidden'
                    }}
                  />
                </CardBody>
              </Card>
            </Col>
            {/* Poll management interface */}
            <Col md={4} className="poll-management">
              <PollCreator
                eventId={eventId}
                showStart={true}
                key={`poll-creator-${showPollManagement ? 1 : 0}`}
              />
            </Col>
          </>
        ) : (
          <>
            {/* Jitsi video container - full width when poll management is closed */}
            <Col md={12}>
              <Card className="nestly-card">
                <CardBody className="p-0">
                  <div
                    ref={jitsiContainerRef}
                    style={{
                      height: 'calc(100vh - 150px)',
                      width: '100%',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  />
                </CardBody>
              </Card>
            </Col>
          </>
        )}
      </Row>

      {/* Poll Modal for participants */}
      <PollModal
        showPollModal={showPollModal}
        togglePollModal={() => setShowPollModal(!showPollModal)}
        activePoll={activePoll}
        isModerator={isModerator}
        key={`poll-modal-${activePoll?._id}`}  // Remove the showPollModal dependency from the key
      />

      {/* Results Modal for completed polls */}
      <PollResultsModal
        isOpen={showCompletedPollsModal}
        toggle={() => setShowCompletedPollsModal(!showCompletedPollsModal)}
        completedPolls={completedPolls}
        selectedPoll={selectedCompletedPoll}
        setSelectedPoll={setSelectedCompletedPoll}
      />
      {/* Add audio files for notifications */}
      <audio id="poll-notification" src="/poll-notification.mp3" preload="auto" style={{ display: 'none' }} />
      <audio id="poll-end" src="/poll-end.mp3" preload="auto" style={{ display: 'none' }} />
    </Container>
  );
};

export default Meeting;