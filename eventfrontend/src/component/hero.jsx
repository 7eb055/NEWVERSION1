import React, { useState, useEffect } from 'react';
import './css/hero.css';

const Hero = () => {
  // Set up countdown timer to a future date
  const [timeLeft, setTimeLeft] = useState({
    days: 45,
    hours: 12,
    minutes: 30,
    seconds: 25
  });

  useEffect(() => {
    // Update countdown every second
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

    // Clear interval on component unmount
    return () => clearInterval(timer);
  }, [timeLeft]);

  return (
    <div className="hero-section">
      {/* Simple animated background */}
      <div className="hero-background">
        <div className="bg-circle circle-1"></div>
        <div className="bg-circle circle-2"></div>
      </div>

      <div className="hero-container">
        {/* Left column content */}
        <div className="hero-left">
          <div className="hero-badge">
            <i className="fas fa-star"></i>
            Innovation Summit 2025
          </div>

          <h1 className="hero-title">
            Shape the Future of Business
          </h1>

          <p className="hero-description">
            Join industry leaders and innovators for the most impactful business summit of the year. 
            Discover cutting-edge strategies and network with visionaries.
          </p>

          <div className="hero-buttons">
            <button className="btn-primary">
              <i className="fas fa-ticket-alt"></i>
              Register Now
            </button>
            <button className="btn-secondary">
              <i className="fas fa-play-circle"></i>
              Watch Preview
            </button>
          </div>
        </div>

        {/* Right column content */}
        <div className="hero-right">
          <div className="event-card">
            <div className="event-header">
              <h3>Innovation Summit 2025</h3>
              <span className="event-status">Early Bird</span>
            </div>
            
            <div className="event-details">
              <div className="detail-item">
                <i className="fas fa-calendar"></i>
                <span>March 15-17, 2025</span>
              </div>
              
              <div className="detail-item">
                <i className="fas fa-map-marker-alt"></i>
                <span>Silicon Valley Convention Center</span>
              </div>
              
              <div className="detail-item">
                <i className="fas fa-users"></i>
                <span>2,500+ Attendees</span>
              </div>
            </div>
          </div>

          <div className="countdown-card">
            <h4>Event Starts In</h4>
            <div className="countdown-grid">
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
                <span className="countdown-label">Min</span>
              </div>
              <div className="countdown-item">
                <span className="countdown-number">{timeLeft.seconds}</span>
                <span className="countdown-label">Sec</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;