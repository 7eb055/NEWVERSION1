import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './css/Login.css';
import axios from 'axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const validateForm = () => {
    // Clear previous error
    setError('');

    // Check required fields
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!password) {
      setError('Password is required');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Prepare data for backend
      const loginData = {
        email: email.trim(),
        password: password
      };

      // Make API request
      const response = await axios.post('http://localhost:5000/api/login', loginData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Handle success
      if (response.data.token) {
        // Store token and user data in localStorage
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        alert('Login successful! Welcome back.');
        
        // Reset form
        setEmail('');
        setPassword('');
        setRole('');

        // Redirect based on user role or to dashboard
       
          


        // You can add navigation here if using react-router
        console.log('Login successful:', response.data);
        
        // Example: Redirect to different pages based on role
        // if (response.data.user.role === 'organizer') {
        //   navigate('/organizer-dashboard');
        // } else {
        //   navigate('/dashboard');
        // }
      }

    } catch (error) {
      console.error('Login error:', error);
      
      if (error.response) {
        // Server responded with error status
        if (error.response.status === 401) {
          setError('Invalid email or password. Please try again.');
        } else {
          setError(error.response.data.message || 'Login failed. Please try again.');
        }
      } else if (error.request) {
        // Request was made but no response received
        setError('Unable to connect to server. Please check your internet connection.');
      } else {
        // Something else happened
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Form Section - Left Side */}
      <div className="login-form-section">
        <Link to="/" className="back-home-btn">
          <i className="fas fa-arrow-left"></i>
          Back to Home
        </Link>

        <div className="form-content">
          <div className="welcome-section">
            <h1 className="welcome-title">Welcome Back</h1>
            <p className="welcome-subtitle">
              Sign in to your account to continue
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {/* Error Message */}
            {error && (
              <div className="error-message" style={{
                backgroundColor: '#fee',
                color: '#c33',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '20px',
                border: '1px solid #fcc'
              }}>
                <i className="fas fa-exclamation-triangle"></i> {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                <i className="fas fa-envelope"></i>
                Email Address
              </label>
              <input
                type="email"
                id="email"
                className="form-input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                <i className="fas fa-lock"></i>
                Password
              </label>
              <div className="password-input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="role" className="form-label">
                <i className="fas fa-user-tag"></i>
                Role
              </label>
              <select
                id="role"
                className="form-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              >
                <option value="">Select your role</option>
                <option value="organizer">Event Organizer</option>
                <option value="attendee">Attendee</option>
                <option value="vendor">Vendor</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div className="form-options">
              <Link to='/forget-password' className="forgot-password">
                <i className="fas fa-question-circle"></i>
                Forgot Password?
              </Link>
            </div>

            <button 
              type="submit" 
              className="login-btn"
              disabled={isLoading}
              style={{
                opacity: isLoading ? 0.7 : 1,
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Signing In...
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt"></i>
                  Sign In
                </>
              )}
            </button>

            <div className="signup-link">
              <p>
                Don't have an account? 
                <Link to="/signup">
                  <i className="fas fa-user-plus"></i>
                  Sign up here
                </Link>
              </p>
            </div>
          </form>

          <div className="copyright">
            <i className="fas fa-copyright"></i>
            2023 ALL RIGHTS RESERVED
          </div>
        </div>
      </div>

      {/* Image Section - Right Side */}
      <div className="login-image-section">
        <div className="image-overlay">
          <div className="overlay-content">
            <h2>Join Our Community</h2>
            <p>Connect with amazing events and people around the world</p>
            <div className="feature-list">
              <div className="feature-item">
                <i className="fas fa-calendar-alt"></i>
                <span>Discover Events</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-users"></i>
                <span>Connect with People</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-star"></i>
                <span>Create Memories</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;