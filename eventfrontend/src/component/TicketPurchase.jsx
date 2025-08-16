import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import AuthTokenService from '../services/AuthTokenService';
import { getErrorMessage, handleAuthError } from '../utils/errorHandling';
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
        const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${eventId}/ticket-types/public`);
        
        if (response.data && response.data.ticketTypes) {
          setTickets(response.data.ticketTypes);
        } else {
          setTickets([]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching ticket types:', err);
        const errorMessage = getErrorMessage(err, 'Failed to load ticket types. Please try again later.');
        setError(errorMessage);
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
      
      const token = getAuthToken();
      if (!token) return;

      // Initialize payment with Paystack
      const paymentResponse = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/payments/initialize`, {
        event_id: eventId,
        ticket_type_id: selectedTicket.ticket_type_id,
        ticket_quantity: quantity
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (paymentResponse.data && paymentResponse.data.success) {
        const { authorization_url, reference } = paymentResponse.data.data;
        
        // Open Paystack payment popup or redirect
        const paymentWindow = window.open(
          authorization_url,
          'paystack_payment',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        // Listen for payment completion
        const checkPaymentStatus = setInterval(async () => {
          if (paymentWindow.closed) {
            clearInterval(checkPaymentStatus);
            setLoading(false);
            
            // Check payment status
            try {
              const statusResponse = await axios.get(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/payments/status/${reference}`,
                {
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                }
              );
              
              if (statusResponse.data.success && statusResponse.data.data.status === 'success') {
                // Payment successful - show success page
                const purchaseResponse = {
                  registration_id: statusResponse.data.data.registration_id,
                  event_id: eventId,
                  event_name: statusResponse.data.data.event_name || eventName,
                  ticket_type: statusResponse.data.data.ticket_type || selectedTicket.type_name,
                  quantity: statusResponse.data.data.quantity || quantity,
                  total_amount: statusResponse.data.data.amount,
                  payment_status: 'success',
                  qr_code: statusResponse.data.data.qr_code,
                  created_at: statusResponse.data.data.paid_at
                };
                
                setPurchaseData(purchaseResponse);
                setPurchaseStep('success');
                
                setNotification({
                  type: 'success',
                  message: 'Payment successful! Your ticket has been purchased.'
                });
              } else {
                // Payment failed or cancelled
                setNotification({
                  type: 'error',
                  message: 'Payment was not completed. Please try again.'
                });
              }
            } catch (error) {
              console.error('Error checking payment status:', error);
              const errorMessage = getErrorMessage(error, 'Unable to verify payment status. Please contact support.');
              setNotification({
                type: 'error',
                message: errorMessage
              });
            }
          }
        }, 1000);

        // Timeout after 5 minutes
        setTimeout(() => {
          if (!paymentWindow.closed) {
            clearInterval(checkPaymentStatus);
            paymentWindow.close();
            setLoading(false);
            setNotification({
              type: 'error',
              message: 'Payment session timed out. Please try again.'
            });
          }
        }, 300000); // 5 minutes

      } else {
        throw new Error('Failed to initialize payment');
      }
      
    } catch (err) {
      console.error('Error initiating payment:', err);
      
      // Handle authentication errors
      const authErrorMessage = handleAuthError(err);
      if (authErrorMessage) {
        setLoading(false);
        return; // handleAuthError redirects for auth issues
      }
      
      // Handle other errors with consistent messaging
      const errorMessage = getErrorMessage(err, 'Failed to initiate payment. Please try again.');
      
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
                      <span className="ticket-price">GH₵{(Number(ticket.price) || 0).toFixed(2)}</span>
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
                    <span>GH₵{(Number(selectedTicket.price) || 0).toFixed(2)}</span>
                  </div>
                  
                  <div className="order-item total">
                    <span>Total:</span>
                    <span>GH₵{((Number(selectedTicket.price) || 0) * quantity).toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="payment-info">
                  <h4>Payment Information</h4>
                  <p className="payment-note">
                    Payment will be processed securely through Paystack. 
                    We accept credit/debit cards, bank transfers, and mobile money payments.
                    You will be redirected to Paystack's secure payment page.
                  </p>
                  <div className="payment-methods">
                    <small>
                      <i className="fas fa-shield-alt"></i> Secure payment powered by Paystack
                    </small>
                  </div>
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
                    <span>GH₵{(Number(purchaseData.total_amount) || 0).toFixed(2)}</span>
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
                  <i className="fas fa-check-circle"></i>
                  <p>Your payment has been processed successfully via Paystack. Keep this ticket for event entry.</p>
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
