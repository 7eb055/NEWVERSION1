import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthTokenService from '../services/AuthTokenService';
import './css/footer.css';

const Footer = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [upcomingEvent, setUpcomingEvent] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [companyStats, setCompanyStats] = useState({
    totalEvents: 0,
    totalAttendees: 0,
    totalOrganizers: 0
  });
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Get user info and role
  useEffect(() => {
    const token = AuthTokenService.getToken();
    if (token) {
      const userInfo = AuthTokenService.getUserInfo();
      setUser(userInfo);
    }
  }, []);

  // Fetch upcoming event for countdown
  useEffect(() => {
    const fetchUpcomingEvent = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events?status=published&limit=1`);
        if (response.ok) {
          const events = await response.json();
          if (events.length > 0) {
            setUpcomingEvent(events[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching upcoming event:', error);
      }
    };

    fetchUpcomingEvent();
  }, []);

  // Fetch recent events for gallery
  useEffect(() => {
    const fetchRecentEvents = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events?status=published&limit=6`);
        if (response.ok) {
          const events = await response.json();
          setRecentEvents(events);
        }
      } catch (error) {
        console.error('Error fetching recent events:', error);
      }
    };

    fetchRecentEvents();
  }, []);

  // Fetch company statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = AuthTokenService.getToken();
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        const [eventsRes, attendeesRes, organizersRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events`, { headers }),
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/attendees`, { headers }),
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/companies`, { headers })
        ]);

        const [events, attendees, organizers] = await Promise.all([
          eventsRes.ok ? eventsRes.json() : [],
          attendeesRes.ok ? attendeesRes.json() : [],
          organizersRes.ok ? organizersRes.json() : { companies: [] }
        ]);

        setCompanyStats({
          totalEvents: Array.isArray(events) ? events.length : 0,
          totalAttendees: Array.isArray(attendees) ? attendees.length : 0,
          totalOrganizers: organizers.companies ? organizers.companies.length : 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  // Countdown timer for upcoming event
  useEffect(() => {
    if (!upcomingEvent) return;

    const calculateTimeLeft = () => {
      const eventDate = new Date(upcomingEvent.event_date);
      const now = new Date();
      const difference = eventDate - now;

      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        };
      }
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [upcomingEvent]);

  // Generate navigation links based on user role
  const getNavigationLinks = () => {
    const baseLinks = [
      { path: '/', label: 'Home' },
      { path: '/events', label: 'Browse Events' },
      { path: '/about', label: 'About Us' }
    ];

    if (!user) {
      return [
        ...baseLinks,
        { path: '/login', label: 'Login' },
        { path: '/signup', label: 'Sign Up' }
      ];
    }

    const userLinks = [...baseLinks];
    
    if (user.roles?.includes('attendee')) {
      userLinks.push(
        { path: '/attendee-dashboard', label: 'My Dashboard' },
        { path: '/my-registrations', label: 'My Events' }
      );
    }

    if (user.roles?.includes('organizer')) {
      userLinks.push(
        { path: '/organizer-dashboard', label: 'Organizer Dashboard' },
        { path: '/create-event', label: 'Create Event' }
      );
    }

    if (user.roles?.includes('admin')) {
      userLinks.push(
        { path: '/admin-dashboard', label: 'Admin Panel' }
      );
    }

    userLinks.push({ path: '/profile', label: 'Profile' });
    return userLinks;
  };

  const handleTicketPurchase = () => {
    if (upcomingEvent) {
      navigate(`/events/${upcomingEvent.event_id}`);
    } else {
      navigate('/events');
    }
  };

  return (
    <div>
      {/* Dynamic Countdown Banner */}
      {upcomingEvent && (timeLeft.days > 0 || timeLeft.hours > 0 || timeLeft.minutes > 0 || timeLeft.seconds > 0) && (
        <div className="countdown-banner animate-slide-down">
          <div className="countdown-container">
            <div className="countdown-timer">
              <div className="countdown-item">
                <span className="countdown-number">{timeLeft.days}</span>
                <span className="countdown-label">Days</span>
              </div>
              <div className="countdown-item">
                <span className="countdown-number">{timeLeft.hours}</span>
                <span className="countdown-label">Hours</span>
              </div>
              <div className="countdown-item">
                <span className="countdown-number">{timeLeft.minutes}</span>
                <span className="countdown-label">Minutes</span>
              </div>
              <div className="countdown-item">
                <span className="countdown-number">{timeLeft.seconds}</span>
                <span className="countdown-label">Seconds</span>
              </div>
            </div>
            <button className="buy-ticket-btn" onClick={handleTicketPurchase}>
              {user ? 'REGISTER NOW' : 'BUY TICKET'}
            </button>
          </div>
          
          <div className="event-details">
            <div className="event-info">
              <span className="event-date">
                📅 {new Date(upcomingEvent.event_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })} - {upcomingEvent.event_start_time || 'Time TBA'}
              </span>
              <span className="event-location">
                📍 {upcomingEvent.venue_name || 'Accra, Ghana'}
              </span>
              <span className="event-title">
                🎯 {upcomingEvent.event_name}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Footer Content */}
      <footer>
      <div className="footer-content">
        <div className="footer-container">
          {/* Company Info */}
          <div className="footer-column company-info animate-fade-in">
            <div className="logo-section">
              <h3 className="company-logo">🎯 Eventify Ghana</h3>
            </div>
            <p className="company-description">
              Ghana's leading event management platform connecting organizers, 
              attendees, and communities across the nation. Building the future 
              of events in West Africa.
            </p>
            <div className="platform-stats">
              <div className="stat-item">
                <span className="stat-number">{companyStats.totalEvents}+</span>
                <span className="stat-label">Events Hosted</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{companyStats.totalAttendees}+</span>
                <span className="stat-label">Happy Attendees</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{companyStats.totalOrganizers}+</span>
                <span className="stat-label">Event Organizers</span>
              </div>
            </div>
            <div className="social-links">
              <a href="https://facebook.com/eventifyghana" className="social-link" target="_blank" rel="noopener noreferrer">📘</a>
              <a href="https://instagram.com/eventifyghana" className="social-link" target="_blank" rel="noopener noreferrer">📷</a>
              <a href="https://linkedin.com/company/eventifyghana" className="social-link" target="_blank" rel="noopener noreferrer">💼</a>
              <a href="https://twitter.com/eventifyghana" className="social-link" target="_blank" rel="noopener noreferrer">�</a>
            </div>
          </div>

          {/* Dynamic Navigation Links */}
          <div className="footer-column animate-fade-in">
            <h4 className="footer-title">
              {user ? `${user.roles?.includes('organizer') ? 'Organizer' : user.roles?.includes('admin') ? 'Admin' : 'User'} Links` : 'Quick Links'}
            </h4>
            <ul className="footer-links">
              {getNavigationLinks().map((link, index) => (
                <li key={index}>
                  <Link to={link.path}>{link.label}</Link>
                </li>
              ))}
            </ul>
            {user && (
              <>
                <h4 className="footer-title" style={{marginTop: '20px'}}>Account</h4>
                <ul className="footer-links">
                  <li><Link to="/settings">Account Settings</Link></li>
                  <li><Link to="/help">Help & Support</Link></li>
                  <li>
                    <button 
                      onClick={() => {
                        AuthTokenService.removeToken();
                        navigate('/login');
                      }}
                      style={{background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0}}
                    >
                      Logout
                    </button>
                  </li>
                </ul>
              </>
            )}
          </div>

          {/* Contact Us - Ghana Office */}
          <div className="footer-column animate-fade-in">
            <h4 className="footer-title">Contact Ghana Office</h4>
            <div className="contact-info">
              <div className="contact-item">
                <span className="contact-icon">📞</span>
                <a href="tel:+233555123456">+233 55 512 3456</a>
              </div>
              <div className="contact-item">
                <span className="contact-icon">📍</span>
                <span>Cantonments, Accra, Ghana 🇬🇭</span>
              </div>
              <div className="contact-item">
                <span className="contact-icon">📧</span>
                <a href="mailto:support@eventifyghana.com">support@eventifyghana.com</a>
              </div>
              <div className="contact-item">
                <span className="contact-icon">🌐</span>
                <span>eventifyghana.com</span>
              </div>
              <div className="contact-item">
                <span className="contact-icon">💬</span>
                <a href="https://wa.me/233555123456">WhatsApp Support</a>
              </div>
              <div className="contact-item">
                <span className="contact-icon">⏰</span>
                <span>Mon-Fri: 8AM-6PM GMT</span>
              </div>
            </div>
          </div>

          {/* Recent Events Gallery */}
          <div className="footer-column gallery-section animate-fade-in">
            <h4 className="footer-title">Recent Events in Ghana</h4>
            <div className="event-gallery">
              {recentEvents.slice(0, 6).map((event, index) => (
                <div 
                  key={event.event_id} 
                  className="gallery-item"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  title={`${event.event_name} - ${new Date(event.event_date).toLocaleDateString()}`}
                >
                  {event.event_image ? (
                    <img src={event.event_image} alt={event.event_name} />
                  ) : (
                    <div className="placeholder-image">
                      <span className="event-icon">🎯</span>
                      <span className="event-name">{event.event_name.slice(0, 20)}...</span>
                    </div>
                  )}
                  <div className="gallery-overlay">
                    <span className="event-date">
                      {new Date(event.event_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              ))}
              {recentEvents.length === 0 && (
                <div className="no-events-message">
                  <span>🎯 No recent events to display</span>
                  <p>Check back soon for upcoming events!</p>
                </div>
              )}
            </div>
            {recentEvents.length > 0 && (
              <div className="view-all-events">
                <Link to="/browse-events" className="view-all-btn">
                  View All Events in Ghana →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="footer-bottom animate-fade-in">
        <div className="footer-container">
          <div className="footer-bottom-content">
            <div className="copyright">
              <p>&copy; {new Date().getFullYear()} Eventify Ghana. All Rights Reserved</p>
              <p>Proudly serving Ghana and West Africa 🇬🇭</p>
            </div>
            <div className="footer-links-bottom">
              <Link to="/privacy-policy">Privacy Policy</Link>
              <Link to="/terms-of-service">Terms of Service</Link>
              <Link to="/help">Help & Support</Link>
              <a href="tel:+233800EVENTS">Emergency: +233 800 EVENTS</a>
            </div>
            <div className="platform-stats-bottom">
              <span>🎯 {companyStats.totalEvents}+ Events</span>
              <span>👥 {companyStats.totalAttendees}+ Attendees</span>
              <span>🏢 {companyStats.totalOrganizers}+ Organizers</span>
              <span>Made with ❤️ in Ghana</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
    </div>
  );
};

export default Footer;
