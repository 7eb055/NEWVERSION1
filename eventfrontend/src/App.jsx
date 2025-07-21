<<<<<<< HEAD
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './Page/Home';
import Login from './Page/Login';
import SignUp from './Page/SignUp';
import ForgotPassword from './Page/ForgotPassword';
import './App.css';
import Attendee from './Page/Eventdetails';
import EventListPage from './Page/Eventslist';

=======
import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './Page/Home'
import Login from './Page/Login'
import SignUp from './Page/SignUp'
import ForgotPassword from './Page/ForgotPassword'
import OrganizerDashboard from './Page/OrganizerDashboard'
import './App.css'
>>>>>>> 39408b67ab6a7276806367ee3073096815db5aa2

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



        <Route path="/organizer-dashboard" element={<OrganizerDashboard />} />
      
        {/* Redirect any unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
