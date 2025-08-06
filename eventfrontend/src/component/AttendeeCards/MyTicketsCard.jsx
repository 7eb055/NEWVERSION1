import React, { useState } from 'react';
import './AttendeeCards.css';

const MyTicketsCard = ({ tickets, onViewQRCode, onDownloadTicket, onCancelTicket, onLeaveFeedback }) => {
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Filter tickets based on active filter
  const filteredTickets = tickets?.filter(ticket => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'upcoming') return new Date(ticket.event_date) > new Date() && !ticket.checked_in;
    if (activeFilter === 'past') return new Date(ticket.event_date) < new Date();
    if (activeFilter === 'checked-in') return ticket.checked_in;
    return true;
  });
  
  // Format date to readable format
  const formatDate = (dateString) => {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Format time to readable format
  const formatTime = (timeString) => {
    if (!timeString) return '';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Get ticket status class
  const getStatusClass = (ticket) => {
    const eventDate = new Date(ticket.event_date);
    const now = new Date();
    
    if (ticket.checked_in) return 'status-checked-in';
    if (eventDate < now) return 'status-past';
    return 'status-upcoming';
  };
  
  // Get ticket status text
  const getStatusText = (ticket) => {
    const eventDate = new Date(ticket.event_date);
    const now = new Date();
    
    if (ticket.checked_in) return 'Checked In';
    if (eventDate < now) return 'Past';
    return 'Upcoming';
  };
  
  return (
    <div className="my-tickets-card">
      <div className="my-tickets-header">
        <h2>My Tickets</h2>
        <div className="tickets-filter">
          <button 
            className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${activeFilter === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveFilter('upcoming')}
          >
            Upcoming
          </button>
          <button 
            className={`filter-btn ${activeFilter === 'checked-in' ? 'active' : ''}`}
            onClick={() => setActiveFilter('checked-in')}
          >
            Checked In
          </button>
          <button 
            className={`filter-btn ${activeFilter === 'past' ? 'active' : ''}`}
            onClick={() => setActiveFilter('past')}
          >
            Past
          </button>
        </div>
      </div>
      
      <div className="tickets-list">
        {filteredTickets && filteredTickets.length > 0 ? (
          filteredTickets.map(ticket => (
            <div key={ticket.registration_id || ticket.id} className="ticket-item">
              <div className="ticket-item-header">
                <h3 className="ticket-event-title">{ticket.event_name}</h3>
                <span className={`ticket-status ${getStatusClass(ticket)}`}>
                  {getStatusText(ticket)}
                </span>
              </div>
              
              <div className="ticket-item-content">
                <div className="ticket-details">
                  <div className="ticket-info-row">
                    <div className="ticket-info-item">
                      <i className="fas fa-calendar"></i>
                      <span>{formatDate(ticket.event_date)}</span>
                    </div>
                    <div className="ticket-info-item">
                      <i className="fas fa-clock"></i>
                      <span>{formatTime(ticket.event_start_time)}</span>
                    </div>
                    <div className="ticket-info-item">
                      <i className="fas fa-map-marker-alt"></i>
                      <span>{ticket.event_location}</span>
                    </div>
                  </div>
                  
                  <div className="ticket-info-row">
                    <div className="ticket-info-item">
                      <i className="fas fa-ticket-alt"></i>
                      <span>Ticket #{ticket.ticket_number}</span>
                    </div>
                    <div className="ticket-info-item">
                      <i className="fas fa-user"></i>
                      <span>{ticket.attendee_name}</span>
                    </div>
                  </div>
                  
                  <div className="ticket-type-badge">
                    {ticket.ticket_type}
                  </div>
                </div>
                
                <div className="ticket-qr">
                  <div className="qr-code">
                    {ticket.qr_code && ticket.qr_code.startsWith('data:image/') ? (
                      <img 
                        src={ticket.qr_code} 
                        alt="QR Code" 
                        width="80" 
                        height="80"
                        onError={(e) => {
                          console.error('QR Code image failed to load:', ticket.qr_code?.substring(0, 50));
                          e.target.style.display = 'none';
                          const placeholder = e.target.parentElement.querySelector('.qr-placeholder');
                          if (placeholder) {
                            placeholder.style.display = 'flex';
                          }
                        }}
                      />
                    ) : (
                      <div className="qr-placeholder" style={{ display: 'flex' }}>
                        <i className="fas fa-qrcode"></i>
                        <span>{ticket.qr_code ? 'Invalid QR' : 'Generating QR...'}</span>
                      </div>
                    )}
                  </div>
                  <button 
                    className="btn-view-qr"
                    onClick={() => onViewQRCode(ticket.id)}
                    disabled={!ticket.qr_code || !ticket.qr_code.startsWith('data:image/')}
                  >
                    View QR
                  </button>
                </div>
              </div>
              
              <div className="ticket-actions">
                <button 
                  className="btn-ticket-action btn-download"
                  onClick={() => onDownloadTicket(ticket.id)}
                >
                  <i className="fas fa-download"></i> Download
                </button>
                
                {new Date(ticket.event_date) > new Date() && !ticket.checked_in && (
                  <button 
                    className="btn-ticket-action btn-cancel"
                    onClick={() => onCancelTicket(ticket.id)}
                  >
                    <i className="fas fa-times"></i> Cancel
                  </button>
                )}
                
                {(ticket.checked_in || new Date(ticket.event_date) < new Date()) && !ticket.has_feedback && (
                  <button 
                    className="btn-ticket-action btn-feedback"
                    onClick={() => onLeaveFeedback(ticket.event_id)}
                  >
                    <i className="fas fa-comment"></i> Leave Feedback
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-notifications">
            <i className="fas fa-ticket-alt"></i>
            <div className="empty-message">No tickets found</div>
            <div className="empty-submessage">
              {activeFilter !== 'all' 
                ? `You don't have any ${activeFilter} tickets` 
                : "You haven't registered for any events yet"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTicketsCard;
