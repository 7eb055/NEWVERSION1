// Event Service - Handles all event-related API calls
import ApiService from './ApiService';

class EventService {
  constructor() {
    // ApiService is exported as a singleton instance, so we use it directly
    this.apiService = ApiService;
    
    // Set the API URL if needed
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    this.apiService.setBaseURL(apiUrl);
  }

  // Get all published events with optional filters
  async getPublishedEvents(filters = {}) {
    try {
      const queryParams = {
        status: 'published',
        ...filters
      };
      
      return await this.apiService.getEvents(queryParams);
    } catch (error) {
      console.error('Error fetching published events:', error);
      return {
        success: false,
        error: 'Failed to fetch events',
        data: []
      };
    }
  }

  // Get event details by ID
  async getEventDetails(eventId) {
    try {
      return await this.apiService.makeRequest('GET', `/api/events/${eventId}/details`);
    } catch (error) {
      console.error('Error fetching event details:', error);
      return {
        success: false,
        error: 'Failed to fetch event details'
      };
    }
  }

  // Register for an event
  async registerForEvent(eventId, ticketQuantity = 1) {
    try {
      return await this.apiService.makeRequest('POST', `/api/events/${eventId}/register`, {
        ticket_quantity: ticketQuantity
      });
    } catch (error) {
      console.error('Error registering for event:', error);
      return {
        success: false,
        error: 'Failed to register for event'
      };
    }
  }

  // Format event data for display
  formatEventForDisplay(event) {
    return {
      id: event.event_id,
      title: event.event_name,
      date: new Date(event.event_date),
      price: parseFloat(event.ticket_price || 0),
      maxAttendees: event.max_attendees,
      registrationCount: parseInt(event.registration_count || 0),
      organizerName: event.organizer_name,
      companyName: event.company_name,
      organizerPhone: event.organizer_phone,
      status: event.status,
      createdAt: new Date(event.created_at)
    };
  }

  // Group events by date
  groupEventsByDate(events) {
    const grouped = {};
    
    events.forEach(event => {
      const eventDate = new Date(event.event_date);
      const dateKey = eventDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: eventDate,
          events: []
        };
      }
      
      grouped[dateKey].events.push(this.formatEventForDisplay(event));
    });
    
    return grouped;
  }

  // Get available event dates for the next 30 days
  getAvailableEventDates(events) {
    const dates = events.map(event => new Date(event.event_date));
    const uniqueDates = [...new Set(dates.map(date => date.toISOString().split('T')[0]))];
    
    return uniqueDates
      .map(dateString => {
        const date = new Date(dateString);
        return {
          dateString,
          date,
          day: date.getDate(),
          month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
          year: date.getFullYear(),
          label: `Day ${date.getDate()}`,
          eventsCount: events.filter(event => 
            new Date(event.event_date).toISOString().split('T')[0] === dateString
          ).length
        };
      })
      .sort((a, b) => a.date - b.date);
  }
}

export default new EventService();
