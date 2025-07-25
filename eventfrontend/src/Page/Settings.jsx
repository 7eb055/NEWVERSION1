import React from 'react';
import AuthTokenService from '../services/AuthTokenService';
import './css/Settings.css';

const Settings = () => {
  const user = AuthTokenService.getUser();

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Account Settings</h1>
        <p>Manage your account preferences and security settings</p>
      </div>

      <div className="settings-content">
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
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Event Reminders</label>
                <span>Get reminded about upcoming events</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Marketing Emails</label>
                <span>Receive promotional emails and newsletters</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

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
              <button className="btn-outline">
                Enable 2FA
              </button>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Password</label>
                <span>Last changed 30 days ago</span>
              </div>
              <button className="btn-outline">
                Change Password
              </button>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Login Sessions</label>
                <span>Manage your active sessions</span>
              </div>
              <button className="btn-outline">
                View Sessions
              </button>
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
              <select className="setting-select">
                <option>Everyone</option>
                <option>Event Attendees Only</option>
                <option>Private</option>
              </select>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Data Export</label>
                <span>Download a copy of your data</span>
              </div>
              <button className="btn-outline">
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
              <button className="btn-danger">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
