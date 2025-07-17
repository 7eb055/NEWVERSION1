import React from 'react';

const EventList = ({ 
  events, 
  isLoading, 
  showCreateForm, 
  setShowCreateForm, 
  formatDate 
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
        <div key={event.id} className="event-card">
          <div className="event-header">
            <h3 className="event-title">{event.name}</h3>
            {event.category && (
              <span className={`event-category ${event.category}`}>
                {event.category}
              </span>
            )}
          </div>
          
          <div className="event-details">
            <div className="event-detail">
              <i className="fas fa-calendar"></i>
              <span>{formatDate(event.date)}</span>
            </div>
            
            <div className="event-detail">
              <i className="fas fa-map-marker-alt"></i>
              <span>{event.location}</span>
            </div>
            
            {event.maxAttendees && (
              <div className="event-detail">
                <i className="fas fa-users"></i>
                <span>Max: {event.maxAttendees} attendees</span>
              </div>
            )}
            
            <div className="event-detail">
              <i className="fas fa-dollar-sign"></i>
              <span>{event.price > 0 ? `$${event.price}` : 'Free'}</span>
            </div>
          </div>
          
          <div className="event-description">
            <p>{event.description}</p>
          </div>
          
          <div className="event-actions">
            <button className="action-btn view-btn">
              <i className="fas fa-eye"></i>
              View
            </button>
            <button className="action-btn edit-btn">
              <i className="fas fa-edit"></i>
              Edit
            </button>
            <button className="action-btn delete-btn">
              <i className="fas fa-trash"></i>
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EventList;
