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

// Add query logging for debugging
pool.on('query', (query) => {
  console.log('Executing query:', query.text);
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

// Generate password reset token
const generatePasswordResetToken = () => {
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

// Send password reset email
const sendPasswordResetEmail = async (email, token, username) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
  
  console.log('Sending password reset email:', {
    to: email,
    username: username,
    token_length: token.length,
    token_preview: token.substring(0, 8) + '...',
    reset_url: resetUrl
  });
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset Request - Event Management System',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); color: white; padding: 30px; text-align: center;">
          <h1>Event Management System</h1>
          <h2>Password Reset Request</h2>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <p>Hello ${username},</p>
          <p>We received a request to reset your password. Click the button below to reset your password:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" style="display: inline-block; background: #ff6b6b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">Reset Password</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all;">${resetUrl}</p>
          <p><strong>Important:</strong> This password reset link will expire in 1 hour for security reasons.</p>
          <p>If you did not request a password reset, please ignore this email and your password will remain unchanged.</p>
          <p>For security reasons, never share this reset link with anyone.</p>
        </div>
        <div style="padding: 20px; text-align: center; color: #666;">
          <p>&copy; 2025 Event Management System. All rights reserved.</p>
        </div>
      </div>
    `
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent successfully:', {
      messageId: result.messageId,
      to: email
    });
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', {
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

// Register new user (with separate attendee/organizer tables)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, phone, role = 'attendee', companyName, contactPerson, location } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Full name, email, and password are required' });
    }

    // Validate role
    if (!['attendee', 'organizer'].includes(role)) {
      return res.status(400).json({ message: 'Role must be either "attendee" or "organizer"' });
    }

    // Check if user already exists
    const userExists = await pool.query(
      'SELECT user_id, role_type, is_email_verified FROM Users WHERE email = $1',
      [email]
    );

    let userId = null;
    let userAlreadyExists = false;

    if (userExists.rows.length > 0) {
      const existingUser = userExists.rows[0];
      userId = existingUser.user_id;
      userAlreadyExists = true;

      // Check if they already have this role
      if (role === 'attendee') {
        const attendeeExists = await pool.query(
          'SELECT attendee_id FROM Attendees WHERE user_id = $1',
          [userId]
        );
        if (attendeeExists.rows.length > 0) {
          return res.status(400).json({ message: 'You are already registered as an attendee' });
        }
      } else if (role === 'organizer') {
        const organizerExists = await pool.query(
          'SELECT organizer_id FROM Organizers WHERE user_id = $1',
          [userId]
        );
        if (organizerExists.rows.length > 0) {
          return res.status(400).json({ message: 'You are already registered as an organizer' });
        }
      }

      // If email is not verified, we can't allow adding new roles
      if (!existingUser.is_email_verified) {
        return res.status(400).json({ 
          message: 'Please verify your existing account before adding additional roles' 
        });
      }
    }

    // Validate organizer-specific fields
    if (role === 'organizer') {
      if (!companyName || !contactPerson || !location) {
        return res.status(400).json({ 
          message: 'Company name, contact person, and location are required for organizers' 
        });
      }
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // If user doesn't exist, create them
      if (!userAlreadyExists) {
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

        // Insert into Users table
        const newUser = await client.query(
          `INSERT INTO Users (email, password, role_type, email_verification_token, email_verification_token_expires) 
           VALUES ($1, $2, $3, $4, $5) RETURNING user_id, email, role_type`,
          [email, hashedPassword, role, verificationToken, tokenExpires]
        );

        userId = newUser.rows[0].user_id;

        // Log verification attempt
        await client.query(
          `INSERT INTO EmailVerificationLogs (user_id, email, verification_token, token_expires) 
           VALUES ($1, $2, $3, $4)`,
          [userId, email, verificationToken, tokenExpires]
        );

        console.log('User created with verification token:', {
          user_id: userId,
          email: email,
          role: role,
          token_stored: true,
          token_length: verificationToken.length
        });

        // Send verification email for new users
        const emailSent = await sendVerificationEmail(email, verificationToken, username);
      }

      // Insert into role-specific table
      if (role === 'attendee') {
        await client.query(
          `INSERT INTO Attendees (user_id, full_name, phone) 
           VALUES ($1, $2, $3)`,
          [userId, username, phone]
        );
      } else if (role === 'organizer') {
        // First, create or find company
        let companyId = null;
        if (companyName) {
          const existingCompany = await client.query(
            'SELECT company_id FROM EventCompanies WHERE company_name = $1',
            [companyName]
          );

          if (existingCompany.rows.length > 0) {
            companyId = existingCompany.rows[0].company_id;
          } else {
            const newCompany = await client.query(
              'INSERT INTO EventCompanies (company_name, address) VALUES ($1, $2) RETURNING company_id',
              [companyName, location]
            );
            companyId = newCompany.rows[0].company_id;
          }
        }

        await client.query(
          `INSERT INTO Organizers (user_id, full_name, phone, company_name, company_id, business_address) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [userId, username, contactPerson || phone, companyName, companyId, location]
        );
      }

      await client.query('COMMIT');

      const message = userAlreadyExists 
        ? `${role.charAt(0).toUpperCase() + role.slice(1)} role added successfully to your existing account.`
        : 'User registered successfully. Please check your email to verify your account.';

      res.status(201).json({
        message,
        user: {
          user_id: userId,
          email: email,
          role: role,
          isNewUser: !userAlreadyExists
        },
        emailSent: !userAlreadyExists
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Verify email
app.get('/api/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    console.log('=== EMAIL VERIFICATION ATTEMPT ===');
    console.log('Request details:', {
      token_received: !!token,
      token_length: token?.length,
      token_preview: token?.substring(0, 8) + '...',
      full_token: token, // Temporary debug - remove in production
      timestamp: new Date().toISOString()
    });

    if (!token) {
      console.log('❌ No token provided');
      return res.status(400).json({ message: 'Verification token is required' });
    }

    // Start transaction for verification
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // First, let's see ALL users and their tokens for debugging
      const allUsers = await client.query(`
        SELECT user_id, email, is_email_verified, 
               email_verification_token IS NOT NULL as has_token,
               email_verification_token_expires,
               created_at
        FROM Users 
        ORDER BY created_at DESC
      `);

      console.log('Current database state:');
      console.table(allUsers.rows);

      // Find user with this token - DON'T clear token yet
      const user = await client.query(
        `SELECT user_id, email, role_type, email_verification_token, email_verification_token_expires, is_email_verified
         FROM Users 
         WHERE email_verification_token = $1`,
        [token]
      );

      console.log('Token lookup result:', {
        users_found: user.rows.length,
        token_search: token.substring(0, 8) + '...',
        search_token_full: token
      });

      if (user.rows.length === 0) {
        await client.query('ROLLBACK');
        console.log('❌ Token not found in database');
        
        // Let's also check if there are any tokens that are similar
        const similarTokens = await client.query(`
          SELECT user_id, email, email_verification_token,
                 CASE 
                   WHEN email_verification_token LIKE $1 THEN 'PREFIX_MATCH'
                   WHEN POSITION($2 IN email_verification_token) > 0 THEN 'SUBSTRING_MATCH'
                   ELSE 'NO_MATCH'
                 END as match_type
          FROM Users 
          WHERE email_verification_token IS NOT NULL
        `, [token.substring(0, 8) + '%', token.substring(0, 16)]);
        
        console.log('Similar tokens check:', similarTokens.rows);
        
        return res.status(400).json({ message: 'Invalid verification token or token has already been used' });
      }

      const userData = user.rows[0];
      console.log('Found user data:', {
        user_id: userData.user_id,
        email: userData.email,
        is_verified: userData.is_email_verified,
        token_expires: userData.email_verification_token_expires,
        stored_token: userData.email_verification_token
      });

      // Check if already verified
      if (userData.is_email_verified) {
        await client.query('ROLLBACK');
        console.log('❌ User already verified:', userData.email);
        return res.status(400).json({ 
          message: 'This email has already been verified. You can proceed to login.',
          verified: false,  // Don't treat this as a success
          alreadyVerified: true
        });
      }

      // Check if token is expired
      if (new Date() > new Date(userData.email_verification_token_expires)) {
        await client.query('ROLLBACK');
        console.log('Token expired for user:', userData.email);
        return res.status(400).json({ message: 'Verification token has expired' });
      }

      // Verify the token matches exactly what we stored
      if (userData.email_verification_token !== token) {
        await client.query('ROLLBACK');
        console.log('Token mismatch for user:', userData.email);
        return res.status(400).json({ message: 'Invalid verification token' });
      }

      console.log('Token validation successful, proceeding with verification...');

      // First, mark as verified but keep the token
      const verificationResult = await client.query(
        `UPDATE Users 
         SET is_email_verified = TRUE, 
             email_verified_at = NOW()
         WHERE user_id = $1 AND email_verification_token = $2 AND is_email_verified = FALSE
         RETURNING user_id, email, is_email_verified`,
        [userData.user_id, token]
      );

      if (verificationResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Verification failed - user may already be verified' });
      }

      console.log('User verification status updated:', verificationResult.rows[0]);

      // Now clear the token only after successful verification
      await client.query(
        `UPDATE Users 
         SET email_verification_token = NULL,
             email_verification_token_expires = NULL
         WHERE user_id = $1`,
        [userData.user_id]
      );

      console.log('Verification token cleared after successful verification');

      // Log successful verification
      await client.query(
        `UPDATE EmailVerificationLogs 
         SET verification_success = TRUE 
         WHERE user_id = $1 AND verification_token = $2`,
        [userData.user_id, token]
      );

      await client.query('COMMIT');

      console.log('Email verification completed successfully:', {
        user_id: userData.user_id,
        email: userData.email,
        verified_at: new Date().toISOString(),
        is_verified: verificationResult.rows[0].is_email_verified
      });

      res.json({ 
        message: 'Email verified successfully! You can now log in to your account.',
        verified: true,
        user: {
          user_id: userData.user_id,
          email: userData.email,
          is_verified: true
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction error during verification:', error);
      throw error;
    } finally {
      client.release();
    }

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
      'SELECT user_id, email FROM Users WHERE email = $1 AND is_email_verified = FALSE',
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
           updated_at = NOW()
       WHERE user_id = $3`,
      [verificationToken, tokenExpires, userData.user_id]
    );

    // Get full name for email from attendee or organizer table
    let fullName = 'User';
    const attendee = await pool.query('SELECT full_name FROM Attendees WHERE user_id = $1', [userData.user_id]);
    if (attendee.rows.length > 0) {
      fullName = attendee.rows[0].full_name;
    } else {
      const organizer = await pool.query('SELECT full_name FROM Organizers WHERE user_id = $1', [userData.user_id]);
      if (organizer.rows.length > 0) {
        fullName = organizer.rows[0].full_name;
      }
    }

    // Send verification email
    const emailSent = await sendVerificationEmail(email, verificationToken, fullName);

    res.json({
      message: 'Verification email sent successfully',
      emailSent
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Server error while resending verification email' });
  }
});

// Forgot password
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    console.log('Password reset request for:', email);

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user by email (regardless of verification status for security)
    const user = await pool.query(
      'SELECT user_id, email, is_email_verified FROM Users WHERE email = $1',
      [email]
    );

    // Always return success for security (don't reveal if email exists)
    // But only send email if user actually exists and is verified
    if (user.rows.length > 0 && user.rows[0].is_email_verified) {
      const userData = user.rows[0];

      // Generate password reset token
      const resetToken = generatePasswordResetToken();
      const tokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      console.log('Generated password reset token:', {
        user_id: userData.user_id,
        email: userData.email,
        token_length: resetToken.length,
        token_preview: resetToken.substring(0, 8) + '...',
        expires_at: tokenExpires.toISOString()
      });

      // Store reset token in database
      await pool.query(
        `UPDATE Users 
         SET password_reset_token = $1, 
             password_reset_token_expires = $2,
             updated_at = NOW()
         WHERE user_id = $3`,
        [resetToken, tokenExpires, userData.user_id]
      );

      // Get full name for email from attendee or organizer table
      let fullName = 'User';
      const attendee = await pool.query('SELECT full_name FROM Attendees WHERE user_id = $1', [userData.user_id]);
      if (attendee.rows.length > 0) {
        fullName = attendee.rows[0].full_name;
      } else {
        const organizer = await pool.query('SELECT full_name FROM Organizers WHERE user_id = $1', [userData.user_id]);
        if (organizer.rows.length > 0) {
          fullName = organizer.rows[0].full_name;
        }
      }

      // Send password reset email
      const emailSent = await sendPasswordResetEmail(email, resetToken, fullName);

      console.log('Password reset email sent:', {
        user_id: userData.user_id,
        email: userData.email,
        email_sent: emailSent
      });
    } else {
      console.log('Password reset requested for non-existent or unverified user:', email);
    }

    // Always return success message for security
    res.json({
      message: 'If an account with that email exists and is verified, password reset instructions have been sent.',
      success: true
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error while processing password reset request' });
  }
});

// Reset password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    console.log('Password reset attempt:', {
      token_received: !!token,
      token_length: token?.length,
      token_preview: token?.substring(0, 8) + '...',
      has_new_password: !!newPassword
    });

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Reset token and new password are required' });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    // Start transaction for password reset
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Find user with this reset token
      const user = await client.query(
        `SELECT user_id, email, password_reset_token, password_reset_token_expires, is_email_verified
         FROM Users 
         WHERE password_reset_token = $1`,
        [token]
      );

      console.log('Reset token lookup result:', {
        users_found: user.rows.length,
        token_search: token.substring(0, 8) + '...'
      });

      if (user.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      const userData = user.rows[0];

      // Check if token is expired
      if (new Date() > new Date(userData.password_reset_token_expires)) {
        await client.query('ROLLBACK');
        console.log('Reset token expired for user:', userData.email);
        return res.status(400).json({ message: 'Reset token has expired. Please request a new password reset.' });
      }

      // Check if user is verified
      if (!userData.is_email_verified) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Account must be verified before resetting password' });
      }

      console.log('Token validation successful, proceeding with password reset...');

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password and clear reset token
      const updateResult = await client.query(
        `UPDATE Users 
         SET password = $1, 
             password_reset_token = NULL,
             password_reset_token_expires = NULL,
             updated_at = NOW()
         WHERE user_id = $2 AND password_reset_token = $3
         RETURNING user_id, email`,
        [hashedPassword, userData.user_id, token]
      );

      if (updateResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Password reset failed. Please try again.' });
      }

      await client.query('COMMIT');

      console.log('Password reset completed successfully:', {
        user_id: userData.user_id,
        email: userData.email,
        reset_at: new Date().toISOString()
      });

      res.json({ 
        message: 'Password has been reset successfully. You can now log in with your new password.',
        success: true
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction error during password reset:', error);
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
});

//Debug endpoint to check user verification status
app.get('/api/auth/debug-user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const user = await pool.query(
      `SELECT user_id, email, is_email_verified, 
              email_verification_token IS NOT NULL as has_verification_token,
              LENGTH(email_verification_token) as token_length,
              email_verification_token_expires,
              email_verification_token_expires > NOW() as token_not_expired,
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

// Debug endpoint to check token validity without using it
app.get('/api/auth/debug-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const user = await pool.query(
      `SELECT user_id, email, is_email_verified, 
              email_verification_token_expires,
              email_verification_token_expires > NOW() as token_not_expired,
              CASE 
                WHEN email_verification_token = $1 THEN 'MATCH'
                ELSE 'NO_MATCH'
              END as token_status
       FROM Users 
       WHERE email_verification_token = $1`,
      [token]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ 
        message: 'Token not found in database',
        token_preview: token.substring(0, 8) + '...'
      });
    }

    res.json({ 
      token_info: user.rows[0],
      current_time: new Date().toISOString(),
      token_preview: token.substring(0, 8) + '...'
    });

  } catch (error) {
    console.error('Debug token error:', error);
    res.status(500).json({ message: 'Server error during token debug check' });
  }
});

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
      'SELECT full_name, phone, company_name, business_address FROM Organizers WHERE user_id = $1',
      [userData.user_id]
    );

    if (organizerData.rows.length > 0) {
      roles.push({
        role: 'organizer',
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
        has_multiple_roles: roles.length > 1
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
    // Get basic user info
    const user = await pool.query(
      `SELECT user_id, email, role_type, is_email_verified, created_at, last_login
       FROM Users 
       WHERE user_id = $1`,
      [req.user.user_id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = user.rows[0];
    let roles = [];

    // Check if user is an attendee
    const attendeeData = await pool.query(
      'SELECT full_name, phone FROM Attendees WHERE user_id = $1',
      [req.user.user_id]
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
      'SELECT full_name, phone, company_name, business_address FROM Organizers WHERE user_id = $1',
      [req.user.user_id]
    );

    if (organizerData.rows.length > 0) {
      roles.push({
        role: 'organizer',
        full_name: organizerData.rows[0].full_name,
        phone: organizerData.rows[0].phone,
        company_name: organizerData.rows[0].company_name,
        business_address: organizerData.rows[0].business_address
      });
    }

    res.json({ 
      user: {
        ...userData,
        roles: roles
      }
    });

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

// Get company by ID
app.get('/api/companies/:id', authenticateToken, async (req, res) => {
  try {
    const companyId = req.params.id;
    
    const companyQuery = await pool.query(
      'SELECT * FROM EventCompanies WHERE company_id = $1',
      [companyId]
    );
    
    if (companyQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    res.json({ company: companyQuery.rows[0] });
  } catch (error) {
    console.error('Get company by ID error:', error);
    res.status(500).json({ message: 'Server error while fetching company details' });
  }
});

// Update company
app.put('/api/companies/:id', authenticateToken, async (req, res) => {
  try {
    const companyId = req.params.id;
    const { 
      company_name, 
      company_type, 
      category, 
      address, 
      contact_info, 
      description, 
      services 
    } = req.body;

    if (!company_name) {
      return res.status(400).json({ message: 'Company name is required' });
    }
    
    // Check if the company exists
    const companyCheck = await pool.query(
      'SELECT * FROM EventCompanies WHERE company_id = $1',
      [companyId]
    );
    
    if (companyCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    // Update the company
    const updateQuery = `
      UPDATE EventCompanies
      SET 
        company_name = $1,
        company_type = $2,
        category = $3,
        address = $4,
        contact_info = $5,
        description = $6,
        services = $7,
        updated_at = NOW()
      WHERE company_id = $8
      RETURNING *
    `;
    
    const updatedCompany = await pool.query(
      updateQuery,
      [
        company_name, 
        company_type || 'vendor', 
        category, 
        address, 
        contact_info, 
        description, 
        services,
        companyId
      ]
    );
    
    res.json({
      message: 'Company updated successfully',
      company: updatedCompany.rows[0]
    });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({ message: 'Server error while updating company' });
  }
});

// Delete company
app.delete('/api/companies/:id', authenticateToken, async (req, res) => {
  try {
    const companyId = req.params.id;
    
    // Check if company exists
    const companyCheck = await pool.query(
      'SELECT * FROM EventCompanies WHERE company_id = $1',
      [companyId]
    );
    
    if (companyCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    // Check if company has associated organizers
    const organizersCheck = await pool.query(
      'SELECT COUNT(*) FROM Organizers WHERE company_id = $1',
      [companyId]
    );
    
    const organizerCount = parseInt(organizersCheck.rows[0].count);
    if (organizerCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete company because it has associated organizers',
        organizerCount
      });
    }
    
    // Delete the company
    await pool.query(
      'DELETE FROM EventCompanies WHERE company_id = $1',
      [companyId]
    );
    
    res.json({ message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({ message: 'Server error while deleting company' });
  }
});

// Create new company
app.post('/api/companies', authenticateToken, async (req, res) => {
  try {
    const { 
      company_name, 
      company_type, 
      category, 
      address, 
      contact_info, 
      description, 
      services 
    } = req.body;

    if (!company_name) {
      return res.status(400).json({ message: 'Company name is required' });
    }
    
    // Check if a table schema update is needed
    try {
      // Check if columns exist in the table
      const checkColumnsQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'eventcompanies' 
        AND column_name = 'company_type'`;
      
      const columnCheck = await pool.query(checkColumnsQuery);
      
      // If company_type column doesn't exist, alter table to add new columns
      if (columnCheck.rows.length === 0) {
        await pool.query(`
          ALTER TABLE EventCompanies 
          ADD COLUMN company_type VARCHAR(50) DEFAULT 'vendor',
          ADD COLUMN category VARCHAR(100),
          ADD COLUMN description TEXT,
          ADD COLUMN services TEXT
        `);
        console.log('EventCompanies table schema updated with new columns');
      }
    } catch (schemaError) {
      console.error('Error checking/updating schema:', schemaError);
      // Continue with the insert anyway
    }
    
    // Additional columns needed for the enhanced company schema
    const query = `
      INSERT INTO EventCompanies (
        company_name, 
        address, 
        contact_info, 
        company_type, 
        category, 
        description, 
        services
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *`;

    const newCompany = await pool.query(
      query,
      [
        company_name, 
        address, 
        contact_info, 
        company_type || 'vendor', 
        category, 
        description, 
        services
      ]
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

// ===== ATTENDEE ROUTES =====

// Get all attendees
app.get('/api/attendees', authenticateToken, async (req, res) => {
  try {
    // Get user ID from token
    const userId = req.user.user_id;
    
    // Check if user is an organizer
    const organizerCheck = await pool.query(
      'SELECT organizer_id FROM organizers WHERE user_id = $1',
      [userId]
    );
    
    if (organizerCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Only organizers can access this resource' });
    }
    
    // Get all attendees with their user info
    const result = await pool.query(`
      SELECT 
        a.attendee_id, 
        a.full_name, 
        a.phone, 
        a.date_of_birth, 
        a.gender, 
        a.interests, 
        a.emergency_contact_name, 
        a.emergency_contact_phone, 
        a.dietary_restrictions, 
        a.accessibility_needs,
        a.profile_picture_url,
        a.bio,
        a.social_media_links,
        a.notification_preferences,
        a.created_at,
        a.updated_at,
        u.email
      FROM attendees a
      JOIN users u ON a.user_id = u.user_id
      ORDER BY a.full_name
    `);
    
    return res.status(200).json({ attendees: result.rows });
  } catch (err) {
    console.error('Error fetching attendees:', err);
    return res.status(500).json({ message: 'Failed to fetch attendees' });
  }
});

// Get attendee by ID
app.get('/api/attendees/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch attendee by ID with user info
    const result = await pool.query(`
      SELECT 
        a.attendee_id, 
        a.full_name, 
        a.phone, 
        a.date_of_birth, 
        a.gender, 
        a.interests, 
        a.emergency_contact_name, 
        a.emergency_contact_phone, 
        a.dietary_restrictions, 
        a.accessibility_needs,
        a.profile_picture_url,
        a.bio,
        a.social_media_links,
        a.notification_preferences,
        a.created_at,
        a.updated_at,
        u.email
      FROM attendees a
      JOIN users u ON a.user_id = u.user_id
      WHERE a.attendee_id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Attendee not found' });
    }
    
    return res.status(200).json({ attendee: result.rows[0] });
  } catch (err) {
    console.error('Error fetching attendee:', err);
    return res.status(500).json({ message: 'Failed to fetch attendee' });
  }
});

// Create new attendee
app.post('/api/attendees', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      email, full_name, phone, date_of_birth, gender, interests,
      emergency_contact_name, emergency_contact_phone, dietary_restrictions,
      accessibility_needs, profile_picture_url, bio, social_media_links,
      notification_preferences
    } = req.body;
    
    // Validate required fields
    if (!full_name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }
    
    // Check if user exists
    let userResult = await client.query(
      'SELECT user_id FROM users WHERE email = $1',
      [email]
    );
    
    let userId;
    
    if (userResult.rows.length === 0) {
      // Create new user if doesn't exist
      // Generate random password
      const tempPassword = crypto.randomBytes(8).toString('hex');
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      // Generate verification token
      const verificationToken = generateVerificationToken();
      const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Insert new user
      const newUserResult = await client.query(
        `INSERT INTO users 
        (email, password, role_type, email_verification_token, email_verification_token_expires) 
        VALUES ($1, $2, $3, $4, $5) RETURNING user_id`,
        [email, hashedPassword, 'attendee', verificationToken, tokenExpires]
      );
      
      userId = newUserResult.rows[0].user_id;
      
      // TODO: Send verification email to new user with the temporary password
    } else {
      userId = userResult.rows[0].user_id;
    }
    
    // Check if attendee profile already exists for this user
    const attendeeCheck = await client.query(
      'SELECT attendee_id FROM attendees WHERE user_id = $1',
      [userId]
    );
    
    if (attendeeCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Attendee profile already exists for this email' });
    }
    
    // Create attendee
    const result = await client.query(
      `INSERT INTO attendees (
        user_id, full_name, phone, date_of_birth, gender, interests,
        emergency_contact_name, emergency_contact_phone, dietary_restrictions,
        accessibility_needs, profile_picture_url, bio, social_media_links,
        notification_preferences
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [
        userId, full_name, phone, date_of_birth || null, gender, interests,
        emergency_contact_name, emergency_contact_phone, dietary_restrictions,
        accessibility_needs, profile_picture_url, bio, social_media_links,
        notification_preferences
      ]
    );
    
    await client.query('COMMIT');
    
    return res.status(201).json({
      attendee: {...result.rows[0], email},
      message: 'Attendee registered successfully'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating attendee:', err);
    return res.status(500).json({ message: 'Failed to register attendee' });
  } finally {
    client.release();
  }
});

// Update attendee
app.put('/api/attendees/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const {
      full_name, phone, date_of_birth, gender, interests,
      emergency_contact_name, emergency_contact_phone, dietary_restrictions,
      accessibility_needs, profile_picture_url, bio, social_media_links,
      notification_preferences
    } = req.body;
    
    // Validate required fields
    if (!full_name) {
      return res.status(400).json({ message: 'Full name is required' });
    }
    
    // Check if attendee exists
    const attendeeCheck = await client.query(
      'SELECT attendee_id FROM attendees WHERE attendee_id = $1',
      [id]
    );
    
    if (attendeeCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Attendee not found' });
    }
    
    // Update attendee
    const result = await client.query(
      `UPDATE attendees SET
        full_name = $1,
        phone = $2,
        date_of_birth = $3,
        gender = $4,
        interests = $5,
        emergency_contact_name = $6,
        emergency_contact_phone = $7,
        dietary_restrictions = $8,
        accessibility_needs = $9,
        profile_picture_url = $10,
        bio = $11,
        social_media_links = $12,
        notification_preferences = $13,
        updated_at = NOW()
      WHERE attendee_id = $14
      RETURNING *`,
      [
        full_name, phone, date_of_birth || null, gender, interests,
        emergency_contact_name, emergency_contact_phone, dietary_restrictions,
        accessibility_needs, profile_picture_url, bio, social_media_links,
        notification_preferences, id
      ]
    );
    
    // Get the email for the attendee
    const userResult = await client.query(
      `SELECT u.email FROM users u
       JOIN attendees a ON u.user_id = a.user_id
       WHERE a.attendee_id = $1`,
      [id]
    );
    
    await client.query('COMMIT');
    
    return res.status(200).json({
      attendee: {...result.rows[0], email: userResult.rows[0]?.email},
      message: 'Attendee updated successfully'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating attendee:', err);
    return res.status(500).json({ message: 'Failed to update attendee' });
  } finally {
    client.release();
  }
});

// Delete attendee
app.delete('/api/attendees/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // Check if attendee exists
    const attendeeCheck = await client.query(
      'SELECT user_id FROM attendees WHERE attendee_id = $1',
      [id]
    );
    
    if (attendeeCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Attendee not found' });
    }
    
    // Check for registrations
    const registrationsCheck = await client.query(
      'SELECT registration_id FROM eventregistrations WHERE attendee_id = $1 LIMIT 1',
      [id]
    );
    
    if (registrationsCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        message: 'Cannot delete attendee with active event registrations'
      });
    }
    
    // Delete attendee
    await client.query(
      'DELETE FROM attendees WHERE attendee_id = $1',
      [id]
    );
    
    // Note: We don't delete the user account, just the attendee profile
    
    await client.query('COMMIT');
    
    return res.status(200).json({
      message: 'Attendee deleted successfully'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting attendee:', err);
    return res.status(500).json({ message: 'Failed to delete attendee' });
  } finally {
    client.release();
  }
});

// ===== EVENT ROUTES =====

// Get all events
app.get('/api/events', async (req, res) => {
  try {
    // Query parameters for filtering
    const { 
      category,
      status,
      organizer_id,
      upcoming = 'true',
      limit = 50,
      offset = 0
    } = req.query;

    // Build the query dynamically based on filters
    let query = `
      SELECT e.*, 
             u.email as organizer_email,
             CASE WHEN o.full_name IS NOT NULL THEN o.full_name ELSE u.email END as organizer_name,
             (SELECT COUNT(*) FROM eventregistrations er WHERE er.event_id = e.event_id) as registration_count,
             COALESCE((SELECT ROUND(AVG(ef.rating), 1) FROM eventfeedback ef WHERE ef.event_id = e.event_id), 0) as average_rating
      FROM events e
      LEFT JOIN organizers o ON e.organizer_id = o.organizer_id
      LEFT JOIN users u ON o.user_id = u.user_id
      WHERE 1=1
    `;

    const queryParams = [];
    let paramCount = 0;

    // Add filters
    if (category) {
      paramCount++;
      query += ` AND e.category = $${paramCount}`;
      queryParams.push(category);
    }

    if (status) {
      paramCount++;
      query += ` AND e.status = $${paramCount}`;
      queryParams.push(status);
    }

    if (organizer_id) {
      paramCount++;
      query += ` AND e.organizer_id = $${paramCount}`;
      queryParams.push(organizer_id);
    }

    if (upcoming === 'true') {
      query += ` AND e.event_date >= NOW()`;
    }

    query += ` ORDER BY e.event_date ASC`;
    query += ` LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

    const result = await pool.query(query, queryParams);
    
    res.json({ 
      events: result.rows,
      total: result.rows.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Server error while fetching events' });
  }
});

// Get events by authenticated organizer
app.get('/api/events/my-events', authenticateToken, async (req, res) => {
  try {
    // Query parameters for filtering
    const { 
      status,
      upcoming = 'true',
      limit = 10,
      offset = 0
    } = req.query;

    // First, get the organizer_id for the authenticated user
    const organizerQuery = await pool.query(
      'SELECT organizer_id FROM organizers WHERE user_id = $1',
      [req.user.user_id]
    );

    if (organizerQuery.rows.length === 0) {
      return res.status(404).json({ 
        message: 'Organizer profile not found. Please create an event first.',
        events: []
      });
    }

    const organizerId = organizerQuery.rows[0].organizer_id;

    // Build the query dynamically based on filters
    let query = `
      SELECT e.*, 
             (SELECT COUNT(*) FROM eventregistrations er WHERE er.event_id = e.event_id) as registration_count,
             COALESCE((SELECT ROUND(AVG(ef.rating), 1) FROM eventfeedback ef WHERE ef.event_id = e.event_id), 0) as average_rating,
             (SELECT COUNT(*) FROM eventregistrations er WHERE er.event_id = e.event_id AND er.check_in_status = true) as check_in_count
      FROM events e
      WHERE e.organizer_id = $1
    `;
    
    const queryParams = [organizerId];
    let paramCounter = 2;

    // Add filters if provided
    if (status) {
      query += ` AND e.status = $${paramCounter++}`;
      queryParams.push(status);
    }

    if (upcoming === 'true') {
      query += ` AND e.event_date >= NOW()`;
    } else if (upcoming === 'false') {
      query += ` AND e.event_date < NOW()`;
    }

    // Add sorting and pagination
    query += ` ORDER BY e.event_date DESC LIMIT $${paramCounter++} OFFSET $${paramCounter++}`;
    queryParams.push(parseInt(limit), parseInt(offset));

    const events = await pool.query(query, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM events e
      WHERE e.organizer_id = $1
      ${status ? ' AND e.status = $2' : ''}
      ${upcoming === 'true' ? ' AND e.event_date >= NOW()' : ''}
      ${upcoming === 'false' ? ' AND e.event_date < NOW()' : ''}
    `;
    
    const countParams = [organizerId];
    if (status) countParams.push(status);

    const totalCount = await pool.query(countQuery, countParams);
    
    res.json({ 
      events: events.rows,
      pagination: {
        total: parseInt(totalCount.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: parseInt(offset) + parseInt(limit) < parseInt(totalCount.rows[0].total)
      }
    });

  } catch (error) {
    console.error('Get user events error:', error);
    res.status(500).json({ message: 'Server error while fetching user events' });
  }
});



// Create new event
app.post('/api/events', authenticateToken, async (req, res) => {
  try {
    const { 
      event_name, 
      event_date, 
      venue_name, 
      venue_address, 
      description, 
      ticket_price = 0,
      event_type = 'Conference', 
      category,
      tags,
      image_url,
      registration_deadline,
      refund_policy,
      terms_and_conditions,
      status = 'draft',
      is_public = true,
      requires_approval = false,
      max_tickets_per_person = 5,
      max_attendees
    } = req.body;

    if (!event_name || !event_date) {
      return res.status(400).json({ message: 'Event name and date are required' });
    }

    // Check if user is an organizer
    const organizerCheck = await pool.query(
      'SELECT user_id FROM organizers WHERE user_id = $1',
      [req.user.user_id]
    );

    // If the user is not an organizer, automatically make them one
    if (organizerCheck.rows.length === 0) {
      try {
        console.log('User is not an organizer, creating organizer record...');
        
        // First, get the user's information for the full_name field
        const userQuery = await pool.query(
          'SELECT email FROM users WHERE user_id = $1',
          [req.user.user_id]
        );
        
        if (userQuery.rows.length === 0) {
          return res.status(404).json({ 
            message: 'User not found',
            error: 'user_not_found'
          });
        }
        
        const user = userQuery.rows[0];
        const fullName = user.email.split('@')[0];
        
        // Insert user as an organizer with required fields
        await pool.query(
          'INSERT INTO organizers (user_id, full_name) VALUES ($1, $2)',
          [req.user.user_id, fullName]
        );
        console.log('Organizer record created successfully');
      } catch (err) {
        console.error('Error creating organizer record:', err);
        return res.status(403).json({ 
          message: 'Unable to create organizer record. Please contact support.',
          error: 'organizer_creation_failed',
          details: err.message
        });
      }
    }

    // Validate event date
    const eventDateTime = new Date(event_date);
    if (isNaN(eventDateTime.getTime())) {
      return res.status(400).json({ message: 'Invalid event date format' });
    }
    
    // Get the organizer_id from the organizers table
    const organizerIdQuery = await pool.query(
      'SELECT organizer_id FROM organizers WHERE user_id = $1',
      [req.user.user_id]
    );
    
    if (organizerIdQuery.rows.length === 0) {
      return res.status(500).json({ 
        message: 'Organizer record not found even after creation attempt',
        error: 'organizer_not_found'
      });
    }
    
    const organizerId = organizerIdQuery.rows[0].organizer_id;
    console.log(`Using organizer_id: ${organizerId} for event creation`);

    const newEvent = await pool.query(
      `INSERT INTO Events (
        organizer_id, event_name, event_date, venue_name, venue_address, 
        description, ticket_price, event_type, category, tags,
        image_url, registration_deadline, refund_policy, terms_and_conditions,
        status, is_public, requires_approval, max_tickets_per_person, max_attendees
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) 
      RETURNING *`,
      [
        organizerId, event_name, eventDateTime, venue_name, venue_address, 
        description, ticket_price, event_type, category, tags,
        image_url, registration_deadline, refund_policy, terms_and_conditions,
        status, is_public, requires_approval, max_tickets_per_person, max_attendees
      ]
    );

    res.status(201).json({
      message: 'Event created successfully',
      event: newEvent.rows[0]
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ 
      message: 'Server error while creating event',
      details: error.message
    });
  }
});

// Get single event
app.get('/api/events/:id', async (req, res) => {
  try {
    const eventId = req.params.id;

    // Get main event details
    const event = await pool.query(
      `SELECT e.*,
             u.email as organizer_email,
             CASE WHEN o.full_name IS NOT NULL THEN o.full_name ELSE u.email END as organizer_name,
             o.phone as organizer_phone,
             (SELECT COUNT(*) FROM eventregistrations er WHERE er.event_id = e.event_id) as registration_count,
             COALESCE((SELECT ROUND(AVG(ef.rating), 1) FROM eventfeedback ef WHERE ef.event_id = e.event_id), 0) as average_rating,
             (SELECT COUNT(*) FROM eventregistrations er WHERE er.event_id = e.event_id AND er.check_in_status = true) as checked_in_count
       FROM events e
       LEFT JOIN users u ON e.organizer_id = u.user_id
       LEFT JOIN organizers o ON e.organizer_id = o.user_id
       WHERE e.event_id = $1`,
      [eventId]
    );

    if (event.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const eventData = event.rows[0];

    // Get event speakers
    const speakers = await pool.query(
      `SELECT * FROM eventspeakers WHERE event_id = $1 ORDER BY speaker_role DESC`,
      [eventId]
    );
    eventData.speakers = speakers.rows;

    // Get feedback summary
    const feedbackSummary = await pool.query(
      `SELECT 
         COUNT(*) as total_feedback,
         ROUND(AVG(rating), 1) as average_rating,
         COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
         COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
         COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
         COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
         COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
       FROM eventfeedback
       WHERE event_id = $1`,
      [eventId]
    );
    eventData.feedback_summary = feedbackSummary.rows[0];

    // Get recent feedback (limited to 5)
    const feedback = await pool.query(
      `SELECT ef.*,
             a.full_name,
             CASE WHEN ef.is_anonymous THEN 'Anonymous' ELSE a.full_name END as display_name
       FROM eventfeedback ef
       LEFT JOIN attendees a ON ef.attendee_id = a.attendee_id
       WHERE ef.event_id = $1
       ORDER BY ef.created_at DESC
       LIMIT 5`,
      [eventId]
    );
    eventData.recent_feedback = feedback.rows;

    res.json({ event: eventData });

  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ message: 'Server error while fetching event' });
  }
});

// Update event
app.put('/api/events/:id', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    const { 
      event_name, 
      event_date, 
      venue_name, 
      venue_address, 
      description, 
      ticket_price,
      event_type, 
      category,
      tags,
      image_url,
      registration_deadline,
      refund_policy,
      terms_and_conditions,
      status,
      is_public,
      requires_approval,
      max_tickets_per_person,
      max_attendees
    } = req.body;

    // Check if user owns this event or is admin
    const eventCheck = await pool.query(
      'SELECT organizer_id FROM events WHERE event_id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (eventCheck.rows[0].organizer_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }

    // Validate event date if provided
    let eventDateTime = null;
    if (event_date) {
      eventDateTime = new Date(event_date);
      if (isNaN(eventDateTime.getTime())) {
        return res.status(400).json({ message: 'Invalid event date format' });
      }
    }

    // Build the update query dynamically based on provided fields
    const updateFields = [];
    const queryParams = [];
    let paramCounter = 1;

    // Helper to add fields only if they were provided in the request
    const addFieldIfProvided = (fieldName, value) => {
      if (value !== undefined) {
        updateFields.push(`${fieldName} = $${paramCounter++}`);
        queryParams.push(value);
      }
    };

    addFieldIfProvided('event_name', event_name);
    addFieldIfProvided('event_date', eventDateTime);
    addFieldIfProvided('venue_name', venue_name);
    addFieldIfProvided('venue_address', venue_address);
    addFieldIfProvided('description', description);
    addFieldIfProvided('ticket_price', ticket_price);
    addFieldIfProvided('event_type', event_type);
    addFieldIfProvided('category', category);
    addFieldIfProvided('tags', tags);
    addFieldIfProvided('image_url', image_url);
    addFieldIfProvided('registration_deadline', registration_deadline);
    addFieldIfProvided('refund_policy', refund_policy);
    addFieldIfProvided('terms_and_conditions', terms_and_conditions);
    addFieldIfProvided('status', status);
    addFieldIfProvided('is_public', is_public);
    addFieldIfProvided('requires_approval', requires_approval);
    addFieldIfProvided('max_tickets_per_person', max_tickets_per_person);
    addFieldIfProvided('max_attendees', max_attendees);
    addFieldIfProvided('updated_at', new Date());

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update provided' });
    }

    // Always update the updated_at timestamp
    const query = `
      UPDATE events 
      SET ${updateFields.join(', ')}
      WHERE event_id = $${paramCounter} 
      RETURNING *
    `;
    queryParams.push(eventId);

    const updatedEvent = await pool.query(query, queryParams);

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
    const { force = false } = req.query;

    // Check if user owns this event or is admin
    const eventCheck = await pool.query(
      'SELECT organizer_id FROM events WHERE event_id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (eventCheck.rows[0].organizer_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }

    // Check if event has registrations
    const registrationsCheck = await pool.query(
      'SELECT COUNT(*) FROM eventregistrations WHERE event_id = $1',
      [eventId]
    );

    const hasRegistrations = parseInt(registrationsCheck.rows[0].count) > 0;

    if (hasRegistrations && !force) {
      return res.status(409).json({ 
        message: 'Cannot delete event with registrations. Use force=true to delete anyway.',
        has_registrations: true,
        registration_count: parseInt(registrationsCheck.rows[0].count)
      });
    }

    // Start a transaction since we need to delete from multiple tables
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Delete related data if force=true
      if (force) {
        await client.query('DELETE FROM eventregistrations WHERE event_id = $1', [eventId]);
        await client.query('DELETE FROM eventfeedback WHERE event_id = $1', [eventId]);
        await client.query('DELETE FROM eventspeakers WHERE event_id = $1', [eventId]);
        await client.query('DELETE FROM attendancelogs WHERE event_id = $1', [eventId]);
      }
      
      // Finally delete the event
      await client.query('DELETE FROM events WHERE event_id = $1', [eventId]);
      
      await client.query('COMMIT');
      
      res.json({ 
        message: 'Event deleted successfully',
        force_applied: force && hasRegistrations
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Server error while deleting event' });
  }
});

// ===== EVENT REGISTRATIONS ROUTES =====

// Register for an event
app.post('/api/events/:id/register', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    const { ticket_quantity = 1, special_requirements } = req.body;
    
    // Check if the event exists
    const eventCheck = await pool.query(
      'SELECT event_id, event_name, max_attendees, ticket_price, registration_deadline, requires_approval, max_tickets_per_person FROM events WHERE event_id = $1',
      [eventId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    const event = eventCheck.rows[0];
    
    // Check if registration deadline has passed
    if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
      return res.status(400).json({ message: 'Registration deadline has passed' });
    }
    
    // Check if user is an attendee
    const attendeeCheck = await pool.query(
      'SELECT attendee_id FROM attendees WHERE user_id = $1',
      [req.user.user_id]
    );
    
    if (attendeeCheck.rows.length === 0) {
      return res.status(403).json({ 
        message: 'Only attendees can register for events',
        error: 'permission_denied',
        roles_required: ['attendee']
      });
    }
    
    const attendeeId = attendeeCheck.rows[0].attendee_id;
    
    // Check if already registered
    const alreadyRegistered = await pool.query(
      'SELECT registration_id FROM eventregistrations WHERE event_id = $1 AND attendee_id = $2',
      [eventId, attendeeId]
    );
    
    if (alreadyRegistered.rows.length > 0) {
      return res.status(409).json({ message: 'You are already registered for this event' });
    }
    
    // Check ticket quantity limit
    if (ticket_quantity > event.max_tickets_per_person) {
      return res.status(400).json({ 
        message: `Maximum ${event.max_tickets_per_person} tickets allowed per person` 
      });
    }
    
    // Check if event is full
    if (event.max_attendees) {
      const registrationsCount = await pool.query(
        'SELECT SUM(ticket_quantity) as total FROM eventregistrations WHERE event_id = $1',
        [eventId]
      );
      
      const totalRegistered = parseInt(registrationsCount.rows[0].total || 0);
      if (totalRegistered + ticket_quantity > event.max_attendees) {
        return res.status(400).json({ message: 'Event is full or has insufficient tickets remaining' });
      }
    }
    
    // Calculate total amount
    const totalAmount = ticket_quantity * event.ticket_price;
    
    // Create registration
    const registration = await pool.query(
      `INSERT INTO eventregistrations 
       (event_id, attendee_id, ticket_quantity, total_amount, payment_status, special_requirements, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        eventId, 
        attendeeId, 
        ticket_quantity, 
        totalAmount, 
        event.ticket_price > 0 ? 'pending' : 'completed', 
        special_requirements,
        event.requires_approval ? 'pending' : 'confirmed'
      ]
    );
    
    // Generate QR code for the registration
    const qrCode = `EVENT-${eventId}-REG-${registration.rows[0].registration_id}-USER-${req.user.user_id}`;
    
    await pool.query(
      'UPDATE eventregistrations SET qr_code = $1 WHERE registration_id = $2',
      [qrCode, registration.rows[0].registration_id]
    );
    
    res.status(201).json({
      message: 'Registration successful',
      registration: {
        ...registration.rows[0],
        qr_code: qrCode
      },
      event: {
        id: event.event_id,
        name: event.event_name
      },
      payment_required: event.ticket_price > 0,
      approval_required: event.requires_approval
    });
    
  } catch (error) {
    console.error('Event registration error:', error);
    res.status(500).json({ message: 'Server error during event registration' });
  }
});

// Manual attendee registration (for organizers)
app.post('/api/events/:id/manual-registration', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    const { email, full_name, phone, ticket_quantity = 1, special_requirements } = req.body;

    console.log('Manual registration request received:');
    console.log('Event ID:', eventId);
    console.log('Request body:', req.body);
    console.log('Extracted fields:', { email, full_name, phone, ticket_quantity, special_requirements });

    // Validate required fields
    if (!email || !full_name) {
      console.log('Validation failed - missing required fields:', { email: !!email, full_name: !!full_name });
      return res.status(400).json({ message: 'Email and full name are required' });
    }

    // Check if user is authorized (event organizer or admin)
    const eventCheck = await pool.query(
      `SELECT e.organizer_id, e.event_name, e.max_attendees, e.ticket_price, e.max_tickets_per_person, o.user_id as organizer_user_id 
       FROM events e
       JOIN organizers o ON e.organizer_id = o.organizer_id 
       WHERE e.event_id = $1`,
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (eventCheck.rows[0].organizer_user_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to manually register attendees for this event' });
    }

    const event = eventCheck.rows[0];

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Create or get user
      let userResult = await client.query(
        'SELECT user_id FROM users WHERE email = $1',
        [email]
      );

      let userId;
      if (userResult.rows.length === 0) {
        // Create new user with temporary password
        const tempPassword = crypto.randomBytes(8).toString('hex');
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        
        const newUserResult = await client.query(
          `INSERT INTO users 
           (email, password, role_type, is_email_verified, email_verified_at) 
           VALUES ($1, $2, 'attendee', true, NOW()) 
           RETURNING user_id`,
          [email, hashedPassword]
        );
        userId = newUserResult.rows[0].user_id;
      } else {
        userId = userResult.rows[0].user_id;
      }

      // 2. Create or update attendee
      const attendeeResult = await client.query(
        `INSERT INTO attendees (user_id, full_name, phone)
         VALUES ($1, $2, $3) 
         ON CONFLICT (user_id) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           phone = EXCLUDED.phone
         RETURNING attendee_id`,
        [userId, full_name, phone]
      );

      const attendeeId = attendeeResult.rows[0].attendee_id;

      // 3. Check if already registered
      const existingRegistration = await client.query(
        'SELECT registration_id FROM eventregistrations WHERE event_id = $1 AND attendee_id = $2',
        [eventId, attendeeId]
      );

      if (existingRegistration.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Attendee is already registered for this event' });
      }

      // 4. Check if event is full
      if (event.max_attendees) {
        const currentRegistrations = await client.query(
          'SELECT SUM(ticket_quantity) as total FROM eventregistrations WHERE event_id = $1 AND status = $2',
          [eventId, 'confirmed']
        );
        
        const currentTotal = parseInt(currentRegistrations.rows[0].total) || 0;
        if (currentTotal + ticket_quantity > event.max_attendees) {
          await client.query('ROLLBACK');
          return res.status(400).json({ 
            message: 'Event is full',
            available: event.max_attendees - currentTotal,
            requested: ticket_quantity
          });
        }
      }

      // 5. Calculate total amount
      const totalAmount = ticket_quantity * event.ticket_price;

      // 6. Create event registration
      const registration = await client.query(
        `INSERT INTO eventregistrations 
         (event_id, attendee_id, ticket_quantity, total_amount, payment_status, special_requirements, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'confirmed')
         RETURNING *`,
        [eventId, attendeeId, ticket_quantity, totalAmount, 'completed', special_requirements]
      );

      // 7. Generate QR code for the registration
      const qrCode = `EVENT-${eventId}-REG-${registration.rows[0].registration_id}-USER-${userId}`;
      
      await client.query(
        'UPDATE eventregistrations SET qr_code = $1 WHERE registration_id = $2',
        [qrCode, registration.rows[0].registration_id]
      );

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Attendee registered successfully',
        registration: {
          ...registration.rows[0],
          qr_code: qrCode,
          attendee: {
            full_name,
            email,
            phone
          }
        },
        event: {
          id: event.event_id,
          name: event.event_name
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Manual registration error:', error);
    res.status(500).json({ message: 'Error processing manual registration' });
  }
});

// Bulk manual attendee registration (for organizers)
app.post('/api/events/:id/bulk-registration', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    const { attendees } = req.body;

    // Validate input
    if (!Array.isArray(attendees) || attendees.length === 0) {
      return res.status(400).json({ message: 'Attendees array is required and cannot be empty' });
    }

    // Validate each attendee
    for (const attendee of attendees) {
      if (!attendee.email || !attendee.full_name) {
        return res.status(400).json({ message: 'Each attendee must have email and full_name' });
      }
    }

    // Check if user is authorized (event organizer or admin)
    const eventCheck = await pool.query(
      `SELECT e.organizer_id, e.event_name, e.max_attendees, e.ticket_price, o.user_id as organizer_user_id 
       FROM events e
       JOIN organizers o ON e.organizer_id = o.organizer_id 
       WHERE e.event_id = $1`,
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (eventCheck.rows[0].organizer_user_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to bulk register attendees for this event' });
    }

    const event = eventCheck.rows[0];
    const results = [];
    const errors = [];

    // Process each attendee
    for (let i = 0; i < attendees.length; i++) {
      const attendee = attendees[i];
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');

        const { email, full_name, phone, ticket_quantity = 1, special_requirements } = attendee;

        // 1. Create or get user
        let userResult = await client.query(
          'SELECT user_id FROM users WHERE email = $1',
          [email]
        );

        let userId;
        if (userResult.rows.length === 0) {
          // Create new user with temporary password
          const tempPassword = crypto.randomBytes(8).toString('hex');
          const hashedPassword = await bcrypt.hash(tempPassword, 10);
          
          const newUserResult = await client.query(
            `INSERT INTO users 
             (email, password, role_type, is_email_verified, email_verified_at) 
             VALUES ($1, $2, 'attendee', true, NOW()) 
             RETURNING user_id`,
            [email, hashedPassword]
          );
          userId = newUserResult.rows[0].user_id;
        } else {
          userId = userResult.rows[0].user_id;
        }

        // 2. Create or update attendee
        const attendeeResult = await client.query(
          `INSERT INTO attendees (user_id, full_name, phone)
           VALUES ($1, $2, $3) 
           ON CONFLICT (user_id) DO UPDATE SET
             full_name = EXCLUDED.full_name,
             phone = EXCLUDED.phone
           RETURNING attendee_id`,
          [userId, full_name, phone]
        );

        const attendeeId = attendeeResult.rows[0].attendee_id;

        // 3. Check if already registered
        const existingRegistration = await client.query(
          'SELECT registration_id FROM eventregistrations WHERE event_id = $1 AND attendee_id = $2',
          [eventId, attendeeId]
        );

        if (existingRegistration.rows.length > 0) {
          await client.query('ROLLBACK');
          errors.push({
            index: i,
            email,
            error: 'Already registered for this event'
          });
          continue;
        }

        // 4. Calculate total amount
        const totalAmount = ticket_quantity * event.ticket_price;

        // 5. Create event registration
        const registration = await client.query(
          `INSERT INTO eventregistrations 
           (event_id, attendee_id, ticket_quantity, total_amount, payment_status, special_requirements, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'confirmed')
           RETURNING *`,
          [eventId, attendeeId, ticket_quantity, totalAmount, 'completed', special_requirements]
        );

        // 6. Generate QR code for the registration
        const qrCode = `EVENT-${eventId}-REG-${registration.rows[0].registration_id}-USER-${userId}`;
        
        await client.query(
          'UPDATE eventregistrations SET qr_code = $1 WHERE registration_id = $2',
          [qrCode, registration.rows[0].registration_id]
        );

        await client.query('COMMIT');

        results.push({
          index: i,
          registration: {
            ...registration.rows[0],
            qr_code: qrCode,
            attendee: {
              full_name,
              email,
              phone
            }
          }
        });

      } catch (error) {
        await client.query('ROLLBACK');
        errors.push({
          index: i,
          email: attendee.email,
          error: error.message
        });
      } finally {
        client.release();
      }
    }

    res.status(201).json({
      message: `Bulk registration completed. ${results.length} successful, ${errors.length} failed.`,
      successful: results,
      errors: errors,
      summary: {
        total: attendees.length,
        successful: results.length,
        failed: errors.length
      }
    });

  } catch (error) {
    console.error('Bulk registration error:', error);
    res.status(500).json({ message: 'Error processing bulk registration' });
  }
});

// Get my event registrations
app.get('/api/registrations', authenticateToken, async (req, res) => {
  try {
    // Check if user is an attendee
    const attendeeCheck = await pool.query(
      'SELECT attendee_id FROM attendees WHERE user_id = $1',
      [req.user.user_id]
    );
    
    if (attendeeCheck.rows.length === 0) {
      return res.status(403).json({ 
        message: 'Only attendees can view registrations',
        error: 'permission_denied',
        roles_required: ['attendee']
      });
    }
    
    const attendeeId = attendeeCheck.rows[0].attendee_id;
    
    const registrations = await pool.query(
      `SELECT r.*, 
              e.event_name, e.event_date, e.venue_name, e.status as event_status, 
              e.image_url, e.category
       FROM eventregistrations r
       JOIN events e ON r.event_id = e.event_id
       WHERE r.attendee_id = $1
       ORDER BY e.event_date DESC`,
      [attendeeId]
    );
    
    res.json({ registrations: registrations.rows });
    
  } catch (error) {
    console.error('Get registrations error:', error);
    res.status(500).json({ message: 'Server error while fetching registrations' });
  }
});

// Organizer: Get registrations for a specific event
app.get('/api/events/:id/registrations', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    const { status, sort = 'registration_date', order = 'desc', limit = 50, offset = 0 } = req.query;
    
    // Check if user is an organizer and owns this event
    const eventCheck = await pool.query(
      'SELECT organizer_id FROM events WHERE event_id = $1',
      [eventId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (eventCheck.rows[0].organizer_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view registrations for this event' });
    }
    
    // Build the query with optional filters
    let query = `
      SELECT r.*, 
             a.full_name, a.email, a.phone,
             u.email as user_email
      FROM eventregistrations r
      JOIN attendees a ON r.attendee_id = a.attendee_id
      JOIN users u ON a.user_id = u.user_id
      WHERE r.event_id = $1
    `;
    
    const queryParams = [eventId];
    let paramIndex = 2;
    
    if (status) {
      query += ` AND r.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    // Validate sort field (prevent SQL injection)
    const allowedSortFields = ['registration_date', 'full_name', 'status', 'ticket_quantity', 'total_amount'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'registration_date';
    
    // Validate order direction
    const orderDir = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY ${sortField} ${orderDir} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);
    
    const registrations = await pool.query(query, queryParams);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM eventregistrations r
      WHERE r.event_id = $1
      ${status ? ' AND r.status = $2' : ''}
    `;
    
    const countParams = [eventId];
    if (status) countParams.push(status);
    
    const totalCount = await pool.query(countQuery, countParams);
    
    // Get registration summary
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_registrations,
        SUM(ticket_quantity) as total_tickets,
        SUM(total_amount) as total_revenue,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_count,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
        COUNT(CASE WHEN payment_status = 'completed' THEN 1 END) as paid_count,
        COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as unpaid_count
      FROM eventregistrations
      WHERE event_id = $1
    `;
    
    const summary = await pool.query(summaryQuery, [eventId]);
    
    res.json({
      registrations: registrations.rows,
      summary: summary.rows[0],
      pagination: {
        total: parseInt(totalCount.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: parseInt(offset) + parseInt(limit) < parseInt(totalCount.rows[0].total)
      }
    });
    
  } catch (error) {
    console.error('Get event registrations error:', error);
    res.status(500).json({ message: 'Server error while fetching event registrations' });
  }
});

// Update registration status (confirm, reject, cancel)
app.put('/api/events/:eventId/registrations/:regId', authenticateToken, async (req, res) => {
  try {
    const { eventId, regId } = req.params;
    const { status, rejection_reason } = req.body;
    
    if (!['confirmed', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    // Check if user is an organizer and owns this event
    const eventCheck = await pool.query(
      'SELECT organizer_id FROM events WHERE event_id = $1',
      [eventId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if registration exists for this event
    const registrationCheck = await pool.query(
      'SELECT * FROM eventregistrations WHERE registration_id = $1 AND event_id = $2',
      [regId, eventId]
    );
    
    if (registrationCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Registration not found' });
    }
    
    // Check authorization - organizer or admin can update any registration, attendee can only cancel their own
    const isOrganizer = eventCheck.rows[0].organizer_id === req.user.user_id;
    const isAdmin = req.user.role === 'admin';
    const isAttendee = req.user.user_id === registrationCheck.rows[0].attendee_id;
    
    if ((!isOrganizer && !isAdmin) && !(isAttendee && status === 'cancelled')) {
      return res.status(403).json({ message: 'Not authorized to update this registration' });
    }
    
    // Update registration status
    const updatedRegistration = await pool.query(
      `UPDATE eventregistrations 
       SET status = $1, 
           ${status === 'rejected' ? 'rejection_reason = $3,' : ''}
           updated_at = NOW()
       WHERE registration_id = $2
       RETURNING *`,
      status === 'rejected' 
        ? [status, regId, rejection_reason || 'Registration rejected by organizer'] 
        : [status, regId]
    );
    
    res.json({
      message: `Registration ${status} successfully`,
      registration: updatedRegistration.rows[0]
    });
    
  } catch (error) {
    console.error('Update registration status error:', error);
    res.status(500).json({ message: 'Server error while updating registration status' });
  }
});

// ===== EVENT FEEDBACK ROUTES =====

// Submit feedback for an event
app.post('/api/events/:id/feedback', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    const { rating, feedback_text, is_anonymous = false } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    
    // Check if the event exists
    const eventCheck = await pool.query(
      'SELECT event_id FROM events WHERE event_id = $1',
      [eventId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if user is an attendee
    const attendeeCheck = await pool.query(
      'SELECT attendee_id FROM attendees WHERE user_id = $1',
      [req.user.user_id]
    );
    
    if (attendeeCheck.rows.length === 0) {
      return res.status(403).json({ 
        message: 'Only attendees can submit feedback',
        error: 'permission_denied',
        roles_required: ['attendee']
      });
    }
    
    const attendeeId = attendeeCheck.rows[0].attendee_id;
    
    // Check if the attendee registered for the event
    const registrationCheck = await pool.query(
      'SELECT registration_id FROM eventregistrations WHERE event_id = $1 AND attendee_id = $2',
      [eventId, attendeeId]
    );
    
    if (registrationCheck.rows.length === 0) {
      return res.status(403).json({ message: 'You must be registered for this event to submit feedback' });
    }
    
    // Check if already submitted feedback
    const existingFeedback = await pool.query(
      'SELECT feedback_id FROM eventfeedback WHERE event_id = $1 AND attendee_id = $2',
      [eventId, attendeeId]
    );
    
    let feedbackId;
    
    if (existingFeedback.rows.length > 0) {
      // Update existing feedback
      const updatedFeedback = await pool.query(
        `UPDATE eventfeedback 
         SET rating = $1, feedback_text = $2, is_anonymous = $3, updated_at = NOW()
         WHERE event_id = $4 AND attendee_id = $5
         RETURNING *`,
        [rating, feedback_text, is_anonymous, eventId, attendeeId]
      );
      
      feedbackId = updatedFeedback.rows[0].feedback_id;
      
      res.json({
        message: 'Feedback updated successfully',
        feedback: updatedFeedback.rows[0]
      });
    } else {
      // Create new feedback
      const newFeedback = await pool.query(
        `INSERT INTO eventfeedback 
         (event_id, attendee_id, rating, feedback_text, is_anonymous)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [eventId, attendeeId, rating, feedback_text, is_anonymous]
      );
      
      feedbackId = newFeedback.rows[0].feedback_id;
      
      res.status(201).json({
        message: 'Feedback submitted successfully',
        feedback: newFeedback.rows[0]
      });
    }
    
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ message: 'Server error while submitting feedback' });
  }
});

// Get feedback for an event
app.get('/api/events/:id/feedback', async (req, res) => {
  try {
    const eventId = req.params.id;
    const { limit = 10, offset = 0 } = req.query;
    
    // Check if the event exists
    const eventCheck = await pool.query(
      'SELECT event_id FROM events WHERE event_id = $1',
      [eventId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Get feedback summary
    const feedbackSummary = await pool.query(
      `SELECT 
         COUNT(*) as total_feedback,
         ROUND(AVG(rating), 1) as average_rating,
         COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
         COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
         COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
         COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
         COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
       FROM eventfeedback
       WHERE event_id = $1`,
      [eventId]
    );
    
    // Get feedback list with attendee names
    const feedback = await pool.query(
      `SELECT ef.*,
             CASE WHEN ef.is_anonymous THEN 'Anonymous' 
                  ELSE a.full_name 
             END as attendee_name
       FROM eventfeedback ef
       LEFT JOIN attendees a ON ef.attendee_id = a.attendee_id
       WHERE ef.event_id = $1
       ORDER BY ef.created_at DESC
       LIMIT $2 OFFSET $3`,
      [eventId, limit, offset]
    );
    
    // Get total count for pagination
    const totalCount = await pool.query(
      'SELECT COUNT(*) as total FROM eventfeedback WHERE event_id = $1',
      [eventId]
    );
    
    res.json({
      summary: feedbackSummary.rows[0],
      feedback: feedback.rows,
      pagination: {
        total: parseInt(totalCount.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: parseInt(offset) + parseInt(limit) < parseInt(totalCount.rows[0].total)
      }
    });
    
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ message: 'Server error while fetching feedback' });
  }
});

// ===== EVENT CATEGORIES ROUTES =====

// Get all event categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await pool.query(
      'SELECT * FROM eventcategories ORDER BY category_name'
    );
    
    res.json({ categories: categories.rows });
    
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error while fetching categories' });
  }
});

// ===== EVENT SPEAKERS ROUTES =====

// Add speaker to event
app.post('/api/events/:id/speakers', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    const { 
      speaker_name, 
      bio, 
      profile_image_url, 
      organization, 
      job_title, 
      presentation_title,
      presentation_description,
      presentation_start_time,
      presentation_end_time,
      speaker_order = 0
    } = req.body;
    
    // Validate required fields
    if (!speaker_name) {
      return res.status(400).json({ message: 'Speaker name is required' });
    }
    
    // Check if the event exists and user is authorized
    const eventCheck = await pool.query(
      'SELECT organizer_id FROM events WHERE event_id = $1',
      [eventId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (eventCheck.rows[0].organizer_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to add speakers to this event' });
    }
    
    // Add speaker
    const newSpeaker = await pool.query(
      `INSERT INTO eventspeakers 
       (event_id, speaker_name, bio, profile_image_url, organization, job_title, 
        presentation_title, presentation_description, presentation_start_time, 
        presentation_end_time, speaker_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        eventId, speaker_name, bio, profile_image_url, organization, job_title,
        presentation_title, presentation_description, presentation_start_time,
        presentation_end_time, speaker_order
      ]
    );
    
    res.status(201).json({
      message: 'Speaker added successfully',
      speaker: newSpeaker.rows[0]
    });
    
  } catch (error) {
    console.error('Add speaker error:', error);
    res.status(500).json({ message: 'Server error while adding speaker' });
  }
});

// Update speaker
app.put('/api/events/:eventId/speakers/:speakerId', authenticateToken, async (req, res) => {
  try {
    const { eventId, speakerId } = req.params;
    const { 
      speaker_name, 
      bio, 
      profile_image_url, 
      organization, 
      job_title, 
      presentation_title,
      presentation_description,
      presentation_start_time,
      presentation_end_time,
      speaker_order
    } = req.body;
    
    // Check if the event exists and user is authorized
    const eventCheck = await pool.query(
      'SELECT organizer_id FROM events WHERE event_id = $1',
      [eventId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (eventCheck.rows[0].organizer_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update speakers for this event' });
    }
    
    // Check if speaker exists for this event
    const speakerCheck = await pool.query(
      'SELECT speaker_id FROM eventspeakers WHERE speaker_id = $1 AND event_id = $2',
      [speakerId, eventId]
    );
    
    if (speakerCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Speaker not found for this event' });
    }
    
    // Build dynamic update query with only provided fields
    let updateFields = [];
    let queryParams = [speakerId];
    let paramIndex = 2;
    
    if (speaker_name !== undefined) {
      updateFields.push(`speaker_name = $${paramIndex++}`);
      queryParams.push(speaker_name);
    }
    
    if (bio !== undefined) {
      updateFields.push(`bio = $${paramIndex++}`);
      queryParams.push(bio);
    }
    
    if (profile_image_url !== undefined) {
      updateFields.push(`profile_image_url = $${paramIndex++}`);
      queryParams.push(profile_image_url);
    }
    
    if (organization !== undefined) {
      updateFields.push(`organization = $${paramIndex++}`);
      queryParams.push(organization);
    }
    
    if (job_title !== undefined) {
      updateFields.push(`job_title = $${paramIndex++}`);
      queryParams.push(job_title);
    }
    
    if (presentation_title !== undefined) {
      updateFields.push(`presentation_title = $${paramIndex++}`);
      queryParams.push(presentation_title);
    }
    
    if (presentation_description !== undefined) {
      updateFields.push(`presentation_description = $${paramIndex++}`);
      queryParams.push(presentation_description);
    }
    
    if (presentation_start_time !== undefined) {
      updateFields.push(`presentation_start_time = $${paramIndex++}`);
      queryParams.push(presentation_start_time);
    }
    
    if (presentation_end_time !== undefined) {
      updateFields.push(`presentation_end_time = $${paramIndex++}`);
      queryParams.push(presentation_end_time);
    }
    
    if (speaker_order !== undefined) {
      updateFields.push(`speaker_order = $${paramIndex++}`);
      queryParams.push(speaker_order);
    }
    
    // Update speaker
    updateFields.push(`updated_at = NOW()`);
    
    const query = `
      UPDATE eventspeakers
      SET ${updateFields.join(', ')}
      WHERE speaker_id = $1
      RETURNING *
    `;
    
    const updatedSpeaker = await pool.query(query, queryParams);
    
    res.json({
      message: 'Speaker updated successfully',
      speaker: updatedSpeaker.rows[0]
    });
    
  } catch (error) {
    console.error('Update speaker error:', error);
    res.status(500).json({ message: 'Server error while updating speaker' });
  }
});

// Get all speakers for an event
app.get('/api/events/:id/speakers', async (req, res) => {
  try {
    const eventId = req.params.id;
    
    // Check if the event exists
    const eventCheck = await pool.query(
      'SELECT event_id FROM events WHERE event_id = $1',
      [eventId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Get speakers for this event
    const speakers = await pool.query(
      `SELECT * FROM eventspeakers 
       WHERE event_id = $1
       ORDER BY speaker_order, speaker_name`,
      [eventId]
    );
    
    res.json({ speakers: speakers.rows });
    
  } catch (error) {
    console.error('Get speakers error:', error);
    res.status(500).json({ message: 'Server error while fetching speakers' });
  }
});

// Delete a speaker
app.delete('/api/events/:eventId/speakers/:speakerId', authenticateToken, async (req, res) => {
  try {
    const { eventId, speakerId } = req.params;
    
    // Check if the event exists and user is authorized
    const eventCheck = await pool.query(
      'SELECT organizer_id FROM events WHERE event_id = $1',
      [eventId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (eventCheck.rows[0].organizer_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete speakers for this event' });
    }
    
    // Check if speaker exists for this event
    const speakerCheck = await pool.query(
      'SELECT speaker_id FROM eventspeakers WHERE speaker_id = $1 AND event_id = $2',
      [speakerId, eventId]
    );
    
    if (speakerCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Speaker not found for this event' });
    }
    
    // Delete speaker
    await pool.query(
      'DELETE FROM eventspeakers WHERE speaker_id = $1',
      [speakerId]
    );
    
    res.json({ message: 'Speaker deleted successfully' });
    
  } catch (error) {
    console.error('Delete speaker error:', error);
    res.status(500).json({ message: 'Server error while deleting speaker' });
  }
});

// ===== VENDOR ROUTES =====

// Add vendor to event
app.post('/api/events/:id/vendors', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    const { 
      vendor_name, 
      contact_name,
      contact_email,
      contact_phone,
      booth_number,
      booth_size,
      products_services,
      logo_url,
      website_url,
      special_requirements,
      sponsor_level
    } = req.body;
    
    // Validate required fields
    if (!vendor_name) {
      return res.status(400).json({ message: 'Vendor name is required' });
    }
    
    // Check if the event exists and user is authorized
    const eventCheck = await pool.query(
      'SELECT organizer_id FROM events WHERE event_id = $1',
      [eventId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (eventCheck.rows[0].organizer_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to add vendors to this event' });
    }
    
    // Add vendor
    const newVendor = await pool.query(
      `INSERT INTO eventvendors 
       (event_id, vendor_name, contact_name, contact_email, contact_phone, 
        booth_number, booth_size, products_services, logo_url, website_url, 
        special_requirements, sponsor_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        eventId, vendor_name, contact_name, contact_email, contact_phone, 
        booth_number, booth_size, products_services, logo_url, website_url, 
        special_requirements, sponsor_level
      ]
    );
    
    res.status(201).json({
      message: 'Vendor added successfully',
      vendor: newVendor.rows[0]
    });
    
  } catch (error) {
    console.error('Add vendor error:', error);
    res.status(500).json({ message: 'Server error while adding vendor' });
  }
});

// Get all vendors for an event
app.get('/api/events/:id/vendors', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    
    // Check if the event exists
    const eventCheck = await pool.query(
      'SELECT event_id, organizer_id FROM events WHERE event_id = $1',
      [eventId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Only organizers or admins can see all vendor details
    const isOrganizer = eventCheck.rows[0].organizer_id === req.user.user_id;
    const isAdmin = req.user.role === 'admin';
    
    let query;
    if (isOrganizer || isAdmin) {
      // Full vendor details for organizer/admin
      query = `
        SELECT * FROM eventvendors 
        WHERE event_id = $1
        ORDER BY vendor_name
      `;
    } else {
      // Limited vendor details for attendees/public
      query = `
        SELECT 
          vendor_id, event_id, vendor_name, booth_number, 
          products_services, logo_url, website_url, sponsor_level
        FROM eventvendors 
        WHERE event_id = $1
        ORDER BY vendor_name
      `;
    }
    
    const vendors = await pool.query(query, [eventId]);
    
    res.json({ vendors: vendors.rows });
    
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ message: 'Server error while fetching vendors' });
  }
});

