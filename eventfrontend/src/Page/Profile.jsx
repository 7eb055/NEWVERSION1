import React, { useState, useEffect } from 'react';
import AuthTokenService from '../services/AuthTokenService';
import apiService from '../services/ApiService';
import './css/Profile.css';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    interests: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    dietary_restrictions: '',
    accessibility_needs: '',
    bio: '',
    profile_picture_url: '',
    social_media_links: {},
    notification_preferences: {
      email: true,
      sms: false,
      event_updates: true,
      promotions: false
    }
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  // Update form data when profile changes
  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        date_of_birth: profile.date_of_birth || '',
        gender: profile.gender || '',
        interests: profile.interests || '',
        emergency_contact_name: profile.emergency_contact_name || '',
        emergency_contact_phone: profile.emergency_contact_phone || '',
        dietary_restrictions: profile.dietary_restrictions || '',
        accessibility_needs: profile.accessibility_needs || '',
        bio: profile.bio || '',
        profile_picture_url: profile.profile_picture_url || '',
        social_media_links: profile.social_media_links || {},
        notification_preferences: {
          email: profile.notification_preferences?.email ?? true,
          sms: profile.notification_preferences?.sms ?? false,
          event_updates: profile.notification_preferences?.event_updates ?? true,
          promotions: profile.notification_preferences?.promotions ?? false
        }
      });
    }
  }, [profile]);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await apiService.getAttendeeProfile();
      
      if (response.success && response.data.profile) {
        setProfile(response.data.profile);
      } else {
        setError(response.error || 'Failed to load profile data');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError('Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        notification_preferences: {
          ...prev.notification_preferences,
          [name]: checked
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      
      const response = await apiService.updateAttendeeProfile(formData);
      
      if (response.success) {
        // Refresh profile data after successful update
        await fetchUserProfile();
        setIsEditing(false);
      } else {
        setError(response.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Date formatting error:', error);
      return '';
    }
  };

  if (isLoading && !profile) {
    return (
      <div className="profile-container">
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}
      
      <div className="profile-header">
        <h1>My Profile</h1>
        <p>Manage your account information and preferences</p>
        {!isEditing && profile && (
          <button 
            className="btn-primary edit-profile-btn" 
            onClick={() => setIsEditing(true)}
          >
            <i className="fas fa-edit"></i> Edit Profile
          </button>
        )}
      </div>

      <div className="profile-content">
        {isEditing ? (
          <div className="profile-card">
            <form onSubmit={handleSubmit}>
              <div className="form-section">
                <h3>Personal Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={formatDate(formData.date_of_birth)}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Bio</label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Tell us about yourself..."
                    rows="3"
                  ></textarea>
                </div>

                <div className="form-group">
                  <label>Profile Picture URL</label>
                  <input
                    type="url"
                    name="profile_picture_url"
                    value={formData.profile_picture_url}
                    onChange={handleChange}
                    placeholder="https://example.com/your-photo.jpg"
                  />
                </div>
              </div>

              <div className="form-section">
                <h3>Preferences & Interests</h3>
                <div className="form-group">
                  <label>Interests</label>
                  <textarea
                    name="interests"
                    value={formData.interests}
                    onChange={handleChange}
                    placeholder="Your interests and hobbies..."
                  ></textarea>
                </div>
                
                <div className="form-group">
                  <label>Dietary Restrictions</label>
                  <textarea
                    name="dietary_restrictions"
                    value={formData.dietary_restrictions}
                    onChange={handleChange}
                    placeholder="Any dietary requirements..."
                  ></textarea>
                </div>
                
                <div className="form-group">
                  <label>Accessibility Needs</label>
                  <textarea
                    name="accessibility_needs"
                    value={formData.accessibility_needs}
                    onChange={handleChange}
                    placeholder="Any accessibility requirements..."
                  ></textarea>
                </div>
              </div>

              <div className="form-section">
                <h3>Emergency Contact</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Emergency Contact Name</label>
                    <input
                      type="text"
                      name="emergency_contact_name"
                      value={formData.emergency_contact_name}
                      onChange={handleChange}
                      placeholder="Emergency contact name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Emergency Contact Phone</label>
                    <input
                      type="tel"
                      name="emergency_contact_phone"
                      value={formData.emergency_contact_phone}
                      onChange={handleChange}
                      placeholder="Emergency contact phone"
                    />
                  </div>
                </div>
              </div>
              
              <div className="form-section">
                <h3>Notification Preferences</h3>
                <div className="checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      name="email"
                      checked={formData.notification_preferences.email}
                      onChange={handleChange}
                    />
                    Email Notifications
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      name="sms"
                      checked={formData.notification_preferences.sms}
                      onChange={handleChange}
                    />
                    SMS Notifications
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      name="event_updates"
                      checked={formData.notification_preferences.event_updates}
                      onChange={handleChange}
                    />
                    Event Updates
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      name="promotions"
                      checked={formData.notification_preferences.promotions}
                      onChange={handleChange}
                    />
                    Promotional Messages
                  </label>
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setIsEditing(false)}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            <div className="profile-card">
              <div className="profile-avatar-section">
                <div className="profile-avatar-large">
                  {profile?.profile_picture_url ? (
                    <img src={profile.profile_picture_url} alt="Profile" />
                  ) : (
                    <i className="fas fa-user"></i>
                  )}
                </div>
              </div>

              <div className="profile-info">
                <div className="info-section">
                  <h3>Personal Information</h3>
                  <div className="info-group">
                    <label>Name</label>
                    <span>{profile?.full_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Not provided'}</span>
                  </div>

                  <div className="info-group">
                    <label>Email Address</label>
                    <span>{profile?.email || 'Not provided'}</span>
                  </div>

                  <div className="info-group">
                    <label>Phone Number</label>
                    <span>{profile?.phone || 'Not provided'}</span>
                  </div>

                  <div className="info-group">
                    <label>Date of Birth</label>
                    <span>{profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'Not provided'}</span>
                  </div>

                  <div className="info-group">
                    <label>Gender</label>
                    <span>{profile?.gender || 'Not provided'}</span>
                  </div>

                  {profile?.bio && (
                    <div className="info-group">
                      <label>Bio</label>
                      <span>{profile.bio}</span>
                    </div>
                  )}
                </div>

                <div className="info-section">
                  <h3>Emergency Contact</h3>
                  <div className="info-group">
                    <label>Contact Name</label>
                    <span>{profile?.emergency_contact_name || 'Not provided'}</span>
                  </div>
                  <div className="info-group">
                    <label>Contact Phone</label>
                    <span>{profile?.emergency_contact_phone || 'Not provided'}</span>
                  </div>
                </div>
                
                <div className="info-section">
                  <h3>Preferences</h3>
                  <div className="info-group">
                    <label>Interests</label>
                    <span>{profile?.interests || 'None specified'}</span>
                  </div>
                  <div className="info-group">
                    <label>Dietary Restrictions</label>
                    <span>{profile?.dietary_restrictions || 'None specified'}</span>
                  </div>
                  <div className="info-group">
                    <label>Accessibility Needs</label>
                    <span>{profile?.accessibility_needs || 'None specified'}</span>
                  </div>
                </div>
                
                <div className="info-section">
                  <h3>Notification Preferences</h3>
                  <div className="notification-prefs">
                    {profile?.notification_preferences ? (
                      <>
                        <div className={`pref-item ${profile.notification_preferences.email ? 'enabled' : 'disabled'}`}>
                          <i className={`fas fa-${profile.notification_preferences.email ? 'check' : 'times'}`}></i>
                          <span>Email Notifications</span>
                        </div>
                        <div className={`pref-item ${profile.notification_preferences.sms ? 'enabled' : 'disabled'}`}>
                          <i className={`fas fa-${profile.notification_preferences.sms ? 'check' : 'times'}`}></i>
                          <span>SMS Notifications</span>
                        </div>
                        <div className={`pref-item ${profile.notification_preferences.event_updates ? 'enabled' : 'disabled'}`}>
                          <i className={`fas fa-${profile.notification_preferences.event_updates ? 'check' : 'times'}`}></i>
                          <span>Event Updates</span>
                        </div>
                        <div className={`pref-item ${profile.notification_preferences.promotions ? 'enabled' : 'disabled'}`}>
                          <i className={`fas fa-${profile.notification_preferences.promotions ? 'check' : 'times'}`}></i>
                          <span>Promotional Messages</span>
                        </div>
                      </>
                    ) : (
                      <span>No preferences set</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="account-stats">
              <h3>Account Statistics</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <i className="fas fa-ticket-alt"></i>
                  <div className="stat-content">
                    <span className="stat-number">{profile?.registration_count || 0}</span>
                    <span className="stat-label">Events Registered</span>
                  </div>
                </div>
                <div className="stat-item">
                  <i className="fas fa-calendar-check"></i>
                  <div className="stat-content">
                    <span className="stat-number">{profile?.attendance_count || 0}</span>
                    <span className="stat-label">Events Attended</span>
                  </div>
                </div>
                <div className="stat-item">
                  <i className="fas fa-star"></i>
                  <div className="stat-content">
                    <span className="stat-number">{profile?.feedback_count || 0}</span>
                    <span className="stat-label">Reviews Given</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;
