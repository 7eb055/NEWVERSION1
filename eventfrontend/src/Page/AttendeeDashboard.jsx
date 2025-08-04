import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from 'react-router-dom';
import "./css/Eventdetails.css";
import Header from "../component/header";
import Footer from "../component/footer";

function Attendee() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('schedule');
  const [activeDay, setActiveDay] = useState(1);
  const [agendaItems, setAgendaItems] = useState([]);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [resources, setResources] = useState([]);
  const [attendeeData, setAttendeeData] = useState(null);
  const [networkingData, setNetworkingData] = useState([]);

  // Get event ID from URL params or use default for demo
  const eventId = new URLSearchParams(window.location.search).get('eventId') || '1';

  // Helper function to get auth token
  const getAuthToken = () => {
    return localStorage.getItem('token');
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

  // Fetch event details
  const fetchEventDetails = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/events/${eventId}/details`);
      if (response.ok) {
        const data = await response.json();
        setEventData(data);
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
    }
  }, [eventId]);

  // Fetch attendee dashboard data
  const fetchAttendeeData = useCallback(async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/attendee/dashboard');
      if (response.ok) {
        const data = await response.json();
        setAttendeeData(data);
      }
    } catch (error) {
      console.error('Error fetching attendee data:', error);
    }
  }, []);

  // Fetch event sessions
  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/events/${eventId}/sessions?day=${activeDay}`);
      if (response.ok) {
        const data = await response.json();
        // Check which sessions are in user's agenda
        const agendaResponse = await makeAuthenticatedRequest(`/api/events/${eventId}/my-agenda`);
        let agendaSessionIds = [];
        if (agendaResponse.ok) {
          const agendaData = await agendaResponse.json();
          agendaSessionIds = agendaData.map(item => item.id);
          setAgendaItems(agendaData);
        }
        
        // Mark sessions as added if they're in agenda
        const sessionsWithAgenda = data.map(session => ({
          ...session,
          added: agendaSessionIds.includes(session.id)
        }));
        setSessions(sessionsWithAgenda);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  }, [eventId, activeDay]);

  // Fetch speakers
  const fetchSpeakers = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/events/${eventId}/speakers`);
      if (response.ok) {
        const data = await response.json();
        setSpeakers(data);
      }
    } catch (error) {
      console.error('Error fetching speakers:', error);
    }
  }, [eventId]);

  // Fetch resources
  const fetchResources = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/events/${eventId}/resources`);
      if (response.ok) {
        const data = await response.json();
        setResources(data);
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  }, [eventId]);

  // Fetch networking data
  const fetchNetworkingData = useCallback(async () => {
    try {
      const response = await makeAuthenticatedRequest(`/api/events/${eventId}/networking`);
      if (response.ok) {
        const data = await response.json();
        setNetworkingData(data);
      }
    } catch (error) {
      console.error('Error fetching networking data:', error);
    }
  }, [eventId]);

  // Load all data on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchEventDetails(),
        fetchAttendeeData(),
        fetchSessions(),
        fetchSpeakers(),
        fetchResources(),
        fetchNetworkingData()
      ]);
      setLoading(false);
    };

    loadData();
  }, [eventId, fetchEventDetails, fetchAttendeeData, fetchSessions, fetchSpeakers, fetchResources, fetchNetworkingData]);

  // Reload sessions when day changes
  useEffect(() => {
    if (!loading) {
      fetchSessions();
    }
  }, [activeDay, loading, fetchSessions]);

  const tabs = [
    { id: 'schedule', label: 'Schedule' },
    { id: 'agenda', label: 'My Agenda' },
    { id: 'speakers', label: 'Speakers' },
    { id: 'resources', label: 'Resources' },
    { id: 'networking', label: 'Networking' }
  ];

  const days = [
    { id: 1, name: 'Day 1 - Oct 15' },
    { id: 2, name: 'Day 2 - Oct 16' },
    { id: 3, name: 'Day 3 - Oct 17' }
  ];

  // Handle adding/removing sessions from agenda
  const handleAddToAgenda = async (session) => {
    try {
      if (session.added) {
        // Remove from agenda
        const response = await makeAuthenticatedRequest(`/api/events/${eventId}/agenda/${session.id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          const data = await response.json();
          // Update local state
          setAgendaItems(agendaItems.filter(item => item.id !== session.id));
          setSessions(sessions.map(s => 
            s.id === session.id ? { ...s, added: false } : s
          ));
          setNotification({ message: data.message, type: 'info' });
        }
      } else {
        // Add to agenda
        const response = await makeAuthenticatedRequest(`/api/events/${eventId}/agenda/add`, {
          method: 'POST',
          body: JSON.stringify({ sessionId: session.id })
        });
        
        if (response.ok) {
          const data = await response.json();
          // Update local state
          setAgendaItems([...agendaItems, { ...session, added: true }]);
          setSessions(sessions.map(s => 
            s.id === session.id ? { ...s, added: true } : s
          ));
          setNotification({ message: data.message, type: 'success' });
        }
      }
    } catch (error) {
      console.error('Error updating agenda:', error);
      setNotification({ message: 'Error updating agenda. Please try again.', type: 'error' });
    }
    
    setTimeout(() => setNotification(null), 3000);
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
          Loading event data...
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'agenda':
        return (
          <div className="schedule-section">
            <div className="section-header">
              <h2 className="section-title">My Agenda</h2>
            </div>
            
            {agendaItems.length === 0 ? (
              <div className="empty-agenda">
                <div className="empty-icon">
                  <i className="fas fa-calendar-plus"></i>
                </div>
                <h3>Your agenda is empty</h3>
                <p>Add sessions you're interested in to build your personal agenda</p>
              </div>
            ) : (
              <div className="schedule-list">
                {agendaItems.map(session => (
                  <SessionItem 
                    key={session.id} 
                    session={session} 
                    onAddToAgenda={handleAddToAgenda} 
                  />
                ))}
              </div>
            )}
          </div>
        );
      case 'speakers':
        return (
          <div className="speakers-section">
            <div className="section-header">
              <h2 className="section-title">Featured Speakers</h2>
            </div>
            
            <div className="speakers-grid">
              {speakers.map(speaker => (
                <div className="speaker-card" key={speaker.id}>
                  <div className="speaker-avatar">{speaker.initials}</div>
                  <h3>{speaker.name}</h3>
                  <p>{speaker.title}</p>
                  <div className="speaker-actions">
                    <button 
                      className="btn btn-outline"
                      onClick={() => navigate(`/speaker/${speaker.id}`)}
                    >
                      <i className="fas fa-user"></i> View Profile
                    </button>
                    <button 
                      className="btn btn-outline"
                      onClick={() => {
                        setNotification({
                          message: 'Connect request sent to speaker',
                          type: 'success'
                        });
                        setTimeout(() => setNotification(null), 3000);
                      }}
                    >
                      <i className="fas fa-user-plus"></i> Connect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'resources':
        return (
          <div className="resources-section">
            <div className="section-header">
              <h2 className="section-title">Event Resources</h2>
            </div>
            
            <div className="resources-grid">
              {resources.map(resource => (
                <div className="resource-card" key={resource.id}>
                  <div className="resource-icon">
                    <i className={`fas fa-${resource.icon}`}></i>
                  </div>
                  <h3>{resource.title}</h3>
                  <p>{resource.details}</p>
                  <div className="resource-actions">
                    <button 
                      className="btn btn-primary"
                      onClick={() => {
                        setNotification({
                          message: `Downloading ${resource.title}...`,
                          type: 'info'
                        });
                        setTimeout(() => {
                          setNotification({
                            message: `${resource.title} downloaded successfully!`,
                            type: 'success'
                          });
                          setTimeout(() => setNotification(null), 3000);
                        }, 2000);
                      }}
                    >
                      <i className="fas fa-download"></i> Download
                    </button>
                    <button 
                      className="btn btn-outline"
                      onClick={() => navigate(`/resource/${resource.id}`)}
                    >
                      <i className="fas fa-info-circle"></i> Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'networking':
        return (
          <div className="networking-section">
            <div className="section-header">
              <h2 className="section-title">Networking Hub</h2>
            </div>
            
            <div className="networking-content">
              <div className="networking-card">
                <h3>Connect with Attendees</h3>
                <p>Browse the attendee directory and connect with other participants</p>
                {networkingData.length > 0 && (
                  <div className="attendee-list" style={{marginTop: '15px', marginBottom: '15px'}}>
                    <h4>Other Attendees ({networkingData.length})</h4>
                    <div className="attendee-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', maxHeight: '200px', overflowY: 'auto'}}>
                      {networkingData.slice(0, 6).map(attendee => (
                        <div 
                          key={attendee.attendee_id} 
                          className="attendee-card" 
                          style={{
                            padding: '10px', 
                            border: '1px solid #e0e0e0', 
                            borderRadius: '8px',
                            textAlign: 'center',
                            cursor: 'pointer'
                          }}
                          onClick={() => navigate(`/attendee/${attendee.attendee_id}/profile`)}
                        >
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: '#4a6cf7',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 8px',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}>
                            {attendee.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                          <div style={{fontSize: '14px', fontWeight: '600'}}>{attendee.full_name}</div>
                          {attendee.company && (
                            <div style={{fontSize: '12px', color: '#666'}}>{attendee.company}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate(`/events/${eventId}/attendees`)}
                >
                  <i className="fas fa-user-friends"></i> Browse All Attendees
                </button>
              </div>
              
              <div className="networking-card">
                <h3>Discussion Groups</h3>
                <p>Join topic-based groups to continue conversations after sessions</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate(`/events/${eventId}/groups`)}
                >
                  <i className="fas fa-comments"></i> View Groups
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="schedule-section">
            <div className="section-header">
              <h2 className="section-title">Event Schedule</h2>
              <div>
                <button className="btn btn-outline">
                  <i className="fas fa-download"></i> Export Schedule
                </button>
              </div>
            </div>
            
            <div className="day-selector">
              {days.map(day => (
                <button
                  key={day.id}
                  className={`day-btn ${activeDay === day.id ? 'active' : ''}`}
                  onClick={() => setActiveDay(day.id)}
                >
                  {day.name}
                </button>
              ))}
            </div>
            
            <div className="schedule-list">
              {sessions.map(session => (
                <SessionItem 
                  key={session.id} 
                  session={session} 
                  onAddToAgenda={handleAddToAgenda} 
                />
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="detailContainer">
      <Header/>
      {/* Attendee header below main header */}
      <div className="attendee-header" style={{marginTop: '20px', marginBottom: '20px', background: '#f8f9ff', borderRadius: '10px', padding: '15px 25px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <i className="fas fa-user-friends" style={{fontSize: '1.5rem', color: '#4a6cf7'}}></i>
          <span style={{fontWeight: '600', fontSize: '1.1rem'}}>
            Attendee: {attendeeData?.attendee?.name || 'Loading...'}
          </span>
        </div>
      </div>
      <div className="eventdetail">
        <header>
          <div className="container">
            <div className="header-content">
              <div className="event-title">
                <h1>{eventData?.event_name || 'Loading Event...'}</h1>
                <p>{eventData?.event_name ? 'Shaping the future of technology together' : 'Loading event details...'}</p>
                <div className="event-meta">
                  <div className="meta-item">
                    <i className="fas fa-calendar"></i>
                    <span>{eventData?.event_date ? new Date(eventData.event_date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 'Loading date...'}</span>
                  </div>
                  <div className="meta-item">
                    <i className="fas fa-map-marker-alt"></i>
                    <span>NATIONAL THEATRE</span>
                  </div>
                  <div className="meta-item">
                    <i className="fas fa-users"></i>
                    <span>{eventData?.registration_count || 0} registered</span>
                  </div>
                </div>
              </div>
              <div className="event-status">
                <div className="status-badge">
                  <span className="badge">{eventData?.status || 'Loading...'}</span>
                </div>
              </div>
            </div>
          </div>
        </header>
        <div className="container">
          {notification && (
            <div className={`notification ${notification.type}`}>
              {notification.message}
              <button onClick={() => setNotification(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}
      
          <div className="nav-tabs">
            {tabs.map(tab => (
              <div
                key={tab.id}
                className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </div>
            ))}
          </div>
      
          <div className="content-grid">
            {renderContent()}
      
            <div className="sidebar">
              <div className="card">
                <h3 className="card-header">
                  <i className="fas fa-microphone"></i> Featured Speakers
                </h3>
                <div className="speaker-list">
                  {speakers.slice(0, 3).map(speaker => (
                    <div className="speaker" key={speaker.id}>
                      <div className="speaker-avatar">{speaker.initials}</div>
                      <div className="speaker-info">
                        <h4>{speaker.name}</h4>
                        <p>{speaker.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
      
              <div className="card">
                <h3 className="card-header">
                  <i className="fas fa-folder-open"></i> Event Resources
                </h3>
                <div className="resources-list">
                  {resources.slice(0, 3).map(resource => (
                    <div className="resource" key={resource.id}>
                      <div className="resource-icon">
                        <i className={`fas fa-${resource.icon}`}></i>
                      </div>
                      <div className="resource-info">
                        <h4>{resource.title}</h4>
                        <p>{resource.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
      
              <div className="card">
                <h3 className="card-header">
                  <i className="fas fa-bell"></i> Next Session
                </h3>
                <div className="upcoming-session">
                  {attendeeData?.upcomingSessions && attendeeData.upcomingSessions.length > 0 ? (
                    <>
                      <h4><i className="fas fa-clock"></i> Coming up next</h4>
                      <p><strong>{attendeeData.upcomingSessions[0].title}</strong></p>
                      <p>{attendeeData.upcomingSessions[0].start_time} - {attendeeData.upcomingSessions[0].location}</p>
                      <p style={{fontSize: '0.9rem', color: '#666'}}>
                        Event: {attendeeData.upcomingSessions[0].event_name}
                      </p>
                    </>
                  ) : (
                    <>
                      <h4><i className="fas fa-clock"></i> No upcoming sessions</h4>
                      <p>Add sessions to your agenda to see what's coming up next</p>
                    </>
                  )}
                  <button 
                    className="btn btn-primary" 
                    style={{ marginTop: '15px', width: '100%' }}
                    onClick={() => {
                      setActiveTab('agenda');
                      // Scroll to agenda section
                      document.querySelector('.content-grid').scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <i className="fas fa-calendar-plus"></i> View Full Agenda
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      
        <Footer/>
      </div>
    </div>
  );
}

// Session Item Component
function SessionItem({ session, onAddToAgenda }) {
  return (
    <div className="schedule-item">
      <div className="time-block">
        <div className="time">{session.time}</div>
        <div className="duration">{session.duration}</div>
      </div>
      <div className="session-info">
        <h3 className="session-title">{session.title}</h3>
        <div className="session-location">
          <i className="fas fa-map-marker-alt"></i>
          <span>{session.location}</span>
        </div>
        <p className="session-description">{session.description}</p>
        <div className="session-actions">
          <button 
            className={`btn ${session.added ? 'btn-added' : 'btn-primary'}`}
            onClick={() => onAddToAgenda(session)}
          >
            <i className={session.added ? "fas fa-check" : "fas fa-plus"}></i> 
            {session.added ? 'Added to Agenda' : 'Add to My Agenda'}
          </button>
          <button className="btn btn-outline">
            <i className="fas fa-info-circle"></i> Details
          </button>
        </div>
      </div>
     
    </div>

  );
}

export default Attendee;