// Update a vendor
app.put('/api/events/:eventId/vendors/:vendorId', authenticateToken, async (req, res) => {
  try {
    const { eventId, vendorId } = req.params;
    const { 
      vendor_name, 
      contact_name,
      contact_email,
      contact_phone,
      booth_number,
      booth_size,
      products_services,
      logo_url,
      website_url,
      special_requirements,
      sponsor_level
    } = req.body;
    
    // Check if the event exists and user is authorized
    const eventCheck = await pool.query(
      'SELECT organizer_id FROM events WHERE event_id = $1',
      [eventId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (eventCheck.rows[0].organizer_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update vendors for this event' });
    }
    
    // Check if vendor exists for this event
    const vendorCheck = await pool.query(
      'SELECT vendor_id FROM eventvendors WHERE vendor_id = $1 AND event_id = $2',
      [vendorId, eventId]
    );
    
    if (vendorCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Vendor not found for this event' });
    }
    
    // Build dynamic update query with only provided fields
    let updateFields = [];
    let queryParams = [vendorId];
    let paramIndex = 2;
    
    if (vendor_name !== undefined) {
      updateFields.push(`vendor_name = $${paramIndex++}`);
      queryParams.push(vendor_name);
    }
    
    if (contact_name !== undefined) {
      updateFields.push(`contact_name = $${paramIndex++}`);
      queryParams.push(contact_name);
    }
    
    if (contact_email !== undefined) {
      updateFields.push(`contact_email = $${paramIndex++}`);
      queryParams.push(contact_email);
    }
    
    if (contact_phone !== undefined) {
      updateFields.push(`contact_phone = $${paramIndex++}`);
      queryParams.push(contact_phone);
    }
    
    if (booth_number !== undefined) {
      updateFields.push(`booth_number = $${paramIndex++}`);
      queryParams.push(booth_number);
    }
    
    if (booth_size !== undefined) {
      updateFields.push(`booth_size = $${paramIndex++}`);
      queryParams.push(booth_size);
    }
    
    if (products_services !== undefined) {
      updateFields.push(`products_services = $${paramIndex++}`);
      queryParams.push(products_services);
    }
    
    if (logo_url !== undefined) {
      updateFields.push(`logo_url = $${paramIndex++}`);
      queryParams.push(logo_url);
    }
    
    if (website_url !== undefined) {
      updateFields.push(`website_url = $${paramIndex++}`);
      queryParams.push(website_url);
    }
    
    if (special_requirements !== undefined) {
      updateFields.push(`special_requirements = $${paramIndex++}`);
      queryParams.push(special_requirements);
    }
    
    if (sponsor_level !== undefined) {
      updateFields.push(`sponsor_level = $${paramIndex++}`);
      queryParams.push(sponsor_level);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields provided to update' });
    }
    
    updateFields.push(`updated_at = NOW()`);
    
    const query = `
      UPDATE eventvendors
      SET ${updateFields.join(', ')}
      WHERE vendor_id = $1
      RETURNING *
    `;
    
    const updatedVendor = await pool.query(query, queryParams);
    
    res.json({
      message: 'Vendor updated successfully',
      vendor: updatedVendor.rows[0]
    });
    
  } catch (error) {
    console.error('Update vendor error:', error);
    res.status(500).json({ message: 'Server error while updating vendor' });
  }
});

// Delete a vendor
app.delete('/api/events/:eventId/vendors/:vendorId', authenticateToken, async (req, res) => {
  try {
    const { eventId, vendorId } = req.params;
    
    // Check if the event exists and user is authorized
    const eventCheck = await pool.query(
      'SELECT organizer_id FROM events WHERE event_id = $1',
      [eventId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (eventCheck.rows[0].organizer_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete vendors for this event' });
    }
    
    // Check if vendor exists for this event
    const vendorCheck = await pool.query(
      'SELECT vendor_id FROM eventvendors WHERE vendor_id = $1 AND event_id = $2',
      [vendorId, eventId]
    );
    
    if (vendorCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Vendor not found for this event' });
    }
    
    // Delete vendor
    await pool.query(
      'DELETE FROM eventvendors WHERE vendor_id = $1',
      [vendorId]
    );
    
    res.json({ message: 'Vendor deleted successfully' });
    
  } catch (error) {
    console.error('Delete vendor error:', error);
    res.status(500).json({ message: 'Server error while deleting vendor' });
  }
});

// ===== ATTENDANCE ROUTES =====

// Get event registrations for attendance tracking
app.get('/api/events/:eventId/attendees', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const { status = 'all', search = '' } = req.query;
    
    // Check if user is authorized (event organizer or admin)
    const eventCheck = await pool.query(
      `SELECT e.organizer_id, o.user_id as organizer_user_id 
       FROM events e
       JOIN organizers o ON e.organizer_id = o.organizer_id 
       WHERE e.event_id = $1`,
      [eventId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (eventCheck.rows[0].organizer_user_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view attendees for this event' });
    }
    
    let query = `
      SELECT 
        r.registration_id,
        r.event_id,
        r.attendee_id,
        r.registration_date,
        r.ticket_quantity,
        r.total_amount,
        r.payment_status,
        r.check_in_status,
        r.check_in_time,
        r.qr_code,
        r.status as registration_status,
        a.full_name,
        u.email,
        a.phone,
        tt.type_name as ticket_type,
        al.check_in_time as attendance_check_in_time,
        al.check_out_time as attendance_check_out_time,
        al.scan_method
      FROM eventregistrations r
      JOIN attendees a ON r.attendee_id = a.attendee_id
      JOIN users u ON a.user_id = u.user_id
      LEFT JOIN tickettypes tt ON r.ticket_type_id = tt.ticket_type_id
      LEFT JOIN attendancelogs al ON r.registration_id = al.registration_id
      WHERE r.event_id = $1
    `;
    
    const queryParams = [eventId];
    
    if (status !== 'all') {
      switch (status) {
        case 'checked-in':
          query += ' AND al.check_in_time IS NOT NULL AND al.check_out_time IS NULL';
          break;
        case 'checked-out':
          query += ' AND al.check_out_time IS NOT NULL';
          break;
        case 'registered':
          query += ' AND al.check_in_time IS NULL';
          break;
        case 'no-show':
          query += ' AND al.check_in_time IS NULL AND r.status = $2';
          queryParams.push('confirmed');
          break;
      }
    }
    
    if (search) {
      query += ` AND (a.full_name ILIKE $${queryParams.length + 1} OR u.email ILIKE $${queryParams.length + 1} OR r.qr_code ILIKE $${queryParams.length + 1})`;
      queryParams.push(`%${search}%`);
    }
    
    query += ' ORDER BY r.registration_date DESC';
    
    const result = await pool.query(query, queryParams);
    
    const attendees = result.rows.map(row => ({
      id: row.registration_id,
      registrationId: row.registration_id,
      attendeeId: row.attendee_id,
      name: row.full_name,
      email: row.email,
      phone: row.phone,
      ticketType: row.ticket_type || 'Standard',
      qrCode: row.qr_code,
      registrationDate: row.registration_date,
      ticketQuantity: row.ticket_quantity,
      totalAmount: row.total_amount,
      paymentStatus: row.payment_status,
      registrationStatus: row.registration_status,
      checkInStatus: row.check_in_status,
      checkInTime: row.attendance_check_in_time || row.check_in_time,
      checkOutTime: row.attendance_check_out_time,
      scanMethod: row.scan_method,
      status: row.attendance_check_in_time 
        ? (row.attendance_check_out_time ? 'checked-out' : 'checked-in')
        : 'registered',
      eventId: parseInt(eventId)
    }));
    
    res.json({
      attendees,
      total: attendees.length
    });
    
  } catch (error) {
    console.error('Get attendees error:', error);
    res.status(500).json({ message: 'Server error while fetching attendees' });
  }
});

// Get attendance statistics for an event
app.get('/api/events/:eventId/attendance/stats', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    
    // Check if user is authorized (event organizer or admin)
    const eventCheck = await pool.query(
      `SELECT e.organizer_id, e.event_name, o.user_id as organizer_user_id 
       FROM events e
       JOIN organizers o ON e.organizer_id = o.organizer_id 
       WHERE e.event_id = $1`,
      [eventId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (eventCheck.rows[0].organizer_user_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view attendance stats for this event' });
    }
    
    // Get comprehensive stats
    const stats = await pool.query(`
      SELECT 
        COUNT(r.registration_id) as total_registered,
        COUNT(al.check_in_time) as total_checked_in,
        COUNT(CASE WHEN al.check_in_time IS NOT NULL AND al.check_out_time IS NOT NULL THEN 1 END) as total_checked_out,
        COUNT(CASE WHEN al.check_in_time IS NULL AND r.status = 'confirmed' THEN 1 END) as total_no_show,
        ROUND(
          CASE 
            WHEN COUNT(r.registration_id) > 0 
            THEN (COUNT(al.check_in_time) * 100.0 / COUNT(r.registration_id)) 
            ELSE 0 
          END, 1
        ) as attendance_rate
      FROM eventregistrations r
      LEFT JOIN attendancelogs al ON r.registration_id = al.registration_id
      WHERE r.event_id = $1 AND r.status = 'confirmed'
    `, [eventId]);
    
    const eventStats = stats.rows[0];
    
    res.json({
      eventId: parseInt(eventId),
      eventName: eventCheck.rows[0].event_name,
      total: parseInt(eventStats.total_registered),
      checkedIn: parseInt(eventStats.total_checked_in),
      checkedOut: parseInt(eventStats.total_checked_out),
      registered: parseInt(eventStats.total_registered) - parseInt(eventStats.total_checked_in),
      noShow: parseInt(eventStats.total_no_show),
      attendanceRate: parseFloat(eventStats.attendance_rate)
    });
    
  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({ message: 'Server error while fetching attendance stats' });
  }
});

// Get scan history for an event
app.get('/api/events/:eventId/attendance/history', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const { limit = 50, offset = 0 } = req.query;
    
    // Check if user is authorized (event organizer or admin)
    const eventCheck = await pool.query(
      `SELECT e.organizer_id, e.event_name, o.user_id as organizer_user_id 
       FROM events e
       JOIN organizers o ON e.organizer_id = o.organizer_id 
       WHERE e.event_id = $1`,
      [eventId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (eventCheck.rows[0].organizer_user_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view scan history for this event' });
    }
    
    const history = await pool.query(`
      SELECT 
        al.attendance_id,
        al.check_in_time as scan_time,
        al.scan_method,
        a.full_name as attendee_name,
        r.qr_code,
        tt.type_name as ticket_type,
        scanned_by_user.email as scanned_by_email,
        'success' as status
      FROM attendancelogs al
      JOIN eventregistrations r ON al.registration_id = r.registration_id
      JOIN attendees a ON r.attendee_id = a.attendee_id
      LEFT JOIN tickettypes tt ON r.ticket_type_id = tt.ticket_type_id
      LEFT JOIN users scanned_by_user ON al.scanned_by = scanned_by_user.user_id
      WHERE al.event_id = $1
      ORDER BY al.check_in_time DESC
      LIMIT $2 OFFSET $3
    `, [eventId, limit, offset]);
    
    const scanHistory = history.rows.map((row, index) => ({
      id: row.attendance_id,
      qrCode: row.qr_code,
      attendeeName: row.attendee_name,
      eventName: eventCheck.rows[0].event_name,
      scanTime: row.scan_time,
      status: row.status,
      ticketType: row.ticket_type || 'Standard',
      scanMethod: row.scan_method,
      scannedBy: row.scanned_by_email
    }));
    
    res.json({
      history: scanHistory,
      total: scanHistory.length
    });
    
  } catch (error) {
    console.error('Get scan history error:', error);
    res.status(500).json({ message: 'Server error while fetching scan history' });
  }
});

// Record attendance using QR code
// Record attendance using QR code scan
app.post('/api/events/:eventId/attendance/scan', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const { qr_code } = req.body;
    
    if (!qr_code) {
      return res.status(400).json({ 
        message: 'QR code is required',
        status: 'error' 
      });
    }
    
    // Check if user is authorized (event organizer or admin)
    const eventCheck = await pool.query(
      `SELECT e.organizer_id, e.event_name, o.user_id as organizer_user_id 
       FROM events e
       JOIN organizers o ON e.organizer_id = o.organizer_id 
       WHERE e.event_id = $1`,
      [eventId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ 
        message: 'Event not found',
        status: 'error' 
      });
    }
    
    if (eventCheck.rows[0].organizer_user_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to scan attendance for this event',
        status: 'error' 
      });
    }
    
    // Find registration by QR code
    const registrationCheck = await pool.query(
      `SELECT r.*, a.full_name, u.email, a.phone, tt.type_name as ticket_type
       FROM eventregistrations r 
       JOIN attendees a ON r.attendee_id = a.attendee_id 
       JOIN users u ON a.user_id = u.user_id
       LEFT JOIN tickettypes tt ON r.ticket_type_id = tt.ticket_type_id
       WHERE r.qr_code = $1 AND r.event_id = $2`,
      [qr_code, eventId]
    );
    
    if (registrationCheck.rows.length === 0) {
      return res.status(404).json({ 
        message: 'Invalid QR code or attendee not registered for this event',
        status: 'invalid',
        qrCode: qr_code
      });
    }
    
    const registration = registrationCheck.rows[0];
    
    if (registration.status !== 'confirmed') {
      return res.status(400).json({ 
        message: `Registration is ${registration.status}, cannot check in`,
        status: 'invalid'
      });
    }
    
    // Check if attendance already recorded
    const attendanceCheck = await pool.query(
      'SELECT * FROM attendancelogs WHERE registration_id = $1 AND event_id = $2',
      [registration.registration_id, eventId]
    );
    
    if (attendanceCheck.rows.length > 0) {
      const existingAttendance = attendanceCheck.rows[0];
      return res.status(409).json({ 
        message: `${registration.full_name} is already checked in`,
        status: 'duplicate',
        attendee: {
          name: registration.full_name,
          email: registration.email,
          phone: registration.phone,
          ticketType: registration.ticket_type || 'Standard'
        },
        checkInTime: existingAttendance.check_in_time
      });
    }
    
    // Record attendance
    const attendance = await pool.query(
      `INSERT INTO attendancelogs 
       (event_id, registration_id, check_in_time, scan_method, scanned_by, created_at, updated_at)
       VALUES ($1, $2, NOW(), 'qr_code', $3, NOW(), NOW())
       RETURNING *`,
      [eventId, registration.registration_id, req.user.user_id]
    );
    
    // Update registration check_in status
    await pool.query(
      'UPDATE eventregistrations SET check_in_status = true, check_in_time = NOW() WHERE registration_id = $1',
      [registration.registration_id]
    );
    
    res.status(201).json({
      message: `${registration.full_name} successfully checked in!`,
      status: 'success',
      attendee: {
        name: registration.full_name,
        email: registration.email,
        phone: registration.phone,
        ticketType: registration.ticket_type || 'Standard',
        checkInTime: attendance.rows[0].check_in_time
      },
      attendance: attendance.rows[0]
    });
    
  } catch (error) {
    console.error('QR scan attendance error:', error);
    res.status(500).json({ 
      message: 'Server error while processing QR scan',
      status: 'error' 
    });
  }
});

