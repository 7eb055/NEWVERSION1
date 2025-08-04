import React, { useState, useEffect } from 'react';
import './css/browseEvents.css';
import EventService from '../services/EventService';
import AuthTokenService from '../services/AuthTokenService';

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
      <div className="container">
        {/* Header */}
        <div className="section-header animate-fade-in">
          <span className="section-badge">EVENT SCHEDULE</span>
          <h2 className="section-title">Available Events</h2>
          <p className="section-subtitle">
            Discover and register for upcoming events from various organizers
          </p>
        </div>

        {/* Day Selector */}
        {eventDates.length > 0 && (
          <div className="day-selector animate-slide-up">
            <div
              className={`day-card ${selectedDate === null ? 'active' : ''}`}
              onClick={() => setSelectedDate(null)}
            >
              <div className="day-header">
                <span className="day-label">All Events</span>
              </div>
              <div className="day-content">
                <span className="day-date">All</span>
                <div className="day-month-year">
                  <span className="day-month">DAYS</span>
                  <span className="event-count">{events.length}</span>
                </div>
              </div>
            </div>
            
            {eventDates.slice(0, 5).map((eventDate, index) => (
              <div
                key={eventDate.dateString}
                className={`day-card ${selectedDate === eventDate.dateString ? 'active' : ''}`}
                onClick={() => setSelectedDate(eventDate.dateString)}
              >
                <div className="day-header">
                  <span className="day-label">{eventDate.label}</span>
                </div>
                <div className="day-content">
                  <span className="day-date">{eventDate.day.toString().padStart(2, '0')}</span>
                  <div className="day-month-year">
                    <span className="day-month">{eventDate.month}</span>
                    <span className="day-year">{eventDate.year}</span>
                  </div>
                  {eventDate.eventsCount > 0 && (
                    <div className="event-count-badge">{eventDate.eventsCount}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Events List */}
        <div className="events-list">
          {filteredEvents.length === 0 ? (
            <div className="no-events">
              <h3>No Events Available</h3>
              <p>
                {selectedDate 
                  ? 'No events scheduled for the selected date.' 
                  : 'No published events available at the moment.'
                }
              </p>
              {selectedDate && (
                <button 
                  onClick={() => setSelectedDate(null)} 
                  className="view-all-btn"
                >
                  View All Events
                </button>
              )}
            </div>
          ) : (
            filteredEvents.map((event, index) => {
              const formattedDate = formatEventDate(event.event_date);
              const availableTickets = getAvailableTickets(event);
              const isRegistering = registering[event.event_id];
              
              return (
                <div 
                  key={event.event_id} 
                  className={`event-card animate-fade-in-up`}
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <div className="event-image">
                    <img 
                      src={defaultEventImage} 
                      alt={event.event_name}
                      onError={(e) => {
                        e.target.src = defaultEventImage;
                      }}
                    />
                    <div className="event-status-badge">
                      {event.status === 'published' ? 'Available' : event.status}
                    </div>
                  </div>
                  <div className="event-content">
                    <div className="event-meta">
                      <div className="event-time">
                        <span className="time-icon">🕐</span>
                        {formattedDate.time}
                      </div>
                      <div className="event-location">
                        <span className="location-icon">📍</span>
                        {event.company_name || event.organizer_name}
                      </div>
                      <div className="event-date">
                        <span className="date-icon">📅</span>
                        {formattedDate.date}
                      </div>
                    </div>
                    
                    <h3 className="event-title">{event.event_name}</h3>
                    
                    <div className="event-details">
                      <div className="event-price">
                        <span className="price-label">Price:</span>
                        <span className="price-value">
                          {event.ticket_price > 0 ? `$${event.ticket_price}` : 'Free'}
                        </span>
                      </div>
                      
                      <div className="event-capacity">
                        <span className="capacity-label">Available Tickets:</span>
                        <span className={`capacity-value ${availableTickets <= 10 ? 'low-capacity' : ''}`}>
                          {availableTickets} / {event.max_attendees}
                        </span>
                      </div>
                      
                      <div className="event-organizer">
                        <span className="organizer-label">Organizer:</span>
                        <span className="organizer-name">{event.organizer_name}</span>
                      </div>
                    </div>

                    <div className="event-actions">
                      <button 
                        className={`purchase-btn ${isRegistering ? 'registering' : ''} ${availableTickets <= 0 ? 'sold-out' : ''}`}
                        onClick={() => handleRegisterForEvent(event.event_id)}
                        disabled={isRegistering || availableTickets <= 0}
                      >
                        {isRegistering ? (
                          <>
                            <span className="loading-spinner-small"></span>
                            Registering...
                          </>
                        ) : availableTickets <= 0 ? (
                          'SOLD OUT'
                        ) : (
                          'REGISTER NOW'
                        )}
                      </button>
                      
                      <button 
                        className="details-btn"
                        onClick={() => {
                          // You can implement a modal or navigate to event details page
                          console.log('View details for event:', event.event_id);
                        }}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Load More Button (if needed) */}
        {filteredEvents.length > 0 && events.length > filteredEvents.length && (
          <div className="load-more-section">
            <button onClick={fetchEvents} className="load-more-btn">
              Load More Events
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default BrowseEvents;