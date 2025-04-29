// UI module
// Handles UI rendering and DOM manipulation

// Toast notification
function showToast(message, type = 'info') {
  console.log(`Attempting to show toast: ${message} of type ${type}`)
  const toast = document.getElementById('toast');
  
  // Clear existing content
  toast.innerHTML = '';
  
  // Add message content
  const messageSpan = document.createElement('span');
  messageSpan.textContent = message;
  toast.appendChild(messageSpan);
  
  // Add close button
  const closeButton = document.createElement('span');
  closeButton.className = 'toast-close';
  closeButton.innerHTML = '&times;';
  closeButton.onclick = function() {
    toast.style.animation = 'fadeOut 0.3s forwards';
    setTimeout(() => {
      toast.style.display = 'none';
      toast.style.animation = '';
    }, 300);
  };
  toast.appendChild(closeButton);
  
  // Apply styles
  toast.className = 'toast';
  toast.classList.add(type);
  toast.style.display = 'flex';
  
  // Auto-hide after 5 seconds
  const toastTimeout = setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s forwards';
    setTimeout(() => {
      toast.style.display = 'none';
      toast.style.animation = '';
    }, 300);
  }, 5000);
}

// Generate avatar color based on username
function getAvatarColor(username) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    '#5865F2', '#57F287', '#FEE75C', '#EB459E', '#ED4245',
    '#9B59B6', '#3498DB', '#2ECC71', '#F1C40F', '#E67E22'
  ];
  
  return colors[Math.abs(hash) % colors.length];
}

// Format timestamp into readable format
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Close all modals
function closeAllModals() {
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    modal.style.display = 'none';
  });
}

// UI elements - Server list
const ServerListUI = {
  renderServers: function() {
    const serverList = document.getElementById('server-list');
    serverList.innerHTML = '';
    
    // Add home/DM button
    const homeBtn = document.createElement('div');
    homeBtn.className = 'server-icon home-icon';
    homeBtn.style.backgroundColor = '#5865F2';
    homeBtn.innerHTML = '<i>DM</i>';
    homeBtn.title = 'Home';
    homeBtn.onclick = () => ChatManager.switchToDmMode();
    if (StateManager.appState.inDmMode) {
      homeBtn.classList.add('selected');
    }
    serverList.appendChild(homeBtn);
    
    // Add separator
    const separator = document.createElement('div');
    separator.className = 'server-separator';
    serverList.appendChild(separator);
    
    // Add server icons
    Object.entries(StateManager.dataCache.serverData).forEach(([sid, s]) => {
      const btn = document.createElement('div');
      btn.className = 'server-icon';
      btn.title = s.name;
      btn.innerText = s.name[0].toUpperCase();
      btn.onclick = () => ChatManager.selectServer(sid);
      if (sid === StateManager.appState.currentServer && !StateManager.appState.inDmMode) {
        btn.classList.add('selected');
      }
      serverList.appendChild(btn);
    });
  }
};

// UI elements - Channel list
const ChannelListUI = {
  renderChannels: function() {
    const channelList = document.getElementById('channel-list');
    channelList.innerHTML = '';
    
    if (!StateManager.appState.currentServer || 
        !StateManager.dataCache.serverData[StateManager.appState.currentServer]) return;
    
    const server = StateManager.dataCache.serverData[StateManager.appState.currentServer];
    const channels = server.channels || {};
    
    // Update server header title
    const serverHeaderTitle = document.getElementById('server-header').querySelector('h3');
    serverHeaderTitle.textContent = server.name;
    
    // Render channel items
    Object.entries(channels).forEach(([cid, c]) => {
      const li = document.createElement('li');
      
      // Channel name
      const nameSpan = document.createElement('span');
      nameSpan.className = 'channel-name';
      nameSpan.textContent = c.name;
      li.appendChild(nameSpan);
      
      // Channel actions
      if (server.owner === API.currentUsername) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'channel-actions';
        
        const editBtn = document.createElement('button');
        editBtn.textContent = '✎';
        editBtn.title = 'Edit';
        editBtn.onclick = (e) => {
          e.stopPropagation();
          ChatManager.editChannel(cid, c.name);
        };
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '×';
        deleteBtn.title = 'Delete';
        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          ChatManager.deleteChannel(cid);
        };
        
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
        li.appendChild(actionsDiv);
      }
      
      // Select channel on click
      li.onclick = () => ChatManager.selectChannel(cid);
      if (cid === StateManager.appState.currentChannel) {
        li.classList.add('selected');
      }
      
      channelList.appendChild(li);
    });
  }
};