// Manual attendance check-in
app.post('/api/events/:eventId/attendance/manual', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const { registration_id } = req.body;
    
    if (!registration_id) {
      return res.status(400).json({ message: 'Registration ID is required' });
    }
    
    // Check if user is authorized (event organizer or admin)
    const eventCheck = await pool.query(
      `SELECT e.organizer_id, o.user_id as organizer_user_id 
       FROM events e
       JOIN organizers o ON e.organizer_id = o.organizer_id 
       WHERE e.event_id = $1`,
      [eventId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (eventCheck.rows[0].organizer_user_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to record attendance for this event' });
    }
    
    // Find registration
    const registrationCheck = await pool.query(
      `SELECT r.*, a.full_name, u.email, a.phone, tt.type_name as ticket_type
       FROM eventregistrations r 
       JOIN attendees a ON r.attendee_id = a.attendee_id 
       JOIN users u ON a.user_id = u.user_id
       LEFT JOIN tickettypes tt ON r.ticket_type_id = tt.ticket_type_id
       WHERE r.registration_id = $1 AND r.event_id = $2`,
      [registration_id, eventId]
    );
    
    if (registrationCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Registration not found' });
    }
    
    const registration = registrationCheck.rows[0];
    
    if (registration.status !== 'confirmed') {
      return res.status(400).json({ 
        message: 'Registration is not confirmed', 
        status: registration.status 
      });
    }
    
    // Check if attendance already recorded
    const attendanceCheck = await pool.query(
      'SELECT * FROM attendancelogs WHERE registration_id = $1 AND event_id = $2',
      [registration.registration_id, eventId]
    );
    
    if (attendanceCheck.rows.length > 0) {
      return res.status(409).json({ 
        message: 'Attendance already recorded',
        attendance: attendanceCheck.rows[0],
        attendee: {
          name: registration.full_name,
          email: registration.email,
          phone: registration.phone
        }
      });
    }
    
    // Record attendance
    const attendance = await pool.query(
      `INSERT INTO attendancelogs 
       (event_id, registration_id, check_in_time, scan_method, scanned_by, created_at, updated_at)
       VALUES ($1, $2, NOW(), 'manual', $3, NOW(), NOW())
       RETURNING *`,
      [eventId, registration.registration_id, req.user.user_id]
    );
    
    // Update registration check_in status
    await pool.query(
      'UPDATE eventregistrations SET check_in_status = true, check_in_time = NOW() WHERE registration_id = $1',
      [registration.registration_id]
    );
    
    res.status(201).json({
      message: 'Attendance recorded successfully',
      attendance: attendance.rows[0],
      attendee: {
        name: registration.full_name,
        email: registration.email,
        phone: registration.phone,
        ticketType: registration.ticket_type || 'Standard'
      }
    });
    
  } catch (error) {
    console.error('Record manual attendance error:', error);
    res.status(500).json({ message: 'Server error while recording attendance' });
  }
});

