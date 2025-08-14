import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AttendeeCards.css';

const EventCard = ({ event, onRegister }) => {
  const navigate = useNavigate();
  
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  const viewEventDetails = () => {
    navigate(`/events/${event.event_id}`);
  };
  
  return (
    <div className="event-card">
      <div className="event-card-image">
        {event.image_url ? (
          <img src={event.image_url} alt={event.event_name} />
        ) : (
          <div className="event-card-image-placeholder">
            <i className="fas fa-calendar-alt"></i>
          </div>
        )}
        {event.average_rating > 0 && (
          <div className="event-card-rating">
            <span>
              <i className="fas fa-star"></i> {event.average_rating.toFixed(1)}
            </span>
            <small>({event.review_count} reviews)</small>
          </div>
        )}
      </div>
      
      <div className="event-card-content">
        <h3 className="event-card-title">{event.event_name}</h3>
        <div className="event-card-date">
          <i className="far fa-calendar"></i>
          <span>{formatDate(event.event_date)}</span>
        </div>
        <div className="event-card-location">
          <i className="fas fa-map-marker-alt"></i>
          <span>{event.venue_name}</span>
        </div>
        {event.category && (
          <div className="event-card-category">
            <span>{event.category}</span>
          </div>
        )}
        <div className="event-card-organizer">
          <small>By {event.organizer_name || 'Event Organizer'}</small>
        </div>
      </div>
      
      <div className="event-card-actions">
        <button className="btn-primary" onClick={viewEventDetails}>
          View Details
        </button>
        <button className="btn-secondary" onClick={() => onRegister(event)}>
          Register
        </button>
      </div>
    </div>
  );
};

export default EventCard;