// UI elements - Friends list
const FriendsUI = {
  renderFriends: function() {
    const friendList = document.getElementById('friend-list');
    friendList.innerHTML = '';
    
    if (StateManager.dataCache.friendsData.length === 0) {
      const noFriendsMsg = document.createElement('div');
      noFriendsMsg.className = 'empty-message';
      noFriendsMsg.textContent = 'No friends yet';
      friendList.appendChild(noFriendsMsg);
      return;
    }
    
    StateManager.dataCache.friendsData.forEach(username => {
      const friendDiv = document.createElement('div');
      friendDiv.className = 'friend-item';
      
      // Avatar
      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      avatar.style.backgroundColor = getAvatarColor(username);
      avatar.textContent = username[0].toUpperCase();
      friendDiv.appendChild(avatar);
      
      // Name
      const nameSpan = document.createElement('span');
      nameSpan.className = 'friend-name';
      nameSpan.textContent = username;
      friendDiv.appendChild(nameSpan);
      
      // Actions
      const actionBtn = document.createElement('button');
      actionBtn.className = 'small-button';
      actionBtn.textContent = 'Message';
      actionBtn.onclick = (e) => {
        e.stopPropagation();
        ChatManager.startDmWithUser(username);
      };
      friendDiv.appendChild(actionBtn);
      
      friendList.appendChild(friendDiv);
    });
  },
  
  renderFriendRequests: function() {
    const requestsContainer = document.getElementById('incoming-requests');
    requestsContainer.innerHTML = '';
    
    // Update request count badge
    const requestCountElement = document.getElementById('request-count');
    requestCountElement.textContent = StateManager.dataCache.pendingRequests.length;
    
    // Show/hide badge based on request count
    if (StateManager.dataCache.pendingRequests.length > 0) {
      requestCountElement.classList.add('request-badge');
    } else {
      requestCountElement.classList.remove('request-badge');
    }
    
    if (StateManager.dataCache.pendingRequests.length === 0) {
      requestsContainer.innerHTML = '<p>No pending friend requests.</p>';
      return;
    }
    
    StateManager.dataCache.pendingRequests.forEach(username => {
      const requestDiv = document.createElement('div');
      requestDiv.className = 'request-item';
      
      // Avatar
      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      avatar.style.backgroundColor = getAvatarColor(username);
      avatar.textContent = username[0].toUpperCase();
      requestDiv.appendChild(avatar);
      
      // Username
      const nameSpan = document.createElement('span');
      nameSpan.className = 'request-user';
      nameSpan.textContent = username;
      requestDiv.appendChild(nameSpan);
      
      // Actions
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'request-actions';
      
      const acceptBtn = document.createElement('button');
      acceptBtn.textContent = 'Accept';
      acceptBtn.className = 'accept-btn';
      acceptBtn.onclick = () => ChatManager.acceptFriendRequest(username);
      
      const rejectBtn = document.createElement('button');
      rejectBtn.textContent = 'Reject';
      rejectBtn.className = 'reject-btn';
      rejectBtn.onclick = () => ChatManager.rejectFriendRequest(username);
      
      actionsDiv.appendChild(acceptBtn);
      actionsDiv.appendChild(rejectBtn);
      requestDiv.appendChild(actionsDiv);
      
      requestsContainer.appendChild(requestDiv);
    });
  }
};