// Manual attendance check-out / undo check-in
app.post('/api/events/:eventId/attendance/checkout', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const { registration_id } = req.body;
    
    if (!registration_id) {
      return res.status(400).json({ message: 'Registration ID is required' });
    }
    
    // Check if user is authorized (event organizer or admin)
    const eventCheck = await pool.query(
      `SELECT e.organizer_id, o.user_id as organizer_user_id 
       FROM events e
       JOIN organizers o ON e.organizer_id = o.organizer_id 
       WHERE e.event_id = $1`,
      [eventId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (eventCheck.rows[0].organizer_user_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to modify attendance for this event' });
    }
    
    // Check if attendance exists
    const attendanceCheck = await pool.query(
      'SELECT * FROM attendancelogs WHERE registration_id = $1 AND event_id = $2',
      [registration_id, eventId]
    );
    
    if (attendanceCheck.rows.length === 0) {
      return res.status(404).json({ message: 'No attendance record found' });
    }
    
    // Delete attendance record (undo check-in)
    await pool.query(
      'DELETE FROM attendancelogs WHERE registration_id = $1 AND event_id = $2',
      [registration_id, eventId]
    );
    
    // Update registration check_in status
    await pool.query(
      'UPDATE eventregistrations SET check_in_status = false, check_in_time = NULL WHERE registration_id = $1',
      [registration_id]
    );
    
    res.json({
      message: 'Check-in undone successfully'
    });
    
  } catch (error) {
    console.error('Undo check-in error:', error);
    res.status(500).json({ message: 'Server error while undoing check-in' });
  }
});

