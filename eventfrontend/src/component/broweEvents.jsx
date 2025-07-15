import React, { useState } from 'react';
import './css/browseEvents.css';

const BrowseEvents = () => {
  const [selectedDay, setSelectedDay] = useState(1);

  const eventDays = [
    { day: 1, date: '01', month: 'JAN', year: '2025', label: 'Day 01', active: true },
    { day: 2, date: '08', month: 'JAN', year: '2025', label: 'Day 02', active: false },
    { day: 3, date: '15', month: 'JAN', year: '2025', label: 'Day 03', active: false },
    { day: 4, date: '20', month: 'JAN', year: '2025', label: 'Day 04', active: false },
    { day: 5, date: '25', month: 'JAN', year: '2025', label: 'Day 05', active: false }
  ];

  const events = [
    {
      id: 1,
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      time: '10:00 AM - 12:00 PM',
      location: '26/C Asana, New York',
      title: 'Innovate 2025 Your Pathway to Business Transformation',
      description: 'The Innovate 2025 conference is meticulously designed to provide you with a rich, immersive experience that drives actionable insights & fosters collaboration from keynote presentations.'
    },
    {
      id: 2,
      image: 'https://images.unsplash.com/photo-1559223607-a43c990c692c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      time: '10:00 AM - 12:00 PM',
      location: '26/C Asana, New York',
      title: 'Innovate 2025 A Full-Day Journey the Future of Business',
      description: 'The Innovate 2025 conference is meticulously designed to provide you with a rich, immersive experience that drives actionable insights & fosters collaboration from keynote presentations.'
    },
    {
      id: 3,
      image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      time: '10:00 AM - 12:00 PM',
      location: '26/C Asana, New York',
      title: 'Innovate 2025 Charting the Course for Business Success',
      description: 'The Innovate 2025 conference is meticulously designed to provide you with a rich, immersive experience that drives actionable insights & fosters collaboration from keynote presentations.'
    }
  ];

  return (
    <section className="browse-events-section">
      <div className="container">
        {/* Header */}
        <div className="section-header animate-fade-in">
          <span className="section-badge">EVENT SCHEDULE</span>
          <h2 className="section-title">Our Events Schedule Plan</h2>
        </div>

        {/* Day Selector */}
        <div className="day-selector animate-slide-up">
          {eventDays.map((day, index) => (
            <div
              key={day.day}
              className={`day-card ${selectedDay === day.day ? 'active' : ''}`}
              onClick={() => setSelectedDay(day.day)}
            >
              <div className="day-header">
                <span className="day-label">{day.label}</span>
              </div>
              <div className="day-content">
                <span className="day-date">{day.date}</span>
                <div className="day-month-year">
                  <span className="day-month">{day.month}</span>
                  <span className="day-year">{day.year}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Events List */}
        <div className="events-list">
          {events.map((event, index) => (
            <div 
              key={event.id} 
              className={`event-card animate-fade-in-up`}
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              <div className="event-image">
                <img src={event.image} alt={event.title} />
              </div>
              <div className="event-content">
                <div className="event-meta">
                  <div className="event-time">
                    <span className="time-icon">🕐</span>
                    {event.time}
                  </div>
                  <div className="event-location">
                    <span className="location-icon">📍</span>
                    {event.location}
                  </div>
                </div>
                <h3 className="event-title">{event.title}</h3>
                <p className="event-description">{event.description}</p>
                <button className="purchase-btn">PURCHASE TICKET NOW</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrowseEvents;