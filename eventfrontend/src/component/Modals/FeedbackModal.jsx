// FeedbackModal.jsx - Modal popup for event feedback/reviews
import React, { useState, useEffect } from 'react';
import './FeedbackModal.css';
import FeedbackService from '../../services/FeedbackService';

const FeedbackModal = ({ 
  isOpen, 
  onClose, 
  eventId, 
  eventTitle,
  onFeedbackSubmitted 
}) => {
  const [formData, setFormData] = useState({
    rating: 5,
    comment: '',
    is_anonymous: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        rating: 5,
        comment: '',
        is_anonymous: false
      });
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const result = await FeedbackService.submitFeedback(eventId, formData);
      
      if (result.success) {
        setSuccess('Thank you for your feedback!');
        setTimeout(() => {
          onClose();
          if (onFeedbackSubmitted) {
            onFeedbackSubmitted();
          }
        }, 1500);
      } else {
        setError(result.error || 'Failed to submit feedback');
      }
    } catch (err) {
      setError('An error occurred while submitting feedback');
      console.error('Feedback submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const renderStars = () => {
    return [...Array(5)].map((_, index) => {
      const starValue = index + 1;
      return (
        <span
          key={index}
          className={`feedback-star ${starValue <= formData.rating ? 'active' : ''}`}
          onClick={() => setFormData(prev => ({ ...prev, rating: starValue }))}
        >
          ★
        </span>
      );
    });
  };

  if (!isOpen) return null;

  return (
    <div className="feedback-modal-overlay" onClick={handleOverlayClick}>
      <div className="feedback-modal">
        <div className="feedback-modal-header">
          <h2>Leave Feedback</h2>
          <h3>{eventTitle}</h3>
          <button 
            className="feedback-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="feedback-modal-body">
          {error && (
            <div className="feedback-error">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {success && (
            <div className="feedback-success">
              <span className="success-icon">✅</span>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="feedback-form">
            <div className="form-group">
              <label htmlFor="rating" className="form-label">
                Rating *
              </label>
              <div className="rating-stars">
                {renderStars()}
                <span className="rating-text">
                  {formData.rating} out of 5 stars
                </span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="comment" className="form-label">
                Your Review
              </label>
              <textarea
                id="comment"
                name="comment"
                value={formData.comment}
                onChange={handleInputChange}
                placeholder="Share your experience with this event... (optional)"
                className="form-textarea"
                rows={4}
                maxLength={1000}
              />
              <small className="character-count">
                {formData.comment.length}/1000 characters
              </small>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="is_anonymous"
                  checked={formData.is_anonymous}
                  onChange={handleInputChange}
                  className="form-checkbox"
                />
                <span className="checkbox-text">
                  Submit anonymously
                </span>
              </label>
              <small className="help-text">
                Anonymous feedback will not show your name
              </small>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={onClose}
                className="btn-cancel"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-submit"
                disabled={isSubmitting || !formData.rating}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner"></span>
                    Submitting...
                  </>
                ) : (
                  'Submit Feedback'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
