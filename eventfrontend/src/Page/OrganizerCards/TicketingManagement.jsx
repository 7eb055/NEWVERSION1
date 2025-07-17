import React, { useState } from 'react';
import QRCodeGenerator from './QRCodeGenerator';

const TicketingManagement = ({ events, onCancel, isLoading }) => {
  const [activeTab, setActiveTab] = useState('tiers');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [ticketTiers, setTicketTiers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Mock initial ticket tiers
  const mockTiers = [
    {
      id: 1,
      name: 'Early Bird',
      description: 'Limited time offer for early supporters',
      price: 99.99,
      quota: 100,
      sold: 45,
      deadline: '2025-02-15T23:59:59',
      features: ['Priority seating', 'Welcome gift', 'Networking session'],
      status: 'active'
    },
    {
      id: 2,
      name: 'Standard',
      description: 'Regular admission ticket',
      price: 149.99,
      quota: 500,
      sold: 230,
      deadline: '2025-03-01T23:59:59',
      features: ['Standard seating', 'Conference materials'],
      status: 'active'
    },
    {
      id: 3,
      name: 'VIP',
      description: 'Premium experience with exclusive access',
      price: 299.99,
      quota: 50,
      sold: 12,
      deadline: '2025-03-05T23:59:59',
      features: ['Premium seating', 'VIP lounge access', 'Meet & greet', 'Exclusive workshops'],
      status: 'active'
    }
  ];

  // Mock tickets data
  const mockTickets = [
    {
      id: 'TK001',
      eventId: 1,
      tierName: 'VIP',
      attendeeName: 'John Smith',
      attendeeEmail: 'john@example.com',
      purchaseDate: '2025-01-15T10:30:00Z',
      price: 299.99,
      qrCode: 'QR123456789',
      status: 'valid'
    },
    {
      id: 'TK002',
      eventId: 1,
      tierName: 'Standard',
      attendeeName: 'Sarah Johnson',
      attendeeEmail: 'sarah@example.com',
      purchaseDate: '2025-01-16T14:20:00Z',
      price: 149.99,
      qrCode: 'QR987654321',
      status: 'valid'
    }
  ];

  useState(() => {
    setTicketTiers(mockTiers);
    setTickets(mockTickets);
  }, []);

  const [newTier, setNewTier] = useState({
    name: '',
    description: '',
    price: '',
    quota: '',
    deadline: '',
    features: ['']
  });

  const handleAddFeature = () => {
    setNewTier(prev => ({
      ...prev,
      features: [...prev.features, '']
    }));
  };

  const handleFeatureChange = (index, value) => {
    setNewTier(prev => ({
      ...prev,
      features: prev.features.map((feature, i) => i === index ? value : feature)
    }));
  };

  const handleRemoveFeature = (index) => {
    setNewTier(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const handleCreateTier = () => {
    const tier = {
      id: Date.now(),
      ...newTier,
      price: parseFloat(newTier.price),
      quota: parseInt(newTier.quota),
      sold: 0,
      features: newTier.features.filter(f => f.trim()),
      status: 'active'
    };
    
    setTicketTiers(prev => [...prev, tier]);
    setNewTier({
      name: '',
      description: '',
      price: '',
      quota: '',
      deadline: '',
      features: ['']
    });
  };

  const generateQRCode = (ticketId) => {
    // In a real app, this would generate an actual QR code
    return `QR${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  };

  const generateTicketReceipt = (ticket) => {
    const qrCode = generateQRCode(ticket.id);
    const receiptData = {
      ...ticket,
      qrCode,
      receiptNumber: `RCP${Date.now()}`,
      issuedAt: new Date().toISOString()
    };
    
    // Update ticket with QR code
    setTickets(prev => prev.map(t => 
      t.id === ticket.id ? { ...t, qrCode } : t
    ));
    
    return receiptData;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'sold-out': return '#ef4444';
      case 'expired': return '#6b7280';
      case 'valid': return '#10b981';
      case 'used': return '#f59e0b';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // QR Code Generation
  const handleGenerateQR = (ticket) => {
    setSelectedTicket(ticket);
    setShowQRGenerator(true);
  };

  return (
    <div className="ticketing-management">
      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'tiers' ? 'active' : ''}`}
          onClick={() => setActiveTab('tiers')}
        >
          <i className="fas fa-layer-group"></i>
          Ticket Tiers
        </button>
        <button 
          className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          <i className="fas fa-plus-circle"></i>
          Create Tier
        </button>
        <button 
          className={`tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
          onClick={() => setActiveTab('tickets')}
        >
          <i className="fas fa-ticket-alt"></i>
          Manage Tickets
        </button>
        <button 
          className={`tab-btn ${activeTab === 'receipts' ? 'active' : ''}`}
          onClick={() => setActiveTab('receipts')}
        >
          <i className="fas fa-qrcode"></i>
          QR Receipts
        </button>
      </div>

      {/* Event Selector */}
      <div className="event-selector">
        <label htmlFor="eventSelect">Select Event:</label>
        <select
          id="eventSelect"
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
        >
          <option value="">Choose an event...</option>
          {events.map(event => (
            <option key={event.id} value={event.id}>
              {event.name} - {formatDate(event.date)}
            </option>
          ))}
        </select>
      </div>

      {/* Tab Content */}
      {activeTab === 'tiers' && (
        <div className="tab-content">
          <div className="tiers-grid">
            {ticketTiers.map(tier => (
              <div key={tier.id} className="tier-card">
                <div className="tier-header">
                  <div className="tier-name">{tier.name}</div>
                  <div 
                    className="tier-status"
                    style={{ backgroundColor: getStatusColor(tier.status) }}
                  >
                    {tier.status.replace('-', ' ')}
                  </div>
                </div>
                <div className="tier-price">${tier.price}</div>
                <div className="tier-description">{tier.description}</div>
                
                <div className="tier-stats">
                  <div className="stat">
                    <span className="stat-label">Sold:</span>
                    <span className="stat-value">{tier.sold}/{tier.quota}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Deadline:</span>
                    <span className="stat-value">{formatDate(tier.deadline)}</span>
                  </div>
                </div>

                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${(tier.sold / tier.quota) * 100}%` }}
                  ></div>
                </div>

                <div className="tier-features">
                  <h4>Features:</h4>
                  <ul>
                    {tier.features.map((feature, index) => (
                      <li key={index}>
                        <i className="fas fa-check"></i>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="tier-actions">
                  <button className="btn-edit">
                    <i className="fas fa-edit"></i>
                    Edit
                  </button>
                  <button className="btn-toggle">
                    <i className={`fas ${tier.status === 'active' ? 'fa-pause' : 'fa-play'}`}></i>
                    {tier.status === 'active' ? 'Pause' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'create' && (
        <div className="tab-content">
          <div className="create-tier-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Tier Name *</label>
                <input
                  type="text"
                  value={newTier.name}
                  onChange={(e) => setNewTier(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Early Bird, VIP, Standard"
                />
              </div>

              <div className="form-group">
                <label>Price ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={newTier.price}
                  onChange={(e) => setNewTier(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label>Quota *</label>
                <input
                  type="number"
                  value={newTier.quota}
                  onChange={(e) => setNewTier(prev => ({ ...prev, quota: e.target.value }))}
                  placeholder="Number of tickets"
                />
              </div>

              <div className="form-group">
                <label>Sales Deadline *</label>
                <input
                  type="datetime-local"
                  value={newTier.deadline}
                  onChange={(e) => setNewTier(prev => ({ ...prev, deadline: e.target.value }))}
                />
              </div>

              <div className="form-group full-width">
                <label>Description</label>
                <textarea
                  value={newTier.description}
                  onChange={(e) => setNewTier(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this ticket tier..."
                  rows="3"
                />
              </div>

              <div className="form-group full-width">
                <label>Features</label>
                <div className="features-list">
                  {newTier.features.map((feature, index) => (
                    <div key={index} className="feature-input">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => handleFeatureChange(index, e.target.value)}
                        placeholder="Feature description"
                      />
                      {newTier.features.length > 1 && (
                        <button
                          type="button"
                          className="remove-feature"
                          onClick={() => handleRemoveFeature(index)}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="add-feature"
                    onClick={handleAddFeature}
                  >
                    <i className="fas fa-plus"></i>
                    Add Feature
                  </button>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="btn-secondary"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-primary"
                onClick={handleCreateTier}
                disabled={!newTier.name || !newTier.price || !newTier.quota}
              >
                <i className="fas fa-plus"></i>
                Create Tier
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tickets' && (
        <div className="tab-content">
          <div className="tickets-table">
            <div className="table-header">
              <h3>
                <i className="fas fa-ticket-alt"></i>
                Issued Tickets
              </h3>
              <div className="table-actions">
                <button className="btn-export">
                  <i className="fas fa-download"></i>
                  Export
                </button>
              </div>
            </div>
            
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Attendee</th>
                    <th>Email</th>
                    <th>Tier</th>
                    <th>Price</th>
                    <th>Purchase Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(ticket => (
                    <tr key={ticket.id}>
                      <td className="ticket-id">{ticket.id}</td>
                      <td>{ticket.attendeeName}</td>
                      <td>{ticket.attendeeEmail}</td>
                      <td>
                        <span className="tier-badge">{ticket.tierName}</span>
                      </td>
                      <td className="price">${ticket.price}</td>
                      <td>{formatDate(ticket.purchaseDate)}</td>
                      <td>
                        <span 
                          className="status-badge"
                          style={{ backgroundColor: getStatusColor(ticket.status) }}
                        >
                          {ticket.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn-qr"
                            onClick={() => generateTicketReceipt(ticket)}
                            title="Generate QR Receipt"
                          >
                            <i className="fas fa-qrcode"></i>
                          </button>
                          <button 
                            className="btn-email"
                            title="Resend Ticket"
                          >
                            <i className="fas fa-envelope"></i>
                          </button>
                          <button 
                            className="btn-cancel"
                            title="Cancel Ticket"
                          >
                            <i className="fas fa-ban"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'receipts' && (
        <div className="tab-content">
          <div className="receipts-section">
            <div className="section-header">
              <h3>
                <i className="fas fa-qrcode"></i>
                QR Code Receipts
              </h3>
              <p>Generate and manage digital tickets with QR codes for verification</p>
            </div>

            <div className="receipt-generator">
              <div className="generator-form">
                <h4>Generate New Receipt</h4>
                <div className="form-row">
                  <select className="ticket-select">
                    <option value="">Select a ticket...</option>
                    {tickets.map(ticket => (
                      <option key={ticket.id} value={ticket.id}>
                        {ticket.id} - {ticket.attendeeName} ({ticket.tierName})
                      </option>
                    ))}
                  </select>
                  <button 
                    className="btn-generate"
                    onClick={() => {
                      const selectedTicketId = document.querySelector('.ticket-select').value;
                      if (selectedTicketId) {
                        const ticket = tickets.find(t => t.id === selectedTicketId);
                        handleGenerateQR(ticket);
                      }
                    }}
                  >
                    <i className="fas fa-qrcode"></i>
                    Generate QR Receipt
                  </button>
                </div>
              </div>

              <div className="qr-preview">
                <div className="qr-card">
                  <div className="qr-header">
                    <h3>Digital Ticket Receipt</h3>
                    <div className="qr-code-placeholder">
                      <i className="fas fa-qrcode"></i>
                      <span>QR Code</span>
                    </div>
                  </div>
                  <div className="qr-details">
                    <div className="detail-row">
                      <span>Event:</span>
                      <span>Tech Conference 2025</span>
                    </div>
                    <div className="detail-row">
                      <span>Ticket:</span>
                      <span>VIP - $299.99</span>
                    </div>
                    <div className="detail-row">
                      <span>Attendee:</span>
                      <span>John Smith</span>
                    </div>
                    <div className="detail-row">
                      <span>Date:</span>
                      <span>March 15, 2025</span>
                    </div>
                    <div className="detail-row">
                      <span>Venue:</span>
                      <span>Convention Center</span>
                    </div>
                  </div>
                  <div className="qr-footer">
                    <small>Scan QR code at venue entrance for verification</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showQRGenerator && selectedTicket && (
        <QRCodeGenerator 
          ticket={selectedTicket}
          onClose={() => setShowQRGenerator(false)}
        />
      )}
    </div>
  );
};

export default TicketingManagement;
