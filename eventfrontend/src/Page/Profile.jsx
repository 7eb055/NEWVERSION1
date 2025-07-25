import React, { useState, useEffect } from 'react';
import AuthTokenService from '../services/AuthTokenService';
import apiService from '../services/ApiService';
import './css/Profile.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [company, setCompany] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        
        // Get basic user data from token
        const tokenUser = AuthTokenService.getUser();
        const role = AuthTokenService.getUserRole();
        
        if (tokenUser) {
          setUser(tokenUser);
          setUserRole(role);
          
          // Fetch additional user details and company info from backend if available
          // This would be implemented when backend profile endpoints are available
          /*
          const profileResponse = await apiService.getUserProfile(tokenUser.user_id);
          if (profileResponse.success) {
            setUser(profileResponse.data.user);
            setCompany(profileResponse.data.company);
          }
          */
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError('Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const getUserDisplayName = () => {
    // Based on eventsql schema, the field is 'username'
    return user?.username || user?.name || 'User';
  };

  const getRoleName = () => {
    // Based on eventsql schema, roles come from Roles table
    return userRole || 'attendee';
  };

  const getCompanyName = () => {
    // Based on eventsql schema, company info comes from EventCompanies table
    return company?.company_name || user?.company_name || 'Not provided';
  };

  if (isLoading) {
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
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-avatar-section">
            <div className="profile-avatar-large">
              <i className="fas fa-user"></i>
            </div>
            <button className="change-avatar-btn">
              <i className="fas fa-camera"></i>
              Change Photo
            </button>
          </div>

          <div className="profile-info">
            <div className="info-group">
              <label>Username</label>
              <input 
                type="text" 
                value={getUserDisplayName()} 
                readOnly 
                className="info-input"
              />
            </div>

            <div className="info-group">
              <label>Email Address</label>
              <input 
                type="email" 
                value={user?.email || ''} 
                readOnly 
                className="info-input"
              />
            </div>

            <div className="info-group">
              <label>Phone Number</label>
              <input 
                type="tel" 
                value={user?.phone || 'Not provided'} 
                readOnly 
                className="info-input"
              />
            </div>

            <div className="info-group">
              <label>Role</label>
              <input 
                type="text" 
                value={getRoleName()} 
                readOnly 
                className="info-input role-input"
              />
            </div>

            <div className="info-group">
              <label>Company</label>
              <input 
                type="text" 
                value={getCompanyName()} 
                readOnly 
                className="info-input"
              />
            </div>

            {company && (
              <>
                <div className="info-group">
                  <label>Company Address</label>
                  <textarea 
                    value={company.address || 'Not provided'} 
                    readOnly 
                    className="info-textarea"
                    rows="3"
                  />
                </div>

                <div className="info-group">
                  <label>Company Contact Info</label>
                  <input 
                    type="text" 
                    value={company.contact_info || 'Not provided'} 
                    readOnly 
                    className="info-input"
                  />
                </div>
              </>
            )}
          </div>

          <div className="profile-actions">
            <button className="btn-primary">
              <i className="fas fa-edit"></i>
              Edit Profile
            </button>
            <button className="btn-secondary">
              <i className="fas fa-key"></i>
              Change Password
            </button>
          </div>
        </div>

        <div className="account-stats">
          <h3>Account Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <i className="fas fa-calendar-check"></i>
              <div>
                <span className="stat-number">0</span>
                <span className="stat-label">Events Attended</span>
              </div>
            </div>
            <div className="stat-item">
              <i className="fas fa-star"></i>
              <div>
                <span className="stat-number">0</span>
                <span className="stat-label">Reviews Given</span>
              </div>
            </div>
            <div className="stat-item">
              <i className="fas fa-users"></i>
              <div>
                <span className="stat-number">0</span>
                <span className="stat-label">Events Organized</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
