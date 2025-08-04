const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    release();
  }
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

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Middleware to verify admin role
const authorizeAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
    next();
  } else {
    return res.status(403).json({ message: 'Forbidden: Admins only' });
  }
};

// Admin Routes
// GET dashboard statistics
app.get('/api/admin/dashboard-stats', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const users = await pool.query('SELECT COUNT(*) FROM users');
    const events = await pool.query('SELECT COUNT(*) FROM events');
    const organizers = await pool.query('SELECT COUNT(*) FROM organizers');
    const attendees = await pool.query('SELECT COUNT(*) FROM attendees');
    
    // Try to get revenue from eventregistrations table
    let revenueQuery = 'SELECT COALESCE(SUM(total_amount), 0) as total_revenue FROM eventregistrations WHERE payment_status = \'completed\'';
    try {
      const revenue = await pool.query(revenueQuery);
      var totalRevenue = parseFloat(revenue.rows[0].total_revenue) || 0;
    } catch (err) {
      // Fallback if eventregistrations table doesn't exist
      try {
        const revenue = await pool.query('SELECT COALESCE(SUM(total_amount), 0) as total_revenue FROM bookings');
        var totalRevenue = parseFloat(revenue.rows[0].total_revenue) || 0;
      } catch (err2) {
        var totalRevenue = 0;
      }
    }

    // Recent activity stats
    const recentUsers = await pool.query('SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL \'30 days\'');
    const recentEvents = await pool.query('SELECT COUNT(*) FROM events WHERE created_at >= NOW() - INTERVAL \'30 days\'');

    res.json({
      total_users: parseInt(users.rows[0].count, 10),
      total_events: parseInt(events.rows[0].count, 10),
      total_organizers: parseInt(organizers.rows[0].count, 10),
      total_attendees: parseInt(attendees.rows[0].count, 10),
      total_revenue: totalRevenue,
      recent_users: parseInt(recentUsers.rows[0].count, 10),
      recent_events: parseInt(recentEvents.rows[0].count, 10)
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET all users with pagination and search
app.get('/api/admin/users', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT user_id, email, role_type, is_email_verified, created_at, last_login FROM users';
    let countQuery = 'SELECT COUNT(*) FROM users';
    let params = [];
    let conditions = [];

    if (search) {
      conditions.push('email ILIKE $' + (params.length + 1));
      params.push(`%${search}%`);
    }

    if (role) {
      conditions.push('role_type = $' + (params.length + 1));
      params.push(role);
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, -2))
    ]);

    res.json({
      users: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(countResult.rows[0].count / limit)
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET all events with enhanced details
app.get('/api/admin/events', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status = '', search = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT e.event_id, e.event_name, e.organizer_id, e.status, e.event_date, 
             e.ticket_price, e.max_attendees, e.created_at,
             o.full_name as organizer_name,
             COUNT(er.registration_id) as registration_count
      FROM events e
      LEFT JOIN organizers o ON e.organizer_id = o.organizer_id
      LEFT JOIN eventregistrations er ON e.event_id = er.event_id
    `;
    
    let conditions = [];
    let params = [];

    if (status) {
      conditions.push('e.status = $' + (params.length + 1));
      params.push(status);
    }

    if (search) {
      conditions.push('e.event_name ILIKE $' + (params.length + 1));
      params.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` 
      GROUP BY e.event_id, o.full_name 
      ORDER BY e.event_date DESC 
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET system logs with filtering
app.get('/api/admin/logs', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { level = '', limit = 100, page = 1 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT log_id, level, message, timestamp, user_id FROM logs';
    let params = [];
    
    if (level) {
      query += ' WHERE level = $1';
      params.push(level);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    // Create logs table if it doesn't exist and insert some sample data
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS logs (
          log_id SERIAL PRIMARY KEY,
          level VARCHAR(20) NOT NULL,
          message TEXT NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          user_id INTEGER
        )
      `);
      
      // Insert sample logs if table is empty
      const logCount = await pool.query('SELECT COUNT(*) FROM logs');
      if (parseInt(logCount.rows[0].count) === 0) {
        await pool.query(`
          INSERT INTO logs (level, message, timestamp) VALUES
          ('INFO', 'System started successfully', NOW() - INTERVAL '1 hour'),
          ('ERROR', 'Failed login attempt detected', NOW() - INTERVAL '2 hours'),
          ('INFO', 'New user registration', NOW() - INTERVAL '3 hours'),
          ('WARNING', 'High memory usage detected', NOW() - INTERVAL '4 hours'),
          ('INFO', 'Database backup completed', NOW() - INTERVAL '5 hours')
        `);
      }
    } catch (createError) {
      console.log('Logs table might already exist or error creating:', createError.message);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// UPDATE user role (Admin only)
app.put('/api/admin/users/:userId/role', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role_type } = req.body;

    if (!['attendee', 'organizer', 'admin'].includes(role_type)) {
      return res.status(400).json({ message: 'Invalid role type' });
    }

    await pool.query(
      'UPDATE users SET role_type = $1 WHERE user_id = $2',
      [role_type, userId]
    );

    // Log this action
    try {
      await pool.query(
        'INSERT INTO logs (level, message, user_id) VALUES ($1, $2, $3)',
        ['INFO', `User role updated to ${role_type} for user ID ${userId}`, req.user.user_id]
      );
    } catch (logError) {
      console.log('Could not log action:', logError.message);
    }

    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE user (Admin only)
app.delete('/api/admin/users/:userId', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user details before deletion for logging
    const userResult = await pool.query('SELECT email FROM users WHERE user_id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userEmail = userResult.rows[0].email;

    // Delete user (this should cascade delete related records)
    await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);

    // Log this action
    try {
      await pool.query(
        'INSERT INTO logs (level, message, user_id) VALUES ($1, $2, $3)',
        ['WARNING', `User deleted: ${userEmail} (ID: ${userId})`, req.user.user_id]
      );
    } catch (logError) {
      console.log('Could not log action:', logError.message);
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// UPDATE event status (Admin only)
app.put('/api/admin/events/:eventId/status', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status } = req.body;

    if (!['draft', 'published', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    await pool.query(
      'UPDATE events SET status = $1 WHERE event_id = $2',
      [status, eventId]
    );

    // Log this action
    try {
      await pool.query(
        'INSERT INTO logs (level, message, user_id) VALUES ($1, $2, $3)',
        ['INFO', `Event status updated to ${status} for event ID ${eventId}`, req.user.user_id]
      );
    } catch (logError) {
      console.log('Could not log action:', logError.message);
    }

    res.json({ message: 'Event status updated successfully' });
  } catch (error) {
    console.error('Error updating event status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE event (Admin only)
app.delete('/api/admin/events/:eventId', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { eventId } = req.params;

    // Get event details before deletion for logging
    const eventResult = await pool.query('SELECT event_name FROM events WHERE event_id = $1', [eventId]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const eventName = eventResult.rows[0].event_name;

    // Delete event (this should cascade delete related records)
    await pool.query('DELETE FROM events WHERE event_id = $1', [eventId]);

    // Log this action
    try {
      await pool.query(
        'INSERT INTO logs (level, message, user_id) VALUES ($1, $2, $3)',
        ['WARNING', `Event deleted: ${eventName} (ID: ${eventId})`, req.user.user_id]
      );
    } catch (logError) {
      console.log('Could not log action:', logError.message);
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET system health and metrics
app.get('/api/admin/system-health', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const dbHealth = await pool.query('SELECT NOW()');
    const uptime = process.uptime();
    
    const memoryUsage = process.memoryUsage();
    
    res.json({
      status: 'healthy',
      database: 'connected',
      uptime: uptime,
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking system health:', error);
    res.status(500).json({ 
      status: 'unhealthy', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET admin reports
app.get('/api/admin/reports', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { type = 'overview', period = '30' } = req.query;
    
    let report = {};
    
    if (type === 'overview' || type === 'all') {
      // User growth over time
      const userGrowth = await pool.query(`
        SELECT DATE(created_at) as date, COUNT(*) as new_users 
        FROM users 
        WHERE created_at >= NOW() - INTERVAL '${period} days'
        GROUP BY DATE(created_at) 
        ORDER BY date
      `);
      
      // Event statistics
      const eventStats = await pool.query(`
        SELECT status, COUNT(*) as count 
        FROM events 
        WHERE created_at >= NOW() - INTERVAL '${period} days'
        GROUP BY status
      `);
      
      // Revenue by day (using eventregistrations table)
      const revenueData = await pool.query(`
        SELECT DATE(r.created_at) as date, 
               COALESCE(SUM(r.total_amount), 0) as revenue
        FROM eventregistrations r
        WHERE r.created_at >= NOW() - INTERVAL '${period} days'
          AND r.payment_status = 'completed'
        GROUP BY DATE(r.created_at) 
        ORDER BY date
      `);
      
      report = {
        user_growth: userGrowth.rows,
        event_stats: eventStats.rows,
        revenue_data: revenueData.rows
      };
    }
    
    res.json(report);
  } catch (error) {
    console.error('Error generating reports:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// BULK operations for admin
app.post('/api/admin/bulk-actions', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { action, target, ids, data } = req.body;
    
    if (!action || !target || !ids || !Array.isArray(ids)) {
      return res.status(400).json({ message: 'Invalid bulk action request' });
    }
    
    let result = {};
    
    switch (action) {
      case 'delete':
        if (target === 'users') {
          const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
          await pool.query(`DELETE FROM users WHERE user_id IN (${placeholders})`, ids);
          result.message = `Deleted ${ids.length} users`;
        } else if (target === 'events') {
          const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
          await pool.query(`DELETE FROM events WHERE event_id IN (${placeholders})`, ids);
          result.message = `Deleted ${ids.length} events`;
        }
        break;
        
      case 'update_status':
        if (target === 'events' && data.status) {
          const placeholders = ids.map((_, i) => `$${i + 2}`).join(',');
          await pool.query(`UPDATE events SET status = $1 WHERE event_id IN (${placeholders})`, [data.status, ...ids]);
          result.message = `Updated status for ${ids.length} events`;
        }
        break;
        
      case 'update_role':
        if (target === 'users' && data.role_type) {
          const placeholders = ids.map((_, i) => `$${i + 2}`).join(',');
          await pool.query(`UPDATE users SET role_type = $1 WHERE user_id IN (${placeholders})`, [data.role_type, ...ids]);
          result.message = `Updated role for ${ids.length} users`;
        }
        break;
        
      default:
        return res.status(400).json({ message: 'Unknown bulk action' });
    }
    
    // Log bulk action
    try {
      await pool.query(
        'INSERT INTO logs (level, message, user_id) VALUES ($1, $2, $3)',
        ['INFO', `Bulk action: ${action} on ${target} (${ids.length} items)`, req.user.user_id]
      );
    } catch (logError) {
      console.log('Could not log bulk action:', logError.message);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error performing bulk action:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// General Event Routes
// GET all events (public)
app.get('/api/events', async (req, res) => {
  try {
    const { status = 'published', limit = 20, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    const eventsQuery = await pool.query(`
      SELECT e.event_id, e.event_name, e.event_date, 
             e.ticket_price, e.max_attendees, 
             e.status, e.created_at,
             o.full_name as organizer_name, o.company_name,
             COUNT(er.registration_id) as registration_count
      FROM events e
      LEFT JOIN organizers o ON e.organizer_id = o.organizer_id
      LEFT JOIN eventregistrations er ON e.event_id = er.event_id
      WHERE e.status = $1
      GROUP BY e.event_id, o.full_name, o.company_name
      ORDER BY e.event_date ASC
      LIMIT $2 OFFSET $3
    `, [status, limit, offset]);

    res.json(eventsQuery.rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// GET single event details (public)
app.get('/api/events/:eventId/details', async (req, res) => {
  try {
    const { eventId } = req.params;

    const eventQuery = await pool.query(`
      SELECT e.event_id, e.event_name, e.event_date, 
             e.ticket_price, e.max_attendees, 
             e.status, e.created_at,
             o.full_name as organizer_name, o.company_name, o.phone as organizer_phone,
             COUNT(er.registration_id) as registration_count
      FROM events e
      LEFT JOIN organizers o ON e.organizer_id = o.organizer_id
      LEFT JOIN eventregistrations er ON e.event_id = er.event_id
      WHERE e.event_id = $1
      GROUP BY e.event_id, o.full_name, o.company_name, o.phone
    `, [eventId]);

    if (eventQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(eventQuery.rows[0]);
  } catch (error) {
    console.error('Error fetching event details:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Attendee Routes
// POST register for event
app.post('/api/events/:eventId/register', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { ticket_quantity = 1 } = req.body;

    // Get attendee_id from the user
    const attendeeQuery = await pool.query(
      'SELECT attendee_id FROM attendees WHERE user_id = $1',
      [req.user.user_id]
    );

    if (attendeeQuery.rows.length === 0) {
      return res.status(403).json({ message: 'User is not an attendee' });
    }

    const attendeeId = attendeeQuery.rows[0].attendee_id;

    // Check if event exists and get details
    const eventQuery = await pool.query(
      'SELECT event_id, ticket_price, max_attendees, status FROM events WHERE event_id = $1',
      [eventId]
    );

    if (eventQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const event = eventQuery.rows[0];

    if (event.status !== 'published') {
      return res.status(400).json({ message: 'Event is not available for registration' });
    }

    // Check if already registered
    const existingRegistration = await pool.query(
      'SELECT registration_id FROM eventregistrations WHERE event_id = $1 AND attendee_id = $2',
      [eventId, attendeeId]
    );

    if (existingRegistration.rows.length > 0) {
      return res.status(400).json({ message: 'Already registered for this event' });
    }

    // Check capacity
    const currentRegistrations = await pool.query(
      'SELECT COALESCE(SUM(ticket_quantity), 0) as total_tickets FROM eventregistrations WHERE event_id = $1',
      [eventId]
    );

    const totalTickets = parseInt(currentRegistrations.rows[0].total_tickets) + parseInt(ticket_quantity);
    if (totalTickets > event.max_attendees) {
      return res.status(400).json({ message: 'Event is fully booked' });
    }

    // Calculate total amount
    const totalAmount = event.ticket_price * ticket_quantity;

    // Create registration
    const newRegistration = await pool.query(`
      INSERT INTO eventregistrations (event_id, attendee_id, registration_date, 
                                     total_amount, payment_status, ticket_quantity)
      VALUES ($1, $2, NOW(), $3, $4, $5)
      RETURNING *
    `, [eventId, attendeeId, totalAmount, 'completed', ticket_quantity]);

    res.status(201).json({
      message: 'Registration successful',
      registration: newRegistration.rows[0]
    });
  } catch (error) {
    console.error('Error registering for event:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET attendee's registrations
app.get('/api/my-registrations', authenticateToken, async (req, res) => {
  try {
    // Get attendee_id from the user
    const attendeeQuery = await pool.query(
      'SELECT attendee_id FROM attendees WHERE user_id = $1',
      [req.user.user_id]
    );

    if (attendeeQuery.rows.length === 0) {
      return res.status(403).json({ message: 'User is not an attendee' });
    }

    const attendeeId = attendeeQuery.rows[0].attendee_id;

    // Get registrations for this attendee
    const registrationsQuery = await pool.query(`
      SELECT er.registration_id, er.registration_date, er.total_amount, 
             er.payment_status, er.ticket_quantity,
             e.event_name, e.event_date,
             o.full_name as organizer_name
      FROM eventregistrations er
      JOIN events e ON er.event_id = e.event_id
      JOIN organizers o ON e.organizer_id = o.organizer_id
      WHERE er.attendee_id = $1
      ORDER BY er.registration_date DESC
    `, [attendeeId]);

    res.json(registrationsQuery.rows);
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Organizer Routes
// GET organizer's events
app.get('/api/events/my-events', authenticateToken, async (req, res) => {
  try {
    // Get organizer_id from the user
    const organizerQuery = await pool.query(
      'SELECT organizer_id FROM organizers WHERE user_id = $1',
      [req.user.user_id]
    );

    if (organizerQuery.rows.length === 0) {
      return res.status(403).json({ message: 'User is not an organizer' });
    }

    const organizerId = organizerQuery.rows[0].organizer_id;

    // Get events for this organizer
    const eventsQuery = await pool.query(`
      SELECT e.event_id, e.event_name, e.event_date, 
             e.ticket_price, e.max_attendees, 
             e.status, e.created_at,
             COUNT(er.registration_id) as registration_count
      FROM events e
      LEFT JOIN eventregistrations er ON e.event_id = er.event_id
      WHERE e.organizer_id = $1
      GROUP BY e.event_id
      ORDER BY e.event_date DESC
    `, [organizerId]);

    res.json(eventsQuery.rows);
  } catch (error) {
    console.error('Error fetching organizer events:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET all companies/organizers
app.get('/api/companies', authenticateToken, async (req, res) => {
  try {
    const companiesQuery = await pool.query(`
      SELECT o.organizer_id, o.full_name, o.company_name, o.business_address, 
             o.phone, o.created_at, u.email,
             COUNT(e.event_id) as event_count
      FROM organizers o
      LEFT JOIN users u ON o.user_id = u.user_id
      LEFT JOIN events e ON o.organizer_id = e.organizer_id
      GROUP BY o.organizer_id, u.email
      ORDER BY o.created_at DESC
    `);

    res.json(companiesQuery.rows);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET all attendees
app.get('/api/attendees', authenticateToken, async (req, res) => {
  try {
    const attendeesQuery = await pool.query(`
      SELECT a.attendee_id, a.full_name, a.phone, a.date_of_birth, 
             a.created_at, u.email,
             COUNT(er.registration_id) as registration_count
      FROM attendees a
      LEFT JOIN users u ON a.user_id = u.user_id
      LEFT JOIN eventregistrations er ON a.attendee_id = er.attendee_id
      GROUP BY a.attendee_id, u.email
      ORDER BY a.created_at DESC
    `);

    res.json(attendeesQuery.rows);
  } catch (error) {
    console.error('Error fetching attendees:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST create new event (organizer only)
app.post('/api/events', authenticateToken, async (req, res) => {
  try {
    // Get organizer_id from the user
    const organizerQuery = await pool.query(
      'SELECT organizer_id FROM organizers WHERE user_id = $1',
      [req.user.user_id]
    );

    if (organizerQuery.rows.length === 0) {
      return res.status(403).json({ message: 'User is not an organizer' });
    }

    const organizerId = organizerQuery.rows[0].organizer_id;

    const {
      event_name,
      event_date,
      ticket_price,
      max_attendees,
      status = 'draft'
    } = req.body;

    if (!event_name || !event_date) {
      return res.status(400).json({ message: 'Event name and date are required' });
    }

    const newEvent = await pool.query(`
      INSERT INTO events (event_name, event_date, ticket_price, max_attendees, organizer_id, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      event_name,
      event_date,
      ticket_price || 0,
      max_attendees || 100,
      organizerId,
      status
    ]);

    res.status(201).json({
      message: 'Event created successfully',
      event: newEvent.rows[0]
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT update event (organizer only)
app.put('/api/events/:eventId', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Get organizer_id from the user
    const organizerQuery = await pool.query(
      'SELECT organizer_id FROM organizers WHERE user_id = $1',
      [req.user.user_id]
    );

    if (organizerQuery.rows.length === 0) {
      return res.status(403).json({ message: 'User is not an organizer' });
    }

    const organizerId = organizerQuery.rows[0].organizer_id;

    // Check if event belongs to this organizer
    const eventCheck = await pool.query(
      'SELECT event_id FROM events WHERE event_id = $1 AND organizer_id = $2',
      [eventId, organizerId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found or not owned by organizer' });
    }

    const {
      event_name,
      event_date,
      ticket_price,
      max_attendees,
      status
    } = req.body;

    const updatedEvent = await pool.query(`
      UPDATE events 
      SET event_name = COALESCE($1, event_name),
          event_date = COALESCE($2, event_date),
          ticket_price = COALESCE($3, ticket_price),
          max_attendees = COALESCE($4, max_attendees),
          status = COALESCE($5, status)
      WHERE event_id = $6 AND organizer_id = $7
      RETURNING *
    `, [
      event_name,
      event_date,
      ticket_price,
      max_attendees,
      status,
      eventId,
      organizerId
    ]);

    res.json({
      message: 'Event updated successfully',
      event: updatedEvent.rows[0]
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE event (organizer only)
app.delete('/api/events/:eventId', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Get organizer_id from the user
    const organizerQuery = await pool.query(
      'SELECT organizer_id FROM organizers WHERE user_id = $1',
      [req.user.user_id]
    );

    if (organizerQuery.rows.length === 0) {
      return res.status(403).json({ message: 'User is not an organizer' });
    }

    const organizerId = organizerQuery.rows[0].organizer_id;

    // Check if event belongs to this organizer
    const eventCheck = await pool.query(
      'SELECT event_name FROM events WHERE event_id = $1 AND organizer_id = $2',
      [eventId, organizerId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found or not owned by organizer' });
    }

    const eventName = eventCheck.rows[0].event_name;

    // Delete the event
    await pool.query('DELETE FROM events WHERE event_id = $1', [eventId]);

    res.json({ message: `Event "${eventName}" deleted successfully` });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET event registrations for organizer
app.get('/api/events/:eventId/registrations', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Get organizer_id from the user
    const organizerQuery = await pool.query(
      'SELECT organizer_id FROM organizers WHERE user_id = $1',
      [req.user.user_id]
    );

    if (organizerQuery.rows.length === 0) {
      return res.status(403).json({ message: 'User is not an organizer' });
    }

    const organizerId = organizerQuery.rows[0].organizer_id;

    // Check if event belongs to this organizer
    const eventCheck = await pool.query(
      'SELECT event_id FROM events WHERE event_id = $1 AND organizer_id = $2',
      [eventId, organizerId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found or not owned by organizer' });
    }

    // Get registrations for this event
    const registrationsQuery = await pool.query(`
      SELECT er.registration_id, er.registration_date, er.total_amount, 
             er.payment_status, er.ticket_quantity,
             a.full_name, a.phone, u.email
      FROM eventregistrations er
      JOIN attendees a ON er.attendee_id = a.attendee_id
      JOIN users u ON a.user_id = u.user_id
      WHERE er.event_id = $1
      ORDER BY er.registration_date DESC
    `, [eventId]);

    res.json(registrationsQuery.rows);
  } catch (error) {
    console.error('Error fetching event registrations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Attendance Verification Routes
// GET attendee listing for event (comprehensive attendee data)
app.get('/api/events/:eventId/attendee-listing', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Get organizer_id from the user
    const organizerQuery = await pool.query(
      'SELECT organizer_id FROM organizers WHERE user_id = $1',
      [req.user.user_id]
    );

    if (organizerQuery.rows.length === 0) {
      return res.status(403).json({ message: 'User is not an organizer' });
    }

    const organizerId = organizerQuery.rows[0].organizer_id;

    // Check if event belongs to this organizer
    const eventCheck = await pool.query(
      'SELECT event_id FROM events WHERE event_id = $1 AND organizer_id = $2',
      [eventId, organizerId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found or not owned by organizer' });
    }

    // Create attendance_log table if it doesn't exist
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS attendance_log (
          log_id SERIAL PRIMARY KEY,
          registration_id INTEGER REFERENCES eventregistrations(registration_id) ON DELETE CASCADE,
          event_id INTEGER REFERENCES events(event_id) ON DELETE CASCADE,
          check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          check_out_time TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (createError) {
      console.log('Attendance log table might already exist:', createError.message);
    }

    // Get comprehensive attendee data with check-in status
    const attendeesQuery = await pool.query(`
      SELECT 
        er.registration_id,
        er.attendee_id,
        er.registration_date,
        er.total_amount,
        er.payment_status,
        er.ticket_quantity,
        a.full_name as attendee_name,
        a.phone as attendee_phone,
        u.email as attendee_email,
        CASE 
          WHEN aa.check_in_time IS NOT NULL THEN 'checked_in'
          ELSE 'registered'
        END as attendance_status,
        aa.check_in_time,
        aa.check_out_time,
        CONCAT(er.registration_id::text, '-', $1::text) as qr_code
      FROM eventregistrations er
      JOIN attendees a ON er.attendee_id = a.attendee_id
      JOIN users u ON a.user_id = u.user_id
      LEFT JOIN attendance_log aa ON er.registration_id = aa.registration_id
      WHERE er.event_id = $1::integer
      ORDER BY er.registration_date DESC
    `, [eventId]);

    res.json({
      success: true,
      attendees: attendeesQuery.rows,
      total: attendeesQuery.rows.length
    });
  } catch (error) {
    console.error('Error fetching attendee listing:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET attendance statistics for event
app.get('/api/events/:eventId/attendee-stats', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Get organizer_id from the user
    const organizerQuery = await pool.query(
      'SELECT organizer_id FROM organizers WHERE user_id = $1',
      [req.user.user_id]
    );

    if (organizerQuery.rows.length === 0) {
      return res.status(403).json({ message: 'User is not an organizer' });
    }

    const organizerId = organizerQuery.rows[0].organizer_id;

    // Check if event belongs to this organizer
    const eventCheck = await pool.query(
      'SELECT event_id FROM events WHERE event_id = $1 AND organizer_id = $2',
      [eventId, organizerId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found or not owned by organizer' });
    }

    // Create attendance_log table if it doesn't exist
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS attendance_log (
          log_id SERIAL PRIMARY KEY,
          registration_id INTEGER REFERENCES eventregistrations(registration_id) ON DELETE CASCADE,
          event_id INTEGER REFERENCES events(event_id) ON DELETE CASCADE,
          check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          check_out_time TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (createError) {
      console.log('Attendance log table might already exist:', createError.message);
    }

    // Get attendance statistics
    const statsQuery = await pool.query(`
      SELECT 
        COUNT(er.registration_id) as total_registered,
        COUNT(aa.registration_id) as total_checked_in,
        COUNT(CASE WHEN aa.check_out_time IS NULL AND aa.check_in_time IS NOT NULL THEN 1 END) as currently_present,
        ROUND(
          (COUNT(aa.registration_id)::DECIMAL / NULLIF(COUNT(er.registration_id), 0)) * 100, 
          2
        ) as attendance_percentage
      FROM eventregistrations er
      LEFT JOIN attendance_log aa ON er.registration_id = aa.registration_id
      WHERE er.event_id = $1::integer
    `, [eventId]);

    const stats = statsQuery.rows[0];

    res.json({
      success: true,
      stats: {
        total_registered: parseInt(stats.total_registered || 0),
        total_checked_in: parseInt(stats.total_checked_in || 0),
        currently_present: parseInt(stats.currently_present || 0),
        attendance_percentage: parseFloat(stats.attendance_percentage || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching attendance stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Alternative attendance stats endpoint
app.get('/api/events/:eventId/attendance/stats', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Get organizer_id from the user
    const organizerQuery = await pool.query(
      'SELECT organizer_id FROM organizers WHERE user_id = $1',
      [req.user.user_id]
    );

    if (organizerQuery.rows.length === 0) {
      return res.status(403).json({ message: 'User is not an organizer' });
    }

    const organizerId = organizerQuery.rows[0].organizer_id;

    // Check if event belongs to this organizer
    const eventCheck = await pool.query(
      'SELECT event_id FROM events WHERE event_id = $1 AND organizer_id = $2',
      [eventId, organizerId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found or not owned by organizer' });
    }

    // Get attendance statistics (same as above but different endpoint)
    const statsQuery = await pool.query(`
      SELECT 
        COUNT(er.registration_id) as total_registered,
        COUNT(aa.registration_id) as total_checked_in,
        COUNT(CASE WHEN aa.check_out_time IS NULL AND aa.check_in_time IS NOT NULL THEN 1 END) as currently_present
      FROM eventregistrations er
      LEFT JOIN attendance_log aa ON er.registration_id = aa.registration_id
      WHERE er.event_id = $1::integer
    `, [eventId]);

    const stats = statsQuery.rows[0];
    const totalRegistered = parseInt(stats.total_registered || 0);
    const totalCheckedIn = parseInt(stats.total_checked_in || 0);
    const attendancePercentage = totalRegistered > 0 ? ((totalCheckedIn / totalRegistered) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      totalRegistered,
      totalCheckedIn,
      currentlyPresent: parseInt(stats.currently_present || 0),
      attendancePercentage: parseFloat(attendancePercentage)
    });
  } catch (error) {
    console.error('Error fetching attendance stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET attendance scan history
app.get('/api/events/:eventId/attendance/history', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Get organizer_id from the user
    const organizerQuery = await pool.query(
      'SELECT organizer_id FROM organizers WHERE user_id = $1',
      [req.user.user_id]
    );

    if (organizerQuery.rows.length === 0) {
      return res.status(403).json({ message: 'User is not an organizer' });
    }

    const organizerId = organizerQuery.rows[0].organizer_id;

    // Check if event belongs to this organizer
    const eventCheck = await pool.query(
      'SELECT event_id FROM events WHERE event_id = $1 AND organizer_id = $2',
      [eventId, organizerId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found or not owned by organizer' });
    }

    // Get scan history
    const historyQuery = await pool.query(`
      SELECT 
        aa.log_id,
        aa.check_in_time,
        aa.check_out_time,
        a.full_name,
        u.email,
        er.registration_id,
        CASE 
          WHEN aa.check_out_time IS NOT NULL THEN 'checked-out'
          WHEN aa.check_in_time IS NOT NULL THEN 'checked-in'
        END as action_type
      FROM attendance_log aa
      JOIN eventregistrations er ON aa.registration_id = er.registration_id
      JOIN attendees a ON er.attendee_id = a.attendee_id
      JOIN users u ON a.user_id = u.user_id
      WHERE aa.event_id = $1::integer
      ORDER BY aa.check_in_time DESC
      LIMIT 100
    `, [eventId]);

    res.json({
      success: true,
      history: historyQuery.rows
    });
  } catch (error) {
    console.error('Error fetching scan history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST check-in attendee (QR scan or manual)
app.post('/api/events/:eventId/attendance/checkin', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { registration_id, qr_code } = req.body;
    
    // Get organizer_id from the user
    const organizerQuery = await pool.query(
      'SELECT organizer_id FROM organizers WHERE user_id = $1',
      [req.user.user_id]
    );

    if (organizerQuery.rows.length === 0) {
      return res.status(403).json({ message: 'User is not an organizer' });
    }

    const organizerId = organizerQuery.rows[0].organizer_id;

    // Check if event belongs to this organizer
    const eventCheck = await pool.query(
      'SELECT event_id FROM events WHERE event_id = $1 AND organizer_id = $2',
      [eventId, organizerId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found or not owned by organizer' });
    }

    let finalRegistrationId = registration_id;

    // If QR code is provided, extract registration_id from it
    if (qr_code && !registration_id) {
      const qrParts = qr_code.split('-');
      if (qrParts.length >= 2) {
        finalRegistrationId = parseInt(qrParts[0]);
      }
    }

    if (!finalRegistrationId) {
      return res.status(400).json({ message: 'Registration ID or valid QR code required' });
    }

    // Verify registration exists for this event
    const registrationCheck = await pool.query(
      'SELECT registration_id, attendee_id FROM eventregistrations WHERE registration_id = $1 AND event_id = $2',
      [finalRegistrationId, eventId]
    );

    if (registrationCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Registration not found for this event' });
    }

    // Check if already checked in
    const existingCheckIn = await pool.query(
      'SELECT log_id FROM attendance_log WHERE registration_id = $1 AND check_out_time IS NULL',
      [finalRegistrationId]
    );

    if (existingCheckIn.rows.length > 0) {
      return res.status(400).json({ message: 'Attendee is already checked in' });
    }

    // Create check-in record
    const checkInResult = await pool.query(`
      INSERT INTO attendance_log (registration_id, event_id, check_in_time)
      VALUES ($1, $2, NOW())
      RETURNING log_id, check_in_time
    `, [finalRegistrationId, eventId]);

    // Get attendee details for response
    const attendeeDetails = await pool.query(`
      SELECT a.full_name, u.email
      FROM eventregistrations er
      JOIN attendees a ON er.attendee_id = a.attendee_id
      JOIN users u ON a.user_id = u.user_id
      WHERE er.registration_id = $1
    `, [finalRegistrationId]);

    res.json({
      success: true,
      message: 'Check-in successful',
      data: {
        log_id: checkInResult.rows[0].log_id,
        registration_id: finalRegistrationId,
        check_in_time: checkInResult.rows[0].check_in_time,
        attendee: attendeeDetails.rows[0]
      }
    });
  } catch (error) {
    console.error('Error checking in attendee:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST check-out attendee
app.post('/api/events/:eventId/attendance/checkout', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { registration_id } = req.body;
    
    // Get organizer_id from the user
    const organizerQuery = await pool.query(
      'SELECT organizer_id FROM organizers WHERE user_id = $1',
      [req.user.user_id]
    );

    if (organizerQuery.rows.length === 0) {
      return res.status(403).json({ message: 'User is not an organizer' });
    }

    const organizerId = organizerQuery.rows[0].organizer_id;

    // Check if event belongs to this organizer
    const eventCheck = await pool.query(
      'SELECT event_id FROM events WHERE event_id = $1 AND organizer_id = $2',
      [eventId, organizerId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found or not owned by organizer' });
    }

    // Find active check-in
    const activeCheckIn = await pool.query(
      'SELECT log_id FROM attendance_log WHERE registration_id = $1 AND event_id = $2 AND check_out_time IS NULL',
      [registration_id, eventId]
    );

    if (activeCheckIn.rows.length === 0) {
      return res.status(400).json({ message: 'No active check-in found for this attendee' });
    }

    // Update with check-out time
    const checkOutResult = await pool.query(`
      UPDATE attendance_log 
      SET check_out_time = NOW()
      WHERE log_id = $1
      RETURNING check_out_time
    `, [activeCheckIn.rows[0].log_id]);

    res.json({
      success: true,
      message: 'Check-out successful',
      check_out_time: checkOutResult.rows[0].check_out_time
    });
  } catch (error) {
    console.error('Error checking out attendee:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST manual check-in (alternative endpoint for frontend compatibility)
app.post('/api/events/:eventId/attendance/manual', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { registration_id } = req.body;
    
    // Get organizer_id from the user
    const organizerQuery = await pool.query(
      'SELECT organizer_id FROM organizers WHERE user_id = $1',
      [req.user.user_id]
    );

    if (organizerQuery.rows.length === 0) {
      return res.status(403).json({ message: 'User is not an organizer' });
    }

    const organizerId = organizerQuery.rows[0].organizer_id;

    // Check if event belongs to this organizer
    const eventCheck = await pool.query(
      'SELECT event_id FROM events WHERE event_id = $1 AND organizer_id = $2',
      [eventId, organizerId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found or not owned by organizer' });
    }

    // Verify registration exists for this event
    const registrationCheck = await pool.query(
      'SELECT registration_id, attendee_id FROM eventregistrations WHERE registration_id = $1 AND event_id = $2',
      [registration_id, eventId]
    );

    if (registrationCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Registration not found for this event' });
    }

    // Check if already checked in
    const existingCheckIn = await pool.query(
      'SELECT log_id FROM attendance_log WHERE registration_id = $1 AND check_out_time IS NULL',
      [registration_id]
    );

    if (existingCheckIn.rows.length > 0) {
      return res.status(400).json({ message: 'Attendee is already checked in' });
    }

    // Create check-in record
    const checkInResult = await pool.query(`
      INSERT INTO attendance_log (registration_id, event_id, check_in_time)
      VALUES ($1, $2, NOW())
      RETURNING log_id, check_in_time
    `, [registration_id, eventId]);

    // Get attendee details for response
    const attendeeDetails = await pool.query(`
      SELECT a.full_name, u.email
      FROM eventregistrations er
      JOIN attendees a ON er.attendee_id = a.attendee_id
      JOIN users u ON a.user_id = u.user_id
      WHERE er.registration_id = $1
    `, [registration_id]);

    res.json({
      success: true,
      message: 'Manual check-in successful',
      data: {
        log_id: checkInResult.rows[0].log_id,
        registration_id: registration_id,
        check_in_time: checkInResult.rows[0].check_in_time,
        attendee: attendeeDetails.rows[0]
      }
    });
  } catch (error) {
    console.error('Error manually checking in attendee:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST QR scan endpoint (alternative endpoint for frontend compatibility)
app.post('/api/events/:eventId/attendance/scan', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { qr_code } = req.body;
    
    // Get organizer_id from the user
    const organizerQuery = await pool.query(
      'SELECT organizer_id FROM organizers WHERE user_id = $1',
      [req.user.user_id]
    );

    if (organizerQuery.rows.length === 0) {
      return res.status(403).json({ message: 'User is not an organizer' });
    }

    const organizerId = organizerQuery.rows[0].organizer_id;

    // Check if event belongs to this organizer
    const eventCheck = await pool.query(
      'SELECT event_id FROM events WHERE event_id = $1 AND organizer_id = $2',
      [eventId, organizerId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found or not owned by organizer' });
    }

    if (!qr_code) {
      return res.status(400).json({ 
        status: 'error',
        message: 'QR code is required' 
      });
    }

    // Extract registration_id from QR code
    const qrParts = qr_code.split('-');
    if (qrParts.length < 2) {
      return res.status(400).json({ 
        status: 'invalid',
        message: 'Invalid QR code format' 
      });
    }

    const registrationId = parseInt(qrParts[0]);
    const eventIdFromQR = parseInt(qrParts[1]);

    // Verify the QR code is for this event
    if (eventIdFromQR !== parseInt(eventId)) {
      return res.status(400).json({ 
        status: 'invalid',
        message: 'QR code is not for this event' 
      });
    }

    // Verify registration exists for this event
    const registrationCheck = await pool.query(
      'SELECT registration_id, attendee_id FROM eventregistrations WHERE registration_id = $1 AND event_id = $2',
      [registrationId, eventId]
    );

    if (registrationCheck.rows.length === 0) {
      return res.status(404).json({ 
        status: 'invalid',
        message: 'Registration not found for this event' 
      });
    }

    // Check if already checked in
    const existingCheckIn = await pool.query(
      'SELECT log_id FROM attendance_log WHERE registration_id = $1 AND check_out_time IS NULL',
      [registrationId]
    );

    if (existingCheckIn.rows.length > 0) {
      return res.status(400).json({ 
        status: 'duplicate',
        message: 'Attendee is already checked in' 
      });
    }

    // Create check-in record
    const checkInResult = await pool.query(`
      INSERT INTO attendance_log (registration_id, event_id, check_in_time)
      VALUES ($1, $2, NOW())
      RETURNING log_id, check_in_time
    `, [registrationId, eventId]);

    // Get attendee details for response
    const attendeeDetails = await pool.query(`
      SELECT a.full_name, u.email, er.ticket_quantity
      FROM eventregistrations er
      JOIN attendees a ON er.attendee_id = a.attendee_id
      JOIN users u ON a.user_id = u.user_id
      WHERE er.registration_id = $1
    `, [registrationId]);

    const attendee = attendeeDetails.rows[0];

    res.json({
      status: 'success',
      message: 'QR scan successful - attendee checked in',
      attendee: {
        name: attendee.full_name,
        email: attendee.email,
        ticketType: 'Standard', // Could be enhanced with actual ticket type
        checkInTime: checkInResult.rows[0].check_in_time
      }
    });
  } catch (error) {
    console.error('Error scanning QR code:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Internal server error' 
    });
  }
});

// Authentication Routes
// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user by email and get their profile info
    const userQuery = await pool.query(
      `SELECT user_id, email, password, role_type, is_email_verified, created_at
       FROM Users 
       WHERE email = $1`,
      [email]
    );

    if (userQuery.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const userData = userQuery.rows[0];

    // Check if email is verified
    if (!userData.is_email_verified) {
      return res.status(401).json({ 
        message: 'Please verify your email address before logging in',
        requiresVerification: true
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, userData.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Get all roles for this user
    let roles = [];
    let primaryRole = userData.role_type;

    // Check if user is an attendee
    const attendeeData = await pool.query(
      'SELECT full_name, phone FROM Attendees WHERE user_id = $1',
      [userData.user_id]
    );

    if (attendeeData.rows.length > 0) {
      roles.push({
        role: 'attendee',
        full_name: attendeeData.rows[0].full_name,
        phone: attendeeData.rows[0].phone
      });
    }

    // Check if user is an organizer
    const organizerData = await pool.query(
      'SELECT organizer_id, full_name, phone, company_name, business_address FROM Organizers WHERE user_id = $1',
      [userData.user_id]
    );

    if (organizerData.rows.length > 0) {
      roles.push({
        role: 'organizer',
        organizer_id: organizerData.rows[0].organizer_id,
        full_name: organizerData.rows[0].full_name,
        phone: organizerData.rows[0].phone,
        company_name: organizerData.rows[0].company_name,
        business_address: organizerData.rows[0].business_address
      });
    }

    // Update last login
    await pool.query(
      'UPDATE Users SET last_login = NOW() WHERE user_id = $1',
      [userData.user_id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        user_id: userData.user_id, 
        email: userData.email, 
        role: primaryRole,
        roles: roles.map(r => r.role)
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        user_id: userData.user_id,
        email: userData.email,
        primary_role: primaryRole,
        roles: roles,
        created_at: userData.created_at
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Register user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, role_type = 'attendee' } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userResult = await pool.query(
      'INSERT INTO users (email, password, role_type, is_email_verified) VALUES ($1, $2, $3, $4) RETURNING user_id, email, role_type, created_at',
      [email, hashedPassword, role_type, true] // Setting email as verified for demo
    );

    const newUser = userResult.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { 
        user_id: newUser.user_id, 
        email: newUser.email, 
        role: newUser.role_type
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        user_id: newUser.user_id,
        email: newUser.email,
        primary_role: newUser.role_type,
        roles: [],
        created_at: newUser.created_at
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user profile
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const userQuery = await pool.query(
      'SELECT user_id, email, role_type, is_email_verified, created_at, last_login FROM users WHERE user_id = $1',
      [req.user.user_id]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = userQuery.rows[0];
    res.json({
      user: userData
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ===== ATTENDEE DASHBOARD ROUTES =====

// GET event sessions/schedule for an event
app.get('/api/events/:eventId/sessions', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { day } = req.query;

    // Check if event exists
    const eventCheck = await pool.query(
      'SELECT event_id, event_name FROM events WHERE event_id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Create event_sessions table if it doesn't exist
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS event_sessions (
          session_id SERIAL PRIMARY KEY,
          event_id INTEGER REFERENCES events(event_id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          session_date DATE NOT NULL,
          location VARCHAR(255),
          speaker_id INTEGER,
          session_type VARCHAR(50) DEFAULT 'session',
          max_attendees INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Insert sample sessions if table is empty
      const sessionCount = await pool.query('SELECT COUNT(*) FROM event_sessions WHERE event_id = $1', [eventId]);
      if (parseInt(sessionCount.rows[0].count) === 0) {
        await pool.query(`
          INSERT INTO event_sessions (event_id, title, description, start_time, end_time, session_date, location, session_type)
          VALUES 
          ($1, 'The Future of Artificial Intelligence', 'Explore the latest advancements in AI and machine learning, and how they will transform industries in the coming decade.', '09:00', '10:00', CURRENT_DATE, 'Grand Ballroom A', 'keynote'),
          ($1, 'Building Scalable Cloud Infrastructure', 'Best practices for designing and implementing cloud solutions that can scale with your business needs.', '10:30', '11:15', CURRENT_DATE, 'Room 203', 'session'),
          ($1, 'Workshop: Modern Web Development', 'Hands-on session covering the latest tools and frameworks for building responsive, accessible web applications.', '11:30', '13:00', CURRENT_DATE, 'Workshop Room B', 'workshop'),
          ($1, 'Lunch & Networking', 'Enjoy lunch while connecting with fellow attendees and industry professionals.', '13:30', '14:30', CURRENT_DATE, 'Main Dining Hall', 'networking')
        `, [eventId]);
      }
    } catch (createError) {
      console.log('Sessions table already exists or creation failed:', createError.message);
    }

    // Get sessions for the event
    let query = `
      SELECT session_id, title, description, start_time, end_time, 
             session_date, location, session_type, max_attendees
      FROM event_sessions 
      WHERE event_id = $1
    `;
    let params = [eventId];

    if (day) {
      query += ' AND session_date = CURRENT_DATE + INTERVAL $2 DAY';
      params.push(day - 1);
    }

    query += ' ORDER BY session_date, start_time';

    const sessions = await pool.query(query, params);

    // Format sessions for frontend
    const formattedSessions = sessions.rows.map(session => ({
      id: session.session_id,
      time: session.start_time.substring(0, 5) + (parseInt(session.start_time.substring(0, 2)) >= 12 ? ' PM' : ' AM'),
      duration: calculateDuration(session.start_time, session.end_time),
      title: session.title,
      location: session.location,
      description: session.description,
      type: session.session_type,
      added: false // Will be updated based on user's agenda
    }));

    res.json(formattedSessions);
  } catch (error) {
    console.error('Error fetching event sessions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET event speakers
app.get('/api/events/:eventId/speakers', async (req, res) => {
  try {
    const { eventId } = req.params;

    // Check if event exists
    const eventCheck = await pool.query(
      'SELECT event_id FROM events WHERE event_id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Create event_speakers table if it doesn't exist
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS event_speakers (
          speaker_id SERIAL PRIMARY KEY,
          event_id INTEGER REFERENCES events(event_id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          title VARCHAR(255),
          company VARCHAR(255),
          bio TEXT,
          profile_image VARCHAR(500),
          email VARCHAR(255),
          linkedin VARCHAR(500),
          twitter VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Insert sample speakers if table is empty
      const speakerCount = await pool.query('SELECT COUNT(*) FROM event_speakers WHERE event_id = $1', [eventId]);
      if (parseInt(speakerCount.rows[0].count) === 0) {
        await pool.query(`
          INSERT INTO event_speakers (event_id, name, title, company, bio)
          VALUES 
          ($1, 'Jennifer Davis', 'AI Research Lead', 'TechFuture', 'Leading AI researcher with 10+ years experience in machine learning and neural networks.'),
          ($1, 'Michael Rodriguez', 'Chief Technology Officer', 'CloudScale Inc.', 'Veteran cloud architect specializing in scalable infrastructure and DevOps practices.'),
          ($1, 'Sarah Peterson', 'Senior Developer', 'WebInnovate', 'Full-stack developer passionate about modern web technologies and user experience.')
        `, [eventId]);
      }
    } catch (createError) {
      console.log('Speakers table already exists or creation failed:', createError.message);
    }

    const speakers = await pool.query(`
      SELECT speaker_id, name, title, company, bio, profile_image, email, linkedin, twitter
      FROM event_speakers 
      WHERE event_id = $1
      ORDER BY speaker_id
    `, [eventId]);

    // Format speakers for frontend
    const formattedSpeakers = speakers.rows.map(speaker => ({
      id: speaker.speaker_id,
      name: speaker.name,
      title: speaker.title + (speaker.company ? ', ' + speaker.company : ''),
      initials: speaker.name.split(' ').map(n => n[0]).join('').toUpperCase(),
      bio: speaker.bio,
      email: speaker.email,
      linkedin: speaker.linkedin,
      twitter: speaker.twitter,
      profileImage: speaker.profile_image
    }));

    res.json(formattedSpeakers);
  } catch (error) {
    console.error('Error fetching event speakers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET event resources
app.get('/api/events/:eventId/resources', async (req, res) => {
  try {
    const { eventId } = req.params;

    // Check if event exists
    const eventCheck = await pool.query(
      'SELECT event_id FROM events WHERE event_id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Create event_resources table if it doesn't exist
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS event_resources (
          resource_id SERIAL PRIMARY KEY,
          event_id INTEGER REFERENCES events(event_id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          resource_type VARCHAR(50) NOT NULL,
          file_url VARCHAR(500),
          file_size VARCHAR(20),
          download_count INTEGER DEFAULT 0,
          is_public BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Insert sample resources if table is empty
      const resourceCount = await pool.query('SELECT COUNT(*) FROM event_resources WHERE event_id = $1', [eventId]);
      if (parseInt(resourceCount.rows[0].count) === 0) {
        await pool.query(`
          INSERT INTO event_resources (event_id, title, description, resource_type, file_size)
          VALUES 
          ($1, 'Venue Map', 'Interactive map of the conference venue', 'map', '2.4 MB'),
          ($1, 'Full Schedule', 'Complete event schedule with all sessions', 'file-pdf', '1.1 MB'),
          ($1, 'Speaker Bios', 'Detailed biographies of all speakers', 'users', '3.2 MB'),
          ($1, 'Wi-Fi Access', 'Network credentials and connection guide', 'wifi', 'Network: TechForward-Guest')
        `, [eventId]);
      }
    } catch (createError) {
      console.log('Resources table already exists or creation failed:', createError.message);
    }

    const resources = await pool.query(`
      SELECT resource_id, title, description, resource_type, file_url, 
             file_size, download_count, is_public
      FROM event_resources 
      WHERE event_id = $1 AND is_public = true
      ORDER BY resource_id
    `, [eventId]);

    // Format resources for frontend
    const formattedResources = resources.rows.map(resource => ({
      id: resource.resource_id,
      title: resource.title,
      details: resource.file_size || resource.description,
      icon: resource.resource_type,
      url: resource.file_url,
      downloads: resource.download_count
    }));

    res.json(formattedResources);
  } catch (error) {
    console.error('Error fetching event resources:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET user's personal agenda for an event
app.get('/api/events/:eventId/my-agenda', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    // Get attendee_id from the user
    const attendeeQuery = await pool.query(
      'SELECT attendee_id FROM attendees WHERE user_id = $1',
      [req.user.user_id]
    );

    if (attendeeQuery.rows.length === 0) {
      return res.status(403).json({ message: 'User is not an attendee' });
    }

    const attendeeId = attendeeQuery.rows[0].attendee_id;

    // Create personal_agenda table if it doesn't exist
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS personal_agenda (
          agenda_id SERIAL PRIMARY KEY,
          attendee_id INTEGER REFERENCES attendees(attendee_id) ON DELETE CASCADE,
          event_id INTEGER REFERENCES events(event_id) ON DELETE CASCADE,
          session_id INTEGER REFERENCES event_sessions(session_id) ON DELETE CASCADE,
          added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(attendee_id, session_id)
        )
      `);
    } catch (createError) {
      console.log('Personal agenda table already exists or creation failed:', createError.message);
    }

    // Get user's agenda items
    const agendaItems = await pool.query(`
      SELECT es.session_id, es.title, es.description, es.start_time, es.end_time,
             es.session_date, es.location, es.session_type
      FROM personal_agenda pa
      JOIN event_sessions es ON pa.session_id = es.session_id
      WHERE pa.attendee_id = $1 AND pa.event_id = $2
      ORDER BY es.session_date, es.start_time
    `, [attendeeId, eventId]);

    // Format agenda items for frontend
    const formattedItems = agendaItems.rows.map(item => ({
      id: item.session_id,
      time: item.start_time.substring(0, 5) + (parseInt(item.start_time.substring(0, 2)) >= 12 ? ' PM' : ' AM'),
      duration: calculateDuration(item.start_time, item.end_time),
      title: item.title,
      location: item.location,
      description: item.description,
      added: true
    }));

    res.json(formattedItems);
  } catch (error) {
    console.error('Error fetching personal agenda:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST add session to personal agenda
app.post('/api/events/:eventId/agenda/add', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { sessionId } = req.body;

    // Get attendee_id from the user
    const attendeeQuery = await pool.query(
      'SELECT attendee_id FROM attendees WHERE user_id = $1',
      [req.user.user_id]
    );

    if (attendeeQuery.rows.length === 0) {
      return res.status(403).json({ message: 'User is not an attendee' });
    }

    const attendeeId = attendeeQuery.rows[0].attendee_id;

    // Verify session exists and belongs to this event
    const sessionCheck = await pool.query(
      'SELECT title FROM event_sessions WHERE session_id = $1 AND event_id = $2',
      [sessionId, eventId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Add to agenda (use ON CONFLICT to handle duplicates)
    await pool.query(`
      INSERT INTO personal_agenda (attendee_id, event_id, session_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (attendee_id, session_id) DO NOTHING
    `, [attendeeId, eventId, sessionId]);

    res.json({ 
      success: true, 
      message: `"${sessionCheck.rows[0].title}" added to agenda` 
    });
  } catch (error) {
    console.error('Error adding to agenda:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE remove session from personal agenda
app.delete('/api/events/:eventId/agenda/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { eventId, sessionId } = req.params;

    // Get attendee_id from the user
    const attendeeQuery = await pool.query(
      'SELECT attendee_id FROM attendees WHERE user_id = $1',
      [req.user.user_id]
    );

    if (attendeeQuery.rows.length === 0) {
      return res.status(403).json({ message: 'User is not an attendee' });
    }

    const attendeeId = attendeeQuery.rows[0].attendee_id;

    // Get session title for response
    const sessionCheck = await pool.query(
      'SELECT title FROM event_sessions WHERE session_id = $1 AND event_id = $2',
      [sessionId, eventId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Remove from agenda
    await pool.query(
      'DELETE FROM personal_agenda WHERE attendee_id = $1 AND session_id = $2',
      [attendeeId, sessionId]
    );

    res.json({ 
      success: true, 
      message: `"${sessionCheck.rows[0].title}" removed from agenda` 
    });
  } catch (error) {
    console.error('Error removing from agenda:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET attendee's registered events for dashboard
app.get('/api/attendee/dashboard', authenticateToken, async (req, res) => {
  try {
    // Get attendee_id from the user
    const attendeeQuery = await pool.query(
      'SELECT attendee_id, full_name FROM attendees WHERE user_id = $1',
      [req.user.user_id]
    );

    if (attendeeQuery.rows.length === 0) {
      // If user is not in attendees table, create a basic entry
      const userQuery = await pool.query(
        'SELECT email FROM users WHERE user_id = $1',
        [req.user.user_id]
      );
      
      if (userQuery.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Create attendee record with basic info
      const newAttendee = await pool.query(
        'INSERT INTO attendees (user_id, full_name) VALUES ($1, $2) RETURNING attendee_id, full_name',
        [req.user.user_id, userQuery.rows[0].email.split('@')[0]]
      );
      
      const { attendee_id: attendeeId, full_name: attendeeName } = newAttendee.rows[0];
      
      return res.json({
        attendee: {
          name: attendeeName,
          id: attendeeId
        },
        registeredEvents: [],
        upcomingSessions: []
      });
    }

    const { attendee_id: attendeeId, full_name: attendeeName } = attendeeQuery.rows[0];

    // Get attendee's registered events
    const eventsQuery = await pool.query(`
      SELECT e.event_id, e.event_name, e.event_date, e.status,
             er.registration_date, er.ticket_quantity,
             o.full_name as organizer_name, o.company_name
      FROM eventregistrations er
      JOIN events e ON er.event_id = e.event_id
      JOIN organizers o ON e.organizer_id = o.organizer_id
      WHERE er.attendee_id = $1
      ORDER BY e.event_date ASC
    `, [attendeeId]);

    // Get upcoming sessions from agenda
    const upcomingSessions = await pool.query(`
      SELECT es.title, es.start_time, es.session_date, es.location, e.event_name
      FROM personal_agenda pa
      JOIN event_sessions es ON pa.session_id = es.session_id
      JOIN events e ON pa.event_id = e.event_id
      WHERE pa.attendee_id = $1 
      AND es.session_date >= CURRENT_DATE
      AND (es.session_date > CURRENT_DATE OR es.start_time > CURRENT_TIME)
      ORDER BY es.session_date, es.start_time
      LIMIT 3
    `, [attendeeId]);

    res.json({
      attendee: {
        name: attendeeName,
        id: attendeeId
      },
      registeredEvents: eventsQuery.rows,
      upcomingSessions: upcomingSessions.rows
    });
  } catch (error) {
    console.error('Error fetching attendee dashboard:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET networking opportunities (other attendees)
app.get('/api/events/:eventId/networking', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    // Get attendee_id from the user
    const attendeeQuery = await pool.query(
      'SELECT attendee_id FROM attendees WHERE user_id = $1',
      [req.user.user_id]
    );

    if (attendeeQuery.rows.length === 0) {
      return res.status(403).json({ message: 'User is not an attendee' });
    }

    const attendeeId = attendeeQuery.rows[0].attendee_id;

    // Get other attendees registered for the same event
    const networkingQuery = await pool.query(`
      SELECT DISTINCT a.attendee_id, a.full_name, u.email,
             o.company_name as company
      FROM eventregistrations er1
      JOIN eventregistrations er2 ON er1.event_id = er2.event_id
      JOIN attendees a ON er2.attendee_id = a.attendee_id
      JOIN users u ON a.user_id = u.user_id
      LEFT JOIN organizers o ON EXISTS (
        SELECT 1 FROM organizers org WHERE org.user_id = u.user_id
      )
      WHERE er1.attendee_id = $1 
      AND er1.event_id = $2
      AND er2.attendee_id != $1
      ORDER BY a.full_name
      LIMIT 20
    `, [attendeeId, eventId]);

    res.json(networkingQuery.rows);
  } catch (error) {
    console.error('Error fetching networking data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Helper function to calculate session duration
function calculateDuration(startTime, endTime) {
  const start = new Date(`2000-01-01T${startTime}`);
  const end = new Date(`2000-01-01T${endTime}`);
  const diffMs = end - start;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins >= 60) {
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${diffMins} min`;
}

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Event Management System'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
