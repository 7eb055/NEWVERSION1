import React from 'react';
import { useDashboardState } from './hooks/useDashboardState';
import './css/ActionButtonsComponent.css';

const ActionButtonsComponent = () => {
  const {
    setShowCreateForm,
    setShowCompanyForm,
    setShowCompanyManagement,
    setShowPeopleForm,
    setShowRegistrationForm,
    setShowTicketingForm,
    setShowAttendanceForm,
    resetFormData
  } = useDashboardState();

  // Handle create new event
  const handleCreateEvent = () => {
    resetFormData();
    setShowCreateForm(true);
  };

  // Handle company management
  const handleCompanyManagement = () => {
    setShowCompanyManagement(true);
  };

  // Handle create company
  const handleCreateCompany = () => {
    setShowCompanyForm(true);
  };

  // Handle manage people
  const handleManagePeople = () => {
    setShowPeopleForm(true);
  };

  // Handle registration management
  const handleRegistrationManagement = () => {
    setShowRegistrationForm(true);
  };

  // Handle ticketing management
  const handleTicketingManagement = () => {
    setShowTicketingForm(true);
  };

  // Handle attendance management
  const handleAttendanceManagement = () => {
    setShowAttendanceForm(true);
  };

  return (
    <div className="action-buttons-component">
      <div className="section-header">
        <h2>Quick Actions</h2>
        <p className="actions-subtitle">Manage your events and organization</p>
      </div>

      <div className="actions-grid">
        {/* Primary Actions */}
        <div className="action-section">
          <h3 className="section-title">Event Management</h3>
          <div className="action-buttons-row">
            <button 
              className="action-btn primary create-event-btn"
              onClick={handleCreateEvent}
              title="Create a new event"
            >
              <span className="btn-icon">➕</span>
              <span className="btn-text">Create Event</span>
              <span className="btn-description">Start a new event</span>
            </button>

            <button 
              className="action-btn secondary registration-btn"
              onClick={handleRegistrationManagement}
              title="Manage event registrations"
            >
              <span className="btn-icon">📝</span>
              <span className="btn-text">Registrations</span>
              <span className="btn-description">View and manage</span>
            </button>

            <button 
              className="action-btn secondary ticketing-btn"
              onClick={handleTicketingManagement}
              title="Manage event ticketing"
            >
              <span className="btn-icon">🎫</span>
              <span className="btn-text">Ticketing</span>
              <span className="btn-description">Manage tickets</span>
            </button>
          </div>
        </div>

        {/* Organization Actions */}
        <div className="action-section">
          <h3 className="section-title">Organization</h3>
          <div className="action-buttons-row">
            <button 
              className="action-btn tertiary company-mgmt-btn"
              onClick={handleCompanyManagement}
              title="Manage company settings"
            >
              <span className="btn-icon">🏢</span>
              <span className="btn-text">Company</span>
              <span className="btn-description">Settings & info</span>
            </button>

            <button 
              className="action-btn tertiary create-company-btn"
              onClick={handleCreateCompany}
              title="Create a new company"
            >
              <span className="btn-icon">🏭</span>
              <span className="btn-text">New Company</span>
              <span className="btn-description">Add organization</span>
            </button>

            <button 
              className="action-btn tertiary people-btn"
              onClick={handleManagePeople}
              title="Manage team members"
            >
              <span className="btn-icon">👥</span>
              <span className="btn-text">People</span>
              <span className="btn-description">Team management</span>
            </button>
          </div>
        </div>

        {/* Analytics & Reports */}
        <div className="action-section">
          <h3 className="section-title">Analytics & Reports</h3>
          <div className="action-buttons-row">
            <button 
              className="action-btn info attendance-btn"
              onClick={handleAttendanceManagement}
              title="View attendance reports"
            >
              <span className="btn-icon">📊</span>
              <span className="btn-text">Attendance</span>
              <span className="btn-description">Reports & tracking</span>
            </button>

            <button 
              className="action-btn info sales-btn"
              onClick={() => {/* TODO: Add sales report handler */}}
              title="View sales reports"
            >
              <span className="btn-icon">💰</span>
              <span className="btn-text">Sales Report</span>
              <span className="btn-description">Revenue analytics</span>
            </button>

            <button 
              className="action-btn info feedback-btn"
              onClick={() => {/* TODO: Add feedback handler */}}
              title="View event feedback"
            >
              <span className="btn-icon">💬</span>
              <span className="btn-text">Feedback</span>
              <span className="btn-description">Event reviews</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="quick-tips">
        <h4>💡 Quick Tips</h4>
        <ul className="tips-list">
          <li>Create your first event to start tracking statistics and sales</li>
          <li>Set up your company profile for professional event branding</li>
          <li>Use attendance tracking to monitor event engagement</li>
          <li>Regular feedback review helps improve future events</li>
        </ul>
      </div>
    </div>
  );
};

export default ActionButtonsComponent;
