import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import "./css/Eventslist.css";
import Header from "../component/header";
import Footer from "../component/footer";
import TicketPurchaseCard from '../component/AttendeeCards/TicketPurchaseCard';
import AuthTokenService from '../services/AuthTokenService';

function EventListPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  
  // New state for ticket purchase functionality
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showTicketPurchase, setShowTicketPurchase] = useState(false);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  
  // Categories for filtering
  const categories = ["All", "Technology", "Business", "Music", "Sports", "Arts", "Health"];
  const statuses = ["All", "published", "draft", "cancelled"];

  // Fetch events from backend
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/events');
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      const data = await response.json();
      console.log('Fetched events:', data); // Debug log
      setEvents(data);
      setFilteredEvents(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  // Format date function
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter events based on search and filters
  useEffect(() => {
    let filtered = events.filter(event => {
      const matchesSearch = event.event_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === "All" || event.category === categoryFilter;
      const matchesStatus = statusFilter === "All" || event.status === statusFilter;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
    setFilteredEvents(filtered);
  }, [events, searchTerm, categoryFilter, statusFilter]);
  
  // Handle search input
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle category filter
  const handleCategoryFilter = (category) => {
    setCategoryFilter(category);
  };
  
  // Handle status filter
  const handleStatusFilter = (status) => {
    setStatusFilter(status);
  };
  
  // Sort events by date
  const sortEventsByDate = () => {
    const sorted = [...filteredEvents].sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    setFilteredEvents(sorted);
  };

  // Helper function to get auth token
  const getAuthToken = () => {
    const token = AuthTokenService.getToken();
    return token;
  };

  // Helper function to make API calls with auth
  const makeAuthenticatedRequest = async (url, options = {}) => {
    const token = getAuthToken();
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };

    return fetch(`http://localhost:5000${url}`, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    });
  };

  // Handle view details click
  const handleViewDetails = (event) => {
    navigate(`/event/${event.event_id}`);
  };

  // Handle register for event click  
  const handleRegisterClick = async (event) => {
    // Check if user is authenticated
    const token = getAuthToken();
    if (!token) {
      alert('Please log in to register for events');
      navigate('/login');
      return;
    }

    setSelectedEvent(event);
    setLoadingTickets(true);
    
    try {
      // Fetch ticket types for the selected event
      const response = await fetch(`http://localhost:5000/api/events/${event.event_id}/ticket-types/public`);
      
      if (response.ok) {
        const data = await response.json();
        setTicketTypes(data.ticketTypes || []);
      } else {
        console.error('Failed to fetch ticket types');
        setTicketTypes([]);
      }
    } catch (error) {
      console.error('Error fetching ticket types:', error);
      setTicketTypes([]);
    } finally {
      setLoadingTickets(false);
      setShowTicketPurchase(true);
    }
  };

  // Handle purchase ticket submission
  const handlePurchaseTicket = async (registrationData) => {
    try {
      // The TicketPurchaseCard already handles the API call
      // Just show success message and close the modal
      alert('Ticket purchased successfully!');
      setShowTicketPurchase(false);
      
      // Optionally refresh events or show success message
      console.log('Ticket purchase completed:', registrationData);
    } catch (error) {
      console.error('Error handling ticket purchase:', error);
      alert('An error occurred while processing your ticket purchase');
    }
  };

  return (
    <div className="event-list-page">
      <Header />
      <header className="event-list-header">
        <div className="container">
          <h1>Discover Events</h1>
          <p>Browse and register for upcoming conferences and gatherings</p>
        </div>
      </header>
      
      <div className="container">
        {/* Search and Filters */}
        <div className="controls-section">
          <div className="search-bar">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          
          <div className="filters">
            <div className="filter-group">
              <h3>Category</h3>
              <div className="filter-options">
                {categories.map(category => (
                  <button
                    key={category}
                    className={`filter-btn ${categoryFilter === category ? 'active' : ''}`}
                    onClick={() => handleCategoryFilter(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="filter-group">
              <h3>Status</h3>
              <div className="filter-options">
                {statuses.map(status => (
                  <button
                    key={status}
                    className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
                    onClick={() => handleStatusFilter(status)}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
            
            <button className="sort-btn" onClick={sortEventsByDate}>
              <i className="fas fa-sort-amount-down"></i> Sort by Date
            </button>
          </div>
        </div>
        
        {/* Event Cards */}
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner">
              <i className="fas fa-spinner"></i>
            </div>
            <p>Loading events...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <div className="error-icon">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h3>Error Loading Events</h3>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={fetchEvents}>
              <i className="fas fa-refresh"></i> Try Again
            </button>
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="events-grid">
            {filteredEvents.map(event => {
              console.log('Rendering event:', event); // Debug log
              return (
              <div className="event-card" key={event.event_id}>
                {/* Event Status */}
                <div className={`event-status status-${event.status ? event.status.toLowerCase() : 'default'}`}>
                  {event.status || 'N/A'}
                </div>
                
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
                    <h2 className="event-title">{event.event_name}</h2>
                  </div>
                  
                  <div className="event-details">
                    <div className="event-detail">
                      <i className="fas fa-calendar"></i>
                      <span>{formatDate(event.event_date)}</span>
                    </div>
                    
                    <div className="event-detail">
                      <i className="fas fa-map-marker-alt"></i>
                      <span>{event.venue_name || event.venue_address || 'TBD'}</span>
                    </div>
                    
                    {event.max_attendees && (
                      <div className="event-detail">
                        <i className="fas fa-users"></i>
                        <span>Max: {event.max_attendees} attendees</span>
                      </div>
                    )}
                    
                    <div className="event-detail">
                      <i className="fas fa-coins"></i>
                      <span>{event.ticket_price > 0 ? `GH₵${event.ticket_price}` : 'Free'}</span>
                    </div>
                    
                    {event.category && (
                      <div className="event-detail">
                        <i className="fas fa-tag"></i>
                        <span>{event.category}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="event-description">
                    <p>{event.description || 'No description available'}</p>
                  </div>
                  
                  <div className="event-actions">
                    <button 
                      className="action-btn view-btn"
                      onClick={() => handleViewDetails(event)}
                    >
                      <i className="fas fa-eye"></i>
                      View Details
                    </button>
                    <button 
                      className="action-btn register-btn"
                      onClick={() => handleRegisterClick(event)}
                    >
                      <i className="fas fa-ticket-alt"></i>
                      Register
                    </button>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        ) : (
          <div className="no-results">
            <div className="no-results-icon">
              <i className="fas fa-calendar-times"></i>
            </div>
            <h3>No events found</h3>
            <p>No events match your search criteria. Try adjusting your filters or search term.</p>
          </div>
        )}
      </div>
      
      {/* Ticket Purchase Modal */}
      {showTicketPurchase && (
        <TicketPurchaseCard 
          event={selectedEvent}
          ticketTypes={ticketTypes}
          loading={loadingTickets}
          onPurchase={handlePurchaseTicket}
          onCancel={() => setShowTicketPurchase(false)}
        />
      )}
      
      {/* Footer */}
      {/* <footer> */}
        <div className="container">
          <p>Event Management System • For assistance, contact support@events.com</p>
          <p style={{ marginTop: '10px' }}>
            Follow us: 
            <i className="fab fa-twitter"></i> 
            <i className="fab fa-linkedin"></i> 
            <i className="fab fa-instagram"></i>
          </p>
        </div>
      {/* </footer> */}
      <Footer />
    </div>
  );
}

export default EventListPage;