// Chat Manager module
// Handles core chat functionality and business logic

// Message polling intervals
const MESSAGE_POLLING_INTERVAL = 2000; // 2 seconds
const FRIENDS_POLLING_INTERVAL = 10000; // 10 seconds

// Select a server
function selectServer(sid) {
  StateManager.appState.inDmMode = false;
  StateManager.appState.currentServer = sid;
  StateManager.appState.currentChannel = null;
  StateManager.appState.currentDm = null;
  StateManager.resetMessageTracking();
  
  // Save state
  StateManager.saveAppState();
  
  // Update UI
  UI.ServerListUI.renderServers();
  
  // Hide home content and show server content
  document.getElementById('home-content').style.display = 'none';
  document.getElementById('server-content').style.display = 'flex';
  document.getElementById('channels-container').style.display = 'flex';
  document.getElementById('member-list-container').style.display = 'flex';
  
  // Fetch channels and members
  fetchChannels();
  fetchServerMembers();
  stopMessagePolling();
}

// Switch to DM mode
function switchToDmMode() {
  StateManager.appState.inDmMode = true;
  StateManager.appState.currentServer = null;
  StateManager.appState.currentChannel = null;
  
  // Save state
  StateManager.saveAppState();
  
  // Update UI
  UI.ServerListUI.renderServers();
  
  // Show home content with friends and DMs
  document.getElementById('home-content').style.display = 'flex';
  document.getElementById('server-content').style.display = 'none';
  document.getElementById('member-list-container').style.display = 'none';
  
  // If we already have a selected DM, show it
  if (StateManager.appState.currentDm) {
    openDm(StateManager.appState.currentDm);
  } else {
    document.getElementById('messages').innerHTML = '<div class="empty-chat">Select a friend to start chatting</div>';
    stopMessagePolling();
  }
}

// Fetch channels for current server
function fetchChannels() {
  if (!StateManager.appState.currentServer) return;
  
  return API.ChannelAPI.fetchChannels(StateManager.appState.currentServer)
    .then(data => {
      if (StateManager.dataCache.serverData[StateManager.appState.currentServer]) {
        StateManager.dataCache.serverData[StateManager.appState.currentServer].channels = data;
      }
      UI.ChannelListUI.renderChannels();
      
      // If we've stored a channel selection for this server, select it
      if (StateManager.appState.currentChannel) {
        selectChannel(StateManager.appState.currentChannel);
      }
    })
    .catch(err => {
      console.error("Error fetching channels:", err);
      UI.showToast(err.message || "Error loading channels", 'error');
    });
}

// Fetch members for current server
function fetchServerMembers() {
  if (!StateManager.appState.currentServer) return;
  
  // This API endpoint might need to be implemented on the server side
  return fetch(`/server_members?token=${API.token}&server_id=${StateManager.appState.currentServer}`)
    .then(r => {
      if (!r.ok) return;
      return r.json();
    })
    .then(data => {
      if (data && data.members) {
        UI.MemberListUI.renderMemberList(data.members);
      }
    })
    .catch(err => {
      console.error("Error fetching server members:", err);
    });
}

// Select a channel
function selectChannel(cid) {
  StateManager.appState.currentChannel = cid;
  StateManager.appState.currentDm = null;
  StateManager.resetMessageTracking();
  
  // Save state
  StateManager.saveAppState();
  
  // Update UI
  UI.ChannelListUI.renderChannels();
  document.getElementById('messages').innerHTML = '';
  
  // Show member list panel
  document.getElementById('member-list-container').style.display = 'flex';
  
  // Fetch server members
  fetchServerMembers();
  
  // Fetch messages
  fetchMessages(true);
  
  // Start polling for updates
  startMessagePolling();
}

// Create server
function createServer(name) {
  API.ServerAPI.createServer(name)
    .then(data => {
      if (data.server_id) {
        UI.showToast(`Server "${name}" created!`, 'success');
        API.ServerAPI.fetchServers()
          .then(() => {
            UI.ServerListUI.renderServers();
            selectServer(data.server_id);
          });
      }
    })
    .catch(err => {
      console.error("Error creating server:", err);
      UI.showToast(err.message || "Error creating server", 'error');
    });
}

