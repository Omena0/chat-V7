// Event handlers module
// Sets up event listeners for UI interactions

function setupEventHandlers() {
  // Server header dropdown
  const serverHeader = document.getElementById('server-header');
  const serverHeaderMenu = document.getElementById('server-header-menu');
  
  serverHeader.addEventListener('click', function(e) {
    e.stopPropagation();
    if (StateManager.appState.currentServer) {
      serverHeaderMenu.classList.toggle('show');
    }
  });
  
  // Close dropdown when clicking elsewhere
  document.addEventListener('click', function() {
    serverHeaderMenu.classList.remove('show');
  });
  
  // Server menu item handlers
  document.getElementById('edit-server').addEventListener('click', function(e) {
    e.stopPropagation();
    if (!StateManager.appState.currentServer) return;
    
    const serverName = StateManager.dataCache.serverData[StateManager.appState.currentServer]?.name || '';
    UI.DialogUI.showCustomPrompt('Edit Server', 'Enter new server name:', serverName)
      .then(newName => {
        if (newName && newName.trim() && newName.trim() !== serverName) {
          API.ServerAPI.editServer(StateManager.appState.currentServer, newName.trim())
            .then(() => {
              UI.showToast('Server name updated', 'success');
              document.getElementById('server-header').querySelector('h3').textContent = newName.trim();
              API.ServerAPI.fetchServers()
                .then(() => UI.ServerListUI.renderServers());
            })
            .catch(err => {
              console.error("Error updating server:", err);
              UI.showToast(err.message || "Error updating server name", 'error');
            });
        }
      });
    
    serverHeaderMenu.classList.remove('show');
  });
  
  document.getElementById('create-invite').addEventListener('click', function(e) {
    e.stopPropagation();
    serverHeaderMenu.classList.remove('show');
    UI.ModalUI.openCreateInviteModal();
  });
  
  document.getElementById('server-settings').addEventListener('click', function(e) {
    e.stopPropagation();
    serverHeaderMenu.classList.remove('show');
    UI.showToast('Server settings coming soon', 'info');
  });
  
  document.getElementById('leave-server').addEventListener('click', function(e) {
    e.stopPropagation();
    serverHeaderMenu.classList.remove('show');
    ChatManager.leaveServer(StateManager.appState.currentServer);
  });
  
  document.getElementById('delete-server').addEventListener('click', function(e) {
    e.stopPropagation();
    serverHeaderMenu.classList.remove('show');
    ChatManager.deleteServer(StateManager.appState.currentServer);
  });

  // Friend and DM buttons
  document.getElementById('add-friend').addEventListener('click', UI.ModalUI.openAddFriendModal);
  document.getElementById('pending-requests').addEventListener('click', UI.ModalUI.openFriendRequestModal);
  document.getElementById('create-group-chat').addEventListener('click', UI.ModalUI.openCreateGroupModal);
  
  // Create server and channel buttons
  document.getElementById('create-server').addEventListener('click', UI.ModalUI.openCreateServerModal);
  document.getElementById('create-channel').addEventListener('click', ChatManager.createChannel);
  
  // Modal close buttons
  document.querySelectorAll('.close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      modal.style.display = 'none';
    });
  });
  
  // Close modals when clicking outside
  window.addEventListener('click', event => {
    document.querySelectorAll('.modal').forEach(modal => {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    });
  });
  
  // Friend request form
  document.getElementById('send-friend-request').addEventListener('click', () => {
    const username = document.getElementById('friend-username').value;
    ChatManager.sendFriendRequest(username);
  });
  
  // Join server form
  document.getElementById('join-with-invite').addEventListener('click', () => {
    const inviteCode = document.getElementById('invite-code').value;
    ChatManager.joinServer(inviteCode);
  });
  
  // Create group chat form
  document.getElementById('create-group-confirm').addEventListener('click', ChatManager.createGroupChat);
  
  // Generate invite button
  document.getElementById('generate-invite').addEventListener('click', ChatManager.createInvite);
  
  // Copy invite button
  document.getElementById('copy-invite').addEventListener('click', UI.ModalUI.copyInviteLink);
  
  // Message form
  document.getElementById('send-message-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('message-input');
    const content = input.value;
    input.value = '';
    
    ChatManager.sendMessage(content);
  });
  
  // Nickname modal events
  document.getElementById('save-nickname').addEventListener('click', function() {
    const username = document.getElementById('nickname-username').value;
    const serverId = document.getElementById('nickname-server-id').value;
    const nickname = document.getElementById('nickname-input').value;
    
    API.UserAPI.setNickname(serverId, username, nickname)
      .then(() => {
        UI.showToast(nickname ? `Nickname set for ${username}` : `Nickname reset for ${username}`, 'success');
        document.getElementById('nickname-modal').style.display = 'none';
        
        // Refresh the member list to show the updated nickname
        fetchServerMembers();
      })
      .catch(err => {
        console.error("Error setting nickname:", err);
        UI.showToast(err.message || "Error setting nickname", 'error');
      });
  });
  
  // Timeout modal events
  document.getElementById('confirm-timeout').addEventListener('click', function() {
    const username = document.getElementById('timeout-username').value;
    const serverId = document.getElementById('timeout-server-id').value;
    const duration = document.getElementById('timeout-duration').value;
    const reason = document.getElementById('timeout-reason').value;
    
    API.UserAPI.timeoutUser(serverId, username, duration, reason)
      .then(() => {
        const durationText = getDurationText(parseInt(duration));
        UI.showToast(`${username} timed out for ${durationText}`, 'success');
        document.getElementById('timeout-modal').style.display = 'none';

        // Refresh the member list to show the timeout status
        fetchServerMembers();
      })
      .catch(err => {
        console.error("Error timing out user:", err);
        UI.showToast(err.message || "Error timing out user", 'error');
      });
  });
  
  // Helper function to format duration text
  function getDurationText(seconds) {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
    return `${Math.floor(seconds / 86400)} days`;
  }
}

// Export module
window.EventHandlers = {
  setupEventHandlers
};
