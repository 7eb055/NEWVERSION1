# Event Attendee Listing API Documentation

## Overview
This document describes the Event Attendee Listing API endpoints that provide comprehensive attendee information for events and organizers.

## Base URL
```
http://localhost:5000/api
```

## Authentication
All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Endpoints

### 1. Get Event Attendee Listing

**Endpoint:** `GET /events/:eventId/attendee-listing`

**Description:** Retrieve all attendees for a specific event with comprehensive details including registration, payment, and attendance information.

**Parameters:**
- `eventId` (path parameter): The ID of the event

**Query Parameters:**
- `organizer_id` (optional): Filter by organizer ID

**Response:**
```json
{
  "success": true,
  "count": 25,
  "attendees": [
    {
      // Event Information
      "event_id": 1,
      "event_name": "Tech Conference 2024",
      "event_date": "2024-03-15T00:00:00.000Z",
      "event_time": "09:00:00",
      "end_date": "2024-03-15",
      "end_time": "17:00:00",
      "venue_name": "Convention Center",
      "venue_address": "123 Main St, City, State",
      "event_type": "Conference",
      "category": "Technology",
      "ticket_price": 199.99,
      "max_attendees": 500,
      
      // Organizer Information
      "organizer_id": 1,
      "organizer_name": "Tech Events Inc",
      "organizer_email": "contact@techevents.com",
      "organizer_company": "Tech Events Inc",
      
      // Registration Information
      "registration_id": 123,
      "registration_date": "2024-02-01T10:30:00.000Z",
      "ticket_quantity": 1,
      "total_amount": 199.99,
      "payment_status": "completed",
      "payment_method": "credit_card",
      "payment_reference": "TXN123456",
      "special_requirements": "Vegetarian meal",
      "qr_code": "QR16...",
      "registration_status": "confirmed",
      "cancellation_reason": null,
      
      // Attendee Information
      "attendee_id": 456,
      "attendee_name": "John Doe",
      "attendee_email": "john.doe@email.com",
      "attendee_phone": "+1-555-0123",
      "date_of_birth": "1990-05-15",
      "gender": "Male",
      "interests": "AI, Machine Learning",
      "dietary_restrictions": "Vegetarian",
      "accessibility_needs": null,
      "emergency_contact_name": "Jane Doe",
      "emergency_contact_phone": "+1-555-0124",
      "profile_picture_url": "https://example.com/profile.jpg",
      "bio": "Software Engineer with 5 years experience",
      "social_media_links": {"linkedin": "linkedin.com/in/johndoe"},
      "notification_preferences": {"email": true, "sms": false},
      
      // Attendance Tracking
      "check_in_status": true,
      "attendance_id": 789,
      "check_in_time": "2024-03-15T08:45:00.000Z",
      "check_out_time": "2024-03-15T17:15:00.000Z",
      "scan_method": "qr_code",
      "scanned_by_user_id": 100,
      "scanned_by_email": "scanner@techevents.com",
      "attendance_status": "checked_in",
      "attendance_duration_hours": 8.5,
      
      // Ticket Information
      "ticket_type_id": 1,
      "ticket_type": "Early Bird",
      "ticket_type_price": 199.99,
      "ticket_description": "Early bird discount ticket"
    }
  ]
}
```

### 2. Get Organizer Attendee Listing

**Endpoint:** `GET /organizers/:organizerId/attendee-listing`

**Description:** Retrieve attendee listings for all events by a specific organizer with filtering and pagination.

**Parameters:**
- `organizerId` (path parameter): The ID of the organizer

**Query Parameters:**
- `event_id` (optional): Filter by specific event
- `attendance_status` (optional): Filter by attendance status (`checked_in`, `registered`)
- `payment_status` (optional): Filter by payment status (`completed`, `pending`, `failed`)
- `limit` (optional): Number of records to return (pagination)
- `offset` (optional): Number of records to skip (pagination)

**Response:**
```json
{
  "success": true,
  "count": 50,
  "total": 234,
  "pagination": {
    "limit": 50,
    "offset": 0,
    "has_more": true
  },
  "attendees": [
    {
      // Simplified attendee information
      "event_id": 1,
      "event_name": "Tech Conference 2024",
      "event_date": "2024-03-15T00:00:00.000Z",
      "event_time": "09:00:00",
      "venue_name": "Convention Center",
      "category": "Technology",
      
      "organizer_id": 1,
      "organizer_name": "Tech Events Inc",
      "organizer_email": "contact@techevents.com",
      
      "registration_id": 123,
      "registration_date": "2024-02-01T10:30:00.000Z",
      "ticket_quantity": 1,
      "total_amount": 199.99,
      "payment_status": "completed",
      "registration_status": "confirmed",
      
      "attendee_id": 456,
      "attendee_name": "John Doe",
      "attendee_email": "john.doe@email.com",
      "attendee_phone": "+1-555-0123",
      
      "check_in_status": true,
      "check_in_time": "2024-03-15T08:45:00.000Z",
      "attendance_status": "checked_in"
    }
  ]
}
```

### 3. Get Event Attendee Statistics

**Endpoint:** `GET /events/:eventId/attendee-stats`

**Description:** Get comprehensive statistics and summary information for an event's attendees.

**Parameters:**
- `eventId` (path parameter): The ID of the event

**Response:**
```json
{
  "success": true,
  "event_id": 1,
  "statistics": {
    "registrations": {
      "total": 234,
      "paid": 210,
      "pending": 24,
      "checked_in": 198
    },
    "revenue": {
      "total": 46800.00,
      "collected": 41980.00,
      "pending": 4820.00
    },
    "tickets": {
      "sold": 234
    },
    "capacity": {
      "max_attendees": 500,
      "current_registrations": 234,
      "percentage_filled": 46.8,
      "remaining_spots": 266
    }
  }
}
```

## Error Responses

All endpoints return error responses in the following format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (in development mode)"
}
```

Common HTTP status codes:
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Event or organizer not found
- `500 Internal Server Error`: Server-side error

## Usage Examples

### Get all attendees for an event
```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:5000/api/events/1/attendee-listing
```

### Get attendees for an organizer with pagination
```bash
curl -H "Authorization: Bearer <token>" \
     "http://localhost:5000/api/organizers/1/attendee-listing?limit=20&offset=0&payment_status=completed"
```

### Get event statistics
```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:5000/api/events/1/attendee-stats
```

## Database Requirements

These endpoints rely on the following database tables:
- `events`
- `organizers` 
- `eventregistrations`
- `attendees`
- `users`
- `attendancelogs`
- `tickettypes`
- `payments`

Make sure the `event_attendee_listing` table is created if you want to use the physical table approach instead of these dynamic queries.

## Notes

1. All timestamps are returned in ISO 8601 format (UTC)
2. Monetary amounts are returned as decimal numbers with 2 decimal places
3. The API supports both the dynamic query approach (current implementation) and the physical table approach (if the `event_attendee_listing` table is created)
4. Pagination is available for organizer listings to handle large datasets efficiently
5. Filtering options allow for detailed reporting and dashboard features
