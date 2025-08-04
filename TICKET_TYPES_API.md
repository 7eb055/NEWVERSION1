# Ticket Types API Documentation

This document outlines the API endpoints for managing ticket types for events in the Event Management System.

## Table of Contents
- [Overview](#overview)
- [API Endpoints](#api-endpoints)
  - [GET /api/events/:eventId/ticket-types](#get-apieventseventidticket-types)
  - [POST /api/events/:eventId/ticket-types](#post-apieventseventidticket-types)
  - [PUT /api/events/:eventId/ticket-types/:ticketTypeId](#put-apieventseventidticket-typestickettypeid)
  - [DELETE /api/events/:eventId/ticket-types/:ticketTypeId](#delete-apieventseventidticket-typestickettypeid)
- [Models](#models)
  - [Ticket Type](#ticket-type)

## Overview

The Ticket Types API allows organizers to create and manage different types of tickets for their events. This enables tiered pricing, VIP access, and other special ticket offerings.

## API Endpoints

### GET /api/events/:eventId/ticket-types

Get all ticket types for a specific event.

**Authentication Required**: Yes (Bearer Token)  
**Authorization**: Must be the organizer of the event

**Parameters**:
- `eventId`: The ID of the event (path parameter)

**Response**:
```json
{
  "success": true,
  "ticketTypes": [
    {
      "ticket_type_id": 1,
      "event_id": 123,
      "type_name": "General Admission",
      "price": 50.00,
      "quantity_available": 100,
      "quantity_sold": 45,
      "description": "Standard event ticket",
      "benefits": "Event access, Welcome kit",
      "is_active": true,
      "sales_start_date": "2025-08-01T00:00:00Z",
      "sales_end_date": "2025-08-20T00:00:00Z",
      "created_at": "2025-07-10T12:00:00Z",
      "updated_at": "2025-07-10T12:00:00Z"
    },
    {
      "ticket_type_id": 2,
      "event_id": 123,
      "type_name": "VIP",
      "price": 150.00,
      "quantity_available": 20,
      "quantity_sold": 5,
      "description": "Premium experience",
      "benefits": "Premium seating, Exclusive gift, Meet & Greet",
      "is_active": true,
      "sales_start_date": "2025-08-01T00:00:00Z",
      "sales_end_date": "2025-08-15T00:00:00Z",
      "created_at": "2025-07-10T12:30:00Z",
      "updated_at": "2025-07-10T12:30:00Z"
    }
  ],
  "count": 2
}
```

### POST /api/events/:eventId/ticket-types

Create a new ticket type for an event.

**Authentication Required**: Yes (Bearer Token)  
**Authorization**: Must be the organizer of the event

**Parameters**:
- `eventId`: The ID of the event (path parameter)

**Request Body**:
```json
{
  "type_name": "Early Bird",
  "price": 40.00,
  "quantity_available": 50,
  "description": "Limited early bird tickets at a discounted price",
  "benefits": "Event access, Welcome drink",
  "is_active": true,
  "sales_start_date": "2025-08-01T00:00:00Z",
  "sales_end_date": "2025-08-10T00:00:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Ticket type created successfully",
  "ticketType": {
    "ticket_type_id": 3,
    "event_id": 123,
    "type_name": "Early Bird",
    "price": 40.00,
    "quantity_available": 50,
    "quantity_sold": 0,
    "description": "Limited early bird tickets at a discounted price",
    "benefits": "Event access, Welcome drink",
    "is_active": true,
    "sales_start_date": "2025-08-01T00:00:00Z",
    "sales_end_date": "2025-08-10T00:00:00Z",
    "created_at": "2025-07-15T09:00:00Z",
    "updated_at": "2025-07-15T09:00:00Z"
  }
}
```

### PUT /api/events/:eventId/ticket-types/:ticketTypeId

Update an existing ticket type.

**Authentication Required**: Yes (Bearer Token)  
**Authorization**: Must be the organizer of the event

**Parameters**:
- `eventId`: The ID of the event (path parameter)
- `ticketTypeId`: The ID of the ticket type to update (path parameter)

**Request Body** (partial updates allowed):
```json
{
  "price": 45.00,
  "quantity_available": 60,
  "description": "Updated description for early bird tickets"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Ticket type updated successfully",
  "ticketType": {
    "ticket_type_id": 3,
    "event_id": 123,
    "type_name": "Early Bird",
    "price": 45.00,
    "quantity_available": 60,
    "quantity_sold": 0,
    "description": "Updated description for early bird tickets",
    "benefits": "Event access, Welcome drink",
    "is_active": true,
    "sales_start_date": "2025-08-01T00:00:00Z",
    "sales_end_date": "2025-08-10T00:00:00Z",
    "created_at": "2025-07-15T09:00:00Z",
    "updated_at": "2025-07-15T10:30:00Z"
  }
}
```

### DELETE /api/events/:eventId/ticket-types/:ticketTypeId

Delete a ticket type.

**Authentication Required**: Yes (Bearer Token)  
**Authorization**: Must be the organizer of the event

**Parameters**:
- `eventId`: The ID of the event (path parameter)
- `ticketTypeId`: The ID of the ticket type to delete (path parameter)

**Response**:
```json
{
  "success": true,
  "message": "Ticket type deleted successfully"
}
```

## Models

### Ticket Type

The ticket type model represents different categories of tickets that can be sold for an event.

| Field | Type | Description |
|-------|------|-------------|
| ticket_type_id | Integer | Unique identifier for the ticket type |
| event_id | Integer | The event this ticket type belongs to |
| type_name | String | Name of the ticket type (e.g., "VIP", "General Admission") |
| price | Decimal | Price of the ticket |
| quantity_available | Integer | Total number of tickets available for this type |
| quantity_sold | Integer | Number of tickets sold so far |
| description | Text | Description of what the ticket includes |
| benefits | Text | List of benefits included with this ticket type |
| is_active | Boolean | Whether this ticket type is currently available for purchase |
| sales_start_date | Timestamp | When sales for this ticket type begin |
| sales_end_date | Timestamp | When sales for this ticket type end |
| created_at | Timestamp | When this ticket type was created |
| updated_at | Timestamp | When this ticket type was last updated |
