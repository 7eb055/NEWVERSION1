
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './Page/Home';
import Login from './Page/Login';
import SignUp from './Page/SignUp';
import ForgotPassword from './Page/ForgotPassword';
import AdminDashboard from './Page/AdminDashboard';
import './App.css';
import OrganizerDashboard from './Page/OrganizerDashboard';
import EventListPage from './Page/Eventslist';
import AttendeeDashboard from './Page/AttendeeDashboard';
import EventDetails from './Page/EventDetails';
import Profile from './Page/Profile';
// import ProfileEdit from './Page/ProfileEdit';
import EmailVerification from './Page/EmailVerification';
// import EventCreation from './Page/EventCreation';
// import EventEdit from './Page/EventEdit';
// import EventRegistration from './Page/EventRegistration';
import AttendeeList from './component/AttendeeList';
// import SpeakerDetail from './Page/SpeakerDetail';
// import ResourceDetail from './Page/ResourceDetail';
import ProtectedRoute, { 
  PublicRoute,
  AdminProtectedRoute,
  OrganizerProtectedRoute,
  AttendeeProtectedRoute
} from './components/ProtectedRoute';
import Settings from './Page/Settings';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/eventslist" element={<EventListPage />} />
        
        {/* Authentication routes - protected from authenticated users */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

        {/* Role-specific dashboard routes */}
        <Route path="/admin-dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
        <Route path="/organizer-dashboard" element={<OrganizerProtectedRoute><OrganizerDashboard /></OrganizerProtectedRoute>} />
        <Route path="/attendee-dashboard" element={<AttendeeProtectedRoute><AttendeeDashboard /></AttendeeProtectedRoute>} />
        
        {/* Event detail route - accessible by all */}
        <Route path="/events/:eventId" element={<EventDetails />} />
        
        {/* Event management routes */}
        {/* <Route path="/events/create" element={<OrganizerProtectedRoute><EventCreation /></OrganizerProtectedRoute>} /> */}
        {/* <Route path="/events/:eventId/edit" element={<OrganizerProtectedRoute><EventEdit /></OrganizerProtectedRoute>} /> */}
        <Route path="/events/:eventId/attendees" element={<OrganizerProtectedRoute><AttendeeList /></OrganizerProtectedRoute>} />
        {/* <Route path="/events/:eventId/register" element={<AttendeeProtectedRoute><EventRegistration /></AttendeeProtectedRoute>} /> */}
        
        {/* Profile and account routes */}
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        {/* <Route path="/profile/edit" element={<ProtectedRoute><ProfileEdit /></ProtectedRoute>} /> */}
        
        {/* Email verification routes */}
        <Route path="/verify-email" element={<EmailVerification />} />
        <Route path="/verify-email/:token" element={<EmailVerification />} />
        
        {/* Speaker and resource detail routes */}
        {/* <Route path="/speaker/:speakerId" element={<ProtectedRoute><SpeakerDetail /></ProtectedRoute>} />
        <Route path="/resource/:resourceId" element={<ProtectedRoute><ResourceDetail /></ProtectedRoute>} /> */}
      
        {/* Settings route */}
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        {/* Redirect any unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
