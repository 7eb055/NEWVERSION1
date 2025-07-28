import React, { useState } from 'react';

const PeopleRegistration = ({ onSubmit, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'attendee',
    company: '',
    title: '',
    bio: '',
    specialRequirements: '',
    emergencyContact: '',
    emergencyPhone: '',
    dietaryRestrictions: '',
    accessibilityNeeds: ''
  });

  const [errors, setErrors] = useState({});

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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="create-event-section">
      <div className="form-container">
        <div className="form-title">
          <i className="fas fa-users"></i>
          Register Person
        </div>
        
        <form onSubmit={handleSubmit} className="event-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter full name"
                className={errors.name ? 'error' : ''}
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
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
              <label htmlFor="role">Role *</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
              >
                <option value="attendee">Attendee</option>
                <option value="speaker">Speaker</option>
                <option value="vip">VIP Guest</option>
                <option value="staff">Staff Member</option>
                <option value="volunteer">Volunteer</option>
                <option value="media">Media</option>
                <option value="sponsor">Sponsor Representative</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="company">Company/Organization</label>
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                placeholder="Company or organization"
              />
            </div>

            <div className="form-group">
              <label htmlFor="title">Job Title</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Job title or position"
              />
            </div>

            <div className="form-group">
              <label htmlFor="emergencyContact">Emergency Contact</label>
              <input
                type="text"
                id="emergencyContact"
                name="emergencyContact"
                value={formData.emergencyContact}
                onChange={handleInputChange}
                placeholder="Emergency contact name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="emergencyPhone">Emergency Phone</label>
              <input
                type="tel"
                id="emergencyPhone"
                name="emergencyPhone"
                value={formData.emergencyPhone}
                onChange={handleInputChange}
                placeholder="+1-555-0456"
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="bio">Bio/Description</label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Brief biography or description"
                rows="3"
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="dietaryRestrictions">Dietary Restrictions</label>
              <input
                type="text"
                id="dietaryRestrictions"
                name="dietaryRestrictions"
                value={formData.dietaryRestrictions}
                onChange={handleInputChange}
                placeholder="Any dietary restrictions or allergies"
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="accessibilityNeeds">Accessibility Needs</label>
              <input
                type="text"
                id="accessibilityNeeds"
                name="accessibilityNeeds"
                value={formData.accessibilityNeeds}
                onChange={handleInputChange}
                placeholder="Any accessibility requirements"
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="specialRequirements">Special Requirements</label>
              <textarea
                id="specialRequirements"
                name="specialRequirements"
                value={formData.specialRequirements}
                onChange={handleInputChange}
                placeholder="Any special requirements or notes"
                rows="3"
              />
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
                  Registering...
                </>
              ) : (
                <>
                  <i className="fas fa-user-plus"></i>
                  Register Person
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