// Get attendance for an event
app.get('/api/events/:eventId/attendance', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const { sort = 'check_in_time', order = 'desc', limit = 50, offset = 0 } = req.query;
    
    // Check if user is authorized (event organizer or admin)
    const eventCheck = await pool.query(
      `SELECT e.organizer_id, o.user_id as organizer_user_id 
       FROM events e
       JOIN organizers o ON e.organizer_id = o.organizer_id 
       WHERE e.event_id = $1`,
      [eventId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (eventCheck.rows[0].organizer_user_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view attendance for this event' });
    }
    
    // Validate sort field (prevent SQL injection)
    const allowedSortFields = ['check_in_time', 'full_name'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'check_in_time';
    
    // Validate order direction
    const orderDir = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    
    // Get attendance records
    const attendance = await pool.query(
      `SELECT al.*, 
              a.full_name, a.email, a.phone,
              u.email as recorded_by_email,
              r.ticket_quantity
       FROM attendancelogs al
       JOIN eventregistrations r ON al.registration_id = r.registration_id
       JOIN attendees a ON r.attendee_id = a.attendee_id
       JOIN users u ON al.recorded_by = u.user_id
       WHERE al.event_id = $1
       ORDER BY ${sortField === 'full_name' ? 'a.full_name' : 'al.check_in_time'} ${orderDir}
       LIMIT $2 OFFSET $3`,
      [eventId, limit, offset]
    );
    
    // Get total count for pagination
    const totalCount = await pool.query(
      'SELECT COUNT(*) as total FROM attendancelogs WHERE event_id = $1',
      [eventId]
    );
    
    // Get attendance summary
    const summary = await pool.query(
      `SELECT 
         COUNT(*) as total_checked_in,
         SUM(r.ticket_quantity) as total_tickets_checked_in,
         (SELECT COUNT(*) FROM eventregistrations WHERE event_id = $1) as total_registrations,
         (SELECT SUM(ticket_quantity) FROM eventregistrations WHERE event_id = $1) as total_tickets,
         ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM eventregistrations WHERE event_id = $1), 1) as attendance_rate
       FROM attendancelogs al
       JOIN eventregistrations r ON al.registration_id = r.registration_id
       WHERE al.event_id = $1`,
      [eventId]
    );
    
    res.json({
      attendance: attendance.rows,
      summary: summary.rows[0],
      pagination: {
        total: parseInt(totalCount.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: parseInt(offset) + parseInt(limit) < parseInt(totalCount.rows[0].total)
      }
    });
    
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ message: 'Server error while fetching attendance records' });
  }
});

