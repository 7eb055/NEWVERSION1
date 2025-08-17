import React, { useState, useEffect, useCallback } from 'react';
import { useDashboardState } from '../hooks/useDashboardState';
import { useEventData } from '../hooks/useEventData';
import Modal from '../Modal';

const TicketingModal = () => {
  const {
    showTicketingForm,
    setShowTicketingForm
  } = useDashboardState();

  const { events } = useEventData();

  const [selectedEvent, setSelectedEvent] = useState('');
  const [ticketData, setTicketData] = useState([]);
  const [newTicketType, setNewTicketType] = useState({
    name: '',
    price: '',
    description: '',
    quantity_available: '',
    sale_start_date: '',
    sale_end_date: '',
    is_active: true
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('view'); // 'view' or 'create'

  const fetchTicketData = useCallback(async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${selectedEvent}/tickets`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const tickets = await response.json();
        setTicketData(tickets);
      }
    } catch (error) {
      console.error('Error fetching ticket data:', error);
    }
  }, [selectedEvent]);

  // Fetch ticket data when event is selected
  useEffect(() => {
    if (selectedEvent && showTicketingForm) {
      fetchTicketData();
    }
  }, [selectedEvent, showTicketingForm, fetchTicketData]);

  // Handle input changes for new ticket type
  const handleTicketInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewTicketType(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle modal close
  const handleClose = () => {
    setShowTicketingForm(false);
    setSelectedEvent('');
    setTicketData([]);
    setNewTicketType({
      name: '',
      price: '',
      description: '',
      quantity_available: '',
      sale_start_date: '',
      sale_end_date: '',
      is_active: true
    });
    setError('');
    setSuccess('');
    setActiveTab('view');
  };

  // Handle creating new ticket type
  const handleCreateTicketType = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${selectedEvent}/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...newTicketType,
          event_id: selectedEvent
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create ticket type');
      }

      setSuccess('Ticket type created successfully!');
      setNewTicketType({
        name: '',
        price: '',
        description: '',
        quantity_available: '',
        sale_start_date: '',
        sale_end_date: '',
        is_active: true
      });
      
      // Refresh ticket data
      fetchTicketData();
      setActiveTab('view');

    } catch (error) {
      console.error('Error creating ticket type:', error);
      setError(error.message || 'Failed to create ticket type');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle ticket status toggle
  const handleToggleTicketStatus = async (ticketId, currentStatus) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ is_active: !currentStatus })
      });

      if (response.ok) {
        fetchTicketData(); // Refresh data
        setSuccess('Ticket status updated successfully!');
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
      setError('Failed to update ticket status');
    }
  };

  if (!showTicketingForm) return null;

  return (
    <Modal
      isOpen={showTicketingForm}
      onClose={handleClose}
      title="Ticketing Management"
      maxWidth="70%"
    >
      <div className="ticketing-modal">
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
                <option key={event.event_id} value={event.event_id}>
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
                <i className="fas fa-list"></i>
                View Tickets
              </button>
              <button
                className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
                onClick={() => setActiveTab('create')}
              >
                <i className="fas fa-plus"></i>
                Create Ticket Type
              </button>
            </div>

            {/* View Tickets Tab */}
            {activeTab === 'view' && (
              <div className="tickets-view">
                <h3>Current Ticket Types</h3>
                
                {ticketData.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-ticket-alt"></i>
                    <p>No ticket types created yet.</p>
                    <button
                      className="btn btn-primary"
                      onClick={() => setActiveTab('create')}
                    >
                      Create First Ticket Type
                    </button>
                  </div>
                ) : (
                  <div className="tickets-grid">
                    {ticketData.map((ticket) => (
                      <div key={ticket.id} className={`ticket-card ${!ticket.is_active ? 'inactive' : ''}`}>
                        <div className="ticket-header">
                          <h4>{ticket.name}</h4>
                          <div className="ticket-status">
                            <span className={`status-badge ${ticket.is_active ? 'active' : 'inactive'}`}>
                              {ticket.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="ticket-details">
                          <div className="ticket-price">
                            <span className="price-label">Price:</span>
                            <span className="price-value">${ticket.price}</span>
                          </div>
                          
                          <div className="ticket-quantity">
                            <span className="quantity-label">Available:</span>
                            <span className="quantity-value">{ticket.quantity_available || 'Unlimited'}</span>
                          </div>
                          
                          {ticket.description && (
                            <div className="ticket-description">
                              <p>{ticket.description}</p>
                            </div>
                          )}
                          
                          <div className="ticket-dates">
                            {ticket.sale_start_date && (
                              <div className="date-info">
                                <strong>Sale Start:</strong> {new Date(ticket.sale_start_date).toLocaleDateString()}
                              </div>
                            )}
                            {ticket.sale_end_date && (
                              <div className="date-info">
                                <strong>Sale End:</strong> {new Date(ticket.sale_end_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="ticket-actions">
                          <button
                            className={`btn btn-sm ${ticket.is_active ? 'btn-outline-danger' : 'btn-outline-success'}`}
                            onClick={() => handleToggleTicketStatus(ticket.id, ticket.is_active)}
                          >
                            {ticket.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Create Ticket Type Tab */}
            {activeTab === 'create' && (
              <div className="create-ticket-form">
                <h3>Create New Ticket Type</h3>
                
                <form onSubmit={handleCreateTicketType}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="ticket_name">Ticket Name *</label>
                      <input
                        type="text"
                        id="ticket_name"
                        name="name"
                        value={newTicketType.name}
                        onChange={handleTicketInputChange}
                        placeholder="e.g., General Admission, VIP, Early Bird"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="ticket_price">Price ($) *</label>
                      <input
                        type="number"
                        id="ticket_price"
                        name="price"
                        value={newTicketType.price}
                        onChange={handleTicketInputChange}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="quantity_available">Quantity Available</label>
                      <input
                        type="number"
                        id="quantity_available"
                        name="quantity_available"
                        value={newTicketType.quantity_available}
                        onChange={handleTicketInputChange}
                        placeholder="Leave empty for unlimited"
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="ticket_description">Description</label>
                    <textarea
                      id="ticket_description"
                      name="description"
                      value={newTicketType.description}
                      onChange={handleTicketInputChange}
                      placeholder="Describe what's included with this ticket type"
                      rows="3"
                    />
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="sale_start_date">Sale Start Date</label>
                      <input
                        type="datetime-local"
                        id="sale_start_date"
                        name="sale_start_date"
                        value={newTicketType.sale_start_date}
                        onChange={handleTicketInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="sale_end_date">Sale End Date</label>
                      <input
                        type="datetime-local"
                        id="sale_end_date"
                        name="sale_end_date"
                        value={newTicketType.sale_end_date}
                        onChange={handleTicketInputChange}
                      />
                    </div>
                  </div>

                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={newTicketType.is_active}
                        onChange={handleTicketInputChange}
                      />
                      <span className="checkmark"></span>
                      Active (available for purchase)
                    </label>
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
                          Creating...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-ticket-alt"></i>
                          Create Ticket Type
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setActiveTab('view')}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

export default TicketingModal;
