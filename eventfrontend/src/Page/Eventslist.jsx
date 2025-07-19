import React, { useState } from "react";
import "./css/Eventslist.css";
import Header from "../component/header";
import Footer from "../component/footer";

function EventListPage() {
  const [events, setEvents] = useState([
    {
      id: 1,
      name: "TechForward Conference 2023",
      date: "Oct 15-17, 2023",
      location: "San Francisco Convention Center",
      description: "The premier event for technology innovators and industry leaders shaping the future of tech.",
      category: "Technology",
      attendees: 1200,
      status: "Active"
    },
    {
      id: 2,
      name: "Global Marketing Summit",
      date: "Nov 5-7, 2023",
      location: "Chicago, IL",
      description: "Learn cutting-edge marketing strategies from top industry experts and thought leaders.",
      category: "Marketing",
      attendees: 850,
      status: "Upcoming"
    },
    {
      id: 3,
      name: "Healthcare Innovation Forum",
      date: "Dec 3-5, 2023",
      location: "Boston, MA",
      description: "Exploring breakthroughs in medical technology and healthcare delivery systems.",
      category: "Healthcare",
      attendees: 650,
      status: "Upcoming"
    },
    {
      id: 4,
      name: "Sustainable Energy Expo",
      date: "Sep 20-22, 2023",
      location: "Denver, CO",
      description: "Showcasing renewable energy solutions and sustainable practices for a greener future.",
      category: "Environment",
      attendees: 950,
      status: "Active"
    },
    {
      id: 5,
      name: "Creative Design Conference",
      date: "Aug 10-12, 2023",
      location: "Portland, OR",
      description: "Celebrating design innovation across digital, print, and experiential mediums.",
      category: "Design",
      attendees: 550,
      status: "Completed"
    },
    {
      id: 6,
      name: "Future of Finance Symposium",
      date: "Jan 15-17, 2024",
      location: "New York, NY",
      description: "Exploring fintech innovations, blockchain, and the evolving financial landscape.",
      category: "Finance",
      attendees: 700,
      status: "Upcoming"
    }
  ]);
  
  const [filteredEvents, setFilteredEvents] = useState(events);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  
  // Categories for filtering
  const categories = ["All", "Technology", "Marketing", "Healthcare", "Environment", "Finance", "Design"];
  const statuses = ["All", "Active", "Upcoming", "Completed"];
  
  // Filter events based on search and filters
  const filterEvents = () => {
    return events.filter(event => {
      const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === "All" || event.category === categoryFilter;
      const matchesStatus = statusFilter === "All" || event.status === statusFilter;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  };
  
  // Handle search input
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setFilteredEvents(filterEvents());
  };
  
  // Handle category filter
  const handleCategoryFilter = (category) => {
    setCategoryFilter(category);
    setFilteredEvents(filterEvents());
  };
  
  // Handle status filter
  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    setFilteredEvents(filterEvents());
  };
  
  // Sort events by date
  const sortEventsByDate = () => {
    const sorted = [...filteredEvents].sort((a, b) => {
      // Simple date comparison for demo purposes
      return new Date(a.date.split("-")[0]) - new Date(b.date.split("-")[0]);
    });
    setFilteredEvents(sorted);
  };

  return (
    <div className="event-list-page">
      <Header />
      <header className="event-list-header">
        <div className="container">
          <h1>Discover Events</h1>
          <p>Browse and register for upcoming conferences and gatherings</p>
        </div>
      </header>
      
      <div className="container">
        {/* Search and Filters */}
        <div className="controls-section">
          <div className="search-bar">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          
          <div className="filters">
            <div className="filter-group">
              <h3>Category</h3>
              <div className="filter-options">
                {categories.map(category => (
                  <button
                    key={category}
                    className={`filter-btn ${categoryFilter === category ? 'active' : ''}`}
                    onClick={() => handleCategoryFilter(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="filter-group">
              <h3>Status</h3>
              <div className="filter-options">
                {statuses.map(status => (
                  <button
                    key={status}
                    className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
                    onClick={() => handleStatusFilter(status)}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
            
            <button className="sort-btn" onClick={sortEventsByDate}>
              <i className="fas fa-sort-amount-down"></i> Sort by Date
            </button>
          </div>
        </div>
        
        {/* Event Cards */}
        <div className="events-grid">
          {filteredEvents.length > 0 ? (
            filteredEvents.map(event => (
              <div className="event-card" key={event.id}>
                <div className={`event-status ${event.status.toLowerCase()}`}>
                  {event.status}
                </div>
                <div className="event-content">
                  <h2>{event.name}</h2>
                  <div className="event-meta">
                    <div className="meta-item">
                      <i className="fas fa-calendar"></i>
                      <span>{event.date}</span>
                    </div>
                    <div className="meta-item">
                      <i className="fas fa-map-marker-alt"></i>
                      <span>{event.location}</span>
                    </div>
                    <div className="meta-item">
                      <i className="fas fa-users"></i>
                      <span>{event.attendees} attendees</span>
                    </div>
                    <div className="meta-item">
                      <i className="fas fa-tag"></i>
                      <span>{event.category}</span>
                    </div>
                  </div>
                  <p className="event-description">{event.description}</p>
                  <div className="event-actions">
                    <button className="btn btn-primary">
                      <i className="fas fa-info-circle"></i> View Details
                    </button>
                    <button className="btn btn-outline">
                      <i className="fas fa-ticket-alt"></i> Register
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-results">
              <i className="fas fa-calendar-times"></i>
              <h3>No events match your search criteria</h3>
              <p>Try adjusting your filters or search term</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      {/* <footer> */}
        <div className="container">
          <p>Event Management System • For assistance, contact support@events.com</p>
          <p style={{ marginTop: '10px' }}>
            Follow us: 
            <i className="fab fa-twitter"></i> 
            <i className="fab fa-linkedin"></i> 
            <i className="fab fa-instagram"></i>
          </p>
        </div>
      {/* </footer> */}
      <Footer />
    </div>
  );
}

export default EventListPage;