import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config/api';
import './css/EmailVerification.css';

const API_BASE_URL = API_URL;

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const [verificationStatus, setVerificationStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setVerificationStatus('error');
        setMessage('Invalid verification link. No token provided.');
        setIsLoading(false);
        return;
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/verify-email`, {
          token: token
        });
        
        if (response.data.verified) {
          setVerificationStatus('success');
          setMessage(response.data.message || 'Email verified successfully!');
        } else {
          setVerificationStatus('error');
          setMessage(response.data.message || 'Email verification failed. Please try again.');
        }
      } catch (error) {
        console.error('Email verification error:', error);
        setVerificationStatus('error');
        
        if (error.response) {
          // Check if this is an "already verified" case
          if (error.response.data.alreadyVerified) {
            setVerificationStatus('success');
            setMessage(error.response.data.message || 'Email is already verified! You can proceed to login.');
          } else {
            setMessage(error.response.data.message || 'Email verification failed.');
          }
        } else if (error.request) {
          setMessage('Unable to connect to server. Please check your internet connection.');
        } else {
          setMessage('An unexpected error occurred during verification.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    verifyEmail();
  }, [searchParams]);

  const handleResendVerification = async () => {
    const email = prompt('Please enter your email address to resend verification:');
    
    if (!email) return;

    try {
      setIsLoading(true);
      const _response = await axios.post(`${API_BASE_URL}/auth/resend-verification`, {
        email: email
      });

      alert('Verification email sent successfully! Please check your inbox.');
    } catch (error) {
      console.error('Resend verification error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to resend verification email.';
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="verification-container">
      <div className="verification-card">
        <div className="verification-header">
          <div className={`verification-icon ${verificationStatus}`}>
            {isLoading && <i className="fas fa-spinner fa-spin"></i>}
            {!isLoading && verificationStatus === 'success' && <i className="fas fa-check-circle"></i>}
            {!isLoading && verificationStatus === 'error' && <i className="fas fa-times-circle"></i>}
          </div>
          
          <h1 className="verification-title">
            {isLoading && 'Verifying Your Email...'}
            {!isLoading && verificationStatus === 'success' && 'Email Verified!'}
            {!isLoading && verificationStatus === 'error' && 'Verification Failed'}
          </h1>
        </div>

        <div className="verification-content">
          <p className="verification-message">
            {isLoading && 'Please wait while we verify your email address...'}
            {!isLoading && message}
          </p>

          {!isLoading && (
            <div className="verification-actions">
              {verificationStatus === 'success' && (
                <div className="success-actions">
                  <Link to="/login" className="btn btn-primary">
                    <i className="fas fa-sign-in-alt"></i>
                    Go to Login
                  </Link>
                  <Link to="/" className="btn btn-secondary">
                    <i className="fas fa-home"></i>
                    Back to Home
                  </Link>
                </div>
              )}

              {verificationStatus === 'error' && (
                <div className="error-actions">
                  <button 
                    onClick={handleResendVerification} 
                    className="btn btn-primary"
                    disabled={isLoading}
                  >
                    <i className="fas fa-envelope"></i>
                    Resend Verification Email
                  </button>
                  <Link to="/signup" className="btn btn-secondary">
                    <i className="fas fa-user-plus"></i>
                    Create New Account
                  </Link>
                  <Link to="/" className="btn btn-outline">
                    <i className="fas fa-home"></i>
                    Back to Home
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="verification-footer">
          <p>
            Need help? <a href="mailto:support@eventmanagement.com">Contact Support</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
