// Updated Server.js - Clean and Modular Structure
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

// Import route modules
const AuthRoutes = require('./routes/authRoutes');

// Import services for testing
const DatabaseService = require('./services/DatabaseService');
const EmailService = require('./services/EmailService');

const app = express();
const port = process.env.PORT || 5000;

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'event_management_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Initialize services and test connections
async function initializeServices() {
  try {
    console.log('🚀 Initializing Event Management System...');
    
    // Test database connection
    const dbService = new DatabaseService(pool);
    const dbHealthy = await dbService.testConnection();
    
    if (!dbHealthy) {
      console.error('❌ Database connection failed. Please check your database configuration.');
      process.exit(1);
    }

    // Test email service
    const emailService = new EmailService();
    const emailHealthy = await emailService.testConnection();
    
    if (!emailHealthy) {
      console.warn('⚠️ Email service not configured properly. Email features may not work.');
    }

    // Clean up expired tokens (maintenance)
    try {
      const cleanedCount = await dbService.cleanupExpiredTokens();
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} expired verification tokens`);
      }
    } catch (error) {
      console.warn('⚠️ Token cleanup failed:', error.message);
    }

    console.log('✅ Services initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    return false;
  }
}

// Initialize routes
const authRoutes = new AuthRoutes(pool);

// API Routes
app.use('/api/auth', authRoutes.getRouter());

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Event Management System API',
    version: '2.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /api/auth/health',
      register: 'POST /api/auth/register',
      verify: 'GET /api/auth/verify-email?token={token}',
      resend: 'POST /api/auth/resend-verification',
      login: 'POST /api/auth/login'
    }
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  try {
    await pool.end();
    console.log('✅ Database pool closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  try {
    await pool.end();
    console.log('✅ Database pool closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Start server
async function startServer() {
  const servicesReady = await initializeServices();
  
  if (!servicesReady) {
    console.error('❌ Failed to initialize services. Exiting...');
    process.exit(1);
  }

  app.listen(port, () => {
    console.log('🎉 Event Management System Server Started');
    console.log(`📍 Server running on http://localhost:${port}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📧 Email service: ${process.env.EMAIL_USER ? 'Configured' : 'Not configured'}`);
    console.log('📚 API Documentation available at: http://localhost:' + port);
    console.log('🏥 Health check: http://localhost:' + port + '/api/auth/health');
    console.log('===============================================');
  });
}

// Start the server
startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

module.exports = app;
