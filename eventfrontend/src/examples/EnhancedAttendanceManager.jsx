// Integration Example: AttendanceVerification with Attendee Listing
// This shows how to use the updated AttendanceVerification component

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AttendanceVerification from './AttendanceVerification';
import AttendeeListingService from '../../services/attendeeListingService';
import AuthTokenService from '../../services/AuthTokenService';
import { API_BASE_URL } from '../config/api';
import formatters from '../../utils/formatters';

const EnhancedAttendanceManager = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState('attendance'); // 'attendance' or 'listing'

  // eslint-disable-next-line no-unused-vars
  const attendeeService = useMemo(() => new AttendeeListingService(), []);

  const loadOrganizerEvents = useCallback(async () => {
    try {
      setLoading(true);
      const token = AuthTokenService.getToken();
      
      // Load organizer's events
      const response = await fetch(`${API_BASE_URL}/api/events/my-events`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrganizerEvents();
  }, [loadOrganizerEvents]);

  return (
    <div className="enhanced-attendance-manager">
      <div className="manager-header">
        <h2>Event Attendance Management</h2>
        <div className="view-toggles">
          <button
            className={selectedView === 'attendance' ? 'active' : ''}
            onClick={() => setSelectedView('attendance')}
          >
            <i className="fas fa-qrcode"></i>
            Attendance Verification
          </button>
          <button
            className={selectedView === 'listing' ? 'active' : ''}
            onClick={() => setSelectedView('listing')}
          >
            <i className="fas fa-list"></i>
            Attendee Listing
          </button>
        </div>
      </div>

      {selectedView === 'attendance' && (
        <AttendanceVerification 
          events={events}
          isLoading={loading}
        />
      )}

      {selectedView === 'listing' && (
        <div className="attendee-listing-view">
          <h3>Comprehensive Attendee Listings</h3>
          <p>Select an event below to view detailed attendee information:</p>
          
          {events.map(event => (
            <div key={event.event_id} className="event-listing-card">
              <h4>{event.event_name}</h4>
              <p>Date: {new Date(event.event_date).toLocaleDateString()}</p>
              <p>Venue: {event.venue_name}</p>
              
              <EventAttendeeDetails eventId={event.event_id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Component to show attendee details for a specific event
const EventAttendeeDetails = ({ eventId }) => {
  const [attendees, setAttendees] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const attendeeService = useMemo(() => new AttendeeListingService(), []);

  const loadEventData = useCallback(async () => {
    if (!expanded) return;
    
    try {
      setLoading(true);
      
      // Load attendees and stats in parallel
      const [attendeeData, statsData] = await Promise.all([
        attendeeService.getEventAttendees(eventId),
        attendeeService.getEventStats(eventId)
      ]);

      if (attendeeData.success) {
        setAttendees(attendeeData.attendees);
      }

      if (statsData.success) {
        setStats(statsData.statistics);
      }
    } catch (error) {
      console.error('Error loading event data:', error);
    } finally {
      setLoading(false);
    }
  }, [expanded, eventId, attendeeService]);

  useEffect(() => {
    loadEventData();
  }, [loadEventData]);

  return (
    <div className="event-attendee-details">
      <button
        className="expand-toggle"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? 'Hide Details' : 'Show Attendee Details'}
        <i className={`fas fa-chevron-${expanded ? 'up' : 'down'}`}></i>
      </button>

      {expanded && (
        <div className="attendee-details-content">
          {loading ? (
            <div className="loading">Loading attendee data...</div>
          ) : (
            <>
              {/* Statistics Summary */}
              {stats && (
                <div className="stats-summary">
                  <div className="stat-card">
                    <h4>Registrations</h4>
                    <p>Total: {stats.registrations.total}</p>
                    <p>Checked In: {stats.registrations.checked_in}</p>
                    <p>Paid: {stats.registrations.paid}</p>
                  </div>
                  <div className="stat-card">
                    <h4>Revenue</h4>
                    <p>Total: ${formatters.formatCurrency(stats.revenue.total)}</p>
                    <p>Collected: ${formatters.formatCurrency(stats.revenue.collected)}</p>
                  </div>
                  <div className="stat-card">
                    <h4>Capacity</h4>
                    <p>Current: {stats.capacity.current_registrations}</p>
                    <p>Max: {stats.capacity.max_attendees || 'Unlimited'}</p>
                  </div>
                </div>
              )}

              {/* Attendee List */}
              <div className="attendee-list">
                <h4>Attendees ({attendees.length})</h4>
                {attendees.map(attendee => (
                  <div key={attendee.registration_id} className="attendee-item">
                    <div className="attendee-basic">
                      <strong>{attendee.attendee_name}</strong>
                      <span className={`status ${attendee.attendance_status}`}>
                        {attendee.attendance_status === 'checked_in' ? 'Checked In' : 'Registered'}
                      </span>
                    </div>
                    <div className="attendee-meta">
                      <span>{attendee.attendee_email}</span>
                      <span>Payment: {attendee.payment_status}</span>
                      <span>${formatters.formatCurrency(attendee.total_amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedAttendanceManager;
