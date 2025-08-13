import React, { useState } from "react";
import "./css/Eventdetails.css";
import Header from "../component/header";
import Footer from "../component/footer";

function Attendee() {
  const [activeTab, setActiveTab] = useState('schedule');
  const [activeDay, setActiveDay] = useState(1);
  const [agendaItems, setAgendaItems] = useState([]);
  const [notification, setNotification] = useState(null);

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

  const sessions = [
    {
      id: 1,
      time: '9:00 AM',
      duration: '60 min',
      title: 'The Future of Artificial Intelligence',
      location: 'Grand Ballroom A',
      description: 'Explore the latest advancements in AI and machine learning, and how they will transform industries in the coming decade.',
      added: false
    },
    {
      id: 2,
      time: '10:30 AM',
      duration: '45 min',
      title: 'Building Scalable Cloud Infrastructure',
      location: 'Room 203',
      description: 'Best practices for designing and implementing cloud solutions that can scale with your business needs.',
      added: false
    },
    {
      id: 3,
      time: '11:30 AM',
      duration: '90 min',
      title: 'Workshop: Modern Web Development',
      location: 'Workshop Room B',
      description: 'Hands-on session covering the latest tools and frameworks for building responsive, accessible web applications.',
      added: false
    },
    {
      id: 4,
      time: '1:30 PM',
      duration: '60 min',
      title: 'Lunch & Networking',
      location: 'Main Dining Hall',
      description: 'Enjoy lunch while connecting with fellow attendees and industry professionals.',
      added: false
    }
  ];

  const speakers = [
    { id: 1, initials: 'JD', name: 'Jennifer Davis', title: 'AI Research Lead, TechFuture' },
    { id: 2, initials: 'MR', name: 'Michael Rodriguez', title: 'CTO, CloudScale Inc.' },
    { id: 3, initials: 'SP', name: 'Sarah Peterson', title: 'Senior Developer, WebInnovate' }
  ];

  const resources = [
    { id: 1, icon: 'map', title: 'Venue Map', details: 'PDF • 2.4 MB' },
    { id: 2, icon: 'file-pdf', title: 'Full Schedule', details: 'PDF • 1.1 MB' },
    { id: 3, icon: 'users', title: 'Speaker Bios', details: 'PDF • 3.2 MB' },
    { id: 4, icon: 'wifi', title: 'Wi-Fi Access', details: 'Network: TechForward-Guest' }
  ];

  const handleAddToAgenda = (session) => {
    if (session.added) {
      setAgendaItems(agendaItems.filter(item => item.id !== session.id));
      session.added = false;
      setNotification({ message: `"${session.title}" removed from agenda`, type: 'info' });
    } else {
      setAgendaItems([...agendaItems, session]);
      session.added = true;
      setNotification({ message: `"${session.title}" added to agenda`, type: 'success' });
    }
    
    setTimeout(() => setNotification(null), 3000);
  };

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
                  <button className="btn btn-outline">
                    <i className="fas fa-user-plus"></i> Connect
                  </button>
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
                  <button className="btn btn-outline">
                    <i className="fas fa-download"></i> Download
                  </button>
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
                <button className="btn btn-primary">
                  <i className="fas fa-user-friends"></i> Browse Attendees
                </button>
              </div>
              
              <div className="networking-card">
                <h3>Discussion Groups</h3>
                <p>Join topic-based groups to continue conversations after sessions</p>
                <button className="btn btn-primary">
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
          <span style={{fontWeight: '600', fontSize: '1.1rem'}}>Attendee: Sarah Johnson</span>
        </div>
      </div>
      <div className="eventdetail">
        <header>
          <div className="container">
            <div className="header-content">
              <div className="event-title">
                <h1>TechForward Conference 2023</h1>
                <p>Shaping the future of technology together</p>
                <div className="event-meta">
                  <div className="meta-item">
                    <i className="fas fa-calendar"></i>
                    <span>October 15-17, 2023</span>
                  </div>
                  <div className="meta-item">
                    <i className="fas fa-map-marker-alt"></i>
                    <span>NATIONAL THEATRE</span>
                  </div>
                </div>
              </div>
              <div className="event-status">
                <div className="status-badge">
                  <span className="badge">Active</span>
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
                  <h4><i className="fas fa-clock"></i> Starting in 45 minutes</h4>
                  <p><strong>The Future of Artificial Intelligence</strong></p>
                  <p>9:00 AM - Grand Ballroom A</p>
                  <button className="btn btn-primary" style={{ marginTop: '15px', width: '100%' }}>
                    <i className="fas fa-calendar-plus"></i> Add Reminder
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
