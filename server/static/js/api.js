// API module
// Handles all server communication

// Get user info and token
const tokenMeta = document.querySelector('meta[name="token"]');
const usernameMeta = document.querySelector('meta[name="username"]');
let token = localStorage.getItem('token');
let currentUsername = usernameMeta ? usernameMeta.content : null;

// Save token if available in meta tag
if (tokenMeta && tokenMeta.content) {
  localStorage.setItem('token', tokenMeta.content);
  token = tokenMeta.content;
}

// API helper for making authenticated requests
function fetchWithCreds(url, options = {}) {
  return fetch(url, {
    ...options,
    credentials: 'include'
  });
}

// Check authentication status
function checkAuth() {
  if (!token) {
    console.log('No token found in localStorage');
    return Promise.resolve(false);
  }

  return fetchWithCreds('/validate_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  })
  .then(r => {
    if (!r.ok) {
      console.log('Token validation failed');
      localStorage.removeItem('token');
      window.location = '/login';
      return false;
    }
    console.log('Token validation successful');
    return true;
  })
  .catch(err => {
    console.error('Auth check error:', err);
    UI.showToast('Connection error. Please try again.', 'error');
    return false;
  });
}

// Handles errors from fetch responses
function handleApiError(response, defaultMsg = 'An error occurred') {
  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location = '/login';
    return Promise.resolve('Authentication error');
  }

  return response.json()
    .then(data => {
      if (data && data.status) {
        switch (data.status) {
          case 'INVALID': return data.message || 'Invalid request';
          case 'USER_NOT_FOUND': return 'User not found';
          case 'FORBIDDEN': return 'You do not have permission to do that';
          case 'NOT_FOUND': return 'Not found';
          case 'ALREADY_FRIENDS': return 'You are already friends with this user';
          case 'REQUEST_ALREADY_SENT': return 'Friend request already sent';
          case 'CANNOT_ADD_SELF': return 'You cannot add yourself as a friend';
          case 'REQUEST_NOT_FOUND': return 'Friend request not found';
          case 'NOT_FRIENDS': return 'You are not friends with this user';
          case 'INVALID_INVITE': return 'Invalid invite code';
          case 'EXPIRED_INVITE': return 'This invite has expired';
          case 'SERVER_NOT_FOUND': return 'Server not found';
          case 'ALREADY_MEMBER': return 'You are already a member of this server';
          case 'NOT_MEMBER': return 'You are not a member of this server';
          case 'OWNER_CANNOT_LEAVE': return 'As owner, you cannot leave this server';
          case 'GROUP_NOT_FOUND': return 'Group chat not found';
          case 'NO_PERMISSION': return 'You do not have permission to perform this action';
          case 'USER_BLOCKED': return 'This user has blocked you';
          case 'MAX_SERVERS_REACHED': return 'You have reached the maximum number of servers';
          case 'MAX_CHANNELS_REACHED': return 'This server has reached the maximum number of channels';
          case 'USERNAME_TAKEN': return 'This username is already taken';
          case 'INVALID_USERNAME': return 'Invalid username format';
          case 'INVALID_PASSWORD': return 'Invalid password format';
          case 'INCORRECT_PASSWORD': return 'Incorrect password';
          case 'MESSAGE_TOO_LONG': return 'Message is too long';
          case 'RATE_LIMITED': return 'You are sending messages too quickly. Please wait a moment.';
          case 'SERVER_ERROR': return 'An internal server error occurred. Please try again.';
          default: return data.message || defaultMsg;
        }
      }
      return defaultMsg;
    })
    .catch(() => defaultMsg);
}

