import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './css/Login.css';
import AuthTokenService from '../services/AuthTokenService';
import apiService from '../services/ApiService';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if user is already authenticated
  useEffect(() => {
    if (AuthTokenService.isAuthenticated()) {
      console.log('User already authenticated, redirecting to dashboard...');
      const dashboardRoute = AuthTokenService.getDashboardRoute();
      navigate(dashboardRoute, { replace: true });
    }
  }, [navigate]);

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
      // Use ApiService for login
      const result = await apiService.login(email.trim(), password);

      if (result.success && result.data.token) {
        console.log('Login successful:', result.data);
        
        // Store authentication data using AuthTokenService
        const authStored = AuthTokenService.setAuthData(result.data.token, result.data.user);
        
        if (!authStored) {
          setError('Failed to store authentication data. Please try again.');
          return;
        }
        
        // Get the appropriate dashboard route based on user role
        const dashboardRoute = AuthTokenService.getDashboardRoute();
        
        console.log('User role:', AuthTokenService.getUserRole());
        console.log('Redirecting to:', dashboardRoute);
        
        // Reset form
        setEmail('');
        setPassword('');
        
        // Clear any existing errors
        setError('');
        
        // Redirect to the appropriate dashboard
        navigate(dashboardRoute, { replace: true });
      } else {
        setError(result.error || 'Login failed. Please check your credentials and try again.');
      }

    } catch (error) {
      console.error('Login error:', error);
      
      // ApiService already handles the error formatting
      if (error.response) {
        const errorData = error.response.data;
        
        if (error.response.status === 401) {
          if (errorData.message?.includes('verify') || errorData.requiresVerification) {
            setError('Please verify your email before logging in. Check your inbox for the verification link.');
          } else {
            setError('Invalid email or password. Please try again.');
          }
        } else if (error.response.status === 400) {
          setError(errorData.message || 'Please check your input and try again.');
        } else {
          setError(errorData.message || 'Login failed. Please try again.');
        }
      } else if (error.request) {
        setError('Unable to connect to server. Please check your internet connection and try again.');
      } else {
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
              <div className="error-message">
                {error}
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

            <div className="form-options">
              <Link to='/forgot-password' className="forgot-password">
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