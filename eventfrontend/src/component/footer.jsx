import React from 'react';
import { Link } from 'react-router-dom';
import AuthTokenService from '../services/AuthTokenService';
import './css/footer.css';

const Footer = () => {
  // Helper function to get the appropriate dashboard route based on user role
  const getDashboardRoute = () => {
    return AuthTokenService.getDashboardRoute() || '/attendee-dashboard';
  };

  return (
    <footer className="footer-section">
      <div className="footer-content">
        <div className="footer-container">
          {/* App Logo and Description */}
          <div className="footer-column">
            <div className="logo-section">
              <h3 className="app-logo">🎯 Eventify</h3>
              <p className="app-description">
                Your all-in-one event management platform
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="footer-column">
            <h4 className="footer-title">Navigation</h4>
            <ul className="footer-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/eventslist">Browse Events</Link></li>
              <li><Link to={getDashboardRoute()}>Dashboard</Link></li>
              <li><Link to="/about">About Us</Link></li>
            </ul>
          </div>

          {/* Account Links */}
          <div className="footer-column">
            <h4 className="footer-title">Account</h4>
            <ul className="footer-links">
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/signup">Sign Up</Link></li>
              <li><Link to="/profile">Profile</Link></li>
              <li><Link to="/settings">Settings</Link></li>
            </ul>
          </div>

          {/* Support Links */}
          <div className="footer-column">
            <h4 className="footer-title">Support</h4>
            <ul className="footer-links">
              <li><a href="mailto:support@eventify.com">Email Support</a></li>
              <li><a href="tel:+1234567890">Call Support</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="footer-bottom">
        <div className="footer-container">
          <p className="copyright">
            © 2025 Eventify. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;