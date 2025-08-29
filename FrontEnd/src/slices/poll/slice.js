import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activePoll: null,
  polls: [],
  completedPolls: [],
  showPollModal: false,
  showLiveResults: false,
  liveVotesUpdate: 0,
  pollKey: Date.now(),
  lastUpdate: Date.now()
};

const pollsSlice = createSlice({
  name: 'polls',
  initialState,
  reducers: {
    setActivePoll: (state, action) => {
      state.activePoll = action.payload;
      state.pollKey = Date.now();
      state.lastUpdate = Date.now();
    },
    clearActivePoll: (state) => {
      state.activePoll = null;
    },
    setPolls: (state, action) => {
      state.polls = action.payload;
    },
    setCompletedPolls: (state, action) => {
      state.completedPolls = action.payload;
    },
    setShowPollModal: (state, action) => {
      state.showPollModal = action.payload;
    },
    setShowLiveResults: (state, action) => {
      state.showLiveResults = action.payload;
    },
    incrementLiveVotesUpdate: (state) => {
      state.liveVotesUpdate += 1;
    },
    updatePollKey: (state) => {
      state.pollKey = Date.now();
    },
    resetPollState: (state) => {
      state.activePoll = null;
      state.showPollModal = false;
      state.showLiveResults = false;
      state.pollKey = Date.now();
    }
  }
});

export const {
  setActivePoll,
  clearActivePoll,
  setPolls,
  setCompletedPolls,
  setShowPollModal,
  setShowLiveResults,
  incrementLiveVotesUpdate,
  updatePollKey,
  resetPollState
} = pollsSlice.actions;

export default pollsSlice.reducer;