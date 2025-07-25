import React, { useState, useRef } from 'react';
import './CreateEventForm.css';

const CreateEventForm = ({
  formData,
  handleInputChange,
  handleSubmit,
  setShowCreateForm,
  isLoading
}) => {
  const [imageSource, setImageSource] = useState('url'); // 'url' or 'upload'
  const [imagePreview, setImagePreview] = useState(formData.imageUrl || '');
  const fileInputRef = useRef(null);
  
  const handleImageSourceChange = (source) => {
    setImageSource(source);
    // Clear the preview and form data when changing source
    if (source === 'url' && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (!formData.imageUrl) {
      setImagePreview('');
    }
  };
  
  const handleImageChange = (e) => {
    const { name, value, files } = e.target;
    
    if (name === 'imageUrl' && imageSource === 'url') {
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
  return (
    <div className="create-event-section">
      <div className="form-container">
        <h2 className="form-title">
          <i className="fas fa-calendar-plus"></i>
          Create New Event
        </h2>
        
        <form className="create-event-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                <i className="fas fa-tag"></i>
                Event Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                className="form-input"
                placeholder="Enter event name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="category" className="form-label">
                <i className="fas fa-list"></i>
                Category
              </label>
              <select
                id="category"
                name="category"
                className="form-select"
                value={formData.category}
                onChange={handleInputChange}
              >
                <option value="">Select category</option>
                <option value="conference">Conference</option>
                <option value="workshop">Workshop</option>
                <option value="seminar">Seminar</option>
                <option value="networking">Networking</option>
                <option value="social">Social</option>
                <option value="sports">Sports</option>
                <option value="arts">Arts & Culture</option>
                <option value="technology">Technology</option>
                <option value="business">Business</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="date" className="form-label">
                <i className="fas fa-calendar"></i>
                Event Date & Time *
              </label>
              <input
                type="datetime-local"
                id="date"
                name="date"
                className="form-input"
                value={formData.date}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="location" className="form-label">
                <i className="fas fa-map-marker-alt"></i>
                Location *
              </label>
              <input
                type="text"
                id="location"
                name="location"
                className="form-input"
                placeholder="Enter event location"
                value={formData.location}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="maxAttendees" className="form-label">
                <i className="fas fa-users"></i>
                Max Attendees
              </label>
              <input
                type="number"
                id="maxAttendees"
                name="maxAttendees"
                className="form-input"
                placeholder="Enter maximum attendees"
                value={formData.maxAttendees}
                onChange={handleInputChange}
                min="1"
              />
            </div>

            <div className="form-group">
              <label htmlFor="price" className="form-label">
                <i className="fas fa-dollar-sign"></i>
                Price ($)
              </label>
              <input
                type="number"
                id="price"
                name="price"
                className="form-input"
                placeholder="Enter ticket price (0 for free)"
                value={formData.price}
                onChange={handleInputChange}
                min="0"
                step="0.01"
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
              value={formData.description}
              onChange={handleInputChange}
              rows="4"
              required
            ></textarea>
          </div>

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
                id="imageUrl"
                name="imageUrl"
                className="form-input"
                placeholder="Enter image URL"
                value={formData.imageUrl || ''}
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
        </form>
      </div>
    </div>
  );
};

export default CreateEventForm;