// Server APIs
const ServerAPI = {
  fetchServers: function() {
    return fetchWithCreds(`/servers?token=${token}`)
      .then(r => {
        if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
        return r.json();
      })
      .then(data => {
        StateManager.dataCache.serverData = data;
        return data;
      });
  },

  createServer: function(name) {
    return fetchWithCreds('/create_server', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, name })
    })
    .then(r => {
      if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
      return r.json();
    });
  },
  
  editServer: function(serverId, name) {
    return fetchWithCreds('/edit_server', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, server_id: serverId, name })
    })
    .then(r => {
      if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
      return r.json();
    });
  },
  
  deleteServer: function(serverId) {
    return fetchWithCreds('/delete_server', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, server_id: serverId })
    })
    .then(r => {
      if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
      return r.json();
    });
  },
  
  leaveServer: function(serverId) {
    return fetchWithCreds('/leave_server', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, server_id: serverId })
    })
    .then(r => {
      if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
      return r.json();
    });
  },
  
  createInvite: function(serverId, expiresIn) {
    return fetchWithCreds('/create_invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, server_id: serverId, expires_in: expiresIn })
    })
    .then(r => {
      if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
      return r.json();
    });
  },
  
  joinServer: function(inviteCode) {
    return fetchWithCreds('/join_server', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, invite_code: inviteCode })
    })
    .then(r => {
      if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
      return r.json();
    });
  }
};

// Channel APIs
const ChannelAPI = {
  fetchChannels: function(serverId) {
    return fetchWithCreds(`/channels?token=${token}&server_id=${serverId}`)
      .then(r => {
        if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
        return r.json();
      });
  },
  
  createChannel: function(serverId, name) {
    return fetchWithCreds('/create_channel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, server_id: serverId, name })
    })
    .then(r => {
      if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
      return r.json();
    });
  },
  
  editChannel: function(serverId, channelId, name) {
    return fetchWithCreds('/edit_channel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, server_id: serverId, channel_id: channelId, name })
    })
    .then(r => {
      if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
      return r.json();
    });
  },
  
  deleteChannel: function(serverId, channelId) {
    return fetchWithCreds('/delete_channel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, server_id: serverId, channel_id: channelId })
    })
    .then(r => {
      if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
      return r.json();
    });
  }
};

// Friend APIs
const FriendAPI = {
  fetchFriends: function() {
    return fetchWithCreds(`/get_friends?token=${token}`)
      .then(r => {
        if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
        return r.json();
      })
      .then(data => {
        if (data.status === 'OK') {
          StateManager.dataCache.friendsData = data.friends || [];
          return StateManager.dataCache.friendsData;
        }
        return [];
      });
  },
  
  fetchFriendRequests: function() {
    return fetchWithCreds(`/get_friend_requests?token=${token}`)
      .then(r => {
        if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
        return r.json();
      })
      .then(data => {
        if (data.status === 'OK') {
          StateManager.dataCache.pendingRequests = data.requests || [];
          return StateManager.dataCache.pendingRequests;
        }
        return [];
      });
  },
  
  sendFriendRequest: function(username) {
    return fetchWithCreds('/send_friend_request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, username })
    })
    .then(r => {
      if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
      return r.json();
    });
  },
  
  acceptFriendRequest: function(username) {
    return fetchWithCreds('/accept_friend_request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, username })
    })
    .then(r => {
      if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
      return r.json();
    });
  },
  
  rejectFriendRequest: function(username) {
    return fetchWithCreds('/reject_friend_request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, username })
    })
    .then(r => {
      if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
      return r.json();
    });
  },
  
  removeFriend: function(username) {
    return fetchWithCreds('/remove_friend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, username })
    })
    .then(r => {
      if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
      return r.json();
    });
  }
};

