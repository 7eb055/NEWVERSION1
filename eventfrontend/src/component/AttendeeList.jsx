import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AttendeeListingService from '../services/attendeeListingService';
import formatters from '../utils/formatters';
import './css/AttendeeList.css';

const AttendeeList = ({ eventId, organizerId, viewType = 'event' }) => {
  const [attendees, setAttendees] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    attendance_status: '',
    payment_status: '',
    limit: 50,
    offset: 0
  });
  const [pagination, setPagination] = useState({});

  const attendeeService = useMemo(() => new AttendeeListingService(), []);

  const loadAttendees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let response;
      if (viewType === 'event' && eventId) {
        response = await attendeeService.getEventAttendees(eventId, filters);
      } else if (viewType === 'organizer' && organizerId) {
        response = await attendeeService.getOrganizerAttendees(organizerId, filters);
      }

      if (response && response.success) {
        setAttendees(response.attendees);
        setPagination(response.pagination || {});
      } else {
        setError('Failed to load attendees');
      }
    } catch (err) {
      setError(`Error loading attendees: ${err.message}`);
      console.error('Error loading attendees:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId, organizerId, viewType, filters, attendeeService]);

  const loadEventStats = useCallback(async () => {
    try {
      const response = await attendeeService.getEventStats(eventId);
      if (response && response.success) {
        setStats(response.statistics);
      }
    } catch (err) {
      console.error('Error loading event stats:', err);
    }
  }, [eventId, attendeeService]);

  useEffect(() => {
    loadAttendees();
    if (viewType === 'event' && eventId) {
      loadEventStats();
    }
  }, [loadAttendees, loadEventStats, viewType, eventId]);

  const handleFilterChange = (filterKey, value) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value,
      offset: 0 // Reset to first page when filters change
    }));
  };

  const handlePageChange = (newOffset) => {
    setFilters(prev => ({
      ...prev,
      offset: newOffset
    }));
  };

  const exportToCSV = () => {
    if (attendees.length === 0) return;

    const headers = [
      'Event Name',
      'Attendee Name',
      'Email',
      'Phone',
      'Registration Date',
      'Payment Status',
      'Check-in Status',
      'Total Amount'
    ];

    const csvContent = [
      headers.join(','),
      ...attendees.map(attendee => [
        `"${attendee.event_name || ''}"`,
        `"${attendee.attendee_name || ''}"`,
        `"${attendee.attendee_email || ''}"`,
        `"${attendee.attendee_phone || ''}"`,
        `"${new Date(attendee.registration_date).toLocaleDateString()}"`,
        `"${attendee.payment_status || ''}"`,
        `"${attendee.check_in_status ? 'Checked In' : 'Not Checked In'}"`,
        `"${attendee.total_amount || 0}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendees_${eventId || organizerId}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="attendee-list-loading">Loading attendees...</div>;
  }

  if (error) {
    return <div className="attendee-list-error">Error: {error}</div>;
  }

  return (
    <div className="attendee-list-container">
      {/* Statistics Section (for event view) */}
      {viewType === 'event' && stats && (
        <div className="attendee-stats">
          <h3>Event Statistics</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <h4>Registrations</h4>
              <p>Total: {stats.registrations.total}</p>
              <p>Paid: {stats.registrations.paid}</p>
              <p>Pending: {stats.registrations.pending}</p>
              <p>Checked In: {stats.registrations.checked_in}</p>
            </div>
            <div className="stat-card">
              <h4>Revenue</h4>
              <p>Total: {formatters.formatGhanaCurrency(stats.revenue.total)}</p>
              <p>Collected: {formatters.formatGhanaCurrency(stats.revenue.collected)}</p>
              <p>Pending: {formatters.formatGhanaCurrency(stats.revenue.pending)}</p>
            </div>
            <div className="stat-card">
              <h4>Capacity</h4>
              <p>Max: {stats.capacity.max_attendees || 'Unlimited'}</p>
              <p>Current: {stats.capacity.current_registrations}</p>
              {stats.capacity.percentage_filled && (
                <p>Filled: {stats.capacity.percentage_filled}%</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="attendee-filters">
        <h3>Filters</h3>
        <div className="filter-row">
          <select
            value={filters.attendance_status}
            onChange={(e) => handleFilterChange('attendance_status', e.target.value)}
          >
            <option value="">All Attendance Status</option>
            <option value="checked_in">Checked In</option>
            <option value="registered">Registered Only</option>
          </select>

          <select
            value={filters.payment_status}
            onChange={(e) => handleFilterChange('payment_status', e.target.value)}
          >
            <option value="">All Payment Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={filters.limit}
            onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
          >
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>

          <button onClick={exportToCSV} className="export-btn">
            Export CSV
          </button>
        </div>
      </div>

      {/* Attendees Table */}
      <div className="attendee-table-container">
        <h3>Attendees ({attendees.length})</h3>
        
        {attendees.length === 0 ? (
          <p>No attendees found with the current filters.</p>
        ) : (
          <table className="attendee-table">
            <thead>
              <tr>
                {viewType === 'organizer' && <th>Event</th>}
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Registration Date</th>
                <th>Payment Status</th>
                <th>Amount</th>
                <th>Check-in Status</th>
                <th>Check-in Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {attendees.map((attendee) => (
                <tr key={`${attendee.registration_id}`}>
                  {viewType === 'organizer' && (
                    <td>
                      <div className="event-info">
                        <strong>{attendee.event_name}</strong>
                        <br />
                        <small>{new Date(attendee.event_date).toLocaleDateString()}</small>
                      </div>
                    </td>
                  )}
                  <td>
                    <div className="attendee-info">
                      <strong>{attendee.attendee_name}</strong>
                      {attendee.special_requirements && (
                        <>
                          <br />
                          <small className="special-req">Special: {attendee.special_requirements}</small>
                        </>
                      )}
                    </div>
                  </td>
                  <td>{attendee.attendee_email}</td>
                  <td>{attendee.attendee_phone || 'N/A'}</td>
                  <td>{new Date(attendee.registration_date).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-badge ${attendee.payment_status}`}>
                      {attendee.payment_status}
                    </span>
                  </td>
                  <td>{formatters.formatGhanaCurrency(attendee.total_amount)}</td>
                  <td>
                    <span className={`status-badge ${attendee.check_in_status ? 'checked-in' : 'not-checked-in'}`}>
                      {attendee.check_in_status ? 'Checked In' : 'Not Checked In'}
                    </span>
                  </td>
                  <td>
                    {attendee.check_in_time
                      ? new Date(attendee.check_in_time).toLocaleString()
                      : 'N/A'
                    }
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-small">View</button>
                      <button className="btn-small">Edit</button>
                      {attendee.qr_code && (
                        <button className="btn-small">QR</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination && pagination.limit && (
          <div className="pagination">
            <button
              onClick={() => handlePageChange(Math.max(0, filters.offset - filters.limit))}
              disabled={filters.offset === 0}
            >
              Previous
            </button>
            
            <span className="pagination-info">
              Showing {filters.offset + 1} - {Math.min(filters.offset + attendees.length, pagination.total || 0)} 
              {pagination.total && ` of ${pagination.total}`}
            </span>
            
            <button
              onClick={() => handlePageChange(filters.offset + filters.limit)}
              disabled={!pagination.has_more}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendeeList;
