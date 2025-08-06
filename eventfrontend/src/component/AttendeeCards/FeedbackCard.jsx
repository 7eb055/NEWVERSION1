import React, { useState } from 'react';
import './AttendeeCards.css';

const FeedbackCard = ({ event, onSubmitFeedback }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      return;
    }
    
    onSubmitFeedback({
      rating,
      feedback_text: feedbackText,
      is_anonymous: isAnonymous
    });
  };
  
  return (
    <div className="feedback-card">
      <h2>Leave Feedback</h2>
      <h3>{event.event_name}</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="rating-section">
          <h4>Your Rating</h4>
          <div className="star-rating">
            {[...Array(5)].map((_, index) => {
              const ratingValue = index + 1;
              
              return (
                <label key={index}>
                  <input 
                    type="radio" 
                    name="rating" 
                    value={ratingValue} 
                    onClick={() => setRating(ratingValue)}
                  />
                  <i 
                    className={`fas fa-star ${ratingValue <= (hover || rating) ? 'active' : ''}`}
                    onMouseEnter={() => setHover(ratingValue)}
                    onMouseLeave={() => setHover(0)}
                  ></i>
                </label>
              );
            })}
          </div>
          <div className="rating-text">
            {rating === 1 && 'Poor'}
            {rating === 2 && 'Fair'}
            {rating === 3 && 'Good'}
            {rating === 4 && 'Very Good'}
            {rating === 5 && 'Excellent'}
          </div>
        </div>
        
        <div className="feedback-text-section">
          <h4>Your Feedback</h4>
          <textarea 
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Share your experience with this event..."
            rows={5}
          ></textarea>
        </div>
        
        <div className="anonymous-option">
          <label>
            <input 
              type="checkbox" 
              checked={isAnonymous}
              onChange={() => setIsAnonymous(!isAnonymous)}
            />
            <span>Submit anonymously</span>
          </label>
        </div>
        
        <button 
          type="submit" 
          className="btn-submit-feedback"
          disabled={rating === 0}
        >
          Submit Feedback
        </button>
      </form>
    </div>
  );
};

export default FeedbackCard;
