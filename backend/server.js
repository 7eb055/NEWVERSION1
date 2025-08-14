const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import routes
const attendeeRoutes = require('./routes/attendee');
const ticketingRoutes = require('./routes/ticketing');
const settingsRoutes = require('./routes/settings');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');

// Import upload middleware
const { upload, handleMulterError } = require('./middleware/upload');

// Import services
// const NotificationScheduler = require('./services/NotificationScheduler'); // Disabled

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

// Initialize notification scheduler - DISABLED
// const notificationScheduler = new NotificationScheduler();

// Test database connection (only in non-test environments)
if (process.env.NODE_ENV !== 'test') {
  pool.connect((err, client, release) => {
    if (err) {
      console.error('Error connecting to database:', err);
    } else {
      console.log('✅ Connected to PostgreSQL database');
      release();
    }
  });
}

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

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('=== JWT DEBUG ===');
  console.log('Full auth header:', authHeader);
  console.log('Extracted token:', token);
  console.log('Token length:', token ? token.length : 'No token');
  console.log('================');

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('JWT verification failed:', err.message);
      console.log('JWT error details:', err);
      return res.status(403).json({ message: 'Invalid or expired token', detail: err.message });
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
      'SELECT id as organizer_id FROM organizers WHERE user_id = $1',
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

// Basic Routes
// Root route for API health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Event Management API is running',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    service: 'Event Management API',
    timestamp: new Date().toISOString()
  });
});

