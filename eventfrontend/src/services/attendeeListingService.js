// Event Attendee Listing Service
// Frontend service to interact with the attendee listing API

class AttendeeListingService {
  constructor(apiBaseUrl = 'http://localhost:5000/api') {
    this.baseUrl = apiBaseUrl;
  }

  // Get authorization header with JWT token
  getAuthHeaders() {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Get all attendees for a specific event
  async getEventAttendees(eventId, filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.organizer_id) {
        queryParams.append('organizer_id', filters.organizer_id);
      }

      const url = `${this.baseUrl}/events/${eventId}/attendee-listing${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching event attendees:', error);
      throw error;
    }
  }

  // Get attendee listing for organizer's events
  async getOrganizerAttendees(organizerId, filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filter parameters
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          queryParams.append(key, filters[key]);
        }
      });

      const url = `${this.baseUrl}/organizers/${organizerId}/attendee-listing${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching organizer attendees:', error);
      throw error;
    }
  }

  // Get event attendee statistics
  async getEventStats(eventId) {
    try {
      const response = await fetch(`${this.baseUrl}/events/${eventId}/attendee-stats`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching event statistics:', error);
      throw error;
    }
  }
}

// Export the service
export default AttendeeListingService;

// Usage Examples:

/*
// Initialize the service
const attendeeService = new AttendeeListingService();

// Example 1: Get all attendees for an event
const eventAttendees = await attendeeService.getEventAttendees(1);
console.log('Event attendees:', eventAttendees.attendees);

// Example 2: Get organizer attendees with filters
const organizerAttendees = await attendeeService.getOrganizerAttendees(1, {
  event_id: 1,
  attendance_status: 'checked_in',
  payment_status: 'completed',
  limit: 50,
  offset: 0
});

// Example 3: Get event statistics
const eventStats = await attendeeService.getEventStats(1);
console.log('Event statistics:', eventStats.statistics);

// Example 4: Pagination through organizer attendees
async function getAllOrganizerAttendees(organizerId) {
  let allAttendees = [];
  let offset = 0;
  const limit = 100;
  
  while (true) {
    const result = await attendeeService.getOrganizerAttendees(organizerId, {
      limit: limit,
      offset: offset
    });
    
    allAttendees = allAttendees.concat(result.attendees);
    
    if (!result.pagination.has_more) {
      break;
    }
    
    offset += limit;
  }
  
  return allAttendees;
}
*/
