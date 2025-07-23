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
