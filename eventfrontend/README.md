# Event Management System - Frontend

A modern React frontend for the Event Management System, built with Vite for fast development and optimized builds.

## 🚀 Features

- **Modern React UI**: Built with React 18 and modern hooks
- **Professional Design**: Clean, responsive dashboard interface
- **Authentication Flow**: Complete login/signup with email verification
- **Event Management**: Browse events, view details, manage registrations
- **Dashboard Components**: Modular design for events, companies, people
- **QR Code Integration**: Generate and verify QR codes for events
- **Responsive Design**: Works seamlessly across all device sizes

## 🛠 Tech Stack

- **React 18**: Latest React with hooks and functional components
- **Vite**: Fast build tool and development server
- **React Router**: Client-side routing for SPA navigation
- **Axios**: HTTP client for API communication
- **CSS3**: Modern CSS with Flexbox and Grid layouts
- **Font Awesome**: Icon library for UI elements

## 📁 Project Structure

```
src/
├── Page/                   # Main application pages
│   ├── Home.jsx           # Dashboard home page
│   ├── Login.jsx          # User login page
│   ├── SignUp.jsx         # User registration page
│   ├── EmailVerification.jsx  # Email verification page
│   ├── ForgotPassword.jsx # Password reset page
│   ├── Eventslist.jsx     # Events listing page
│   ├── Eventdetails.jsx   # Event details page
│   └── css/               # Page-specific styles
├── component/              # Reusable components
│   ├── browseEvents.jsx   # Event browsing component
│   ├── header.jsx         # Navigation header
│   ├── footer.jsx         # Page footer
│   ├── hero.jsx           # Hero section component
│   └── css/               # Component styles
├── assets/                 # Static assets (images, icons)
├── App.jsx                 # Main application component
├── App.css                 # Global application styles
└── main.jsx               # Application entry point
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The application will be available at: http://localhost:5173

## 🔧 Configuration

### Environment Variables
Create a `.env` file for environment-specific settings:
```env
VITE_API_URL=http://localhost:5000
```

### Backend Connection
The frontend is configured to connect to the backend API at `http://localhost:5000`. Make sure the backend server is running before starting the frontend development server.

## 📱 Pages and Features

### Authentication Pages
- **Login**: User authentication with email verification check
- **Sign Up**: User registration with form validation
- **Email Verification**: Handle email confirmation flow
- **Forgot Password**: Password reset functionality

### Dashboard Pages
- **Home**: Main dashboard with event overview
- **Events List**: Browse all available events
- **Event Details**: Detailed view of individual events

### Components
- **Header**: Navigation with user authentication status
- **Footer**: Site information and links
- **Hero**: Landing page hero section
- **Browse Events**: Event browsing with filters

## 🎨 Styling

- **CSS Modules**: Component-scoped styling
- **Responsive Design**: Mobile-first approach
- **Modern CSS**: Flexbox, Grid, and CSS variables
- **Professional Theme**: Consistent color scheme and typography

## 🔗 API Integration

The frontend connects to the backend API for:
- User authentication and registration
- Email verification
- Event data management
- Company information
- User profile management

All API calls are handled through Axios with proper error handling and loading states.

## 🧪 Development

### Available Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint for code quality

### Development Guidelines
- Use functional components with React hooks
- Follow the existing component structure
- Maintain consistent styling patterns
- Implement proper error handling for API calls
- Ensure responsive design for all new components

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory, ready for deployment to any static hosting service.

### Environment Configuration
Make sure to set the correct API URL for your production backend:
```env
VITE_API_URL=https://your-backend-api.com
```

## 📝 Contributing

1. Follow the existing code structure and naming conventions
2. Ensure all new components are responsive
3. Add proper PropTypes for component props
4. Test all API integrations thoroughly
5. Maintain consistent styling with the existing design system
