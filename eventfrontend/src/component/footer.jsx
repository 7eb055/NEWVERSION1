import React, { useState, useEffect } from 'react';
import './css/footer.css';

const Footer = () => {
  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    days: 1,
    hours: 23,
    minutes: 53,
    seconds: 41
  });

  useEffect(() => {
    const timer = setInterval(() => {
      if (timeLeft.seconds > 0) {
        setTimeLeft({...timeLeft, seconds: timeLeft.seconds - 1});
      } else if (timeLeft.minutes > 0) {
        setTimeLeft({...timeLeft, minutes: timeLeft.minutes - 1, seconds: 59});
      } else if (timeLeft.hours > 0) {
        setTimeLeft({...timeLeft, hours: timeLeft.hours - 1, minutes: 59, seconds: 59});
      } else if (timeLeft.days > 0) {
        setTimeLeft({...timeLeft, days: timeLeft.days - 1, hours: 23, minutes: 59, seconds: 59});
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const eventImages = [
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1559223607-a43c990c692c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1511578314322-379afb476865?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1556761175-b413da4baf72?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
  ];

  return (
    <footer className="footer-section">
      {/* Countdown Banner */}
      <div className="countdown-banner animate-slide-down">
        <div className="countdown-container">
          <div className="countdown-timer">
            <div className="countdown-item">
              <span className="countdown-number">{timeLeft.days}</span>
              <span className="countdown-label">Days</span>
            </div>
            <div className="countdown-item">
              <span className="countdown-number">{timeLeft.hours}</span>
              <span className="countdown-label">Hours</span>
            </div>
            <div className="countdown-item">
              <span className="countdown-number">{timeLeft.minutes}</span>
              <span className="countdown-label">Minutes</span>
            </div>
            <div className="countdown-item">
              <span className="countdown-number">{timeLeft.seconds}</span>
              <span className="countdown-label">Seconds</span>
            </div>
          </div>
          <button className="buy-ticket-btn">BUY TICKET</button>
        </div>
        
        <div className="event-details">
          <div className="event-info">
            <span className="event-date">📅 30 January 2025 - 6pm to 11:30pm</span>
            <span className="event-location">📍 Secret Location In The UK</span>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="footer-content">
        <div className="footer-container">
          {/* Company Info */}
          <div className="footer-column company-info animate-fade-in">
            <div className="logo-section">
              <h3 className="company-logo">🎯 Eventify</h3>
            </div>
            <p className="company-description">
              We are committed to creating a platform where business leaders, 
              innovators, and professionals can come together to exchange ideas
            </p>
            <div className="social-links">
              <a href="#" className="social-link">📘</a>
              <a href="#" className="social-link">📷</a>
              <a href="#" className="social-link">💼</a>
              <a href="#" className="social-link">📌</a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-column animate-fade-in">
            <h4 className="footer-title">Quick Links</h4>
            <ul className="footer-links">
              <li><a href="#">About Us</a></li>
              <li><a href="#">Our Blogs</a></li>
              <li><a href="#">Event Listing</a></li>
              <li><a href="#">Pricing Plan</a></li>
              <li><a href="#">Contact Us</a></li>
            </ul>
          </div>

          {/* Contact Us */}
          <div className="footer-column animate-fade-in">
            <h4 className="footer-title">Contact Us</h4>
            <div className="contact-info">
              <div className="contact-item">
                <span className="contact-icon">📞</span>
                <span>+1 123 456 7890</span>
              </div>
              <div className="contact-item">
                <span className="contact-icon">📍</span>
                <span>Secret Location In The UK</span>
              </div>
              <div className="contact-item">
                <span className="contact-icon">📧</span>
                <span>eventifyevent@gmail.com</span>
              </div>
              <div className="contact-item">
                <span className="contact-icon">🌐</span>
                <span>eventifyevent.com</span>
              </div>
            </div>
          </div>

          {/* Event Gallery */}
          <div className="footer-column gallery-section animate-fade-in">
            <h4 className="footer-title">Our Recent Event Gallery</h4>
            <div className="event-gallery">
              {eventImages.map((image, index) => (
                <div 
                  key={index} 
                  className="gallery-item"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <img src={image} alt={`Event ${index + 1}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="footer-bottom animate-fade-in">
        <div className="footer-container">
          <p className="copyright">© Copyright 2025 - Eventify. All Right Reserved</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;