// Delete server
function deleteServer(serverId) {
  const serverName = StateManager.dataCache.serverData[serverId]?.name || '';
  
  UI.DialogUI.showCustomConfirm('Delete Server', `Are you sure you want to delete the server "${serverName}"? This action cannot be undone.`)
    .then(confirmed => {
      if (!confirmed) return;
      
      API.ServerAPI.deleteServer(serverId)
        .then(() => {
          UI.showToast(`Server "${serverName}" deleted`, 'success');
          if (StateManager.appState.currentServer === serverId) {
            switchToDmMode(); // Default to DM view after deleting
          }
          API.ServerAPI.fetchServers()
            .then(() => UI.ServerListUI.renderServers());
        })
        .catch(err => {
          console.error("Error deleting server:", err);
          UI.showToast(err.message || "Error deleting server", 'error');
        });
    });
}

// Create channel
function createChannel() {
  if (!StateManager.appState.currentServer) {
    UI.showToast("Select a server first", 'error');
    return;
  }
  
  UI.DialogUI.showCustomPrompt('New Channel', 'Enter channel name:')
    .then(name => {
      if (!name || !name.trim()) return;
      
      API.ChannelAPI.createChannel(StateManager.appState.currentServer, name.trim())
        .then(data => {
          if (data.channel_id) {
            UI.showToast(`Channel #${name} created`, 'success');
            fetchChannels()
              .then(() => selectChannel(data.channel_id));
          }
        })
        .catch(err => {
          console.error("Error creating channel:", err);
          UI.showToast(err.message || "Error creating channel", 'error');
        });
    });
}

// Edit channel
function editChannel(channelId, currentName) {
  UI.DialogUI.showCustomPrompt('Edit Channel', 'Enter new channel name:', currentName)
    .then(name => {
      if (!name || !name.trim() || name.trim() === currentName) return;
      
      API.ChannelAPI.editChannel(StateManager.appState.currentServer, channelId, name.trim())
        .then(() => {
          UI.showToast('Channel renamed', 'success');
          fetchChannels();
        })
        .catch(err => {
          console.error("Error editing channel:", err);
          UI.showToast(err.message || "Error editing channel", 'error');
        });
    });
}

// Delete channel
function deleteChannel(channelId) {
  UI.DialogUI.showCustomConfirm('Delete Channel', 'Are you sure you want to delete this channel?')
    .then(confirmed => {
      if (!confirmed) return;
      
      API.ChannelAPI.deleteChannel(StateManager.appState.currentServer, channelId)
        .then(() => {
          UI.showToast('Channel deleted', 'success');
          if (StateManager.appState.currentChannel === channelId) {
            StateManager.appState.currentChannel = null;
            document.getElementById('messages').innerHTML = '';
            stopMessagePolling();
          }
          fetchChannels();
        })
        .catch(err => {
          console.error("Error deleting channel:", err);
          UI.showToast(err.message || "Error deleting channel", 'error');
        });
    });
}

// Leave server
function leaveServer(serverId) {
  const serverName = StateManager.dataCache.serverData[serverId]?.name || '';
  
  UI.DialogUI.showCustomConfirm('Leave Server', `Are you sure you want to leave the server "${serverName}"?`)
    .then(confirmed => {
      if (!confirmed) return;
      
      API.ServerAPI.leaveServer(serverId)
        .then(() => {
          UI.showToast(`Left server "${serverName}"`, 'success');
          if (StateManager.appState.currentServer === serverId) {
            switchToDmMode(); // Default to DM view after leaving
          }
          API.ServerAPI.fetchServers()
            .then(() => UI.ServerListUI.renderServers());
        })
        .catch(err => {
          console.error("Error leaving server:", err);
          UI.showToast(err.message || "Error leaving server", 'error');
        });
    });
}

// Create invite
function createInvite() {
  if (!StateManager.appState.currentServer) return;
  
  const expirySelect = document.getElementById('invite-expiry');
  const expiresIn = parseInt(expirySelect.value);
  
  API.ServerAPI.createInvite(StateManager.appState.currentServer, expiresIn)
    .then(data => {
      if (data.invite_code) {
        const inviteLink = `http://${window.location.host}/invite/${data.invite_code}`;
        document.getElementById('invite-link').value = inviteLink;
        UI.showToast('Invite created!', 'success');
      }
    })
    .catch(err => {
      console.error("Error creating invite:", err);
      UI.showToast(err.message || "Error creating invite", 'error');
    });
}

