// State management module
// Handles app state, persistent storage and data caching

// User preferences and state
let appState = {
  currentServer: null,
  currentChannel: null,
  currentDm: null,
  inDmMode: true,
  lastMessageTimestamp: 0
};

// Data caches
let dataCache = {
  serverData: {},
  friendsData: [],
  pendingRequests: [],
  dmsData: [],
  knownMessageIds: new Set()
};

// Polling intervals
let intervals = {
  messagePolling: null,
  friendsPolling: null
};

// Load app state from localStorage
function loadAppState() {
  try {
    const savedState = localStorage.getItem('appState');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      appState = { ...appState, ...parsed };
    }
  } catch (e) {
    console.error('Error loading app state:', e);
  }
}

// Save app state to localStorage
function saveAppState() {
  try {
    localStorage.setItem('appState', JSON.stringify({
      currentServer: appState.currentServer,
      currentChannel: appState.currentChannel,
      currentDm: appState.currentDm,
      inDmMode: appState.inDmMode
    }));
  } catch (e) {
    console.error('Error saving app state:', e);
  }
}

// Reset message tracking
function resetMessageTracking() {
  appState.lastMessageTimestamp = 0;
  dataCache.knownMessageIds.clear();
}

// Export module
window.StateManager = {
  appState,
  dataCache,
  intervals,
  loadAppState,
  saveAppState,
  resetMessageTracking
};
