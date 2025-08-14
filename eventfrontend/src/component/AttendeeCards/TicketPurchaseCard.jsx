import React, { useState } from 'react';
import AuthTokenService from '../../services/AuthTokenService';
import './AttendeeCards.css';

const TicketPurchaseCard = ({ event, ticketTypes = [], loading = false, onPurchase }) => {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedTicket) {
      return;
    }
    
    try {
      const token = AuthTokenService.getToken();
      console.log('TicketPurchaseCard token check:', token ? 'Token exists' : 'No token');
      
      if (!token) {
        alert('Your session has expired. Please log in again.');
        window.location.href = '/login';
        return;
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${event.event_id}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ticket_type_id: selectedTicket.ticket_type_id,
          ticket_quantity: quantity,
          payment_method: paymentMethod,
          payment_status: 'completed'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to purchase ticket');
      }

      const data = await response.json();
      onPurchase(data.registration);
    } catch (error) {
      console.error('Error purchasing ticket:', error);
      let errorMessage = 'An error occurred while purchasing the ticket';
      
      if (error.message.includes('403') || error.message.includes('Forbidden')) {
        errorMessage = 'Access denied. Please make sure you are logged in properly.';
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    }
  };
  
  const formatCurrency = (amount) => {
    // Make sure amount is a valid number
    const validAmount = Number(amount) || 0;
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(validAmount);
  };
  
  return (
    <div className="ticket-purchase-card">
      <h2>Purchase Tickets</h2>
      <h3>{event?.event_name || 'Event'}</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="ticket-types-section">
          <h4>Available Tickets</h4>
          {loading ? (
            <p>Loading ticket types...</p>
          ) : ticketTypes.length === 0 ? (
            <p>No ticket types available for this event.</p>
          ) : (
            <div className="ticket-type-list">
              {ticketTypes.map(ticket => (
                <div 
                  key={ticket.ticket_type_id} 
                  className={`ticket-type-item ${selectedTicket?.ticket_type_id === ticket.ticket_type_id ? 'selected' : ''}`}
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <div className="ticket-type-details">
                    <h5>{ticket.type_name}</h5>
                    <p>{ticket.description}</p>
                    {ticket.benefits && (
                      <ul className="ticket-benefits">
                        {Array.isArray(ticket.benefits) 
                          ? ticket.benefits.map((benefit, index) => (
                              <li key={index}>{benefit}</li>
                            ))
                          : ticket.benefits.split(',').map((benefit, index) => (
                              <li key={index}>{benefit.trim()}</li>
                            ))
                        }
                      </ul>
                    )}
                    <div className="ticket-availability">
                      {(ticket.quantity_available || 0) > 0 ? (
                        <span>{ticket.quantity_available || 'Limited'} available</span>
                      ) : (
                        <span className="sold-out">Sold Out</span>
                      )}
                    </div>
                  </div>
                  <div className="ticket-type-price">
                    {formatCurrency(ticket.price)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {selectedTicket && (
          <>
            <div className="ticket-quantity-section">
              <h4>Quantity</h4>
              <div className="quantity-selector">
                <button 
                  type="button" 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span>{quantity}</span>
                <button 
                  type="button" 
                  onClick={() => setQuantity(Math.min(selectedTicket?.quantity_available || 10, quantity + 1))}
                  disabled={quantity >= (selectedTicket?.quantity_available || 10)}
                >
                  +
                </button>
              </div>
            </div>
            
            <div className="payment-method-section">
              <h4>Payment Method</h4>
              <div className="payment-options">
                <label>
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="credit_card" 
                    checked={paymentMethod === 'credit_card'} 
                    onChange={() => setPaymentMethod('credit_card')}
                  />
                  <span>Credit Card</span>
                </label>
                <label>
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="paypal" 
                    checked={paymentMethod === 'paypal'} 
                    onChange={() => setPaymentMethod('paypal')}
                  />
                  <span>PayPal</span>
                </label>
                <label>
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="bank_transfer" 
                    checked={paymentMethod === 'bank_transfer'} 
                    onChange={() => setPaymentMethod('bank_transfer')}
                  />
                  <span>Bank Transfer</span>
                </label>
              </div>
            </div>
            
            <div className="ticket-summary">
              <h4>Order Summary</h4>
              <div className="summary-item">
                <span>{selectedTicket.type_name} x {quantity}</span>
                <span>{formatCurrency((selectedTicket.price || 0) * quantity)}</span>
              </div>
              <div className="summary-total">
                <span>Total</span>
                <span>{formatCurrency((selectedTicket.price || 0) * quantity)}</span>
              </div>
            </div>
            
            <button 
              type="submit" 
              className="btn-purchase"
              disabled={!selectedTicket || (selectedTicket.quantity_available || 0) < quantity}
            >
              Complete Purchase
            </button>
          </>
        )}
      </form>
    </div>
  );
};

export default TicketPurchaseCard;
