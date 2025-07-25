import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthTokenService from './services/AuthTokenService';
import Home from './Page/Home';
import Login from './Page/Login';
import SignUp from './Page/SignUp';
import ForgotPassword from './Page/ForgotPassword';
import ResetPassword from './Page/ResetPassword';
import EmailVerification from './Page/EmailVerification';
import AttendeeDashboard from './Page/AttendeeDashboard';
import EventListPage from './Page/Eventslist';
import OrganizerDashboard from './Page/OrganizerDashboard';
import Profile from './Page/Profile';
import Settings from './Page/Settings';

// Import protected route components
import ProtectedRoute, { 
  PublicRoute, 
  AttendeeProtectedRoute, 
  OrganizerProtectedRoute 
} from './components/ProtectedRoute';

import './App.css';



function App() {
  // Component to handle dashboard redirects based on user role
  const DashboardRedirect = () => {
    const dashboardRoute = AuthTokenService.getDashboardRoute();
    return <Navigate to={dashboardRoute} replace />;
  };

  return (
    <Router>
      <Routes>
        {/* Public routes - redirect authenticated users to dashboard */}
        <Route path="/" element={<PublicRoute><Home /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
        
        {/* Email verification - accessible to all */}
        <Route path="/verify-email" element={<EmailVerification />} />
        
        {/* Protected routes - require authentication */}
        
        {/* Attendee Dashboard - requires attendee role or any authenticated user */}
        <Route 
          path="/attendee-dashboard" 
          element={
            <ProtectedRoute>
              <AttendeeDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Alternative attendee route for backwards compatibility */}
        <Route 
          path="/Attendee" 
          element={
            <ProtectedRoute>
              <AttendeeDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Events list - accessible to all authenticated users */}
        <Route 
          path="/eventslist" 
          element={
            <ProtectedRoute>
              <EventListPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Organizer Dashboard - requires organizer role */}
        <Route 
          path="/organizer-dashboard" 
          element={
            <OrganizerProtectedRoute>
              <OrganizerDashboard />
            </OrganizerProtectedRoute>
          } 
        />

        {/* Profile page - accessible to all authenticated users */}
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />

        {/* Settings page - accessible to all authenticated users */}
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } 
        />

        {/* Dashboard redirect - redirect to appropriate dashboard based on role */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardRedirect />
            </ProtectedRoute>
          } 
        />
      
        {/* Redirect any unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
