import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './Page/Home';
import Login from './Page/Login';
import SignUp from './Page/SignUp';
import ForgotPassword from './Page/ForgotPassword';
import ResetPassword from './Page/ResetPassword';
import EmailVerification from './Page/EmailVerification';
// import TestVerification from './component/TestVerification';
import './App.css';
import Attendee from './Page/AttendeeDashboard';
import EventListPage from './Page/Eventslist';
import OrganizerDashboard from './Page/OrganizerDashboard';



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
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<EmailVerification />} />
        {/* <Route path="/test-verification" element={<TestVerification />} /> */}
        <Route path="/Attendee" element={<Attendee />} />
        <Route path="/eventslist" element={<EventListPage />} />



        <Route path="/organizer-dashboard" element={<OrganizerDashboard />} />
      
        {/* Redirect any unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
