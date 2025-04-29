// Context Menu module
// Handles right-click menus for servers, users, and groups

// Setup all context menus
function setupContextMenus() {
  const serverContextMenu = document.getElementById('server-context-menu');
  const userContextMenu = document.getElementById('user-context-menu');
  const groupContextMenu = document.getElementById('group-context-menu');
  
  // Hide all context menus when clicking elsewhere
  document.addEventListener('click', () => {
    serverContextMenu.style.display = 'none';
    userContextMenu.style.display = 'none';
    groupContextMenu.style.display = 'none';
  });
  
  // Prevent context menu from closing when clicking inside it
  [serverContextMenu, userContextMenu, groupContextMenu].forEach(menu => {
    menu.addEventListener('click', (e) => e.stopPropagation());
  });
  
  // Server icon right-click
  document.addEventListener('contextmenu', (e) => {
    // Check if target is a server icon
    if (e.target.classList.contains('server-icon') && !e.target.classList.contains('home-icon')) {
      e.preventDefault();
      
      // Find the server ID
      const serverElement = e.target;
      // We need to find which server this icon represents
      const serverName = serverElement.title;
      const serverId = Object.entries(StateManager.dataCache.serverData)
        .find(([_, s]) => s.name === serverName)?.[0];
      
      if (serverId) {
        const server = StateManager.dataCache.serverData[serverId];
        const isOwner = server.owner === API.currentUsername;
        
        // Store the server ID in the context menu
        serverContextMenu.dataset.serverId = serverId;
        
        // Show/hide options based on permissions
        document.getElementById('ctx-edit-server').style.display = isOwner ? 'flex' : 'none';
        document.getElementById('ctx-create-invite').style.display = isOwner ? 'flex' : 'none';
        document.getElementById('ctx-server-settings').style.display = isOwner ? 'flex' : 'none';
        document.getElementById('ctx-delete-server').style.display = isOwner ? 'flex' : 'none';
        document.getElementById('ctx-leave-server').style.display = !isOwner ? 'flex' : 'none';
        
        // Position and show the context menu
        serverContextMenu.style.top = `${e.clientY}px`;
        serverContextMenu.style.left = `${e.clientX}px`;
        serverContextMenu.style.display = 'block';
        
        // Hide other menus
        userContextMenu.style.display = 'none';
        groupContextMenu.style.display = 'none';
      }
    }    // Check if target is a friend or DM item
    else if (e.target.closest('.friend-item') || e.target.closest('.dm-item')) {
      e.preventDefault();
      
      const itemElement = e.target.closest('.friend-item') || e.target.closest('.dm-item');
      const dm = itemElement.classList.contains('dm-item') ? 
                StateManager.dataCache.dmsData.find(dm => 
                  dm.other_user === itemElement.querySelector('.dm-name').textContent || 
                  dm.name === itemElement.querySelector('.dm-name').textContent) : null;
                  
      const isGroup = dm && dm.is_group;
        if (isGroup) {
        // It's a group chat
        const groupName = itemElement.querySelector('.dm-name').textContent;
        const groupId = dm.dm_id;
        
        if (groupId) {
          // Store the group ID in the context menu
          groupContextMenu.dataset.groupId = groupId;
          groupContextMenu.dataset.groupName = groupName;
          
          // Show/hide options based on permissions
          const isOwner = dm.owner === API.currentUsername;
          
          // Settings is always visible but functionality may differ by role
          document.getElementById('ctx-group-settings').style.display = 'flex';
          
          // Only owners can add people to the group
          document.getElementById('ctx-add-people').style.display = isOwner ? 'flex' : 'none';
          
          // Only owners can disband the group
          document.getElementById('ctx-disband-group').style.display = isOwner ? 'flex' : 'none';
          
          // Only non-owners can leave (owners must transfer ownership first)
          document.getElementById('ctx-leave-group').style.display = !isOwner ? 'flex' : 'none';
          
          // Position and show the context menu
          groupContextMenu.style.top = `${e.clientY}px`;
          groupContextMenu.style.left = `${e.clientX}px`;
          groupContextMenu.style.display = 'block';
          
          // Hide other menus
          serverContextMenu.style.display = 'none';
          userContextMenu.style.display = 'none';
        }} else {
        // It's a user
        const username = itemElement.querySelector('.friend-name')?.textContent || 
                         itemElement.querySelector('.dm-name')?.textContent;
        
        if (username) {
          // Store the username in the context menu
          userContextMenu.dataset.username = username;
          
          // Check if this user is a friend
          const isFriend = StateManager.dataCache.friendsData.includes(username);
          
          // Show/hide options based on relationship
          document.getElementById('ctx-user-profile').style.display = 'flex';
          document.getElementById('ctx-send-dm').style.display = 'flex';
          document.getElementById('ctx-add-friend').style.display = isFriend ? 'none' : 'flex';
          document.getElementById('ctx-remove-friend').style.display = isFriend ? 'flex' : 'none';
          
          // Always hide server-specific options when in DM/friend context
          document.getElementById('ctx-kick-user').style.display = 'none';
          document.getElementById('ctx-ban-user').style.display = 'none';
          
          // Position and show the context menu
          userContextMenu.style.top = `${e.clientY}px`;
          userContextMenu.style.left = `${e.clientX}px`;
          userContextMenu.style.display = 'block';
          
          // Hide other menus
          serverContextMenu.style.display = 'none';
          groupContextMenu.style.display = 'none';
        }
      }
    }    // Check if target is a member
    else if (e.target.closest('.member-item')) {
      e.preventDefault();
      
      const memberElement = e.target.closest('.member-item');
      const username = memberElement.querySelector('.member-name').textContent;
      const originalUsername = memberElement.querySelector('.member-name').title || username;
      
      if (originalUsername && originalUsername !== API.currentUsername) {
        // Store the username in the context menu
        userContextMenu.dataset.username = originalUsername;
        
        // Check if this user is a friend
        const isFriend = StateManager.dataCache.friendsData.includes(originalUsername);
        
        // Determine context - server or group chat
        let isServerContext = false;
        let isGroupContext = false;
        let hasModPermissions = false;
        let isUserTimedOut = false;
        
        if (StateManager.appState.currentServer) {
          isServerContext = true;
          // Check if current user is server owner or admin (has manage_members permission)
          const server = StateManager.dataCache.serverData[StateManager.appState.currentServer];
          const isOwner = server && server.owner === API.currentUsername;
          const isAdmin = server && server.admins && server.admins.includes(API.currentUsername);
          hasModPermissions = isOwner || isAdmin;
          
          // Check if target user is timed out
          if (server && server.timeouts && server.timeouts[originalUsername]) {
            const timeoutExpiry = server.timeouts[originalUsername].expires_at;
            if (timeoutExpiry > Math.floor(Date.now() / 1000)) {
              isUserTimedOut = true;
            }
          }
        } else if (StateManager.appState.currentDm) {
          const currentDm = StateManager.dataCache.dmsData.find(dm => dm.dm_id === StateManager.appState.currentDm);
          if (currentDm && currentDm.is_group) {
            isGroupContext = true;
            hasModPermissions = currentDm.owner === API.currentUsername;
          }
        }
        
        // Show/hide options based on relationship and context
        document.getElementById('ctx-user-profile').style.display = 'flex';
        document.getElementById('ctx-send-dm').style.display = 'flex';
        document.getElementById('ctx-add-friend').style.display = isFriend ? 'none' : 'flex';
        document.getElementById('ctx-remove-friend').style.display = isFriend ? 'flex' : 'none';
        
        // Server-specific management actions
        document.getElementById('ctx-kick-user').style.display = (isServerContext && hasModPermissions) ? 'flex' : 'none';
        document.getElementById('ctx-ban-user').style.display = (isServerContext && hasModPermissions) ? 'flex' : 'none';
        document.getElementById('ctx-set-nickname').style.display = (isServerContext && (hasModPermissions || originalUsername === API.currentUsername)) ? 'flex' : 'none';
        document.getElementById('ctx-timeout-user').style.display = (isServerContext && hasModPermissions && !isUserTimedOut) ? 'flex' : 'none';
        document.getElementById('ctx-remove-timeout').style.display = (isServerContext && hasModPermissions && isUserTimedOut) ? 'flex' : 'none';
        
        // Position and show the context menu
        userContextMenu.style.top = `${e.clientY}px`;
        userContextMenu.style.left = `${e.clientX}px`;
        userContextMenu.style.display = 'block';
        
        // Hide other menus
        serverContextMenu.style.display = 'none';
        groupContextMenu.style.display = 'none';
      }
    }
  });
  
  // Initialize server context menu actions
  setupServerContextMenuActions();
  
  // Initialize user context menu actions
  setupUserContextMenuActions();
  
  // Initialize group context menu actions
  setupGroupContextMenuActions();
}