// UI elements - DM list
const DmListUI = {
  renderDms: function() {
    const dmList = document.getElementById('dm-list');
    dmList.innerHTML = '';
    
    if (StateManager.dataCache.dmsData.length === 0) {
      const noDmsMsg = document.createElement('div');
      noDmsMsg.className = 'empty-message';
      noDmsMsg.textContent = 'No conversations yet';
      dmList.appendChild(noDmsMsg);
      return;
    }
    
    StateManager.dataCache.dmsData.forEach(dm => {
      const dmDiv = document.createElement('div');
      dmDiv.className = 'dm-item';
      if (StateManager.appState.currentDm === dm.dm_id) {
        dmDiv.classList.add('active');
      }
      
      // Avatar
      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      
      // Display different styling for group vs direct message
      if (dm.is_group) {
        avatar.style.backgroundColor = '#7289da';
        avatar.textContent = 'G';
      } else {
        avatar.style.backgroundColor = getAvatarColor(dm.other_user);
        avatar.textContent = dm.other_user[0].toUpperCase();
      }
      dmDiv.appendChild(avatar);
      
      // Name
      const nameSpan = document.createElement('span');
      nameSpan.className = 'dm-name';
      nameSpan.textContent = dm.is_group ? dm.name : dm.other_user;
      dmDiv.appendChild(nameSpan);
      
      // Click handler
      dmDiv.onclick = () => ChatManager.openDm(dm.dm_id);
      
      dmList.appendChild(dmDiv);
    });
  }
};

// UI elements - Messages
const MessageUI = {
  renderMessages: function(messages, isAppend = false) {
    const messagesContainer = document.getElementById('messages');
    
    if (!isAppend) {
      messagesContainer.innerHTML = '';
      StateManager.dataCache.knownMessageIds.clear();
    }
    
    // Store scroll position
    const isAtBottom = messagesContainer.scrollHeight - messagesContainer.clientHeight - messagesContainer.scrollTop < 30;
    
    let hasNewMessages = false;
      Object.entries(messages).forEach(([mid, msg]) => {
      // Skip messages we've already shown
      if (StateManager.dataCache.knownMessageIds.has(mid)) {
        return;
      }
      
      // Check if this is a server-confirmed message that matches a pending one
      if (!mid.startsWith('temp-') && !msg.isPending && msg.author === API.currentUsername) {
        // Try to find and remove any pending messages from the current user
        const pendingMessages = messagesContainer.querySelectorAll('.message.pending');
        pendingMessages.forEach(pendingMsg => {
          // Compare content to match the pending message with the confirmed one
          const pendingContent = pendingMsg.querySelector('.content').textContent;
          if (pendingContent === msg.content && pendingMsg.dataset.author === msg.author) {
            pendingMsg.remove(); // Remove the pending message since we'll add the confirmed one
          }
        });
      }
      
      StateManager.dataCache.knownMessageIds.add(mid);
      hasNewMessages = true;
      
      // Update latest timestamp for future polling
      if (msg.timestamp > StateManager.appState.lastMessageTimestamp) {
        StateManager.appState.lastMessageTimestamp = msg.timestamp;
      }
      
      const msgDiv = document.createElement('div');
      msgDiv.className = 'message';
      
      // Mark pending messages with a different style
      if (msg.isPending) {
        msgDiv.classList.add('pending');
      }
      
      msgDiv.dataset.id = mid;
      
      // Avatar
      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      
      // Style system messages differently
      if (msg.author === 'system' || msg.is_system) {
        avatar.style.backgroundColor = '#7289da';
        avatar.textContent = 'S';
      } else {
        avatar.style.backgroundColor = getAvatarColor(msg.author);
        avatar.textContent = msg.author[0].toUpperCase();
      }
      
      // Content wrapper
      const contentDiv = document.createElement('div');
      contentDiv.className = 'content';
      
      // Author and timestamp header
      const authorDiv = document.createElement('div');
      authorDiv.className = 'author';
      authorDiv.textContent = msg.author;
      
      if (msg.timestamp) {
        const timestampSpan = document.createElement('span');
        timestampSpan.className = 'timestamp';
        timestampSpan.textContent = formatTimestamp(msg.timestamp);
        authorDiv.appendChild(timestampSpan);
      }
      
      contentDiv.appendChild(authorDiv);
      contentDiv.appendChild(document.createTextNode(msg.content));
      
      msgDiv.appendChild(avatar);
      msgDiv.appendChild(contentDiv);
      messagesContainer.appendChild(msgDiv);
    });
    
    // Auto-scroll to bottom for new messages if already at bottom
    if (hasNewMessages && isAtBottom) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }
};

