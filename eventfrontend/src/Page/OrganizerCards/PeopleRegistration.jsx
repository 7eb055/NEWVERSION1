import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AuthTokenService from '../../services/AuthTokenService';
import './css/PeopleRegistration.css';

const PeopleRegistration = ({ onSubmit, onCancel, isLoading: propIsLoading, editMode = false, initialData = null }) => {
  const [isLoading, setIsLoading] = useState(propIsLoading || false);
  const [companies, setCompanies] = useState([]);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    interests: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    dietary_restrictions: '',
    accessibility_needs: '',
    bio: '',
    social_media_links: {},
    notification_preferences: {},
    company_id: '', // For associating with a company if applicable
    profile_picture_url: ''
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');

  // Fetch companies when component mounts
  useEffect(() => {
    fetchCompanies();
    
    // If in edit mode, populate form with initial data
    if (editMode && initialData) {
      setFormData({
        ...formData,
        ...initialData,
        // Parse JSON strings if needed
        social_media_links: typeof initialData.social_media_links === 'string' 
          ? JSON.parse(initialData.social_media_links || '{}') 
          : initialData.social_media_links || {},
        notification_preferences: typeof initialData.notification_preferences === 'string'
          ? JSON.parse(initialData.notification_preferences || '{}')
          : initialData.notification_preferences || {}
      });
    }
  }, [editMode, initialData]);

  const fetchCompanies = async () => {
    try {
      const token = AuthTokenService.getToken();
      
      if (!token) {
        console.error('Authentication token not found');
        return;
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/companies`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setCompanies(response.data.companies || []);
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSocialMediaChange = (platform, value) => {
    setFormData(prev => ({
      ...prev,
      social_media_links: {
        ...prev.social_media_links,
        [platform]: value
      }
    }));
  };

  const handleNotificationPreferenceChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      notification_preferences: {
        ...prev.notification_preferences,
        [name]: checked
      }
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      setIsLoading(true);
      setSuccess('');
      
      try {
        const token = AuthTokenService.getToken();
        
        if (!token) {
          setErrors({ general: 'Authentication token not found. Please log in.' });
          setIsLoading(false);
          return;
        }
        
        // Prepare data - ensure JSON fields are properly formatted
        const attendeeData = {
          ...formData,
          social_media_links: JSON.stringify(formData.social_media_links),
          notification_preferences: JSON.stringify(formData.notification_preferences)
        };
        
        let response;
        
        if (editMode && initialData?.attendee_id) {
          // Update existing attendee
          response = await axios.put(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/attendees/${initialData.attendee_id}`,
            attendeeData,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          setSuccess('Attendee updated successfully!');
        } else {
          // Create new attendee
          response = await axios.post(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/attendees`,
            attendeeData,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          setSuccess('Attendee registered successfully!');
        }
        
        // Call the parent component's onSubmit handler with the response data
        if (onSubmit && typeof onSubmit === 'function') {
          onSubmit(response.data);
        }
        
        // If not in edit mode, reset the form
        if (!editMode) {
          setFormData({
            full_name: '',
            email: '',
            phone: '',
            date_of_birth: '',
            gender: '',
            interests: '',
            emergency_contact_name: '',
            emergency_contact_phone: '',
            dietary_restrictions: '',
            accessibility_needs: '',
            bio: '',
            social_media_links: {},
            notification_preferences: {},
            company_id: '',
            profile_picture_url: ''
          });
        }
      } catch (err) {
        console.error('Error registering/updating attendee:', err);
        let errorMessage = 'Failed to register/update attendee. Please try again.';
        
        if (err.response && err.response.data && err.response.data.message) {
          errorMessage = err.response.data.message;
        }
        
        setErrors({ general: errorMessage });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="people-registration-container">
      <div className="form-container">
        <div className="form-title">
          <i className="fas fa-users"></i>
          {editMode ? 'Edit Person' : 'Register Person'}
        </div>
        
        {success && (
          <div className="success-message">
            <i className="fas fa-check-circle"></i> {success}
          </div>
        )}
        
        {errors.general && (
          <div className="error-message">
            <i className="fas fa-exclamation-circle"></i> {errors.general}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="people-form">
          <div className="form-grid">
            {/* Basic Information */}
            <div className="form-section">
              <h3 className="section-title">Basic Information</h3>
              
              <div className="form-group">
                <label htmlFor="full_name">Full Name *</label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="Enter full name"
                  className={errors.full_name ? 'error' : ''}
                />
                {errors.full_name && <span className="error-text">{errors.full_name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="person@example.com"
                  className={errors.email ? 'error' : ''}
                />
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+1-555-0123"
                  className={errors.phone ? 'error' : ''}
                />
                {errors.phone && <span className="error-text">{errors.phone}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="date_of_birth">Date of Birth</label>
                <input
                  type="date"
                  id="date_of_birth"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="gender">Gender</label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non-binary">Non-Binary</option>
                  <option value="prefer-not-to-say">Prefer Not to Say</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="company_id">Associated Company</label>
                <select
                  id="company_id"
                  name="company_id"
                  value={formData.company_id}
                  onChange={handleInputChange}
                >
                  <option value="">Select Company (Optional)</option>
                  {companies.map(company => (
                    <option key={company.company_id} value={company.company_id}>
                      {company.company_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="profile_picture_url">Profile Picture URL</label>
                <input
                  type="url"
                  id="profile_picture_url"
                  name="profile_picture_url"
                  value={formData.profile_picture_url}
                  onChange={handleInputChange}
                  placeholder="https://example.com/profile-picture.jpg"
                />
              </div>
            </div>
            
            {/* Contact & Emergency Information */}
            <div className="form-section">
              <h3 className="section-title">Emergency Contact</h3>
              
              <div className="form-group">
                <label htmlFor="emergency_contact_name">Emergency Contact Name</label>
                <input
                  type="text"
                  id="emergency_contact_name"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleInputChange}
                  placeholder="Emergency contact name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="emergency_contact_phone">Emergency Contact Phone</label>
                <input
                  type="tel"
                  id="emergency_contact_phone"
                  name="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={handleInputChange}
                  placeholder="+1-555-0456"
                />
              </div>
            </div>
            
            {/* Additional Information */}
            <div className="form-section wide-section">
              <h3 className="section-title">Additional Information</h3>
              
              <div className="form-group">
                <label htmlFor="interests">Interests</label>
                <textarea
                  id="interests"
                  name="interests"
                  value={formData.interests}
                  onChange={handleInputChange}
                  placeholder="Describe interests, separated by commas"
                  rows="2"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="Brief biography or description"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label htmlFor="dietary_restrictions">Dietary Restrictions</label>
                <input
                  type="text"
                  id="dietary_restrictions"
                  name="dietary_restrictions"
                  value={formData.dietary_restrictions}
                  onChange={handleInputChange}
                  placeholder="Any dietary restrictions or allergies"
                />
              </div>

              <div className="form-group">
                <label htmlFor="accessibility_needs">Accessibility Needs</label>
                <input
                  type="text"
                  id="accessibility_needs"
                  name="accessibility_needs"
                  value={formData.accessibility_needs}
                  onChange={handleInputChange}
                  placeholder="Any accessibility requirements"
                />
              </div>
            </div>
            
            {/* Social Media */}
            <div className="form-section wide-section">
              <h3 className="section-title">Social Media</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="social_linkedin">LinkedIn</label>
                  <input
                    type="url"
                    id="social_linkedin"
                    value={formData.social_media_links.linkedin || ''}
                    onChange={(e) => handleSocialMediaChange('linkedin', e.target.value)}
                    placeholder="LinkedIn profile URL"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="social_twitter">X/Twitter</label>
                  <input
                    type="url"
                    id="social_twitter"
                    value={formData.social_media_links.twitter || ''}
                    onChange={(e) => handleSocialMediaChange('twitter', e.target.value)}
                    placeholder="X/Twitter profile URL"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="social_facebook">Facebook</label>
                  <input
                    type="url"
                    id="social_facebook"
                    value={formData.social_media_links.facebook || ''}
                    onChange={(e) => handleSocialMediaChange('facebook', e.target.value)}
                    placeholder="Facebook profile URL"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="social_instagram">Instagram</label>
                  <input
                    type="url"
                    id="social_instagram"
                    value={formData.social_media_links.instagram || ''}
                    onChange={(e) => handleSocialMediaChange('instagram', e.target.value)}
                    placeholder="Instagram profile URL"
                  />
                </div>
              </div>
            </div>
            
            {/* Notification Preferences */}
            <div className="form-section wide-section">
              <h3 className="section-title">Notification Preferences</h3>
              
              <div className="checkbox-group">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    name="email_updates"
                    checked={formData.notification_preferences.email_updates || false}
                    onChange={handleNotificationPreferenceChange}
                  />
                  <span className="checkmark"></span>
                  Email Updates
                </label>
                
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    name="sms_updates"
                    checked={formData.notification_preferences.sms_updates || false}
                    onChange={handleNotificationPreferenceChange}
                  />
                  <span className="checkmark"></span>
                  SMS Updates
                </label>
                
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    name="marketing_communications"
                    checked={formData.notification_preferences.marketing_communications || false}
                    onChange={handleNotificationPreferenceChange}
                  />
                  <span className="checkmark"></span>
                  Marketing Communications
                </label>
                
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    name="event_reminders"
                    checked={formData.notification_preferences.event_reminders || false}
                    onChange={handleNotificationPreferenceChange}
                  />
                  <span className="checkmark"></span>
                  Event Reminders
                </label>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  {editMode ? 'Updating...' : 'Registering...'}
                </>
              ) : (
                <>
                  <i className={editMode ? 'fas fa-save' : 'fas fa-user-plus'}></i>
                  {editMode ? 'Update Person' : 'Register Person'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PeopleRegistration;