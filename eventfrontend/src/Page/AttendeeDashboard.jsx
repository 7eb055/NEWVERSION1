import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "./css/Eventdetails.css";
import Header from "../component/header";
import Footer from "../component/footer";
import EventCard from '../component/AttendeeCards/EventCard';
import TicketPurchaseCard from '../component/AttendeeCards/TicketPurchaseCard';
import FeedbackCard from '../component/AttendeeCards/FeedbackCard';
import EventReviewsCard from '../component/AttendeeCards/EventReviewsCard';
import ProfileCard from '../component/AttendeeCards/ProfileCard';
import NotificationsCard from '../component/AttendeeCards/NotificationsCard';
import MyTicketsCard from '../component/AttendeeCards/MyTicketsCard';
import AuthTokenService from '../services/AuthTokenService';

function Attendee() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('events');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });
  const [userProfile, setUserProfile] = useState({
    user_id: null,
    email: '',
    first_name: '',
    last_name: '',
    full_name: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    interests: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    dietary_restrictions: '',
    accessibility_needs: '',
    profile_picture_url: '',
    bio: '',
    social_media_links: {},
    notification_preferences: {
      email: true,
      sms: false,
      event_updates: true,
      promotions: false
    },
    registration_count: 0,
    attendance_count: 0,
    feedback_count: 0
  });
  const [events, setEvents] = useState([]);
  const [myTickets, setMyTickets] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notificationStats, setNotificationStats] = useState({
    total: 0,
    unread: 0,
    reminders: 0,
    confirmations: 0,
    system_notifications: 0
  });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showTicketPurchase, setShowTicketPurchase] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackEventId, setFeedbackEventId] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Helper function to get auth token
  const getAuthToken = () => {
    const token = AuthTokenService.getToken();
    console.log('=== TOKEN DEBUG ===');
    console.log('AuthTokenService token:', token ? 'Found' : 'Not found');
    console.log('localStorage token:', localStorage.getItem('token') ? 'Found' : 'Not found');
    console.log('localStorage authToken:', localStorage.getItem('authToken') ? 'Found' : 'Not found');
    console.log('All localStorage keys:', Object.keys(localStorage));
    console.log('==================');
    return token;
  };

  // Helper function to make API calls with auth
  const makeAuthenticatedRequest = async (url, options = {}) => {
    const token = getAuthToken();
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };

    return fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${url}`, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    });
  };

  // Fetch available events
  const fetchEvents = async () => {
    try {
      // Construct URL with search parameters
      let url = new URL(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/public/events`);
      
      // Add search parameters if they exist
      if (searchTerm) url.searchParams.append('search', searchTerm);
      if (selectedCategory) url.searchParams.append('category', selectedCategory);
      
      // Add pagination parameters
      url.searchParams.append('page', pagination.page);
      url.searchParams.append('limit', pagination.limit);
      
      // Using our new public events endpoint with search params
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        // Update the state with the events data from the response
        setEvents(data.events || []);
        // Update pagination state
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        console.error('Failed to fetch events');
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  // Fetch user's tickets from backend
  const fetchMyTickets = async () => {
    try {
      console.log('Fetching tickets...');
      const token = getAuthToken();
      console.log('Token for tickets request:', token ? 'Token exists' : 'No token found');
      
      const response = await makeAuthenticatedRequest('/api/attendee/tickets');
      
      if (response.ok) {
        const tickets = await response.json();
        console.log('Tickets received:', tickets);
        console.log('QR Code debugging:');
        
        // Transform the data to match the expected format
        const transformedTickets = tickets.map(ticket => {
          console.log(`Ticket ${ticket.registration_id}: QR Code present:`, !!ticket.qr_code, 'Length:', ticket.qr_code?.length);
          if (ticket.qr_code) {
            console.log(`QR Code preview for ticket ${ticket.registration_id}:`, ticket.qr_code.substring(0, 50) + '...');
          }
          
          return {
            registration_id: ticket.registration_id,
            id: ticket.registration_id, // For compatibility with existing handlers
            event_id: ticket.event_id,
            event_name: ticket.event_name,
            event_date: ticket.event_date,
            event_start_time: ticket.event_time, // Map event_time to event_start_time
            event_location: ticket.venue_name || ticket.venue_address,
            venue_name: ticket.venue_name,
            ticket_quantity: ticket.ticket_quantity,
            ticket_type: ticket.ticket_type_name || 'General',
            ticket_number: `TKT-${ticket.registration_id}`,
            attendee_name: userProfile?.full_name || 'Guest',
            status: ticket.status || 'confirmed',
            payment_status: ticket.payment_status,
            total_amount: ticket.total_amount,
            qr_code: ticket.qr_code,
            checked_in: ticket.checked_in || ticket.check_in_status || false,
            has_feedback: ticket.has_feedback || false
          };
        });
        
        console.log('Final transformed tickets with QR codes:', transformedTickets.map(t => ({
          id: t.id,
          hasQR: !!t.qr_code,
          qrLength: t.qr_code?.length
        })));
        
        setMyTickets(transformedTickets);
      } else {
        console.error('Failed to fetch tickets. Status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        setMyTickets([]);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setMyTickets([]);
    }
  };

  // Fetch user profile from backend
  const fetchUserProfile = async () => {
    try {
      console.log('Fetching user profile...');
      const token = getAuthToken();
      console.log('Token for profile request:', token ? 'Token exists' : 'No token found');
      
      const response = await makeAuthenticatedRequest('/api/attendee/profile');
      
      if (response.ok) {
        const data = await response.json();
        console.log('Profile data received:', data);
        if (data.success && data.profile) {
          setUserProfile(data.profile);
        } else {
          console.error('Invalid profile response format');
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch profile:', errorData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  // Fetch notifications from backend
  const fetchNotifications = async () => {
    try {
      console.log('Fetching notifications...');
      const token = getAuthToken();
      console.log('Token for notifications request:', token ? 'Token exists' : 'No token found');
      
      const response = await makeAuthenticatedRequest('/api/attendee/notifications?page=1&limit=20');
      
      if (response.ok) {
        const data = await response.json();
        console.log('Notifications response:', data);
        
        // Transform notifications to match expected format
        const transformedNotifications = data.notifications.map(notification => ({
          id: notification.notification_id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          read: notification.is_read,
          timestamp: notification.created_at,
          event_id: notification.event_id,
          event_name: notification.event_name
        }));
        
        setNotifications(transformedNotifications);
        console.log(`Loaded ${transformedNotifications.length} notifications`);
      } else {
        console.error('Failed to fetch notifications. Status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    }
  };

  // Fetch notification statistics
  const fetchNotificationStats = async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/attendee/notifications/stats');
      
      if (response.ok) {
        const stats = await response.json();
        console.log('Notification stats:', stats);
        setNotificationStats({
          total: parseInt(stats.total) || 0,
          unread: parseInt(stats.unread) || 0,
          reminders: parseInt(stats.reminders) || 0,
          confirmations: parseInt(stats.confirmations) || 0,
          system_notifications: parseInt(stats.system_notifications) || 0
        });
      } else {
        console.error('Failed to fetch notification stats');
      }
    } catch (error) {
      console.error('Error fetching notification stats:', error);
    }
  };

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // First test authentication
      try {
        console.log('Testing authentication...');
        const authResponse = await makeAuthenticatedRequest('/api/attendee/test-auth');
        if (authResponse.ok) {
          const authData = await authResponse.json();
          console.log('Authentication test successful:', authData);
        } else {
          console.error('Authentication test failed:', authResponse.status);
          const errorText = await authResponse.text();
          console.error('Auth error:', errorText);
        }
      } catch (error) {
        console.error('Auth test error:', error);
      }
      
      await Promise.all([
        fetchEvents(),
        fetchMyTickets(),
        fetchNotifications(),
        fetchNotificationStats(),
        fetchUserProfile()
      ]);
      setLoading(false);
    };

    loadData();
  }, [searchTerm, selectedCategory, pagination.page]); // Re-fetch when search term, category, or page changes

  // Handle page change
  const handlePageChange = (newPage) => {
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
    // The useEffect will trigger a new fetchEvents call
  };

  // Handle register for event click  
  const handleRegisterClick = async (event) => {
    setSelectedEvent(event);
    setLoadingTickets(true);
    
    try {
      // Fetch ticket types for the selected event
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${event.event_id}/ticket-types/public`);
      
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
  const handlePurchaseTicket = async () => {
    try {
      // The TicketPurchaseCard already handles the API call
      // Just show success message and close the modal
      alert('Ticket purchased successfully!');
      setShowTicketPurchase(false);
      
      // Refresh tickets, notifications, and stats from the backend to get the latest data
      await Promise.all([
        fetchMyTickets(),
        fetchNotifications(),
        fetchNotificationStats()
      ]);
    } catch (error) {
      console.error('Error handling ticket purchase:', error);
      alert('An error occurred while processing your ticket purchase');
    }
  };

  // Handle view QR code
  const handleViewQRCode = (ticketId) => {
    const ticket = myTickets.find(t => t.id === ticketId);
    if (ticket && ticket.qr_code) {
      // Create a modal or popup to display the QR code
      const modal = document.createElement('div');
      modal.style.position = 'fixed';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.width = '100%';
      modal.style.height = '100%';
      modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
      modal.style.display = 'flex';
      modal.style.justifyContent = 'center';
      modal.style.alignItems = 'center';
      modal.style.zIndex = '1000';
      
      const content = document.createElement('div');
      content.style.backgroundColor = 'white';
      content.style.padding = '20px';
      content.style.borderRadius = '8px';
      content.style.textAlign = 'center';
      
      const title = document.createElement('h3');
      title.textContent = `Ticket for ${ticket.event_name}`;
      
      const qrImage = document.createElement('img');
      qrImage.src = ticket.qr_code;
      qrImage.alt = 'QR Code';
      qrImage.width = 250;
      qrImage.height = 250;
      
      const closeButton = document.createElement('button');
      closeButton.textContent = 'Close';
      closeButton.style.marginTop = '15px';
      closeButton.style.padding = '8px 16px';
      closeButton.style.backgroundColor = '#f0f0f0';
      closeButton.style.border = 'none';
      closeButton.style.borderRadius = '4px';
      closeButton.style.cursor = 'pointer';
      closeButton.onclick = () => document.body.removeChild(modal);
      
      content.appendChild(title);
      content.appendChild(qrImage);
      content.appendChild(closeButton);
      modal.appendChild(content);
      
      document.body.appendChild(modal);
    }
  };

  // Handle download ticket
  const handleDownloadTicket = () => {
    alert('Ticket download functionality will be implemented soon');
  };

  // Handle cancel ticket
  const handleCancelTicket = async (ticketId) => {
    if (window.confirm('Are you sure you want to cancel this ticket? This cannot be undone.')) {
      try {
        const response = await makeAuthenticatedRequest(`/api/attendee/tickets/${ticketId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          const data = await response.json();
          alert(data.message || 'Ticket cancelled successfully');
          // Refresh tickets from backend to get updated data
          await fetchMyTickets();
        } else {
          const errorData = await response.json();
          alert(errorData.message || 'Failed to cancel ticket');
        }
      } catch (error) {
        console.error('Error cancelling ticket:', error);
        alert('An error occurred while cancelling the ticket');
      }
    }
  };

  // Handle leave feedback
  const handleLeaveFeedback = (eventId) => {
    setFeedbackEventId(eventId);
    setShowFeedback(true);
  };

  // Handle feedback submission
  const handleSubmitFeedback = async (feedbackData) => {
    try {
      // The new FeedbackCard handles submission internally via FeedbackService
      // This is called when feedback is successfully submitted
      setShowFeedback(false);
      
      // Refresh the user's events to update feedback status
      await fetchEvents();
      
      // Show success message
      console.log('Feedback submitted successfully:', feedbackData);
    } catch (error) {
      console.error('Error handling feedback submission:', error);
    }
  };

  // Handle profile update
  const handleUpdateProfile = async (profileData) => {
    try {
      console.log('Updating profile with data:', profileData);
      const response = await makeAuthenticatedRequest('/api/attendee/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Profile update response:', data);
        alert(data.message || 'Profile updated successfully!');
        
        // Refresh the profile data from backend
        await fetchUserProfile();
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('An error occurred while updating your profile');
    }
  };

  return (
    <div className="attendee-dashboard">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
    try {
      const response = await makeAuthenticatedRequest(`/api/attendee/notifications/${notificationId}/read`, {
        method: 'POST'
      });

      if (response.ok) {
        console.log(`Marked notification ${notificationId} as read`);
        // Update local state
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId ? { ...notif, read: true } : notif
          )
        );
        // Update stats
        setNotificationStats(prev => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1)
        }));
      } else {
        console.error('Failed to mark notification as read');
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/attendee/notifications/mark-all-read', {
        method: 'POST'
      });

      if (response.ok) {
        console.log('Marked all notifications as read');
        // Update local state
        setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
        // Update stats
        setNotificationStats(prev => ({
          ...prev,
          unread: 0
        }));
      } else {
        console.error('Failed to mark all notifications as read');
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      const response = await makeAuthenticatedRequest(`/api/attendee/notifications/${notificationId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        console.log(`Deleted notification ${notificationId}`);
        // Update local state
        const wasUnread = notifications.find(n => n.id === notificationId)?.read === false;
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
        // Update stats
        setNotificationStats(prev => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
          unread: wasUnread ? Math.max(0, prev.unread - 1) : prev.unread
        }));
      } else {
        console.error('Failed to delete notification');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="detailContainer">
        <Header/>
        <div className="loading-container" style={{
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '50vh',
          fontSize: '1.2rem'
        }}>
          <i className="fas fa-spinner fa-spin" style={{marginRight: '10px'}}></i>
          Loading dashboard...
        </div>
        <Footer/>
      </div>
    );
  }

  return (
    <div className="detailContainer">
      <Header/>
      
      <div className="attendee-dashboard">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Attendee Dashboard</h1>
          <p className="dashboard-subtitle">
            Welcome back, {userProfile?.first_name || 'Guest'}! Manage your events, tickets, and profile.
          </p>
        </div>
        
        <div className="dashboard-tabs">
          <div 
            className={`dashboard-tab ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            Events
          </div>
          <div 
            className={`dashboard-tab ${activeTab === 'tickets' ? 'active' : ''}`}
            onClick={() => setActiveTab('tickets')}
          >
            My Tickets
          </div>
          <div 
            className={`dashboard-tab ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            Notifications
            {notificationStats.unread > 0 && (
              <span style={{
                background: '#e74c3c',
                color: 'white',
                borderRadius: '50%',
                padding: '2px 6px',
                fontSize: '0.7rem',
                marginLeft: '5px'
              }}>
                {notificationStats.unread}
              </span>
            )}
          </div>
          <div 
            className={`dashboard-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            My Profile
          </div>
        </div>
        
        {/* Conditional rendering based on active tab */}
        {activeTab === 'events' && !showTicketPurchase && !showFeedback && (
          <div className="dashboard-section">
            <div className="section-header">
              <h2 className="section-title">Available Events</h2>
              <div className="search-filters">
                <div className="search-bar">
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button onClick={fetchEvents}>
                    <i className="fas fa-search"></i>
                  </button>
                </div>
                <div className="category-filter">
                  <select 
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    <option value="Conference">Conference</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Seminar">Seminar</option>
                    <option value="Networking">Networking</option>
                    <option value="Concert">Concert</option>
                    <option value="Festival">Festival</option>
                    <option value="Exhibition">Exhibition</option>
                    <option value="Sports">Sports</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="dashboard-content">
              {loading ? (
                <div className="loading-spinner">Loading events...</div>
              ) : events?.length > 0 ? (
                events.map(event => (
                  <EventCard 
                    key={event.event_id}
                    event={event}
                    onRegister={() => handleRegisterClick(event)}
                    onViewDetails={() => navigate(`/event/${event.event_id}`)}
                  />
                ))
              ) : (
                <div className="empty-state">
                  <i className="fas fa-calendar-times"></i>
                  <h3>No events available</h3>
                  <p>Check back soon for upcoming events</p>
                </div>
              )}
              
              {/* Add pagination controls */}
              {events?.length > 0 && pagination.totalPages > 1 && (
                <div className="pagination-controls">
                  <button 
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </button>
                  <div className="page-info">
                    Page {pagination.page} of {pagination.totalPages}
                  </div>
                  <button 
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'events' && showTicketPurchase && (
          <TicketPurchaseCard 
            event={selectedEvent}
            ticketTypes={ticketTypes}
            loading={loadingTickets}
            onPurchase={handlePurchaseTicket}
            onCancel={() => setShowTicketPurchase(false)}
          />
        )}
        
        {activeTab === 'events' && showFeedback && (
          <FeedbackCard 
            event={events.find(e => e.event_id === feedbackEventId) || { event_id: feedbackEventId, event_name: 'Event' }}
            onFeedbackSubmitted={handleSubmitFeedback}
          />
        )}
        
        {activeTab === 'tickets' && (
          <MyTicketsCard 
            tickets={myTickets}
            onViewQRCode={handleViewQRCode}
            onDownloadTicket={handleDownloadTicket}
            onCancelTicket={handleCancelTicket}
            onLeaveFeedback={handleLeaveFeedback}
          />
        )}
        
        {activeTab === 'notifications' && (
          <NotificationsCard />
        )}
        
        {activeTab === 'profile' && (
          <ProfileCard 
            profile={userProfile}
            onUpdateProfile={handleUpdateProfile}
          />
        )}
      </div>
      
      <Footer/>
    </div>
  );
}

export default Attendee;