// Admin Routes
// GET dashboard statistics
app.get('/api/admin/dashboard-stats', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const users = await pool.query('SELECT COUNT(*) FROM users');
    const events = await pool.query('SELECT COUNT(*) FROM events');
    const organizers = await pool.query('SELECT COUNT(*) FROM organizers');
    const attendees = await pool.query('SELECT COUNT(*) FROM attendees');
    
    // Try to get revenue from eventregistrations table
    let totalRevenue = 0;
    const revenueQuery = 'SELECT COALESCE(SUM(total_amount), 0) as total_revenue FROM eventregistrations WHERE payment_status = \'completed\'';
    try {
      const revenue = await pool.query(revenueQuery);
      totalRevenue = parseFloat(revenue.rows[0].total_revenue) || 0;
    } catch (err) {
      // Fallback if eventregistrations table doesn't exist
      try {
        const revenue = await pool.query('SELECT COALESCE(SUM(total_amount), 0) as total_revenue FROM bookings');
        totalRevenue = parseFloat(revenue.rows[0].total_revenue) || 0;
      } catch (err2) {
        totalRevenue = 0;
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
    const params = [];
    const conditions = [];

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
    
    const conditions = [];
    const params = [];

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
    const params = [];
    
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
    // Test database connection
    await pool.query('SELECT NOW()');
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
    
    const result = {};
    
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
      SELECT e.id as event_id, e.title as event_name, e.start_date as event_date, 
             e.ticket_price, e.capacity as max_attendees, 
             e.status, e.created_at,
             e.image as image_url, e.description, e.venue as venue_name, 
             e.location as venue_address, e.event_type as category,
             o.name as organizer_name, o.company_name,
             COUNT(t.id) as registration_count
      FROM events e
      LEFT JOIN organizers o ON e.organizer_id = o.id
      LEFT JOIN tickets t ON e.id = t.event_id
      WHERE e.status = $1
      GROUP BY e.id, o.name, o.company_name
      ORDER BY e.start_date ASC
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
      SELECT e.id as event_id, e.title as event_name, e.start_date as event_date, 
             e.ticket_price, e.capacity as max_attendees, 
             e.status, e.created_at,
             e.image as image_url, e.description, e.venue as venue_name, 
             e.location as venue_address, e.event_type as category,
             o.name as organizer_name, o.company_name, o.phone as organizer_phone,
             COUNT(t.id) as registration_count
      FROM events e
      LEFT JOIN organizers o ON e.organizer_id = o.id
      LEFT JOIN tickets t ON e.id = t.event_id
      WHERE e.id = $1
      GROUP BY e.id, o.name, o.company_name, o.phone
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

// GET ticket types for an event (public for attendees)
app.get('/api/events/:eventId/ticket-types/public', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Check if event exists and is published
    const eventCheck = await pool.query(
      'SELECT event_id, status FROM events WHERE event_id = $1 AND status = \'published\'',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found or not available' });
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

    // Add default values and calculate available quantity
    const ticketTypesWithDefaults = ticketTypesQuery.rows.map(ticket => ({
      ...ticket,
      is_active: true,
      sales_start_date: null,
      sales_end_date: null,
      available_quantity: (ticket.quantity_available || 0) - (ticket.quantity_sold || 0)
    }));

    res.json({
      success: true,
      ticketTypes: ticketTypesWithDefaults,
      count: ticketTypesWithDefaults.length
    });
  } catch (error) {
    console.error('Error fetching public ticket types:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message
    });
  }
});

// Attendee Routes
// POST register for event
app.post('/api/events/:eventId/register', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { eventId } = req.params;
    const { ticket_type_id, ticket_quantity = 1, payment_method = 'credit_card', payment_status = 'pending' } = req.body;

    await client.query('BEGIN');

    // Get attendee_id from the user, or create one if it doesn't exist
    const attendeeQuery = await client.query(
      'SELECT attendee_id FROM attendees WHERE user_id = $1',
      [req.user.user_id]
    );

    let attendeeId;
    if (attendeeQuery.rows.length === 0) {
      // Get user info to create attendee record
      const userQuery = await client.query(
        'SELECT email FROM users WHERE user_id = $1',
        [req.user.user_id]
      );
      
      if (userQuery.rows.length === 0) {
        return res.status(403).json({ message: 'User not found' });
      }
      
      // Create attendee record automatically using email as temporary full_name
      const email = userQuery.rows[0].email;
      const tempFullName = email.split('@')[0]; // Use part before @ as name
      
      const newAttendee = await client.query(
        'INSERT INTO attendees (user_id, full_name) VALUES ($1, $2) RETURNING attendee_id',
        [req.user.user_id, tempFullName]
      );
      
      attendeeId = newAttendee.rows[0].attendee_id;
    } else {
      attendeeId = attendeeQuery.rows[0].attendee_id;
    }

    // Check if event exists and is published
    const eventQuery = await client.query(
      'SELECT e.event_id, e.max_attendees, e.status FROM events e WHERE e.event_id = $1 AND e.status = \'published\'',
      [eventId]
    );

    if (eventQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found or not available for registration' });
    }

    // Check if ticket type exists and is available
    const ticketTypeQuery = await client.query(
      'SELECT ticket_type_id, type_name, price, quantity_available, quantity_sold FROM tickettypes WHERE ticket_type_id = $1 AND event_id = $2',
      [ticket_type_id, eventId]
    );

    if (ticketTypeQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Invalid ticket type' });
    }

    const ticketType = ticketTypeQuery.rows[0];
    const availableTickets = ticketType.quantity_available - (ticketType.quantity_sold || 0);

    if (ticket_quantity > availableTickets) {
      return res.status(400).json({ message: 'Not enough tickets available' });
    }

    // Calculate total amount
    const totalAmount = ticketType.price * ticket_quantity;

    // Create registration with QR code
    const qrCode = `${Date.now()}-${eventId}-${attendeeId}`;
    const newRegistration = await client.query(`
      INSERT INTO eventregistrations (
        event_id, 
        attendee_id, 
        ticket_type_id,
        registration_date,
        total_amount, 
        payment_status, 
        payment_method,
        ticket_quantity,
        qr_code
      )
      VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      eventId,
      attendeeId,
      ticket_type_id,
      totalAmount,
      payment_status,
      payment_method,
      ticket_quantity,
      qrCode
    ]);

    // Update ticket quantity sold
    await client.query(
      'UPDATE tickettypes SET quantity_sold = COALESCE(quantity_sold, 0) + $1 WHERE ticket_type_id = $2',
      [ticket_quantity, ticket_type_id]
    );

    await client.query('COMMIT');

    // Get full registration details for response
    const registrationDetails = await client.query(`
      SELECT 
        er.*,
        e.event_name,
        tt.type_name as ticket_type_name,
        tt.price as ticket_price,
        a.full_name as attendee_name,
        u.email as attendee_email
      FROM eventregistrations er
      JOIN events e ON er.event_id = e.event_id
      JOIN tickettypes tt ON er.ticket_type_id = tt.ticket_type_id
      JOIN attendees a ON er.attendee_id = a.attendee_id
      JOIN users u ON a.user_id = u.user_id
      WHERE er.registration_id = $1
    `, [newRegistration.rows[0].registration_id]);

    res.status(201).json({
      message: 'Registration successful',
      registration: registrationDetails.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error registering for event:', error);
    res.status(500).json({ 
      message: error.message || 'Internal server error',
      error: error
    });
  } finally {
    client.release();
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

    // Get registrations for this attendee with enhanced information
    const registrationsQuery = await pool.query(`
      SELECT er.registration_id, er.registration_date, er.total_amount, 
             er.payment_status, er.payment_method, er.ticket_quantity, er.qr_code,
             er.status as registration_status,
             e.event_name, e.event_date, e.event_start_time, e.event_end_time,
             e.venue_name, e.venue_address, e.description as event_description,
             e.image_url as event_image,
             tt.type_name as ticket_type_name, tt.price as ticket_price,
             o.full_name as organizer_name, o.company_name,
             CASE 
               WHEN al.check_in_time IS NOT NULL THEN true 
               ELSE false 
             END as checked_in,
             CASE 
               WHEN ef.feedback_id IS NOT NULL THEN true 
               ELSE false 
             END as has_feedback
      FROM eventregistrations er
      JOIN events e ON er.event_id = e.event_id
      JOIN organizers o ON e.organizer_id = o.organizer_id
      LEFT JOIN tickettypes tt ON er.ticket_type_id = tt.ticket_type_id
      LEFT JOIN attendancelogs al ON er.registration_id = al.registration_id
      LEFT JOIN eventfeedback ef ON e.event_id = ef.event_id AND ef.attendee_id = er.attendee_id
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
             e.image_url, e.image_filename, e.image_type, e.image_size, e.image_mimetype,
             e.venue_name, e.venue_address, e.description, e.category, e.event_type,
             e.registration_deadline, e.refund_policy, e.terms_and_conditions,
             e.is_public, e.requires_approval, e.max_tickets_per_person,
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
      status = 'draft',
      description,
      venue_name,
      venue_address,
      category,
      image_url,
      image_filename,
      image_type,
      image_size,
      image_mimetype
    } = req.body;

    if (!event_name || !event_date) {
      return res.status(400).json({ message: 'Event name and date are required' });
    }

    const newEvent = await pool.query(`
      INSERT INTO events (
        event_name, event_date, ticket_price, max_attendees, organizer_id, status,
        description, venue_name, venue_address, category,
        image_url, image_filename, image_type, image_size, image_mimetype
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      event_name,
      event_date,
      ticket_price || 0,
      max_attendees || 100,
      organizerId,
      status,
      description || null,
      venue_name || null,
      venue_address || null,
      category || null,
      image_url || null,
      image_filename || null,
      image_type || null,
      image_size || null,
      image_mimetype || null
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
      status,
      description,
      venue_name,
      venue_address,
      category,
      image_url,
      image_filename,
      image_type,
      image_size,
      image_mimetype
    } = req.body;

    const updatedEvent = await pool.query(`
      UPDATE events 
      SET event_name = COALESCE($1, event_name),
          event_date = COALESCE($2, event_date),
          ticket_price = COALESCE($3, ticket_price),
          max_attendees = COALESCE($4, max_attendees),
          status = COALESCE($5, status),
          description = COALESCE($6, description),
          venue_name = COALESCE($7, venue_name),
          venue_address = COALESCE($8, venue_address),
          category = COALESCE($9, category),
          image_url = COALESCE($10, image_url),
          image_filename = COALESCE($11, image_filename),
          image_type = COALESCE($12, image_type),
          image_size = COALESCE($13, image_size),
          image_mimetype = COALESCE($14, image_mimetype),
          updated_at = CURRENT_TIMESTAMP
      WHERE event_id = $15 AND organizer_id = $16
      RETURNING *
    `, [
      event_name,
      event_date,
      ticket_price,
      max_attendees,
      status,
      description,
      venue_name,
      venue_address,
      category,
      image_url,
      image_filename,
      image_type,
      image_size,
      image_mimetype,
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
      benefits
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
      benefits
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

// Generate QR Code for registration
app.post('/api/registrations/:id/generate-qr', authenticateToken, async (req, res) => {
  try {
    const registrationId = req.params.id;
    const QRCode = require('qrcode');

    // Check if registration exists and get details
    const registrationCheck = await pool.query(
      `SELECT 
        r.*,
        e.event_name, 
        e.event_date,
        a.full_name as attendee_name,
        u.email as attendee_email
       FROM eventregistrations r
       JOIN events e ON r.event_id = e.event_id
       JOIN attendees a ON r.attendee_id = a.attendee_id
       JOIN users u ON a.user_id = u.user_id
       WHERE r.registration_id = $1`,
      [registrationId]
    );

    if (registrationCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    const registration = registrationCheck.rows[0];

    // Create QR code data object
    const qrData = {
      registration_id: registration.registration_id,
      event_id: registration.event_id,
      event_name: registration.event_name,
      attendee_name: registration.attendee_name,
      attendee_email: registration.attendee_email,
      event_date: registration.event_date,
      generated_at: new Date().toISOString()
    };

    // Generate QR code as base64
    const qrCodeBase64 = await QRCode.toDataURL(JSON.stringify(qrData));

    // Ensure columns exist with proper type
    try {
      await pool.query(`
        DO $$ 
        BEGIN 
          BEGIN
            ALTER TABLE eventregistrations ALTER COLUMN qr_code TYPE TEXT;
          EXCEPTION 
            WHEN undefined_column THEN 
              ALTER TABLE eventregistrations ADD COLUMN qr_code TEXT;
          END;

          BEGIN
            ALTER TABLE eventregistrations ALTER COLUMN qr_data TYPE TEXT;
          EXCEPTION 
            WHEN undefined_column THEN 
              ALTER TABLE eventregistrations ADD COLUMN qr_data TEXT;
          END;

          BEGIN
            ALTER TABLE eventregistrations ADD COLUMN qr_generated_at TIMESTAMP;
          EXCEPTION 
            WHEN duplicate_column THEN NULL;
          END;
        END $$;
      `);
    } catch (err) {
      console.error('Error ensuring columns exist:', err);
      // Continue anyway as the error might be harmless
    }

    // Store QR code in database
    await pool.query(
      `UPDATE eventregistrations 
       SET qr_code = $1::text, 
           qr_generated_at = CURRENT_TIMESTAMP,
           qr_data = $2::text
       WHERE registration_id = $3`,
      [qrCodeBase64, JSON.stringify(qrData), registrationId]
    );

    res.json({
      success: true,
      message: 'QR code generated successfully',
      data: {
        qr_code: qrCodeBase64,
        registration_id: registration.registration_id,
        event_name: registration.event_name,
        attendee_name: registration.attendee_name
      }
    });

  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ message: 'Failed to generate QR code' });
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

// Notification Routes
// GET user notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, unread_only = false, type = '' } = req.query;
    const offset = (page - 1) * limit;

    // Ensure notifications table exists, if not create it and add sample data
    try {
      await pool.query('SELECT 1 FROM notifications LIMIT 1');
    } catch (tableError) {
      console.log('Notifications table does not exist, creating it...');
      try {
        // Read and execute the SQL file
        const fs = require('fs');
        const path = require('path');
        const sqlPath = path.join(__dirname, 'scripts', 'create-notifications-table.sql');
        
        if (fs.existsSync(sqlPath)) {
          const sql = fs.readFileSync(sqlPath, 'utf8');
          await pool.query(sql);
          console.log('✅ Notifications table created successfully');
        } else {
          // Fallback: create basic table structure
          await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
              notification_id SERIAL PRIMARY KEY,
              user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
              title VARCHAR(255) NOT NULL,
              message TEXT NOT NULL,
              type VARCHAR(50) DEFAULT 'system',
              read BOOLEAN DEFAULT FALSE,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              event_id INTEGER REFERENCES events(event_id) ON DELETE CASCADE,
              metadata JSONB DEFAULT '{}',
              priority VARCHAR(20) DEFAULT 'normal',
              expires_at TIMESTAMP,
              action_url VARCHAR(500),
              is_deleted BOOLEAN DEFAULT FALSE
            );
          `);
          console.log('✅ Basic notifications table created');
        }
      } catch (createError) {
        console.error('Error creating notifications table:', createError);
      }
    }

    let query = `
      SELECT n.notification_id as id, n.title, n.message, n.type, n.read, 
             n.created_at as timestamp, n.priority, n.action_url,
             e.event_name, e.event_date
      FROM notifications n
      LEFT JOIN events e ON n.event_id = e.event_id
      WHERE n.user_id = $1 AND n.is_deleted = FALSE
    `;
    
    const params = [req.user.user_id];
    let paramCount = 1;

    if (unread_only === 'true') {
      query += ` AND n.read = FALSE`;
    }

    if (type) {
      paramCount++;
      query += ` AND n.type = $${paramCount}`;
      params.push(type);
    }

    query += ` ORDER BY n.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get unread count
    const unreadCountResult = await pool.query(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = $1 AND read = FALSE AND is_deleted = FALSE',
      [req.user.user_id]
    );

    res.json({
      notifications: result.rows,
      unread_count: parseInt(unreadCountResult.rows[0].unread_count),
      total: result.rows.length,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET notification statistics
app.get('/api/notifications/stats', authenticateToken, async (req, res) => {
  try {
    // Ensure notifications table exists
    try {
      await pool.query('SELECT 1 FROM notifications LIMIT 1');
    } catch (tableError) {
      console.log('Notifications table does not exist, returning mock stats');
      return res.json({
        total: 0,
        unread: 0,
        by_type: {},
        recent_count: 0
      });
    }

    const statsQuery = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE read = FALSE) as unread,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as recent_count,
        json_object_agg(type, type_count) as by_type
      FROM (
        SELECT type, COUNT(*) as type_count
        FROM notifications 
        WHERE user_id = $1 AND is_deleted = FALSE
        GROUP BY type
      ) as type_stats,
      (SELECT COUNT(*) as total_count FROM notifications WHERE user_id = $1 AND is_deleted = FALSE) as total_stats
    `, [req.user.user_id]);

    res.json(statsQuery.rows[0]);
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST mark notification as read
app.post('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'UPDATE notifications SET read = TRUE, updated_at = CURRENT_TIMESTAMP WHERE notification_id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read', notification: result.rows[0] });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST mark all notifications as read
app.post('/api/notifications/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE notifications SET read = TRUE, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND read = FALSE RETURNING notification_id',
      [req.user.user_id]
    );

    res.json({ 
      message: 'All notifications marked as read', 
      updated_count: result.rows.length 
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE notification
app.delete('/api/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'UPDATE notifications SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE notification_id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST create notification (admin/system use)
app.post('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const { 
      user_id, 
      title, 
      message, 
      type = 'system', 
      event_id = null, 
      priority = 'normal',
      action_url = null,
      expires_at = null
    } = req.body;

    // Only allow admins to create notifications for other users
    if (user_id && user_id !== req.user.user_id) {
      const userRoleCheck = await pool.query('SELECT role_type FROM users WHERE user_id = $1', [req.user.user_id]);
      if (userRoleCheck.rows.length === 0 || userRoleCheck.rows[0].role_type !== 'admin') {
        return res.status(403).json({ message: 'Only admins can create notifications for other users' });
      }
    }

    const targetUserId = user_id || req.user.user_id;

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    const result = await pool.query(`
      INSERT INTO notifications (user_id, title, message, type, event_id, priority, action_url, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [targetUserId, title, message, type, event_id, priority, action_url, expires_at]);

    res.status(201).json({ 
      message: 'Notification created successfully', 
      notification: result.rows[0] 
    });
  } catch (error) {
    console.error('Error creating notification:', error);
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
      `SELECT id as user_id, email, password, role, is_suspended, created_at
       FROM users 
       WHERE email = $1`,
      [email]
    );

    if (userQuery.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const userData = userQuery.rows[0];

    // Check if user is suspended
    if (userData.is_suspended) {
      return res.status(401).json({ 
        message: 'Your account has been suspended. Please contact support.',
        isSuspended: true
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, userData.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Get all roles for this user
    const roles = [];
    const primaryRole = userData.role;

    // Check if user is an attendee
    const attendeeData = await pool.query(
      'SELECT name, phone FROM attendees WHERE user_id = $1',
      [userData.user_id]
    );

    if (attendeeData.rows.length > 0) {
      roles.push({
        role: 'attendee',
        full_name: attendeeData.rows[0].name,
        phone: attendeeData.rows[0].phone
      });
    }

    // Check if user is an organizer
    const organizerData = await pool.query(
      'SELECT id as organizer_id, name, phone, company_name, business_address FROM organizers WHERE user_id = $1',
      [userData.user_id]
    );

    if (organizerData.rows.length > 0) {
      roles.push({
        role: 'organizer',
        organizer_id: organizerData.rows[0].organizer_id,
        full_name: organizerData.rows[0].name,
        phone: organizerData.rows[0].phone,
        company_name: organizerData.rows[0].company_name,
        business_address: organizerData.rows[0].business_address
      });
    }

    // Update last login (optional - we can skip this for now)
    // await pool.query(
    //   'UPDATE users SET updated_at = NOW() WHERE id = $1',
    //   [userData.user_id]
    // );

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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userResult = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id as user_id, email, role, created_at',
      [email.split('@')[0], email, hashedPassword, role_type || 'attendee'] // Use email prefix as name
    );

    const newUser = userResult.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { 
        user_id: newUser.user_id, 
        email: newUser.email, 
        role: newUser.role
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
        role: newUser.role,
        primary_role: newUser.role,
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
    const params = [eventId];

    if (day) {
      query += ' AND session_date = CURRENT_DATE + ($2 || \' days\')::interval';
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
          file_size VARCHAR(100),
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

// Import public events endpoint
const publicEventsRouter = require('./endpoints/public-events');

// File Upload Endpoints
// Single image upload
app.post('/api/upload/image', upload.single('image'), handleMulterError, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No image file uploaded' 
      });
    }

    const imageUrl = `/uploads/events/${req.file.filename}`;
    
    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        imageUrl: imageUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to upload image',
      details: error.message 
    });
  }
});

// Multiple images upload
app.post('/api/upload/images', upload.array('images', 5), handleMulterError, (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No image files uploaded' 
      });
    }

    const uploadedImages = req.files.map(file => ({
      imageUrl: `/uploads/events/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    }));
    
    res.json({
      success: true,
      message: `${req.files.length} images uploaded successfully`,
      data: {
        images: uploadedImages,
        count: req.files.length
      }
    });
  } catch (error) {
    console.error('Multiple images upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to upload images',
      details: error.message 
    });
  }
});

