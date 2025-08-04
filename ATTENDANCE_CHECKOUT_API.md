# Enhanced Attendance Checkout API

## Overview

The Enhanced Attendance Checkout API provides a flexible way to check out attendees from events. It supports several checkout methods and can operate in both flexible and strict modes.

## Endpoint

```
POST /api/events/:eventId/attendance/checkout
```

## Authentication

Requires a valid JWT token in the Authorization header:

```
Authorization: Bearer {token}
```

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| eventId | string | Yes | The ID of the event (in URL path) |
| registration_id | number | Yes* | The attendee's registration ID (*Required if log_id not provided) |
| log_id | number | Yes* | The specific attendance log entry ID (*Required if registration_id not provided) |
| strict_mode | boolean | No | If true, rejects checkout when no active check-in exists (default: false) |

## Response

### Success Response

```json
{
  "success": true,
  "message": "Check-out successful",
  "status": "normal_checkout", // or "forced_checkout" if no active check-in existed
  "data": {
    "log_id": 5,
    "registration_id": 9,
    "check_in_time": "2025-08-04T10:39:42.626Z",
    "check_out_time": "2025-08-04T11:03:56.674Z",
    "attendee": {
      "full_name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

### Error Response (Strict Mode)

```json
{
  "success": false,
  "message": "No active check-in found for this attendee",
  "code": "NO_ACTIVE_CHECKIN",
  "data": {
    "registration_id": 9,
    "event_id": "6"
  }
}
```

### Status Codes

- **200 OK**: Checkout successful
- **400 Bad Request**: Invalid request parameters or no active check-in in strict mode
- **403 Forbidden**: User is not an organizer
- **404 Not Found**: Event not found or not owned by organizer
- **500 Internal Server Error**: Server error during checkout

## Checkout Modes

### Flexible Mode (Default)

In flexible mode, the API always attempts to complete a checkout operation, even if:

1. The attendee was already checked out
2. The attendee was never checked in

This ensures a seamless user experience where checkout operations rarely fail.

### Strict Mode

In strict mode, the API will return an error if:

1. The attendee doesn't have an active check-in (either never checked in or already checked out)

This is useful for enforcing proper check-in/check-out sequences.

## Checkout Methods

### By Log ID

This is the most direct method. It targets a specific attendance log entry for checkout.

```json
{
  "log_id": 5
}
```

### By Registration ID

This is the most common method. It automatically finds the appropriate check-in record for checkout.

```json
{
  "registration_id": 9
}
```

With strict_mode:

```json
{
  "registration_id": 9,
  "strict_mode": true
}
```

## Checkout Scenarios

1. **Active Check-in Exists**: Updates the check-in record with checkout time
2. **No Active Check-in**: 
   - In flexible mode: Updates the most recent record or creates a new one
   - In strict mode: Returns an error
3. **No Check-in Records**: 
   - In flexible mode: Creates a new record with immediate checkout
   - In strict mode: Returns an error

## Example Usage

### Regular Checkout

```javascript
const response = await fetch('/api/events/6/attendance/checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    registration_id: 9
  })
});
```

### Strict Mode Checkout

```javascript
const response = await fetch('/api/events/6/attendance/checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    registration_id: 9,
    strict_mode: true
  })
});
```
