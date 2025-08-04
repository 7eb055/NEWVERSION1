# Enhanced Browse Events Page

This document explains the updated browse events functionality that connects to the backend API.

## Features

### 🔄 Dynamic Event Loading
- Fetches published events from the backend API
- Real-time event data including registration counts
- Loading states and error handling

### 📅 Date-based Filtering
- Dynamic date selector based on available events
- Filter events by specific dates
- "All Events" option to view everything

### 🎫 Event Registration
- Direct registration from the browse page
- Authentication check before registration
- Real-time capacity tracking
- Sold-out event handling

### 📱 Enhanced User Experience
- Loading spinners and error messages
- Responsive design for mobile devices
- Event details display (price, capacity, organizer)
- Visual status indicators

## Backend Integration

### API Endpoints Used
- `GET /api/events` - Fetch published events
- `GET /api/events/:id/details` - Get event details
- `POST /api/events/:id/register` - Register for event

### Event Data Structure
The component expects events with the following structure from the backend:
```json
{
  "event_id": 1,
  "event_name": "Event Title",
  "event_date": "2025-01-15T10:00:00Z",
  "ticket_price": 50.00,
  "max_attendees": 100,
  "registration_count": 25,
  "organizer_name": "John Doe",
  "company_name": "Company Name",
  "status": "published"
}
```

## Setup Instructions

### 1. Environment Configuration
Make sure your `.env` file in the eventfrontend folder contains:
```
VITE_API_URL=http://localhost:5000
```

### 2. Backend Requirements
- PostgreSQL database with events, organizers, and registration tables
- Backend server running on port 5000
- CORS properly configured for frontend domain

### 3. Authentication
- Users must be logged in to register for events
- JWT token authentication is handled automatically
- Redirects to login if not authenticated

## Testing

### API Testing
Run the test file to verify backend connectivity:
```bash
cd /path/to/project
node test-events-api.js
```

### Component Testing
1. Start the backend server:
   ```bash
   cd backend
   npm start
   ```

2. Start the frontend:
   ```bash
   cd eventfrontend
   npm run dev
   ```

3. Navigate to the browse events page

## Error Handling

### Common Issues and Solutions

1. **"Failed to load events"**
   - Check if backend server is running
   - Verify API URL in .env file
   - Check network connectivity

2. **"No events available"**
   - Verify there are published events in the database
   - Check event status filter in API call

3. **Registration fails**
   - Ensure user is logged in
   - Check event capacity
   - Verify attendee record exists for user

4. **CORS errors**
   - Check backend CORS configuration
   - Verify frontend URL is in allowed origins

## File Structure

```
eventfrontend/src/
├── component/
│   ├── broweEvents.jsx          # Main component
│   └── css/
│       └── browseEvents.css     # Enhanced styles
└── services/
    ├── EventService.js          # Event-specific API calls
    ├── ApiService.js            # Base API service
    └── AuthTokenService.js      # Authentication handling
```

## Future Enhancements

### Potential Improvements
1. **Event Details Modal** - Full event information popup
2. **Advanced Filtering** - By price, category, location
3. **Search Functionality** - Text-based event search
4. **Pagination** - Handle large numbers of events
5. **Event Images** - Support for event photos
6. **Social Sharing** - Share events on social media

### Database Optimizations
1. **Indexing** - On event_date and status fields
2. **Caching** - Redis for frequently accessed events
3. **Image Storage** - CDN for event images

## API Response Examples

### GET /api/events
```json
[
  {
    "event_id": 1,
    "event_name": "Tech Conference 2025",
    "event_date": "2025-01-15T09:00:00Z",
    "ticket_price": 99.99,
    "max_attendees": 500,
    "registration_count": 234,
    "organizer_name": "John Smith",
    "company_name": "Tech Corp",
    "status": "published",
    "created_at": "2024-12-01T10:00:00Z"
  }
]
```

### POST /api/events/:id/register
```json
{
  "message": "Registration successful",
  "registration": {
    "registration_id": 123,
    "event_id": 1,
    "attendee_id": 45,
    "registration_date": "2025-01-05T14:30:00Z",
    "total_amount": 99.99,
    "payment_status": "completed",
    "ticket_quantity": 1
  }
}
```

## Troubleshooting

### Development Mode
Enable verbose logging by setting:
```javascript
// In EventService.js
console.log('API Request:', response);
```

### Production Deployment
1. Update VITE_API_URL to production backend URL
2. Build with `npm run build`
3. Serve static files from dist/ folder
4. Configure production CORS settings

## Support
For issues or questions about the browse events functionality, check:
1. Browser console for JavaScript errors
2. Network tab for API call failures
3. Backend logs for server-side issues
4. Database connection and data integrity