// Delete uploaded image
app.delete('/api/upload/image/:filename', authenticateToken, (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'uploads', 'events', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Image not found' 
      });
    }

    // Delete the file
    fs.unlinkSync(filePath);
    
    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Image deletion error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete image',
      details: error.message 
    });
  }
});

// GET all published events with additional details for attendee dashboard
app.use('/api/public/events', publicEventsRouter);

// Mount attendee routes
app.use('/api/attendee', attendeeRoutes);

// Mount ticketing routes
app.use('/api', ticketingRoutes);

// Mount settings routes
app.use('/api/settings', settingsRoutes);

// Mount admin routes
app.use('/api/admin', adminRoutes);

// Mount payment routes
app.use('/api/payments', paymentRoutes);

// Start server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Email notification scheduler is temporarily disabled
    console.log('📧 Email notification scheduler is disabled');
    console.log('💡 To re-enable: uncomment notification scheduler code in server.js');
    
    // Commented out notification scheduler
    // if (process.env.NODE_ENV === 'production' || process.env.ENABLE_NOTIFICATIONS === 'true') {
    //   notificationScheduler.start();
    //   console.log('📧 Email notification scheduler started');
    // } else {
    //   console.log('📧 Email notification scheduler disabled (set ENABLE_NOTIFICATIONS=true to enable)');
    // }
  });
}

// Graceful shutdown (notification scheduler disabled)
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  pool.end().then(() => {
    console.log('Database connections closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  pool.end().then(() => {
    console.log('Database connections closed.');
    process.exit(0);
  });
});

// Export app and pool for testing
module.exports = { app, pool };
