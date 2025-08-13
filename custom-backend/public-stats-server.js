const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// GET public statistics (for footer and general use)
app.get('/api/public/stats', async (req, res) => {
  try {
    // Mock statistics
    const stats = {
      total_events: 153,
      total_users: 5742,
      total_attendees: 4982,
      total_organizers: 760,
      upcoming_events: 42
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching public stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch statistics' 
    });
  }
});

// GET public company information
app.get('/api/public/company-info', async (req, res) => {
  try {
    // Mock company info
    const companyInfo = {
      name: "Eventify",
      description: "We are committed to creating a platform where business leaders, innovators, and professionals can come together to exchange ideas",
      contact: {
        email: "eventifyevent@gmail.com",
        phone: "+1 123 456 7890",
        address: "Secret Location In The UK",
        website: "eventifyevent.com"
      },
      social: {
        facebook: "#",
        instagram: "#",
        linkedin: "#",
        pinterest: "#"
      },
      established: 2024
    };

    res.json({
      success: true,
      company: companyInfo
    });
  } catch (error) {
    console.error('Error fetching company info:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch company information' 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Public Stats Service'
  });
});

// Proxy endpoint to forward to main backend
app.get('/api/events', (req, res) => {
  // Forward to main backend
  res.json({
    message: 'This endpoint would forward to the main backend'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Public stats server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
