import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AuthTokenService from '../../services/AuthTokenService';
import PeopleRegistration from './PeopleRegistration';

import './css/AttendeeManagement.css';
import { API_BASE_URL } from '../config/api';

const AttendeeManagement = () => {
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [currentAttendee, setCurrentAttendee] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOption, setFilterOption] = useState('all');

  // Fetch attendees when component mounts
  useEffect(() => {
    fetchAttendees();
  }, []);

  // Function to fetch attendees from the API
  const fetchAttendees = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = AuthTokenService.getToken();
      
      if (!token) {
        setError('Authentication token not found. Please log in.');
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `${API_BASE_URL}/api/attendees`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setAttendees(response.data.attendees || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching attendees:', err);
      setError('Failed to fetch attendees. Please try again.');
      setLoading(false);
    }
  };

  // Function to handle attendee registration or update
  const handleAttendeeSubmit = async () => {
    setShowRegistrationForm(false);
    setLoading(true);
    
    try {
      // Refresh the attendees list after update
      await fetchAttendees();
      
      // Reset form state
      setCurrentAttendee(null);
      setEditMode(false);
    } catch (err) {
      console.error('Error updating attendees list:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to start editing an attendee
  const handleEditAttendee = (attendee) => {
    setCurrentAttendee(attendee);
    setEditMode(true);
    setShowRegistrationForm(true);
  };

  // Function to show delete confirmation
  const handleDeleteClick = (attendeeId) => {
    setDeleteConfirm({ show: true, id: attendeeId });
  };

  // Function to confirm and process attendee deletion
  const handleConfirmDelete = async () => {
    if (!deleteConfirm.id) return;

    try {
      setLoading(true);
      const token = AuthTokenService.getToken();
      
      await axios.delete(
        `${API_BASE_URL}/api/attendees/${deleteConfirm.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      // Remove the deleted attendee from state
      setAttendees(attendees.filter(attendee => attendee.attendee_id !== deleteConfirm.id));
      setDeleteConfirm({ show: false, id: null });
      setLoading(false);
    } catch (err) {
      console.error('Error deleting attendee:', err);
      
      let errorMessage = 'Failed to delete attendee. Please try again.';
      if (err.response && err.response.data && err.response.data.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
      setLoading(false);
      setDeleteConfirm({ show: false, id: null });
    }
  };

  // Function to cancel attendee registration or edit
  const handleCancel = () => {
    setShowRegistrationForm(false);
    setCurrentAttendee(null);
    setEditMode(false);
  };

  // Function to handle search input
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Function to handle filter change
  const handleFilterChange = (e) => {
    setFilterOption(e.target.value);
  };

  // Helper function to parse JSON fields
  const parseJsonField = (jsonString, defaultValue = {}) => {
    if (!jsonString) return defaultValue;
    
    try {
      if (typeof jsonString === 'string') {
        return JSON.parse(jsonString);
      }
      return jsonString;
    } catch (err) {
      console.error('Error parsing JSON field:', err);
      return defaultValue;
    }
  };

  // Filter attendees based on search term and filter option
  const filteredAttendees = attendees.filter(attendee => {
    // First apply search filter
    const searchMatch = 
      attendee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attendee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (attendee.phone && attendee.phone.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Then apply category filter
    if (filterOption === 'all') {
      return searchMatch;
    }
    
    const notificationPreferences = parseJsonField(attendee.notification_preferences, {});
    
    // Filter based on notification preferences
    switch(filterOption) {
      case 'email_subscribed':
        return searchMatch && notificationPreferences.email_updates;
      case 'sms_subscribed':
        return searchMatch && notificationPreferences.sms_updates;
      case 'marketing_subscribed':
        return searchMatch && notificationPreferences.marketing_communications;
      default:
        return searchMatch;
    }
  });

  // Render loading state
  if (loading && attendees.length === 0) {
    return (
      <div className="attendee-management-container">
        <div className="loading">
          <i className="fas fa-spinner fa-spin"></i> Loading attendees...
        </div>
      </div>
    );
  }

  // Render registration form if active
  if (showRegistrationForm) {
    return (
      <PeopleRegistration
        onSubmit={handleAttendeeSubmit}
        onCancel={handleCancel}
        isLoading={loading}
        editMode={editMode}
        initialData={currentAttendee}
      />
    );
  }

  return (
    <div className="attendee-management-container">
      <div className="attendee-management-header">
        <h2>Attendee Management</h2>
        <button 
          className="btn-primary"
          onClick={() => {
            setShowRegistrationForm(true);
            setEditMode(false);
            setCurrentAttendee(null);
          }}
        >
          <i className="fas fa-plus"></i> Register New Attendee
        </button>
      </div>
      
      <div className="search-filter-container">
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        
        <div className="filter-dropdown">
          <label htmlFor="attendee-filter">Filter by:</label>
          <select 
            id="attendee-filter" 
            value={filterOption} 
            onChange={handleFilterChange}
          >
            <option value="all">All Attendees</option>
            <option value="email_subscribed">Email Subscribed</option>
            <option value="sms_subscribed">SMS Subscribed</option>
            <option value="marketing_subscribed">Marketing Subscribed</option>
          </select>
        </div>
      </div>
      
      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}
      
      {filteredAttendees.length === 0 ? (
        <div className="no-attendees">
          <p>No attendees found. Click "Register New Attendee" to add someone.</p>
        </div>
      ) : (
        <div className="attendee-list">
          {filteredAttendees.map(attendee => {
            const socialMediaLinks = parseJsonField(attendee.social_media_links, {});
            const notificationPreferences = parseJsonField(attendee.notification_preferences, {});
            
            return (
              <div key={attendee.attendee_id} className="attendee-card">
                <div className="attendee-header">
                  <h3>{attendee.full_name}</h3>
                  <div className="notification-badges">
                    {notificationPreferences.email_updates && (
                      <span className="badge email-badge" title="Email subscribed">
                        <i className="fas fa-envelope"></i>
                      </span>
                    )}
                    {notificationPreferences.sms_updates && (
                      <span className="badge sms-badge" title="SMS subscribed">
                        <i className="fas fa-sms"></i>
                      </span>
                    )}
                    {notificationPreferences.marketing_communications && (
                      <span className="badge marketing-badge" title="Marketing subscribed">
                        <i className="fas fa-bullhorn"></i>
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="attendee-details">
                  <div className="attendee-profile">
                    <div className="attendee-avatar">
                      {attendee.profile_picture_url ? (
                        <img src={attendee.profile_picture_url} alt={`${attendee.full_name}'s avatar`} />
                      ) : (
                        <div className="avatar-placeholder">
                          {attendee.full_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    <div className="attendee-info">
                      <p><i className="fas fa-envelope"></i> {attendee.email}</p>
                      {attendee.phone && <p><i className="fas fa-phone"></i> {attendee.phone}</p>}
                      {attendee.date_of_birth && (
                        <p><i className="fas fa-birthday-cake"></i> {new Date(attendee.date_of_birth).toLocaleDateString()}</p>
                      )}
                      {attendee.gender && <p><i className="fas fa-user"></i> {attendee.gender}</p>}
                    </div>
                  </div>
                  
                  {attendee.emergency_contact_name && (
                    <div className="emergency-contact">
                      <h4>Emergency Contact</h4>
                      <p>{attendee.emergency_contact_name}</p>
                      {attendee.emergency_contact_phone && <p>{attendee.emergency_contact_phone}</p>}
                    </div>
                  )}
                  
                  {attendee.interests && (
                    <div className="interests">
                      <h4>Interests</h4>
                      <p>{attendee.interests}</p>
                    </div>
                  )}
                  
                  {attendee.bio && (
                    <div className="bio">
                      <h4>Bio</h4>
                      <p>{attendee.bio}</p>
                    </div>
                  )}
                  
                  {(attendee.dietary_restrictions || attendee.accessibility_needs) && (
                    <div className="special-needs">
                      <h4>Special Needs</h4>
                      {attendee.dietary_restrictions && (
                        <p><strong>Dietary:</strong> {attendee.dietary_restrictions}</p>
                      )}
                      {attendee.accessibility_needs && (
                        <p><strong>Accessibility:</strong> {attendee.accessibility_needs}</p>
                      )}
                    </div>
                  )}
                  
                  {Object.keys(socialMediaLinks).length > 0 && (
                    <div className="social-links">
                      <h4>Social Media</h4>
                      <div className="social-icons">
                        {socialMediaLinks.linkedin && (
                          <a href={socialMediaLinks.linkedin} target="_blank" rel="noopener noreferrer">
                            <i className="fab fa-linkedin"></i>
                          </a>
                        )}
                        {socialMediaLinks.twitter && (
                          <a href={socialMediaLinks.twitter} target="_blank" rel="noopener noreferrer">
                            <i className="fab fa-twitter"></i>
                          </a>
                        )}
                        {socialMediaLinks.facebook && (
                          <a href={socialMediaLinks.facebook} target="_blank" rel="noopener noreferrer">
                            <i className="fab fa-facebook"></i>
                          </a>
                        )}
                        {socialMediaLinks.instagram && (
                          <a href={socialMediaLinks.instagram} target="_blank" rel="noopener noreferrer">
                            <i className="fab fa-instagram"></i>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="attendee-actions">
                  <button 
                    className="btn-secondary"
                    onClick={() => handleEditAttendee(attendee)}
                  >
                    <i className="fas fa-edit"></i> Edit
                  </button>
                  
                  <button 
                    className="btn-danger"
                    onClick={() => handleDeleteClick(attendee.attendee_id)}
                  >
                    <i className="fas fa-trash-alt"></i> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Delete confirmation modal */}
      {deleteConfirm.show && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <h3>Confirm Deletion</h3>
            <p>Are you sure you want to delete this attendee? This action cannot be undone.</p>
            
            <div className="modal-actions">
              <button 
                className="btn-secondary"
                onClick={() => setDeleteConfirm({ show: false, id: null })}
                disabled={loading}
              >
                Cancel
              </button>
              
              <button 
                className="btn-danger"
                onClick={handleConfirmDelete}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Deleting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-trash-alt"></i> Delete Attendee
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendeeManagement;
