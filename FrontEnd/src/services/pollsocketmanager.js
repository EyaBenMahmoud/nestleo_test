import { initializeSocket } from './socketManager';
import api from './api';
import { store } from '../store';
import { 
  setActivePoll, 
  clearActivePoll, 
  setPolls, 
  setCompletedPolls, 
  setShowPollModal, 
  setShowLiveResults,
  incrementLiveVotesUpdate,
  updatePollKey,
  resetPollState
} from '../slices/poll/slice';
import { toast } from 'react-toastify';

// Track already shown toasts
const toastShown = {};
const pollNotificationPlayed = { current: false };

// Set up socket handlers for polls
export const setupPollSockets = (eventId) => {
  const socket = initializeSocket();
  const { dispatch, getState } = store;
  
  // Join event room
  socket.emit('joinEvent', { eventId });
  
  // Request active poll info
  socket.emit('checkActivePoll', { eventId });
  
  // Handle poll started event
  socket.on('pollStarted', async (poll) => {
    console.log('Poll started received:', poll);
    
    // Show notification toast only once per poll
    if (!toastShown[`start-${poll._id}`]) {
      toast.info(`Poll started: ${poll.title}`, {
        position: "top-right",
        autoClose: 3000
      });
      toastShown[`start-${poll._id}`] = true;
    }
    
    try {
      // Fetch complete poll data with responses
      const response = await api.get(`/api/polls/${poll._id}/onepoll`);
      
      if (response.data) {
        console.log('Setting active poll from socket event:', response.data);
        
        // Update Redux store with active poll
        dispatch(setActivePoll(response.data));
        
        // Get current user role from store
        const userRole = getState().Loginn.user.role;
        
        // Show poll modal based on user role
        if (userRole === 'SyndicateCoowner') {
          dispatch(setShowPollModal(true));
        } else if (userRole === 'SyndicateAdmin') {
          dispatch(setShowPollModal(true));
          dispatch(setShowLiveResults(true));
          
          // For admin, fetch updated polls lists
          fetchPollsForEvent(eventId);
          fetchCompletedPolls(eventId);
        }
      }
    } catch (error) {
      console.error('Error fetching complete poll data:', error);
      
      // Fall back to poll data from event
      dispatch(setActivePoll(poll));
      
      // Still show modal on error
      const userRole = getState().Loginn.user.role;
      if (userRole === 'SyndicateCoowner' || userRole === 'SyndicateAdmin') {
        dispatch(setShowPollModal(true));
      }
    }
    
    // Play notification sound
    if (!pollNotificationPlayed.current) {
      pollNotificationPlayed.current = true;
      const audio = new Audio('/poll-notification.mp3');
      audio.play().catch(err => console.error('Error playing audio:', err));
      
      setTimeout(() => {
        pollNotificationPlayed.current = false;
      }, 10000);
    }
  });
  
  // Handle poll ended event
  socket.on('pollEnded', (poll) => {
    console.log('Poll ended received:', poll);
    
    // Show notification toast
    if (!toastShown[`end-${poll._id}`]) {
      toast.info(`Poll ended: ${poll.title}`, {
        position: "top-right",
        autoClose: 3000
      });
      toastShown[`end-${poll._id}`] = true;
    }
    
    // Update completed polls list
    fetchCompletedPolls(eventId);
    
    // Get current activePoll from store
    const activePoll = getState().polls.activePoll;
    
    // Only clear active poll if it's the current one
    if (activePoll && activePoll._id === poll._id) {
      // Important: Reset all poll-related states to prepare for next poll
      dispatch(resetPollState());
    }
  });
  
  // Handle vote recorded event
  socket.on('voteRecorded', (data) => {
    console.log('Vote recorded:', data);
    
    // Get current activePoll from store
    const activePoll = getState().polls.activePoll;
    
    // Update poll data if active poll matches
    if (activePoll && activePoll._id === data.pollId) {
      // Refresh active poll data
      api.get(`/api/polls/${data.pollId}/onepoll`)
        .then(response => {
          dispatch(setActivePoll(response.data));
          dispatch(incrementLiveVotesUpdate());
        })
        .catch(error => {
          console.error('Error refreshing poll after vote:', error);
        });
    }
  });
  
  // Handle active poll event
  socket.on('activePoll', (poll) => {
    console.log('Active poll received:', poll);
    
    if (poll) {
      // Fetch complete poll data with responses
      api.get(`/api/polls/${poll._id}/onepoll`)
        .then(response => {
          console.log('Setting active poll from checkActivePoll:', response.data);
          
          // Update Redux store
          dispatch(setActivePoll(response.data));
          
          // Show modal based on user role
          const userRole = getState().Loginn.user.role;
          if (userRole === 'SyndicateCoowner') {
            dispatch(setShowPollModal(true));
          } else if (userRole === 'SyndicateAdmin') {
            dispatch(setShowLiveResults(true));
          }
        })
        .catch(error => {
          console.error('Error fetching active poll details:', error);
          dispatch(setActivePoll(poll));
        });
    }
  });
  
  return () => {
    // Clean up on unmount
    socket.off('pollStarted');
    socket.off('pollEnded');
    socket.off('voteRecorded');
    socket.off('activePoll');
  };
};

// Fetch polls for event
export const fetchPollsForEvent = async (eventId) => {
  try {
    const response = await api.get(`/api/polls/events/${eventId}`);
    store.dispatch(setPolls(response.data));
    return response.data;
  } catch (error) {
    console.error('Error fetching polls:', error);
    return [];
  }
};

// Fetch completed polls
export const fetchCompletedPolls = async (eventId) => {
  try {
    const response = await api.get(`/api/polls/events/${eventId}/completed`);
    store.dispatch(setCompletedPolls(response.data));
    return response.data;
  } catch (error) {
    console.error('Error fetching completed polls:', error);
    return [];
  }
};

// Start a poll
export const startPoll = async (pollId) => {
  try {
    // Reset poll state first
    store.dispatch(resetPollState());
    
    // Start the poll
    await api.post(`/api/polls/${pollId}/start`);
    
    // Success toast
    toast.success('Poll started');
    
    return true;
  } catch (error) {
    console.error('Error starting poll:', error);
    toast.error(error.response?.data?.message || 'Failed to start poll');
    return false;
  }
};

// End a poll
export const endPoll = async (pollId) => {
  try {
    await api.post(`/api/polls/${pollId}/end`);
    toast.success('Poll ended');
    return true;
  } catch (error) {
    console.error('Error ending poll:', error);
    toast.error(error.response?.data?.message || 'Failed to end poll');
    return false;
  }
};