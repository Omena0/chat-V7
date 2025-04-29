// Main entry point for the chat application
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the application
  
  // Create style element for CSS
  const style = document.createElement('style');
  style.textContent = `
    .member-item {
      display: flex;
      align-items: center;
      padding: 6px;
      border-radius: 4px;
      margin-bottom: 2px;
      cursor: pointer;
    }
    
    .member-item:hover {
      background: #36393f;
    }
    
    .member-name {
      margin-left: 8px;
      color: #dcddde;
      flex: 1;
    }
    
    .member-name.owner {
      color: #ed4245;
    }
    
    .member-name.admin {
      color: #5865f2;
    }
    
    .empty-chat {
      color: #72767d;
      text-align: center;
      margin-top: 100px;
      font-size: 16px;
    }
  `;
  document.head.appendChild(style);
  
  // Add member list container to the DOM
  const memberListContainer = document.createElement('div');
  memberListContainer.id = 'member-list-container';
  memberListContainer.className = 'member-list-container';
  memberListContainer.innerHTML = `
    <h3>Members</h3>
    <div id="member-list"></div>
  `;
  document.querySelector('.chat-content').appendChild(memberListContainer);
  
  // Setup toast notification container if not present
  if (!document.getElementById('toast')) {
    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  
  // Initialize the application
  ChatManager.initialize();
  EventHandlers.setupEventHandlers();
});
