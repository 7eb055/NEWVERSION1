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

  const getDashboardRoute = () => {
    return AuthTokenService.getDashboardRoute();
  };

  const getRoleSpecificLinks = () => {
    const userRole = getUserRole();
    
    const commonLinks = [
      { to: "/", icon: "fas fa-home", text: "Home" },
      { to: "/eventslist", icon: "fas fa-calendar", text: "Events" }
    ];

    const roleLinks = {
      admin: [
        { to: "/admin-dashboard", icon: "fas fa-tachometer-alt", text: "Dashboard" },
        { to: "/admin-dashboard", icon: "fas fa-users-cog", text: "User Management" },
        { to: "/admin-dashboard", icon: "fas fa-chart-bar", text: "Analytics" },
        { to: "/admin-dashboard", icon: "fas fa-cog", text: "System Settings" }
      ],
      organizer: [
        { to: "/organizer-dashboard", icon: "fas fa-tachometer-alt", text: "Dashboard" },
        { to: "/organizer-dashboard", icon: "fas fa-plus-circle", text: "Create Event" },
        { to: "/organizer-dashboard", icon: "fas fa-calendar-check", text: "My Events" },
        { to: "/organizer-dashboard", icon: "fas fa-users", text: "Attendees" },
        { to: "/organizer-dashboard", icon: "fas fa-chart-line", text: "Analytics" }
      ],
      attendee: [
        { to: "/attendee-dashboard", icon: "fas fa-tachometer-alt", text: "Dashboard" },
        { to: "/attendee-dashboard", icon: "fas fa-ticket-alt", text: "My Tickets" },
        { to: "/attendee-dashboard", icon: "fas fa-bell", text: "Notifications" }
      ]
    };

    return [...commonLinks, ...(roleLinks[userRole] || roleLinks.attendee)];
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
        {isAuthenticated ? (
          // Show role-specific navigation for authenticated users
          getRoleSpecificLinks().map((link, index) => (
            <Link key={index} to={link.to} className="nav-link">
              <i className={link.icon}></i>
              {link.text}
            </Link>
          ))
        ) : (
          // Show default navigation for non-authenticated users
          <>
            <Link to="/" className="nav-link">
              <i className="fas fa-home"></i>
              Home
            </Link>
            <Link to="/eventslist" className="nav-link">
              <i className="fas fa-calendar"></i>
              Events
            </Link>
            <a href="#about" className="nav-link">
              <i className="fas fa-info-circle"></i>
              About
            </a>
            <a href="#contact" className="nav-link">
              <i className="fas fa-envelope"></i>
              Contact
            </a>
          </>
        )}
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
                    <Link to={getDashboardRoute()} className="dropdown-item" onClick={() => setIsProfileDropdownOpen(false)}>
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