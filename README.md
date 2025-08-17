# 🎉 Event Management System

A comprehensive full-stack event management application with React frontend, Node.js backend, and PostgreSQL database. Features include payment integration (Paystack), email verification, QR code generation, feedback system, and admin dashboard.

[![Deploy](https://img.shields.io/badge/Deploy-Ready-brightgreen.svg)](./DEPLOYMENT_GUIDE.md)
[![GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blue.svg)](./.github/workflows/ci-cd.yml)
[![Docker](https://img.shields.io/badge/Docker-Enabled-blue.svg)](./docker-compose.yml)

**🔗 Repository:** https://github.com/7eb055/NEWVERSION1
**🌐 Live Staging:** https://your-event-app-staging-1468a9eab8ec.herokuapp.com/
**🚀 Live Production:** https://your-event-app-production-1c49193922fb.herokuapp.com/
**📋 Full Deployment Guide:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
**🐳 Docker Hub:** *[Add your Docker Hub repository link after publishing]*

## 🚀 Features

### Frontend (React + Vite)
- **Modern React UI**: Professional dashboard design with responsive layout
- **User Authentication**: Login, signup, and password reset functionality
- **Email Verification Flow**: Complete email verification workflow with user-friendly UI
- **Event Management**: Browse events, view event details, manage registrations
- **Dashboard Components**: Modular components for events, companies, people, and manual registration
- **QR Code Generator**: Generate QR codes for event tickets and attendance
- **Attendance Verification**: Verify attendee check-ins with QR scanning

### Backend (Node.js + Express)
- **RESTful API**: Complete API for all frontend operations
- **Gmail Integration**: Automated email verification using nodemailer
- **PostgreSQL Database**: Full database schema with proper relationships
- **JWT Authentication**: Secure token-based authentication
- **Role Management**: Support for multiple user roles (admin, organizer, attendee, vendor, speaker)
- **Password Security**: Bcrypt password hashing for security

## 📁 Project Structure

```
/
├── backend/                 # Node.js/Express API server
│   ├── server.js           # Main server file with all routes
│   ├── config/             # Database configuration
│   ├── package.json        # Backend dependencies
│   ├── .env.example       # Environment variables template
│   └── README.md          # Backend setup instructions
├── eventfrontend/          # React frontend application
│   ├── src/
│   │   ├── Page/          # Main pages (Login, SignUp, Home, etc.)
│   │   ├── component/     # Reusable components
│   │   └── assets/        # Static assets
│   ├── package.json       # Frontend dependencies
│   └── README.md          # Frontend setup instructions
├── event-system.sql       # Database schema
└── README.md              # This file
```

## 🛠 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- Gmail account for email verification

### 1. Database Setup
```bash
# Create database
createdb event_management_db

# Run the SQL script to create tables
psql -d event_management_db -f event-system.sql

# Optional: Insert basic role data manually (roles are auto-created during signup)
psql -d event_management_db -f insert-roles.sql
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

## 🚀 Quick Deployment

### **Option 1: One-Click Deploy (Recommended)**
See our [**Complete Deployment Guide**](./DEPLOYMENT_GUIDE.md) for step-by-step instructions for:
- ✅ Railway.app (Free tier available)
- ✅ Render.com (Free tier available) 
- ✅ Heroku (with GitHub Actions CI/CD)
- ✅ Manual server deployment

### **Option 2: Docker (Fastest Setup)**
```bash
git clone https://github.com/7eb055/NEWVERSION1.git
cd NEWVERSION1
cp .env.docker .env
docker-compose up -d
```

### **Option 3: Local Development**
```bash
# Clone repository
git clone https://github.com/7eb055/NEWVERSION1.git
cd NEWVERSION1

# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run migrate
npm start

# Frontend setup (new terminal)
cd eventfrontend
npm install
npm run dev
```

**📱 Access:** Frontend: http://localhost:5173 | Backend: http://localhost:5000

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## 🔧 Configuration

### Database Configuration
Update `backend/.env` with your PostgreSQL credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=event_management_db
DB_USER=your_username
DB_PASSWORD=your_password
```

### Gmail Configuration
For email verification, you'll need:
1. A Gmail account
2. App-specific password (if using 2FA)
3. Update `backend/.env`:
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

## 📚 API Documentation

The backend provides a complete RESTful API. Key endpoints:

### Authentication
- `POST /api/auth/register` - User registration with email verification
- `POST /api/auth/login` - User login
- `GET /api/auth/verify-email` - Email verification
- `POST /api/auth/forgot-password` - Password reset request
- `GET /api/auth/profile` - Get user profile

### Events
- `GET /api/events` - List all events
- `POST /api/events` - Create new event
- `GET /api/events/:id` - Get event details
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Companies
- `GET /api/companies` - List companies
- `POST /api/companies` - Create company
- `GET /api/companies/:id` - Get company details

See `backend/README.md` for complete API documentation.

## 🚀 Production Deployment

### **Free Hosting Options**
- **Railway.app** - Includes free PostgreSQL, automatic deployments
- **Render.com** - Free tier with database included
- **Heroku** - With GitHub Actions CI/CD (see workflow file)

### **Environment Requirements**
- **Node.js:** >= 16.0.0
- **PostgreSQL:** >= 13.0
- **Paystack Account:** For payment processing
- **Gmail SMTP:** For email notifications

### **Docker Support**
```bash
# Full stack with database
docker-compose up -d

# Individual services
docker build -t event-backend ./backend
docker build -t event-frontend ./eventfrontend
```

### **CI/CD Pipeline**
- ✅ Automated testing (Jest + Vitest)
- ✅ Code linting and formatting
- ✅ Security scanning
- ✅ Multi-environment deployment (staging/production)
- ✅ Database migrations

**📋 Complete deployment instructions:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

## 🎨 UI/UX Features

- **Professional Design**: Modern, clean interface with consistent styling
- **Responsive Layout**: Works seamlessly on desktop and mobile devices
- **Interactive Components**: Modal dialogs, form validation, loading states
- **Error Handling**: User-friendly error messages and feedback
- **Email Verification Flow**: Smooth onboarding experience with email verification

## 🔐 Security Features

- **Password Hashing**: Secure bcrypt password storage
- **JWT Tokens**: Stateless authentication with JSON Web Tokens
- **Email Verification**: Mandatory email verification for new accounts
- **Input Validation**: Client and server-side validation
- **CORS Configuration**: Proper cross-origin resource sharing setup

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🆘 Support

If you encounter any issues:
1. Check the individual README files in `backend/` and `eventfrontend/`
2. Ensure all environment variables are properly configured
3. Verify database connection and table creation
4. Check that both frontend and backend servers are running

For additional help, please open an issue in the repository.
#   G i t H u b   S e c r e t s   A d d e d   -   T e s t i n g   C I / C D   P i p e l i n e 
 
 #   S e c r e t s   c o n f i g u r e d   -   t e s t i n g   d e p l o y m e n t 
 
 #   T e s t i n g   w i t h   G i t H u b   s e c r e t s   c o n f i g u r e d 
 
 