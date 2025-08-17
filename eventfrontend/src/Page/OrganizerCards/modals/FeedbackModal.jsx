import React, { useState, useEffect, useCallback } from 'react';
import { useDashboardState } from '../hooks/useDashboardState';
import Modal from '../Modal';

const FeedbackModal = ({ isOpen, onClose }) => {
  const { showError, showSuccess } = useDashboardState();
  const [loading, setLoading] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // all, unread, responded, analytics
  const [filters, setFilters] = useState({
    eventId: '',
    rating: '',
    category: '',
    status: ''
  });
  const [responseText, setResponseText] = useState('');
  const [feedbackStats, setFeedbackStats] = useState({
    totalFeedback: 0,
    averageRating: 0,
    unreadCount: 0,
    categories: {},
    sentimentAnalysis: {}
  });

  const feedbackCategories = [
    'event_quality',
    'venue',
    'registration_process',
    'customer_service',
    'pricing',
    'communication',
    'technical_issues',
    'suggestions',
    'general'
  ];

  const fetchFeedbacks = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams(filters);

      const response = await fetch(`/api/feedback?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch feedback');
      }

      const data = await response.json();
      setFeedbacks(data.feedback || []);
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  }, [filters, showError]);

  const fetchFeedbackStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/feedback/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch feedback statistics');
      }

      const data = await response.json();
      setFeedbackStats(data);
    } catch (error) {
      showError(error.message);
    }
  }, [showError]);

  useEffect(() => {
    if (isOpen) {
      fetchFeedbacks();
      fetchFeedbackStats();
    }
  }, [isOpen, filters, fetchFeedbacks, fetchFeedbackStats]);

  const handleFeedbackSelect = (feedback) => {
    setSelectedFeedback(feedback);
    setResponseText(feedback.response || '');
    
    // Mark as read if unread
    if (!feedback.is_read) {
      markAsRead(feedback.feedback_id);
    }
  };

  const markAsRead = async (feedbackId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/feedback/${feedbackId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setFeedbacks(prev => prev.map(f => 
          f.feedback_id === feedbackId ? { ...f, is_read: true } : f
        ));
        fetchFeedbackStats();
      }
    } catch (error) {
      console.error('Failed to mark feedback as read:', error);
    }
  };

  const handleResponseSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFeedback || !responseText.trim()) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/feedback/${selectedFeedback.feedback_id}/respond`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          response: responseText.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit response');
      }

      showSuccess('Response sent successfully!');
      setSelectedFeedback(prev => ({ ...prev, response: responseText, response_date: new Date().toISOString() }));
      fetchFeedbacks();
      fetchFeedbackStats();
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteFeedback = async (feedbackId) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/feedback/${feedbackId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete feedback');
      }

      showSuccess('Feedback deleted successfully!');
      setFeedbacks(prev => prev.filter(f => f.feedback_id !== feedbackId));
      if (selectedFeedback?.feedback_id === feedbackId) {
        setSelectedFeedback(null);
      }
      fetchFeedbackStats();
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredFeedbacks = () => {
    let filtered = feedbacks;

    switch (activeTab) {
      case 'unread':
        filtered = filtered.filter(f => !f.is_read);
        break;
      case 'responded':
        filtered = filtered.filter(f => f.response);
        break;
    }

    return filtered;
  };

  const renderRatingStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <i
        key={i}
        className={`fas fa-star ${i < rating ? 'filled' : 'empty'}`}
      />
    ));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSentimentClass = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'sentiment-positive';
      case 'negative': return 'sentiment-negative';
      default: return 'sentiment-neutral';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Customer Feedback & Reviews">
      <div className="feedback-modal">
        {/* Stats Overview */}
        <div className="feedback-stats">
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-comments"></i>
            </div>
            <div className="stat-content">
              <h5>Total Feedback</h5>
              <span className="stat-value">{feedbackStats.totalFeedback}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-star"></i>
            </div>
            <div className="stat-content">
              <h5>Average Rating</h5>
              <span className="stat-value">{feedbackStats.averageRating?.toFixed(1) || 0}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-envelope"></i>
            </div>
            <div className="stat-content">
              <h5>Unread</h5>
              <span className="stat-value">{feedbackStats.unreadCount}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-chart-pie"></i>
            </div>
            <div className="stat-content">
              <h5>Response Rate</h5>
              <span className="stat-value">
                {feedbackStats.totalFeedback > 0 
                  ? Math.round((feedbacks.filter(f => f.response).length / feedbackStats.totalFeedback) * 100)
                  : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <i className="fas fa-list"></i>
            All Feedback
            <span className="count">{feedbacks.length}</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'unread' ? 'active' : ''}`}
            onClick={() => setActiveTab('unread')}
          >
            <i className="fas fa-envelope"></i>
            Unread
            <span className="count">{feedbacks.filter(f => !f.is_read).length}</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'responded' ? 'active' : ''}`}
            onClick={() => setActiveTab('responded')}
          >
            <i className="fas fa-reply"></i>
            Responded
            <span className="count">{feedbacks.filter(f => f.response).length}</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <i className="fas fa-chart-bar"></i>
            Analytics
          </button>
        </div>

        {/* Filters */}
        {activeTab !== 'analytics' && (
          <div className="feedback-filters">
            <select
              value={filters.eventId}
              onChange={(e) => setFilters(prev => ({ ...prev, eventId: e.target.value }))}
              className="org-select"
            >
              <option value="">All Events</option>
              {/* Event options would be populated from API */}
            </select>

            <select
              value={filters.rating}
              onChange={(e) => setFilters(prev => ({ ...prev, rating: e.target.value }))}
              className="org-select"
            >
              <option value="">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>

            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="org-select"
            >
              <option value="">All Categories</option>
              {feedbackCategories.map(category => (
                <option key={category} value={category}>
                  {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        )}

        {loading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Loading feedback...</p>
          </div>
        )}

        {/* Feedback List & Details */}
        {activeTab !== 'analytics' && !loading && (
          <div className="feedback-layout">
            {/* Feedback List */}
            <div className="feedback-sidebar">
              <div className="feedback-list">
                {getFilteredFeedbacks().map(feedback => (
                  <div 
                    key={feedback.feedback_id}
                    className={`feedback-item ${selectedFeedback?.feedback_id === feedback.feedback_id ? 'active' : ''} ${!feedback.is_read ? 'unread' : ''}`}
                    onClick={() => handleFeedbackSelect(feedback)}
                  >
                    <div className="feedback-header">
                      <div className="customer-info">
                        <h6>{feedback.customer_name}</h6>
                        <p>{feedback.customer_email}</p>
                      </div>
                      <div className="feedback-meta">
                        <div className="rating">
                          {renderRatingStars(feedback.rating)}
                        </div>
                        <span className="date">{formatDate(feedback.created_at)}</span>
                      </div>
                    </div>
                    
                    <div className="feedback-preview">
                      <p>{feedback.comment?.substring(0, 100)}...</p>
                      <div className="feedback-tags">
                        <span className={`category-tag ${feedback.category}`}>
                          {feedback.category?.replace(/_/g, ' ')}
                        </span>
                        {feedback.sentiment && (
                          <span className={`sentiment-tag ${getSentimentClass(feedback.sentiment)}`}>
                            {feedback.sentiment}
                          </span>
                        )}
                        {!feedback.is_read && <span className="unread-indicator">●</span>}
                        {feedback.response && <span className="responded-indicator">↩</span>}
                      </div>
                    </div>
                  </div>
                ))}

                {getFilteredFeedbacks().length === 0 && (
                  <div className="empty-state">
                    <i className="fas fa-comment-slash"></i>
                    <p>No feedback found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Feedback Details */}
            <div className="feedback-details">
              {selectedFeedback ? (
                <div className="feedback-detail-content">
                  <div className="detail-header">
                    <div className="customer-details">
                      <h4>{selectedFeedback.customer_name}</h4>
                      <p>{selectedFeedback.customer_email}</p>
                      <p className="event-name">Event: {selectedFeedback.event_title}</p>
                    </div>
                    <div className="feedback-actions">
                      <button
                        className="btn-danger btn-sm"
                        onClick={() => deleteFeedback(selectedFeedback.feedback_id)}
                        disabled={loading}
                      >
                        <i className="fas fa-trash"></i>
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="feedback-content">
                    <div className="rating-section">
                      <label>Rating:</label>
                      <div className="rating-display">
                        {renderRatingStars(selectedFeedback.rating)}
                        <span className="rating-text">({selectedFeedback.rating}/5)</span>
                      </div>
                    </div>

                    <div className="category-section">
                      <label>Category:</label>
                      <span className={`category-tag ${selectedFeedback.category}`}>
                        {selectedFeedback.category?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>

                    <div className="comment-section">
                      <label>Comment:</label>
                      <div className="comment-text">
                        {selectedFeedback.comment}
                      </div>
                    </div>

                    {selectedFeedback.sentiment && (
                      <div className="sentiment-section">
                        <label>Sentiment Analysis:</label>
                        <span className={`sentiment-badge ${getSentimentClass(selectedFeedback.sentiment)}`}>
                          {selectedFeedback.sentiment}
                        </span>
                      </div>
                    )}

                    <div className="metadata-section">
                      <div className="meta-item">
                        <label>Submitted:</label>
                        <span>{formatDate(selectedFeedback.created_at)}</span>
                      </div>
                      {selectedFeedback.response_date && (
                        <div className="meta-item">
                          <label>Responded:</label>
                          <span>{formatDate(selectedFeedback.response_date)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Response Section */}
                  <div className="response-section">
                    <h5>Response</h5>
                    {selectedFeedback.response ? (
                      <div className="existing-response">
                        <div className="response-content">
                          {selectedFeedback.response}
                        </div>
                        <div className="response-meta">
                          Responded on {formatDate(selectedFeedback.response_date)}
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleResponseSubmit}>
                        <textarea
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          className="org-textarea"
                          rows="4"
                          placeholder="Write your response to this feedback..."
                          required
                        />
                        <div className="response-actions">
                          <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading || !responseText.trim()}
                          >
                            {loading ? (
                              <>
                                <div className="spinner-sm"></div>
                                Sending...
                              </>
                            ) : (
                              <>
                                <i className="fas fa-reply"></i>
                                Send Response
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              ) : (
                <div className="no-selection">
                  <i className="fas fa-comment-dots"></i>
                  <h4>Select feedback to view details</h4>
                  <p>Choose a feedback item from the list to view and respond to it.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && !loading && (
          <div className="analytics-section">
            <div className="analytics-grid">
              {/* Rating Distribution */}
              <div className="analytics-card">
                <h5>Rating Distribution</h5>
                <div className="rating-chart">
                  {[5, 4, 3, 2, 1].map(rating => {
                    const count = feedbacks.filter(f => f.rating === rating).length;
                    const percentage = feedbacks.length > 0 ? (count / feedbacks.length) * 100 : 0;
                    
                    return (
                      <div key={rating} className="rating-bar">
                        <span className="rating-label">{rating} ★</span>
                        <div className="bar-container">
                          <div 
                            className="bar-fill"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="rating-count">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="analytics-card">
                <h5>Feedback Categories</h5>
                <div className="category-chart">
                  {feedbackCategories.map(category => {
                    const count = feedbacks.filter(f => f.category === category).length;
                    const percentage = feedbacks.length > 0 ? (count / feedbacks.length) * 100 : 0;
                    
                    if (count === 0) return null;
                    
                    return (
                      <div key={category} className="category-item">
                        <span className="category-name">
                          {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        <div className="category-bar">
                          <div 
                            className="bar-fill"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="category-count">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sentiment Analysis */}
              <div className="analytics-card">
                <h5>Sentiment Analysis</h5>
                <div className="sentiment-chart">
                  {['positive', 'neutral', 'negative'].map(sentiment => {
                    const count = feedbacks.filter(f => f.sentiment === sentiment).length;
                    const percentage = feedbacks.length > 0 ? (count / feedbacks.length) * 100 : 0;
                    
                    return (
                      <div key={sentiment} className="sentiment-item">
                        <div className={`sentiment-circle ${getSentimentClass(sentiment)}`}>
                          <span className="sentiment-percentage">{Math.round(percentage)}%</span>
                        </div>
                        <span className="sentiment-label">{sentiment}</span>
                        <span className="sentiment-count">({count})</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Response Metrics */}
              <div className="analytics-card">
                <h5>Response Metrics</h5>
                <div className="response-metrics">
                  <div className="metric-item">
                    <label>Response Rate</label>
                    <span className="metric-value">
                      {feedbacks.length > 0 
                        ? Math.round((feedbacks.filter(f => f.response).length / feedbacks.length) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="metric-item">
                    <label>Average Response Time</label>
                    <span className="metric-value">2.3 days</span>
                  </div>
                  <div className="metric-item">
                    <label>Unread Feedback</label>
                    <span className="metric-value">{feedbacks.filter(f => !f.is_read).length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default FeedbackModal;
