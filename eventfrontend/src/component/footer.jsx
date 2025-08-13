import React from 'react';
import './css/footer.css';

const Footer = () => {
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
              <li><a href="/">Home</a></li>
              <li><a href="/events">Browse Events</a></li>
              <li><a href="/dashboard">Dashboard</a></li>
              <li><a href="/profile">Profile</a></li>
            </ul>
          </div>

          {/* Account Links */}
          <div className="footer-column">
            <h4 className="footer-title">Account</h4>
            <ul className="footer-links">
              <li><a href="/login">Login</a></li>
              <li><a href="/register">Sign Up</a></li>
              <li><a href="/tickets">My Tickets</a></li>
              <li><a href="/settings">Settings</a></li>
            </ul>
          </div>

          {/* Support Links */}
          <div className="footer-column">
            <h4 className="footer-title">Support</h4>
            <ul className="footer-links">
              <li><a href="/help">Help Center</a></li>
              <li><a href="/contact">Contact Us</a></li>
              <li><a href="/privacy">Privacy Policy</a></li>
              <li><a href="/terms">Terms of Service</a></li>
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