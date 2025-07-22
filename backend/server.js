const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
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

// Email transporter setup (for Gmail verification)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD // Use App Password for Gmail
  }
});

// JWT Secret
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

// Generate verification token
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Send verification email
const sendVerificationEmail = async (email, token, username) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
  
  console.log('Sending verification email:', {
    to: email,
    username: username,
    token_length: token.length,
    token_preview: token.substring(0, 8) + '...',
    verification_url: verificationUrl
  });
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify Your Email Address - Event Management System',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
          <h1>Event Management System</h1>
          <h2>Email Verification</h2>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <p>Hello ${username},</p>
          <p>Thank you for signing up! Please click the button below to verify your email address:</p>
          <p style="text-align: center;">
            <a href="${verificationUrl}" style="display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">Verify Email Address</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all;">${verificationUrl}</p>
          <p>This verification link will expire in 24 hours.</p>
          <p>If you did not create an account, please ignore this email.</p>
        </div>
        <div style="padding: 20px; text-align: center; color: #666;">
          <p>&copy; 2025 Event Management System. All rights reserved.</p>
        </div>
      </div>
    `
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', {
      messageId: result.messageId,
      to: email
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', {
      error: error.message,
      code: error.code,
      to: email
    });
    return false;
  }
};

// ===== AUTHENTICATION ROUTES =====

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Event Management API is running',
    timestamp: new Date().toISOString()
  });
});

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, phone, role = 'attendee', company_id } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    // Check if user already exists
    const userExists = await pool.query(
      'SELECT user_id FROM Users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'User with this email or username already exists' });
    }

    // Get role_id - first try to find it, create if it doesn't exist
    let roleResult = await pool.query('SELECT role_id FROM Roles WHERE role_name = $1', [role]);
    
    if (roleResult.rows.length === 0) {
      // Create the role if it doesn't exist
      const validRoles = ['admin', 'organizer', 'attendee', 'vendor', 'speaker'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid role specified. Valid roles are: ' + validRoles.join(', ') });
      }
      
      // Insert the new role
      roleResult = await pool.query(
        'INSERT INTO Roles (role_name) VALUES ($1) RETURNING role_id',
        [role]
      );
    }

    const role_id = roleResult.rows[0].role_id;

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    console.log('Generated verification token:', {
      token_length: verificationToken.length,
      token_preview: verificationToken.substring(0, 16) + '...',
      expires_at: tokenExpires.toISOString()
    });

    // Insert user
    const newUser = await pool.query(
      `INSERT INTO Users (username, email, password, phone, role_id, company_id, email_verification_token, email_verification_token_expires) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING user_id, username, email, role_id, email_verification_token`,
      [username, email, hashedPassword, phone, role_id, company_id, verificationToken, tokenExpires]
    );

    console.log('User created with verification token:', {
      user_id: newUser.rows[0].user_id,
      email: newUser.rows[0].email,
      token_stored: !!newUser.rows[0].email_verification_token,
      token_length: newUser.rows[0].email_verification_token?.length
    });

    // Send verification email
    const emailSent = await sendVerificationEmail(email, verificationToken, username);

    res.status(201).json({
      message: 'User registered successfully. Please check your email to verify your account.',
      user: {
        user_id: newUser.rows[0].user_id,
        username: newUser.rows[0].username,
        email: newUser.rows[0].email,
        role_id: newUser.rows[0].role_id
      },
      emailSent
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Verify email
app.get('/api/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    console.log('Email verification attempt:', {
      token_received: !!token,
      token_length: token?.length,
      token_preview: token?.substring(0, 8) + '...'
    });

    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    // Find user with this token
    const user = await pool.query(
      `SELECT user_id, username, email, email_verification_token_expires 
       FROM Users 
       WHERE email_verification_token = $1 AND email_verified = FALSE`,
      [token]
    );

    console.log('Token lookup result:', {
      users_found: user.rows.length,
      token_search: token.substring(0, 8) + '...'
    });

    if (user.rows.length === 0) {
      // Let's check if the user exists but with different conditions
      const debugUser = await pool.query(
        `SELECT user_id, username, email, email_verified, 
                email_verification_token IS NOT NULL as has_token,
                email_verification_token_expires
         FROM Users 
         WHERE email_verification_token = $1`,
        [token]
      );
      
      console.log('Debug - Token exists check:', {
        found_any: debugUser.rows.length,
        details: debugUser.rows[0] || 'No user found with this token'
      });
      
      return res.status(400).json({ message: 'Invalid or already used verification token' });
    }

    const userData = user.rows[0];

    // Check if token is expired
    if (new Date() > new Date(userData.email_verification_token_expires)) {
      return res.status(400).json({ message: 'Verification token has expired' });
    }

    // Update user as verified
    const updateResult = await pool.query(
      `UPDATE Users 
       SET email_verified = TRUE, 
           email_verified_at = CURRENT_TIMESTAMP,
           email_verification_token = NULL,
           email_verification_token_expires = NULL,
           account_status = 'active',
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 RETURNING user_id, email, email_verified`,
      [userData.user_id]
    );

    console.log('Email verification completed:', {
      user_id: userData.user_id,
      email: userData.email,
      updated: updateResult.rows.length > 0,
      now_verified: updateResult.rows[0]?.email_verified
    });

    res.json({ 
      message: 'Email verified successfully! You can now log in to your account.',
      verified: true
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Server error during email verification' });
  }
});

// Resend verification email
app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find unverified user
    const user = await pool.query(
      'SELECT user_id, username, email FROM Users WHERE email = $1 AND email_verified = FALSE',
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(400).json({ message: 'User not found or already verified' });
    }

    const userData = user.rows[0];

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new token
    await pool.query(
      `UPDATE Users 
       SET email_verification_token = $1, 
           email_verification_token_expires = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $3`,
      [verificationToken, tokenExpires, userData.user_id]
    );

    // Send verification email
    const emailSent = await sendVerificationEmail(email, verificationToken, userData.username);

    res.json({
      message: 'Verification email sent successfully',
      emailSent
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Server error while resending verification email' });
  }
});

//Debug endpoint to check user verification status
app.get('/api/auth/debug-user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const user = await pool.query(
      `SELECT user_id, username, email, email_verified, account_status,
              email_verification_token IS NOT NULL as has_verification_token,
              email_verification_token_expires,
              created_at, updated_at
       FROM Users 
       WHERE email = $1`,
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      debug_info: user.rows[0],
      current_time: new Date().toISOString()
    });

  } catch (error) {
    console.error('Debug user error:', error);
    res.status(500).json({ message: 'Server error during debug check' });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user by email
    const user = await pool.query(
      `SELECT u.user_id, u.username, u.email, u.password, u.email_verified, 
              u.account_status, r.role_name, u.company_id
       FROM Users u 
       JOIN Roles r ON u.role_id = r.role_id 
       WHERE u.email = $1`,
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const userData = user.rows[0];

    // Check if account is active
    if (userData.account_status !== 'active') {
      if (userData.account_status === 'pending' && !userData.email_verified) {
        return res.status(401).json({ 
          message: 'Please verify your email address before logging in',
          requiresVerification: true
        });
      }
      return res.status(401).json({ message: 'Account is not active' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, userData.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Update last login
    await pool.query(
      'UPDATE Users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1',
      [userData.user_id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        user_id: userData.user_id, 
        email: userData.email, 
        role: userData.role_name,
        company_id: userData.company_id
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        user_id: userData.user_id,
        username: userData.username,
        email: userData.email,
        role: userData.role_name,
        company_id: userData.company_id
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user profile
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const user = await pool.query(
      `SELECT u.user_id, u.username, u.email, u.phone, r.role_name, 
              u.company_id, ec.company_name, u.created_at, u.last_login
       FROM Users u 
       LEFT JOIN Roles r ON u.role_id = r.role_id 
       LEFT JOIN EventCompanies ec ON u.company_id = ec.company_id
       WHERE u.user_id = $1`,
      [req.user.user_id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: user.rows[0] });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
});

// ===== COMPANY ROUTES =====

// Get all companies
app.get('/api/companies', authenticateToken, async (req, res) => {
  try {
    const companies = await pool.query('SELECT * FROM EventCompanies ORDER BY company_name');
    res.json({ companies: companies.rows });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ message: 'Server error while fetching companies' });
  }
});

// Create new company
app.post('/api/companies', authenticateToken, async (req, res) => {
  try {
    const { company_name, address, contact_info } = req.body;

    if (!company_name) {
      return res.status(400).json({ message: 'Company name is required' });
    }

    const newCompany = await pool.query(
      'INSERT INTO EventCompanies (company_name, address, contact_info) VALUES ($1, $2, $3) RETURNING *',
      [company_name, address, contact_info]
    );

    res.status(201).json({ 
      message: 'Company created successfully',
      company: newCompany.rows[0] 
    });

  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({ message: 'Server error while creating company' });
  }
});

// ===== EVENT ROUTES =====

// Get all events
app.get('/api/events', async (req, res) => {
  try {
    const events = await pool.query(
      `SELECT e.*, ec.company_name, u.username as created_by_name
       FROM Events e
       LEFT JOIN EventCompanies ec ON e.company_id = ec.company_id
       LEFT JOIN Users u ON e.created_by = u.user_id
       ORDER BY e.event_date DESC`
    );

    res.json({ events: events.rows });

  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Server error while fetching events' });
  }
});

// Get events by user
app.get('/api/events/my-events', authenticateToken, async (req, res) => {
  try {
    const events = await pool.query(
      `SELECT e.*, ec.company_name
       FROM Events e
       LEFT JOIN EventCompanies ec ON e.company_id = ec.company_id
       WHERE e.created_by = $1
       ORDER BY e.event_date DESC`,
      [req.user.user_id]
    );

    res.json({ events: events.rows });

  } catch (error) {
    console.error('Get user events error:', error);
    res.status(500).json({ message: 'Server error while fetching user events' });
  }
});

// Create new event
app.post('/api/events', authenticateToken, async (req, res) => {
  try {
    const { event_name, event_date, event_location, description, capacity, company_id } = req.body;

    if (!event_name || !event_date) {
      return res.status(400).json({ message: 'Event name and date are required' });
    }

    // Use user's company_id if not provided and user has one
    const finalCompanyId = company_id || req.user.company_id;

    const newEvent = await pool.query(
      `INSERT INTO Events (event_name, event_date, event_location, description, capacity, company_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [event_name, event_date, event_location, description, capacity, finalCompanyId, req.user.user_id]
    );

    res.status(201).json({
      message: 'Event created successfully',
      event: newEvent.rows[0]
    });

  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Server error while creating event' });
  }
});

