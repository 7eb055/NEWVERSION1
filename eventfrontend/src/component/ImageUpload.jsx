import React, { useState, useRef } from 'react';
import './ImageUpload.css';

const ImageUpload = ({ 
  currentImage, 
  onImageChange, 
  label = "Event Image",
  required = false,
  disabled = false 
}) => {
  const [imagePreview, setImagePreview] = useState(currentImage || null);
  const [imageUrl, setImageUrl] = useState(currentImage || '');
  const [uploadMethod, setUploadMethod] = useState('file'); // 'file' or 'url'
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, GIF, WebP, SVG)');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    try {
      setUploading(true);
      
      // Create preview immediately
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);

      // Upload file to backend
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${API_BASE_URL}/api/upload/image`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        const fullImageUrl = `${API_BASE_URL}${result.data.imageUrl}`;
        setImageUrl(fullImageUrl);
        onImageChange({
          type: 'file',
          url: fullImageUrl,
          filename: result.data.filename,
          size: result.data.size,
          mimetype: result.data.mimetype
        });
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(`Failed to upload image: ${error.message}`);
      setImagePreview(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setUploading(false);
    }
  };

  const handleUrlChange = (e) => {
    const url = e.target.value;
    setImageUrl(url);
    setError(null);
    
    if (url.trim()) {
      // Set preview immediately
      setImagePreview(url);
      onImageChange({
        type: 'url',
        url: url.trim()
      });
    } else {
      setImagePreview(null);
      onImageChange(null);
    }
  };

  const handleUrlSubmit = () => {
    if (!imageUrl.trim()) {
      setError('Please enter an image URL');
      return;
    }

    // Validate URL format
    try {
      const url = new URL(imageUrl.trim());
      if (!url.protocol.startsWith('http')) {
        throw new Error('URL must start with http:// or https://');
      }
      
      setImagePreview(imageUrl.trim());
      onImageChange({
        type: 'url',
        url: imageUrl.trim()
      });
      setError(null);
    } catch (error) {
      setError('Please enter a valid image URL (must start with http:// or https://)');
    }
  };

  const handleRemoveImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setImagePreview(null);
    setImageUrl('');
    setError(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    onImageChange(null);
  };

  const handleDropZoneClick = () => {
    if (!disabled && uploadMethod === 'file') {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="image-upload-container">
      <label className="upload-label">
        {label}
        {required && <span className="required-asterisk">*</span>}
      </label>
      
      {/* Upload Method Toggle */}
      <div className="upload-method-toggle">
        <button
          type="button"
          className={`method-btn ${uploadMethod === 'file' ? 'active' : ''}`}
          onClick={() => setUploadMethod('file')}
          disabled={disabled}
        >
          <i className="fas fa-upload"></i>
          Upload File
        </button>
        <button
          type="button"
          className={`method-btn ${uploadMethod === 'url' ? 'active' : ''}`}
          onClick={() => setUploadMethod('url')}
          disabled={disabled}
        >
          <i className="fas fa-link"></i>
          Image URL
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="upload-error">
          <i className="fas fa-exclamation-triangle"></i>
          {error}
        </div>
      )}

      {/* File Upload Method */}
      {uploadMethod === 'file' && (
        <div className="file-upload-section">
          <div 
            className={`file-drop-zone ${uploading ? 'uploading' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={handleDropZoneClick}
          >
            {uploading ? (
              <div className="upload-progress">
                <i className="fas fa-spinner fa-spin"></i>
                <span>Uploading...</span>
              </div>
            ) : imagePreview ? (
              <div className="image-preview">
                <img src={imagePreview} alt="Preview" />
                <div className="preview-overlay">
                  <button 
                    type="button" 
                    onClick={handleRemoveImage} 
                    className="remove-btn"
                    disabled={disabled}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            ) : (
              <div className="upload-placeholder">
                <i className="fas fa-cloud-upload-alt"></i>
                <span>Click to upload image</span>
                <small>JPEG, PNG, GIF, WebP, SVG up to 10MB</small>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            disabled={disabled}
          />
        </div>
      )}

      {/* URL Method */}
      {uploadMethod === 'url' && (
        <div className="url-upload-section">
          <div className="url-input-group">
            <input
              type="url"
              value={imageUrl}
              onChange={handleUrlChange}
              placeholder="Enter image URL (https://example.com/image.jpg)"
              className="url-input"
              disabled={disabled}
            />
            <button 
              type="button" 
              onClick={handleUrlSubmit} 
              className="url-submit-btn"
              disabled={disabled || !imageUrl.trim()}
            >
              <i className="fas fa-check"></i>
            </button>
          </div>
          {imagePreview && (
            <div className="url-preview">
              <img 
                src={imagePreview} 
                alt="URL Preview" 
                onError={() => {
                  setError('Failed to load image from URL');
                  setImagePreview(null);
                }}
              />
              <button 
                type="button" 
                onClick={handleRemoveImage} 
                className="remove-btn"
                disabled={disabled}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