// UI elements - Member list
const MemberListUI = {
  renderMemberList: function(members) {
    const memberListContainer = document.getElementById('member-list');
    memberListContainer.innerHTML = '';
    
    if (!members || members.length === 0) {
      const noMembersMsg = document.createElement('div');
      noMembersMsg.className = 'empty-message';
      noMembersMsg.textContent = 'No members';
      memberListContainer.appendChild(noMembersMsg);
      return;
    }
    
    members.forEach(member => {
      const memberDiv = document.createElement('div');
      memberDiv.className = 'member-item';
      
      // If member is timed out, add timeout indicator
      if (member.timeout) {
        const timeoutIndicator = document.createElement('div');
        timeoutIndicator.className = 'timeout-indicator';
        
        // Add color based on severity
        const timeRemaining = member.timeout.expires_at - Math.floor(Date.now() / 1000);
        if (timeRemaining < 300) { // Less than 5 minutes
          timeoutIndicator.classList.add('red');
        } else if (timeRemaining < 3600) { // Less than 1 hour
          timeoutIndicator.classList.add('yellow');
        }
        
        // Add tooltip with timeout info
        const formattedTime = new Date(member.timeout.expires_at * 1000).toLocaleString();
        timeoutIndicator.title = `Timed out until: ${formattedTime}`;
        if (member.timeout.reason) {
          timeoutIndicator.title += `\nReason: ${member.timeout.reason}`;
        }
        
        memberDiv.appendChild(timeoutIndicator);
      }
      
      // Avatar
      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      avatar.style.backgroundColor = getAvatarColor(member.username);
      avatar.textContent = member.username[0].toUpperCase();
      memberDiv.appendChild(avatar);
      
      // Username
      const nameSpan = document.createElement('span');
      nameSpan.className = 'member-name';
      
      // Show nickname if available
      if (member.nickname) {
        nameSpan.textContent = member.nickname;
        nameSpan.title = member.username;
      } else {
        nameSpan.textContent = member.username;
      }
      
      // Add role indicator if applicable
      if (member.role === 'owner') {
        nameSpan.classList.add('owner');
      } else if (member.role === 'admin') {
        nameSpan.classList.add('admin');
      }
      
      memberDiv.appendChild(nameSpan);
      
      memberListContainer.appendChild(memberDiv);
    });
  }
};

// Dialog system
const DialogUI = {
  showCustomPrompt: function(title, message, defaultValue = '', confirmText = 'Confirm') {
    return new Promise((resolve, reject) => {
      const dialog = document.getElementById('custom-prompt');
      document.getElementById('prompt-title').textContent = title;
      document.getElementById('prompt-message').textContent = message;
      
      const input = document.getElementById('prompt-input');
      input.value = defaultValue;
      
      document.getElementById('prompt-confirm').textContent = confirmText;
      
      // Show the dialog
      dialog.style.display = 'block';
      input.focus();
      
      // Handle buttons
      function handleConfirm() {
        dialog.style.display = 'none';
        resolve(input.value);
        cleanup();
      }
      
      function handleCancel() {
        dialog.style.display = 'none';
        resolve(null);
        cleanup();
      }
      
      function cleanup() {
        document.getElementById('prompt-confirm').removeEventListener('click', handleConfirm);
        document.getElementById('prompt-cancel').removeEventListener('click', handleCancel);
      }
      
      document.getElementById('prompt-confirm').addEventListener('click', handleConfirm);
      document.getElementById('prompt-cancel').addEventListener('click', handleCancel);
      
      // Handle Enter key
      input.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
          handleConfirm();
        }
      });
    });
  },
  
  showCustomConfirm: function(title, message, confirmText = 'Confirm', isDanger = true) {
    return new Promise((resolve) => {
      const dialog = document.getElementById('custom-confirm');
      document.getElementById('confirm-title').textContent = title;
      document.getElementById('confirm-message').textContent = message;
      
      const confirmBtn = document.getElementById('confirm-confirm');
      confirmBtn.textContent = confirmText;
      
      if (isDanger) {
        confirmBtn.className = 'btn-danger';
      } else {
        confirmBtn.className = 'btn-confirm';
      }
      
      // Show the dialog
      dialog.style.display = 'block';
      
      // Handle buttons
      function handleConfirm() {
        dialog.style.display = 'none';
        resolve(true);
        cleanup();
      }
      
      function handleCancel() {
        dialog.style.display = 'none';
        resolve(false);
        cleanup();
      }
      
      function cleanup() {
        document.getElementById('confirm-confirm').removeEventListener('click', handleConfirm);
        document.getElementById('confirm-cancel').removeEventListener('click', handleCancel);
      }
      
      document.getElementById('confirm-confirm').addEventListener('click', handleConfirm);
      document.getElementById('confirm-cancel').addEventListener('click', handleCancel);
    });
  }
};

