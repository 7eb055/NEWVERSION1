# Enhanced Event Management System

A full-stack event management system with separate tables for attendees and organizers, supporting email verification and the ability for users to register with multiple roles.

## Features

### Multi-Role Support
- **Attendees**: Users who want to join events
- **Organizers**: Users who create and manage events
- **Dual Roles**: Single email can register as both attendee and organizer
- **Email Verification**: Shared verification system for all roles

### Database Architecture
- **Users Table**: Handles authentication and email verification
- **Attendees Table**: Stores attendee-specific information
- **Organizers Table**: Stores organizer-specific information with company details
- **EventCompanies Table**: Manages company information for organizers
- **Events Table**: Event details and management
- **EventRegistrations Table**: Tracks event attendee registrations
- **EmailVerificationLogs Table**: Audit trail for email verification

## Setup Instructions

### 1. Database Setup

1. **Install PostgreSQL** (if not already installed)
2. **Create Database**:
   ```sql
   CREATE DATABASE event_management;
   ```

3. **Run the Database Schema**:
   ```bash
   psql -U postgres -d event_management -f enhanced-event-system.sql
   ```

4. **Test Database Setup**:
   ```bash
   # Update the password in test-db-setup.js first
   node test-db-setup.js
   ```

### 2. Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file** (`.env`):
   ```env
   # Database Configuration
   DB_USER=postgres
   DB_HOST=localhost
   DB_DATABASE=event_management
   DB_PASSWORD=your_password
   DB_PORT=5432

   # JWT Secret
   JWT_SECRET=your_super_secret_jwt_key_here

   # Email Configuration (for verification emails)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   
   # Frontend URL
   FRONTEND_URL=http://localhost:5173
   ```

4. **Start the backend server**:
   ```bash
   npm start
   ```
   Server will run on `http://localhost:5000`

### 3. Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd eventfrontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   Frontend will run on `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (attendee or organizer)
- `POST /api/auth/login` - User login
- `GET /api/auth/verify-email` - Email verification
- `GET /api/auth/profile` - Get user profile with all roles

### Registration Process

#### For Attendees
```json
{
  "username": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "123-456-7890",
  "role": "attendee"
}
```

#### For Organizers
```json
{
  "username": "Jane Smith",
  "email": "jane@company.com",
  "password": "password123",
  "phone": "123-456-7890",
  "role": "organizer",
  "companyName": "Event Corp",
  "contactPerson": "Jane Smith",
  "location": "New York, NY"
}
```

#### Adding Additional Role to Existing User
Users can register additional roles using the same email. The system will:
1. Check if the email is already registered and verified
2. Add the new role to the appropriate table
3. Not send a new verification email (since email is already verified)

## Database Schema Details

### Users Table
- Primary authentication table
- Stores email, password, and verification status
- `role_type` indicates the primary role (first registered)

### Attendees Table
- Links to Users table via `user_id`
- Stores attendee-specific information (full_name, phone)

### Organizers Table
- Links to Users table via `user_id`
- Stores organizer-specific information
- Links to EventCompanies table for company details

### Key Features
- **Email Uniqueness**: One email per user account
- **Role Flexibility**: Single user can have both attendee and organizer roles
- **Data Separation**: Role-specific data stored in separate tables
- **Company Management**: Automatic company creation/linking for organizers

## Email Verification

1. **New User Registration**: 
   - Verification email sent immediately
   - User must verify before login
   
2. **Additional Role Registration**:
   - No new verification email (email already verified)
   - Role added immediately if email is verified

## Login Response

Users with multiple roles receive comprehensive profile information:

```json
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "user_id": 1,
    "email": "user@example.com",
    "primary_role": "attendee",
    "roles": [
      {
        "role": "attendee",
        "full_name": "John Doe",
        "phone": "123-456-7890"
      },
      {
        "role": "organizer",
        "full_name": "John Doe",
        "phone": "123-456-7890",
        "company_name": "Event Corp",
        "business_address": "New York, NY"
      }
    ],
    "has_multiple_roles": true
  }
}
```

## Development Notes

### Frontend (React + Vite)
- Modular component structure
- Role selection in signup form
- Phone number field for all users
- Conditional organizer fields (company, contact, location)

### Backend (Node.js + Express)
- Transaction-based registration for data consistency
- Comprehensive error handling and logging
- JWT authentication with role information
- Email verification with nodemailer

### Security Features
- Password hashing with bcrypt (12 rounds)
- JWT tokens with 24-hour expiration
- Email verification requirements
- Input validation and sanitization

## Troubleshooting

### Common Issues

1. **Database Connection Error**:
   - Check PostgreSQL is running
   - Verify database credentials in `.env`
   - Ensure database `event_management` exists

2. **Email Verification Not Working**:
   - Check email configuration in `.env`
   - Verify SMTP settings
   - Check spam folder for verification emails

3. **Role Registration Fails**:
   - Ensure email is verified before adding additional roles
   - Check required fields for organizer registration

### Testing the System

1. **Register as Attendee**:
   - Fill basic information
   - Verify email
   - Login successfully

2. **Add Organizer Role**:
   - Use same email
   - Fill organizer-specific fields
   - Should work without email verification

3. **Login with Multiple Roles**:
   - Should receive both role profiles
   - JWT token includes all role information

## Future Enhancements

- Role switching interface in frontend
- Event creation and management
- Event registration system
- Dashboard for different user roles
- Advanced company management
- Event analytics and reporting
