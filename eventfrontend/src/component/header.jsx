import React, { useState, useEffect } from "react";
import { Link, useNavigate } from 'react-router-dom';
import './css/header.css'
import AuthTokenService from '../services/AuthTokenService';

import { useLocation } from 'react-router-dom';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Check authentication status on component mount and location changes
  useEffect(() => {
    const checkAuthStatus = () => {
      const authStatus = AuthTokenService.isAuthenticated();
      const userData = AuthTokenService.getUser();
      
      setIsAuthenticated(authStatus);
      setUser(userData);
    };

    checkAuthStatus();
    
    // Re-check auth status when location changes (for real-time updates)
    const interval = setInterval(checkAuthStatus, 1000);
    
    return () => clearInterval(interval);
  }, [location]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isProfileDropdownOpen && !event.target.closest('.user-menu')) {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileDropdownOpen]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const handleLogout = () => {
    AuthTokenService.logout(navigate);
    setIsProfileDropdownOpen(false);
  };

  const getUserDisplayName = () => {
    if (!user) return 'User';
    
    // Try to get username from user data (based on eventsql schema)
    if (user.username) {
      return user.username;
    }
    
    // Fallback to name field for backward compatibility
    if (user.name) {
      return user.name;
    }
    
    if (user.email) {
      return user.email.split('@')[0];
    }
    
    return 'User';
  };

  const getUserRole = () => {
    if (!user) return '';
    
    return user.primary_role || (user.roles && user.roles[0]?.role) || 'attendee';
  };

  // Hide auth buttons on eventdetails page
  const hideAuth = location.pathname === '/eventdetails';

  return (
    <header className="header">
      <div className="logo">
        <i className="fas fa-calendar-alt"></i>
        Eventify
      </div>
      <button className="menu-toggle" onClick={toggleMenu}>
        <i className={isMenuOpen ? 'fas fa-times' : 'fas fa-bars'}></i>
      </button>
      <nav className={isMenuOpen ? 'active' : ''}>
        <Link to="/" className="nav-link">
          <i className="fas fa-home"></i>
          Home
        </Link>
        <a href="#" className="nav-link">
          <i className="fas fa-info-circle"></i>
          About Event
        </a>
        <a href="#" className="nav-link">
          <i className="fas fa-microphone"></i>
          Speakers
        </a>
        <a href="#" className="nav-link">
          <i className="fas fa-clock"></i>
          Schedule
        </a>
        <a href="#" className="nav-link">
          <i className="fas fa-calendar"></i>
          Events
        </a>
        <a href="#" className="nav-link">
          <i className="fas fa-file-alt"></i>
          Pages
        </a>
      </nav>
      {!hideAuth && (
        <div className="auth-section">
          {isAuthenticated ? (
            <div className="user-menu">
              <button 
                className="user-profile-btn" 
                onClick={toggleProfileDropdown}
                aria-expanded={isProfileDropdownOpen}
              >
                <div className="user-avatar">
                  <i className="fas fa-user"></i>
                </div>
                <div className="user-info">
                  <span className="user-name">{getUserDisplayName()}</span>
                  <span className="user-role">{getUserRole()}</span>
                </div>
                <i className={`fas fa-chevron-down dropdown-arrow ${isProfileDropdownOpen ? 'open' : ''}`}></i>
              </button>
              
              {isProfileDropdownOpen && (
                <div className="profile-dropdown">
                  <div className="dropdown-header">
                    <div className="user-avatar-large">
                      <i className="fas fa-user"></i>
                    </div>
                    <div className="user-details">
                      <h4>{getUserDisplayName()}</h4>
                      <p>{user?.email}</p>
                      <span className="role-badge">{getUserRole()}</span>
                    </div>
                  </div>
                  
                  <div className="dropdown-divider"></div>
                  
                  <div className="dropdown-menu">
                    <Link to="/profile" className="dropdown-item" onClick={() => setIsProfileDropdownOpen(false)}>
                      <i className="fas fa-user-edit"></i>
                      My Profile
                    </Link>
                    <Link to="/dashboard" className="dropdown-item" onClick={() => setIsProfileDropdownOpen(false)}>
                      <i className="fas fa-tachometer-alt"></i>
                      Dashboard
                    </Link>
                    <Link to="/settings" className="dropdown-item" onClick={() => setIsProfileDropdownOpen(false)}>
                      <i className="fas fa-cog"></i>
                      Settings
                    </Link>
                    
                    <div className="dropdown-divider"></div>
                    
                    <button className="dropdown-item logout-btn" onClick={handleLogout}>
                      <i className="fas fa-sign-out-alt"></i>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="login-btn-header">
                <i className="fas fa-sign-in-alt"></i>
                Login
              </Link>
              <Link to="/signup" className="signup-btn-header">
                <i className="fas fa-user-plus"></i>
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

export default Header;