// ===== VENUE ROUTES =====

// Get all venues
// NOTE: The venues table does not exist in the database schema
// Instead of querying the database, we'll return an empty array
app.get('/api/venues', async (req, res) => {
  try {
    // Return an empty venues array since we're not using a venues table
    res.json({ venues: [], message: 'Venues are entered directly by organizers' });
  } catch (error) {
    console.error('Get venues error:', error);
    res.status(500).json({ message: 'Server error while fetching venues' });
  }
});

// NOTE: The venues table does not exist in the database schema
// Get venue by ID - returns a mock response
app.get('/api/venues/:id', async (req, res) => {
  try {
    const venueId = req.params.id;
    
    // Since we don't have a venues table, return a generic response
    res.json({ 
      venue: {
        venue_id: venueId,
        venue_name: "Default Venue",
        address: "Please enter venue details directly",
        message: "Venues are stored directly with events"
      } 
    });
    
  } catch (error) {
    console.error('Get venue error:', error);
    res.status(500).json({ message: 'Server error while fetching venue' });
  }
});

// NOTE: The venues table does not exist in the database schema
// Instead, venues are stored directly with the events
app.post('/api/venues', authenticateToken, async (req, res) => {
  try {
    // Check if user is an organizer or admin
    if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Only organizers or admins can add venues',
        error: 'permission_denied',
        roles_required: ['organizer', 'admin']
      });
    }
    
    const { 
      venue_name, 
      address,
      city,
      state,
      country
    } = req.body;
    
    // Validate required fields
    if (!venue_name || !address) {
      return res.status(400).json({ message: 'Venue name and address are required' });
    }
    
    // Return a mock success response with a fake venue ID
    // The real venue info will be stored directly in the events table
    res.status(201).json({
      message: 'Venue information received (note: venues are stored with events)',
      venue: {
        venue_id: Date.now(), // Generate a fake ID just for the response
        venue_name,
        address,
        city,
        state,
        country,
        created_by: req.user.user_id
      }
    });
    
  } catch (error) {
    console.error('Add venue error:', error);
    res.status(500).json({ message: 'Server error while processing venue information' });
  }
});