// UI elements - Modals
const ModalUI = {
  openFriendRequestModal: function() {
    document.getElementById('friend-request-modal').style.display = 'block';
    API.FriendAPI.fetchFriendRequests().then(() => {
      FriendsUI.renderFriendRequests();
    });
  },
  
  openAddFriendModal: function() {
    document.getElementById('add-friend-modal').style.display = 'block';
    document.getElementById('friend-username').value = '';
    document.getElementById('friend-request-status').textContent = '';
  },
  
  openCreateServerModal: function() {
    DialogUI.showCustomPrompt('Create Server', 'Enter server name:')
      .then(name => {
        if (!name || !name.trim()) return;
        ChatManager.createServer(name.trim());
      });
  },
  
  openJoinServerModal: function() {
    document.getElementById('join-server-modal').style.display = 'block';
    document.getElementById('invite-code').value = '';
    document.getElementById('join-server-status').textContent = '';
  },
  
  openCreateGroupModal: function() {
    const modal = document.getElementById('create-group-modal');
    modal.style.display = 'block';
    document.getElementById('group-name').value = '';
    
    // Populate friend selection
    const friendSelection = document.getElementById('friend-selection');
    friendSelection.innerHTML = '';
    
    if (StateManager.dataCache.friendsData.length === 0) {
      friendSelection.innerHTML = '<p>You need to add friends first.</p>';
      return;
    }
    
    StateManager.dataCache.friendsData.forEach(username => {
      const div = document.createElement('div');
      div.className = 'friend-checkbox';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = username;
      checkbox.id = `friend-${username}`;
      
      const label = document.createElement('label');
      label.htmlFor = `friend-${username}`;
      label.textContent = username;
      
      div.appendChild(checkbox);
      div.appendChild(label);
      friendSelection.appendChild(div);
    });
  },
  
  openCreateInviteModal: function() {
    document.getElementById('create-invite-modal').style.display = 'block';
    document.getElementById('invite-link').value = '';
  },
  
  copyInviteLink: function() {
    const inviteLink = document.getElementById('invite-link');
    inviteLink.select();
    inviteLink.setSelectionRange(0, 99999);
    document.execCommand('copy');
    showToast('Invite link copied to clipboard', 'success');
  },
  
  openSettingsModal: function() {
    const modal = document.getElementById('settings-modal');
    modal.style.display = 'flex';
  },
  
  openProfileEditModal: function() {
    const modal = document.getElementById('profile-edit-modal');
    modal.style.display = 'flex';
  },
  
  openViewProfileModal: function() {
    const modal = document.getElementById('view-profile-modal');
    modal.style.display = 'flex';
  },
  
  closeAllModals: function() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => modal.style.display = 'none');
  }
};

// Export module
window.UI = {
  showToast,
  getAvatarColor,
  formatTimestamp,
  closeAllModals,
  ServerListUI,
  ChannelListUI,
  FriendsUI,
  DmListUI,
  MessageUI,
  MemberListUI,
  DialogUI,
  ModalUI
};
