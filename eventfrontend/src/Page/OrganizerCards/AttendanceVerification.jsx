import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AuthTokenService from '../../services/AuthTokenService';
import AttendeeListingService from '../../services/attendeeListingService';
import formatters, { toNumber } from '../../utils/formatters';
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
  
  // Helper function to safely calculate attendance percentage
  const calculateAttendancePercentage = (stats) => {
    if (!stats?.registrations?.total || !stats?.registrations?.checked_in) {
      return 0;
    }
    const total = toNumber(stats.registrations.total);
    const checkedIn = toNumber(stats.registrations.checked_in);
    
    if (total === 0) return 0;
    return Math.round((checkedIn / total) * 100);
  };

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

  // Load attendees for the selected event using the new comprehensive attendee listing API
  const loadAttendees = async () => {
    if (!selectedEvent) return;
    
    setLoading(true);
    try {
      const token = AuthTokenService.getToken();
      const response = await axios.get(
        `${API_URL}/api/events/${selectedEvent}/attendee-listing`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      console.log('📋 Loaded comprehensive attendee data:', response.data);
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

  // Load attendance statistics using the new comprehensive stats API
  const loadAttendanceStats = async () => {
    if (!selectedEvent) return;
    
    try {
      const token = AuthTokenService.getToken();
      const response = await axios.get(
        `${API_URL}/api/events/${selectedEvent}/attendee-stats`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      console.log('📊 Loaded comprehensive stats:', response.data);
      // Add more detailed logging of the stats structure
      console.log('📊 Stats data structure:', JSON.stringify(response.data.stats, null, 2));
      
      if (response.data.success) {
        setAttendanceStats({
          [selectedEvent]: response.data.stats // Changed from response.data.statistics to response.data.stats
        });
        // Log the updated state to confirm
        console.log('📊 Updated attendanceStats for event:', selectedEvent, response.data.stats);
      }
    } catch (error) {
      console.error('Error loading attendance stats:', error);
      // Try fallback to old endpoint if new one fails
      try {
        const token = AuthTokenService.getToken(); // Get token again since it might be undefined in this scope
        const fallbackResponse = await axios.get(
          `${API_URL}/api/events/${selectedEvent}/attendance/stats`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
        console.log('📊 Fallback stats response:', fallbackResponse.data);
        setAttendanceStats({
          [selectedEvent]: fallbackResponse.data
        });
        console.log('📊 Updated attendanceStats from fallback for event:', selectedEvent, fallbackResponse.data);
      } catch (fallbackError) {
        console.error('Fallback stats loading also failed:', fallbackError);
      }
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
      
      // Find the selected event name from the events prop
      const eventName = events.find(e => e.event_id.toString() === selectedEvent.toString())?.event_name || 'Event';
      
      // Process the history data to match the expected format for rendering
      const processedHistory = (response.data.history || []).map(record => ({
        id: record.log_id,
        attendeeName: record.attendee_name || 'Unknown',
        scanTime: record.check_in_time,
        eventName: eventName,
        qrCode: record.registration_id?.toString() || 'N/A',
        ticketType: `Standard (Qty: ${record.ticket_quantity || 1})`,
        scanMethod: record.scan_method || 'Manual',
        status: record.check_out_time ? 'checked-out' : 'checked-in',
        scannedBy: 'Organizer'
      }));
      
      setScanHistory(processedHistory);
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
      console.log(`Sending checkout request for registration ${registrationId} to ${API_URL}/api/events/${selectedEvent}/attendance/checkout`);
      const response = await axios.post(
        `${API_URL}/api/events/${selectedEvent}/attendance/checkout`,
        { registration_id: registrationId },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      // Reload data to reflect changes
      loadAttendees();
      loadAttendanceStats();
      loadScanHistory();
      
      // Display success message with attendee name if available
      const attendeeName = response.data?.data?.attendee?.full_name || 'Attendee';
      setSuccess(`${attendeeName} checked out successfully`);
      
    } catch (error) {
      console.error('Error undoing check-in:', error);
      
      // Provide more specific error messages based on the response
      if (error.response?.status === 404) {
        setError('Check-out endpoint not found. Please contact support.');
      } else if (error.response?.data?.message) {
        setError(`Check-out failed: ${error.response.data.message}`);
      } else {
        setError('Failed to process check-out. Please try again.');
      }
      
      // Still try to reload data in case the operation actually succeeded
      try {
        loadAttendees();
        loadAttendanceStats();
        loadScanHistory();
      } catch (refreshError) {
        console.error('Error refreshing data after checkout error:', refreshError);
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter attendees based on search and status - Updated for new attendee listing structure
  const getFilteredAttendees = () => {
    let filtered = attendees;
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(a => {
        // Map new attendance_status to old status values for compatibility
        const status = a.attendance_status === 'checked_in' ? 'checked-in' : 'registered';
        return status === filterStatus;
      });
    }
    
    if (searchTerm) {
      filtered = filtered.filter(a => 
        a.attendee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.attendee_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.qr_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.attendee_phone?.toLowerCase().includes(searchTerm.toLowerCase())
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

  // Get scan status safely with a default
  const getScanStatus = (scan) => {
    // Default to 'unknown' if scan is undefined
    if (!scan) return 'unknown';
    
    // If status exists, return it, otherwise return 'unknown'
    return scan.status || 'unknown';
  };

  // Get scan result status icon
  const getScanStatusIcon = (status) => {
    // Ensure status is a string with a default value
    const safeStatus = status || 'unknown';
    
    switch (safeStatus) {
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
                <div key={attendee.registration_id || `attendee-${index}`} className="attendee-card">
                  <div className="attendee-info">
                    <div className="attendee-header">
                      <h4>{attendee.attendee_name}</h4>
                      <div className="attendee-status">
                        {getStatusIcon(attendee.attendance_status === 'checked_in' ? 'checked-in' : 'registered')}
                        <span className={`status-text ${attendee.attendance_status === 'checked_in' ? 'checked-in' : 'registered'}`}>
                          {attendee.attendance_status === 'checked_in' ? 'CHECKED IN' : 'REGISTERED'}
                        </span>
                      </div>
                    </div>
                    <div className="attendee-details">
                      <p><i className="fas fa-envelope"></i> {attendee.attendee_email}</p>
                      <p><i className="fas fa-phone"></i> {attendee.attendee_phone || 'N/A'}</p>
                      <p><i className="fas fa-ticket-alt"></i> {attendee.ticket_type || 'Standard'}</p>
                      <p><i className="fas fa-qrcode"></i> {attendee.qr_code || 'N/A'}</p>
                      <p><i className="fas fa-money-bill"></i> Payment: {attendee.payment_status || 'N/A'}</p>
                      <p><i className="fas fa-dollar-sign"></i> Amount: ${formatters.formatCurrency(attendee.total_amount)}</p>
                      {attendee.special_requirements && (
                        <p><i className="fas fa-info-circle"></i> Special: {attendee.special_requirements}</p>
                      )}
                      {attendee.check_in_time && (
                        <p><i className="fas fa-clock"></i> Checked in: {formatTime(attendee.check_in_time)}</p>
                      )}
                      {attendee.dietary_restrictions && (
                        <p><i className="fas fa-utensils"></i> Dietary: {attendee.dietary_restrictions}</p>
                      )}
                    </div>
                  </div>
                  <div className="attendee-actions">
                    {attendee.attendance_status !== 'checked_in' ? (
                      <button 
                        onClick={() => manualCheckIn(attendee.registration_id)}
                        className="check-in-btn"
                        disabled={loading}
                      >
                        <i className="fas fa-check"></i>
                        Check In
                      </button>
                    ) : (
                      <button 
                        onClick={() => manualCheckOut(attendee.registration_id)}
                        className="check-out-btn"
                        disabled={loading}
                      >
                        <i className="fas fa-undo"></i>
                        Undo Check-in
                      </button>
                    )}
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
                      <h5>Event Statistics</h5>
                      <div className="attendance-rate">
                        <span className="rate-value">
                          {calculateAttendancePercentage(attendanceStats[selectedEvent])}%
                        </span>
                        <span className="rate-label">Attendance Rate</span>
                      </div>
                    </div>
                    
                    <div className="stats-breakdown">
                      {attendanceStats[selectedEvent]?.registrations && (
                        <>
                          <div className="stat-item checked-in">
                            <i className="fas fa-check-circle"></i>
                            <span className="stat-number">{toNumber(attendanceStats[selectedEvent]?.registrations?.checked_in)}</span>
                            <span className="stat-label">Checked In</span>
                          </div>
                          <div className="stat-item registered">
                            <i className="fas fa-clock"></i>
                            <span className="stat-number">
                              {toNumber(attendanceStats[selectedEvent]?.registrations?.total) - toNumber(attendanceStats[selectedEvent]?.registrations?.checked_in)}
                            </span>
                            <span className="stat-label">Not Checked In</span>
                          </div>
                          <div className="stat-item total">
                            <i className="fas fa-users"></i>
                            <span className="stat-number">{toNumber(attendanceStats[selectedEvent]?.registrations?.total)}</span>
                            <span className="stat-label">Total Registered</span>
                          </div>
                          <div className="stat-item revenue">
                            <i className="fas fa-dollar-sign"></i>
                            <span className="stat-number">${formatters.formatCurrency(attendanceStats[selectedEvent]?.revenue?.collected)}</span>
                            <span className="stat-label">Revenue Collected</span>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {attendanceStats[selectedEvent].capacity && (
                      <div className="capacity-info">
                        <p><strong>Capacity:</strong> {attendanceStats[selectedEvent].capacity.current_registrations} / {attendanceStats[selectedEvent].capacity.max_attendees || 'Unlimited'}</p>
                        {attendanceStats[selectedEvent].capacity.percentage_filled && (
                          <p><strong>Filled:</strong> {attendanceStats[selectedEvent].capacity.percentage_filled}%</p>
                        )}
                      </div>
                    )}
                    
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ 
                          width: `${calculateAttendancePercentage(attendanceStats[selectedEvent])}%` 
                        }}
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
                      {getScanStatusIcon(getScanStatus(scan))}
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
                          <span className={`status-badge ${getScanStatus(scan)}`}>
                            {getScanStatus(scan).toUpperCase()}
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
