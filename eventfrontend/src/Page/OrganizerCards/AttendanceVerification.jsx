import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AuthTokenService from '../../services/AuthTokenService';
import './css/AttendanceVerification.css';

const AttendanceVerification = ({ events = [], onCancel, isLoading }) => {
  const [activeTab, setActiveTab] = useState('scanner');
  const [selectedEvent, setSelectedEvent] = useState('');
  // Remove events state since we're using events prop from parent
  const [attendees, setAttendees] = useState([]);
  const [scannedQRCode, setScannedQRCode] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Load organizer's events on component mount - now use events prop
  // useEffect(() => {
  //   loadUserEvents();
  // }, []);

  // Load attendees when event is selected
  useEffect(() => {
    if (selectedEvent) {
      loadAttendees();
      loadAttendanceStats();
      loadScanHistory();
    } else {
      setAttendees([]);
      setAttendanceStats({});
      setScanHistory([]);
    }
  }, [selectedEvent]);

  // Remove this function since we're using events prop
  // const loadUserEvents = async () => {
  //   setLoading(true);
  //   try {
  //     const token = AuthTokenService.getToken();
  //     const response = await axios.get(
  //       `${API_URL}/api/events/my-events`,
  //       {
  //         headers: { 'Authorization': `Bearer ${token}` }
  //       }
  //     );
  //     
  //     console.log('📋 Loaded events for organizer:', response.data.events);
  //     setEvents(response.data.events || []);
  //     setError('');
  //   } catch (error) {
  //     console.error('Error loading user events:', error);
  //     setError('Failed to load events');
  //     setEvents([]);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // Load attendees for the selected event
  const loadAttendees = async () => {
    if (!selectedEvent) return;
    
    setLoading(true);
    try {
      const token = AuthTokenService.getToken();
      const response = await axios.get(
        `${API_URL}/api/events/${selectedEvent}/attendees`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          params: { status: filterStatus, search: searchTerm }
        }
      );
      
      setAttendees(response.data.attendees || []);
      setError('');
    } catch (error) {
      console.error('Error loading attendees:', error);
      setError('Failed to load attendees');
      setAttendees([]);
    } finally {
      setLoading(false);
    }
  };

  // Load attendance statistics
  const loadAttendanceStats = async () => {
    if (!selectedEvent) return;
    
    try {
      const token = AuthTokenService.getToken();
      const response = await axios.get(
        `${API_URL}/api/events/${selectedEvent}/attendance/stats`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      setAttendanceStats({
        [selectedEvent]: response.data
      });
    } catch (error) {
      console.error('Error loading attendance stats:', error);
    }
  };

  // Load scan history
  const loadScanHistory = async () => {
    if (!selectedEvent) return;
    
    try {
      const token = AuthTokenService.getToken();
      const response = await axios.get(
        `${API_URL}/api/events/${selectedEvent}/attendance/history`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      setScanHistory(response.data.history || []);
    } catch (error) {
      console.error('Error loading scan history:', error);
    }
  };

  // Handle QR code scanning
  const handleQRScan = async () => {
    if (!scannedQRCode.trim()) {
      setScanResult({
        status: 'error',
        message: 'Please enter or scan a QR code'
      });
      return;
    }

    if (!selectedEvent) {
      setScanResult({
        status: 'error',
        message: 'Please select an event first'
      });
      return;
    }

    setLoading(true);
    try {
      const token = AuthTokenService.getToken();
      const response = await axios.post(
        `${API_URL}/api/events/${selectedEvent}/attendance/scan`,
        { qr_code: scannedQRCode },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      setScanResult({
        status: response.data.status,
        message: response.data.message,
        attendee: response.data.attendee
      });

      // Reload data to reflect changes
      loadAttendees();
      loadAttendanceStats();
      loadScanHistory();
      
    } catch (error) {
      console.error('Error scanning QR code:', error);
      
      if (error.response?.data) {
        setScanResult({
          status: error.response.data.status || 'error',
          message: error.response.data.message || 'QR scan failed',
          attendee: error.response.data.attendee,
          checkInTime: error.response.data.checkInTime
        });
      } else {
        setScanResult({
          status: 'error',
          message: 'Failed to scan QR code. Please try again.'
        });
      }
    } finally {
      setLoading(false);
      setScannedQRCode('');
    }
  };

  // Manual check-in
  const manualCheckIn = async (registrationId) => {
    setLoading(true);
    try {
      const token = AuthTokenService.getToken();
      await axios.post(
        `${API_URL}/api/events/${selectedEvent}/attendance/manual`,
        { registration_id: registrationId },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      // Reload data to reflect changes
      loadAttendees();
      loadAttendanceStats();
      loadScanHistory();
      
    } catch (error) {
      console.error('Error checking in attendee:', error);
      setError('Failed to check in attendee');
    } finally {
      setLoading(false);
    }
  };

  // Manual check-out (undo check-in)
  const manualCheckOut = async (registrationId) => {
    setLoading(true);
    try {
      const token = AuthTokenService.getToken();
      await axios.post(
        `${API_URL}/api/events/${selectedEvent}/attendance/checkout`,
        { registration_id: registrationId },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      // Reload data to reflect changes
      loadAttendees();
      loadAttendanceStats();
      
    } catch (error) {
      console.error('Error undoing check-in:', error);
      setError('Failed to undo check-in');
    } finally {
      setLoading(false);
    }
  };

  // Filter attendees based on search and status
  const getFilteredAttendees = () => {
    let filtered = attendees;
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(a => a.status === filterStatus);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(a => 
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.qrCode?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  // Format date/time for display
  const formatTime = (dateString) => {
    if (!dateString) return 'Not checked in';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'checked-in':
        return <i className="fas fa-check-circle status-checked-in"></i>;
      case 'registered':
        return <i className="fas fa-clock status-registered"></i>;
      case 'checked-out':
        return <i className="fas fa-sign-out-alt status-checked-out"></i>;
      case 'no-show':
        return <i className="fas fa-times-circle status-no-show"></i>;
      default:
        return <i className="fas fa-question-circle status-unknown"></i>;
    }
  };

  // Get scan result status icon
  const getScanStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <i className="fas fa-check-circle scan-success"></i>;
      case 'invalid':
        return <i className="fas fa-times-circle scan-invalid"></i>;
      case 'duplicate':
        return <i className="fas fa-exclamation-triangle scan-duplicate"></i>;
      case 'error':
        return <i className="fas fa-exclamation-circle scan-error"></i>;
      default:
        return <i className="fas fa-info-circle"></i>;
    }
  };

  // Reload attendees when filter changes
  useEffect(() => {
    if (selectedEvent) {
      loadAttendees();
    }
  }, [filterStatus, searchTerm]);

  return (
    <div className="attendance-verification">
      <div className="attendance-header">
        <h3>
          <i className="fas fa-user-check"></i>
          Attendance & Verification
        </h3>
        <p>Scan QR codes and manage real-time attendance tracking</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-triangle"></i>
          {error}
        </div>
      )}

      <div className="attendance-tabs">
        <button 
          className={`tab-btn ${activeTab === 'scanner' ? 'active' : ''}`}
          onClick={() => setActiveTab('scanner')}
        >
          <i className="fas fa-qrcode"></i>
          QR Scanner
        </button>
        <button 
          className={`tab-btn ${activeTab === 'attendees' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendees')}
        >
          <i className="fas fa-users"></i>
          Attendee List
        </button>
        <button 
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <i className="fas fa-chart-bar"></i>
          Statistics
        </button>
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <i className="fas fa-history"></i>
          Scan History
        </button>
      </div>

      <div className="attendance-content">
        {/* Event Selection */}
        <div className="event-selector">
          <label>Select Event:</label>
          <select 
            value={selectedEvent} 
            onChange={(e) => {
              console.log('🎯 Selected event ID:', e.target.value);
              setSelectedEvent(e.target.value);
            }}
            className="event-select"
          >
            <option value="">Choose an event...</option>
            {events && events.map((event, index) => (
              <option key={event.event_id || `event-${index}`} value={event.event_id}>
                {event.event_name} - {new Date(event.event_date).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>

        {/* QR Scanner Tab */}
        {activeTab === 'scanner' && (
          <div className="scanner-tab">
            <div className="scanner-section">
              <h4>
                <i className="fas fa-camera"></i>
                QR Code Scanner
              </h4>
              
              <div className="scanner-interface">
                <div className="scanner-camera">
                  <div className="camera-placeholder">
                    <i className="fas fa-camera"></i>
                    <p>Camera View</p>
                    <small>Point camera at QR code to scan</small>
                  </div>
                  <div className="scanner-overlay">
                    <div className="scan-frame"></div>
                  </div>
                </div>
                
                <div className="scanner-controls">
                  <div className="manual-input">
                    <label>Or enter QR code manually:</label>
                    <div className="input-group">
                      <input
                        type="text"
                        value={scannedQRCode}
                        onChange={(e) => setScannedQRCode(e.target.value)}
                        placeholder="Enter QR code"
                        className="qr-input"
                        onKeyPress={(e) => e.key === 'Enter' && handleQRScan()}
                      />
                      <button 
                        onClick={handleQRScan}
                        className="scan-btn"
                        disabled={!selectedEvent || loading}
                      >
                        <i className="fas fa-search"></i>
                        {loading ? 'Verifying...' : 'Verify'}
                      </button>
                    </div>
                  </div>
                  
                  {scanResult && (
                    <div className={`scan-result ${scanResult.status}`}>
                      {getScanStatusIcon(scanResult.status)}
                      <div className="result-content">
                        <p className="result-message">{scanResult.message}</p>
                        {scanResult.attendee && (
                          <div className="attendee-info">
                            <p><strong>Name:</strong> {scanResult.attendee.name}</p>
                            <p><strong>Ticket:</strong> {scanResult.attendee.ticketType}</p>
                            <p><strong>Email:</strong> {scanResult.attendee.email}</p>
                            {scanResult.attendee.checkInTime && (
                              <p><strong>Check-in Time:</strong> {formatTime(scanResult.attendee.checkInTime)}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Attendees Tab */}
        {activeTab === 'attendees' && (
          <div className="attendees-tab">
            <div className="attendees-controls">
              <div className="search-filter">
                <div className="search-box">
                  <i className="fas fa-search"></i>
                  <input
                    type="text"
                    placeholder="Search attendees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="status-filter"
                >
                  <option value="all">All Status</option>
                  <option value="checked-in">Checked In</option>
                  <option value="registered">Registered</option>
                  <option value="no-show">No Show</option>
                </select>
              </div>
            </div>

            {loading && (
              <div className="loading-message">
                <i className="fas fa-spinner fa-spin"></i>
                Loading attendees...
              </div>
            )}

            <div className="attendees-list">
              {getFilteredAttendees().map((attendee, index) => (
                <div key={attendee.id || `attendee-${index}`} className="attendee-card">
                  <div className="attendee-info">
                    <div className="attendee-header">
                      <h4>{attendee.name}</h4>
                      <div className="attendee-status">
                        {getStatusIcon(attendee.status)}
                        <span className={`status-text ${attendee.status}`}>
                          {attendee.status.replace('-', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="attendee-details">
                      <p><i className="fas fa-envelope"></i> {attendee.email}</p>
                      <p><i className="fas fa-phone"></i> {attendee.phone || 'N/A'}</p>
                      <p><i className="fas fa-ticket-alt"></i> {attendee.ticketType}</p>
                      <p><i className="fas fa-qrcode"></i> {attendee.qrCode || 'N/A'}</p>
                      <p><i className="fas fa-money-bill"></i> Payment: {attendee.paymentStatus || 'N/A'}</p>
                      {attendee.checkInTime && (
                        <p><i className="fas fa-clock"></i> Checked in: {formatTime(attendee.checkInTime)}</p>
                      )}
                    </div>
                  </div>
                  <div className="attendee-actions">
                    {attendee.status === 'registered' ? (
                      <button 
                        onClick={() => manualCheckIn(attendee.registrationId)}
                        className="check-in-btn"
                        disabled={loading}
                      >
                        <i className="fas fa-check"></i>
                        Check In
                      </button>
                    ) : attendee.status === 'checked-in' ? (
                      <button 
                        onClick={() => manualCheckOut(attendee.registrationId)}
                        className="check-out-btn"
                        disabled={loading}
                      >
                        <i className="fas fa-undo"></i>
                        Undo Check-in
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            {!loading && getFilteredAttendees().length === 0 && (
              <div className="no-attendees">
                <i className="fas fa-users"></i>
                <p>No attendees found</p>
                {selectedEvent ? 
                  <small>Try adjusting your search or filter criteria</small> :
                  <small>Please select an event to view attendees</small>
                }
              </div>
            )}
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && (
          <div className="stats-tab">
            <h4>
              <i className="fas fa-chart-bar"></i>
              Attendance Statistics
            </h4>
            
            {selectedEvent ? (
              <div className="stats-grid">
                {attendanceStats[selectedEvent] && (
                  <div className="event-stats-card">
                    <div className="event-stats-header">
                      <h5>{attendanceStats[selectedEvent].eventName}</h5>
                      <div className="attendance-rate">
                        <span className="rate-value">{attendanceStats[selectedEvent].attendanceRate}%</span>
                        <span className="rate-label">Attendance Rate</span>
                      </div>
                    </div>
                    
                    <div className="stats-breakdown">
                      <div className="stat-item checked-in">
                        <i className="fas fa-check-circle"></i>
                        <span className="stat-number">{attendanceStats[selectedEvent].checkedIn}</span>
                        <span className="stat-label">Checked In</span>
                      </div>
                      <div className="stat-item registered">
                        <i className="fas fa-clock"></i>
                        <span className="stat-number">{attendanceStats[selectedEvent].registered}</span>
                        <span className="stat-label">Registered</span>
                      </div>
                      <div className="stat-item no-show">
                        <i className="fas fa-times-circle"></i>
                        <span className="stat-number">{attendanceStats[selectedEvent].noShow}</span>
                        <span className="stat-label">No Show</span>
                      </div>
                      <div className="stat-item total">
                        <i className="fas fa-users"></i>
                        <span className="stat-number">{attendanceStats[selectedEvent].total}</span>
                        <span className="stat-label">Total</span>
                      </div>
                    </div>
                    
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${attendanceStats[selectedEvent].attendanceRate}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-stats">
                <i className="fas fa-chart-bar"></i>
                <p>Please select an event to view statistics</p>
              </div>
            )}
          </div>
        )}

        {/* Scan History Tab */}
        {activeTab === 'history' && (
          <div className="history-tab">
            <h4>
              <i className="fas fa-history"></i>
              Scan History
            </h4>
            
            {scanHistory.length > 0 ? (
              <div className="history-list">
                {scanHistory.map((scan, index) => (
                  <div key={scan.id || `scan-${index}`} className={`history-item ${scan.status}`}>
                    <div className="history-icon">
                      {getScanStatusIcon(scan.status)}
                    </div>
                    <div className="history-content">
                      <div className="history-header">
                        <h5>{scan.attendeeName}</h5>
                        <span className="scan-time">{formatTime(scan.scanTime)}</span>
                      </div>
                      <div className="history-details">
                        <p><strong>Event:</strong> {scan.eventName}</p>
                        <p><strong>QR Code:</strong> {scan.qrCode}</p>
                        <p><strong>Ticket:</strong> {scan.ticketType}</p>
                        <p><strong>Method:</strong> {scan.scanMethod || 'QR Code'}</p>
                        <p><strong>Status:</strong> 
                          <span className={`status-badge ${scan.status}`}>
                            {scan.status.toUpperCase()}
                          </span>
                        </p>
                        {scan.scannedBy && (
                          <p><strong>Scanned by:</strong> {scan.scannedBy}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-history">
                <i className="fas fa-history"></i>
                <p>No scan history available</p>
                {selectedEvent ? 
                  <small>Start scanning QR codes to see history</small> :
                  <small>Please select an event to view scan history</small>
                }
              </div>
            )}
          </div>
        )}
      </div>

      <div className="attendance-footer">
        <button onClick={onCancel} className="cancel-btn">
          <i className="fas fa-times"></i>
          Close
        </button>
      </div>
    </div>
  );
};

export default AttendanceVerification;
