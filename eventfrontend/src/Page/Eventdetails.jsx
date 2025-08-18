import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../component/header';
import Footer from '../component/footer';
import TicketPurchase from '../component/TicketPurchase';
import { API_BASE_URL } from '../config/api';
import './css/Eventdetails.css';

function EventDetails() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [otherEvents, setOtherEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showTicketPurchase, setShowTicketPurchase] = useState(false);

  // Function to safely access potentially undefined properties
  const safeGet = (obj, path, fallback = '') => {
    if (!obj) return fallback;
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
      if (result === null || result === undefined) return fallback;
      result = result[key];
    }
    
    return result !== null && result !== undefined ? result : fallback;
  };

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        setLoading(true);
        // Use import.meta.env instead of process.env for Vite projects
        const response = await axios.get(`${API_BASE_URL}/api/public/events/${eventId}`);
        
        console.log('Event data received:', response.data);
        
        // Handle both response structures
        const eventData = response.data.event || response.data;
        
        if (!eventData) {
          throw new Error('Event data not found in the response');
        }
        
        setEvent(eventData);
        setReviews(response.data.reviews || []);
        setOtherEvents(response.data.otherEvents || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching event details:', err);
        setError('Failed to load event details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [eventId]);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    
    // Parse the time string (assuming format like "14:30:00")
    const [hours, minutes] = timeString.split(':');
    
    // Create a date object with the current date but the specified time
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    
    // Format the time using the browser's locale
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const renderStarRating = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<i key={i} className="fas fa-star"></i>);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<i key={i} className="fas fa-star-half-alt"></i>);
      } else {
        stars.push(<i key={i} className="far fa-star"></i>);
      }
    }

    return <div className="star-rating">{stars}</div>;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading event details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate(-1)} className="btn-primary">
          Go Back
        </button>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="error-container">
        <h2>Event Not Found</h2>
        <p>The event you're looking for doesn't exist or has been removed.</p>
        <button onClick={() => navigate('/attendee-dashboard')} className="btn-primary">
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="event-details-container">
        <div className="event-details-header">
          <div className="event-image-container">
            {safeGet(event, 'image_url') ? (
              <img src={safeGet(event, 'image_url')} alt={safeGet(event, 'event_name')} className="event-image" />
            ) : (
              <div className="event-image-placeholder">
                <i className="fas fa-calendar-alt"></i>
              </div>
            )}
          </div>
          
          <div className="event-header-content">
            <h1 className="event-title">{safeGet(event, 'event_name', 'Event')}</h1>
            
            <div className="event-meta">
              <div className="event-meta-item">
                <i className="far fa-calendar"></i>
                <span>{formatDate(safeGet(event, 'event_date', new Date()))}</span>
              </div>
              
              <div className="event-meta-item">
                <i className="far fa-clock"></i>
                <span>{safeGet(event, 'event_time') ? formatTime(safeGet(event, 'event_time')) : 'Time not specified'} {safeGet(event, 'end_time') ? `- ${formatTime(safeGet(event, 'end_time'))}` : ''}</span>
              </div>
              
              <div className="event-meta-item">
                <i className="fas fa-map-marker-alt"></i>
                <span>{event.venue_name ? `${event.venue_name}${event.venue_address ? ', ' + event.venue_address : ''}` : 'Location not specified'}</span>
              </div>
              
              {event.category && (
                <div className="event-meta-item">
                  <i className="fas fa-tag"></i>
                  <span>{event.category}</span>
                </div>
              )}
              
              {event.average_rating > 0 && (
                <div className="event-meta-item">
                  {renderStarRating(event.average_rating)}
                  <span>({event.review_count} reviews)</span>
                </div>
              )}
            </div>
            
            <div className="event-actions">
              <button className="btn-register" onClick={() => setShowTicketPurchase(true)}>Register Now</button>
              <div className="event-price">
                {event.ticket_price > 0 ? `GH₵${parseFloat(event.ticket_price).toFixed(2)}` : 'Free'}
              </div>
            </div>
          </div>
        </div>
        
        <div className="event-tabs">
          <button 
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button 
            className={`tab-button ${activeTab === 'organizer' ? 'active' : ''}`}
            onClick={() => setActiveTab('organizer')}
          >
            Organizer
          </button>
          {reviews.length > 0 && (
            <button 
              className={`tab-button ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              Reviews ({reviews.length})
            </button>
          )}
        </div>
        
        <div className="event-content">
          {activeTab === 'overview' && (
            <div className="event-overview">
              <h2>About This Event</h2>
              <div className="event-description">
                <p>{event.description}</p>
              </div>
              
              {event.tags && (
                <div className="event-tags">
                  <h3>Tags</h3>
                  <div className="tags-container">
                    {event.tags.split(',').map((tag, index) => (
                      <span key={index} className="tag">{tag.trim()}</span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="event-registration-info">
                <h3>Registration Information</h3>
                <div className="registration-items">
                  <div className="registration-item">
                    <i className="far fa-calendar-check"></i>
                    <div>
                      <strong>Registration Deadline</strong>
                      <p>{event.registration_deadline ? formatDate(event.registration_deadline) : 'No deadline'}</p>
                    </div>
                  </div>
                  
                  <div className="registration-item">
                    <i className="fas fa-users"></i>
                    <div>
                      <strong>Capacity</strong>
                      <p>{event.max_attendees || 'Unlimited'}</p>
                    </div>
                  </div>
                  
                  <div className="registration-item">
                    <i className="fas fa-ticket-alt"></i>
                    <div>
                      <strong>Tickets Per Person</strong>
                      <p>Maximum {event.max_tickets_per_person} per registration</p>
                    </div>
                  </div>
                  
                  <div className="registration-item">
                    <i className="fas fa-user-check"></i>
                    <div>
                      <strong>Approval Required</strong>
                      <p>{event.requires_approval ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {otherEvents.length > 0 && (
                <div className="other-events">
                  <h3>More Events by {event.organizer_name}</h3>
                  <div className="other-events-container">
                    {otherEvents.map(otherEvent => (
                      <div key={otherEvent.event_id} className="other-event-card" onClick={() => navigate(`/events/${otherEvent.event_id}`)}>
                        <div className="other-event-image">
                          {otherEvent.image_url ? (
                            <img src={otherEvent.image_url} alt={otherEvent.event_name} />
                          ) : (
                            <div className="other-event-image-placeholder">
                              <i className="fas fa-calendar-alt"></i>
                            </div>
                          )}
                        </div>
                        <div className="other-event-content">
                          <h4>{otherEvent.event_name}</h4>
                          <p><i className="far fa-calendar"></i> {formatDate(otherEvent.event_date)}</p>
                          <p><i className="fas fa-map-marker-alt"></i> {otherEvent.venue_name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'details' && (
            <div className="event-details-tab">
              <h2>Event Details</h2>
              
              <div className="details-section">
                <h3>Refund Policy</h3>
                <p>{event.refund_policy || 'No refund policy specified.'}</p>
              </div>
              
              <div className="details-section">
                <h3>Terms and Conditions</h3>
                <p>{event.terms_and_conditions || 'No terms and conditions specified.'}</p>
              </div>
              
              <div className="details-section">
                <h3>Attendee Count</h3>
                <p><i className="fas fa-user-friends"></i> {event.attendee_count} people registered</p>
              </div>
              
              <div className="location-section">
                <h3>Location</h3>
                <div className="venue-details">
                  <div className="venue-info">
                    <h4>{event.venue_name}</h4>
                    <p>{event.venue_address}</p>
                  </div>
                  <div className="venue-map">
                    {/* In a real application, you would use a map component here */}
                    <div className="map-placeholder">
                      <i className="fas fa-map-marked-alt"></i>
                      <p>Map view would display here</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'organizer' && (
            <div className="organizer-details">
              <h2>About the Organizer</h2>
              
              <div className="organizer-profile">
                <div className="organizer-header">
                  <div className="organizer-avatar">
                    <i className="fas fa-user-tie"></i>
                  </div>
                  <div className="organizer-info">
                    <h3>{event.organizer_name}</h3>
                    <p>Event Organizer</p>
                  </div>
                </div>
                
                <div className="organizer-bio">
                  <p>{event.organizer_bio || 'No organizer bio available.'}</p>
                </div>
                
                <div className="organizer-contact">
                  <h4>Contact Information</h4>
                  <div className="contact-details">
                    {event.contact_phone && (
                      <div className="contact-item">
                        <i className="fas fa-phone"></i>
                        <span>{event.contact_phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {event.sponsoring_company && (
                <div className="company-details">
                  <h3>Associated Company</h3>
                  
                  <div className="company-card">
                    <div className="company-logo">
                      <div className="company-logo-placeholder">
                        <i className="fas fa-building"></i>
                      </div>
                    </div>
                    <div className="company-info">
                      <h4>{event.sponsoring_company}</h4>
                      <p>{event.company_address || 'No address available'}</p>
                      <p>{event.contact_info || 'No contact information available.'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'reviews' && (
            <div className="reviews-section">
              <h2>Attendee Reviews</h2>
              
              <div className="reviews-overview">
                <div className="average-rating">
                  <div className="rating-number">{event.average_rating.toFixed(1)}</div>
                  {renderStarRating(event.average_rating)}
                  <div className="rating-count">{event.review_count} reviews</div>
                </div>
              </div>
              
              <div className="reviews-list">
                {reviews.length > 0 ? (
                  reviews.map(review => (
                    <div key={review.feedback_id} className="review-card">
                      <div className="review-header">
                        <div className="reviewer-info">
                          <div className="reviewer-avatar">
                            <i className="fas fa-user"></i>
                          </div>
                          <div>
                            <div className="reviewer-name">{review.attendee_name}</div>
                            <div className="review-date">
                              {new Date(review.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="review-rating">
                          {renderStarRating(review.rating)}
                        </div>
                      </div>
                      <div className="review-content">
                        <p>{review.comment}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-reviews">
                    <i className="far fa-comment-dots"></i>
                    <p>No reviews yet for this event.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
      {showTicketPurchase && (
        <TicketPurchase 
          eventId={eventId} 
          eventName={safeGet(event, 'event_name', 'Event')}
          onClose={() => setShowTicketPurchase(false)}
        />
      )}
    </>
  );
}

export default EventDetails;
