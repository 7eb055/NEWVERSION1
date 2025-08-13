// FeedbackService.js - Frontend service for feedback/reviews
import ApiService from './ApiService';

class FeedbackService {
  // Submit feedback for an event
  static async submitFeedback(eventId, feedbackData) {
    try {
      const response = await ApiService.post(`/api/attendee/events/${eventId}/feedback`, feedbackData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to submit feedback'
      };
    }
  }

  // Get all feedback for an event (public)
  static async getEventFeedback(eventId, params = {}) {
    try {
      const queryParams = new URLSearchParams({
        page: params.page || 1,
        limit: params.limit || 10,
        include_anonymous: params.includeAnonymous !== false
      }).toString();

      const response = await ApiService.get(`/api/attendee/events/${eventId}/feedback?${queryParams}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching event feedback:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch feedback',
        data: {
          feedback: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
          stats: { average_rating: '0.0', total_reviews: 0, rating_breakdown: {} }
        }
      };
    }
  }

  // Get user's own feedback for an event
  static async getMyFeedback(eventId) {
    try {
      const response = await ApiService.get(`/api/attendee/events/${eventId}/my-feedback`);
      return {
        success: true,
        data: response.data.feedback
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return {
          success: true,
          data: null // No feedback submitted yet
        };
      }
      console.error('Error fetching user feedback:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch your feedback'
      };
    }
  }

  // Check if user can leave feedback for an event
  static async canLeaveFeedback(eventId) {
    try {
      // This would typically check registration and attendance status
      // For now, we'll assume they can if they have an account
      return {
        success: true,
        canLeaveFeedback: true
      };
    } catch (error) {
      console.error('Error checking feedback eligibility:', error);
      return {
        success: false,
        canLeaveFeedback: false,
        error: 'Failed to check feedback eligibility'
      };
    }
  }

  // Format rating display
  static formatRating(rating) {
    const stars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
    return `${stars} (${rating}/5)`;
  }

  // Get rating text description
  static getRatingText(rating) {
    const descriptions = {
      1: 'Poor',
      2: 'Fair', 
      3: 'Good',
      4: 'Very Good',
      5: 'Excellent'
    };
    return descriptions[rating] || 'No rating';
  }

  // Format feedback date
  static formatFeedbackDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
}

export default FeedbackService;
