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
