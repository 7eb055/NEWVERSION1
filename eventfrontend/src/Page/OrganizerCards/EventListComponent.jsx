import React from 'react';
import { useEventData } from './hooks/useEventData';
import { useDashboardState } from './hooks/useDashboardState';
import './css/EventListComponent.css';

const EventListComponent = () => {
  const { events, loading, error } = useEventData();
  const {
    setSelectedEvent,
    setShowEventDetails,
    setShowEditForm,
    setShowDeleteConfirm,
    setEventToDelete
  } = useDashboardState();

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  // Handle event actions
  const handleViewEvent = (event) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const handleEditEvent = (event) => {
    setSelectedEvent(event);
    setShowEditForm(true);
  };

  const handleDeleteEvent = (event) => {
    setEventToDelete(event);
    setShowDeleteConfirm(true);
  };

  // Handle loading state
  if (loading) {
    return (
      <div className="event-list-component">
        <div className="section-header">
          <h2>Your Events</h2>
        </div>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading events...</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="event-list-component">
        <div className="section-header">
          <h2>Your Events</h2>
        </div>
        <div className="error-state">
          <p className="error-message">Error loading events: {error}</p>
          <button 
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Handle empty state
  if (!events || events.length === 0) {
    return (
      <div className="event-list-component">
        <div className="section-header">
          <h2>Your Events</h2>
        </div>
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>No Events Yet</h3>
          <p>Create your first event to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="event-list-component">
      <div className="section-header">
        <h2>Your Events ({events.length})</h2>
      </div>
      
      <div className="events-grid">
        {events.map((event) => (
          <div key={event.id} className="event-card">
            <div className="event-card-header">
              <h3 className="event-title">{event.event_name || event.title}</h3>
              <span className={`event-status status-${event.status}`}>
                {event.status || 'draft'}
              </span>
            </div>
            
            <div className="event-card-content">
              <div className="event-info">
                <div className="info-row">
                  <span className="info-label">Date:</span>
                  <span className="info-value">{formatDate(event.event_date)}</span>
                </div>
                
                <div className="info-row">
                  <span className="info-label">Venue:</span>
                  <span className="info-value">{event.venue_name || 'No venue'}</span>
                </div>
                
                <div className="info-row">
                  <span className="info-label">Category:</span>
                  <span className="info-value">{event.category || event.event_type || 'No category'}</span>
                </div>
                
                {event.ticket_price && (
                  <div className="info-row">
                    <span className="info-label">Price:</span>
                    <span className="info-value">${event.ticket_price}</span>
                  </div>
                )}
                
                {event.max_attendees && (
                  <div className="info-row">
                    <span className="info-label">Max Attendees:</span>
                    <span className="info-value">{event.max_attendees}</span>
                  </div>
                )}
              </div>
              
              {event.description && (
                <div className="event-description">
                  <p>{event.description.length > 100 
                    ? `${event.description.substring(0, 100)}...` 
                    : event.description}
                  </p>
                </div>
              )}
            </div>
            
            <div className="event-card-actions">
              <button 
                className="action-button view-button"
                onClick={() => handleViewEvent(event)}
                title="View Event Details"
              >
                <span className="button-icon">👁</span>
                View
              </button>
              
              <button 
                className="action-button edit-button"
                onClick={() => handleEditEvent(event)}
                title="Edit Event"
              >
                <span className="button-icon">✏️</span>
                Edit
              </button>
              
              <button 
                className="action-button delete-button"
                onClick={() => handleDeleteEvent(event)}
                title="Delete Event"
              >
                <span className="button-icon">🗑️</span>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventListComponent;
