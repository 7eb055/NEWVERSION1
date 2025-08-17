import React, { useState, useEffect, useCallback } from 'react';
import { useDashboardState } from '../hooks/useDashboardState';
import { useEventData } from '../hooks/useEventData';
import Modal from '../Modal';

const AttendanceModal = () => {
  const {
    showAttendanceForm,
    setShowAttendanceForm
  } = useDashboardState();

  const { events } = useEventData();

  const [selectedEvent, setSelectedEvent] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [qrScanner, setQrScanner] = useState(false);
  const [manualCheckIn, setManualCheckIn] = useState({
    email: '',
    checkInTime: new Date().toISOString().slice(0, 16)
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('view'); // 'view', 'checkin', 'qr'

  // Fetch attendance data when event is selected
  useEffect(() => {
    if (selectedEvent && showAttendanceForm) {
      fetchAttendanceData();
    }
  }, [selectedEvent, showAttendanceForm, fetchAttendanceData]);

  const fetchAttendanceData = useCallback(async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${selectedEvent}/attendance`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const attendance = await response.json();
        setAttendanceData(attendance);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    }
  }, [selectedEvent]);

  // Handle modal close
  const handleClose = () => {
    setShowAttendanceForm(false);
    setSelectedEvent('');
    setAttendanceData([]);
    setManualCheckIn({
      email: '',
      checkInTime: new Date().toISOString().slice(0, 16)
    });
    setError('');
    setSuccess('');
    setActiveTab('view');
    setQrScanner(false);
  };

  // Handle manual check-in
  const handleManualCheckIn = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${selectedEvent}/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          email: manualCheckIn.email,
          check_in_time: manualCheckIn.checkInTime
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to check in attendee');
      }

      setSuccess('Attendee checked in successfully!');
      setManualCheckIn({
        email: '',
        checkInTime: new Date().toISOString().slice(0, 16)
      });
      
      // Refresh attendance data
      fetchAttendanceData();

    } catch (error) {
      console.error('Error checking in attendee:', error);
      setError(error.message || 'Failed to check in attendee');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle bulk check-out
  const handleBulkCheckOut = async () => {
    if (!window.confirm('Are you sure you want to check out all attendees?')) {
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${selectedEvent}/checkout-all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setSuccess('All attendees checked out successfully!');
        fetchAttendanceData();
      }
    } catch (error) {
      console.error('Error with bulk checkout:', error);
      setError('Failed to check out attendees');
    }
  };

  // Handle individual check-out
  const handleCheckOut = async (attendeeId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/attendance/${attendeeId}/checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setSuccess('Attendee checked out successfully!');
        fetchAttendanceData();
      }
    } catch (error) {
      console.error('Error checking out attendee:', error);
      setError('Failed to check out attendee');
    }
  };

  if (!showAttendanceForm) return null;

  return (
    <Modal
      isOpen={showAttendanceForm}
      onClose={handleClose}
      title="Attendance Verification"
      maxWidth="80%"
    >
      <div className="attendance-modal">
        {/* Success/Error Messages */}
        {success && (
          <div className="alert alert-success">
            <i className="fas fa-check-circle"></i>
            {success}
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}

        {/* Event Selection */}
        <div className="form-section">
          <div className="form-group">
            <label htmlFor="event_select">Select Event</label>
            <select
              id="event_select"
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="form-control"
            >
              <option value="">Choose an event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.event_name} - {new Date(event.event_date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedEvent && (
          <>
            {/* Tab Navigation */}
            <div className="tab-navigation">
              <button
                className={`tab-button ${activeTab === 'view' ? 'active' : ''}`}
                onClick={() => setActiveTab('view')}
              >
                <i className="fas fa-users"></i>
                View Attendance
              </button>
              <button
                className={`tab-button ${activeTab === 'checkin' ? 'active' : ''}`}
                onClick={() => setActiveTab('checkin')}
              >
                <i className="fas fa-user-check"></i>
                Manual Check-in
              </button>
              <button
                className={`tab-button ${activeTab === 'qr' ? 'active' : ''}`}
                onClick={() => setActiveTab('qr')}
              >
                <i className="fas fa-qrcode"></i>
                QR Scanner
              </button>
            </div>

            {/* View Attendance Tab */}
            {activeTab === 'view' && (
              <div className="attendance-view">
                <div className="attendance-header">
                  <h3>Attendance Overview</h3>
                  <div className="attendance-stats">
                    <div className="stat-card">
                      <span className="stat-number">{attendanceData.filter(a => a.check_in_time).length}</span>
                      <span className="stat-label">Checked In</span>
                    </div>
                    <div className="stat-card">
                      <span className="stat-number">{attendanceData.filter(a => a.check_out_time).length}</span>
                      <span className="stat-label">Checked Out</span>
                    </div>
                    <div className="stat-card">
                      <span className="stat-number">{attendanceData.length}</span>
                      <span className="stat-label">Total Registered</span>
                    </div>
                  </div>
                  
                  <div className="bulk-actions">
                    <button
                      className="btn btn-outline-warning"
                      onClick={handleBulkCheckOut}
                    >
                      <i className="fas fa-sign-out-alt"></i>
                      Check Out All
                    </button>
                  </div>
                </div>

                {attendanceData.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-users"></i>
                    <p>No registrations found for this event.</p>
                  </div>
                ) : (
                  <div className="attendance-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Company</th>
                          <th>Check-in Time</th>
                          <th>Check-out Time</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceData.map((attendee) => (
                          <tr key={attendee.id}>
                            <td>{attendee.first_name} {attendee.last_name}</td>
                            <td>{attendee.email}</td>
                            <td>{attendee.company || '-'}</td>
                            <td>
                              {attendee.check_in_time 
                                ? new Date(attendee.check_in_time).toLocaleString()
                                : '-'
                              }
                            </td>
                            <td>
                              {attendee.check_out_time 
                                ? new Date(attendee.check_out_time).toLocaleString()
                                : '-'
                              }
                            </td>
                            <td>
                              <span className={`status-badge ${
                                attendee.check_out_time ? 'checked-out' : 
                                attendee.check_in_time ? 'checked-in' : 'registered'
                              }`}>
                                {attendee.check_out_time ? 'Checked Out' : 
                                 attendee.check_in_time ? 'Checked In' : 'Registered'}
                              </span>
                            </td>
                            <td>
                              {attendee.check_in_time && !attendee.check_out_time && (
                                <button
                                  className="btn btn-sm btn-outline-warning"
                                  onClick={() => handleCheckOut(attendee.id)}
                                >
                                  Check Out
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Manual Check-in Tab */}
            {activeTab === 'checkin' && (
              <div className="manual-checkin">
                <h3>Manual Check-in</h3>
                
                <form onSubmit={handleManualCheckIn}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="checkin_email">Attendee Email *</label>
                      <input
                        type="email"
                        id="checkin_email"
                        value={manualCheckIn.email}
                        onChange={(e) => setManualCheckIn(prev => ({
                          ...prev,
                          email: e.target.value
                        }))}
                        placeholder="Enter attendee's email address"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="checkin_time">Check-in Time</label>
                      <input
                        type="datetime-local"
                        id="checkin_time"
                        value={manualCheckIn.checkInTime}
                        onChange={(e) => setManualCheckIn(prev => ({
                          ...prev,
                          checkInTime: e.target.value
                        }))}
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i>
                          Checking In...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-user-check"></i>
                          Check In Attendee
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* QR Scanner Tab */}
            {activeTab === 'qr' && (
              <div className="qr-scanner">
                <h3>QR Code Scanner</h3>
                
                <div className="scanner-container">
                  {!qrScanner ? (
                    <div className="scanner-placeholder">
                      <i className="fas fa-qrcode"></i>
                      <p>QR Code scanner would be implemented here</p>
                      <p className="text-muted">
                        This would use a camera library to scan QR codes for quick check-in
                      </p>
                      <button
                        className="btn btn-primary"
                        onClick={() => setQrScanner(true)}
                      >
                        <i className="fas fa-camera"></i>
                        Start Scanner
                      </button>
                    </div>
                  ) : (
                    <div className="scanner-active">
                      <div className="camera-view">
                        <p>Camera view would appear here</p>
                        <div className="scanner-overlay">
                          <div className="scan-frame"></div>
                        </div>
                      </div>
                      
                      <div className="scanner-controls">
                        <button
                          className="btn btn-outline-secondary"
                          onClick={() => setQrScanner(false)}
                        >
                          <i className="fas fa-stop"></i>
                          Stop Scanner
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="scanner-instructions">
                  <h4>Instructions:</h4>
                  <ul>
                    <li>Point the camera at the attendee's QR code</li>
                    <li>The system will automatically check them in</li>
                    <li>Make sure the QR code is well-lit and in focus</li>
                  </ul>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

export default AttendanceModal;