// NOTE: The venues table does not exist in the database schema
// Instead, venues are stored directly with the events
app.put('/api/venues/:id', authenticateToken, async (req, res) => {
  try {
    const venueId = req.params.id;
    
    // Check if user is an organizer or admin
    if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Only organizers or admins can update venues',
        error: 'permission_denied',
        roles_required: ['organizer', 'admin']
      });
    }
    
    const { venue_name, address, city, state, country } = req.body;
    
    // Return a mock success response
    res.json({
      message: 'Venue information updated (note: venues are stored with events)',
      venue: {
        venue_id: venueId,
        venue_name: venue_name || 'Updated Venue',
        address: address || 'Updated Address',
        city: city || '',
        state: state || '',
        country: country || '',
        updated_by: req.user.user_id,
        updated_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Update venue error:', error);
    res.status(500).json({ message: 'Server error while updating venue' });
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

// ===== TICKET MANAGEMENT ROUTES =====

// Get ticket types for an event
app.get('/api/events/:eventId/ticket-types', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Verify event exists and user has permission to view it
    const eventCheck = await pool.query(`
      SELECT e.event_id, o.user_id 
      FROM events e 
      JOIN organizers o ON e.organizer_id = o.organizer_id 
      WHERE e.event_id = $1
    `, [eventId]);
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (eventCheck.rows[0].user_id !== req.user.user_id) {
      return res.status(403).json({ message: 'Not authorized to view this event' });
    }
    
    const result = await pool.query(`
      SELECT 
        ticket_type_id,
        event_id,
        type_name,
        price,
        quantity_available,
        quantity_sold,
        description,
        benefits,
        created_at,
        updated_at
      FROM tickettypes 
      WHERE event_id = $1 
      ORDER BY price ASC
    `, [eventId]);
    
    res.json({ ticketTypes: result.rows });
  } catch (error) {
    console.error('Error fetching ticket types:', error);
    res.status(500).json({ message: 'Failed to fetch ticket types' });
  }
});

// Create a new ticket type for an event
app.post('/api/events/:eventId/ticket-types', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { type_name, price, quantity_available, description, benefits } = req.body;
    
    // Validate required fields
    if (!type_name || !price || !quantity_available) {
      return res.status(400).json({ message: 'Ticket type name, price, and quantity are required' });
    }
    
    // Verify event exists and user has permission
    const eventCheck = await pool.query(`
      SELECT e.event_id, o.user_id 
      FROM events e 
      JOIN organizers o ON e.organizer_id = o.organizer_id 
      WHERE e.event_id = $1
    `, [eventId]);
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (eventCheck.rows[0].user_id !== req.user.user_id) {
      return res.status(403).json({ message: 'Not authorized to manage this event' });
    }
    
    // Convert benefits to array format if it's a string
    let benefitsArray = null;
    if (benefits) {
      if (Array.isArray(benefits)) {
        benefitsArray = benefits;
      } else if (typeof benefits === 'string') {
        // Split by comma, semicolon, or newline and clean up
        benefitsArray = benefits.split(/[,;\n]/).map(b => b.trim()).filter(b => b.length > 0);
      }
    }
    
    const result = await pool.query(`
      INSERT INTO tickettypes (event_id, type_name, price, quantity_available, description, benefits)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [eventId, type_name, parseFloat(price), parseInt(quantity_available), description, benefitsArray]);
    
    res.status(201).json({ 
      message: 'Ticket type created successfully',
      ticketType: result.rows[0] 
    });
  } catch (error) {
    console.error('Error creating ticket type:', error);
    res.status(500).json({ message: 'Failed to create ticket type' });
  }
});

// Update a ticket type
app.put('/api/events/:eventId/ticket-types/:ticketTypeId', authenticateToken, async (req, res) => {
  try {
    const { eventId, ticketTypeId } = req.params;
    const { type_name, price, quantity_available, description, benefits } = req.body;
    
    // Verify event exists and user has permission
    const eventCheck = await pool.query(`
      SELECT e.event_id, o.user_id 
      FROM events e 
      JOIN organizers o ON e.organizer_id = o.organizer_id 
      WHERE e.event_id = $1
    `, [eventId]);
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (eventCheck.rows[0].user_id !== req.user.user_id) {
      return res.status(403).json({ message: 'Not authorized to manage this event' });
    }
    
    // Convert benefits to array format if it's a string
    let benefitsArray = null;
    if (benefits) {
      if (Array.isArray(benefits)) {
        benefitsArray = benefits;
      } else if (typeof benefits === 'string') {
        // Split by comma, semicolon, or newline and clean up
        benefitsArray = benefits.split(/[,;\n]/).map(b => b.trim()).filter(b => b.length > 0);
      }
    }
    
    const result = await pool.query(`
      UPDATE tickettypes 
      SET type_name = $1, price = $2, quantity_available = $3, description = $4, benefits = $5, updated_at = NOW()
      WHERE ticket_type_id = $6 AND event_id = $7
      RETURNING *
    `, [type_name, parseFloat(price), parseInt(quantity_available), description, benefitsArray, ticketTypeId, eventId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Ticket type not found' });
    }
    
    res.json({ 
      message: 'Ticket type updated successfully',
      ticketType: result.rows[0] 
    });
  } catch (error) {
    console.error('Error updating ticket type:', error);
    res.status(500).json({ message: 'Failed to update ticket type' });
  }
});

// Delete a ticket type
app.delete('/api/events/:eventId/ticket-types/:ticketTypeId', authenticateToken, async (req, res) => {
  try {
    const { eventId, ticketTypeId } = req.params;
    
    // Verify event exists and user has permission
    const eventCheck = await pool.query(`
      SELECT e.event_id, o.user_id 
      FROM events e 
      JOIN organizers o ON e.organizer_id = o.organizer_id 
      WHERE e.event_id = $1
    `, [eventId]);
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (eventCheck.rows[0].user_id !== req.user.user_id) {
      return res.status(403).json({ message: 'Not authorized to manage this event' });
    }
    
    // Check if ticket type has any sales
    const salesCheck = await pool.query(`
      SELECT COUNT(*) as sales_count 
      FROM eventregistrations er
      JOIN tickettypes tt ON er.event_id = tt.event_id
      WHERE tt.ticket_type_id = $1 AND er.event_id = $2
    `, [ticketTypeId, eventId]);
    
    if (parseInt(salesCheck.rows[0].sales_count) > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete ticket type with existing registrations' 
      });
    }
    
    const result = await pool.query(`
      DELETE FROM tickettypes 
      WHERE ticket_type_id = $1 AND event_id = $2
      RETURNING *
    `, [ticketTypeId, eventId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Ticket type not found' });
    }
    
    res.json({ message: 'Ticket type deleted successfully' });
  } catch (error) {
    console.error('Error deleting ticket type:', error);
    res.status(500).json({ message: 'Failed to delete ticket type' });
  }
});

// Get ticket sales summary for an event
app.get('/api/events/:eventId/ticket-sales', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Verify event exists and user has permission
    const eventCheck = await pool.query(`
      SELECT e.event_id, e.event_name, o.user_id 
      FROM events e 
      JOIN organizers o ON e.organizer_id = o.organizer_id 
      WHERE e.event_id = $1
    `, [eventId]);
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (eventCheck.rows[0].user_id !== req.user.user_id) {
      return res.status(403).json({ message: 'Not authorized to view this event' });
    }
    
    // Get ticket sales summary
    const salesSummary = await pool.query(`
      SELECT 
        tt.ticket_type_id,
        tt.type_name,
        tt.price,
        tt.quantity_available,
        tt.quantity_sold,
        (tt.quantity_sold * tt.price) as revenue
      FROM tickettypes tt
      WHERE tt.event_id = $1
      ORDER BY tt.price ASC
    `, [eventId]);
    
    // Get total revenue and tickets sold
    const totals = await pool.query(`
      SELECT 
        COALESCE(SUM(tt.quantity_sold), 0) as total_tickets_sold,
        COALESCE(SUM(tt.quantity_sold * tt.price), 0) as total_revenue,
        COALESCE(SUM(tt.quantity_available), 0) as total_capacity
      FROM tickettypes tt
      WHERE tt.event_id = $1
    `, [eventId]);
    
    res.json({
      eventName: eventCheck.rows[0].event_name,
      ticketTypes: salesSummary.rows,
      summary: {
        totalTicketsSold: parseInt(totals.rows[0].total_tickets_sold),
        totalRevenue: parseFloat(totals.rows[0].total_revenue),
        totalCapacity: parseInt(totals.rows[0].total_capacity)
      }
    });
  } catch (error) {
    console.error('Error fetching ticket sales:', error);
    res.status(500).json({ message: 'Failed to fetch ticket sales data' });
  }
});

// Get event registrations with ticket information
app.get('/api/events/:eventId/registrations-detailed', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Verify event exists and user has permission
    const eventCheck = await pool.query(`
      SELECT e.event_id, o.user_id 
      FROM events e 
      JOIN organizers o ON e.organizer_id = o.organizer_id 
      WHERE e.event_id = $1
    `, [eventId]);
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (eventCheck.rows[0].user_id !== req.user.user_id) {
      return res.status(403).json({ message: 'Not authorized to view this event' });
    }
    
    const registrations = await pool.query(`
      SELECT 
        er.registration_id,
        er.registration_date,
        er.ticket_quantity,
        er.total_amount,
        er.payment_status,
        er.payment_method,
        er.qr_code,
        er.status,
        er.check_in_status,
        er.check_in_time,
        a.full_name as attendee_name,
        u.email as attendee_email,
        a.phone as attendee_phone,
        p.payment_id,
        p.transaction_id,
        p.payment_date
      FROM eventregistrations er
      JOIN attendees a ON er.attendee_id = a.attendee_id
      JOIN users u ON a.user_id = u.user_id
      LEFT JOIN payments p ON er.registration_id = p.registration_id
      WHERE er.event_id = $1
      ORDER BY er.registration_date DESC
    `, [eventId]);
    
    res.json({ registrations: registrations.rows });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({ message: 'Failed to fetch registrations' });
  }
});

// Generate QR code for a registration
app.post('/api/registrations/:registrationId/generate-qr', authenticateToken, async (req, res) => {
  try {
    const { registrationId } = req.params;
    
    // Generate unique QR code
    const qrCode = `QR${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Update registration with QR code
    const result = await pool.query(`
      UPDATE eventregistrations 
      SET qr_code = $1, updated_at = NOW()
      WHERE registration_id = $2
      RETURNING *
    `, [qrCode, registrationId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Registration not found' });
    }
    
    res.json({ 
      message: 'QR code generated successfully',
      qrCode: qrCode,
      registration: result.rows[0]
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ message: 'Failed to generate QR code' });
  }
});

// Process payment for a registration
app.post('/api/registrations/:registrationId/process-payment', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { registrationId } = req.params;
    const { payment_method, transaction_id, amount } = req.body;
    
    // Validate required fields
    if (!payment_method || !transaction_id || !amount) {
      return res.status(400).json({ 
        message: 'Payment method, transaction ID, and amount are required' 
      });
    }
    
    // Get registration details
    const registration = await client.query(`
      SELECT er.*, e.event_name 
      FROM eventregistrations er
      JOIN events e ON er.event_id = e.event_id
      WHERE er.registration_id = $1
    `, [registrationId]);
    
    if (registration.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Registration not found' });
    }
    
    // Create payment record
    const payment = await client.query(`
      INSERT INTO payments (registration_id, amount, payment_method, payment_status, transaction_id)
      VALUES ($1, $2, $3, 'completed', $4)
      RETURNING *
    `, [registrationId, parseFloat(amount), payment_method, transaction_id]);
    
    // Update registration payment status
    await client.query(`
      UPDATE eventregistrations 
      SET payment_status = 'completed', payment_method = $1, payment_reference = $2
      WHERE registration_id = $3
    `, [payment_method, transaction_id, registrationId]);
    
    await client.query('COMMIT');
    
    res.json({
      message: 'Payment processed successfully',
      payment: payment.rows[0],
      registration: registration.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing payment:', error);
    res.status(500).json({ message: 'Failed to process payment' });
  } finally {
    client.release();
  }
});

// ===== EVENT ATTENDEE LISTING ENDPOINTS =====

// Get all attendees for a specific event with comprehensive details
app.get('/api/events/:eventId/attendee-listing', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { organizer_id } = req.query;

    // Build query with optional organizer filter
    let query = `
      SELECT 
        -- Event Information
        e.event_id,
        e.event_name,
        e.event_date,
        e.event_time,
        e.end_date,
        e.end_time,
        e.venue_name,
        e.venue_address,
        e.event_type,
        e.category,
        e.ticket_price,
        e.max_attendees,
        
        -- Organizer Information
        o.organizer_id,
        o.organizer_name,
        o.email as organizer_email,
        o.company as organizer_company,
        
        -- Registration Information
        er.registration_id,
        er.registration_date,
        er.ticket_quantity,
        er.total_amount,
        er.payment_status,
        er.payment_method,
        er.payment_reference,
        er.special_requirements,
        er.qr_code,
        er.registration_status,
        er.cancellation_reason,
        
        -- Attendee Information
        a.attendee_id,
        a.full_name as attendee_name,
        u.email as attendee_email,
        a.phone as attendee_phone,
        a.date_of_birth,
        a.gender,
        a.interests,
        a.dietary_restrictions,
        a.accessibility_needs,
        a.emergency_contact_name,
        a.emergency_contact_phone,
        a.profile_picture_url,
        a.bio,
        a.social_media_links,
        a.notification_preferences,
        
        -- Attendance Tracking
        CASE WHEN al.log_id IS NOT NULL THEN true ELSE false END as check_in_status,
        al.log_id as attendance_id,
        al.check_in_time,
        al.check_out_time,
        al.scan_method,
        al.scanned_by_user_id,
        sbu.email as scanned_by_email,
        CASE 
          WHEN al.log_id IS NOT NULL THEN 'checked_in'
          ELSE 'registered'
        END as attendance_status,
        CASE 
          WHEN al.check_in_time IS NOT NULL AND al.check_out_time IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (al.check_out_time - al.check_in_time))/3600.0
          ELSE NULL
        END as attendance_duration_hours,
        
        -- Ticket Information
        tt.ticket_type_id,
        tt.type_name as ticket_type,
        tt.price as ticket_type_price,
        tt.description as ticket_description
        
      FROM events e
      JOIN organizers o ON e.organizer_id = o.organizer_id
      JOIN eventregistrations er ON e.event_id = er.event_id
      JOIN attendees a ON er.attendee_id = a.attendee_id
      JOIN users u ON a.user_id = u.user_id
      LEFT JOIN attendancelogs al ON er.registration_id = al.registration_id
      LEFT JOIN users sbu ON al.scanned_by_user_id = sbu.user_id
      LEFT JOIN tickettypes tt ON er.ticket_type_id = tt.ticket_type_id
      WHERE e.event_id = $1
    `;

    let queryParams = [eventId];

    // Add organizer filter if provided
    if (organizer_id) {
      query += ` AND o.organizer_id = $2`;
      queryParams.push(organizer_id);
    }

    query += ` ORDER BY er.registration_date DESC`;

    const result = await pool.query(query, queryParams);

    res.json({
      success: true,
      count: result.rows.length,
      attendees: result.rows
    });

  } catch (error) {
    console.error('Error fetching event attendee listing:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch event attendee listing',
      error: error.message 
    });
  }
});

