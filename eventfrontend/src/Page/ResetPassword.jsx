import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './css/ResetPassword.css';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: ''
  });

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (!tokenFromUrl) {
      setError('Invalid reset link. No token provided.');
    } else {
      setToken(tokenFromUrl);
    }
  }, [searchParams]);

  const validatePasswordStrength = (password) => {
    let score = 0;
    let feedback = [];

    if (password.length >= 8) score++;
    else feedback.push('at least 8 characters');

    if (/[A-Z]/.test(password)) score++;
    else feedback.push('one uppercase letter');

    if (/[a-z]/.test(password)) score++;
    else feedback.push('one lowercase letter');

    if (/\d/.test(password)) score++;
    else feedback.push('one number');

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
    else feedback.push('one special character');

    const strength = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][score];
    const feedbackText = feedback.length > 0 ? `Needs: ${feedback.join(', ')}` : 'Strong password!';

    return { score, strength, feedback: feedbackText };
  };

  const handlePasswordChange = (e) => {
    const password = e.target.value;
    setNewPassword(password);
    setPasswordStrength(validatePasswordStrength(password));
    if (error) setError('');
  };

  const validateForm = () => {
    setError('');

    if (!token) {
      setError('Invalid reset token');
      return false;
    }

    if (!newPassword) {
      setError('New password is required');
      return false;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const resetData = {
        token: token,
        newPassword: newPassword
      };

      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/auth/reset-password`, resetData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setIsSuccess(true);
        setMessage(response.data.message || 'Password reset successfully!');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }

    } catch (error) {
      console.error('Password reset error:', error);
      
      if (error.response) {
        setError(error.response.data.message || 'Failed to reset password. Please try again.');
      } else if (error.request) {
        setError('Unable to connect to server. Please check your internet connection.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!token && !error) {
    return (
      <div className="reset-password-container">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-container">
      {/* Back Button */}
      <Link to="/login" className="back-btn">
        <i className="fas fa-arrow-left"></i>
        Back to Login
      </Link>

      <div className="reset-password-content">
        {/* Left Side - Form */}
        <div className="rp-form-section">
          <div className="rp-form-wrapper">
            {!isSuccess ? (
              <>
                {/* Header */}
                <div className="rp-form-header">
                  <div className="rp-icon-container">
                    <i className="fas fa-key"></i>
                  </div>
                  <h1 className="rp-title">Reset Your Password</h1>
                  <p className="rp-subtitle">
                    Enter your new password below. Make sure it's strong and memorable.
                  </p>
                </div>

                {/* Form */}
                <form className="rp-reset-password-form" onSubmit={handleSubmit}>
                  <div className="rp-form-group">
                    <label htmlFor="newPassword" className="rp-form-label">
                      <i className="fas fa-lock"></i>
                      New Password
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      className="rp-form-input"
                      placeholder="Enter your new password"
                      value={newPassword}
                      onChange={handlePasswordChange}
                      required
                      disabled={isLoading}
                    />
                    {newPassword && (
                      <div className={`password-strength strength-${passwordStrength.score}`}>
                        <div className="strength-bar">
                          <div 
                            className="strength-fill" 
                            style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                          ></div>
                        </div>
                        <p className="strength-text">{passwordStrength.feedback}</p>
                      </div>
                    )}
                  </div>

                  <div className="rp-form-group">
                    <label htmlFor="confirmPassword" className="rp-form-label">
                      <i className="fas fa-lock"></i>
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      className="rp-form-input"
                      placeholder="Confirm your new password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (error) setError('');
                      }}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  {error && (
                    <div className="rp-message error">
                      <i className="fas fa-exclamation-circle"></i>
                      {error}
                    </div>
                  )}

                  <button 
                    type="submit" 
                    className="rp-submit-btn"
                    disabled={isLoading || !token}
                  >
                    {isLoading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Resetting Password...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check"></i>
                        Reset Password
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <>
                {/* Success State */}
                <div className="rp-form-header">
                  <div className="rp-icon-container success">
                    <i className="fas fa-check"></i>
                  </div>
                  <h1 className="rp-title">Password Reset Successfully!</h1>
                  <p className="rp-subtitle">
                    Your password has been updated. You can now log in with your new password.
                  </p>
                </div>

                <div className="rp-success-actions">
                  {message && (
                    <div className="rp-message success">
                      <i className="fas fa-check-circle"></i>
                      {message}
                    </div>
                  )}

                  <Link to="/login" className="rp-login-btn">
                    <i className="fas fa-sign-in-alt"></i>
                    Go to Login
                  </Link>

                  <p className="redirect-notice">
                    You will be automatically redirected to the login page in a few seconds...
                  </p>
                </div>
              </>
            )}

            {/* Footer Links */}
            <div className="rp-form-footer">
              <p>
                Remember your password? 
                <Link to="/login">
                  <i className="fas fa-sign-in-alt"></i>
                  Sign In
                </Link>
              </p>
              <p>
                Need help? 
                <Link to="/forgot-password">
                  <i className="fas fa-question-circle"></i>
                  Request New Reset Link
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Image/Info */}
        <div className="rp-image-section">
          <div className="rp-image-overlay">
            <div className="rp-overlay-content">
              <h2>Secure Password Guidelines</h2>
              <p>
                Create a strong password to keep your account secure.
              </p>
              
              <div className="rp-security-tips">
                <div className="rp-tip-item">
                  <i className="fas fa-check"></i>
                  <span>At least 8 characters long</span>
                </div>
                <div className="rp-tip-item">
                  <i className="fas fa-check"></i>
                  <span>Mix of uppercase and lowercase letters</span>
                </div>
                <div className="rp-tip-item">
                  <i className="fas fa-check"></i>
                  <span>Include numbers and special characters</span>
                </div>
                <div className="rp-tip-item">
                  <i className="fas fa-check"></i>
                  <span>Avoid common words or personal info</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
