import React from 'react';
import formatters from '../../utils/formatters';

const FeedbackSection = ({
  feedbackSummary,
  feedbackFilter,
  setFeedbackFilter,
  events,
  getFilteredFeedback,
  renderStarRating,
  formatDate
}) => {
  return (
    <div className="feedback-section">
      <div className="section-header">
        <h2 className="section-title">
          <i className="fas fa-star"></i>
          Feedback & Reviews
        </h2>
      </div>

      {/* Feedback Summary Cards */}
      <div className="feedback-summary">
        <h3 className="subsection-title">
          <i className="fas fa-chart-bar"></i>
          Event Ratings Overview
        </h3>
        
        {Object.keys(feedbackSummary).length > 0 ? (
          <div className="summary-cards">
            {Object.entries(feedbackSummary).map(([eventId, summary]) => (
              <div key={eventId} className="summary-card">
                <div className="summary-header">
                  <h4 className="event-name">{summary.eventName || summary.event_name}</h4>
                  <div className="average-rating">
                    <span className="rating-number">{formatters.formatCurrency(summary.averageRating, 1, false)}</span>
                    <div className="rating-stars">
                      {renderStarRating(Math.round(summary.averageRating))}
                    </div>
                  </div>
                </div>
                
                <div className="summary-stats">
                  <div className="stat">
                    <i className="fas fa-comments"></i>
                    <span>{summary.totalReviews} {summary.totalReviews === 1 ? 'review' : 'reviews'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-feedback-summary">
            <div className="no-summary-icon">
              <i className="fas fa-star"></i>
            </div>
            <h4>No Reviews Yet</h4>
            <p>Feedback from attendees will appear here once your events are completed.</p>
          </div>
        )}
      </div>

      {/* Feedback Filters */}
      <div className="feedback-filters">
        <h3 className="subsection-title">
          <i className="fas fa-filter"></i>
          Filter Feedback
        </h3>
        
        <div className="filter-controls">
          <div className="filter-group">
            <label htmlFor="eventFilter">Filter by Event:</label>
            <select 
              id="eventFilter"
              value={feedbackFilter.eventId}
              onChange={(e) => setFeedbackFilter(prev => ({ ...prev, eventId: e.target.value }))}
              className="filter-select"
            >
              <option value="all">All Events</option>
              {events.map(event => (
                <option key={event.event_id} value={event.event_id}>
                  {event.event_name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="dateFilter">Filter by Date:</label>
            <select 
              id="dateFilter"
              value={feedbackFilter.dateRange}
              onChange={(e) => setFeedbackFilter(prev => ({ ...prev, dateRange: e.target.value }))}
              className="filter-select"
            >
              <option value="all">All Time</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
            </select>
          </div>
        </div>
      </div>

      {/* Feedback List */}
      <div className="feedback-list">
        <h3 className="subsection-title">
          <i className="fas fa-comment-dots"></i>
          Recent Reviews
        </h3>
        
        {getFilteredFeedback().length > 0 ? (
          <div className="feedback-items">
            {getFilteredFeedback().map(feedback => (
              <div key={feedback.id || `feedback-${Math.random()}`} className="feedback-item">
                <div className="feedback-header">
                  <div className="feedback-user">
                    <div className="user-avatar">
                      <i className="fas fa-user"></i>
                    </div>
                    <div className="user-info">
                      <h4 className="user-name">{feedback.attendeeName || feedback.attendee_name}</h4>
                      <p className="event-name">{feedback.eventName || feedback.event_name}</p>
                    </div>
                  </div>
                  
                  <div className="feedback-rating">
                    <div className="rating-stars">
                      {renderStarRating(feedback.rating)}
                    </div>
                    <span className="rating-text">{feedback.rating}/5</span>
                  </div>
                </div>
                
                <div className="feedback-content">
                  <p className="feedback-comment">{feedback.comment}</p>
                </div>
                
                <div className="feedback-footer">
                  <span className="feedback-date">
                    <i className="fas fa-clock"></i>
                    {formatDate(feedback.submittedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-feedback">
            <div className="no-feedback-icon">
              <i className="fas fa-comment-slash"></i>
            </div>
            <h4>No Reviews Found</h4>
            <p>
              {feedbackFilter.eventId !== 'all' || feedbackFilter.dateRange !== 'all'
                ? 'Try adjusting your filters to see more reviews.'
                : 'Attendee reviews will appear here after your events.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackSection;
