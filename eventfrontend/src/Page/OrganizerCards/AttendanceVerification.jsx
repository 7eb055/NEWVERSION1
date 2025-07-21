import React, { useState, useEffect } from 'react';

const AttendanceVerification = ({ events, onCancel, isLoading }) => {
  const [activeTab, setActiveTab] = useState('scanner');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [attendees, setAttendees] = useState([]);
  const [scannedQRCode, setScannedQRCode] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Mock attendees data
  const mockAttendees = [
    {
      id: 'ATT001',
      name: 'John Smith',
      email: 'john.smith@company.com',
      phone: '+1-555-1111',
      ticketType: 'VIP',
      qrCode: 'QR001JOHN2025',
      status: 'registered',
      checkInTime: null,
      eventId: 1
    },
    {
      id: 'ATT002',
      name: 'Emily Rodriguez',
      email: 'emily.r@marketing.com',
      phone: '+1-555-2222',
      ticketType: 'Standard',
      qrCode: 'QR002EMILY2025',
      status: 'checked-in',
      checkInTime: '2025-07-17T09:15:00Z',
      eventId: 1
    },
    {
      id: 'ATT003',
      name: 'Michael Johnson',
      email: 'michael.j@vipguest.com',
      phone: '+1-555-3333',
      ticketType: 'VIP',
      qrCode: 'QR003MICHAEL2025',
      status: 'checked-in',
      checkInTime: '2025-07-17T08:45:00Z',
      eventId: 1
    },
    {
      id: 'ATT004',
      name: 'Sarah Chen',
      email: 'sarah.chen@example.com',
      phone: '+1-555-4444',
      ticketType: 'Standard',
      qrCode: 'QR004SARAH2025',
      status: 'registered',
      checkInTime: null,
      eventId: 2
    },
    {
      id: 'ATT005',
      name: 'David Wilson',
      email: 'david.w@company.com',
      phone: '+1-555-5555',
      ticketType: 'Premium',
      qrCode: 'QR005DAVID2025',
      status: 'no-show',
      checkInTime: null,
      eventId: 3
    }
  ];

  useEffect(() => {
    // Load mock data
    setAttendees(mockAttendees);
    calculateAttendanceStats(mockAttendees);
    
    // Mock scan history
    setScanHistory([
      {
        id: 1,
        qrCode: 'QR002EMILY2025',
        attendeeName: 'Emily Rodriguez',
        eventName: 'Tech Conference 2025',
        scanTime: '2025-07-17T09:15:00Z',
        status: 'success',
        ticketType: 'Standard'
      },
      {
        id: 2,
        qrCode: 'QR003MICHAEL2025',
        attendeeName: 'Michael Johnson',
        eventName: 'Tech Conference 2025',
        scanTime: '2025-07-17T08:45:00Z',
        status: 'success',
        ticketType: 'VIP'
      },
      {
        id: 3,
        qrCode: 'QR999INVALID',
        attendeeName: 'Unknown',
        eventName: 'Tech Conference 2025',
        scanTime: '2025-07-17T10:30:00Z',
        status: 'invalid',
        ticketType: 'N/A'
      }
    ]);
  }, []);

  const calculateAttendanceStats = (attendeeList) => {
    const stats = {};
    
    events.forEach(event => {
      const eventAttendees = attendeeList.filter(a => a.eventId === event.id);
      const checkedIn = eventAttendees.filter(a => a.status === 'checked-in').length;
      const registered = eventAttendees.filter(a => a.status === 'registered').length;
      const noShow = eventAttendees.filter(a => a.status === 'no-show').length;
      
      stats[event.id] = {
        total: eventAttendees.length,
        checkedIn,
        registered,
        noShow,
        attendanceRate: eventAttendees.length > 0 ? ((checkedIn / eventAttendees.length) * 100).toFixed(1) : 0
      };
    });
    
    setAttendanceStats(stats);
  };

  const handleQRScan = () => {
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

    // Find attendee by QR code
    const attendee = attendees.find(a => 
      a.qrCode === scannedQRCode && a.eventId === parseInt(selectedEvent)
    );

    if (!attendee) {
      setScanResult({
        status: 'invalid',
        message: 'Invalid QR code or attendee not registered for this event',
        qrCode: scannedQRCode
      });
      
      // Add to scan history
      const newScan = {
        id: scanHistory.length + 1,
        qrCode: scannedQRCode,
        attendeeName: 'Unknown',
        eventName: events.find(e => e.id === parseInt(selectedEvent))?.name || 'Unknown Event',
        scanTime: new Date().toISOString(),
        status: 'invalid',
        ticketType: 'N/A'
      };
      setScanHistory(prev => [newScan, ...prev]);
      setScannedQRCode('');
      return;
    }

    if (attendee.status === 'checked-in') {
      setScanResult({
        status: 'duplicate',
        message: `${attendee.name} is already checked in`,
        attendee,
        checkInTime: attendee.checkInTime
      });
      setScannedQRCode('');
      return;
    }

    // Check in the attendee
    const updatedAttendees = attendees.map(a => 
      a.id === attendee.id 
        ? { ...a, status: 'checked-in', checkInTime: new Date().toISOString() }
        : a
    );
    
    setAttendees(updatedAttendees);
    calculateAttendanceStats(updatedAttendees);

    setScanResult({
      status: 'success',
      message: `${attendee.name} successfully checked in!`,
      attendee: { ...attendee, status: 'checked-in', checkInTime: new Date().toISOString() }
    });

    // Add to scan history
    const newScan = {
      id: scanHistory.length + 1,
      qrCode: scannedQRCode,
      attendeeName: attendee.name,
      eventName: events.find(e => e.id === parseInt(selectedEvent))?.name || 'Unknown Event',
      scanTime: new Date().toISOString(),
      status: 'success',
      ticketType: attendee.ticketType
    };
    setScanHistory(prev => [newScan, ...prev]);
    setScannedQRCode('');
  };

  const manualCheckIn = (attendeeId) => {
    const updatedAttendees = attendees.map(a => 
      a.id === attendeeId 
        ? { ...a, status: 'checked-in', checkInTime: new Date().toISOString() }
        : a
    );
    
    setAttendees(updatedAttendees);
    calculateAttendanceStats(updatedAttendees);
  };

  const manualCheckOut = (attendeeId) => {
    const updatedAttendees = attendees.map(a => 
      a.id === attendeeId 
        ? { ...a, status: 'registered', checkInTime: null }
        : a
    );
    
    setAttendees(updatedAttendees);
    calculateAttendanceStats(updatedAttendees);
  };

  const getFilteredAttendees = () => {
    let filtered = attendees;
    
    if (selectedEvent) {
      filtered = filtered.filter(a => a.eventId === parseInt(selectedEvent));
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(a => a.status === filterStatus);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(a => 
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.qrCode.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'Not checked in';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'checked-in':
        return <i className="fas fa-check-circle status-checked-in"></i>;
      case 'registered':
        return <i className="fas fa-clock status-registered"></i>;
      case 'no-show':
        return <i className="fas fa-times-circle status-no-show"></i>;
      default:
        return <i className="fas fa-question-circle status-unknown"></i>;
    }
  };

  const getScanStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <i className="fas fa-check-circle scan-success"></i>;
      case 'invalid':
        return <i className="fas fa-times-circle scan-invalid"></i>;
      case 'duplicate':
        return <i className="fas fa-exclamation-triangle scan-duplicate"></i>;
      default:
        return <i className="fas fa-info-circle"></i>;
    }
  };

  return (
    <div className="attendance-verification">
      <div className="attendance-header">
        <h3>
          <i className="fas fa-user-check"></i>
          Attendance & Verification
        </h3>
        <p>Scan QR codes and manage real-time attendance tracking</p>
      </div>

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
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="event-select"
          >
            <option value="">Choose an event...</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>
                {event.name} - {new Date(event.date).toLocaleDateString()}
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
                        placeholder="Enter QR code (e.g., QR001JOHN2025)"
                        className="qr-input"
                        onKeyPress={(e) => e.key === 'Enter' && handleQRScan()}
                      />
                      <button 
                        onClick={handleQRScan}
                        className="scan-btn"
                        disabled={!selectedEvent}
                      >
                        <i className="fas fa-search"></i>
                        Verify
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

            <div className="attendees-list">
              {getFilteredAttendees().map(attendee => (
                <div key={attendee.id} className="attendee-card">
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
                      <p><i className="fas fa-phone"></i> {attendee.phone}</p>
                      <p><i className="fas fa-ticket-alt"></i> {attendee.ticketType}</p>
                      <p><i className="fas fa-qrcode"></i> {attendee.qrCode}</p>
                      {attendee.checkInTime && (
                        <p><i className="fas fa-clock"></i> Checked in: {formatTime(attendee.checkInTime)}</p>
                      )}
                    </div>
                  </div>
                  <div className="attendee-actions">
                    {attendee.status === 'registered' ? (
                      <button 
                        onClick={() => manualCheckIn(attendee.id)}
                        className="check-in-btn"
                      >
                        <i className="fas fa-check"></i>
                        Check In
                      </button>
                    ) : attendee.status === 'checked-in' ? (
                      <button 
                        onClick={() => manualCheckOut(attendee.id)}
                        className="check-out-btn"
                      >
                        <i className="fas fa-undo"></i>
                        Undo Check-in
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && (
          <div className="stats-tab">
            <h4>
              <i className="fas fa-chart-bar"></i>
              Attendance Statistics
            </h4>
            
            <div className="stats-grid">
              {events.map(event => {
                const stats = attendanceStats[event.id];
                if (!stats) return null;
                
                return (
                  <div key={event.id} className="event-stats-card">
                    <div className="event-stats-header">
                      <h5>{event.name}</h5>
                      <div className="attendance-rate">
                        <span className="rate-value">{stats.attendanceRate}%</span>
                        <span className="rate-label">Attendance Rate</span>
                      </div>
                    </div>
                    
                    <div className="stats-breakdown">
                      <div className="stat-item checked-in">
                        <i className="fas fa-check-circle"></i>
                        <span className="stat-number">{stats.checkedIn}</span>
                        <span className="stat-label">Checked In</span>
                      </div>
                      <div className="stat-item registered">
                        <i className="fas fa-clock"></i>
                        <span className="stat-number">{stats.registered}</span>
                        <span className="stat-label">Registered</span>
                      </div>
                      <div className="stat-item no-show">
                        <i className="fas fa-times-circle"></i>
                        <span className="stat-number">{stats.noShow}</span>
                        <span className="stat-label">No Show</span>
                      </div>
                      <div className="stat-item total">
                        <i className="fas fa-users"></i>
                        <span className="stat-number">{stats.total}</span>
                        <span className="stat-label">Total</span>
                      </div>
                    </div>
                    
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${stats.attendanceRate}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Scan History Tab */}
        {activeTab === 'history' && (
          <div className="history-tab">
            <h4>
              <i className="fas fa-history"></i>
              Scan History
            </h4>
            
            <div className="history-list">
              {scanHistory.map(scan => (
                <div key={scan.id} className={`history-item ${scan.status}`}>
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
                      <p><strong>Status:</strong> 
                        <span className={`status-badge ${scan.status}`}>
                          {scan.status.toUpperCase()}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
