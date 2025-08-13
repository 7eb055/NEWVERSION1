import React, { useState, useEffect } from 'react';
import FeedbackService from '../../services/FeedbackService';
import './AttendeeCards.css';

const EventReviewsCard = ({ event }) => {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    average_rating: '0.0',
    total_reviews: 0,
    rating_breakdown: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [includeAnonymous, setIncludeAnonymous] = useState(true);

  useEffect(() => {
    if (event?.event_id) {
      loadReviews();
    }
  }, [event?.event_id, currentPage, includeAnonymous]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const response = await FeedbackService.getEventFeedback(event.event_id, {
        page: currentPage,
        limit: 5,
        includeAnonymous
      });

      if (response.success) {
        setReviews(response.data.feedback || []);
        setStats(response.data.stats || stats);
        setPagination(response.data.pagination || {});
        setError('');
      } else {
        setError(response.error);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
      setError('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, index) => (
      <i 
        key={index} 
        className={`fas fa-star ${index < rating ? 'active' : ''}`}
      ></i>
    ));
  };

  const renderRatingBreakdown = () => {
    const total = stats.total_reviews;
    if (total === 0) return null;

    return (
      <div className="rating-breakdown">
        <h4>Rating Breakdown</h4>
        {[5, 4, 3, 2, 1].map(star => {
          const count = stats.rating_breakdown[star] || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;
          
          return (
            <div key={star} className="rating-bar">
              <span className="star-label">{star} ★</span>
              <div className="bar-container">
                <div 
                  className="bar-fill" 
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <span className="count">({count})</span>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading && currentPage === 1) {
    return (
      <div className="event-reviews-card">
        <h2>Event Reviews</h2>
        <div className="loading">Loading reviews...</div>
      </div>
    );
  }

  return (
    <div className="event-reviews-card">
      <h2>Event Reviews</h2>
      <h3>{event.event_name}</h3>

      {error && <div className="error-message">{error}</div>}

      {/* Rating Summary */}
      <div className="rating-summary">
        <div className="average-rating">
          <div className="rating-number">{stats.average_rating}</div>
          <div className="rating-stars">
            {renderStars(Math.round(parseFloat(stats.average_rating)))}
          </div>
          <div className="total-reviews">({stats.total_reviews} reviews)</div>
        </div>
        
        {renderRatingBreakdown()}
      </div>

      {/* Filter Options */}
      <div className="review-filters">
        <label>
          <input
            type="checkbox"
            checked={includeAnonymous}
            onChange={(e) => {
              setIncludeAnonymous(e.target.checked);
              setCurrentPage(1);
            }}
          />
          <span>Include anonymous reviews</span>
        </label>
      </div>

      {/* Reviews List */}
      <div className="reviews-list">
        {reviews.length === 0 ? (
          <div className="no-reviews">
            <i className="fas fa-star-o"></i>
            <p>No reviews yet for this event.</p>
            <p>Be the first to leave a review!</p>
          </div>
        ) : (
          reviews.map(review => (
            <div key={review.feedback_id} className="review-item">
              <div className="review-header">
                <div className="reviewer-info">
                  <span className="reviewer-name">
                    {review.attendee_name || 'Anonymous'}
                  </span>
                  <div className="review-rating">
                    {renderStars(review.rating)}
                  </div>
                </div>
                <div className="review-date">
                  {FeedbackService.formatFeedbackDate(review.created_at)}
                  {review.updated_at !== review.created_at && (
                    <span className="updated-indicator"> (edited)</span>
                  )}
                </div>
              </div>
              
              {review.feedback_text && (
                <div className="review-text">
                  {review.feedback_text}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            <i className="fas fa-chevron-left"></i> Previous
          </button>
          
          <span className="page-info">
            Page {currentPage} of {pagination.totalPages}
          </span>
          
          <button 
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === pagination.totalPages}
            className="pagination-btn"
          >
            Next <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      )}
    </div>
  );
};

export default EventReviewsCard;
