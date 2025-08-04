import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './CreateEventForm.css';

const CreateEventForm = ({
  formData,
  handleInputChange,
  handleSubmit,
  setShowCreateForm,
  isLoading
}) => {
  const [imageSource, setImageSource] = useState('url'); // 'url' or 'upload'
  const [imagePreview, setImagePreview] = useState(formData.image_url || '');
  const [categories, setCategories] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const fileInputRef = useRef(null);
  
  // Fetch categories on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch event categories
        const categoriesResponse = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/categories`);
        if (categoriesResponse.data) {
          setCategories(categoriesResponse.data);
        }
      } catch (error) {
        console.error('Error fetching form data:', error);
      }
    };
    
    fetchData();
  }, []);
  
  const handleImageSourceChange = (source) => {
    setImageSource(source);
    // Clear the preview and form data when changing source
    if (source === 'url' && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (!formData.image_url) {
      setImagePreview('');
    }
  };
  
  const handleImageChange = (e) => {
    const { name, value, files } = e.target;
    
    if (name === 'image_url' && imageSource === 'url') {
      handleInputChange(e);
      setImagePreview(value);
    } else if (name === 'imageFile' && files && files[0]) {
      const file = files[0];
      // Handle file upload - store in formData and create preview
      handleInputChange({
        target: {
          name: 'imageFile',
          value: file
        }
      });
      
      // Create image preview
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Function to handle moving between steps
  const handleNextStep = () => {
    setCurrentStep(currentStep + 1);
    window.scrollTo(0, 0);
  };
  
  const handlePreviousStep = () => {
    setCurrentStep(currentStep - 1);
    window.scrollTo(0, 0);
  };
  
  // Custom form submission handling
  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSubmit(e);
  };
  return (
    <div className="create-event-section">
      <div className="form-container">
        <h2 className="form-title">
          <i className="fas fa-calendar-plus"></i>
          Create New Event
        </h2>
        
        {/* Progress indicator */}
        <div className="form-progress">
          <div className={`progress-step ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Basic Info</span>
          </div>
          <div className={`progress-step ${currentStep === 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Venue & Time</span>
          </div>
          <div className={`progress-step ${currentStep === 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Details & Media</span>
          </div>
          <div className={`progress-step ${currentStep === 4 ? 'active' : ''}`}>
            <span className="step-number">4</span>
            <span className="step-label">Tickets & Settings</span>
          </div>
        </div>
        
        <form className="create-event-form" onSubmit={handleFormSubmit}>
          {/* Step 1: Basic Event Information */}
          {currentStep === 1 && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="event_name" className="form-label">
                    <i className="fas fa-tag"></i>
                    Event Name *
                  </label>
                  <input
                    type="text"
                    id="event_name"
                    name="event_name"
                    className="form-input"
                    placeholder="Enter event name"
                    value={formData.event_name || ''}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="event_type" className="form-label">
                    <i className="fas fa-shapes"></i>
                    Event Type *
                  </label>
                  <select
                    id="event_type"
                    name="event_type"
                    className="form-select"
                    value={formData.event_type || 'Conference'}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="Conference">Conference</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Seminar">Seminar</option>
                    <option value="Networking">Networking</option>
                    <option value="Social">Social</option>
                    <option value="Concert">Concert</option>
                    <option value="Exhibition">Exhibition</option>
                    <option value="Webinar">Webinar</option>
                    <option value="Hackathon">Hackathon</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="category" className="form-label">
                    <i className="fas fa-list"></i>
                    Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    className="form-select"
                    value={formData.category || ''}
                    onChange={handleInputChange}
                  >
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat.category_id} value={cat.category_name}>
                        {cat.category_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="tags" className="form-label">
                    <i className="fas fa-tags"></i>
                    Tags (Comma Separated)
                  </label>
                  <input
                    type="text"
                    id="tags"
                    name="tags"
                    className="form-input"
                    placeholder="technology, business, networking, etc."
                    value={formData.tags || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="description" className="form-label">
                  <i className="fas fa-align-left"></i>
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  className="form-textarea"
                  placeholder="Describe your event..."
                  value={formData.description || ''}
                  onChange={handleInputChange}
                  rows="4"
                  required
                ></textarea>
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowCreateForm(false)}
                >
                  <i className="fas fa-times"></i>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="next-btn"
                  onClick={handleNextStep}
                >
                  Next Step
                  <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </>
          )}
          
          {/* Step 2: Venue and Time Information */}
          {currentStep === 2 && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="event_date" className="form-label">
                    <i className="fas fa-calendar"></i>
                    Start Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    id="event_date"
                    name="event_date"
                    className="form-input"
                    value={formData.event_date || ''}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="end_date" className="form-label">
                    <i className="fas fa-calendar-check"></i>
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    id="end_date"
                    name="end_date"
                    className="form-input"
                    value={formData.end_date || ''}
                    onChange={handleInputChange}
                    min={formData.event_date || ''}
                  />
                </div>
              </div>

              <div className="form-group venue-section">
                <label className="form-label">
                  <i className="fas fa-map-marker-alt"></i>
                  Venue Information
                </label>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="venue_name" className="form-label">
                      <i className="fas fa-building"></i>
                      Venue Name *
                    </label>
                    <input
                      type="text"
                      id="venue_name"
                      name="venue_name"
                      className="form-input"
                      placeholder="Enter venue name"
                      value={formData.venue_name || ''}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="venue_address" className="form-label">
                    <i className="fas fa-map-pin"></i>
                    Venue Address *
                  </label>
                  <textarea
                    id="venue_address"
                    name="venue_address"
                    className="form-textarea"
                    placeholder="Enter venue address"
                    value={formData.venue_address || ''}
                    onChange={handleInputChange}
                    rows="3"
                    required
                  ></textarea>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="registration_deadline" className="form-label">
                  <i className="fas fa-hourglass-end"></i>
                  Registration Deadline
                </label>
                <input
                  type="date"
                  id="registration_deadline"
                  name="registration_deadline"
                  className="form-input"
                  value={formData.registration_deadline || ''}
                  onChange={handleInputChange}
                  max={formData.event_date ? new Date(formData.event_date).toISOString().split('T')[0] : ''}
                />
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="back-btn"
                  onClick={handlePreviousStep}
                >
                  <i className="fas fa-arrow-left"></i>
                  Previous
                </button>
                <button 
                  type="button" 
                  className="next-btn"
                  onClick={handleNextStep}
                >
                  Next Step
                  <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </>
          )}
          
          {/* Step 3: Details and Media */}
          {currentStep === 3 && (
            <>
              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-image"></i>
                  Event Image
                </label>
                
                <div className="image-source-toggle">
                  <button 
                    type="button" 
                    className={`image-source-btn ${imageSource === 'url' ? 'active' : ''}`}
                    onClick={() => handleImageSourceChange('url')}
                  >
                    <i className="fas fa-link"></i>
                    Image URL
                  </button>
                  <button 
                    type="button" 
                    className={`image-source-btn ${imageSource === 'upload' ? 'active' : ''}`}
                    onClick={() => handleImageSourceChange('upload')}
                  >
                    <i className="fas fa-upload"></i>
                    Upload Image
                  </button>
                </div>
                
                {imageSource === 'url' ? (
                  <input
                    type="url"
                    id="image_url"
                    name="image_url"
                    className="form-input"
                    placeholder="Enter image URL"
                    value={formData.image_url || ''}
                    onChange={handleImageChange}
                  />
                ) : (
                  <div className="file-upload-container">
                    <input
                      type="file"
                      id="imageFile"
                      name="imageFile"
                      ref={fileInputRef}
                      className="file-input"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                    <label htmlFor="imageFile" className="file-upload-label">
                      <i className="fas fa-cloud-upload-alt"></i>
                      {formData.imageFile ? formData.imageFile.name : 'Choose Image File'}
                    </label>
                  </div>
                )}
                
                {imagePreview && (
                  <div className="image-preview-container">
                    <img 
                      src={imagePreview} 
                      alt="Event Preview" 
                      className="image-preview" 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/400x200?text=Image+Preview+Unavailable';
                      }}
                    />
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="refund_policy" className="form-label">
                  <i className="fas fa-undo"></i>
                  Refund Policy
                </label>
                <textarea
                  id="refund_policy"
                  name="refund_policy"
                  className="form-textarea"
                  placeholder="Describe your refund policy..."
                  value={formData.refund_policy || ''}
                  onChange={handleInputChange}
                  rows="3"
                ></textarea>
              </div>
              
              <div className="form-group">
                <label htmlFor="terms_and_conditions" className="form-label">
                  <i className="fas fa-file-contract"></i>
                  Terms and Conditions
                </label>
                <textarea
                  id="terms_and_conditions"
                  name="terms_and_conditions"
                  className="form-textarea"
                  placeholder="Enter event terms and conditions..."
                  value={formData.terms_and_conditions || ''}
                  onChange={handleInputChange}
                  rows="3"
                ></textarea>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="back-btn"
                  onClick={handlePreviousStep}
                >
                  <i className="fas fa-arrow-left"></i>
                  Previous
                </button>
                <button 
                  type="button" 
                  className="next-btn"
                  onClick={handleNextStep}
                >
                  Next Step
                  <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </>
          )}
          
          {/* Step 4: Tickets and Settings */}
          {currentStep === 4 && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="ticket_price" className="form-label">
                    <i className="fas fa-dollar-sign"></i>
                    Ticket Price ($) *
                  </label>
                  <input
                    type="number"
                    id="ticket_price"
                    name="ticket_price"
                    className="form-input"
                    placeholder="Enter ticket price (0 for free)"
                    value={formData.ticket_price || 0}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="max_attendees" className="form-label">
                    <i className="fas fa-users"></i>
                    Max Attendees
                  </label>
                  <input
                    type="number"
                    id="max_attendees"
                    name="max_attendees"
                    className="form-input"
                    placeholder="Enter maximum attendees"
                    value={formData.max_attendees || ''}
                    onChange={handleInputChange}
                    min="1"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="max_tickets_per_person" className="form-label">
                    <i className="fas fa-ticket-alt"></i>
                    Max Tickets Per Person
                  </label>
                  <input
                    type="number"
                    id="max_tickets_per_person"
                    name="max_tickets_per_person"
                    className="form-input"
                    placeholder="Default is 5"
                    value={formData.max_tickets_per_person || 5}
                    onChange={handleInputChange}
                    min="1"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="status" className="form-label">
                    <i className="fas fa-toggle-on"></i>
                    Event Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    className="form-select"
                    value={formData.status || 'draft'}
                    onChange={handleInputChange}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>
              
              <div className="form-row checkboxes">
                <div className="form-group checkbox-group">
                  <input
                    type="checkbox"
                    id="is_public"
                    name="is_public"
                    checked={formData.is_public !== false}
                    onChange={(e) => handleInputChange({
                      target: {
                        name: 'is_public',
                        value: e.target.checked
                      }
                    })}
                  />
                  <label htmlFor="is_public" className="checkbox-label">
                    <i className="fas fa-globe"></i>
                    Publicly Visible
                  </label>
                </div>
                
                <div className="form-group checkbox-group">
                  <input
                    type="checkbox"
                    id="requires_approval"
                    name="requires_approval"
                    checked={formData.requires_approval || false}
                    onChange={(e) => handleInputChange({
                      target: {
                        name: 'requires_approval',
                        value: e.target.checked
                      }
                    })}
                  />
                  <label htmlFor="requires_approval" className="checkbox-label">
                    <i className="fas fa-user-check"></i>
                    Require Registration Approval
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="back-btn"
                  onClick={handlePreviousStep}
                >
                  <i className="fas fa-arrow-left"></i>
                  Previous
                </button>
                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save"></i>
                      Create Event
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default CreateEventForm;
