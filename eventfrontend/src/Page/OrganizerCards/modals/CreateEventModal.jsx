import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDashboardState } from '../hooks/useDashboardState';
import { useEventData } from '../hooks/useEventData';
import Modal from '../Modal';
import ImageUpload from '../../../component/ImageUpload';
import ApiService from '../../../services/ApiService';
import '../CreateEventForm.css';

const CreateEventModal = () => {
  const {
    showCreateForm,
    setShowCreateForm,
    formData,
    handleInputChange,
    resetFormData
  } = useDashboardState();

  const { isLoading } = useEventData();
  const [categories, setCategories] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/categories`);
      if (response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  // Fetch categories on component mount
  useEffect(() => {
    if (showCreateForm) {
      fetchCategories();
    }
  }, [showCreateForm, fetchCategories]);

  // Handle modal close
  const handleClose = () => {
    setShowCreateForm(false);
    resetFormData();
    setCurrentStep(1);
    setIsSubmitting(false);
  };

  // Handle image upload
  const handleImageChange = (imageData) => {
    handleInputChange({
      target: {
        name: 'image_url',
        value: imageData.url || ''
      }
    });
    
    // Handle additional image metadata if needed
    if (imageData.filename) {
      handleInputChange({
        target: { name: 'image_filename', value: imageData.filename }
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await ApiService.createEvent(formData);
      if (result.success) {
        console.log('Event created successfully:', result.data);
        handleClose(); // Close modal on success
      } else {
        console.error('Error creating event:', result.error);
        // You might want to show an error message to the user here
      }
    } catch (error) {
      console.error('Error creating event:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step navigation
  const handleNextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const handlePreviousStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="form-step">
            <h3 className="step-title">Basic Event Information</h3>
            
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="event_name">Event Name *</label>
                <input
                  type="text"
                  id="event_name"
                  name="event_name"
                  value={formData.event_name}
                  onChange={handleInputChange}
                  placeholder="Enter event name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="event_date">Event Date *</label>
                <input
                  type="datetime-local"
                  id="event_date"
                  name="event_date"
                  value={formData.event_date}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="category">Category *</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="event_type">Event Type</label>
                <select
                  id="event_type"
                  name="event_type"
                  value={formData.event_type}
                  onChange={handleInputChange}
                >
                  <option value="Conference">Conference</option>
                  <option value="Workshop">Workshop</option>
                  <option value="Seminar">Seminar</option>
                  <option value="Networking">Networking</option>
                  <option value="Social">Social</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe your event"
                rows="4"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="form-step">
            <h3 className="step-title">Venue & Location</h3>
            
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="venue_name">Venue Name</label>
                <input
                  type="text"
                  id="venue_name"
                  name="venue_name"
                  value={formData.venue_name}
                  onChange={handleInputChange}
                  placeholder="Enter venue name"
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="venue_address">Venue Address</label>
                <textarea
                  id="venue_address"
                  name="venue_address"
                  value={formData.venue_address}
                  onChange={handleInputChange}
                  placeholder="Enter complete venue address"
                  rows="3"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="image_upload">Event Image</label>
              <ImageUpload 
                onImageChange={handleImageChange}
                currentImage={formData.image_url}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="form-step">
            <h3 className="step-title">Ticketing & Attendance</h3>
            
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="ticket_price">Ticket Price ($)</label>
                <input
                  type="number"
                  id="ticket_price"
                  name="ticket_price"
                  value={formData.ticket_price}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label htmlFor="max_attendees">Max Attendees</label>
                <input
                  type="number"
                  id="max_attendees"
                  name="max_attendees"
                  value={formData.max_attendees}
                  onChange={handleInputChange}
                  placeholder="Unlimited"
                  min="1"
                />
              </div>

              <div className="form-group">
                <label htmlFor="max_tickets_per_person">Max Tickets per Person</label>
                <input
                  type="number"
                  id="max_tickets_per_person"
                  name="max_tickets_per_person"
                  value={formData.max_tickets_per_person}
                  onChange={handleInputChange}
                  min="1"
                  max="10"
                />
              </div>

              <div className="form-group">
                <label htmlFor="registration_deadline">Registration Deadline</label>
                <input
                  type="datetime-local"
                  id="registration_deadline"
                  name="registration_deadline"
                  value={formData.registration_deadline}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="is_public"
                    checked={formData.is_public}
                    onChange={(e) => handleInputChange({
                      target: { name: 'is_public', value: e.target.checked }
                    })}
                  />
                  <span className="checkmark"></span>
                  Public Event
                </label>
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="requires_approval"
                    checked={formData.requires_approval}
                    onChange={(e) => handleInputChange({
                      target: { name: 'requires_approval', value: e.target.checked }
                    })}
                  />
                  <span className="checkmark"></span>
                  Requires Approval
                </label>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="form-step">
            <h3 className="step-title">Additional Details</h3>
            
            <div className="form-group">
              <label htmlFor="tags">Tags (comma-separated)</label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                placeholder="e.g., networking, technology, business"
              />
            </div>

            <div className="form-group">
              <label htmlFor="refund_policy">Refund Policy</label>
              <textarea
                id="refund_policy"
                name="refund_policy"
                value={formData.refund_policy}
                onChange={handleInputChange}
                placeholder="Describe your refund policy"
                rows="3"
              />
            </div>

            <div className="form-group">
              <label htmlFor="terms_and_conditions">Terms & Conditions</label>
              <textarea
                id="terms_and_conditions"
                name="terms_and_conditions"
                value={formData.terms_and_conditions}
                onChange={handleInputChange}
                placeholder="Enter terms and conditions"
                rows="4"
              />
            </div>

            <div className="form-group">
              <label htmlFor="status">Event Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!showCreateForm) return null;

  return (
    <Modal
      isOpen={showCreateForm}
      onClose={handleClose}
      title="Create New Event"
      maxWidth="70%"
    >
      <div className="create-event-form">
        {/* Progress indicator */}
        <div className="form-progress">
          <div className="progress-steps">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`progress-step ${currentStep >= step ? 'active' : ''} ${currentStep === step ? 'current' : ''}`}
              >
                <span className="step-number">{step}</span>
                <span className="step-label">
                  {step === 1 && 'Basic Info'}
                  {step === 2 && 'Venue'}
                  {step === 3 && 'Ticketing'}
                  {step === 4 && 'Details'}
                </span>
              </div>
            ))}
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(currentStep / 4) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Form content */}
        <form onSubmit={handleSubmit}>
          {renderStepContent()}

          {/* Navigation buttons */}
          <div className="form-navigation">
            <div className="nav-buttons">
              {currentStep > 1 && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handlePreviousStep}
                  disabled={isSubmitting}
                >
                  <i className="fas fa-arrow-left"></i>
                  Previous
                </button>
              )}

              <div className="nav-buttons-right">
                {currentStep < 4 ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleNextStep}
                    disabled={isSubmitting}
                  >
                    Next
                    <i className="fas fa-arrow-right"></i>
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={isSubmitting || isLoading}
                  >
                    {isSubmitting ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Creating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check"></i>
                        Create Event
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default CreateEventModal;
