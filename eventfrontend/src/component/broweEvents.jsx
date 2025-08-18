import React, { useState, useEffect } from 'react';
import './css/browseEvents.css';
import EventService from '../services/EventService';
import AuthTokenService from '../services/AuthTokenService';
import { API_BASE_URL } from '../config/api';

const BrowseEvents = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [eventDates, setEventDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [registering, setRegistering] = useState({});

  // Default placeholder image for events
  const defaultEventImage = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';

  // Fetch events from backend
  useEffect(() => {
    fetchEvents();
  }, []);

  // Filter events when selected date changes
  useEffect(() => {
    if (selectedDate) {
      const filtered = events.filter(event => {
        const eventDate = new Date(event.event_date).toISOString().split('T')[0];
        return eventDate === selectedDate;
      });
      setFilteredEvents(filtered);
    } else {
      setFilteredEvents(events);
    }
  }, [selectedDate, events]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await EventService.getPublishedEvents({
        limit: 50 // Get more events to show variety
      });

      if (response.success) {
        setEvents(response.data);
        
        // Generate available dates from events
        const dates = EventService.getAvailableEventDates(response.data);
        setEventDates(dates);
        
        // Set first available date as selected if any
        if (dates.length > 0) {
          setSelectedDate(dates[0].dateString);
        }
      } else {
        setError(response.error || 'Failed to load events');
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterForEvent = async (eventId) => {
    const isLoggedIn = AuthTokenService.isAuthenticated();
    
    if (!isLoggedIn) {
      alert('Please log in to register for events');
      // You could redirect to login page here
      return;
    }

    try {
      setRegistering(prev => ({ ...prev, [eventId]: true }));
      
      const response = await EventService.registerForEvent(eventId, 1);
      
      if (response.success) {
        alert('Successfully registered for the event!');
        // Refresh events to update registration count
        fetchEvents();
      } else {
        alert(response.error || 'Failed to register for event');
      }
    } catch (err) {
      console.error('Error registering for event:', err);
      alert('Failed to register for event. Please try again.');
    } finally {
      setRegistering(prev => ({ ...prev, [eventId]: false }));
    }
  };

  const formatEventDate = (dateString) => {
    const date = new Date(dateString);
    return {
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }),
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };
  };

  const getAvailableTickets = (event) => {
    return event.max_attendees - (event.registration_count || 0);
  };

  if (loading) {
    return (
      <section className="browse-events-section">
        <div className="container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading events...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="browse-events-section">
        <div className="container">
          <div className="error-message">
            <h3>Error Loading Events</h3>
            <p>{error}</p>
            <button onClick={fetchEvents} className="retry-btn">
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="browse-events-section">
      <div className="main-container">
        {/* Modern Header with Stats */}
        <div className="hero-header">
          <div className="header-content">
            <div className="header-left">
              <span className="event-badge">
                <span className="badge-icon">🎉</span>
                DISCOVER EVENTS
              </span>
              <h1 className="main-title">
                Upcoming Events
                <span className="title-accent">Near You</span>
              </h1>
              <p className="main-subtitle">
                Join thousands of people discovering amazing events, workshops, and experiences
              </p>
            </div>
            <div className="header-stats">
              <div className="stat-card">
                <div className="stat-number">{events.length}</div>
                <div className="stat-label">Total Events</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{eventDates.length}</div>
                <div className="stat-label">Event Days</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{filteredEvents.length}</div>
                <div className="stat-label">Available Now</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Date Selector */}
        <div className="controls-section">
          {/* Quick Filters */}
          <div className="quick-filters">
            <button 
              className={`filter-chip ${selectedDate === null ? 'active' : ''}`}
              onClick={() => setSelectedDate(null)}
            >
              <span className="chip-icon">📋</span>
              All Events ({events.length})
            </button>
            {eventDates.slice(0, 4).map((eventDate) => (
              <button
                key={eventDate.dateString}
                className={`filter-chip ${selectedDate === eventDate.dateString ? 'active' : ''}`}
                onClick={() => setSelectedDate(eventDate.dateString)}
              >
                <span className="chip-icon">📅</span>
                {eventDate.month} {eventDate.day} ({eventDate.eventsCount})
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="view-controls">
            <div className="results-count">
              Showing {filteredEvents.length} of {events.length} events
            </div>
          </div>
        </div>

        {/* Events Grid */}
        <div className="events-grid">
          {filteredEvents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎪</div>
              <h3 className="empty-title">No Events Found</h3>
              <p className="empty-description">
                {selectedDate 
                  ? 'No events scheduled for the selected date. Try viewing all events.' 
                  : 'No published events available right now. Check back soon for exciting new events!'
                }
              </p>
              {selectedDate && (
                <button 
                  onClick={() => setSelectedDate(null)} 
                  className="empty-action-btn"
                >
                  <span className="btn-icon">👀</span>
                  View All Events
                </button>
              )}
            </div>
          ) : (
            filteredEvents.map((event, index) => {
              const formattedDate = formatEventDate(event.event_date);
              const availableTickets = getAvailableTickets(event);
              const isRegistering = registering[event.event_id];
              const isSoldOut = availableTickets <= 0;
              const isLowCapacity = availableTickets <= 10 && availableTickets > 0;
              
              return (
                <div 
                  key={event.event_id} 
                  className={`event-card-modern ${isSoldOut ? 'sold-out' : ''}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Event Image Header */}
                  <div className="event-image-container">
                    <img 
                      src={event.image_url || (event.image_filename ? `${API_BASE_URL}/uploads/images/${event.image_filename}` : defaultEventImage)} 
                      alt={event.event_name}
                      className="event-image"
                      onError={(e) => {
                        e.target.src = defaultEventImage;
                      }}
                    />
                    <div className="image-overlay">
                      {isSoldOut && <div className="status-badge sold-out-badge">SOLD OUT</div>}
                      {isLowCapacity && <div className="status-badge low-stock-badge">Few Tickets Left</div>}
                      {!isSoldOut && !isLowCapacity && <div className="status-badge available-badge">Available</div>}
                    </div>
                    <div className="event-price-tag">
                      {event.ticket_price > 0 ? `GH₵${event.ticket_price}` : 'FREE'}
                    </div>
                  </div>

                  {/* Event Content */}
                  <div className="event-card-content">
                    {/* Date and Time */}
                    <div className="event-datetime">
                      <div className="date-section">
                        <span className="event-day">{new Date(event.event_date).getDate()}</span>
                        <span className="event-month">{new Date(event.event_date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</span>
                      </div>
                      <div className="time-section">
                        <span className="event-time">{formattedDate.time}</span>
                        <span className="event-weekday">{new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                      </div>
                    </div>

                    {/* Event Title */}
                    <h3 className="event-title-modern">{event.event_name}</h3>

                    {/* Event Meta Info */}
                    <div className="event-meta-grid">
                      <div className="meta-item">
                        <span className="meta-icon">👥</span>
                        <span className="meta-text">{availableTickets} tickets left</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-icon">🏢</span>
                        <span className="meta-text">{event.company_name || event.organizer_name}</span>
                      </div>
                    </div>

                    {/* Capacity Bar */}
                    <div className="capacity-section">
                      <div className="capacity-info">
                        <span className="capacity-text">Capacity</span>
                        <span className="capacity-numbers">{event.max_attendees - availableTickets}/{event.max_attendees}</span>
                      </div>
                      <div className="capacity-bar">
                        <div 
                          className="capacity-fill"
                          style={{ 
                            width: `${((event.max_attendees - availableTickets) / event.max_attendees) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="event-actions-modern">
                      <button 
                        className={`primary-action-btn ${isRegistering ? 'loading' : ''} ${isSoldOut ? 'disabled' : ''}`}
                        onClick={() => handleRegisterForEvent(event.event_id)}
                        disabled={isRegistering || isSoldOut}
                      >
                        {isRegistering ? (
                          <>
                            <span className="btn-spinner"></span>
                            Registering...
                          </>
                        ) : isSoldOut ? (
                          <>
                            <span className="btn-icon">❌</span>
                            Sold Out
                          </>
                        ) : (
                          <>
                            <span className="btn-icon">🎫</span>
                            Register Now
                          </>
                        )}
                      </button>
                      
                      <button 
                        className="secondary-action-btn"
                        onClick={() => {
                          console.log('View details for event:', event.event_id);
                        }}
                      >
                        <span className="btn-icon">📋</span>
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Load More Section */}
        {filteredEvents.length > 0 && events.length > filteredEvents.length && (
          <div className="load-more-container">
            <button onClick={fetchEvents} className="load-more-btn-modern">
              <span className="btn-icon">⬇️</span>
              Load More Events
              <span className="btn-subtitle">Discover more amazing events</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default BrowseEvents;
