import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { getValidToken, clearInvalidToken } from '../utils/tokenValidation';
import AuthTokenService from '../services/AuthTokenService';
import '../Page/css/TicketPurchase.css';

const TicketPurchase = ({ eventId, eventName, onClose }) => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [purchaseStep, setPurchaseStep] = useState('select'); // select, review, success
  const [purchaseData, setPurchaseData] = useState(null);
  const [notification, setNotification] = useState(null);

  // Get authentication token
  const getAuthToken = () => {
    const token = AuthTokenService.getToken();
    console.log('Getting token from AuthTokenService:', token ? 'Token exists' : 'No token');
    console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'null');
    
    if (!token) {
      setNotification({
        type: 'error',
        message: 'Your session has expired. Please log in again.'
      });
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      return null;
    }
    
    return token;
  };

  useEffect(() => {
    const fetchTicketTypes = async () => {
      try {
        setLoading(true);
        
        // Fetch real ticket types from the public API
        const response = await axios.get(`http://localhost:5000/api/events/${eventId}/ticket-types/public`);
        
        if (response.data && response.data.ticketTypes) {
          setTickets(response.data.ticketTypes);
        } else {
          setTickets([]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching ticket types:', err);
        setError('Failed to load ticket types. Please try again later.');
        setLoading(false);
      }
    };

    fetchTicketTypes();
  }, [eventId]);

  const handleTicketSelect = (ticket) => {
    setSelectedTicket(ticket);
  };

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0 && value <= 10) {
      setQuantity(value);
    }
  };

  const handleContinue = () => {
    if (!selectedTicket) {
      setNotification({
        type: 'error',
        message: 'Please select a ticket type'
      });
      return;
    }

    if (quantity > (selectedTicket.quantity_available - selectedTicket.quantity_sold)) {
      setNotification({
        type: 'error',
        message: `Only ${selectedTicket.quantity_available - selectedTicket.quantity_sold} tickets available`
      });
      return;
    }

    setPurchaseStep('review');
  };

  const handleBack = () => {
    setPurchaseStep('select');
  };

  const handlePurchase = async () => {
    try {
      setLoading(true);
      
      // Make real API call to purchase ticket
      const token = getAuthToken();
      const response = await axios.post(`http://localhost:5000/api/events/${eventId}/register`, {
        ticket_type_id: selectedTicket.ticket_type_id,
        ticket_quantity: quantity,
        payment_method: 'credit_card',
        payment_status: 'completed'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data.registration) {
        const registrationData = response.data.registration;
        
        // Format the response data for display
        const purchaseResponse = {
          registration_id: registrationData.registration_id,
          event_id: registrationData.event_id,
          event_name: registrationData.event_name || eventName,
          ticket_type: registrationData.ticket_type_name || selectedTicket.type_name,
          quantity: registrationData.ticket_quantity || quantity,
          total_amount: registrationData.total_amount,
          payment_status: registrationData.payment_status,
          qr_code: registrationData.qr_code,
          created_at: registrationData.registration_date
        };
        
        setPurchaseData(purchaseResponse);
        setPurchaseStep('success');
        setLoading(false);
        
        // Show success notification
        setNotification({
          type: 'success',
          message: 'Ticket purchased successfully! Your registration has been confirmed.'
        });
        
        console.log('Ticket purchase successful:', purchaseResponse);
      } else {
        throw new Error('Invalid response from server');
      }
      
    } catch (err) {
      console.error('Error purchasing ticket:', err);
      let errorMessage = 'Failed to purchase ticket. Please try again.';
      
      if (err.response?.status === 403) {
        errorMessage = 'Access denied. Please make sure you are logged in properly.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setNotification({
        type: 'error',
        message: errorMessage
      });
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (purchaseStep === 'success') {
      // Refresh the page or redirect to tickets view
      onClose();
      navigate('/attendee-dashboard');
    } else {
      onClose();
    }
  };

  // Render notification
  const renderNotification = () => {
    if (!notification) return null;
    
    return (
      <div className={`notification ${notification.type}`}>
        <div className="notification-content">
          <span>{notification.type === 'success' ? '✓' : '✕'}</span>
          <p>{notification.message}</p>
        </div>
        <button onClick={() => setNotification(null)}>Dismiss</button>
      </div>
    );
  };

  // Render loading state
  if (loading && purchaseStep !== 'success') {
    return (
      <div className="ticket-purchase-modal">
        <div className="ticket-purchase-content">
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading ticket information...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="ticket-purchase-modal">
        <div className="ticket-purchase-content">
          <div className="ticket-purchase-header">
            <h2>Error</h2>
            <button className="close-button" onClick={handleClose}>×</button>
          </div>
          <div className="ticket-purchase-body error">
            <p>{error}</p>
            <button className="btn-primary" onClick={handleClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ticket-purchase-modal">
      <div className="ticket-purchase-content">
        <div className="ticket-purchase-header">
          <h2>{purchaseStep === 'success' ? 'Purchase Confirmation' : 'Purchase Tickets'}</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>
        
        <div className="ticket-purchase-body">
          {purchaseStep === 'select' && (
            <>
              <div className="event-name-header">
                <h3>{eventName}</h3>
              </div>
              
              <div className="ticket-types-list">
                {tickets.map(ticket => (
                  <div 
                    key={ticket.ticket_type_id} 
                    className={`ticket-type-card ${selectedTicket?.ticket_type_id === ticket.ticket_type_id ? 'selected' : ''}`}
                    onClick={() => handleTicketSelect(ticket)}
                  >
                    <div className="ticket-type-header">
                      <h4>{ticket.type_name}</h4>
                      <span className="ticket-price">${(Number(ticket.price) || 0).toFixed(2)}</span>
                    </div>
                    
                    <div className="ticket-type-description">
                      <p>{ticket.description}</p>
                      
                      {ticket.benefits && (
                        <div className="ticket-benefits">
                          <h5>Benefits:</h5>
                          <ul>
                            {Array.isArray(ticket.benefits) 
                              ? ticket.benefits.map((benefit, index) => (
                                  <li key={index}>{benefit}</li>
                                ))
                              : ticket.benefits.split(',').map((benefit, index) => (
                                  <li key={index}>{benefit.trim()}</li>
                                ))
                            }
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    <div className="ticket-availability">
                      <span>
                        {ticket.quantity_available - ticket.quantity_sold} remaining
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              {selectedTicket && (
                <div className="ticket-quantity">
                  <label htmlFor="quantity">Quantity:</label>
                  <div className="quantity-selector">
                    <button 
                      onClick={() => quantity > 1 && setQuantity(quantity - 1)}
                      disabled={quantity <= 1}
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      id="quantity" 
                      min="1" 
                      max="10"
                      value={quantity} 
                      onChange={handleQuantityChange} 
                    />
                    <button 
                      onClick={() => quantity < 10 && setQuantity(quantity + 1)}
                      disabled={quantity >= 10 || quantity >= (selectedTicket.quantity_available - selectedTicket.quantity_sold)}
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
              
              <div className="ticket-actions">
                <button className="btn-cancel" onClick={handleClose}>Cancel</button>
                <button 
                  className="btn-primary" 
                  onClick={handleContinue}
                  disabled={!selectedTicket}
                >
                  Continue
                </button>
              </div>
            </>
          )}
          
          {purchaseStep === 'review' && (
            <>
              <div className="purchase-review">
                <h3>Review Your Order</h3>
                
                <div className="order-summary">
                  <div className="order-item">
                    <span>Event:</span>
                    <span>{eventName}</span>
                  </div>
                  
                  <div className="order-item">
                    <span>Ticket Type:</span>
                    <span>{selectedTicket.type_name}</span>
                  </div>
                  
                  <div className="order-item">
                    <span>Quantity:</span>
                    <span>{quantity}</span>
                  </div>
                  
                  <div className="order-item">
                    <span>Price per Ticket:</span>
                    <span>${(Number(selectedTicket.price) || 0).toFixed(2)}</span>
                  </div>
                  
                  <div className="order-item total">
                    <span>Total:</span>
                    <span>${((Number(selectedTicket.price) || 0) * quantity).toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="payment-info">
                  <h4>Payment Information</h4>
                  <p className="payment-note">
                    Note: This is a demo application. No actual payment will be processed.
                    Your ticket will be marked as "paid" automatically.
                  </p>
                </div>
                
                <div className="purchase-actions">
                  <button className="btn-secondary" onClick={handleBack}>Back</button>
                  <button 
                    className="btn-primary" 
                    onClick={handlePurchase}
                  >
                    Complete Purchase
                  </button>
                </div>
              </div>
            </>
          )}
          
          {purchaseStep === 'success' && purchaseData && (
            <>
              <div className="purchase-success">
                <div className="success-icon">
                  <i className="fas fa-check-circle"></i>
                </div>
                
                <h3>Thank You for Your Purchase!</h3>
                
                <div className="ticket-details">
                  <div className="ticket-detail-item">
                    <span>Event:</span>
                    <span>{eventName}</span>
                  </div>
                  
                  <div className="ticket-detail-item">
                    <span>Ticket Type:</span>
                    <span>{purchaseData.ticket_type}</span>
                  </div>
                  
                  <div className="ticket-detail-item">
                    <span>Quantity:</span>
                    <span>{purchaseData.quantity}</span>
                  </div>
                  
                  <div className="ticket-detail-item">
                    <span>Total Paid:</span>
                    <span>${(Number(purchaseData.total_amount) || 0).toFixed(2)}</span>
                  </div>
                  
                  <div className="ticket-detail-item">
                    <span>Order ID:</span>
                    <span>{purchaseData.registration_id}</span>
                  </div>
                </div>
                
                <div className="qr-code-container">
                  <h4>Your Ticket QR Code</h4>
                  <div className="qr-code">
                    <QRCode 
                      value={purchaseData.qr_code} 
                      size={180} 
                      level="H"
                    />
                  </div>
                  <p className="qr-code-text">
                    Code: {purchaseData.qr_code}
                  </p>
                </div>
                
                <div className="email-notification">
                  <i className="fas fa-envelope"></i>
                  <p>A confirmation email has been sent to your registered email address.</p>
                </div>
                
                <div className="success-actions">
                  <button className="btn-secondary" onClick={() => window.print()}>
                    <i className="fas fa-print"></i> Print Ticket
                  </button>
                  <button className="btn-primary" onClick={handleClose}>
                    Done
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      {renderNotification()}
    </div>
  );
};

export default TicketPurchase;
