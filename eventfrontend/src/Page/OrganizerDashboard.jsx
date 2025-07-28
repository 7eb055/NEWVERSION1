import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Uncommented to enable backend API calls
import './css/OrganizerDashboard.css';
import AuthTokenService from '../services/AuthTokenService';

// Import components
import {
  EventList,
  CreateEventForm,
  SalesSummary,
  FeedbackSection,
  CompanyRegistration,
  CompanyManagement,
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
  const [showCompanyManagement, setShowCompanyManagement] = useState(false);
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
  
  // Form state - Updated to match normalized schema
  const [formData, setFormData] = useState({
    event_name: '',
    event_date: '',
    venue_name: '',
    venue_address: '',
    description: '',
    category: '',
    event_type: 'Conference',
    ticket_price: '',
    image_url: '',
    registration_deadline: '',
    refund_policy: '',
    terms_and_conditions: '',
    status: 'draft',
    is_public: true,
    requires_approval: false,
    max_tickets_per_person: 5,
    max_attendees: '',
    tags: ''
  });

  // User data from localStorage
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get user data from AuthTokenService
    const userData = AuthTokenService.getUser();
    if (userData) {
      setUser(userData);
    } else {
      // Fallback to mock data if no authenticated user
      setUser({ username: 'Demo Organizer' });
    }
    
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
    // Mock events data - updated to match the normalized schema
    setEvents([
      {
        event_id: 1,
        event_name: 'Tech Conference 2025',
        event_date: '2025-02-15T09:00:00Z',
        venue_name: 'Convention Center Downtown',
        venue_address: '123 Main St, New York, NY',
        description: 'Annual technology conference featuring latest trends in AI, blockchain, and web development.',
        category: 'Technology',
        event_type: 'Conference',
        max_attendees: 500,
        ticket_price: 50.00,
        attendees_count: 350,
        image_url: 'https://example.com/tech-conf.jpg',
        status: 'published',
        is_public: true
      },
      {
        event_id: 2,
        event_name: 'Marketing Workshop',
        event_date: '2025-03-22T14:00:00Z',
        venue_name: 'Business Hub',
        venue_address: '456 Business Ave, Chicago, IL',
        description: 'Interactive workshop on digital marketing strategies and social media management.',
        category: 'Business',
        event_type: 'Workshop',
        max_attendees: 100,
        ticket_price: 75.00,
        attendees_count: 85,
        image_url: 'https://example.com/marketing-workshop.jpg',
        status: 'published',
        is_public: true
      },
      {
        event_id: 3,
        event_name: 'Networking Event',
        event_date: '2025-04-10T18:00:00Z',
        venue_name: 'Rooftop Lounge',
        venue_address: '789 Skyview Rd, San Francisco, CA',
        description: 'Professional networking event for entrepreneurs and business leaders.',
        category: 'Networking',
        event_type: 'Networking',
        max_attendees: 200,
        ticket_price: 25.00,
        attendees_count: 150,
        image_url: 'https://example.com/networking-event.jpg',
        status: 'published',
        is_public: true
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
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/events`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data && Array.isArray(response.data)) {
        setEvents(response.data);
      } else if (response.data && Array.isArray(response.data.events)) {
        setEvents(response.data.events);
      } else {
        setEvents([]);
      }
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

  // Handle form input changes - Updated to handle checkbox and other input types
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle different input types appropriately
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    // Clear messages when user types
    if (error) setError('');
    if (success) setSuccess('');
  };

  // Validate form - Updated for new schema field names
  const validateForm = () => {
    setError('');

    if (!formData.event_name.trim()) {
      setError('Event name is required');
      return false;
    }

    if (!formData.event_date) {
      setError('Event date is required');
      return false;
    }

    // Check if date is in the future
    const eventDate = new Date(formData.event_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (eventDate < today) {
      setError('Event date must be in the future');
      return false;
    }

    if (!formData.venue_name.trim()) {
      setError('Venue name is required');
      return false;
    }

    if (!formData.description.trim()) {
      setError('Event description is required');
      return false;
    }

    if (formData.max_attendees && (isNaN(formData.max_attendees) || formData.max_attendees < 1)) {
      setError('Maximum attendees must be a positive number');
      return false;
    }

    if (formData.ticket_price && (isNaN(formData.ticket_price) || formData.ticket_price < 0)) {
      setError('Ticket price must be a non-negative number');
      return false;
    }

    return true;
  };

  // Registration & User Management Functions (UI Demo Mode)
  const handleCompanyRegistration = async (companyData) => {
    try {
      setIsLoading(true);
      setError('');
      
      // Get token from AuthTokenService
      const token = AuthTokenService.getToken();
      
      if (!token) {
        setError('You must be logged in to register a company');
        return;
      }

      // Create API request based on whether this is a new company or an update
      let response;
      const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/companies`;
      
      if (companyData.company && companyData.company.company_id) {
        // Update existing company
        response = await axios.put(
          `${apiUrl}/${companyData.company.company_id}`,
          companyData.company,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );
        setSuccess('Company updated successfully!');
      } else {
        // Create new company
        response = await axios.post(
          apiUrl,
          companyData.company || companyData,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );
        setSuccess('Company registered successfully!');
      }
      
      // If we're showing the company management section, refresh it
      if (showCompanyManagement) {
        // Trigger a refresh in the CompanyManagement component
        // This will happen automatically when the component mounts or we could
        // implement a more sophisticated state management approach
      }
      
      setShowCompanyForm(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Company registration error:', error);
      
      if (error.response) {
        setError(error.response.data.message || 'Failed to register company');
      } else {
        setError('Failed to register company. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
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

  // Event creation with real API endpoint
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    // Parse numeric values
    const eventData = {
      ...formData,
      max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null,
      ticket_price: formData.ticket_price ? parseFloat(formData.ticket_price) : 0,
      // Convert tag string to array if needed
      tags: formData.tags && typeof formData.tags === 'string' ? formData.tags.split(',').map(tag => tag.trim()) : formData.tags
    };
    
    try {
      // Get token from AuthTokenService instead of directly from localStorage
      const token = AuthTokenService.getToken();
      
      if (!token) {
        setError('You must be logged in to create events');
        setIsLoading(false);
        return;
      }
      
      // Check if token is expired
      if (AuthTokenService.isTokenExpired()) {
        setError('Your session has expired. Please log in again.');
        setIsLoading(false);
        return;
      }
      
      // Make API call to create event
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/events`, 
        eventData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      // Add new event to state with data from response
      const newEvent = response.data.event;
      setEvents(prev => [...prev, newEvent]);
      
      setSuccess('Event created successfully!');
      
      // Reset form
      setFormData({
        event_name: '',
        event_date: '',
        venue_name: '',
        venue_address: '',
        description: '',
        category: '',
        event_type: 'Conference',
        ticket_price: '',
        image_url: '',
        registration_deadline: '',
        refund_policy: '',
        terms_and_conditions: '',
        status: 'draft',
        is_public: true,
        requires_approval: false,
        max_tickets_per_person: 5,
        max_attendees: '',
        tags: ''
      });
      setShowCreateForm(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error creating event:', error);
      
      // Check for specific error types
      if (error.response && error.response.status === 403) {
        if (error.response.data && error.response.data.error === 'permission_denied') {
          setError(`${error.response.data.message}. Please upgrade to an organizer account.`);
        } else if (error.response.data && error.response.data.message === 'Invalid or expired token') {
          setError('Your session has expired. Please log out and log in again.');
          // Optional: Auto-logout the user
          // AuthTokenService.clearAuth();
          // navigate('/login');
        } else {
          setError('You do not have permission to create events. Please verify your account has organizer privileges.');
        }
      } else if (error.response && error.response.data) {
        setError(error.response.data.message || 'Failed to create event. Please try again.');
      } else {
        setError('Failed to create event. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
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
            <div className="action-buttons-group">
              <div className="action-buttons-row primary-actions">
                <button 
                  className="action-button primary-action create-event-btn"
                  onClick={() => setShowCreateForm(!showCreateForm)}
                >
                  <i className="fas fa-plus"></i>
                  {showCreateForm ? 'Cancel' : 'Create Event'}
                </button>
              </div>
              <div className="action-buttons-row management-actions">
                <button 
                  className="action-button register-company-btn"
                  onClick={() => setShowCompanyForm(!showCompanyForm)}
                >
                  <i className="fas fa-building"></i>
                  {showCompanyForm ? 'Cancel' : 'Register Company'}
                </button>
                <button 
                  className="action-button register-company-btn"
                  onClick={() => setShowCompanyManagement(true)}
                >
                  <i className="fas fa-th-list"></i>
                  Manage Companies
                </button>
                <button 
                  className="action-button register-people-btn"
                  onClick={() => setShowPeopleForm(!showPeopleForm)}
                >
                  <i className="fas fa-users"></i>
                  {showPeopleForm ? 'Cancel' : 'Register People'}
                </button>
              </div>
              <div className="action-buttons-row operations-actions">
                <button 
                  className="action-button manual-registration-btn"
                  onClick={() => setShowRegistrationForm(!showRegistrationForm)}
                >
                  <i className="fas fa-user-plus"></i>
                  {showRegistrationForm ? 'Cancel' : 'Manual Registration'}
                </button>
                <button 
                  className="action-button ticketing-btn"
                  onClick={() => setShowTicketingForm(!showTicketingForm)}
                >
                  <i className="fas fa-ticket-alt"></i>
                  {showTicketingForm ? 'Cancel' : 'Ticketing & Payments'}
                </button>
                <button 
                  className="action-button attendance-btn"
                  onClick={() => setShowAttendanceForm(!showAttendanceForm)}
                >
                  <i className="fas fa-user-check"></i>
                  {showAttendanceForm ? 'Cancel' : 'Attendance & Verification'}
                </button>
              </div>
            </div>
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
      
      {/* Company Management Modal */}
      <Modal 
        isOpen={showCompanyManagement} 
        onClose={() => setShowCompanyManagement(false)}
        title={
          <>
            <i className="fas fa-building"></i>
            Company Management
          </>
        }
        maxWidth="80%"
      >
        <CompanyManagement 
          onRegister={(companyData) => handleCompanyRegistration(companyData)}
        />
      </Modal>

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
