import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './css/ForgotPassword.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      // Simulate API call
      setTimeout(() => {
        setIsEmailSent(true);
        setMessage('Password reset instructions have been sent to your email.');
        setIsLoading(false);
      }, 1500);
      
      // Handle forgot password logic here
      console.log('Password reset requested for:', email);
    } catch (error) {
      setMessage('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  const handleResendEmail = () => {
    setIsEmailSent(false);
    setMessage('');
    handleSubmit({ preventDefault: () => {} });
  };

  return (
    <div className="forgot-password-container">
      {/* Back Button */}
      <Link to="/login" className="back-btn">
        <i className="fas fa-arrow-left"></i>
        Back to Login
      </Link>

      <div className="forgot-password-content">
        {/* Left Side - Form */}
        <div className="fp-form-section">
          <div className="fp-form-wrapper">
            {!isEmailSent ? (
              <>
                {/* Header */}
                <div className="fp-form-header">
                  <div className="fp-icon-container">
                    <i className="fas fa-lock"></i>
                  </div>
                  <h1 className="fp-title">Forgot Password?</h1>
                  <p className="fp-subtitle">
                    No worries! Enter your email address and we'll send you instructions to reset your password.
                  </p>
                </div>

                {/* Form */}
                <form className="fp-forgot-password-form" onSubmit={handleSubmit}>
                  <div className="fp-form-group">
                    <label htmlFor="email" className="fp-form-label">
                      <i className="fas fa-envelope"></i>
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      className="fp-form-input"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  {message && (
                    <div className={`fp-message ${isEmailSent ? 'success' : 'error'}`}>
                      <i className={`fas ${isEmailSent ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                      {message}
                    </div>
                  )}

                  <button 
                    type="submit" 
                    className="fp-submit-btn"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Sending...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane"></i>
                        Send Reset Instructions
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <>
                {/* Success State */}
                <div className="fp-form-header">
                  <div className="fp-icon-container success">
                    <i className="fas fa-check"></i>
                  </div>
                  <h1 className="fp-title">Check Your Email</h1>
                  <p className="fp-subtitle">
                    We've sent password reset instructions to <strong>{email}</strong>
                  </p>
                </div>

                <div className="fp-success-actions">
                  <div className="fp-info-box">
                    <i className="fas fa-info-circle"></i>
                    <p>
                      Didn't receive the email? Check your spam folder or try again with a different email address.
                    </p>
                  </div>

                  <button 
                    type="button" 
                    className="fp-resend-btn"
                    onClick={handleResendEmail}
                  >
                    <i className="fas fa-redo"></i>
                    Resend Email
                  </button>
                </div>
              </>
            )}

            {/* Footer Links */}
            <div className="fp-form-footer">
              <p>
                Remember your password? 
                <Link to="/login">
                  <i className="fas fa-sign-in-alt"></i>
                  Sign In
                </Link>
              </p>
              <p>
                Don't have an account? 
                <Link to="/signup">
                  <i className="fas fa-user-plus"></i>
                  Sign Up
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Image/Info */}
        <div className="fp-image-section">
          <div className="fp-image-overlay">
            <div className="fp-overlay-content">
              <h2>Secure & Simple</h2>
              <p>
                Your security is our priority. We use industry-standard encryption 
                to protect your account and personal information.
              </p>
              
              <div className="fp-security-features">
                <div className="fp-feature-item">
                  <i className="fas fa-shield-alt"></i>
                  <span>Bank-level Security</span>
                </div>
                <div className="fp-feature-item">
                  <i className="fas fa-clock"></i>
                  <span>Quick Recovery</span>
                </div>
                <div className="fp-feature-item">
                  <i className="fas fa-user-shield"></i>
                  <span>Privacy Protected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
