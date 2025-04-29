// User Settings Module
// Handles user settings and profiles

// Initialize user settings
let userSettings = {
  theme: 'light',
  messageLayout: 'cozy',
  notifications: true,
  status: 'online'
};

// Load user settings
function loadUserSettings() {
  return API.UserAPI.getSettings()
    .then(data => {
      if (data && Object.keys(data).length > 0) {
        userSettings = { ...userSettings, ...data };
        applySettings();
      }
      return userSettings;
    })
    .catch(err => {
      console.error('Error loading settings:', err);
      return userSettings;
    });
}

// Save user settings
function saveUserSettings() {
  return API.UserAPI.saveSettings(userSettings)
    .then(() => {
      UI.showToast('Settings saved', 'success');
      return true;
    })
    .catch(err => {
      console.error('Error saving settings:', err);
      UI.showToast('Error saving settings', 'error');
      return false;
    });
}

// Apply current settings to UI
function applySettings() {
  // Apply theme
  document.body.classList.remove('theme-light', 'theme-dark');
  document.body.classList.add(`theme-${userSettings.theme}`);
  
  // Apply message layout
  document.getElementById('messages').classList.remove('layout-cozy', 'layout-compact');
  document.getElementById('messages').classList.add(`layout-${userSettings.messageLayout}`);
}

// Open settings modal
function openSettingsModal() {
  // Fill current settings in the form
  document.getElementById('setting-theme').value = userSettings.theme;
  document.getElementById('setting-message-layout').value = userSettings.messageLayout;
  document.getElementById('setting-notifications').checked = userSettings.notifications;
  
  // Show the modal
  UI.ModalUI.openSettingsModal();
}

// Save settings from form
function saveSettingsFromForm() {
  // Get values from form
  const theme = document.getElementById('setting-theme').value;
  const messageLayout = document.getElementById('setting-message-layout').value;
  const notifications = document.getElementById('setting-notifications').checked;
  
  // Update settings object
  userSettings.theme = theme;
  userSettings.messageLayout = messageLayout;
  userSettings.notifications = notifications;
  
  // Save to server and apply
  saveUserSettings().then(() => {
    applySettings();
    UI.closeAllModals();
  });
}

// Load and update user profile
function loadUserProfile() {
  return API.UserAPI.getProfile(API.currentUsername)
    .then(data => {
      if (data && data.description) {
        document.getElementById('profile-description').textContent = data.description;
      }
      return data;
    })
    .catch(err => {
      console.error('Error loading profile:', err);
      return null;
    });
}

// Save user profile
function saveUserProfile() {
  const description = document.getElementById('profile-edit-description').value;
  
  return API.UserAPI.saveProfile({
    description: description
  })
    .then(() => {
      UI.showToast('Profile updated', 'success');
      document.getElementById('profile-description').textContent = description;
      UI.closeAllModals();
      return true;
    })
    .catch(err => {
      console.error('Error saving profile:', err);
      UI.showToast('Error updating profile', 'error');
      return false;
    });
}

// Open profile edit modal
function openProfileEditModal() {
  API.UserAPI.getProfile(API.currentUsername)
    .then(data => {
      document.getElementById('profile-edit-description').value = data.description || '';
      UI.ModalUI.openProfileEditModal();
    });
}

// Open user profile modal
function openProfileModal(username) {
  API.UserAPI.getProfile(username)
    .then(data => {
      document.getElementById('view-profile-username').textContent = username;
      document.getElementById('view-profile-description').textContent = data.description || 'No description available.';
      UI.ModalUI.openViewProfileModal();
    })
    .catch(() => {
      UI.showToast('Could not load profile', 'error');
    });
}

// Export functions
const UserSettings = {
  loadUserSettings,
  saveUserSettings,
  applySettings,
  openSettingsModal,
  saveSettingsFromForm,
  loadUserProfile,
  saveUserProfile,
  openProfileEditModal,
  openProfileModal
};
