# Event Management System - Backend API

A simple Node.js/Express backend API for an event management system with Gmail verification.

## Features

- **User Authentication**: Register, login, email verification
- **Gmail Verification**: Complete email verification workflow
- **Event Management**: CRUD operations for events
- **Company Management**: Basic company operations
- **Role-based Access**: Different user roles (admin, organizer, attendee, vendor, speaker)
- **JWT Authentication**: Secure token-based authentication
- **PostgreSQL Database**: Full database integration

## Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
1. Create a PostgreSQL database named `event_management_db`
2. Run the SQL script provided in the project to create tables
3. The script includes:
   - User tables with email verification fields
   - Event tables
   - Company tables
   - Role tables (roles are automatically created during user registration)
   - Email logging tables

### 3. Environment Variables
1. Copy `.env.example` to `.env`
2. Update the values:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=event_management_db
DB_USER=your_db_username
DB_PASSWORD=your_db_password

# JWT Secret (make this secure!)
JWT_SECRET=your-super-secret-jwt-key

# Gmail Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password

# Server
PORT=5000
FRONTEND_URL=http://localhost:5173
```

### 4. Gmail App Password Setup
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password: Google Account → Security → 2-Step Verification → App passwords
3. Use this App Password (not your regular password) in `EMAIL_PASSWORD`

### 5. Run the Server
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `GET /api/auth/verify-email?token=TOKEN` - Verify email address
- `POST /api/auth/resend-verification` - Resend verification email
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get current user profile (requires auth)

### Events
- `GET /api/events` - Get all events (public)
- `GET /api/events/my-events` - Get user's events (requires auth)
- `POST /api/events` - Create new event (requires auth)
- `GET /api/events/:id` - Get single event
- `PUT /api/events/:id` - Update event (requires auth)
- `DELETE /api/events/:id` - Delete event (requires auth)

### Companies
- `GET /api/companies` - Get all companies (requires auth)
- `POST /api/companies` - Create new company (requires auth)

### Other
- `GET /api/roles` - Get all available roles
- `GET /health` - Health check endpoint

## API Usage Examples

### Register a User
```javascript
POST /api/auth/register
{
  "username": "john_doe",
  "email": "john@gmail.com",
  "password": "securePassword123",
  "phone": "+1-555-0123",
  "role": "attendee"
}
```

### Login
```javascript
POST /api/auth/login
{
  "email": "john@gmail.com",
  "password": "securePassword123"
}
```

### Create Event (with authentication)
```javascript
POST /api/events
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
{
  "event_name": "Tech Conference 2025",
  "event_date": "2025-02-15",
  "event_location": "Convention Center",
  "description": "Annual tech conference",
  "capacity": 500
}
```

## Email Verification Flow

1. User registers → Account created with `email_verified = false`
2. Verification email sent with unique token (24-hour expiry)
3. User clicks email link → Token validated → Account activated
4. User can now login with verified account

## Installation Commands

```bash
# Install dependencies
npm install

# Install nodemailer for email functionality
npm install nodemailer

# Start development server
npm run dev
```

## Required Environment Variables

Make sure to create a `.env` file with all required variables from `.env.example`.
