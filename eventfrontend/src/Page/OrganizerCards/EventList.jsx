import React from 'react';

const EventList = ({ 
  events, 
  isLoading, 
  showCreateForm, 
  setShowCreateForm, 
  formatDate,
  onViewEvent,
  onEditEvent,
  onDeleteEvent 
}) => {
  if (isLoading && !showCreateForm) {
    return (
      <div className="loading-container">
        <i className="fas fa-spinner fa-spin"></i>
        <span>Loading events...</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="no-events">
        <div className="no-events-icon">
          <i className="fas fa-calendar-times"></i>
        </div>
        <h3>No Events Yet</h3>
        <p>Create your first event to get started!</p>
        <button 
          className="create-first-event-btn"
          onClick={() => setShowCreateForm(true)}
        >
          <i className="fas fa-plus"></i>
          Create Your First Event
        </button>
      </div>
    );
  }

  return (
    <div className="events-grid">
      {events.map((event) => (
        <div key={event.event_id} className="event-card">
          {/* Event Image Section */}
          <div className="event-image-container">
            {event.image_url ? (
              <img 
                src={event.image_url} 
                alt={event.event_name}
                className="event-image"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className="event-image-placeholder" 
              style={{ display: event.image_url ? 'none' : 'flex' }}
            >
              <i className="fas fa-image"></i>
              <span>No Image</span>
            </div>
            <div className="event-image-overlay">
              {event.category && (
                <span className={`event-category ${event.category.toLowerCase()}`}>
                  {event.category}
                </span>
              )}
            </div>
          </div>
          
          {/* Event Content Section */}
          <div className="event-content">
            <div className="event-header">
              <h3 className="event-title">{event.event_name}</h3>
            </div>
            
            <div className="event-details">
              <div className="event-detail">
                <i className="fas fa-calendar"></i>
                <span>{formatDate(event.event_date)}</span>
              </div>
              
              <div className="event-detail">
                <i className="fas fa-map-marker-alt"></i>
                <span>{event.venue_name || event.venue_address}</span>
              </div>
              
              {event.max_attendees && (
                <div className="event-detail">
                  <i className="fas fa-users"></i>
                  <span>Max: {event.max_attendees} attendees</span>
                </div>
              )}
              
              <div className="event-detail">
                <i className="fas fa-dollar-sign"></i>
                <span>{event.ticket_price > 0 ? `$${event.ticket_price}` : 'Free'}</span>
              </div>
            </div>
            
            <div className="event-description">
              <p>{event.description}</p>
            </div>
            
            <div className="event-actions">
              <button 
                className="action-btn view-btn"
                onClick={() => onViewEvent && onViewEvent(event)}
              >
                <i className="fas fa-eye"></i>
                View
              </button>
              <button 
                className="action-btn edit-btn"
                onClick={() => onEditEvent && onEditEvent(event)}
              >
                <i className="fas fa-edit"></i>
                Edit
              </button>
              <button 
                className="action-btn delete-btn"
                onClick={() => onDeleteEvent && onDeleteEvent(event)}
              >
                <i className="fas fa-trash"></i>
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EventList;