// Get attendee listing for all events by a specific organizer
app.get('/api/organizers/:organizerId/attendee-listing', authenticateToken, async (req, res) => {
  try {
    const { organizerId } = req.params;
    const { event_id, attendance_status, payment_status, limit, offset } = req.query;

    let query = `
      SELECT 
        -- Event Information
        e.event_id,
        e.event_name,
        e.event_date,
        e.event_time,
        e.venue_name,
        e.category,
        
        -- Organizer Information
        o.organizer_id,
        o.organizer_name,
        o.email as organizer_email,
        
        -- Registration Information
        er.registration_id,
        er.registration_date,
        er.ticket_quantity,
        er.total_amount,
        er.payment_status,
        er.registration_status,
        
        -- Attendee Information
        a.attendee_id,
        a.full_name as attendee_name,
        u.email as attendee_email,
        a.phone as attendee_phone,
        
        -- Attendance Tracking
        CASE WHEN al.log_id IS NOT NULL THEN true ELSE false END as check_in_status,
        al.check_in_time,
        CASE 
          WHEN al.log_id IS NOT NULL THEN 'checked_in'
          ELSE 'registered'
        END as attendance_status
        
      FROM events e
      JOIN organizers o ON e.organizer_id = o.organizer_id
      JOIN eventregistrations er ON e.event_id = er.event_id
      JOIN attendees a ON er.attendee_id = a.attendee_id
      JOIN users u ON a.user_id = u.user_id
      LEFT JOIN attendancelogs al ON er.registration_id = al.registration_id
      WHERE o.organizer_id = $1
    `;

    let queryParams = [organizerId];
    let paramIndex = 2;

    // Add optional filters
    if (event_id) {
      query += ` AND e.event_id = $${paramIndex}`;
      queryParams.push(event_id);
      paramIndex++;
    }

    if (attendance_status) {
      if (attendance_status === 'checked_in') {
        query += ` AND al.log_id IS NOT NULL`;
      } else if (attendance_status === 'registered') {
        query += ` AND al.log_id IS NULL`;
      }
    }

    if (payment_status) {
      query += ` AND er.payment_status = $${paramIndex}`;
      queryParams.push(payment_status);
      paramIndex++;
    }

    query += ` ORDER BY er.registration_date DESC`;

    // Add pagination
    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      queryParams.push(parseInt(limit));
      paramIndex++;
    }

    if (offset) {
      query += ` OFFSET $${paramIndex}`;
      queryParams.push(parseInt(offset));
    }

    const result = await pool.query(query, queryParams);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM events e
      JOIN organizers o ON e.organizer_id = o.organizer_id
      JOIN eventregistrations er ON e.event_id = er.event_id
      JOIN attendees a ON er.attendee_id = a.attendee_id
      LEFT JOIN attendancelogs al ON er.registration_id = al.registration_id
      WHERE o.organizer_id = $1
    `;

    let countParams = [organizerId];
    let countParamIndex = 2;

    if (event_id) {
      countQuery += ` AND e.event_id = $${countParamIndex}`;
      countParams.push(event_id);
      countParamIndex++;
    }

    if (attendance_status) {
      if (attendance_status === 'checked_in') {
        countQuery += ` AND al.log_id IS NOT NULL`;
      } else if (attendance_status === 'registered') {
        countQuery += ` AND al.log_id IS NULL`;
      }
    }

    if (payment_status) {
      countQuery += ` AND er.payment_status = $${countParamIndex}`;
      countParams.push(payment_status);
    }

    const countResult = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      count: result.rows.length,
      total: parseInt(countResult.rows[0].total),
      pagination: {
        limit: limit ? parseInt(limit) : null,
        offset: offset ? parseInt(offset) : 0,
        has_more: limit ? (parseInt(offset) || 0) + result.rows.length < parseInt(countResult.rows[0].total) : false
      },
      attendees: result.rows
    });

  } catch (error) {
    console.error('Error fetching organizer attendee listing:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch organizer attendee listing',
      error: error.message 
    });
  }
});

// Get attendee listing summary/statistics for an event
app.get('/api/events/:eventId/attendee-stats', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    const result = await pool.query(`
      SELECT 
        -- Basic counts
        COUNT(*) as total_registered,
        COUNT(CASE WHEN er.payment_status = 'completed' THEN 1 END) as total_paid,
        COUNT(CASE WHEN er.payment_status = 'pending' THEN 1 END) as total_pending,
        COUNT(CASE WHEN al.log_id IS NOT NULL THEN 1 END) as total_checked_in,
        
        -- Revenue
        SUM(er.total_amount) as total_revenue,
        SUM(CASE WHEN er.payment_status = 'completed' THEN er.total_amount ELSE 0 END) as collected_revenue,
        
        -- Ticket quantities
        SUM(er.ticket_quantity) as total_tickets_sold,
        
        -- Event capacity
        e.max_attendees,
        CASE 
          WHEN e.max_attendees > 0 THEN 
            ROUND((COUNT(*) * 100.0) / e.max_attendees, 2)
          ELSE NULL 
        END as capacity_percentage
        
      FROM events e
      LEFT JOIN eventregistrations er ON e.event_id = er.event_id
      LEFT JOIN attendancelogs al ON er.registration_id = al.registration_id
      WHERE e.event_id = $1
      GROUP BY e.event_id, e.max_attendees
    `, [eventId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Event not found' 
      });
    }

    const stats = result.rows[0];

    // Format the response
    res.json({
      success: true,
      event_id: parseInt(eventId),
      statistics: {
        registrations: {
          total: parseInt(stats.total_registered || 0),
          paid: parseInt(stats.total_paid || 0),
          pending: parseInt(stats.total_pending || 0),
          checked_in: parseInt(stats.total_checked_in || 0)
        },
        revenue: {
          total: parseFloat(stats.total_revenue || 0),
          collected: parseFloat(stats.collected_revenue || 0),
          pending: parseFloat((stats.total_revenue || 0) - (stats.collected_revenue || 0))
        },
        tickets: {
          sold: parseInt(stats.total_tickets_sold || 0)
        },
        capacity: {
          max_attendees: stats.max_attendees,
          current_registrations: parseInt(stats.total_registered || 0),
          percentage_filled: stats.capacity_percentage ? parseFloat(stats.capacity_percentage) : null,
          remaining_spots: stats.max_attendees ? stats.max_attendees - parseInt(stats.total_registered || 0) : null
        }
      }
    });

  } catch (error) {
    console.error('Error fetching event attendee statistics:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch event attendee statistics',
      error: error.message 
    });
  }
});

// ===== ERROR HANDLING MIDDLEWARE =====

// Global error handling middleware - must be last middleware
app.use((err, req, res, next) => {
  console.error('Unhandled DB Error:', err);
  res.status(500).json({ 
    message: 'Database operation failed',
    error: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
