import React, { useState } from 'react';
import './OrganizerCards/css/OrganizerMasterTheme.css';
import './css/OrganizerDashboard.css';

// Import new modular components
import EventDataProvider from './OrganizerCards/EventDataProvider';
import DashboardStateProvider from './OrganizerCards/DashboardStateProvider';
import EventListComponent from './OrganizerCards/EventListComponent';
import DashboardStatsComponent from './OrganizerCards/DashboardStatsComponent';
import ActionButtonsComponent from './OrganizerCards/ActionButtonsComponent';

// Import legacy components (temporarily)
import {
  CreateEventForm,
  CompanyRegistration,
  CompanyManagement,
  PeopleRegistration,
  ManualEventRegistration,
  TicketingManagement,
  AttendanceVerification,
  Modal
} from './OrganizerCards';

// Import header and footer
import Header from '../component/header';
import Footer from '../component/footer';

const OrganizerDashboard = () => {
  // Minimal state for success/error messages (will be moved to provider later)
  const [success] = useState('');
  const [error] = useState('');
  
  // Temporary user info (will come from auth context later)
  const user = { username: 'Organizer' };

  return (
    <EventDataProvider>
      <DashboardStateProvider>
        {/* Global Header */}
        <Header />
        
        <div className="organizer-dashboard">
          {/* Dashboard Header */}
          <div className="dashboard-header">
            <div className="header-content">
              <h1 className="dashboard-title">
                <i className="fas fa-calendar-alt"></i>
                Organizer Dashboard
              </h1>
              <p className="dashboard-subtitle">
                Welcome back, {user?.username || 'Organizer'}! Manage your events and grow your community.
              </p>
            </div>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="message success-message">
              <i className="fas fa-check-circle"></i>
              {success}
            </div>
          )}

          {error && (
            <div className="message error-message">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          {/* Main Dashboard Content - New Modular Components */}
          <div className="dashboard-content">
            <div className="dashboard-main">
              {/* Quick Actions Section */}
              <ActionButtonsComponent />
              
              {/* Dashboard Statistics */}
              <DashboardStatsComponent />
              
              {/* Events List */}
              <EventListComponent />
            </div>
          </div>

          {/* TODO: Legacy Modal Components - Need to be refactored into modular components */}
          {/* These modals will be moved to their respective components later */}
          
        </div>

        {/* Global Footer */}
        <Footer />
      </DashboardStateProvider>
    </EventDataProvider>
  );
};

export default OrganizerDashboard;
