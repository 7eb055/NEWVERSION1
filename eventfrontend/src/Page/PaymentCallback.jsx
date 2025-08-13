import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import AuthTokenService from '../services/AuthTokenService';

const PaymentCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Verifying your payment...');
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const reference = searchParams.get('reference');
        const trxref = searchParams.get('trxref');
        
        if (!reference && !trxref) {
          setStatus('error');
          setMessage('Payment reference not found');
          return;
        }

        const paymentReference = reference || trxref;
        const token = AuthTokenService.getToken();

        if (!token) {
          setStatus('error');
          setMessage('Authentication required. Please log in again.');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Verify payment with backend
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/payments/verify/${paymentReference}`,
          {},
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (response.data.success) {
          setStatus('success');
          setMessage('Payment verified successfully!');
          setPaymentData(response.data.data);
          
          // Redirect to attendee dashboard after 3 seconds
          setTimeout(() => {
            navigate('/attendee-dashboard');
          }, 3000);
        } else {
          setStatus('failed');
          setMessage('Payment verification failed');
        }

      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('error');
        setMessage('An error occurred while verifying your payment');
      }
    };

    verifyPayment();
  }, [searchParams, navigate]);

  const handleReturnToDashboard = () => {
    navigate('/attendee-dashboard');
  };

  const handleTryAgain = () => {
    navigate(-1); // Go back to previous page
  };

  return (
    <div className="payment-callback-container">
      <div className="payment-callback-content">
        {status === 'verifying' && (
          <div className="verification-state">
            <div className="spinner"></div>
            <h2>Verifying Payment</h2>
            <p>{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="success-state">
            <div className="success-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <h2>Payment Successful!</h2>
            <p>{message}</p>
            
            {paymentData && (
              <div className="payment-details">
                <div className="detail-item">
                  <span>Amount Paid:</span>
                  <span>GH₵{paymentData.amount?.toFixed(2)}</span>
                </div>
                <div className="detail-item">
                  <span>Registration ID:</span>
                  <span>{paymentData.registration_id}</span>
                </div>
                {paymentData.qr_code && (
                  <div className="detail-item">
                    <span>QR Code:</span>
                    <span>{paymentData.qr_code}</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="callback-actions">
              <button className="btn-primary" onClick={handleReturnToDashboard}>
                Go to Dashboard
              </button>
            </div>
          </div>
        )}

        {(status === 'failed' || status === 'error') && (
          <div className="error-state">
            <div className="error-icon">
              <i className="fas fa-times-circle"></i>
            </div>
            <h2>Payment {status === 'failed' ? 'Failed' : 'Error'}</h2>
            <p>{message}</p>
            
            <div className="callback-actions">
              <button className="btn-secondary" onClick={handleTryAgain}>
                Try Again
              </button>
              <button className="btn-primary" onClick={handleReturnToDashboard}>
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentCallback;
