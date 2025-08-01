
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './Page/Home';
import Login from './Page/Login';
import SignUp from './Page/SignUp';
import ForgotPassword from './Page/ForgotPassword';
import AdminDashboard from './Page/AdminDashboard';
import './App.css';
import Attendee from './Page/Eventdetails';
import OrganizerDashboard from './Page/OrganizerDashboard';
import EventListPage from './Page/Eventslist';

function App() {
  return (
    <Router>
      <Routes>
        {/* Home route - default landing page */}
        <Route path="/" element={<Home />} />
        
        {/* Authentication routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/Attendee" element={<Attendee />} />
        <Route path="/eventslist" element={<EventListPage />} />

        {/* Dashboard routes */}
        <Route path="/organizer-dashboard" element={<OrganizerDashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
      
        {/* Redirect any unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