// Get single event
app.get('/api/events/:id', async (req, res) => {
  try {
    const eventId = req.params.id;

    const event = await pool.query(
      `SELECT e.*, ec.company_name, u.username as created_by_name
       FROM Events e
       LEFT JOIN EventCompanies ec ON e.company_id = ec.company_id
       LEFT JOIN Users u ON e.created_by = u.user_id
       WHERE e.event_id = $1`,
      [eventId]
    );

    if (event.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json({ event: event.rows[0] });

  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ message: 'Server error while fetching event' });
  }
});

// Update event
app.put('/api/events/:id', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    const { event_name, event_date, event_location, description, capacity } = req.body;

    // Check if user owns this event or is admin
    const eventCheck = await pool.query(
      'SELECT created_by FROM Events WHERE event_id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (eventCheck.rows[0].created_by !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }

    const updatedEvent = await pool.query(
      `UPDATE Events 
       SET event_name = $1, event_date = $2, event_location = $3, description = $4, capacity = $5
       WHERE event_id = $6 RETURNING *`,
      [event_name, event_date, event_location, description, capacity, eventId]
    );

    res.json({
      message: 'Event updated successfully',
      event: updatedEvent.rows[0]
    });

  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Server error while updating event' });
  }
});

// Delete event
app.delete('/api/events/:id', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.id;

    // Check if user owns this event or is admin
    const eventCheck = await pool.query(
      'SELECT created_by FROM Events WHERE event_id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (eventCheck.rows[0].created_by !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }

    await pool.query('DELETE FROM Events WHERE event_id = $1', [eventId]);

    res.json({ message: 'Event deleted successfully' });

  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Server error while deleting event' });
  }
});

// ===== ROLES ROUTES =====

// Get all roles
app.get('/api/roles', async (req, res) => {
  try {
    const roles = await pool.query('SELECT * FROM Roles ORDER BY role_name');
    res.json({ roles: roles.rows });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ message: 'Server error while fetching roles' });
  }
});



// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