// Setup server context menu actions
function setupServerContextMenuActions() {
  document.getElementById('ctx-edit-server').addEventListener('click', () => {
    const serverId = document.getElementById('server-context-menu').dataset.serverId;
    if (serverId) {
      const serverName = StateManager.dataCache.serverData[serverId]?.name || '';
      UI.DialogUI.showCustomPrompt('Edit Server', 'Enter new server name:', serverName)
        .then(newName => {
          if (newName && newName.trim() && newName.trim() !== serverName) {
            API.ServerAPI.editServer(serverId, newName.trim())
              .then(() => {
                UI.showToast('Server name updated', 'success');
                if (StateManager.appState.currentServer === serverId) {
                  document.getElementById('server-header').querySelector('h3').textContent = newName.trim();
                }
                API.ServerAPI.fetchServers()
                  .then(() => UI.ServerListUI.renderServers());
              })
              .catch(err => {
                console.error("Error updating server:", err);
                UI.showToast(err.message || "Error updating server name", 'error');
              });
          }
        });
      document.getElementById('server-context-menu').style.display = 'none';
    }
  });
  
  document.getElementById('ctx-create-invite').addEventListener('click', () => {
    const serverId = document.getElementById('server-context-menu').dataset.serverId;
    if (serverId) {
      StateManager.appState.currentServer = serverId; // Set for invite creation
      UI.ModalUI.openCreateInviteModal();
      document.getElementById('server-context-menu').style.display = 'none';
    }
  });
  
  document.getElementById('ctx-server-settings').addEventListener('click', () => {
    const serverId = document.getElementById('server-context-menu').dataset.serverId;
    if (serverId) {
      UI.showToast('Server settings coming soon', 'info');
      document.getElementById('server-context-menu').style.display = 'none';
    }
  });
  
  document.getElementById('ctx-leave-server').addEventListener('click', () => {
    const serverId = document.getElementById('server-context-menu').dataset.serverId;
    if (serverId) {
      ChatManager.leaveServer(serverId);
      document.getElementById('server-context-menu').style.display = 'none';
    }
  });
  
  document.getElementById('ctx-delete-server').addEventListener('click', () => {
    const serverId = document.getElementById('server-context-menu').dataset.serverId;
    if (serverId) {
      ChatManager.deleteServer(serverId);
      document.getElementById('server-context-menu').style.display = 'none';
    }
  });
}

