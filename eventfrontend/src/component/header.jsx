import React, { useState } from "react";
import { Link } from 'react-router-dom';
import './css/header.css'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

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
          <i className="fas fa-blog"></i>
          Blogs
        </a>
        <a href="#" className="nav-link">
          <i className="fas fa-file-alt"></i>
          Pages
        </a>
      </nav>
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
    </header>
  );
}

export default Header;