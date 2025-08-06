import React, { useState } from 'react';
import QRCode from 'qrcode.react';
import './AttendeeCards.css';

const TicketCard = ({ ticket, onViewQR, onDownload, onCancel }) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'status-confirmed';
      case 'cancelled':
        return 'status-cancelled';
      case 'pending':
        return 'status-pending';
      default:
        return '';
    }
  };
  
  const getPaymentStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'payment-paid';
      case 'refunded':
        return 'payment-refunded';
      case 'pending':
        return 'payment-pending';
      default:
        return '';
    }
  };
  
  return (
    <div className="ticket-card">
      <div className="ticket-card-main">
        <div className="ticket-card-content">
          <h3 className="ticket-card-title">{ticket.event_name}</h3>
          <div className="ticket-card-date">
            <i className="far fa-calendar"></i>
            <span>{formatDate(ticket.event_date)}</span>
          </div>
          <div className="ticket-card-location">
            <i className="fas fa-map-marker-alt"></i>
            <span>{ticket.venue_name}</span>
          </div>
          <div className="ticket-statuses">
            <div className={`ticket-status ${getStatusClass(ticket.status)}`}>
              {ticket.status}
            </div>
            <div className={`payment-status ${getPaymentStatusClass(ticket.payment_status)}`}>
              {ticket.payment_status}
            </div>
          </div>
        </div>
        
        <div className="ticket-card-actions">
          <button 
            className="btn-outline" 
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
          
          <button 
            className="btn-primary" 
            onClick={() => onViewQR(ticket)}
          >
            View QR Code
          </button>
        </div>
      </div>
      
      {showDetails && (
        <div className="ticket-card-details">
          <div className="ticket-detail-row">
            <span>Registration ID:</span>
            <span>#{ticket.registration_id}</span>
          </div>
          <div className="ticket-detail-row">
            <span>Ticket Quantity:</span>
            <span>{ticket.ticket_quantity}</span>
          </div>
          <div className="ticket-detail-row">
            <span>Total Amount:</span>
            <span>${ticket.total_amount.toFixed(2)}</span>
          </div>
          <div className="ticket-detail-row">
            <span>Purchase Date:</span>
            <span>{formatDate(ticket.registration_date)}</span>
          </div>
          
          <div className="ticket-detail-actions">
            <button 
              className="btn-outline" 
              onClick={() => onDownload(ticket)}
            >
              <i className="fas fa-download"></i> Download
            </button>
            
            {ticket.status !== 'cancelled' && (
              <button 
                className="btn-danger" 
                onClick={() => onCancel(ticket.registration_id)}
              >
                Cancel Ticket
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketCard;