// Setup user context menu actions
function setupUserContextMenuActions() {
  document.getElementById('ctx-user-profile').addEventListener('click', () => {
    const username = document.getElementById('user-context-menu').dataset.username;
    if (username) {
      UI.showToast('User profiles coming soon', 'info');
      document.getElementById('user-context-menu').style.display = 'none';
    }
  });
  
  document.getElementById('ctx-send-dm').addEventListener('click', () => {
    const username = document.getElementById('user-context-menu').dataset.username;
    if (username) {
      ChatManager.startDmWithUser(username);
      document.getElementById('user-context-menu').style.display = 'none';
    }
  });
  
  document.getElementById('ctx-add-friend').addEventListener('click', () => {
    const username = document.getElementById('user-context-menu').dataset.username;
    if (username) {
      ChatManager.sendFriendRequest(username);
      document.getElementById('user-context-menu').style.display = 'none';
    }
  });
  
  document.getElementById('ctx-remove-friend').addEventListener('click', () => {
    const username = document.getElementById('user-context-menu').dataset.username;
    if (username) {
      UI.DialogUI.showCustomConfirm('Remove Friend', `Are you sure you want to remove ${username} from your friends list?`)
        .then(confirmed => {
          if (confirmed) {
            API.FriendAPI.removeFriend(username)
              .then(() => {
                UI.showToast(`Removed ${username} from friends list`, 'success');
                API.FriendAPI.fetchFriends()
                  .then(() => UI.FriendsUI.renderFriends());
                API.MessageAPI.fetchDms()
                  .then(() => UI.DmListUI.renderDms());
              })
              .catch(err => {
                console.error("Error removing friend:", err);
                UI.showToast(err.message || "Error removing friend", 'error');
              });
          }
        });
      document.getElementById('user-context-menu').style.display = 'none';
    }
  });
  
  document.getElementById('ctx-kick-user').addEventListener('click', () => {
    const username = document.getElementById('user-context-menu').dataset.username;
    if (username && StateManager.appState.currentServer) {
      UI.DialogUI.showCustomConfirm('Kick User', `Are you sure you want to kick ${username} from this server?`)
        .then(confirmed => {
          if (confirmed) {
            API.UserAPI.kickUser(StateManager.appState.currentServer, username)
              .then(() => {
                UI.showToast(`Kicked ${username} from server`, 'success');
              })
              .catch(err => {
                console.error("Error kicking user:", err);
                UI.showToast(err.message || "Error kicking user", 'error');
              });
          }
        });
      document.getElementById('user-context-menu').style.display = 'none';
    }
  });
  
  document.getElementById('ctx-ban-user').addEventListener('click', () => {
    const username = document.getElementById('user-context-menu').dataset.username;
    if (username && StateManager.appState.currentServer) {
      UI.DialogUI.showCustomConfirm('Ban User', `Are you sure you want to ban ${username} from this server?`)
        .then(confirmed => {
          if (confirmed) {
            API.UserAPI.banUser(StateManager.appState.currentServer, username)
              .then(() => {
                UI.showToast(`Banned ${username} from server`, 'success');
              })
              .catch(err => {
                console.error("Error banning user:", err);
                UI.showToast(err.message || "Error banning user", 'error');
              });
          }
        });
      document.getElementById('user-context-menu').style.display = 'none';
    }
  });
  
  document.getElementById('ctx-set-nickname').addEventListener('click', () => {
    const username = document.getElementById('user-context-menu').dataset.username;
    if (username && StateManager.appState.currentServer) {
      // Clear previous input
      document.getElementById('nickname-input').value = '';
      
      // Set hidden fields for reference
      document.getElementById('nickname-username').value = username;
      document.getElementById('nickname-server-id').value = StateManager.appState.currentServer;
      
      // Show the modal
      document.getElementById('nickname-modal').style.display = 'flex';
      document.getElementById('nickname-input').focus();
      
      document.getElementById('user-context-menu').style.display = 'none';
    }
  });

  document.getElementById('ctx-timeout-user').addEventListener('click', () => {
    const username = document.getElementById('user-context-menu').dataset.username;
    if (username && StateManager.appState.currentServer) {
      // Set default selections and clear inputs
      document.getElementById('timeout-duration').value = '300';
      document.getElementById('timeout-reason').value = '';
      
      // Set hidden fields for reference
      document.getElementById('timeout-username').value = username;
      document.getElementById('timeout-server-id').value = StateManager.appState.currentServer;
      
      // Show the modal
      document.getElementById('timeout-modal').style.display = 'flex';
      
      document.getElementById('user-context-menu').style.display = 'none';
    }
  });
  
  document.getElementById('ctx-remove-timeout').addEventListener('click', () => {
    const username = document.getElementById('user-context-menu').dataset.username;
    if (username && StateManager.appState.currentServer) {
      UI.DialogUI.showCustomConfirm('Remove Timeout', `Are you sure you want to remove the timeout for ${username}?`)
        .then(confirmed => {
          if (confirmed) {
            API.UserAPI.removeTimeout(StateManager.appState.currentServer, username)
              .then(() => {
                UI.showToast(`Timeout removed for ${username}`, 'success');
                // Refresh the member list to update status indicators
                fetchServerMembers();
              })
              .catch(err => {
                console.error("Error removing timeout:", err);
                UI.showToast(err.message || "Error removing timeout", 'error');
              });
          }
        });
      document.getElementById('user-context-menu').style.display = 'none';
    }
  });
}

