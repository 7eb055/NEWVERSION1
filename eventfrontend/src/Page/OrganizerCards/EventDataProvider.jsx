import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import AuthTokenService from '../../services/AuthTokenService';
import { EventDataContext } from './contexts/EventDataContext';

// EventDataProvider component that manages all event-related data and API calls
const EventDataProvider = ({ children }) => {
  // Core state - explicit initialization to prevent TDZ issues
  const [events, setEvents] = useState(() => []);
  const [companies, setCompanies] = useState(() => []);
  const [people, setPeople] = useState(() => []);
  const [eventRegistrations, setEventRegistrations] = useState(() => []);
  const [isLoading, setIsLoading] = useState(() => false);
  const [error, setError] = useState(() => '');
  const [success, setSuccess] = useState(() => '');
  
  // Sales data state - explicit initialization
  const [salesData, setSalesData] = useState(() => ({
    totalIncome: 0,
    eventSales: []
  }));
  
  // User data - explicit initialization
  const [user, setUser] = useState(() => null);

  // DEFINE ALL FUNCTIONS FIRST TO PREVENT HOISTING ISSUES

  // Load sales data from events - NO DEPENDENCIES to prevent circular refs
  const loadSalesData = useCallback(async function loadSalesDataFunction(eventsData) {
    console.log('💰 loadSalesData called - currently enabled for testing', eventsData);
    try {
      const eventsToProcess = eventsData || [];
      
      // Calculate sales data from loaded events
      let totalIncome = 0;
      const eventSales = [];

      eventsToProcess.forEach(event => {
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

      const calculatedSalesData = {
        totalIncome,
        eventSales
      };

      console.log('📊 Calculated sales data:', calculatedSalesData);
      setSalesData(calculatedSalesData);
      
      // Cache sales data using current user data directly (no dependency)
      try {
        const currentUser = AuthTokenService.getUser();
        const cacheKey = currentUser?.user_id ? `organizer_sales_data_${currentUser.user_id}` : 'organizer_sales_data';
        localStorage.setItem(cacheKey, JSON.stringify(calculatedSalesData));
      } catch (err) {
        console.warn('Could not cache sales data:', err);
      }
      
    } catch (error) {
      console.error('❌ Error calculating sales data:', error);
      setSalesData({ totalIncome: 0, eventSales: [] });
    }
  }, []); // Empty dependencies

  // Load organizer-specific events from API
  const loadEvents = useCallback(async function loadEventsFunction() {
    console.log('🔧 loadEvents called - currently enabled for testing');
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
      console.log('✅ Events loaded successfully:', loadedEvents);
      
      // Load sales data after events are loaded
      if (loadedEvents.length > 0) {
        loadSalesData(loadedEvents);
      }
      
    } catch (error) {
      console.error('❌ Error loading events:', error);
      setError('Failed to load events. Please try again.');
      setEvents([]);
      setSalesData({ totalIncome: 0, eventSales: [] });
    } finally {
      setIsLoading(false);
    }
  }, [loadSalesData]);

  // Load companies from API
  const loadCompanies = useCallback(async function loadCompaniesFunction() {
    try {
      const token = AuthTokenService.getToken();
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/companies`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setCompanies(response.data.companies || response.data || []);
      console.log('🏢 Companies loaded successfully');
    } catch (error) {
      console.error('❌ Error loading companies:', error);
      setCompanies([]);
    }
  }, []);

  // Load attendees from API
  const loadAttendees = useCallback(async function loadAttendeesFunction() {
    try {
      const token = AuthTokenService.getToken();
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/attendees`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setPeople(response.data.attendees || response.data || []);
      console.log('👥 Attendees loaded successfully');
    } catch (error) {
      console.error('❌ Error loading attendees:', error);
      setPeople([]);
    }
  }, []);

  // Initialize user data from localStorage
  useEffect(() => {
    const userData = AuthTokenService.getUser();
    if (userData) {
      setUser(userData);
      
      // Try to restore cached sales data
      try {
        const cacheKey = userData?.user_id ? `organizer_sales_data_${userData.user_id}` : 'organizer_sales_data';
        const cachedSalesData = localStorage.getItem(cacheKey);
        if (cachedSalesData) {
          const parsedSalesData = JSON.parse(cachedSalesData);
          setSalesData(parsedSalesData);
          console.log('📈 Restored cached sales data:', parsedSalesData);
        }
      } catch (err) {
        console.warn('Could not restore cached sales data:', err);
      }
    }
  }, []);

  // Load initial data when provider mounts
  useEffect(() => {
    if (user) {
      loadEvents();
      // loadCompanies(); // Enable when needed
      // loadAttendees(); // Enable when needed
    }
  }, [user, loadEvents]); // Only depend on user and loadEvents

  // Utility functions
  const clearError = () => setError('');
  const clearSuccess = () => setSuccess('');
  const setErrorMessage = (message) => setError(message);
  const setSuccessMessage = (message) => setSuccess(message);

  // Context value
  const contextValue = {
    // Data
    events,
    companies,
    people,
    eventRegistrations,
    salesData,
    user,
    
    // Loading states
    isLoading,
    error,
    success,
    
    // Data loading functions
    loadEvents,
    loadSalesData,
    loadCompanies,
    loadAttendees,
    
    // State setters
    setEvents,
    setCompanies,
    setPeople,
    setEventRegistrations,
    setSalesData,
    
    // Utility functions
    clearError,
    clearSuccess,
    setErrorMessage,
    setSuccessMessage
  };

  return (
    <EventDataContext.Provider value={contextValue}>
      {children}
    </EventDataContext.Provider>
  );
};

export default EventDataProvider;
