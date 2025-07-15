# Event Management Backend

A simple Node.js Express backend for user management.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up your environment variables by copying `.env` file and updating the database credentials:
```bash
# Update the .env file with your PostgreSQL credentials
```

3. Make sure your PostgreSQL database is running and the users table is created using the SQL file.

4. Start the development server:
```bash
npm run dev
```

Or start the production server:
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /api/register` - Register a new user
- `POST /api/login` - Login user
- `POST /api/forgot-password` - Request password reset

### User Management
- `GET /api/profile` - Get current user profile (requires auth)
- `PUT /api/profile` - Update user profile (requires auth)
- `DELETE /api/profile` - Delete user account (requires auth)
- `PUT /api/change-password` - Change user password (requires auth)
- `GET /api/users` - Get all users (public, basic info only)
- `GET /api/users/:id` - Get user by ID (public, basic info only)

### Health Check
- `GET /health` - Health check endpoint
- `GET /` - API documentation

## Authentication

The API uses JWT tokens for authentication. Include the token in the Authorization header:
```
Authorization: Bearer your-jwt-token
```

## Database

Make sure you have PostgreSQL running and the users table created using the provided SQL schema.

## Environment Variables

Required environment variables:
- `PORT` - Server port (default: 5000)
- `DB_HOST` - Database host
- `DB_PORT` - Database port
- `DB_NAME` - Database name
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `JWT_SECRET` - JWT secret key
- `FRONTEND_URL` - Frontend URL for CORS
