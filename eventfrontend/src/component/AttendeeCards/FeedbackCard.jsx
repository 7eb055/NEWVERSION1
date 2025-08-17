// FeedbackCard.jsx - Component for event feedback/reviews with popup modal
import React, { useState, useEffect, useCallback } from 'react';
import './AttendeeCards.css';
import FeedbackService from '../../services/FeedbackService';
import EventReviewsCard from './EventReviewsCard';
import FeedbackModal from '../Modals/FeedbackModal';

const FeedbackCard = ({ event, onFeedbackSubmitted }) => {
  const [feedback, setFeedback] = useState([]);
  const [myFeedback, setMyFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [stats, setStats] = useState({
    average_rating: '0.0',
    total_reviews: 0,
    rating_breakdown: {}
  });

  const loadFeedback = useCallback(async () => {
    try {
      const result = await FeedbackService.getEventFeedback(event.event_id, {
        page: 1,
        limit: 10,
        includeAnonymous: true
      });

      if (result.success) {
        setFeedback(result.data.feedback || []);
        setStats(result.data.stats || {
          average_rating: '0.0',
          total_reviews: 0,
          rating_breakdown: {}
        });
      } else {
        setError(result.error || 'Failed to load feedback');
      }
    } catch (err) {
      console.error('Error loading feedback:', err);
      setError('Error loading feedback');
    }
  }, [event.event_id]);

  const loadMyFeedback = useCallback(async () => {
    try {
      const result = await FeedbackService.getMyFeedback(event.event_id);
      
      if (result.success) {
        setMyFeedback(result.data);
      } else if (result.error !== 'No feedback found') {
        console.warn('Could not load user feedback:', result.error);
      }
    } catch (err) {
      console.error('Error loading user feedback:', err);
    } finally {
      setLoading(false);
    }
  }, [event.event_id]);

  // Load feedback when component mounts
  useEffect(() => {
    if (event?.event_id) {
      loadFeedback();
      loadMyFeedback();
    }
  }, [event?.event_id, loadFeedback, loadMyFeedback]);

  const handleFeedbackSubmittedModal = async () => {
    setSuccess('Thank you for your feedback!');
    
    // Reload feedback and user's feedback
    await loadFeedback();
    await loadMyFeedback();
    
    if (onFeedbackSubmitted) {
      onFeedbackSubmitted();
    }

    // Clear success message after 3 seconds
    setTimeout(() => setSuccess(''), 3000);
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, index) => {
      const starValue = index + 1;
      return (
        <span
          key={index}
          className={`feedback-star ${starValue <= rating ? 'active' : ''}`}
        >
          ★
        </span>
      );
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="feedback-card">
        <div className="feedback-loading">
          <div className="loading-spinner"></div>
          <p>Loading feedback...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-card">
      <div className="feedback-header">
        <h3>Event Feedback & Reviews</h3>
        <div className="feedback-stats">
          <div className="average-rating">
            {renderStars(Math.round(parseFloat(stats.average_rating)))}
            <span className="rating-number">
              {parseFloat(stats.average_rating).toFixed(1)}
            </span>
            <span className="review-count">
              ({stats.total_reviews} review{stats.total_reviews !== 1 ? 's' : ''})
            </span>
          </div>
        </div>
      </div>

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

      {/* User's existing feedback or submit button */}
      <div className="user-feedback-section">
        {myFeedback ? (
          <div className="my-feedback">
            <h4>Your Feedback</h4>
            <div className="feedback-item">
              <div className="feedback-header">
                <div className="feedback-rating">
                  {renderStars(myFeedback.rating)}
                </div>
                <div className="feedback-date">
                  {formatDate(myFeedback.created_at)}
                </div>
              </div>
              {myFeedback.comment && (
                <div className="feedback-comment">
                  {myFeedback.comment}
                </div>
              )}
              <div className="feedback-meta">
                {myFeedback.is_anonymous ? (
                  <span className="anonymous-badge">Anonymous</span>
                ) : (
                  <span className="public-badge">Public</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="submit-feedback-section">
            <button 
              className="btn-submit-feedback"
              onClick={() => setShowModal(true)}
            >
              <span className="feedback-icon">💬</span>
              Leave Feedback
            </button>
          </div>
        )}
      </div>

      {/* Event Reviews Display */}
      <EventReviewsCard 
        feedback={feedback}
        stats={stats}
        eventId={event?.event_id}
        onReviewsUpdate={loadFeedback}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        eventId={event?.event_id}
        eventTitle={event?.event_name}
        onFeedbackSubmitted={handleFeedbackSubmittedModal}
      />
    </div>
  );
};

export default FeedbackCard;
