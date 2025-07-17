import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './Page/Home'
import Login from './Page/Login'
import SignUp from './Page/SignUp'
import ForgotPassword from './Page/ForgotPassword'
import OrganizerDashboard from './Page/OrganizerDashboard'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        {/* Home route - default landing page */}
        <Route path="/" element={<Home />} />
        
        {/* Authentication routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        <Route path="/organizer-dashboard" element={<OrganizerDashboard />} />
      
        {/* Redirect any unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
