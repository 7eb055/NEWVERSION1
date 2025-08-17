# Backend API Routes for Modal Integration

This document outlines the API endpoints that the new modals expect to connect to. These routes should be implemented in your backend server.

## Company Settings Modal API Routes

### GET /api/companies
- **Purpose**: Fetch all companies for the current user/organization
- **Auth**: Requires Bearer token
- **Response**: 
```json
{
  "companies": [
    {
      "company_id": 1,
      "name": "Tech Corp",
      "email": "contact@techcorp.com",
      "phone": "+1-555-0123",
      "address": "123 Tech Street",
      "website": "https://techcorp.com",
      "industry": "Technology",
      "size": "51-200",
      "description": "Leading tech company",
      "logo_url": "https://example.com/logo.png",
      "status": "active",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/companies
- **Purpose**: Create a new company
- **Auth**: Requires Bearer token
- **Body**: Company data (same structure as GET response)
- **Response**: Created company object

### PUT /api/companies/:companyId
- **Purpose**: Update existing company
- **Auth**: Requires Bearer token
- **Body**: Updated company data
- **Response**: Updated company object

### DELETE /api/companies/:companyId
- **Purpose**: Delete a company
- **Auth**: Requires Bearer token
- **Response**: Success confirmation

## People & Team Modal API Routes

### GET /api/team
- **Purpose**: Fetch all team members
- **Auth**: Requires Bearer token
- **Response**:
```json
{
  "team": [
    {
      "user_id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone": "+1-555-0123",
      "role": "admin",
      "department": "IT",
      "position": "Lead Developer",
      "hire_date": "2024-01-01",
      "salary": 75000,
      "status": "active",
      "permissions": ["create_events", "edit_events", "manage_users"],
      "profile_image": "https://example.com/avatar.jpg",
      "bio": "Experienced developer...",
      "skills": "JavaScript, React, Node.js",
      "emergency_contact": "Jane Doe - 555-0124",
      "address": "123 Main St"
    }
  ]
}
```

### POST /api/team
- **Purpose**: Add new team member
- **Auth**: Requires Bearer token
- **Body**: Team member data
- **Response**: Created team member object

### PUT /api/team/:userId
- **Purpose**: Update team member
- **Auth**: Requires Bearer token
- **Body**: Updated team member data
- **Response**: Updated team member object

### DELETE /api/team/:userId
- **Purpose**: Remove team member
- **Auth**: Requires Bearer token
- **Response**: Success confirmation

## Sales Report Modal API Routes

### GET /api/sales/report?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
- **Purpose**: Fetch sales data for reporting
- **Auth**: Requires Bearer token
- **Query Parameters**: startDate, endDate, eventId (optional), paymentStatus (optional)
- **Response**:
```json
{
  "summary": {
    "totalRevenue": 25000,
    "totalTicketsSold": 500,
    "totalEvents": 10,
    "averageTicketPrice": 50,
    "conversionRate": 15.5,
    "pendingPayments": 1200
  },
  "recentSales": [
    {
      "transaction_id": "txn_12345",
      "event_title": "Tech Conference 2024",
      "customer_name": "John Smith",
      "customer_email": "john@example.com",
      "amount": 150,
      "payment_method": "Credit Card",
      "status": "completed",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "topEvents": [
    {
      "event_id": 1,
      "title": "Tech Conference 2024",
      "revenue": 5000,
      "tickets_sold": 100,
      "capacity": 150,
      "event_date": "2024-02-15"
    }
  ],
  "salesByPeriod": [
    {
      "period": "2024-01-01",
      "amount": 2500
    }
  ],
  "paymentMethods": [
    {
      "method": "Credit Card",
      "percentage": 75,
      "amount": 18750
    }
  ],
  "refunds": [
    {
      "refund_id": "ref_123",
      "original_transaction_id": "txn_456",
      "event_title": "Workshop",
      "amount": 50,
      "reason": "Event cancelled",
      "status": "processed",
      "created_at": "2024-01-10T15:00:00Z"
    }
  ]
}
```

### GET /api/sales/export?format=csv&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
- **Purpose**: Export sales report in various formats
- **Auth**: Requires Bearer token
- **Query Parameters**: format (csv, pdf, xlsx), date range, filters
- **Response**: File download

## Feedback Modal API Routes

### GET /api/feedback
- **Purpose**: Fetch customer feedback
- **Auth**: Requires Bearer token
- **Query Parameters**: eventId, rating, category, status
- **Response**:
```json
{
  "feedback": [
    {
      "feedback_id": 1,
      "customer_name": "Sarah Johnson",
      "customer_email": "sarah@example.com",
      "event_title": "Tech Conference 2024",
      "rating": 5,
      "category": "event_quality",
      "comment": "Excellent event, learned a lot!",
      "sentiment": "positive",
      "is_read": true,
      "response": "Thank you for your feedback!",
      "response_date": "2024-01-16T09:00:00Z",
      "created_at": "2024-01-15T14:30:00Z"
    }
  ]
}
```

### GET /api/feedback/stats
- **Purpose**: Fetch feedback statistics
- **Auth**: Requires Bearer token
- **Response**:
```json
{
  "totalFeedback": 150,
  "averageRating": 4.2,
  "unreadCount": 5,
  "categories": {
    "event_quality": 45,
    "venue": 30,
    "customer_service": 25
  },
  "sentimentAnalysis": {
    "positive": 70,
    "neutral": 20,
    "negative": 10
  }
}
```

### PUT /api/feedback/:feedbackId/read
- **Purpose**: Mark feedback as read
- **Auth**: Requires Bearer token
- **Response**: Success confirmation

### POST /api/feedback/:feedbackId/respond
- **Purpose**: Respond to feedback
- **Auth**: Requires Bearer token
- **Body**: `{ "response": "Thank you for your feedback..." }`
- **Response**: Success confirmation

### DELETE /api/feedback/:feedbackId
- **Purpose**: Delete feedback
- **Auth**: Requires Bearer token
- **Response**: Success confirmation

## Authentication

All API routes require a Bearer token in the Authorization header:
```
Authorization: Bearer your_jwt_token_here
```

The token should be stored in localStorage with the key 'token' as the modals expect.

## Error Handling

All routes should return appropriate HTTP status codes:
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

Error responses should follow this format:
```json
{
  "error": true,
  "message": "Descriptive error message",
  "code": "ERROR_CODE"
}
```

## Database Schema Suggestions

You may need to create or update these database tables:

### companies
- company_id (Primary Key)
- name, email, phone, address, website
- industry, size, description, logo_url
- status, created_at, updated_at
- user_id (Foreign Key to link to user/organization)

### team_members / users (extend existing)
- user_id (Primary Key)
- first_name, last_name, email, phone
- role, department, position
- hire_date, salary, status
- permissions (JSON array)
- profile_image, bio, skills
- emergency_contact, address
- organization_id (Foreign Key)

### sales_transactions
- transaction_id (Primary Key)
- event_id (Foreign Key)
- customer_name, customer_email
- amount, payment_method, status
- created_at, updated_at

### feedback
- feedback_id (Primary Key)
- event_id (Foreign Key)
- customer_name, customer_email
- rating, category, comment
- sentiment, is_read
- response, response_date
- created_at, updated_at

## Implementation Notes

1. **Pagination**: For large datasets, implement pagination in list endpoints
2. **Filtering**: Support query parameters for filtering data
3. **Validation**: Validate all input data on the server side
4. **Security**: Ensure proper authorization checks for all operations
5. **Rate Limiting**: Implement rate limiting for API endpoints
6. **Logging**: Log all API requests for debugging and analytics