// Message and DM APIs
const MessageAPI = {
  fetchMessages: function(serverId, channelId, since = 0) {
    return fetchWithCreds(`/messages?token=${token}&server_id=${serverId}&channel_id=${channelId}${since ? '&since=' + since : ''}`)
      .then(r => {
        if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
        return r.json();
      });
  },
  
  sendMessage: function(serverId, channelId, content) {
    return fetchWithCreds('/send_message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, server_id: serverId, channel_id: channelId, content })
    })
    .then(r => {
      if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
      return r.json();
    });
  },
  
  fetchDms: function(dmId = null) {
    const url = dmId 
      ? `/get_dms?token=${token}&dm_id=${dmId}`
      : `/get_dms?token=${token}`;
      
    return fetchWithCreds(url)
      .then(r => {
        if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
        return r.json();
      })
      .then(data => {
        if (!dmId && data.status === 'OK') {
          StateManager.dataCache.dmsData = data.dms || [];
        }
        return data;
      });
  },
  
  fetchDmMessages: function(dmId, since = 0) {
    const url = `/get_dms?token=${token}&dm_id=${dmId}${since ? '&since=' + since : ''}`;
    return fetchWithCreds(url)
      .then(r => {
        if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
        return r.json();
      });
  },
  
  sendDirectMessage: function(username, content) {
    return fetchWithCreds('/send_dm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, username, content })
    })
    .then(r => {
      if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
      return r.json();
    });
  },
  
  sendGroupMessage: function(groupId, content) {
    return fetchWithCreds('/send_group_message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, group_id: groupId, content })
    })
    .then(r => {
      if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
      return r.json();
    });
  },
  
  createGroupChat: function(name, users) {
    return fetchWithCreds('/create_group_chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, name, users })
    })
    .then(r => {
      if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
      return r.json();
    });
  },
  
  leaveGroup: function(groupId) {
    return fetchWithCreds('/leave_group_chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, group_id: groupId })
    })
    .then(r => {
      if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
      return r.json();
    });
  },
  
  disbandGroup: function(groupId) {
    return fetchWithCreds('/disband_group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, group_id: groupId })
    })
    .then(r => {
      if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
      return r.json();
    });
  }
};

// User APIs
const UserAPI = {
  kickUser: function(serverId, username) {
    return fetchWithCreds('/kick_user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, server_id: serverId, username })
    })
    .then(r => {
      if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
      return r.json();
    });
  },
  
  banUser: function(serverId, username) {
    return fetchWithCreds('/ban_user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, server_id: serverId, username })
    })
    .then(r => {
      if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
      return r.json();
    });
  },
  
  getProfile: function(username) {
    return fetchWithCreds(`/get_profile?token=${token}&username=${username}`)
      .then(r => {
        if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
        return r.json();
      });
  },
  
  saveProfile: function(profileData) {
    return fetchWithCreds('/save_profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, username: currentUsername, ...profileData })
    })
    .then(r => {
      if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
      return r.json();
    });
  },
  
  getSettings: function() {
    return fetchWithCreds(`/get_settings?token=${token}`)
      .then(r => {
        if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
        return r.json();
      });
  },
  
  saveSettings: function(settings) {
    return fetchWithCreds('/save_settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, settings })
    })
    .then(r => {
      if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
      return r.json();
    });
  },
  
  timeoutUser: function(serverId, username, duration, reason) {
    return fetchWithCreds('/timeout_user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        token, 
        server_id: serverId, 
        username,
        duration,
        reason 
      })
    })
    .then(r => {
      if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
      return r.json();
    });
  },
  
  removeTimeout: function(serverId, username) {
    return fetchWithCreds('/remove_timeout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        token, 
        server_id: serverId, 
        username 
      })
    })
    .then(r => {
      if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
      return r.json();
    });
  },
  
  setNickname: function(serverId, username, nickname) {
    return fetchWithCreds('/set_nickname', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        token, 
        server_id: serverId, 
        username,
        nickname
      })
    })
    .then(r => {
      if (!r.ok) return handleApiError(r).then(msg => { throw new Error(msg); });
      return r.json();
    });
  }
};

// Export module
window.API = {
  token,
  currentUsername,
  checkAuth,
  ServerAPI,
  ChannelAPI,
  FriendAPI,
  MessageAPI,
  UserAPI
};
