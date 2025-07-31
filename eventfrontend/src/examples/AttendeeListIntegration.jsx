// Example: How to integrate AttendeeList into your existing pages

import React from 'react';
import AttendeeList from '../component/AttendeeList';

// Example 1: Event Organizer Dashboard
// Shows attendees for a specific event
const EventOrganizerDashboard = ({ eventId }) => {
  return (
    <div className="dashboard">
      <h1>Event Dashboard</h1>
      
      {/* Other dashboard components */}
      <div className="dashboard-section">
        <h2>Event Overview</h2>
        {/* Event details components */}
      </div>
      
      {/* Attendee Listing Section */}
      <div className="dashboard-section">
        <h2>Event Attendees</h2>
        <AttendeeList 
          eventId={eventId} 
          viewType="event" 
        />
      </div>
    </div>
  );
};

// Example 2: Organizer Profile Page
// Shows attendees across all events for an organizer
const OrganizerProfilePage = ({ organizerId }) => {
  return (
    <div className="profile-page">
      <h1>Organizer Profile</h1>
      
      {/* Organizer details */}
      <div className="profile-section">
        <h2>Organization Details</h2>
        {/* Organizer info components */}
      </div>
      
      {/* All Attendees for this Organizer */}
      <div className="profile-section">
        <h2>All Event Attendees</h2>
        <AttendeeList 
          organizerId={organizerId} 
          viewType="organizer" 
        />
      </div>
    </div>
  );
};

// Example 3: Event Management Page with Tabs
const EventManagementPage = ({ eventId }) => {
  const [activeTab, setActiveTab] = React.useState('overview');
  
  return (
    <div className="event-management">
      <h1>Event Management</h1>
      
      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'attendees' ? 'active' : ''}
          onClick={() => setActiveTab('attendees')}
        >
          Attendees
        </button>
        <button 
          className={activeTab === 'registration' ? 'active' : ''}
          onClick={() => setActiveTab('registration')}
        >
          Registration
        </button>
      </div>
      
      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div>
            <h2>Event Overview</h2>
            {/* Event overview content */}
          </div>
        )}
        
        {activeTab === 'attendees' && (
          <div>
            <AttendeeList 
              eventId={eventId} 
              viewType="event" 
            />
          </div>
        )}
        
        {activeTab === 'registration' && (
          <div>
            <h2>Registration Management</h2>
            {/* Registration management content */}
          </div>
        )}
      </div>
    </div>
  );
};

// Example 4: Standalone Attendee Report Page
const AttendeeReportPage = () => {
  const [reportType, setReportType] = React.useState('event');
  const [selectedEventId, setSelectedEventId] = React.useState(null);
  const [selectedOrganizerId, setSelectedOrganizerId] = React.useState(null);
  
  return (
    <div className="report-page">
      <h1>Attendee Reports</h1>
      
      {/* Report Type Selector */}
      <div className="report-controls">
        <label>
          <input
            type="radio"
            value="event"
            checked={reportType === 'event'}
            onChange={(e) => setReportType(e.target.value)}
          />
          Event Report
        </label>
        <label>
          <input
            type="radio"
            value="organizer"
            checked={reportType === 'organizer'}
            onChange={(e) => setReportType(e.target.value)}
          />
          Organizer Report
        </label>
      </div>
      
      {/* Event/Organizer Selector */}
      {reportType === 'event' && (
        <div className="selector">
          <label>Select Event:</label>
          <select 
            value={selectedEventId || ''} 
            onChange={(e) => setSelectedEventId(e.target.value)}
          >
            <option value="">Choose an event...</option>
            {/* Populate with events */}
          </select>
        </div>
      )}
      
      {reportType === 'organizer' && (
        <div className="selector">
          <label>Select Organizer:</label>
          <select 
            value={selectedOrganizerId || ''} 
            onChange={(e) => setSelectedOrganizerId(e.target.value)}
          >
            <option value="">Choose an organizer...</option>
            {/* Populate with organizers */}
          </select>
        </div>
      )}
      
      {/* Attendee List */}
      {((reportType === 'event' && selectedEventId) || 
        (reportType === 'organizer' && selectedOrganizerId)) && (
        <div className="report-content">
          <AttendeeList 
            eventId={reportType === 'event' ? selectedEventId : undefined}
            organizerId={reportType === 'organizer' ? selectedOrganizerId : undefined}
            viewType={reportType} 
          />
        </div>
      )}
    </div>
  );
};

// Example 5: Integration with React Router
import { BrowserRouter as Router, Route, Routes, useParams } from 'react-router-dom';

const EventAttendeesRoute = () => {
  const { eventId } = useParams();
  return <AttendeeList eventId={parseInt(eventId)} viewType="event" />;
};

const OrganizerAttendeesRoute = () => {
  const { organizerId } = useParams();
  return <AttendeeList organizerId={parseInt(organizerId)} viewType="organizer" />;
};

const AppWithRoutes = () => {
  return (
    <Router>
      <Routes>
        {/* Other routes */}
        <Route path="/events/:eventId/attendees" element={<EventAttendeesRoute />} />
        <Route path="/organizers/:organizerId/attendees" element={<OrganizerAttendeesRoute />} />
        {/* More routes */}
      </Routes>
    </Router>
  );
};

export {
  EventOrganizerDashboard,
  OrganizerProfilePage,
  EventManagementPage,
  AttendeeReportPage,
  AppWithRoutes
};
