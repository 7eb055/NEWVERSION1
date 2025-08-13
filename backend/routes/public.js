const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// GET public statistics (for footer and general use)
router.get('/stats', async (req, res) => {
  try {
    // Get public statistics (no sensitive data)
    const totalEvents = await pool.query('SELECT COUNT(*) FROM events WHERE status = \'published\'');
    const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
    const totalTickets = await pool.query('SELECT COUNT(*) FROM tickets');
    const totalOrganizers = await pool.query('SELECT COUNT(*) FROM organizers');
    
    // Get upcoming events count
    const upcomingEvents = await pool.query(
      'SELECT COUNT(*) FROM events WHERE status = \'published\' AND event_date > NOW()'
    );

    res.json({
      success: true,
      stats: {
        total_events: parseInt(totalEvents.rows[0].count, 10),
        total_users: parseInt(totalUsers.rows[0].count, 10),
        total_attendees: parseInt(totalTickets.rows[0].count, 10),
        total_organizers: parseInt(totalOrganizers.rows[0].count, 10),
        upcoming_events: parseInt(upcomingEvents.rows[0].count, 10)
      }
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
router.get('/company-info', async (req, res) => {
  try {
    // Get first admin user as company contact
    const adminQuery = await pool.query(
      'SELECT email, created_at FROM users WHERE role_type = \'admin\' ORDER BY created_at ASC LIMIT 1'
    );

    // Default company info - in a real app this would come from a settings table
    const companyInfo = {
      name: 'Eventify',
      description: 'We are committed to creating a platform where business leaders, innovators, and professionals can come together to exchange ideas',
      contact: {
        email: adminQuery.rows.length > 0 ? adminQuery.rows[0].email : 'eventifyevent@gmail.com',
        phone: '+1 123 456 7890',
        address: 'Secret Location In The UK',
        website: 'eventifyevent.com'
      },
      social: {
        facebook: '#',
        instagram: '#',
        linkedin: '#',
        pinterest: '#'
      },
      established: adminQuery.rows.length > 0 ? new Date(adminQuery.rows[0].created_at).getFullYear() : 2024
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

module.exports = router;
