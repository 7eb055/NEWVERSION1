import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import AuthTokenService from '../../services/AuthTokenService';
import './css/TicketingManagement.css';

const TicketingManagement = ({ events = [] }) => {
  const [activeTab, setActiveTab] = useState('ticket-types');
  const [ticketTypes, setTicketTypes] = useState([]);
  const [salesData, setSalesData] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  // Remove userEvents state since we're using events prop
  
  // Form states for ticket type creation/editing
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [ticketForm, setTicketForm] = useState({
    type_name: '',
    price: '',
    quantity_available: '',
    description: '',
    benefits: ''
  });

  // Load user's events on component mount - now use events prop
  // useEffect(() => {
  //   loadUserEvents();
  // }, []);

  // Load ticket data when event is selected
  useEffect(() => {
    if (selectedEventId) {
      loadTicketTypes();
      if (activeTab === 'sales') loadSalesData();
      if (activeTab === 'registrations') loadRegistrations();
    }
  }, [selectedEventId, activeTab, loadRegistrations, loadSalesData, loadTicketTypes]);

  // Remove this function since we're using events prop
  // const loadUserEvents = async () => {
  //   try {
  //     const token = AuthTokenService.getToken();
  //     console.log('Loading user events with token:', !!token);
  //     
  //     const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/my-events`, {
  //       headers: { Authorization: `Bearer ${token}` }
  //     });
  //     
  //     console.log('Events loaded:', response.data);
  //     setUserEvents(response.data.events || []);
  //     
  //     // Add user feedback when no events are found
  //     if (!response.data.events || response.data.events.length === 0) {
  //       setError('No events found. Create your first event to start managing tickets.');
  //     } else {
  //       setError(''); // Clear any previous errors
  //     }
  //   } catch (error) {
  //     console.error('Error loading events:', error);
  //     console.error('Error response:', error.response?.data);
  //     setError(error.response?.data?.message || 'Failed to load events');
  //   }
  // };

  const loadTicketTypes = useCallback(async () => {
    if (!selectedEventId) return;
    
    setLoading(true);
    try {
      const token = AuthTokenService.getToken();
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${selectedEventId}/ticket-types`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTicketTypes(response.data.ticketTypes || []);
      setError('');
    } catch (error) {
      console.error('Error loading ticket types:', error);
      setError('Failed to load ticket types');
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  const loadSalesData = useCallback(async () => {
    if (!selectedEventId) return;
    
    setLoading(true);
    try {
      const token = AuthTokenService.getToken();
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${selectedEventId}/ticket-sales`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Ensure we have the expected data structure with defaults
      const data = {
        summary: {
          totalRevenue: response.data.summary?.totalRevenue || 0,
          totalTicketsSold: response.data.summary?.totalTicketsSold || 0,
          uniqueCustomers: response.data.summary?.uniqueCustomers || 0,
          totalCapacity: response.data.summary?.totalCapacity || 0
        },
        ticketTypes: response.data.ticketTypes || [],
        dailySales: response.data.dailySales || [],
        recentSales: response.data.recentSales || []
      };
      
      setSalesData(data);
      setError('');
    } catch (error) {
      console.error('Error loading sales data:', error);
      setError('Failed to load sales data');
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  const loadRegistrations = useCallback(async () => {
    if (!selectedEventId) return;
    
    setLoading(true);
    try {
      const token = AuthTokenService.getToken();
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${selectedEventId}/registrations-detailed`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRegistrations(response.data.registrations || []);
      setError('');
    } catch (error) {
      console.error('Error loading registrations:', error);
      setError('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  const handleTicketFormSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEventId) {
      setError('Please select an event first');
      return;
    }
    
    setLoading(true);
    try {
      const token = AuthTokenService.getToken();
      const url = editingTicket 
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${selectedEventId}/ticket-types/${editingTicket.ticket_type_id}`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${selectedEventId}/ticket-types`;
      
      const method = editingTicket ? 'put' : 'post';
      
      await axios[method](url, ticketForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess(editingTicket ? 'Ticket type updated successfully' : 'Ticket type created successfully');
      setShowTicketForm(false);
      setEditingTicket(null);
      setTicketForm({
        type_name: '',
        price: '',
        quantity_available: '',
        description: '',
        benefits: ''
      });
      loadTicketTypes();
    } catch (error) {
      console.error('Error saving ticket type:', error);
      setError(error.response?.data?.message || 'Failed to save ticket type');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTicket = (ticket) => {
    setEditingTicket(ticket);
    setTicketForm({
      type_name: ticket.type_name,
      price: ticket.price.toString(),
      quantity_available: ticket.quantity_available.toString(),
      description: ticket.description || '',
      benefits: Array.isArray(ticket.benefits) ? ticket.benefits.join(', ') : (ticket.benefits || '')
    });
    setShowTicketForm(true);
  };

  const handleDeleteTicket = async (ticketTypeId) => {
    if (!window.confirm('Are you sure you want to delete this ticket type?')) return;
    
    setLoading(true);
    try {
      const token = AuthTokenService.getToken();
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${selectedEventId}/ticket-types/${ticketTypeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Ticket type deleted successfully');
      loadTicketTypes();
    } catch (error) {
      console.error('Error deleting ticket type:', error);
      setError(error.response?.data?.message || 'Failed to delete ticket type');
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async (registrationId) => {
    try {
      const token = AuthTokenService.getToken();
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/registrations/${registrationId}/generate-qr`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('QR code generated successfully');
      loadRegistrations();
    } catch (error) {
      console.error('Error generating QR code:', error);
      setError('Failed to generate QR code');
    }
  };

  const formatCurrency = (amount) => {
    const number = Number(amount || 0);
    return `GH₵${number.toLocaleString('en-GH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
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

  return (
    <div className="ticketing-management">
      <div className="ticketing-header">
        <h1>Ticketing Management</h1>
        <p>Manage ticket types, track sales, and monitor registrations for your events</p>
      </div>

      {/* Event Selection */}
      <div className="event-selection">
        <label htmlFor="event-select">Select Event:</label>
        <select 
          id="event-select"
          value={selectedEventId} 
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="event-select"
        >
          <option value="">Choose an event...</option>
          {events.map(event => (
            <option key={event.event_id} value={event.event_id}>
              {event.event_name} - {formatDate(event.event_date)}
            </option>
          ))}
        </select>
        {events.length === 0 && !error && (
          <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            No events found. Create an event first to manage tickets.
          </p>
        )}
      </div>

      {selectedEventId && (
        <>
          {/* Navigation Tabs */}
          <div className="tab-navigation">
            <button 
              className={`tab-button ${activeTab === 'ticket-types' ? 'active' : ''}`}
              onClick={() => setActiveTab('ticket-types')}
            >
              Ticket Types
            </button>
            <button 
              className={`tab-button ${activeTab === 'sales' ? 'active' : ''}`}
              onClick={() => setActiveTab('sales')}
            >
              Sales Overview
            </button>
            <button 
              className={`tab-button ${activeTab === 'registrations' ? 'active' : ''}`}
              onClick={() => setActiveTab('registrations')}
            >
              Registrations
            </button>
          </div>

          {/* Messages */}
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          {/* Ticket Types Tab */}
          {activeTab === 'ticket-types' && (
            <div className="tab-content">
              <div className="content-header">
                <h2>Ticket Types</h2>
                <button 
                  className="add-button"
                  onClick={() => setShowTicketForm(true)}
                >
                  <i className="fas fa-plus"></i>
                  Add Ticket Type
                </button>
              </div>

              {/* Ticket Form Modal */}
              {showTicketForm && (
                <div className="modal-overlay">
                  <div className="modal">
                    <div className="modal-header">
                      <h3>{editingTicket ? 'Edit Ticket Type' : 'Add New Ticket Type'}</h3>
                      <button 
                        className="close-button"
                        onClick={() => {
                          setShowTicketForm(false);
                          setEditingTicket(null);
                          setTicketForm({
                            type_name: '',
                            price: '',
                            quantity_available: '',
                            description: '',
                            benefits: ''
                          });
                        }}
                      >
                        ×
                      </button>
                    </div>
                    <form onSubmit={handleTicketFormSubmit} className="ticket-form">
                      <div className="form-row">
                        <div className="form-group">
                          <label>Ticket Type Name *</label>
                          <input
                            type="text"
                            value={ticketForm.type_name}
                            onChange={(e) => setTicketForm({...ticketForm, type_name: e.target.value})}
                            required
                            placeholder="e.g., General Admission, VIP, Early Bird"
                          />
                        </div>
                        <div className="form-group">
                          <label>Price * ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={ticketForm.price}
                            onChange={(e) => setTicketForm({...ticketForm, price: e.target.value})}
                            required
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Available Quantity *</label>
                          <input
                            type="number"
                            min="1"
                            value={ticketForm.quantity_available}
                            onChange={(e) => setTicketForm({...ticketForm, quantity_available: e.target.value})}
                            required
                            placeholder="100"
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Description</label>
                        <textarea
                          value={ticketForm.description}
                          onChange={(e) => setTicketForm({...ticketForm, description: e.target.value})}
                          placeholder="Describe what this ticket includes..."
                          rows="3"
                        />
                      </div>
                      <div className="form-group">
                        <label>Benefits/Perks</label>
                        <textarea
                          value={ticketForm.benefits}
                          onChange={(e) => setTicketForm({...ticketForm, benefits: e.target.value})}
                          placeholder="List special benefits (separate with commas, semicolons, or new lines)&#10;e.g. Front row seating, Meet & greet, Free refreshments"
                          rows="4"
                        />
                      </div>
                      <div className="form-actions">
                        <button type="submit" disabled={loading} className="save-button">
                          <i className="fas fa-save"></i>
                          {loading ? 'Saving...' : (editingTicket ? 'Update' : 'Create')} Ticket Type
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            setShowTicketForm(false);
                            setEditingTicket(null);
                          }}
                          className="cancel-button"
                        >
                          <i className="fas fa-times"></i>
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Ticket Types List */}
              <div className="ticket-types-grid">
                {loading ? (
                  <div className="loading">Loading ticket types...</div>
                ) : ticketTypes.length === 0 ? (
                  <div className="empty-state">
                    <p>No ticket types created yet.</p>
                    <p>Create your first ticket type to start selling tickets!</p>
                  </div>
                ) : (
                  ticketTypes.map(ticket => (
                    <div key={ticket.ticket_type_id} className="ticket-type-card">
                      <div className="ticket-header">
                        <h3>{ticket.type_name}</h3>
                        <div className="ticket-price">{formatCurrency(ticket.price)}</div>
                      </div>
                      <div className="ticket-details">
                        <div className="quantity-info">
                          <span className="sold">{ticket.quantity_sold || 0} sold</span>
                          <span className="available"> / {ticket.quantity_available} available</span>
                        </div>
                        {ticket.description && (
                          <p className="description">{ticket.description}</p>
                        )}
                        {ticket.benefits && (
                          <div className="benefits">
                            <strong>Benefits:</strong>
                            <ul>
                              {(Array.isArray(ticket.benefits) 
                                ? ticket.benefits 
                                : (typeof ticket.benefits === 'string' ? ticket.benefits.split(/[,;\n]/).map(b => b.trim()).filter(b => b.length > 0) : [])
                              ).map((benefit, index) => (
                                <li key={index}>{typeof benefit === 'string' ? benefit.trim() : benefit}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="ticket-actions">
                        <button 
                          onClick={() => handleEditTicket(ticket)}
                          className="edit-button"
                        >
                          <i className="fas fa-edit"></i>
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteTicket(ticket.ticket_type_id)}
                          className="delete-button"
                          disabled={ticket.quantity_sold > 0}
                          title={ticket.quantity_sold > 0 ? "Cannot delete tickets with sales" : "Delete ticket type"}
                        >
                          <i className="fas fa-trash"></i>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Sales Overview Tab */}
          {activeTab === 'sales' && (
            <div className="tab-content">
              <h2>Sales Overview</h2>
              {loading ? (
                <div className="loading">Loading sales data...</div>
              ) : salesData ? (
                <div className="sales-overview">
                  <div className="sales-summary">
                    <div className="summary-card">
                      <h3>Total Revenue</h3>
                      <div className="metric">{formatCurrency(salesData.summary.totalRevenue)}</div>
                    </div>
                    <div className="summary-card">
                      <h3>Tickets Sold</h3>
                      <div className="metric">{salesData.summary.totalTicketsSold}</div>
                    </div>
                    <div className="summary-card">
                      <h3>Total Capacity</h3>
                      <div className="metric">{salesData.summary.totalCapacity}</div>
                    </div>
                    <div className="summary-card">
                      <h3>Capacity Used</h3>
                      <div className="metric">
                        {salesData.summary.totalCapacity > 0 
                          ? `${Math.round((salesData.summary.totalTicketsSold / salesData.summary.totalCapacity) * 100)}%`
                          : '0%'
                        }
                      </div>
                    </div>
                  </div>
                  
                  <div className="sales-breakdown">
                    <h3>Sales by Ticket Type</h3>
                    <div className="sales-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Ticket Type</th>
                            <th>Price</th>
                            <th>Sold</th>
                            <th>Available</th>
                            <th>Revenue</th>
                            <th>% of Total Sales</th>
                          </tr>
                        </thead>
                        <tbody>
                          {salesData.ticketTypes.map(ticket => (
                            <tr key={ticket.id}>
                              <td>{ticket.name}</td>
                              <td>{formatCurrency(ticket.price)}</td>
                              <td>{ticket.sold}</td>
                              <td>{ticket.available}</td>
                              <td>{formatCurrency(ticket.revenue)}</td>
                              <td>
                                {salesData.summary.totalRevenue > 0 
                                  ? `${Math.round((ticket.revenue / salesData.summary.totalRevenue) * 100)}%`
                                  : '0%'
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <p>No sales data available for this event.</p>
                </div>
              )}
            </div>
          )}

          {/* Registrations Tab */}
          {activeTab === 'registrations' && (
            <div className="tab-content">
              <h2>Event Registrations</h2>
              {loading ? (
                <div className="loading">Loading registrations...</div>
              ) : registrations.length === 0 ? (
                <div className="empty-state">
                  <p>No registrations found for this event.</p>
                </div>
              ) : (
                <div className="registrations-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Attendee</th>
                        <th>Email</th>
                        <th>Registration Date</th>
                        <th>Tickets</th>
                        <th>Amount</th>
                        <th>Payment Status</th>
                        <th>Check-in Status</th>
                        <th>QR Code</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrations.map(registration => (
                        <tr key={registration.registration_id}>
                          <td>{registration.attendee_name}</td>
                          <td>{registration.attendee_email}</td>
                          <td>{formatDate(registration.registration_date)}</td>
                          <td>{registration.ticket_quantity}</td>
                          <td>{formatCurrency(registration.total_amount)}</td>
                          <td>
                            <span className={`status ${registration.payment_status}`}>
                              {registration.payment_status}
                            </span>
                          </td>
                          <td>
                            <span className={`status ${registration.check_in_status || 'not-checked-in'}`}>
                              {registration.check_in_status || 'Not Checked In'}
                            </span>
                          </td>
                          <td>
                            {registration.qr_code ? (
                              <span className="qr-code">{registration.qr_code}</span>
                            ) : (
                              <span className="no-qr">No QR Code</span>
                            )}
                          </td>
                          <td>
                            {!registration.qr_code && (
                              <button 
                                onClick={() => generateQRCode(registration.registration_id)}
                                className="generate-qr-button"
                                title="Generate QR Code"
                              >
                                Generate QR
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
        </>
      )}

      {!selectedEventId && (
        <div className="empty-state">
          <p>Please select an event to manage its ticketing.</p>
        </div>
      )}
    </div>
  );
};

export default TicketingManagement;
