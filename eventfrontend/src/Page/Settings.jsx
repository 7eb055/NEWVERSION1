import React, { useState, useEffect } from 'react';
import AuthTokenService from '../services/AuthTokenService';
import apiService from '../services/ApiService';
import Header from '../component/header';
import './css/Settings.css';

const Settings = () => {
  const [userRole, setUserRole] = useState('');
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    event_updates: true,
    promotions: false
  });
  const [privacy, setPrivacy] = useState({
    profile_visibility: 'everyone'
  });
  const [security, setSecurity] = useState({
    two_factor_enabled: false,
    password_changed_days_ago: 0,
    last_login: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  useEffect(() => {
    // Get user role
    const role = AuthTokenService.getUserRole();
    setUserRole(role);
    
    fetchAllSettings();
  }, []);

  const fetchAllSettings = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // For organizers, skip notification settings as they don't have attendee records
      const settingsToFetch = [];
      
      if (userRole !== 'organizer') {
        settingsToFetch.push(apiService.getNotificationSettings());
      }
      
      settingsToFetch.push(
        apiService.getPrivacySettings(),
        apiService.getSecurityInfo()
      );
      
      // Fetch settings in parallel
      const results = await Promise.all(settingsToFetch);
      
      let resultIndex = 0;
      
      // Handle notification settings only for non-organizers
      if (userRole !== 'organizer') {
        const notificationRes = results[resultIndex++];
        if (notificationRes.success) {
          setNotifications(notificationRes.data.notifications);
        }
      }
      
      // Handle privacy and security settings
      const privacyRes = results[resultIndex++];
      const securityRes = results[resultIndex++];
      
      if (privacyRes.success) {
        setPrivacy(privacyRes.data.privacy);
      }
      
      if (securityRes.success) {
        setSecurity(securityRes.data.security);
      }
      
      // Show error if any request failed
      const errors = results
        .filter(res => !res.success)
        .map(res => res.error);
      
      if (errors.length > 0) {
        setError(`Some settings couldn't be loaded: ${errors.join(', ')}`);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationChange = async (setting, value) => {
    try {
      const newNotifications = { ...notifications, [setting]: value };
      setNotifications(newNotifications);
      
      const response = await apiService.updateNotificationSettings(newNotifications);
      
      if (response.success) {
        setSuccess('Notification preferences updated');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.error);
        // Revert on error
        setNotifications(notifications);
      }
    } catch (error) {
      console.error('Error updating notifications:', error);
      setError('Failed to update notification preferences');
      setNotifications(notifications);
    }
  };

  const handlePrivacyChange = async (setting, value) => {
    try {
      const newPrivacy = { ...privacy, [setting]: value };
      setPrivacy(newPrivacy);
      
      const response = await apiService.updatePrivacySettings(newPrivacy);
      
      if (response.success) {
        setSuccess('Privacy settings updated');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.error);
        // Revert on error
        setPrivacy(privacy);
      }
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      setError('Failed to update privacy settings');
      setPrivacy(privacy);
    }
  };

  const handle2FAToggle = async () => {
    try {
      const response = await apiService.toggle2FA(!security.two_factor_enabled);
      
      if (response.success) {
        setSecurity(prev => ({ ...prev, two_factor_enabled: !prev.two_factor_enabled }));
        setSuccess(response.data.message);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.error);
      }
    } catch (error) {
      console.error('Error toggling 2FA:', error);
      setError('Failed to update 2FA setting');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('New passwords do not match');
      return;
    }
    
    if (passwordForm.new_password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    try {
      const response = await apiService.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      
      if (response.success) {
        setSuccess('Password changed successfully');
        setShowPasswordModal(false);
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
        setTimeout(() => setSuccess(''), 3000);
        
        // Refresh security info
        const securityRes = await apiService.getSecurityInfo();
        if (securityRes.success) {
          setSecurity(securityRes.data.security);
        }
      } else {
        setError(response.error);
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setError('Failed to change password');
    }
  };

  const handleExportData = async () => {
    try {
      const response = await apiService.exportUserData();
      
      if (response.success) {
        // Create and download JSON file
        const dataStr = JSON.stringify(response.data.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `user-data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setSuccess('Data exported successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.error);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      setError('Failed to export data');
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    
    if (deleteConfirmation !== 'DELETE_MY_ACCOUNT') {
      setError('Please type "DELETE_MY_ACCOUNT" to confirm');
      return;
    }
    
    try {
      const response = await apiService.deleteAccount(deleteConfirmation);
      
      if (response.success) {
        setSuccess('Account deleted successfully. You will be logged out.');
        setTimeout(() => {
          AuthTokenService.logout();
          window.location.href = '/';
        }, 2000);
      } else {
        setError(response.error);
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setError('Failed to delete account');
    }
  };

  if (isLoading) {
    return (
      <div className="settings-container">
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <Header />
      <div className="settings-header">
        <h1>Account Settings</h1>
        <p>Manage your account preferences and security settings</p>
      </div>

      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i>
          {error}
          <button onClick={() => setError('')} className="close-btn">×</button>
        </div>
      )}

      {success && (
        <div className="success-message">
          <i className="fas fa-check-circle"></i>
          {success}
          <button onClick={() => setSuccess('')} className="close-btn">×</button>
        </div>
      )}

      <div className="settings-content">
        {/* Only show notifications section for non-organizers */}
        {userRole !== 'organizer' && (
          <div className="settings-section">
            <h3>
              <i className="fas fa-bell"></i>
              Notifications
            </h3>
            <div className="settings-group">
              <div className="setting-item">
                <div className="setting-info">
                  <label>Email Notifications</label>
                  <span>Receive email updates about events and activities</span>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={notifications.email}
                    onChange={(e) => handleNotificationChange('email', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <label>Event Updates</label>
                  <span>Get notified about event changes and updates</span>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={notifications.event_updates}
                    onChange={(e) => handleNotificationChange('event_updates', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <label>SMS Notifications</label>
                  <span>Receive text message notifications</span>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={notifications.sms}
                    onChange={(e) => handleNotificationChange('sms', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <label>Promotional Messages</label>
                  <span>Receive promotional emails and newsletters</span>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={notifications.promotions}
                    onChange={(e) => handleNotificationChange('promotions', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="settings-section">
          <h3>
            <i className="fas fa-shield-alt"></i>
            Security
          </h3>
          <div className="settings-group">
            <div className="setting-item">
              <div className="setting-info">
                <label>Two-Factor Authentication</label>
                <span>Add an extra layer of security to your account</span>
              </div>
              <button 
                className={`btn-outline ${security.two_factor_enabled ? 'enabled' : ''}`}
                onClick={handle2FAToggle}
              >
                {security.two_factor_enabled ? 'Disable 2FA' : 'Enable 2FA'}
              </button>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Password</label>
                <span>Last changed {security.password_changed_days_ago} days ago</span>
              </div>
              <button className="btn-outline" onClick={() => setShowPasswordModal(true)}>
                Change Password
              </button>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Last Login</label>
                <span>
                  {security.last_login 
                    ? new Date(security.last_login).toLocaleString()
                    : 'Never'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3>
            <i className="fas fa-user-cog"></i>
            Privacy
          </h3>
          <div className="settings-group">
            <div className="setting-item">
              <div className="setting-info">
                <label>Profile Visibility</label>
                <span>Control who can see your profile information</span>
              </div>
              <select 
                className="setting-select"
                value={privacy.profile_visibility}
                onChange={(e) => handlePrivacyChange('profile_visibility', e.target.value)}
              >
                <option value="everyone">Everyone</option>
                <option value="attendees_only">Event Attendees Only</option>
                <option value="private">Private</option>
              </select>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Data Export</label>
                <span>Download a copy of your data</span>
              </div>
              <button className="btn-outline" onClick={handleExportData}>
                Export Data
              </button>
            </div>
          </div>
        </div>

        <div className="settings-section danger-section">
          <h3>
            <i className="fas fa-exclamation-triangle"></i>
            Danger Zone
          </h3>
          <div className="settings-group">
            <div className="setting-item">
              <div className="setting-info">
                <label>Delete Account</label>
                <span>Permanently delete your account and all data</span>
              </div>
              <button className="btn-danger" onClick={() => setShowDeleteModal(true)}>
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Change Password</h3>
              <button className="modal-close" onClick={() => setShowPasswordModal(false)}>×</button>
            </div>
            <form onSubmit={handlePasswordChange}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Current Password</label>
                  <input
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                    minLength="6"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                    minLength="6"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowPasswordModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Delete Account</h3>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>×</button>
            </div>
            <form onSubmit={handleDeleteAccount}>
              <div className="modal-body">
                <div className="warning-box">
                  <i className="fas fa-exclamation-triangle"></i>
                  <div>
                    <h4>This action cannot be undone!</h4>
                    <p>This will permanently delete your account and all associated data including:</p>
                    <ul>
                      <li>Your profile information</li>
                      <li>Event registrations and tickets</li>
                      <li>All personal data</li>
                    </ul>
                  </div>
                </div>
                <div className="form-group">
                  <label>Type "DELETE_MY_ACCOUNT" to confirm:</label>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="DELETE_MY_ACCOUNT"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-danger">
                  Delete My Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
