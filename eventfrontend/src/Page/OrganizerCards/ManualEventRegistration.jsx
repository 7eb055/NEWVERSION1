import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AuthTokenService from '../../services/AuthTokenService';

const ManualEventRegistration = ({ events, onSubmit, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    eventId: '',
    eventName: '',
    attendeeName: '',
    attendeeEmail: '',
    attendeePhone: '',
    company: '',
    ticketTypeId: '', // Changed from ticketType to ticketTypeId
    ticketQuantity: 1, // Added quantity field
    registrationType: 'manual',
    paymentStatus: 'paid',
    specialRequirements: '',
    dietaryRestrictions: '',
    accessibilityNeeds: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [availableTicketTypes, setAvailableTicketTypes] = useState([]);
  const [loadingTicketTypes, setLoadingTicketTypes] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Load ticket types when event is selected
  useEffect(() => {
    if (formData.eventId) {
      loadTicketTypes(formData.eventId);
    } else {
      setAvailableTicketTypes([]);
      setSelectedEvent(null);
    }
  }, [formData.eventId]);

  // Load available ticket types for selected event
  const loadTicketTypes = async (eventId) => {
    setLoadingTicketTypes(true);
    try {
      const token = AuthTokenService.getToken();
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${eventId}/ticket-types`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      console.log('Loaded ticket types for event:', response.data);
      setAvailableTicketTypes(response.data.ticketTypes || []);
      
      // If only one ticket type available, auto-select it
      if (response.data.ticketTypes?.length === 1) {
        setFormData(prev => ({
          ...prev,
          ticketTypeId: response.data.ticketTypes[0].ticket_type_id.toString()
        }));
      }
    } catch (error) {
      console.error('Error loading ticket types:', error);
      setAvailableTicketTypes([]);
      // If no ticket types exist, we'll use the default event ticket price
    } finally {
      setLoadingTicketTypes(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log(`📝 Input change - ${name}:`, value);
    
    if (name === 'eventId') {
      const selectedEvent = events.find(event => event.event_id === parseInt(value));
      setSelectedEvent(selectedEvent);
      const updatedData = {
        ...formData,
        [name]: value,
        eventName: selectedEvent ? selectedEvent.event_name : '',
        ticketTypeId: '', // Reset ticket type when event changes
        ticketQuantity: 1 // Reset quantity
      };
      setFormData(updatedData);
      console.log('📋 Updated form data (event):', updatedData);
    } else {
      const updatedData = {
        ...formData,
        [name]: value
      };
      setFormData(updatedData);
      console.log('📋 Updated form data (other):', updatedData);
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

    if (!formData.ticketQuantity || formData.ticketQuantity < 1) {
      newErrors.ticketQuantity = 'Ticket quantity must be at least 1';
    }

    // Validate ticket quantity against event limits
    if (selectedEvent && formData.ticketQuantity > selectedEvent.max_tickets_per_person) {
      newErrors.ticketQuantity = `Maximum ${selectedEvent.max_tickets_per_person} tickets allowed per person`;
    }

    // Validate ticket type selection if available
    if (availableTicketTypes.length > 0 && !formData.ticketTypeId) {
      newErrors.ticketTypeId = 'Please select a ticket type';
    }

    console.log('🔍 Form validation - Form data:', formData);
    console.log('❌ Validation errors:', newErrors);
    console.log('✅ Validation passed:', Object.keys(newErrors).length === 0);

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Transform form data to match backend expectations
      const submissionData = {
        eventId: formData.eventId, // Include eventId for the handler
        attendeeName: formData.attendeeName,
        attendeeEmail: formData.attendeeEmail,
        attendeePhone: formData.attendeePhone,
        ticketTypeId: formData.ticketTypeId ? parseInt(formData.ticketTypeId) : null,
        ticketQuantity: parseInt(formData.ticketQuantity),
        specialRequirements: formData.specialRequirements,
        company: formData.company,
        dietaryRestrictions: formData.dietaryRestrictions,
        accessibilityNeeds: formData.accessibilityNeeds,
        notes: formData.notes,
        registrationType: formData.registrationType,
        paymentStatus: formData.paymentStatus
      };
      
      console.log('🔍 Form data before submission:', formData);
      console.log('📤 Submitting manual registration data:', submissionData);
      console.log('📧 Email field:', submissionData.email);
      console.log('👤 Full name field:', submissionData.full_name);
      onSubmit(submissionData);
    }
  };

  // Calculate total cost based on selected ticket type and quantity
  const calculateTotalCost = () => {
    if (!formData.ticketTypeId || !formData.ticketQuantity) {
      return selectedEvent?.ticket_price ? selectedEvent.ticket_price * formData.ticketQuantity : 0;
    }
    
    const selectedTicketType = availableTicketTypes.find(
      ticket => ticket.ticket_type_id.toString() === formData.ticketTypeId
    );
    
    return selectedTicketType ? selectedTicketType.price * formData.ticketQuantity : 0;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(amount || 0);
  };

  return (
    <div className="create-event-section">
      <style>{`
        .loading-placeholder {
          padding: 8px 12px;
          background: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 4px;
          color: #666;
          font-style: italic;
        }
        
        .total-cost-display {
          font-size: 1.2em;
          font-weight: bold;
          color: #2c5282;
          padding: 8px 12px;
          background: #e6fffa;
          border: 1px solid #81e6d9;
          border-radius: 4px;
        }
        
        .total-cost-display small {
          display: block;
          font-size: 0.8em;
          font-weight: normal;
          color: #4a5568;
          margin-top: 4px;
        }
        
        .form-help {
          display: block;
          margin-top: 4px;
          font-size: 0.85em;
          color: #666;
        }
        
        .ticket-type-info {
          background: #f7fafc;
          padding: 12px;
          border-radius: 6px;
          margin-top: 8px;
          border-left: 4px solid #4299e1;
        }
        
        .ticket-type-info h4 {
          margin: 0 0 8px 0;
          color: #2d3748;
          font-size: 1em;
        }
        
        .ticket-type-info p {
          margin: 4px 0;
          color: #4a5568;
          font-size: 0.9em;
        }
      `}</style>
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
              <label htmlFor="ticketQuantity">Ticket Quantity *</label>
              <input
                type="number"
                id="ticketQuantity"
                name="ticketQuantity"
                min="1"
                max={selectedEvent?.max_tickets_per_person || 10}
                value={formData.ticketQuantity}
                onChange={handleInputChange}
                placeholder="1"
                className={errors.ticketQuantity ? 'error' : ''}
              />
              {errors.ticketQuantity && <span className="error-text">{errors.ticketQuantity}</span>}
              {selectedEvent && (
                <small className="form-help">
                  Max {selectedEvent.max_tickets_per_person} tickets per person
                </small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="ticketTypeId">
                Ticket Type 
                {availableTicketTypes.length > 0 && ' *'}
                {loadingTicketTypes && ' (Loading...)'}
              </label>
              {loadingTicketTypes ? (
                <div className="loading-placeholder">Loading ticket types...</div>
              ) : availableTicketTypes.length > 0 ? (
                <select
                  id="ticketTypeId"
                  name="ticketTypeId"
                  value={formData.ticketTypeId}
                  onChange={handleInputChange}
                  className={errors.ticketTypeId ? 'error' : ''}
                >
                  <option value="">Select ticket type...</option>
                  {availableTicketTypes.map(ticketType => (
                    <option key={ticketType.ticket_type_id} value={ticketType.ticket_type_id}>
                      {ticketType.type_name} - {formatCurrency(ticketType.price)}
                      {ticketType.quantity_available && ` (${ticketType.quantity_available - (ticketType.quantity_sold || 0)} available)`}
                    </option>
                  ))}
                </select>
              ) : (
                <select disabled>
                  <option>Using event default price: {selectedEvent ? formatCurrency(selectedEvent.ticket_price) : 'N/A'}</option>
                </select>
              )}
              {errors.ticketTypeId && <span className="error-text">{errors.ticketTypeId}</span>}
              
              {/* Show selected ticket type details */}
              {formData.ticketTypeId && availableTicketTypes.length > 0 && (() => {
                const selectedTicketType = availableTicketTypes.find(
                  ticket => ticket.ticket_type_id.toString() === formData.ticketTypeId
                );
                return selectedTicketType && (selectedTicketType.description || selectedTicketType.benefits) ? (
                  <div className="ticket-type-info">
                    <h4>{selectedTicketType.type_name}</h4>
                    {selectedTicketType.description && (
                      <p><strong>Description:</strong> {selectedTicketType.description}</p>
                    )}
                    {selectedTicketType.benefits && (
                      <p><strong>Benefits:</strong> {selectedTicketType.benefits}</p>
                    )}
                    <p><strong>Available:</strong> {selectedTicketType.quantity_available - (selectedTicketType.quantity_sold || 0)} tickets</p>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Show total cost calculation */}
            {formData.ticketQuantity > 0 && (
              <div className="form-group">
                <label>Total Cost</label>
                <div className="total-cost-display">
                  {formatCurrency(calculateTotalCost())}
                  {formData.ticketQuantity > 1 && (
                    <small>
                      ({formData.ticketQuantity} × {formatCurrency(calculateTotalCost() / formData.ticketQuantity)})
                    </small>
                  )}
                </div>
              </div>
            )}

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
