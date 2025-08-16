const express = require('express');
const { Pool } = require('pg');
const authenticateToken = require('../middleware/auth');
// const NotificationScheduler = require('../services/NotificationScheduler'); // Disabled
// const EmailService = require('../services/EmailService'); // Disabled

const router = express.Router();

// Database connection - Use DATABASE_URL for Heroku compatibility
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize services - DISABLED
// const notificationScheduler = new NotificationScheduler();
// const emailService = new EmailService();

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    const userQuery = 'SELECT role FROM users WHERE user_id = $1';
    const result = await pool.query(userQuery, [req.user.user_id]);
    
    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ===== EMAIL NOTIFICATION MANAGEMENT (TEMPORARILY DISABLED) =====

// Get email notification statistics - DISABLED
router.get('/email-stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    res.status(503).json({ 
      message: 'Email notifications are temporarily disabled',
      status: 'disabled',
      note: 'This feature will be re-enabled in a future update'
    });
  } catch (error) {
    console.error('Error in disabled endpoint:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send manual event reminder - DISABLED
router.post('/send-reminder/:eventId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    res.status(503).json({ 
      message: 'Email notifications are temporarily disabled',
      status: 'disabled',
      note: 'This feature will be re-enabled in a future update'
    });
  } catch (error) {
    console.error('Error in disabled endpoint:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send bulk email to all users - DISABLED
router.post('/send-bulk-email', authenticateToken, requireAdmin, async (req, res) => {
  try {
    res.status(503).json({ 
      message: 'Email notifications are temporarily disabled',
      status: 'disabled',
      note: 'This feature will be re-enabled in a future update'
    });
  } catch (error) {
    console.error('Error in disabled endpoint:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get email templates - DISABLED
router.get('/email-templates', authenticateToken, requireAdmin, async (req, res) => {
  try {
    res.status(503).json({ 
      message: 'Email notifications are temporarily disabled',
      status: 'disabled',
      note: 'This feature will be re-enabled in a future update'
    });
  } catch (error) {
    console.error('Error in disabled endpoint:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Test email configuration - DISABLED
router.post('/test-email-config', authenticateToken, requireAdmin, async (req, res) => {
  try {
    res.status(503).json({ 
      message: 'Email notifications are temporarily disabled',
      status: 'disabled',
      note: 'This feature will be re-enabled in a future update'
    });
  } catch (error) {
    console.error('Error in disabled endpoint:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get notification scheduler status - DISABLED
router.get('/scheduler-status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    res.json({
      enabled: false,
      status: 'disabled',
      message: 'Email notifications are temporarily disabled',
      note: 'This feature will be re-enabled in a future update'
    });
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;