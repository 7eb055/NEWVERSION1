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

// Middleware to verify organizer role
const authorizeOrganizer = async (req, res, next) => {
  try {
    const organizerQuery = await pool.query(
      'SELECT organizer_id FROM organizers WHERE user_id = $1',
      [req.user.user_id]
    );

    if (organizerQuery.rows.length === 0) {
      return res.status(403).json({ message: 'Forbidden: Organizers only' });
    }

    req.organizer = organizerQuery.rows[0];
    next();
  } catch (error) {
    console.error('Error in organizer authorization:', error);
    return res.status(500).json({ message: 'Internal server error' });
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
// GET company by ID
app.get('/api/companies/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get company details
    const companyQuery = await pool.query(
      `SELECT * FROM eventcompanies WHERE company_id = $1`,
      [id]
    );

    if (companyQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.json(companyQuery.rows[0]);
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT update company
app.put('/api/companies/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { company_name, company_type, category, address, contact_info, description, services } = req.body;
    
    // Validate required fields
    if (!company_name || !company_type || !category || !contact_info) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Get the user's organizer_id
    const organizerQuery = await pool.query(
      'SELECT organizer_id FROM organizers WHERE user_id = $1',
      [req.user.user_id]
    );

    if (organizerQuery.rows.length === 0) {
      return res.status(403).json({ message: 'User is not an organizer' });
    }

    const organizerId = organizerQuery.rows[0].organizer_id;

    // Check if company exists and belongs to this organizer
    const companyCheck = await pool.query(
      `SELECT company_id FROM eventcompanies 
       WHERE company_id = $1 AND organizer_id = $2`,
      [id, organizerId]
    );

    if (companyCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Company not found or not owned by organizer' });
    }

    // Update company
    const result = await pool.query(
      `UPDATE eventcompanies SET 
       company_name = $1, company_type = $2, category = $3, 
       address = $4, contact_info = $5, description = $6, 
       services = $7, updated_at = NOW()
       WHERE company_id = $8 AND organizer_id = $9
       RETURNING *`,
      [company_name, company_type, category, address, contact_info, description, services, id, organizerId]
    );

    res.json({
      message: 'Company updated successfully',
      company: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE company
app.delete('/api/companies/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the user's organizer_id
    const organizerQuery = await pool.query(
      'SELECT organizer_id FROM organizers WHERE user_id = $1',
      [req.user.user_id]
    );

    if (organizerQuery.rows.length === 0) {
      return res.status(403).json({ message: 'User is not an organizer' });
    }

    const organizerId = organizerQuery.rows[0].organizer_id;

    // Check if company exists and belongs to this organizer
    const companyCheck = await pool.query(
      `SELECT company_id FROM eventcompanies 
       WHERE company_id = $1 AND organizer_id = $2`,
      [id, organizerId]
    );

    if (companyCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Company not found or not owned by organizer' });
    }

    // Delete the company
    await pool.query(
      'DELETE FROM eventcompanies WHERE company_id = $1',
      [id]
    );

    res.json({ message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// General Event Routes
// GET all categories
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT category_id, category_name, description, icon_class, color_code FROM eventcategories ORDER BY category_name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

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

// POST manual event registration by organizer
app.post('/api/events/:eventId/manual-registration', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const {
      attendeeName,
      attendeeEmail,
      attendeePhone,
      company,
      ticketTypeId,
      ticketQuantity = 1,
      registrationType = 'manual',
      paymentStatus = 'paid',
      specialRequirements,
      dietaryRestrictions,
      accessibilityNeeds,
      notes
    } = req.body;

    // Validate required fields
    if (!attendeeName || !attendeeEmail || !ticketTypeId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, and ticket type are required' 
      });
    }

    // Get organizer_id from the user
    const organizerQuery = await pool.query(
      'SELECT organizer_id FROM organizers WHERE user_id = $1',
      [req.user.user_id]
    );

    if (organizerQuery.rows.length === 0) {
      return res.status(403).json({ message: 'User is not an organizer' });
    }

    // Check if event belongs to this organizer
    const eventCheck = await pool.query(
      'SELECT event_id FROM events WHERE event_id = $1 AND organizer_id = $2',
      [eventId, organizerQuery.rows[0].organizer_id]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found or not owned by organizer' });
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create or get user and attendee
      let userId, attendeeId;

      // Check if user exists
      const userCheck = await client.query(
        'SELECT user_id FROM users WHERE email = $1',
        [attendeeEmail]
      );

      if (userCheck.rows.length === 0) {
        // Generate a random temporary password (they can reset it later)
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Create new user with the hashed password
        const userResult = await client.query(
          'INSERT INTO users (email, password, role_type) VALUES ($1, $2, $3) RETURNING user_id',
          [attendeeEmail, hashedPassword, 'attendee']
        );
        userId = userResult.rows[0].user_id;

        // Create new attendee
        const attendeeResult = await client.query(
          `INSERT INTO attendees (
            user_id, full_name, phone, 
            dietary_restrictions, accessibility_needs, 
            created_at
          ) VALUES ($1, $2, $3, $4, $5, NOW()) 
          RETURNING attendee_id`,
          [userId, attendeeName, attendeePhone, dietaryRestrictions, accessibilityNeeds]
        );
        attendeeId = attendeeResult.rows[0].attendee_id;
      } else {
        // User exists, get or create attendee profile
        userId = userCheck.rows[0].user_id;
        const attendeeCheck = await client.query(
          'SELECT attendee_id FROM attendees WHERE user_id = $1',
          [userId]
        );

        if (attendeeCheck.rows.length === 0) {
          // Create attendee profile for existing user
          const attendeeResult = await client.query(
            `INSERT INTO attendees (
              user_id, full_name, phone, 
              dietary_restrictions, accessibility_needs, 
              created_at
            ) VALUES ($1, $2, $3, $4, $5, NOW()) 
            RETURNING attendee_id`,
            [userId, attendeeName, attendeePhone, dietaryRestrictions, accessibilityNeeds]
          );
          attendeeId = attendeeResult.rows[0].attendee_id;
        } else {
          attendeeId = attendeeCheck.rows[0].attendee_id;
          // Update existing attendee information
          await client.query(
            `UPDATE attendees SET 
              full_name = COALESCE($1, full_name),
              phone = COALESCE($2, phone),
              dietary_restrictions = COALESCE($3, dietary_restrictions),
              accessibility_needs = COALESCE($4, accessibility_needs),
              updated_at = NOW()
            WHERE attendee_id = $5`,
            [attendeeName, attendeePhone, dietaryRestrictions, accessibilityNeeds, attendeeId]
          );
        }
      }

      // Get ticket price and check availability
      const ticketResult = await client.query(
        'SELECT price, quantity_available, quantity_sold FROM tickettypes WHERE ticket_type_id = $1 AND event_id = $2',
        [ticketTypeId, eventId]
      );

      if (ticketResult.rows.length === 0) {
        throw new Error('Invalid ticket type');
      }

      const ticket = ticketResult.rows[0];
      const totalAmount = ticket.price * ticketQuantity;

      // Create registration
      const registrationResult = await client.query(
        `INSERT INTO eventregistrations (
          event_id, attendee_id, ticket_type_id, 
          ticket_quantity, total_amount, payment_status,
          special_requirements, registration_date, status,
          registration_type, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10)
        RETURNING registration_id`,
        [
          eventId,
          attendeeId,
          ticketTypeId,
          ticketQuantity,
          totalAmount,
          paymentStatus,
          specialRequirements,
          'confirmed',
          registrationType,
          notes
        ]
      );

      // Update ticket quantity_sold
      await client.query(
        'UPDATE tickettypes SET quantity_sold = COALESCE(quantity_sold, 0) + $1 WHERE ticket_type_id = $2',
        [ticketQuantity, ticketTypeId]
      );

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Manual registration successful',
        data: {
          registrationId: registrationResult.rows[0].registration_id,
          attendeeId: attendeeId,
          userId: userId,
          totalAmount: totalAmount
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error during manual registration:', error);
    
    // Provide specific error messages based on the error type
    let statusCode = 500;
    let errorMessage = 'Internal server error during registration';

    if (error.code === '23502') { // not-null violation
      statusCode = 400;
      errorMessage = 'Required field missing: ' + error.column;
    } else if (error.code === '23505') { // unique violation
      statusCode = 409;
      errorMessage = 'User with this email already exists';
    } else if (error.code === '23503') { // foreign key violation
      statusCode = 400;
      errorMessage = 'Invalid reference: ' + error.detail;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: error.message,
      detail: process.env.NODE_ENV === 'development' ? error.detail : undefined
    });
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
// Company Routes
// POST create company
app.post('/api/companies', authenticateToken, authorizeOrganizer, async (req, res) => {
  try {
    const { company_name, company_type, category, address, contact_info, description, services } = req.body;
    
    // Validate required fields
    if (!company_name || !company_type || !category || !contact_info) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const organizerId = req.organizer.organizer_id;

    // Insert into eventcompanies table
    const result = await pool.query(
      `INSERT INTO eventcompanies (
        company_name, company_type, category, address, 
        contact_info, description, services, organizer_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [company_name, company_type, category, address, contact_info, description, services, organizerId]
    );

    res.status(201).json({
      message: 'Company created successfully',
      company: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET companies list
app.get('/api/companies', authenticateToken, async (req, res) => {
  try {
    const companiesQuery = await pool.query(`
      SELECT 
        company_id, company_name, company_type, category, 
        address, contact_info, description, services,
        created_at, updated_at
      FROM eventcompanies
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      companies: companiesQuery.rows
    });
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

// POST create new attendee
app.post('/api/attendees', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      email,
      full_name,
      phone,
      date_of_birth,
      gender,
      interests,
      emergency_contact_name,
      emergency_contact_phone,
      dietary_restrictions,
      accessibility_needs,
      profile_picture_url,
      bio,
      social_media_links,
      notification_preferences
    } = req.body;

    // Validate required fields
    if (!email || !full_name) {
      return res.status(400).json({ message: 'Email and full name are required' });
    }

    await client.query('BEGIN');

    // Check if user exists
    const userCheck = await client.query(
      'SELECT user_id FROM users WHERE email = $1',
      [email]
    );

    let userId;
    let tempPassword;
    if (userCheck.rows.length === 0) {
      // Create new user
      tempPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const userResult = await client.query(
        'INSERT INTO users (email, password, role_type) VALUES ($1, $2, $3) RETURNING user_id',
        [email, hashedPassword, 'attendee']
      );
      userId = userResult.rows[0].user_id;
    } else {
      userId = userCheck.rows[0].user_id;
      tempPassword = undefined;
    }

    // Create or update attendee profile
    const attendeeCheck = await client.query(
      'SELECT attendee_id FROM attendees WHERE user_id = $1',
      [userId]
    );

    let result;
    if (attendeeCheck.rows.length === 0) {
      // Create new attendee
      result = await client.query(
        `INSERT INTO attendees (
          user_id, full_name, phone, date_of_birth, gender,
          interests, emergency_contact_name, emergency_contact_phone,
          dietary_restrictions, accessibility_needs,
          profile_picture_url, bio, social_media_links,
          notification_preferences, created_at
        ) VALUES ($1, $2, $3, NULLIF($4, '')::date, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
        RETURNING *`,
        [
          userId, full_name, phone, date_of_birth || null, gender,
          interests, emergency_contact_name, emergency_contact_phone,
          dietary_restrictions, accessibility_needs,
          profile_picture_url, bio, social_media_links,
          notification_preferences
        ]
      );
    } else {
      // Update existing attendee
      result = await client.query(
        `UPDATE attendees SET
          full_name = $2,
          phone = $3,
          date_of_birth = NULLIF($4, '')::date,
          gender = $5,
          interests = $6,
          emergency_contact_name = $7,
          emergency_contact_phone = $8,
          dietary_restrictions = $9,
          accessibility_needs = $10,
          profile_picture_url = $11,
          bio = $12,
          social_media_links = $13,
          notification_preferences = $14,
          updated_at = NOW()
        WHERE user_id = $1
        RETURNING *`,
        [
          userId, full_name, phone, date_of_birth || null, gender,
          interests, emergency_contact_name, emergency_contact_phone,
          dietary_restrictions, accessibility_needs,
          profile_picture_url, bio, social_media_links,
          notification_preferences
        ]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: attendeeCheck.rows.length === 0 ? 'Attendee created successfully' : 'Attendee updated successfully',
      data: {
        attendee: result.rows[0],
        temporary_password: tempPassword // Now tempPassword is properly defined in scope
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating/updating attendee:', error);
    
    let statusCode = 500;
    let message = 'Internal server error';

    if (error.code === '23505') { // unique violation
      statusCode = 400;
      message = 'Email already exists';
    }

    res.status(statusCode).json({
      success: false,
      message: message,
      error: error.message
    });
  } finally {
    client.release();
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

    const registrationsResult = await pool.query(
      'SELECT r.*, u.email, u.username FROM registrations r LEFT JOIN users u ON r.user_id = u.user_id WHERE r.event_id = $1',
      [eventId]
    );

    return res.json(registrationsResult.rows);
  } catch (error) {
    console.error('Error getting registrations:', error);
    res.status(500).json({ message: 'Error getting registrations', error: error.message });
  }
});

// GET detailed event registrations for organizer (including ticket type and attendance info)
app.get('/api/events/:eventId/registrations-detailed', authenticateToken, async (req, res) => {
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

    // Get detailed registrations with user info, ticket type, and attendance status
    const detailedRegistrationsQuery = `
      SELECT 
        er.registration_id,
        er.event_id,
        er.attendee_id,
        er.registration_date,
        er.payment_status,
        er.total_amount as amount_paid,
        er.ticket_quantity,
        u.email,
        COALESCE(u.role_type, 'attendee') as user_role,
        a.full_name,
        a.phone,
        tt.type_name as ticket_name,
        tt.price as ticket_price,
        tt.description as ticket_description,
        tt.benefits,
        EXISTS(
          SELECT 1 
          FROM attendancelogs al 
          WHERE al.registration_id = er.registration_id 
          AND al.check_out_time IS NULL
        ) as is_checked_in,
        (
          SELECT json_build_object(
            'check_in_time', MAX(al.check_in_time),
            'check_in_method', MAX(al.scan_method),
            'has_active_session', BOOL_OR(al.check_out_time IS NULL)
          )
          FROM attendancelogs al
          WHERE al.registration_id = er.registration_id
          AND al.check_out_time IS NULL
        ) as current_attendance
      FROM eventregistrations er
      JOIN attendees a ON er.attendee_id = a.attendee_id
      JOIN users u ON a.user_id = u.user_id
      LEFT JOIN tickettypes tt ON er.ticket_type_id = tt.ticket_type_id
      WHERE er.event_id = $1
      ORDER BY er.registration_date DESC
    `;

    const registrationsResult = await pool.query(detailedRegistrationsQuery, [eventId]);

    // Get summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_registrations,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_registrations,
        SUM(total_amount) as total_revenue,
        COUNT(CASE WHEN EXISTS(
          SELECT 1 FROM attendancelogs al 
          WHERE al.registration_id = er.registration_id 
          AND al.check_out_time IS NULL
        ) THEN 1 END) as currently_checked_in
      FROM eventregistrations er
      WHERE er.event_id = $1
    `;

    const summaryResult = await pool.query(summaryQuery, [eventId]);

    return res.json({
      registrations: registrationsResult.rows,
      summary: summaryResult.rows[0]
    });
  } catch (error) {
    console.error('Error fetching event registrations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET ticket types for an event
app.get('/api/events/:eventId/ticket-types', authenticateToken, async (req, res) => {
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

    // Create tickettypes table if it doesn't exist
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS tickettypes (
            ticket_type_id SERIAL PRIMARY KEY,
            event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
            type_name VARCHAR(100) NOT NULL,
            price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            quantity_available INTEGER NOT NULL DEFAULT 0,
            quantity_sold INTEGER DEFAULT 0,
            description TEXT,
            benefits TEXT[],
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Check if there are any ticket types for this event
      const checkTicketTypes = await pool.query(
        'SELECT COUNT(*) FROM tickettypes WHERE event_id = $1',
        [eventId]
      );
      
      // If no ticket types exist, create a default one based on event details
      if (parseInt(checkTicketTypes.rows[0].count) === 0) {
        const eventDetails = await pool.query(
          'SELECT ticket_price, max_attendees FROM events WHERE event_id = $1',
          [eventId]
        );
        
        if (eventDetails.rows.length > 0) {
          const event = eventDetails.rows[0];
          await pool.query(`
            INSERT INTO tickettypes (
              event_id, type_name, price, quantity_available, 
              description, benefits
            ) VALUES (
              $1, 'General Admission', $2, $3, 
              'Standard event ticket', ARRAY['Event access', 'Welcome kit']
            )
          `, [
            eventId, 
            event.ticket_price || 0, 
            event.max_attendees || 100
          ]);
        }
      }
    } catch (createError) {
      console.error('Error ensuring tickettypes table exists:', createError);
      // Continue execution even if table creation fails
    }

    // Get all ticket types for this event
    const ticketTypesQuery = await pool.query(`
      SELECT 
        ticket_type_id, event_id, type_name, price, 
        quantity_available, quantity_sold, description, 
        benefits, created_at, updated_at
      FROM tickettypes
      WHERE event_id = $1
      ORDER BY price ASC
    `, [eventId]);

    // Add default values for missing fields expected by the frontend
    const ticketTypesWithDefaults = ticketTypesQuery.rows.map(ticket => ({
      ...ticket,
      is_active: true, // Add is_active = true by default
      sales_start_date: null, // Add null sales_start_date
      sales_end_date: null // Add null sales_end_date
    }));

    res.json({
      success: true,
      ticketTypes: ticketTypesWithDefaults,
      count: ticketTypesWithDefaults.length
    });
  } catch (error) {
    console.error('Error fetching ticket types:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message,
      details: error.detail || 'No additional details available'
    });
  }
});

// POST create a new ticket type
app.post('/api/events/:eventId/ticket-types', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { 
      type_name, price, quantity_available, description, 
      benefits, is_active, sales_start_date, sales_end_date 
    } = req.body;
    
    // Validate required fields
    if (!type_name || price === undefined) {
      return res.status(400).json({ message: 'Type name and price are required' });
    }
    
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

    // Handle benefits array
    let benefitsArray = null;
    if (benefits) {
      if (Array.isArray(benefits)) {
        benefitsArray = benefits;
      } else if (typeof benefits === 'string') {
        // If benefits is a comma-separated string, convert it to an array
        benefitsArray = benefits.split(',').map(b => b.trim());
      }
    }

    // Insert new ticket type
    const newTicketType = await pool.query(`
      INSERT INTO tickettypes (
        event_id, type_name, price, quantity_available, 
        description, benefits
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      eventId, type_name, price, quantity_available || 0, 
      description || null, benefitsArray
    ]);

    // Add default values for missing fields expected by the frontend
    const ticketTypeWithDefaults = {
      ...newTicketType.rows[0],
      is_active: true,
      sales_start_date: null,
      sales_end_date: null
    };

    res.status(201).json({
      success: true,
      message: 'Ticket type created successfully',
      ticketType: ticketTypeWithDefaults
    });
  } catch (error) {
    console.error('Error creating ticket type:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT update an existing ticket type
app.put('/api/events/:eventId/ticket-types/:ticketTypeId', authenticateToken, async (req, res) => {
  try {
    const { eventId, ticketTypeId } = req.params;
    const { 
      type_name, price, quantity_available, description, 
      benefits, is_active, sales_start_date, sales_end_date 
    } = req.body;
    
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

    // Check if ticket type exists
    const ticketTypeCheck = await pool.query(
      'SELECT ticket_type_id FROM tickettypes WHERE ticket_type_id = $1 AND event_id = $2',
      [ticketTypeId, eventId]
    );

    if (ticketTypeCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Ticket type not found' });
    }

    // Handle benefits array
    let benefitsArray = null;
    if (benefits) {
      if (Array.isArray(benefits)) {
        benefitsArray = benefits;
      } else if (typeof benefits === 'string') {
        // If benefits is a comma-separated string, convert it to an array
        benefitsArray = benefits.split(',').map(b => b.trim());
      }
    }

    // Update ticket type
    const updateResult = await pool.query(`
      UPDATE tickettypes 
      SET 
        type_name = COALESCE($1, type_name),
        price = COALESCE($2, price),
        quantity_available = COALESCE($3, quantity_available),
        description = COALESCE($4, description),
        benefits = COALESCE($5, benefits),
        updated_at = NOW()
      WHERE ticket_type_id = $6 AND event_id = $7
      RETURNING *
    `, [
      type_name, price, quantity_available, description, benefitsArray,
      ticketTypeId, eventId
    ]);

    // Add default values for missing fields expected by the frontend
    const ticketTypeWithDefaults = {
      ...updateResult.rows[0],
      is_active: true,
      sales_start_date: null,
      sales_end_date: null
    };

    res.json({
      success: true,
      message: 'Ticket type updated successfully',
      ticketType: ticketTypeWithDefaults
    });
  } catch (error) {
    console.error('Error updating ticket type:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE a ticket type
app.delete('/api/events/:eventId/ticket-types/:ticketTypeId', authenticateToken, async (req, res) => {
  try {
    const { eventId, ticketTypeId } = req.params;
    
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

    // Delete the ticket type
    await pool.query('DELETE FROM tickettypes WHERE ticket_type_id = $1 AND event_id = $2', [ticketTypeId, eventId]);

    res.json({
      success: true,
      message: 'Ticket type deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting ticket type:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET ticket sales data for an event
app.get('/api/events/:eventId/ticket-sales', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { period = '30' } = req.query; // Default to last 30 days
    
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

    // Get sales data by ticket type
    const ticketTypeSalesQuery = await pool.query(`
      SELECT 
        tt.ticket_type_id,
        tt.type_name,
        tt.price,
        tt.quantity_available,
        COUNT(er.registration_id) as tickets_sold,
        SUM(er.ticket_quantity) as total_quantity_sold,
        SUM(er.total_amount) as total_revenue,
        COUNT(DISTINCT er.attendee_id) as unique_buyers
      FROM tickettypes tt
      LEFT JOIN eventregistrations er ON tt.ticket_type_id = er.ticket_type_id
        AND er.registration_date >= NOW() - INTERVAL '${period} days'
        AND er.payment_status = 'completed'
      WHERE tt.event_id = $1
      GROUP BY tt.ticket_type_id, tt.type_name, tt.price, tt.quantity_available
      ORDER BY tt.price ASC
    `, [eventId]);

    // Get daily sales data
    const dailySalesQuery = await pool.query(`
      SELECT 
        DATE(er.registration_date) as date,
        COUNT(er.registration_id) as transactions,
        SUM(er.ticket_quantity) as tickets_sold,
        SUM(er.total_amount) as revenue
      FROM eventregistrations er
      WHERE er.event_id = $1
        AND er.registration_date >= NOW() - INTERVAL '${period} days'
        AND er.payment_status = 'completed'
      GROUP BY DATE(er.registration_date)
      ORDER BY date ASC
    `, [eventId]);

    // Get overall sales summary
    const salesSummaryQuery = await pool.query(`
      SELECT 
        COUNT(er.registration_id) as total_transactions,
        SUM(er.ticket_quantity) as total_tickets_sold,
        SUM(er.total_amount) as total_revenue,
        COUNT(DISTINCT er.attendee_id) as unique_customers,
        MAX(er.registration_date) as latest_sale,
        MIN(er.registration_date) as first_sale
      FROM eventregistrations er
      WHERE er.event_id = $1
        AND er.payment_status = 'completed'
    `, [eventId]);

    // Get recent sales
    const recentSalesQuery = await pool.query(`
      SELECT 
        er.registration_id,
        er.registration_date,
        er.ticket_quantity,
        er.total_amount,
        a.full_name as attendee_name,
        tt.type_name as ticket_type
      FROM eventregistrations er
      JOIN attendees a ON er.attendee_id = a.attendee_id
      LEFT JOIN tickettypes tt ON er.ticket_type_id = tt.ticket_type_id
      WHERE er.event_id = $1
        AND er.payment_status = 'completed'
      ORDER BY er.registration_date DESC
      LIMIT 5
    `, [eventId]);

    const summary = salesSummaryQuery.rows[0] || {
      total_transactions: 0,
      total_tickets_sold: 0,
      total_revenue: 0,
      unique_customers: 0
    };

    res.json({
      success: true,
      summary: {
        totalRevenue: summary.total_revenue || 0,
        totalTicketsSold: summary.total_tickets_sold || 0,
        uniqueCustomers: summary.unique_customers || 0,
      },
      ticketTypes: ticketTypeSalesQuery.rows.map(type => ({
        id: type.ticket_type_id,
        name: type.type_name,
        price: type.price,
        available: type.quantity_available,
        sold: type.total_quantity_sold || 0,
        revenue: type.total_revenue || 0
      })),
      dailySales: dailySalesQuery.rows.map(day => ({
        date: day.date,
        tickets: day.tickets_sold || 0,
        revenue: day.revenue || 0
      })),
      recentSales: recentSalesQuery.rows.map(sale => ({
        id: sale.registration_id,
        date: sale.registration_date,
        quantity: sale.ticket_quantity,
        amount: sale.total_amount,
        attendee: sale.attendee_name,
        ticketType: sale.ticket_type
      }))
    });
  } catch (error) {
    console.error('Error fetching ticket sales:', error);
    res.status(500).json({ 
      message: 'Error fetching ticket sales data',
      error: error.message 
    });
  }
});

// DELETE ticket type route handler
app.delete('/api/events/:eventId/ticket-types/:ticketTypeId', authenticateToken, async (req, res) => {
  try {
    const { eventId, ticketTypeId } = req.params;
    
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

    // Check if ticket type exists
    const ticketTypeCheck = await pool.query(
      'SELECT ticket_type_id FROM tickettypes WHERE ticket_type_id = $1 AND event_id = $2',
      [ticketTypeId, eventId]
    );

    if (ticketTypeCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Ticket type not found' });
    }

    // Check if there are registrations using this ticket type
    // If there are, don't allow deletion or mark as inactive instead
    // This would require a relationship between registration and ticket type
    
    // Delete ticket type
    await pool.query(
      'DELETE FROM tickettypes WHERE ticket_type_id = $1 AND event_id = $2',
      [ticketTypeId, eventId]
    );

    res.json({
      success: true,
      message: 'Ticket type deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting ticket type:', error);
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

// GET attendance history for event
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

    // Get attendance history with detailed information
    const historyQuery = await pool.query(`
      SELECT 
        al.log_id,
        al.registration_id,
        al.check_in_time,
        al.check_out_time,
        a.full_name as attendee_name,
        u.email as attendee_email,
        a.phone as attendee_phone,
        er.ticket_quantity
      FROM attendance_log al
      JOIN eventregistrations er ON al.registration_id = er.registration_id
      JOIN attendees a ON er.attendee_id = a.attendee_id
      JOIN users u ON a.user_id = u.user_id
      WHERE al.event_id = $1
      ORDER BY al.check_in_time DESC
    `, [eventId]);

    res.json({
      success: true,
      history: historyQuery.rows,
      count: historyQuery.rows.length
    });
  } catch (error) {
    console.error('Error fetching attendance history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST manual attendance entry
app.post('/api/events/:eventId/attendance/manual', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { registration_id, full_name, email, phone, ticket_quantity = 1 } = req.body;
    
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
      'SELECT event_id, max_attendees, ticket_price FROM events WHERE event_id = $1 AND organizer_id = $2',
      [eventId, organizerId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found or not owned by organizer' });
    }

    const event = eventCheck.rows[0];

    // If registration_id is provided, use it for direct check-in (existing attendee)
    if (registration_id) {
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

      return res.json({
        success: true,
        message: 'Check-in successful',
        data: {
          log_id: checkInResult.rows[0].log_id,
          registration_id: registration_id,
          check_in_time: checkInResult.rows[0].check_in_time,
          attendee: attendeeDetails.rows[0]
        }
      });
    }
    
    // Otherwise, handle new manual attendee registration
    if (!full_name || !email) {
      return res.status(400).json({ message: 'Full name and email are required for manual registration' });
    }

    // Begin transaction for new registration
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if a user with this email already exists
      let userId;
      let attendeeId;

      const existingUserQuery = await client.query(
        'SELECT user_id FROM users WHERE email = $1',
        [email]
      );

      if (existingUserQuery.rows.length > 0) {
        // User exists, get their ID
        userId = existingUserQuery.rows[0].user_id;
        
        // Check if they're already an attendee
        const existingAttendeeQuery = await client.query(
          'SELECT attendee_id FROM attendees WHERE user_id = $1',
          [userId]
        );
        
        if (existingAttendeeQuery.rows.length > 0) {
          attendeeId = existingAttendeeQuery.rows[0].attendee_id;
        } else {
          // Create new attendee record for existing user
          const newAttendeeQuery = await client.query(`
            INSERT INTO attendees (user_id, full_name, phone, created_at)
            VALUES ($1, $2, $3, NOW())
            RETURNING attendee_id
          `, [userId, full_name, phone || null]);
          
          attendeeId = newAttendeeQuery.rows[0].attendee_id;
        }
      } else {
        // Create a new user with a random password (they'll need to reset it)
        const randomPassword = Math.random().toString(36).slice(-10);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
        
        const newUserQuery = await client.query(`
          INSERT INTO users (email, password, role_type, is_email_verified, created_at)
          VALUES ($1, $2, 'attendee', true, NOW())
          RETURNING user_id
        `, [email, hashedPassword]);
        
        userId = newUserQuery.rows[0].user_id;
        
        // Create attendee record
        const newAttendeeQuery = await client.query(`
          INSERT INTO attendees (user_id, full_name, phone, created_at)
          VALUES ($1, $2, $3, NOW())
          RETURNING attendee_id
        `, [userId, full_name, phone || null]);
        
        attendeeId = newAttendeeQuery.rows[0].attendee_id;
      }

      // Check if already registered for this event
      const existingRegistrationQuery = await client.query(
        'SELECT registration_id FROM eventregistrations WHERE event_id = $1 AND attendee_id = $2',
        [eventId, attendeeId]
      );

      let registrationId;
      let isNewRegistration = false;
      
      if (existingRegistrationQuery.rows.length > 0) {
        // Already registered, use existing registration
        registrationId = existingRegistrationQuery.rows[0].registration_id;
      } else {
        // Create new registration
        isNewRegistration = true;
        const totalAmount = event.ticket_price * ticket_quantity;
        
        const newRegistrationQuery = await client.query(`
          INSERT INTO eventregistrations (event_id, attendee_id, registration_date, 
                                         total_amount, payment_status, ticket_quantity)
          VALUES ($1, $2, NOW(), $3, $4, $5)
          RETURNING registration_id
        `, [eventId, attendeeId, totalAmount, 'completed', ticket_quantity]);
        
        registrationId = newRegistrationQuery.rows[0].registration_id;
      }

      // Create check-in record
      const checkInResult = await client.query(`
        INSERT INTO attendance_log (registration_id, event_id, check_in_time)
        VALUES ($1, $2, NOW())
        RETURNING log_id, check_in_time
      `, [registrationId, eventId]);

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: isNewRegistration ? 'Manual registration and check-in successful' : 'Manual check-in successful',
        data: {
          log_id: checkInResult.rows[0].log_id,
          registration_id: registrationId,
          attendee_id: attendeeId,
          user_id: userId,
          check_in_time: checkInResult.rows[0].check_in_time,
          attendee: {
            full_name,
            email,
            phone
          },
          is_new_registration: isNewRegistration
        }
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error processing manual attendance:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST checkout attendee
app.post('/api/events/:eventId/attendance/checkout', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { registration_id, log_id, strict_mode = false } = req.body;
    
    console.log('Checkout request received:', { eventId, registration_id, log_id, strict_mode });
    
    // Get organizer_id from the user
    const organizerQuery = await pool.query(
      'SELECT organizer_id FROM organizers WHERE user_id = $1',
      [req.user.user_id]
    );

    if (organizerQuery.rows.length === 0) {
      console.log('User is not an organizer:', req.user.user_id);
      return res.status(403).json({ message: 'User is not an organizer' });
    }

    const organizerId = organizerQuery.rows[0].organizer_id;

    // Check if event belongs to this organizer
    const eventCheck = await pool.query(
      'SELECT event_id FROM events WHERE event_id = $1 AND organizer_id = $2',
      [eventId, organizerId]
    );

    if (eventCheck.rows.length === 0) {
      console.log('Event not found or not owned by organizer:', { eventId, organizerId });
      return res.status(404).json({ message: 'Event not found or not owned by organizer' });
    }

    if (!registration_id && !log_id) {
      console.log('No registration_id or log_id provided');
      return res.status(400).json({ message: 'Registration ID or log ID required' });
    }

    // Ensure the attendance_log table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance_log (
        log_id SERIAL PRIMARY KEY,
        registration_id INTEGER NOT NULL,
        event_id INTEGER NOT NULL,
        check_in_time TIMESTAMP DEFAULT NOW(),
        check_out_time TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    let checkOutQuery;
    
    if (log_id) {
      // If log_id is provided, update that specific attendance log
      console.log('Checking out by log_id:', log_id);
      checkOutQuery = await pool.query(`
        UPDATE attendance_log 
        SET check_out_time = NOW() 
        WHERE log_id = $1 AND event_id = $2 AND check_out_time IS NULL
        RETURNING log_id, registration_id, check_in_time, check_out_time
      `, [log_id, eventId]);
    } else {
      // If only registration_id is provided, update the most recent check-in without a checkout
      console.log('Checking out by registration_id:', registration_id);
      
      // First, check if there's an active check-in (without checkout)
      const activeCheckIn = await pool.query(`
        SELECT log_id FROM attendance_log
        WHERE registration_id = $1 AND event_id = $2 AND check_out_time IS NULL
        ORDER BY check_in_time DESC LIMIT 1
      `, [registration_id, eventId]);
      
      if (activeCheckIn.rows.length > 0) {
        // Update the existing record
        checkOutQuery = await pool.query(`
          UPDATE attendance_log 
          SET check_out_time = NOW() 
          WHERE log_id = $1
          RETURNING log_id, registration_id, check_in_time, check_out_time
        `, [activeCheckIn.rows[0].log_id]);
      } else {
        // If no active check-in exists, check if there's any record for this registration at all
        const anyCheckIn = await pool.query(`
          SELECT log_id FROM attendance_log
          WHERE registration_id = $1 AND event_id = $2
          ORDER BY check_in_time DESC LIMIT 1
        `, [registration_id, eventId]);
        
        // If in strict mode, return an error when no active check-in found
        if (strict_mode === true) {
          console.log('Strict mode enabled, rejecting checkout with no active check-in');
          return res.status(400).json({ 
            success: false, 
            message: 'No active check-in found for this attendee',
            code: 'NO_ACTIVE_CHECKIN',
            data: {
              registration_id: registration_id,
              event_id: eventId
            }
          });
        }
        
        if (anyCheckIn.rows.length > 0) {
          // Force checkout on the most recent record
          console.log('No active check-in found, forcing checkout on most recent record');
          checkOutQuery = await pool.query(`
            UPDATE attendance_log 
            SET check_out_time = NOW() 
            WHERE log_id = $1
            RETURNING log_id, registration_id, check_in_time, check_out_time
          `, [anyCheckIn.rows[0].log_id]);
        } else {
          // No check-in records at all, create a new check-in and check-out record
          console.log('No check-in records found at all, creating new record with immediate checkout');
          checkOutQuery = await pool.query(`
            INSERT INTO attendance_log (registration_id, event_id, check_in_time, check_out_time)
            VALUES ($1, $2, NOW(), NOW())
            RETURNING log_id, registration_id, check_in_time, check_out_time
          `, [registration_id, eventId]);
        }
      }
    }

    if (checkOutQuery.rows.length === 0) {
      console.log('Failed to process check-out for this attendee');
      return res.status(500).json({ message: 'Failed to process check-out' });
    }

    console.log('Check-out successful, updating record:', checkOutQuery.rows[0]);

    // Get attendee details for response
    const attendeeDetails = await pool.query(`
      SELECT a.full_name, u.email
      FROM eventregistrations er
      JOIN attendees a ON er.attendee_id = a.attendee_id
      JOIN users u ON a.user_id = u.user_id
      WHERE er.registration_id = $1
    `, [checkOutQuery.rows[0].registration_id]);

    console.log('Attendee details retrieved:', attendeeDetails.rows[0] || 'No details found');

    // Create response with attendee data (with fallback)
    const attendeeData = attendeeDetails.rows.length > 0 ? 
      attendeeDetails.rows[0] : 
      { full_name: 'Unknown Attendee', email: 'unknown@example.com' };

    // Determine if this was a forced checkout or a regular checkout
    const wasForced = checkOutQuery.rows[0].check_in_time.toISOString() === checkOutQuery.rows[0].check_out_time.toISOString();
    const checkoutStatus = wasForced ? 'forced_checkout' : 'normal_checkout';

    res.json({
      success: true,
      message: 'Check-out successful',
      status: checkoutStatus,
      data: {
        log_id: checkOutQuery.rows[0].log_id,
        registration_id: checkOutQuery.rows[0].registration_id,
        check_in_time: checkOutQuery.rows[0].check_in_time,
        check_out_time: checkOutQuery.rows[0].check_out_time,
        attendee: attendeeData
      }
    });
  } catch (error) {
    console.error('Error checking out attendee:', error);
    res.status(500).json({ message: 'Internal server error' });
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