// Setup group context menu actions
function setupGroupContextMenuActions() {
  document.getElementById('ctx-group-settings').addEventListener('click', () => {
    const groupId = document.getElementById('group-context-menu').dataset.groupId;
    if (groupId) {
      UI.showToast('Group settings coming soon', 'info');
      document.getElementById('group-context-menu').style.display = 'none';
    }
  });
  
  document.getElementById('ctx-add-people').addEventListener('click', () => {
    const groupId = document.getElementById('group-context-menu').dataset.groupId;
    const groupName = document.getElementById('group-context-menu').dataset.groupName;
    if (groupId) {
      UI.showToast('Adding people to groups coming soon', 'info');
      document.getElementById('group-context-menu').style.display = 'none';
    }
  });
  
  document.getElementById('ctx-leave-group').addEventListener('click', () => {
    const groupId = document.getElementById('group-context-menu').dataset.groupId;
    const groupName = document.getElementById('group-context-menu').dataset.groupName;
    if (groupId) {
      UI.DialogUI.showCustomConfirm('Leave Group', `Are you sure you want to leave the group "${groupName}"?`)
        .then(confirmed => {
          if (confirmed) {
            API.MessageAPI.leaveGroup(groupId)
              .then(() => {
                UI.showToast(`Left group "${groupName}"`, 'success');
                API.MessageAPI.fetchDms()
                  .then(() => UI.DmListUI.renderDms());
                if (StateManager.appState.currentDm === groupId) {
                  StateManager.appState.currentDm = null;
                  document.getElementById('messages').innerHTML = '<div class="empty-chat">Select a conversation to start chatting</div>';
                  ChatManager.stopMessagePolling();
                }
              })
              .catch(err => {
                console.error("Error leaving group:", err);
                UI.showToast(err.message || "Error leaving group", 'error');
              });
          }
        });
      document.getElementById('group-context-menu').style.display = 'none';
    }
  });
  
  document.getElementById('ctx-disband-group').addEventListener('click', () => {
    const groupId = document.getElementById('group-context-menu').dataset.groupId;
    const groupName = document.getElementById('group-context-menu').dataset.groupName;
    if (groupId) {
      UI.DialogUI.showCustomConfirm('Disband Group', `Are you sure you want to disband the group "${groupName}"? This action cannot be undone.`)
        .then(confirmed => {
          if (confirmed) {
            API.MessageAPI.disbandGroup(groupId)
              .then(() => {
                UI.showToast(`Group "${groupName}" disbanded`, 'success');
                API.MessageAPI.fetchDms()
                  .then(() => UI.DmListUI.renderDms());
                if (StateManager.appState.currentDm === groupId) {
                  StateManager.appState.currentDm = null;
                  document.getElementById('messages').innerHTML = '<div class="empty-chat">Select a conversation to start chatting</div>';
                  ChatManager.stopMessagePolling();
                }
              })
              .catch(err => {
                console.error("Error disbanding group:", err);
                UI.showToast(err.message || "Error disbanding group", 'error');
              });
          }
        });
      document.getElementById('group-context-menu').style.display = 'none';
    }
  });
}

// Export module
window.ContextMenus = {
  setupContextMenus
};
