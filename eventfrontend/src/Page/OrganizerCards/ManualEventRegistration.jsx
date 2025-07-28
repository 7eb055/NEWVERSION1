import React, { useState } from 'react';

const ManualEventRegistration = ({ events, onSubmit, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    eventId: '',
    eventName: '',
    attendeeName: '',
    attendeeEmail: '',
    attendeePhone: '',
    company: '',
    ticketType: 'standard',
    registrationType: 'manual',
    paymentStatus: 'paid',
    specialRequirements: '',
    dietaryRestrictions: '',
    accessibilityNeeds: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'eventId') {
      const selectedEvent = events.find(event => event.event_id === parseInt(value));
      setFormData(prev => ({
        ...prev,
        [name]: value,
        eventName: selectedEvent ? selectedEvent.event_name : ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
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

    if (!formData.eventId) {
      newErrors.eventId = 'Please select an event';
    }

    if (!formData.attendeeName.trim()) {
      newErrors.attendeeName = 'Attendee name is required';
    }

    if (!formData.attendeeEmail.trim()) {
      newErrors.attendeeEmail = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.attendeeEmail)) {
      newErrors.attendeeEmail = 'Email is invalid';
    }

    if (!formData.attendeePhone.trim()) {
      newErrors.attendeePhone = 'Phone number is required';
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
          <i className="fas fa-user-plus"></i>
          Manual Event Registration
        </div>
        
        <form onSubmit={handleSubmit} className="event-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="eventId">Select Event *</label>
              <select
                id="eventId"
                name="eventId"
                value={formData.eventId}
                onChange={handleInputChange}
                className={errors.eventId ? 'error' : ''}
              >
                <option value="">Choose an event...</option>
                {events.map(event => (
                  <option key={event.event_id} value={event.event_id}>
                    {event.event_name} - {new Date(event.event_date).toLocaleDateString()}
                  </option>
                ))}
              </select>
              {errors.eventId && <span className="error-text">{errors.eventId}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="registrationType">Registration Type</label>
              <select
                id="registrationType"
                name="registrationType"
                value={formData.registrationType}
                onChange={handleInputChange}
              >
                <option value="manual">Manual</option>
                <option value="bulk">Bulk Registration</option>
                <option value="offline">Offline Registration</option>
                <option value="phone">Phone Registration</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="attendeeName">Attendee Name *</label>
              <input
                type="text"
                id="attendeeName"
                name="attendeeName"
                value={formData.attendeeName}
                onChange={handleInputChange}
                placeholder="Enter attendee full name"
                className={errors.attendeeName ? 'error' : ''}
              />
              {errors.attendeeName && <span className="error-text">{errors.attendeeName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="attendeeEmail">Email *</label>
              <input
                type="email"
                id="attendeeEmail"
                name="attendeeEmail"
                value={formData.attendeeEmail}
                onChange={handleInputChange}
                placeholder="attendee@example.com"
                className={errors.attendeeEmail ? 'error' : ''}
              />
              {errors.attendeeEmail && <span className="error-text">{errors.attendeeEmail}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="attendeePhone">Phone *</label>
              <input
                type="tel"
                id="attendeePhone"
                name="attendeePhone"
                value={formData.attendeePhone}
                onChange={handleInputChange}
                placeholder="+1-555-0123"
                className={errors.attendeePhone ? 'error' : ''}
              />
              {errors.attendeePhone && <span className="error-text">{errors.attendeePhone}</span>}
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
              <label htmlFor="ticketType">Ticket Type</label>
              <select
                id="ticketType"
                name="ticketType"
                value={formData.ticketType}
                onChange={handleInputChange}
              >
                <option value="standard">Standard</option>
                <option value="vip">VIP</option>
                <option value="early-bird">Early Bird</option>
                <option value="student">Student</option>
                <option value="group">Group</option>
                <option value="complimentary">Complimentary</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="paymentStatus">Payment Status</label>
              <select
                id="paymentStatus"
                name="paymentStatus"
                value={formData.paymentStatus}
                onChange={handleInputChange}
              >
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial Payment</option>
                <option value="complimentary">Complimentary</option>
                <option value="refunded">Refunded</option>
              </select>
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
                placeholder="Any special requirements for this attendee"
                rows="3"
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="notes">Additional Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Any additional notes or comments"
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
                  <i className="fas fa-check"></i>
                  Complete Registration
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualEventRegistration;