// Join server with invite code
function joinServer(inviteCode) {
  if (!inviteCode.trim()) {
    UI.showToast('Please enter an invite code', 'error');
    return;
  }
  
  const statusElement = document.getElementById('join-server-status');
  statusElement.textContent = 'Joining server...';
  
  API.ServerAPI.joinServer(inviteCode.trim())
    .then(data => {
      if (data.server_id) {
        UI.showToast(`Joined server: ${data.server_name}`, 'success');
        UI.closeAllModals();
        API.ServerAPI.fetchServers()
          .then(() => {
            UI.ServerListUI.renderServers();
            selectServer(data.server_id);
          });
      }
    })
    .catch(err => {
      console.error("Error joining server:", err);
      statusElement.textContent = err.message || "Error joining server";
    });
}

// Friend and DM functions
function sendFriendRequest(username) {
  if (!username || !username.trim()) {
    UI.showToast('Please enter a username', 'error');
    return;
  }
  
  const statusElement = document.getElementById('friend-request-status');
  statusElement.textContent = 'Sending request...';
  
  API.FriendAPI.sendFriendRequest(username.trim())
    .then(() => {
      statusElement.textContent = 'Friend request sent!';
      document.getElementById('friend-username').value = '';
      setTimeout(() => UI.closeAllModals(), 2000);
    })
    .catch(err => {
      console.error("Error sending friend request:", err);
      statusElement.textContent = err.message || "An error occurred. Please try again.";
    });
}

function acceptFriendRequest(username) {
  API.FriendAPI.acceptFriendRequest(username)
    .then(() => {
      UI.showToast(`You are now friends with ${username}`, 'success');
      Promise.all([
        API.FriendAPI.fetchFriends().then(() => UI.FriendsUI.renderFriends()),
        API.FriendAPI.fetchFriendRequests().then(() => UI.FriendsUI.renderFriendRequests()),
        API.MessageAPI.fetchDms().then(() => UI.DmListUI.renderDms())
      ]);
    })
    .catch(err => {
      console.error("Error accepting friend request:", err);
      UI.showToast(err.message || "Error accepting friend request", 'error');
    });
}

function rejectFriendRequest(username) {
  API.FriendAPI.rejectFriendRequest(username)
    .then(() => {
      UI.showToast(`Friend request from ${username} rejected`, 'info');
      API.FriendAPI.fetchFriendRequests()
        .then(() => UI.FriendsUI.renderFriendRequests());
    })
    .catch(err => {
      console.error("Error rejecting friend request:", err);
      UI.showToast(err.message || "Error rejecting friend request", 'error');
    });
}

function startDmWithUser(username) {
  // First check if there's already a DM with this user
  const existingDm = StateManager.dataCache.dmsData.find(dm => 
    !dm.is_group && dm.other_user === username
  );
  
  if (existingDm) {
    openDm(existingDm.dm_id);
    return;
  }
  
  // Otherwise, create a new DM by sending the first message
  UI.DialogUI.showCustomPrompt(`Message ${username}`, `What would you like to say to ${username}?`)
    .then(content => {
      if (!content || !content.trim()) return;
      
      API.MessageAPI.sendDirectMessage(username, content.trim())
        .then(data => {
          if (data.dm_id) {
            switchToDmMode();
            API.MessageAPI.fetchDms()
              .then(() => {
                UI.DmListUI.renderDms();
                openDm(data.dm_id);
              });
          }
        })
        .catch(err => {
          console.error("Error starting DM:", err);
          UI.showToast(err.message || "Error starting conversation", 'error');
        });
    });
}

function openDm(dmId) {
  StateManager.appState.inDmMode = true;
  StateManager.appState.currentDm = dmId;
  StateManager.appState.currentServer = null;
  StateManager.appState.currentChannel = null;
  StateManager.resetMessageTracking();
  
  // Save state
  StateManager.saveAppState();
  
  UI.ServerListUI.renderServers();
  UI.DmListUI.renderDms();
  
  // Show loading message
  document.getElementById('messages').innerHTML = '<div class="loading">Loading messages...</div>';
  
  // For group chats, fetch and display members
  const currentDm = StateManager.dataCache.dmsData.find(dm => dm.dm_id === dmId);
  if (currentDm && currentDm.is_group) {
    fetchGroupMembers(dmId);
    document.getElementById('member-list-container').style.display = 'flex';
  } else {
    document.getElementById('member-list-container').style.display = 'none';
  }
  
  API.MessageAPI.fetchDmMessages(dmId)
    .then(data => {
      if (data.messages) {
        UI.MessageUI.renderMessages(data.messages);
        startMessagePolling();
      }
    })
    .catch(err => {
      console.error("Error fetching DM messages:", err);
      document.getElementById('messages').innerHTML = '<div class="error">Error loading messages</div>';
      UI.showToast(err.message || "Error loading messages", 'error');
    });
}

