import React, { useState, useEffect, useCallback } from 'react';
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
import ImageUpload from '../component/ImageUpload';

const OrganizerDashboard = () => {
  // State management
  const [events, setEvents] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Registration & User Management state
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
  
  // Additional missing state variables (temporarily unused but may be needed for future features)
  // eslint-disable-next-line no-unused-vars
  const [companies, setCompanies] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [people, setPeople] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [eventRegistrations, setEventRegistrations] = useState([]);
  
  // Feedback and Reviews state
  const [feedbackData, _setFeedbackData] = useState([]);
  const [feedbackSummary, _setFeedbackSummary] = useState({});
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
    image_filename: '',
    image_type: '',
    image_size: '',
    image_mimetype: '',
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
  
  // Event management state
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);

  useEffect(() => {
    // Get user data from AuthTokenService
    const userData = AuthTokenService.getUser();
    if (userData) {
      setUser(userData);
      
      // Try to restore cached sales data first
      try {
        const cacheKey = userData?.user_id ? `organizer_sales_data_${userData.user_id}` : 'organizer_sales_data';
        const cachedSalesData = localStorage.getItem(cacheKey);
        if (cachedSalesData) {
          const parsedSalesData = JSON.parse(cachedSalesData);
          setSalesData(parsedSalesData);
          console.log('🔄 Restored cached sales data:', parsedSalesData);
        }
      } catch (err) {
        console.warn('Could not restore cached sales data:', err);
      }
      
      // Load real data from backend
      loadEvents(); // This will also load sales data
      loadCompanies();
      loadAttendees();
    } else {
      setError('Please log in to view your dashboard');
    }
  }, [loadEvents]);

  // Recalculate sales data whenever events change (but only if not already calculated by loadEvents)
  useEffect(() => {
    if (events.length > 0) {
      // Only recalculate if we have events that weren't just loaded by loadEvents
      // loadEvents already calls loadSalesData, so we avoid double calculation
      const hasRecentlyLoaded = Date.now() - (window.lastEventsLoadTime || 0) < 1000;
      if (!hasRecentlyLoaded) {
        loadSalesData(events);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]); // loadSalesData intentionally omitted to avoid circular dependency

  // Load organizer-specific events from API
  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = AuthTokenService.getToken();
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/my-events`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      let loadedEvents = [];
      if (response.data && Array.isArray(response.data.events)) {
        loadedEvents = response.data.events;
      } else if (response.data && Array.isArray(response.data)) {
        loadedEvents = response.data;
      } else {
        loadedEvents = [];
      }
      
      setEvents(loadedEvents);
      
      // Load sales data immediately after events are loaded
      loadSalesData(loadedEvents);
      
    } catch (error) {
      console.error('Error loading events:', error);
      setError('Failed to load events. Please try again.');
      // Fallback to empty array on error
      setEvents([]);
      setSalesData({ totalIncome: 0, eventSales: [] });
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Remove loadSalesData dependency to avoid circular dependency

  // Load companies from API
  const loadCompanies = async () => {
    try {
      const token = AuthTokenService.getToken();
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/companies`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setCompanies(response.data.companies || response.data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
      setCompanies([]);
    }
  };

  // Load attendees from API
  const loadAttendees = async () => {
    try {
      const token = AuthTokenService.getToken();
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/attendees`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setPeople(response.data.attendees || response.data || []);
    } catch (error) {
      console.error('Error loading attendees:', error);
      setPeople([]);
    }
  };

  // Load sales data from organizer-specific events
  const loadSalesData = useCallback(async (eventsData = null) => {
    try {
      // Use provided events data or fall back to state
      const eventsToProcess = eventsData || events;
      
      console.log('📊 Loading sales data from events:', eventsToProcess);
      
      // Calculate sales data from loaded events
      let totalIncome = 0;
      const eventSales = [];

      eventsToProcess.forEach(event => {
        // Ensure we have numeric values
        const registrationCount = parseInt(event.registration_count || 0);
        const ticketPrice = parseFloat(event.ticket_price || 0);
        const revenue = registrationCount * ticketPrice;
        
        totalIncome += revenue;
        
        eventSales.push({
          eventId: event.event_id,
          eventName: event.event_name,
          ticketsSold: registrationCount,
          revenue: revenue,
          ticketPrice: ticketPrice
        });
      });

      const salesData = {
        totalIncome,
        eventSales
      };

      console.log('💰 Calculated sales data:', salesData);

      setSalesData(salesData);
      
      // Cache sales data in localStorage for persistence (with user ID to avoid conflicts)
      try {
        const user = AuthTokenService.getUser();
        const cacheKey = user?.user_id ? `organizer_sales_data_${user.user_id}` : 'organizer_sales_data';
        localStorage.setItem(cacheKey, JSON.stringify(salesData));
      } catch (err) {
        console.warn('Could not cache sales data:', err);
      }
      
    } catch (error) {
      console.error('Error calculating sales data:', error);
      setSalesData({ totalIncome: 0, eventSales: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Remove events dependency since eventsData is passed as parameter

  

  // Filter feedback based on selected filters
  const getFilteredFeedback = () => {
    let filtered = [...feedbackData];
    
    // Filter by event
    if (feedbackFilter.eventId !== 'all') {
      filtered = filtered.filter(feedback => {
        // Support both property naming conventions
        const feedbackEventId = feedback.event_id || feedback.eventId;
        return feedbackEventId === parseInt(feedbackFilter.eventId);
      });
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

  // Handle image upload changes
  const handleImageChange = (imageData) => {
    if (imageData) {
      setFormData(prev => ({
        ...prev,
        image_url: imageData.url || '',
        image_filename: imageData.filename || '',
        image_type: imageData.type || '',
        image_size: imageData.size || '',
        image_mimetype: imageData.mimetype || ''
      }));
    } else {
      // Clear image data when image is removed
      setFormData(prev => ({
        ...prev,
        image_url: '',
        image_filename: '',
        image_type: '',
        image_size: '',
        image_mimetype: ''
      }));
    }
    
    // Clear messages when image changes
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

  // Registration & User Management Functions
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
      const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/companies`;
      
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
        console.log('Company updated successfully:', response.data);
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
        console.log('Company registered successfully:', response.data);
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

  const handlePeopleRegistration = async (personData) => {
    setIsLoading(true);
    setError('');
    
    try {
      const token = AuthTokenService.getToken();
      
      if (!token) {
        setError('You must be logged in to register a person');
        return;
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/attendees`,
        {
          email: personData.email,
          full_name: personData.full_name || personData.name,
          phone: personData.phone,
          date_of_birth: personData.date_of_birth,
          gender: personData.gender,
          interests: personData.interests,
          emergency_contact_name: personData.emergency_contact_name,
          emergency_contact_phone: personData.emergency_contact_phone,
          dietary_restrictions: personData.dietary_restrictions,
          accessibility_needs: personData.accessibility_needs,
          profile_picture_url: personData.profile_picture_url,
          bio: personData.bio,
          social_media_links: personData.social_media_links,
          notification_preferences: personData.notification_preferences
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data) {
        setSuccess('Person registered successfully!');
        setShowPeopleForm(false);
        
        // Refresh attendees list
        loadAttendees();
        
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error during people registration:', error);
      
      if (error.response) {
        setError(error.response.data.message || 'Failed to register person');
      } else {
        setError('Failed to register person. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualEventRegistration = async (registrationData) => {
    setIsLoading(true);
    setError('');
    
    try {
      const token = AuthTokenService.getToken();
      
      // Debug the incoming registration data
      console.log('🔍 Received registration data in handler:', registrationData);
      console.log('📧 Email in data:', registrationData.email);
      console.log('👤 Full name in data:', registrationData.full_name);
      console.log('🎯 Event ID:', registrationData.eventId);
      
      // Extract eventId from the registration data
      const eventId = registrationData.eventId;
      
      if (!eventId) {
        throw new Error('Event ID is required for registration');
      }
      
      // Create payload manually to ensure all fields are included and match backend expectations
      const payload = {
        attendeeName: registrationData.attendeeName,
        attendeeEmail: registrationData.attendeeEmail,
        attendeePhone: registrationData.attendeePhone,
        ticketTypeId: registrationData.ticketTypeId ? parseInt(registrationData.ticketTypeId) : null,
        ticketQuantity: registrationData.ticketQuantity ? parseInt(registrationData.ticketQuantity) : 1,
        specialRequirements: registrationData.specialRequirements || '',
        company: registrationData.company || '',
        dietaryRestrictions: registrationData.dietaryRestrictions || '',
        accessibilityNeeds: registrationData.accessibilityNeeds || '',
        notes: registrationData.notes || '',
        registrationType: registrationData.registrationType || 'manual',
        paymentStatus: registrationData.paymentStatus || 'paid'
      };
      
      console.log('📤 Final payload being sent to backend:', payload);
      console.log('� URL:', `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${eventId}/manual-registration`);
      
      // Validate required fields before sending
      if (!payload.attendeeEmail || !payload.attendeeName || !payload.ticketTypeId) {
        throw new Error(`Missing required fields: email=${!!payload.attendeeEmail}, name=${!!payload.attendeeName}, ticket=${!!payload.ticketTypeId}`);
      }
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${eventId}/manual-registration`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data) {
        setSuccess('Event registration completed successfully!');
        setShowRegistrationForm(false);
        
        // Refresh data to update counts (loadEvents will also refresh sales data)
        loadEvents();
        loadAttendees();
        
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error during manual registration:', error);
      console.error('Error response data:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      const errorMessage = error.response?.data?.message || 'Failed to register attendee. Please try again.';
      setError(errorMessage);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsLoading(false);
    }
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
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events`, 
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
      
      // Sales data will be automatically recalculated by the useEffect when events change
      
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
        image_filename: '',
        image_type: '',
        image_size: '',
        image_mimetype: '',
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

  // Event management functions
  const handleViewEvent = (event) => {
    console.log('Viewing event:', event);
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const handleEditEvent = (event) => {
    console.log('Editing event:', event);
    setSelectedEvent(event);
    
    // Format datetime for datetime-local input (requires yyyy-MM-ddThh:mm format)
    const formatDateTimeForInput = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      // Format as YYYY-MM-DDTHH:MM
      return date.toISOString().slice(0, 16);
    };
    
    // Populate form with event data
    setFormData({
      event_name: event.event_name || '',
      event_date: formatDateTimeForInput(event.event_date),
      venue_name: event.venue_name || '',
      venue_address: event.venue_address || '',
      description: event.description || '',
      category: event.category || '',
      event_type: event.event_type || 'Conference',
      ticket_price: event.ticket_price || '',
      image_url: event.image_url || '',
      image_filename: event.image_filename || '',
      image_type: event.image_type || '',
      image_size: event.image_size || '',
      image_mimetype: event.image_mimetype || '',
      registration_deadline: formatDateTimeForInput(event.registration_deadline),
      refund_policy: event.refund_policy || '',
      terms_and_conditions: event.terms_and_conditions || '',
      status: event.status || 'draft',
      is_public: event.is_public !== undefined ? event.is_public : true,
      requires_approval: event.requires_approval !== undefined ? event.requires_approval : false,
      max_tickets_per_person: event.max_tickets_per_person || 5,
      max_attendees: event.max_attendees || '',
      tags: Array.isArray(event.tags) ? event.tags.join(', ') : event.tags || ''
    });
    
    setShowEditForm(true);
  };

  const handleDeleteEvent = (event) => {
    console.log('Deleting event:', event);
    setEventToDelete(event);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const token = AuthTokenService.getToken();
      
      if (!token || AuthTokenService.isTokenExpired()) {
        setError('Your session has expired. Please log in again.');
        return;
      }
      
      const response = await axios.delete(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${eventToDelete.event_id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.data) {
        setSuccess(`Event "${eventToDelete.event_name}" deleted successfully!`);
        setShowDeleteConfirm(false);
        setEventToDelete(null);
        
        // Refresh events list
        loadEvents();
        
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      
      const errorMessage = error.response?.data?.message || 'Failed to delete event. Please try again.';
      setError(errorMessage);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    
    if (!validateForm() || !selectedEvent) {
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
      tags: formData.tags && typeof formData.tags === 'string' ? formData.tags.split(',').map(tag => tag.trim()) : formData.tags
    };
    
    try {
      const token = AuthTokenService.getToken();
      
      if (!token || AuthTokenService.isTokenExpired()) {
        setError('Your session has expired. Please log in again.');
        return;
      }
      
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${selectedEvent.event_id}`,
        eventData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data) {
        setSuccess(`Event "${formData.event_name}" updated successfully!`);
        setShowEditForm(false);
        setSelectedEvent(null);
        
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
          image_filename: '',
          image_type: '',
          image_size: '',
          image_mimetype: '',
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
        
        // Refresh events list
        loadEvents();
        
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error updating event:', error);
      
      const errorMessage = error.response?.data?.message || 'Failed to update event. Please try again.';
      setError(errorMessage);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsLoading(false);
    }
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
          handleImageChange={handleImageChange}
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
          onViewEvent={handleViewEvent}
          onEditEvent={handleEditEvent}
          onDeleteEvent={handleDeleteEvent}
        />
      </div>
      
      </div>
      
      {/* Event Details Modal */}
      {showEventDetails && selectedEvent && (
        <div className="modal-overlay" onClick={() => setShowEventDetails(false)}>
          <div className="modal-content event-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="fas fa-eye"></i>
                Event Details
              </h2>
              <button 
                className="close-btn"
                onClick={() => setShowEventDetails(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="event-details-grid">
                <div className="detail-group">
                  <label>Event Name:</label>
                  <span>{selectedEvent.event_name}</span>
                </div>
                <div className="detail-group">
                  <label>Date & Time:</label>
                  <span>{formatDate(selectedEvent.event_date)}</span>
                </div>
                <div className="detail-group">
                  <label>Venue:</label>
                  <span>{selectedEvent.venue_name}</span>
                </div>
                <div className="detail-group">
                  <label>Address:</label>
                  <span>{selectedEvent.venue_address}</span>
                </div>
                <div className="detail-group">
                  <label>Category:</label>
                  <span>{selectedEvent.category}</span>
                </div>
                <div className="detail-group">
                  <label>Type:</label>
                  <span>{selectedEvent.event_type}</span>
                </div>
                <div className="detail-group">
                  <label>Max Attendees:</label>
                  <span>{selectedEvent.max_attendees || 'Unlimited'}</span>
                </div>
                <div className="detail-group">
                  <label>Ticket Price:</label>
                  <span>{selectedEvent.ticket_price > 0 ? `GH₵${selectedEvent.ticket_price}` : 'Free'}</span>
                </div>
                <div className="detail-group full-width">
                  <label>Description:</label>
                  <p>{selectedEvent.description}</p>
                </div>
                <div className="detail-group">
                  <label>Status:</label>
                  <span className={`status-badge ${selectedEvent.status}`}>
                    {selectedEvent.status}
                  </span>
                </div>
                <div className="detail-group">
                  <label>Public:</label>
                  <span>{selectedEvent.is_public ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowEventDetails(false)}
              >
                Close
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setShowEventDetails(false);
                  handleEditEvent(selectedEvent);
                }}
              >
                Edit Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditForm && selectedEvent && (
        <div className="modal-overlay" onClick={() => setShowEditForm(false)}>
          <div className="modal-content edit-event-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="fas fa-edit"></i>
                Edit Event
              </h2>
              <button 
                className="close-btn"
                onClick={() => setShowEditForm(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleUpdateEvent}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="edit_event_name">Event Name *</label>
                    <input
                      type="text"
                      id="edit_event_name"
                      name="event_name"
                      value={formData.event_name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="edit_event_date">Event Date *</label>
                    <input
                      type="datetime-local"
                      id="edit_event_date"
                      name="event_date"
                      value={formData.event_date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="edit_venue_name">Venue Name *</label>
                    <input
                      type="text"
                      id="edit_venue_name"
                      name="venue_name"
                      value={formData.venue_name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="edit_venue_address">Venue Address</label>
                    <textarea
                      id="edit_venue_address"
                      name="venue_address"
                      value={formData.venue_address}
                      onChange={handleInputChange}
                      rows="3"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="edit_category">Category</label>
                    <select
                      id="edit_category"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Category</option>
                      <option value="conference">Conference</option>
                      <option value="workshop">Workshop</option>
                      <option value="seminar">Seminar</option>
                      <option value="networking">Networking</option>
                      <option value="social">Social</option>
                      <option value="sports">Sports</option>
                      <option value="technology">Technology</option>
                      <option value="business">Business</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="edit_max_attendees">Max Attendees</label>
                    <input
                      type="number"
                      id="edit_max_attendees"
                      name="max_attendees"
                      value={formData.max_attendees}
                      onChange={handleInputChange}
                      min="1"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="edit_ticket_price">Ticket Price ($)</label>
                    <input
                      type="number"
                      id="edit_ticket_price"
                      name="ticket_price"
                      value={formData.ticket_price}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div className="form-group">
                    <ImageUpload
                      currentImage={formData.image_url}
                      onImageChange={handleImageChange}
                      label="Event Image"
                      required={false}
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="form-group full-width">
                    <label htmlFor="edit_description">Description *</label>
                    <textarea
                      id="edit_description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows="4"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        name="is_public"
                        checked={formData.is_public}
                        onChange={handleInputChange}
                      />
                      Public Event
                    </label>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="edit_status">Status</label>
                    <select
                      id="edit_status"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditForm(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? 'Updating...' : 'Update Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && eventToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="fas fa-exclamation-triangle"></i>
                Confirm Delete
              </h2>
              <button 
                className="close-btn"
                onClick={() => setShowDeleteConfirm(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete the event:</p>
              <h3 className="event-name-highlight">"{eventToDelete.event_name}"</h3>
              <p className="warning-text">
                <i className="fas fa-warning"></i>
                This action cannot be undone. All associated registrations, tickets, and data will be permanently deleted.
              </p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger"
                onClick={confirmDeleteEvent}
                disabled={isLoading}
              >
                {isLoading ? 'Deleting...' : 'Delete Event'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Global Footer */}
      <Footer />
    </>
  );
};

export default OrganizerDashboard;
