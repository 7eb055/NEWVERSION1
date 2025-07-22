import React, { useState, useEffect } from 'react';
// import axios from 'axios'; // Commented out for UI focus - no backend calls
import './css/OrganizerDashboard.css';

// Import components
import {
  EventList,
  CreateEventForm,
  SalesSummary,
  FeedbackSection,
  CompanyRegistration,
  PeopleRegistration,
  ManualEventRegistration,
  TicketingManagement,
  AttendanceVerification,
  Modal
} from './OrganizerCards';

// Import header and footer
import Header from '../component/header';
import Footer from '../component/footer';

const OrganizerDashboard = () => {
  // State management
  const [events, setEvents] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Registration & User Management state
  const [companies, setCompanies] = useState([]);
  const [people, setPeople] = useState([]);
  const [eventRegistrations, setEventRegistrations] = useState([]);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showPeopleForm, setShowPeopleForm] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  
  // Ticketing & Payments state
  const [showTicketingForm, setShowTicketingForm] = useState(false);
  
  // Attendance & Verification state
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  
  // Sales data state
  const [salesData, setSalesData] = useState({
    totalIncome: 0,
    eventSales: []
  });
  
  // Feedback and Reviews state
  const [feedbackData, setFeedbackData] = useState([]);
  const [feedbackSummary, setFeedbackSummary] = useState({});
  const [feedbackFilter, setFeedbackFilter] = useState({
    eventId: 'all',
    dateRange: 'all'
  });
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    location: '',
    description: '',
    category: '',
    maxAttendees: '',
    price: ''
  });

  // User data from localStorage
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get user data from localStorage (commented out backend dependency)
    // const userData = localStorage.getItem('user');
    // if (userData) {
    //   setUser(JSON.parse(userData));
    // }
    
    // Mock user data for UI display
    setUser({ username: 'Demo Organizer' });
    
    // Load mock data for UI demonstration
    loadMockData();
    
    // Backend API calls - commented out for UI focus
    // loadEvents();
    // loadSalesData();
    // loadVendors();
    // loadFeedbackData();
  }, []);

  // Load mock data for UI demonstration
  const loadMockData = () => {
    // Mock events data
    setEvents([
      {
        id: 1,
        name: 'Tech Conference 2025',
        date: '2025-02-15T09:00:00Z',
        location: 'Convention Center Downtown',
        description: 'Annual technology conference featuring latest trends in AI, blockchain, and web development.',
        category: 'Technology',
        maxAttendees: 500,
        price: 50,
        attendeesCount: 350
      },
      {
        id: 2,
        name: 'Marketing Workshop',
        date: '2025-03-22T14:00:00Z',
        location: 'Business Hub',
        description: 'Interactive workshop on digital marketing strategies and social media management.',
        category: 'Business',
        maxAttendees: 100,
        price: 75,
        attendeesCount: 85
      },
      {
        id: 3,
        name: 'Networking Event',
        date: '2025-04-10T18:00:00Z',
        location: 'Rooftop Lounge',
        description: 'Professional networking event for entrepreneurs and business leaders.',
        category: 'Networking',
        maxAttendees: 200,
        price: 25,
        attendeesCount: 150
      }
    ]);

    // Mock sales data
    setSalesData({
      totalIncome: 15750.00,
      eventSales: [
        { eventId: 1, eventName: 'Tech Conference 2025', ticketsSold: 150, revenue: 7500.00, ticketPrice: 50.00 },
        { eventId: 2, eventName: 'Marketing Workshop', ticketsSold: 85, revenue: 4250.00, ticketPrice: 50.00 },
        { eventId: 3, eventName: 'Networking Event', ticketsSold: 200, revenue: 4000.00, ticketPrice: 20.00 }
      ]
    });

    // Mock companies data
    setCompanies([
      {
        id: 1,
        name: 'TechVision Solutions',
        type: 'vendor',
        category: 'Technology',
        email: 'contact@techvision.com',
        phone: '+1-555-0123',
        address: '123 Tech Street, Silicon Valley, CA',
        registeredAt: '2025-01-10T08:00:00Z',
        status: 'active'
      },
      {
        id: 2,
        name: 'Global Sponsors Inc',
        type: 'sponsor',
        category: 'Marketing',
        email: 'partnerships@globalsponsors.com',
        phone: '+1-555-0456',
        address: '456 Business Ave, New York, NY',
        registeredAt: '2025-01-15T10:30:00Z',
        status: 'active'
      }
    ]);

    // Mock people data
    setPeople([
      {
        id: 1,
        name: 'Dr. Sarah Chen',
        email: 'sarah.chen@example.com',
        phone: '+1-555-1111',
        role: 'speaker',
        company: 'AI Research Institute',
        bio: 'Leading AI researcher and keynote speaker',
        registeredAt: '2025-01-12T14:20:00Z',
        status: 'confirmed'
      },
      {
        id: 2,
        name: 'Michael Johnson',
        email: 'michael.j@vipguest.com',
        phone: '+1-555-2222',
        role: 'vip',
        company: 'Fortune 500 CEO',
        bio: 'Technology industry executive',
        registeredAt: '2025-01-14T09:15:00Z',
        status: 'confirmed'
      }
    ]);

    // Mock event registrations data
    setEventRegistrations([
      {
        id: 1,
        eventId: 1,
        eventName: 'Tech Conference 2025',
        attendeeName: 'John Smith',
        attendeeEmail: 'john.smith@company.com',
        attendeePhone: '+1-555-3333',
        ticketType: 'VIP',
        registrationType: 'manual',
        registeredBy: 'Demo Organizer',
        registeredAt: '2025-01-16T11:00:00Z',
        status: 'confirmed'
      },
      {
        id: 2,
        eventId: 2,
        eventName: 'Marketing Workshop',
        attendeeName: 'Emily Rodriguez',
        attendeeEmail: 'emily.r@marketing.com',
        attendeePhone: '+1-555-4444',
        ticketType: 'Standard',
        registrationType: 'bulk',
        registeredBy: 'Demo Organizer',
        registeredAt: '2025-01-17T15:30:00Z',
        status: 'confirmed'
      }
    ]);

    // Mock feedback data
    setFeedbackData([
      {
        id: 1,
        eventId: 1,
        eventName: 'Tech Conference 2025',
        attendeeName: 'John Smith',
        attendeeEmail: 'john@example.com',
        rating: 5,
        comment: 'Excellent event! Very informative speakers and great networking opportunities.',
        submittedAt: '2025-01-15T10:30:00Z'
      },
      {
        id: 2,
        eventId: 1,
        eventName: 'Tech Conference 2025',
        attendeeName: 'Sarah Johnson',
        attendeeEmail: 'sarah@example.com',
        rating: 4,
        comment: 'Good content but the venue was a bit crowded. Overall enjoyed it.',
        submittedAt: '2025-01-16T14:22:00Z'
      },
      {
        id: 3,
        eventId: 2,
        eventName: 'Marketing Workshop',
        attendeeName: 'Mike Davis',
        attendeeEmail: 'mike@example.com',
        rating: 5,
        comment: 'Amazing workshop! Learned practical strategies I can implement immediately.',
        submittedAt: '2025-01-12T09:15:00Z'
      }
    ]);

    // Mock feedback summary
    setFeedbackSummary({
      1: { averageRating: 4.5, totalReviews: 2, eventName: 'Tech Conference 2025' },
      2: { averageRating: 5.0, totalReviews: 1, eventName: 'Marketing Workshop' },
      3: { averageRating: 0, totalReviews: 0, eventName: 'Networking Event' }
    });
  };

  // Backend API functions - commented out for UI focus
  /*
  // Load events from API
  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/events', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setEvents(response.data.events || []);
    } catch (error) {
      console.error('Error loading events:', error);
      setError('Failed to load events. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load sales data from API
  const loadSalesData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/sales/overview', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setSalesData(response.data || { totalIncome: 0, eventSales: [] });
    } catch (error) {
      console.error('Error loading sales data:', error);
      // Set mock data for demonstration
      setSalesData({
        totalIncome: 15750.00,
        eventSales: [
          { eventId: 1, eventName: 'Tech Conference 2025', ticketsSold: 150, revenue: 7500.00, ticketPrice: 50.00 },
          { eventId: 2, eventName: 'Marketing Workshop', ticketsSold: 85, revenue: 4250.00, ticketPrice: 50.00 },
          { eventId: 3, eventName: 'Networking Event', ticketsSold: 200, revenue: 4000.00, ticketPrice: 20.00 }
        ]
      });
    }
  };

  // Load vendors from API
  const loadVendors = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/vendors', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setVendors(response.data.vendors || []);
    } catch (error) {
      console.error('Error loading vendors:', error);
      // Set mock data for demonstration
      setVendors([
        { id: 1, name: 'Elite Catering Services', category: 'Catering', rating: 4.8, price: '$25/person' },
        { id: 2, name: 'SoundWave Audio', category: 'Audio/Visual', rating: 4.9, price: '$500/event' },
        { id: 3, name: 'Perfect Photos', category: 'Photography', rating: 4.7, price: '$800/event' },
        { id: 4, name: 'Bloom Decorations', category: 'Decoration', rating: 4.6, price: '$300/event' },
        { id: 5, name: 'Secure Events', category: 'Security', rating: 4.8, price: '$50/hour' }
      ]);
    }
  };

  // Hire vendor for event
  const hireVendor = async (vendorId, eventId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/vendors/hire', {
        vendorId,
        eventId
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setSuccess('Vendor hired successfully!');
        setShowVendorModal(false);
        // Reload vendor assignments
        loadEventVendors();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error hiring vendor:', error);
      setError('Failed to hire vendor. Please try again.');
    }
  };

  // Load event vendors
  const loadEventVendors = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/events/vendors', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setEventVendors(response.data.eventVendors || []);
    } catch (error) {
      console.error('Error loading event vendors:', error);
      // Mock data for demonstration
      setEventVendors([
        { eventId: 1, vendorId: 1, vendorName: 'Elite Catering Services', category: 'Catering' },
        { eventId: 1, vendorId: 2, vendorName: 'SoundWave Audio', category: 'Audio/Visual' },
        { eventId: 2, vendorId: 3, vendorName: 'Perfect Photos', category: 'Photography' }
      ]);
    }
  };

  // Load feedback data from API
  const loadFeedbackData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/feedback', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setFeedbackData(response.data.feedback || []);
      setFeedbackSummary(response.data.summary || {});
    } catch (error) {
      console.error('Error loading feedback data:', error);
      // Mock data for demonstration
      setFeedbackData([
        {
          id: 1,
          eventId: 1,
          eventName: 'Tech Conference 2025',
          attendeeName: 'John Smith',
          attendeeEmail: 'john@example.com',
          rating: 5,
          comment: 'Excellent event! Very informative speakers and great networking opportunities.',
          submittedAt: '2025-01-15T10:30:00Z'
        },
        {
          id: 2,
          eventId: 1,
          eventName: 'Tech Conference 2025',
          attendeeName: 'Sarah Johnson',
          attendeeEmail: 'sarah@example.com',
          rating: 4,
          comment: 'Good content but the venue was a bit crowded. Overall enjoyed it.',
          submittedAt: '2025-01-16T14:22:00Z'
        },
        {
          id: 3,
          eventId: 2,
          eventName: 'Marketing Workshop',
          attendeeName: 'Mike Davis',
          attendeeEmail: 'mike@example.com',
          rating: 5,
          comment: 'Amazing workshop! Learned practical strategies I can implement immediately.',
          submittedAt: '2025-01-12T09:15:00Z'
        },
        {
          id: 4,
          eventId: 1,
          eventName: 'Tech Conference 2025',
          attendeeName: 'Emily Chen',
          attendeeEmail: 'emily@example.com',
          rating: 4,
          comment: 'Great speakers and well organized. Would love to see more interactive sessions.',
          submittedAt: '2025-01-17T11:45:00Z'
        },
        {
          id: 5,
          eventId: 3,
          eventName: 'Networking Event',
          attendeeName: 'Robert Wilson',
          attendeeEmail: 'robert@example.com',
          rating: 3,
          comment: 'Nice event but could have been better organized. Food was good though.',
          submittedAt: '2025-01-10T16:30:00Z'
        }
      ]);
      
      // Mock summary data
      setFeedbackSummary({
        1: { averageRating: 4.3, totalReviews: 3, eventName: 'Tech Conference 2025' },
        2: { averageRating: 5.0, totalReviews: 1, eventName: 'Marketing Workshop' },
        3: { averageRating: 3.0, totalReviews: 1, eventName: 'Networking Event' }
      });
    }
  };
  */

  // Filter feedback based on selected filters
  const getFilteredFeedback = () => {
    let filtered = [...feedbackData];
    
    // Filter by event
    if (feedbackFilter.eventId !== 'all') {
      filtered = filtered.filter(feedback => feedback.eventId === parseInt(feedbackFilter.eventId));
    }
    
    // Filter by date range
    if (feedbackFilter.dateRange !== 'all') {
      const now = new Date();
      let filterDate = new Date();
      
      switch (feedbackFilter.dateRange) {
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          filterDate.setMonth(now.getMonth() - 3);
          break;
        default:
          filterDate = null;
      }
      
      if (filterDate) {
        filtered = filtered.filter(feedback => new Date(feedback.submittedAt) >= filterDate);
      }
    }
    
    return filtered.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  };

  // Get star rating display
  const renderStarRating = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <i 
          key={i} 
          className={`fas fa-star ${i <= rating ? 'filled' : 'empty'}`}
        />
      );
    }
    return stars;
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear messages when user types
    if (error) setError('');
    if (success) setSuccess('');
  };

  // Validate form
  const validateForm = () => {
    setError('');

    if (!formData.name.trim()) {
      setError('Event name is required');
      return false;
    }

    if (!formData.date) {
      setError('Event date is required');
      return false;
    }

    // Check if date is in the future
    const eventDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (eventDate < today) {
      setError('Event date must be in the future');
      return false;
    }

    if (!formData.location.trim()) {
      setError('Event location is required');
      return false;
    }

    if (!formData.description.trim()) {
      setError('Event description is required');
      return false;
    }

    if (formData.maxAttendees && (isNaN(formData.maxAttendees) || formData.maxAttendees < 1)) {
      setError('Maximum attendees must be a positive number');
      return false;
    }

    if (formData.price && (isNaN(formData.price) || formData.price < 0)) {
      setError('Price must be a non-negative number');
      return false;
    }

    return true;
  };

  // Registration & User Management Functions (UI Demo Mode)
  const handleCompanyRegistration = (companyData) => {
    const newCompany = {
      id: companies.length + 1,
      ...companyData,
      registeredAt: new Date().toISOString(),
      status: 'active'
    };
    setCompanies(prev => [...prev, newCompany]);
    setSuccess('Company registered successfully! (UI Demo Mode)');
    setShowCompanyForm(false);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handlePeopleRegistration = (personData) => {
    const newPerson = {
      id: people.length + 1,
      ...personData,
      registeredAt: new Date().toISOString(),
      status: 'confirmed'
    };
    setPeople(prev => [...prev, newPerson]);
    setSuccess('Person registered successfully! (UI Demo Mode)');
    setShowPeopleForm(false);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleManualEventRegistration = (registrationData) => {
    const newRegistration = {
      id: eventRegistrations.length + 1,
      ...registrationData,
      registeredBy: user?.username || 'Demo Organizer',
      registeredAt: new Date().toISOString(),
      status: 'confirmed'
    };
    setEventRegistrations(prev => [...prev, newRegistration]);
    setSuccess('Event registration completed successfully! (UI Demo Mode)');
    setShowRegistrationForm(false);
    setTimeout(() => setSuccess(''), 3000);
  };

  // Mock form submission for UI demonstration
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    // Simulate API delay
    setTimeout(() => {
      // Create new event with mock ID
      const newEvent = {
        id: events.length + 1,
        ...formData,
        maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : null,
        price: formData.price ? parseFloat(formData.price) : 0,
        attendeesCount: 0
      };

      // Add to events list
      setEvents(prev => [...prev, newEvent]);
      
      setSuccess('Event created successfully! (UI Demo Mode)');
      
      // Reset form
      setFormData({
        name: '',
        date: '',
        location: '',
        description: '',
        category: '',
        maxAttendees: '',
        price: ''
      });
      setShowCreateForm(false);
      setIsLoading(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    }, 1000);
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      {/* Global Header */}
      <Header />
      
      <div className="organizer-dashboard">
        {/* Dashboard Header */}
        <div className="dashboard-header">
          <div className="header-content">
            <h1 className="dashboard-title">
              <i className="fas fa-calendar-alt"></i>
              Organizer Dashboard
            </h1>
            <p className="dashboard-subtitle">
              Welcome back, {user?.username || 'Organizer'}! Manage your events and grow your community.
            </p>
          </div>
          <div className="header-actions">
            <button 
              className="create-event-btn"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              <i className="fas fa-plus"></i>
              {showCreateForm ? 'Cancel' : 'Create Event'}
            </button>
            <button 
              className="register-company-btn"
              onClick={() => setShowCompanyForm(!showCompanyForm)}
            >
              <i className="fas fa-building"></i>
              {showCompanyForm ? 'Cancel' : 'Register Company'}
            </button>
            <button 
              className="register-people-btn"
              onClick={() => setShowPeopleForm(!showPeopleForm)}
            >
              <i className="fas fa-users"></i>
              {showPeopleForm ? 'Cancel' : 'Register People'}
            </button>
            <button 
              className="manual-registration-btn"
              onClick={() => setShowRegistrationForm(!showRegistrationForm)}
            >
              <i className="fas fa-user-plus"></i>
              {showRegistrationForm ? 'Cancel' : 'Manual Registration'}
            </button>
            <button 
              className="ticketing-btn"
              onClick={() => setShowTicketingForm(!showTicketingForm)}
            >
              <i className="fas fa-ticket-alt"></i>
              {showTicketingForm ? 'Cancel' : 'Ticketing & Payments'}
            </button>
            <button 
              className="attendance-btn"
              onClick={() => setShowAttendanceForm(!showAttendanceForm)}
            >
              <i className="fas fa-user-check"></i>
              {showAttendanceForm ? 'Cancel' : 'Attendance & Verification'}
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
      {success && (
        <div className="message success-message">
          <i className="fas fa-check-circle"></i>
          {success}
        </div>
      )}

      {error && (
        <div className="message error-message">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}

      {/* Modals */}
      <Modal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        title={
          <>
            <i className="fas fa-calendar-plus"></i>
            Create New Event
          </>
        }
        maxWidth="900px"
      >
        <CreateEventForm
          formData={formData}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          setShowCreateForm={setShowCreateForm}
          isLoading={isLoading}
        />
      </Modal>

      <Modal
        isOpen={showCompanyForm}
        onClose={() => setShowCompanyForm(false)}
        title={
          <>
            <i className="fas fa-building"></i>
            Register Event Company
          </>
        }
        maxWidth="900px"
      >
        <CompanyRegistration
          onSubmit={handleCompanyRegistration}
          onCancel={() => setShowCompanyForm(false)}
          isLoading={isLoading}
        />
      </Modal>

      <Modal
        isOpen={showPeopleForm}
        onClose={() => setShowPeopleForm(false)}
        title={
          <>
            <i className="fas fa-users"></i>
            Register People
          </>
        }
        maxWidth="800px"
      >
        <PeopleRegistration
          onSubmit={handlePeopleRegistration}
          onCancel={() => setShowPeopleForm(false)}
          isLoading={isLoading}
        />
      </Modal>

      <Modal
        isOpen={showRegistrationForm}
        onClose={() => setShowRegistrationForm(false)}
        title={
          <>
            <i className="fas fa-user-plus"></i>
            Manual Event Registration
          </>
        }
        maxWidth="900px"
      >
        <ManualEventRegistration
          events={events}
          onSubmit={handleManualEventRegistration}
          onCancel={() => setShowRegistrationForm(false)}
          isLoading={isLoading}
        />
      </Modal>

      <Modal
        isOpen={showTicketingForm}
        onClose={() => setShowTicketingForm(false)}
        title={
          <>
            <i className="fas fa-ticket-alt"></i>
            Ticketing & Payments Management
          </>
        }
        maxWidth="1200px"
      >
        <TicketingManagement
          events={events}
          onCancel={() => setShowTicketingForm(false)}
          isLoading={isLoading}
        />
      </Modal>

      <Modal
        isOpen={showAttendanceForm}
        onClose={() => setShowAttendanceForm(false)}
        title={
          <>
            <i className="fas fa-user-check"></i>
            Attendance & Verification
          </>
        }
        maxWidth="1400px"
      >
        <AttendanceVerification
          events={events}
          onCancel={() => setShowAttendanceForm(false)}
          isLoading={isLoading}
        />
      </Modal>

      {/* Sales Overview Section */}
      <SalesSummary 
        salesData={salesData} 
        events={events} 
      />

      {/* Feedback and Reviews Section */}
      <FeedbackSection
        feedbackData={feedbackData}
        feedbackSummary={feedbackSummary}
        feedbackFilter={feedbackFilter}
        setFeedbackFilter={setFeedbackFilter}
        events={events}
        getFilteredFeedback={getFilteredFeedback}
        renderStarRating={renderStarRating}
        formatDate={formatDate}
      />

      {/* Events List */}
      <div className="events-section">
        <div className="section-header">
          <h2 className="section-title">
            <i className="fas fa-list"></i>
            Your Events
          </h2>
          <div className="events-count">
            {events.length} {events.length === 1 ? 'Event' : 'Events'}
          </div>
        </div>

        <EventList
          events={events}
          isLoading={isLoading}
          showCreateForm={showCreateForm}
          setShowCreateForm={setShowCreateForm}
          formatDate={formatDate}
        />
      </div>
      
      </div>
      
      {/* Global Footer */}
      <Footer />
    </>
  );
};

export default OrganizerDashboard;