// Fetch group members
function fetchGroupMembers(groupId) {
  const currentDm = StateManager.dataCache.dmsData.find(dm => dm.dm_id === groupId);
  
  if (currentDm && currentDm.is_group && currentDm.users) {
    // Format users for member list display
    const members = currentDm.users.map(username => {
      return {
        username: username,
        role: username === currentDm.owner ? 'owner' : 'member'
      };
    });
    
    // Update member list UI
    UI.MemberListUI.renderMemberList(members);
    
    // Update channel header with group name
    if (document.getElementById('channel-header').querySelector('h3')) {
      document.getElementById('channel-header').querySelector('h3').textContent = currentDm.name;
    }
  }
}

// Create group chat
function createGroupChat() {
  const groupName = document.getElementById('group-name').value;
  if (!groupName.trim()) {
    UI.showToast('Please enter a group name', 'error');
    return;
  }
  
  // Get selected friends
  const selectedFriends = Array.from(document.querySelectorAll('#friend-selection input:checked'))
    .map(checkbox => checkbox.value);
  
  if (selectedFriends.length === 0) {
    UI.showToast('Please select at least one friend', 'error');
    return;
  }
  
  // Add current user to group
  const users = [...selectedFriends, API.currentUsername];
  
  API.MessageAPI.createGroupChat(groupName.trim(), users)
    .then(data => {
      if (data.group_id) {
        UI.showToast('Group chat created!', 'success');
        UI.closeAllModals();
        switchToDmMode();
        API.MessageAPI.fetchDms()
          .then(() => {
            UI.DmListUI.renderDms();
            openDm(data.group_id);
          });
      }
    })
    .catch(err => {
      console.error("Error creating group chat:", err);
      UI.showToast(err.message || "Error creating group chat", 'error');
    });
}

// Message functions
function fetchMessages(initialLoad = false) {
  let fetchPromise;
  
  if (StateManager.appState.inDmMode && StateManager.appState.currentDm) {
    fetchPromise = API.MessageAPI.fetchDmMessages(
      StateManager.appState.currentDm, 
      initialLoad ? 0 : StateManager.appState.lastMessageTimestamp
    );
  } else if (StateManager.appState.currentServer && StateManager.appState.currentChannel) {
    fetchPromise = API.MessageAPI.fetchMessages(
      StateManager.appState.currentServer, 
      StateManager.appState.currentChannel,
      initialLoad ? 0 : StateManager.appState.lastMessageTimestamp
    );
  } else {
    return Promise.resolve(); // Nothing to fetch
  }
  
  return fetchPromise
    .then(data => {
      const messages = StateManager.appState.inDmMode ? data.messages : data;
      if (messages && Object.keys(messages).length > 0) {
        UI.MessageUI.renderMessages(messages, !initialLoad);
      }
    })
    .catch(err => {
      console.error("Error fetching messages:", err);
      UI.showToast(err.message || "Error loading messages", 'error');
    });
}  // Send message
function sendMessage(content) {
  if (!content.trim()) return Promise.resolve();
  
  // Check if user is timed out in current server
  if (StateManager.appState.currentServer && !StateManager.appState.inDmMode) {
    const server = StateManager.dataCache.serverData[StateManager.appState.currentServer];
    if (server && server.timeouts && server.timeouts[API.currentUsername]) {
      const timeout = server.timeouts[API.currentUsername];
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (timeout.expires_at > currentTime) {
        // User is timed out - calculate remaining time
        const remainingSeconds = timeout.expires_at - currentTime;
        let timeText;
        
        if (remainingSeconds < 60) {
          timeText = `${remainingSeconds} seconds`;
        } else if (remainingSeconds < 3600) {
          timeText = `${Math.ceil(remainingSeconds / 60)} minutes`;
        } else if (remainingSeconds < 86400) {
          timeText = `${Math.ceil(remainingSeconds / 3600)} hours`;
        } else {
          timeText = `${Math.ceil(remainingSeconds / 86400)} days`;
        }
        
        // Show error with timeout information
        let errorMsg = `You cannot send messages (timed out for ${timeText})`;
        if (timeout.reason) {
          errorMsg += `\nReason: ${timeout.reason}`;
        }
        
        UI.showToast(errorMsg, 'error');
        return Promise.resolve();
      }
    }
  }
  
  let sendPromise;
  
  if (StateManager.appState.inDmMode && StateManager.appState.currentDm) {
    // Check if this is a direct message or group chat
    const currentDmData = StateManager.dataCache.dmsData.find(d => d.dm_id === StateManager.appState.currentDm);
    
    if (currentDmData?.is_group) {
      sendPromise = API.MessageAPI.sendGroupMessage(StateManager.appState.currentDm, content.trim());
    } else {
      sendPromise = API.MessageAPI.sendDirectMessage(currentDmData?.other_user, content.trim());
    }
  } else if (StateManager.appState.currentServer && StateManager.appState.currentChannel) {
    sendPromise = API.MessageAPI.sendMessage(
      StateManager.appState.currentServer, 
      StateManager.appState.currentChannel, 
      content.trim()
    );
  } else {
    UI.showToast('No channel or conversation selected', 'error');
    return Promise.resolve();
  }
  
  // Add optimistic message (to be replaced when real message arrives)
  const tempId = 'temp-' + Date.now();
  const tempMessage = {
    author: API.currentUsername,
    content: content.trim(),
    timestamp: Date.now(),
    isPending: true // Mark as pending
  };
  
  const tempMessages = { [tempId]: tempMessage };
  UI.MessageUI.renderMessages(tempMessages, true);
  
  return sendPromise
    .then(response => {
      // When we get a response, add the server message ID to our known IDs
      // This prevents duplicate messages when polling
      if (response && response.message_id) {
        StateManager.dataCache.knownMessageIds.add(response.message_id.toString());
      }
      return response;
    })
    .catch(err => {
      console.error("Error sending message:", err);
      UI.showToast(err.message || "Error sending message", 'error');
      
      // Remove the optimistic message on error
      const tempElement = document.getElementById('messages').querySelector(`[data-id="${tempId}"]`);
      if (tempElement) {
        document.getElementById('messages').removeChild(tempElement);
      }
    });
}

