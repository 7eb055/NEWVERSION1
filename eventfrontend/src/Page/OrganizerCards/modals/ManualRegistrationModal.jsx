import React, { useState } from 'react';
import { useDashboardState } from '../hooks/useDashboardState';
import { useEventData } from '../hooks/useEventData';
import Modal from '../Modal';

const ManualRegistrationModal = () => {
  const {
    showRegistrationForm,
    setShowRegistrationForm
  } = useDashboardState();

  const { events } = useEventData();

  const [registrationData, setRegistrationData] = useState({
    event_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    job_title: '',
    dietary_restrictions: '',
    special_requirements: '',
    registration_notes: '',
    registration_status: 'confirmed'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setRegistrationData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle modal close
  const handleClose = () => {
    setShowRegistrationForm(false);
    setRegistrationData({
      event_id: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      company: '',
      job_title: '',
      dietary_restrictions: '',
      special_requirements: '',
      registration_notes: '',
      registration_status: 'confirmed'
    });
    setError('');
    setSuccess('');
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/registrations/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(registrationData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to register attendee');
      }

      await response.json();
      setSuccess('Attendee registered successfully!');
      
      // Close modal after short delay
      setTimeout(() => {
        handleClose();
      }, 1500);

    } catch (error) {
      console.error('Error registering attendee:', error);
      setError(error.message || 'Failed to register attendee');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showRegistrationForm) return null;

  return (
    <Modal
      isOpen={showRegistrationForm}
      onClose={handleClose}
      title="Manual Event Registration"
      maxWidth="60%"
    >
      <div className="manual-registration-form">
        {/* Success/Error Messages */}
        {success && (
          <div className="alert alert-success">
            <i className="fas fa-check-circle"></i>
            {success}
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Event Selection */}
          <div className="form-section">
            <h3 className="section-title">Event Selection</h3>
            
            <div className="form-group">
              <label htmlFor="event_id">Select Event *</label>
              <select
                id="event_id"
                name="event_id"
                value={registrationData.event_id}
                onChange={handleInputChange}
                required
              >
                <option value="">Choose an event</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.event_name} - {new Date(event.event_date).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Personal Information */}
          <div className="form-section">
            <h3 className="section-title">Attendee Information</h3>
            
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="first_name">First Name *</label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={registrationData.first_name}
                  onChange={handleInputChange}
                  placeholder="Enter first name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="last_name">Last Name *</label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={registrationData.last_name}
                  onChange={handleInputChange}
                  placeholder="Enter last name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={registrationData.email}
                  onChange={handleInputChange}
                  placeholder="attendee@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={registrationData.phone}
                  onChange={handleInputChange}
                  placeholder="(123) 456-7890"
                />
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="form-section">
            <h3 className="section-title">Professional Details</h3>
            
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="company">Company/Organization</label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={registrationData.company}
                  onChange={handleInputChange}
                  placeholder="Company name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="job_title">Job Title</label>
                <input
                  type="text"
                  id="job_title"
                  name="job_title"
                  value={registrationData.job_title}
                  onChange={handleInputChange}
                  placeholder="Job title or position"
                />
              </div>
            </div>
          </div>

          {/* Special Requirements */}
          <div className="form-section">
            <h3 className="section-title">Special Requirements</h3>
            
            <div className="form-group">
              <label htmlFor="dietary_restrictions">Dietary Restrictions</label>
              <textarea
                id="dietary_restrictions"
                name="dietary_restrictions"
                value={registrationData.dietary_restrictions}
                onChange={handleInputChange}
                placeholder="Any dietary restrictions or allergies"
                rows="2"
              />
            </div>

            <div className="form-group">
              <label htmlFor="special_requirements">Accessibility Requirements</label>
              <textarea
                id="special_requirements"
                name="special_requirements"
                value={registrationData.special_requirements}
                onChange={handleInputChange}
                placeholder="Any accessibility needs or special accommodations"
                rows="2"
              />
            </div>

            <div className="form-group">
              <label htmlFor="registration_notes">Registration Notes</label>
              <textarea
                id="registration_notes"
                name="registration_notes"
                value={registrationData.registration_notes}
                onChange={handleInputChange}
                placeholder="Any additional notes about this registration"
                rows="3"
              />
            </div>
          </div>

          {/* Registration Status */}
          <div className="form-section">
            <h3 className="section-title">Registration Status</h3>
            
            <div className="form-group">
              <label htmlFor="registration_status">Status</label>
              <select
                id="registration_status"
                name="registration_status"
                value={registrationData.registration_status}
                onChange={handleInputChange}
              >
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="waitlist">Waitlist</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Registering...
                </>
              ) : (
                <>
                  <i className="fas fa-user-plus"></i>
                  Register Attendee
                </>
              )}
            </button>

            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default ManualRegistrationModal;