// Start polling for new messages
function startMessagePolling() {
  stopMessagePolling();
  
  StateManager.intervals.messagePolling = setInterval(() => {
    if ((StateManager.appState.currentServer && StateManager.appState.currentChannel) || 
        (StateManager.appState.inDmMode && StateManager.appState.currentDm)) {
      fetchMessages(false);
    }
  }, MESSAGE_POLLING_INTERVAL);
}

// Stop polling for messages
function stopMessagePolling() {
  if (StateManager.intervals.messagePolling) {
    clearInterval(StateManager.intervals.messagePolling);
    StateManager.intervals.messagePolling = null;
  }
}

// Start polling for friend requests
function startFriendsPolling() {
  StateManager.intervals.friendsPolling = setInterval(() => {
    API.FriendAPI.fetchFriendRequests()
      .then(() => UI.FriendsUI.renderFriendRequests());
  }, FRIENDS_POLLING_INTERVAL);
}

// Initialize chat functionality
function initialize() {
  // Load saved state
  StateManager.loadAppState();
  
  API.checkAuth().then(valid => {
    if (valid) {
      // Load data
      Promise.all([
        API.ServerAPI.fetchServers().then(() => UI.ServerListUI.renderServers()),
        API.FriendAPI.fetchFriends().then(() => UI.FriendsUI.renderFriends()),
        API.FriendAPI.fetchFriendRequests().then(() => UI.FriendsUI.renderFriendRequests()),
        API.MessageAPI.fetchDms().then(() => UI.DmListUI.renderDms())
      ]).then(() => {
        // Restore last active view based on saved state
        if (StateManager.appState.inDmMode) {
          switchToDmMode();
          if (StateManager.appState.currentDm) {
            openDm(StateManager.appState.currentDm);
          }
        } else if (StateManager.appState.currentServer) {
          selectServer(StateManager.appState.currentServer);
        } else {
          switchToDmMode(); // Default to DM mode
        }
      });
      
      // Start polling for friend requests
      startFriendsPolling();
      
      // Setup context menus
      ContextMenus.setupContextMenus();
    }
  });
}

// Export module
window.ChatManager = {
  selectServer,
  switchToDmMode,
  selectChannel,
  createServer,
  deleteServer,
  editChannel,
  createChannel,
  deleteChannel,
  leaveServer,
  createInvite,
  joinServer,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  startDmWithUser,
  openDm,
  createGroupChat,
  sendMessage,
  startMessagePolling,
  stopMessagePolling,
  initialize
};
