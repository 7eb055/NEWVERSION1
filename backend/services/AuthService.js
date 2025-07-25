// Authentication Service Module
// Handles all authentication-related operations including signup, verification, and validation

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class AuthService {
  constructor(pool, emailService) {
    this.pool = pool;
    this.emailService = emailService;
    this.JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
  }

  // Generate secure verification token
  generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate JWT token
  generateJWTToken(user) {
    return jwt.sign(
      { 
        user_id: user.user_id, 
        email: user.email, 
        role: user.primary_role,
        roles: user.roles?.map(r => r.role) || []
      },
      this.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  // Validate signup input
  validateSignupInput(data) {
    const { username, email, password, role, companyName, contactPerson, location } = data;
    const errors = [];

    // Required fields validation
    if (!username?.trim()) errors.push('Full name is required');
    if (!email?.trim()) errors.push('Email is required');
    if (!password) errors.push('Password is required');

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      errors.push('Please enter a valid email address');
    }

    // Password strength validation
    if (password && password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    // Role validation
    if (!['attendee', 'organizer'].includes(role)) {
      errors.push('Role must be either "attendee" or "organizer"');
    }

    // Organizer-specific validation
    if (role === 'organizer') {
      if (!companyName?.trim()) errors.push('Company name is required for organizers');
      if (!contactPerson?.trim()) errors.push('Contact person is required for organizers');
      if (!location?.trim()) errors.push('Location is required for organizers');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Check if user exists and validate role conflicts
  async checkExistingUser(email, role) {
    const userQuery = await this.pool.query(
      'SELECT user_id, role_type, is_email_verified FROM Users WHERE email = $1',
      [email]
    );

    if (userQuery.rows.length === 0) {
      return { exists: false };
    }

    const existingUser = userQuery.rows[0];

    // Check if they already have this role
    if (role === 'attendee') {
      const attendeeExists = await this.pool.query(
        'SELECT attendee_id FROM Attendees WHERE user_id = $1',
        [existingUser.user_id]
      );
      if (attendeeExists.rows.length > 0) {
        return { 
          exists: true, 
          conflict: true, 
          message: 'You are already registered as an attendee' 
        };
      }
    } else if (role === 'organizer') {
      const organizerExists = await this.pool.query(
        'SELECT organizer_id FROM Organizers WHERE user_id = $1',
        [existingUser.user_id]
      );
      if (organizerExists.rows.length > 0) {
        return { 
          exists: true, 
          conflict: true, 
          message: 'You are already registered as an organizer' 
        };
      }
    }

    // If email is not verified, don't allow adding new roles
    if (!existingUser.is_email_verified) {
      return {
        exists: true,
        conflict: true,
        message: 'Please verify your existing account before adding additional roles'
      };
    }

    return {
      exists: true,
      user: existingUser,
      canAddRole: true
    };
  }

  // Create new user account
  async createUser(userData, client) {
    const { email, password, role, username } = userData;

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate verification token
    const verificationToken = this.generateVerificationToken();
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    console.log('Creating new user with verification token:', {
      email,
      role,
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

    const userId = newUser.rows[0].user_id;

    // Log verification attempt
    await client.query(
      `INSERT INTO EmailVerificationLogs (user_id, email, verification_token, token_expires) 
       VALUES ($1, $2, $3, $4)`,
      [userId, email, verificationToken, tokenExpires]
    );

    console.log('User created successfully:', {
      user_id: userId,
      email,
      role,
      token_stored: true
    });

    return {
      userId,
      verificationToken,
      userData: newUser.rows[0]
    };
  }

  // Add role to existing user
  async addRoleToUser(userId, roleData, client) {
    const { role, username, phone, companyName, contactPerson, location } = roleData;

    if (role === 'attendee') {
      await client.query(
        `INSERT INTO Attendees (user_id, full_name, phone) 
         VALUES ($1, $2, $3)`,
        [userId, username, phone]
      );
    } else if (role === 'organizer') {
      // Handle company creation or lookup
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

    console.log(`${role} role added to user ${userId}`);
  }

  // Complete signup process
  async signup(signupData) {
    // Validate input
    const validation = this.validateSignupInput(signupData);
    if (!validation.isValid) {
      return {
        success: false,
        message: validation.errors.join(', '),
        errors: validation.errors
      };
    }

    const { username, email, password, phone, role, companyName, contactPerson, location } = signupData;

    // Check existing user
    const userCheck = await this.checkExistingUser(email, role);
    if (userCheck.conflict) {
      return {
        success: false,
        message: userCheck.message
      };
    }

    // Start transaction
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      let userId;
      let verificationToken = null;
      let isNewUser = !userCheck.exists;

      if (!userCheck.exists) {
        // Create new user
        const createResult = await this.createUser({
          email, password, role, username
        }, client);
        
        userId = createResult.userId;
        verificationToken = createResult.verificationToken;

        // Send verification email for new users
        const emailSent = await this.emailService.sendVerificationEmail(
          email, verificationToken, username
        );

        if (!emailSent) {
          console.warn('Verification email failed to send, but user was created');
        }
      } else {
        userId = userCheck.user.user_id;
      }

      // Add role-specific data
      await this.addRoleToUser(userId, {
        role, username, phone, companyName, contactPerson, location
      }, client);

      await client.query('COMMIT');

      const message = isNewUser 
        ? 'User registered successfully. Please check your email to verify your account.'
        : `${role.charAt(0).toUpperCase() + role.slice(1)} role added successfully to your existing account.`;

      return {
        success: true,
        message,
        data: {
          user: {
            user_id: userId,
            email,
            role,
            isNewUser
          },
          emailSent: isNewUser
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Signup transaction error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Verify email with token
  async verifyEmail(token) {
    if (!token) {
      return {
        success: false,
        message: 'Verification token is required'
      };
    }

    console.log('=== EMAIL VERIFICATION ATTEMPT ===', {
      token_received: !!token,
      token_length: token?.length,
      token_preview: token?.substring(0, 8) + '...',
      timestamp: new Date().toISOString()
    });

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Find user with this token
      const userQuery = await client.query(
        `SELECT user_id, email, role_type, email_verification_token, 
                email_verification_token_expires, is_email_verified
         FROM Users 
         WHERE email_verification_token = $1`,
        [token]
      );

      if (userQuery.rows.length === 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          message: 'Invalid verification token or token has already been used'
        };
      }

      const userData = userQuery.rows[0];

      // Check if already verified
      if (userData.is_email_verified) {
        await client.query('ROLLBACK');
        return {
          success: false,
          message: 'This email has already been verified. You can proceed to login.',
          alreadyVerified: true
        };
      }

      // Check if token is expired
      if (new Date() > new Date(userData.email_verification_token_expires)) {
        await client.query('ROLLBACK');
        return {
          success: false,
          message: 'Verification token has expired. Please request a new verification email.'
        };
      }

      // Mark as verified
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
        return {
          success: false,
          message: 'Verification failed - user may already be verified'
        };
      }

      // Clear the verification token
      await client.query(
        `UPDATE Users 
         SET email_verification_token = NULL,
             email_verification_token_expires = NULL
         WHERE user_id = $1`,
        [userData.user_id]
      );

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
        verified_at: new Date().toISOString()
      });

      return {
        success: true,
        message: 'Email verified successfully! You can now log in to your account.',
        data: {
          user: {
            user_id: userData.user_id,
            email: userData.email,
            is_verified: true
          }
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Email verification error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Resend verification email
  async resendVerificationEmail(email) {
    if (!email) {
      return {
        success: false,
        message: 'Email is required'
      };
    }

    // Find unverified user
    const userQuery = await this.pool.query(
      'SELECT user_id, email FROM Users WHERE email = $1 AND is_email_verified = FALSE',
      [email]
    );

    if (userQuery.rows.length === 0) {
      return {
        success: false,
        message: 'User not found or already verified'
      };
    }

    const userData = userQuery.rows[0];

    // Generate new verification token
    const verificationToken = this.generateVerificationToken();
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new token
    await this.pool.query(
      `UPDATE Users 
       SET email_verification_token = $1, 
           email_verification_token_expires = $2,
           updated_at = NOW()
       WHERE user_id = $3`,
      [verificationToken, tokenExpires, userData.user_id]
    );

    // Get user's full name for email
    const roleQuery = await this.pool.query(
      `SELECT full_name FROM Attendees WHERE user_id = $1
       UNION ALL
       SELECT full_name FROM Organizers WHERE user_id = $1
       LIMIT 1`,
      [userData.user_id]
    );

    const fullName = roleQuery.rows[0]?.full_name || 'User';

    // Send verification email
    const emailSent = await this.emailService.sendVerificationEmail(
      email, verificationToken, fullName
    );

    if (!emailSent) {
      return {
        success: false,
        message: 'Failed to send verification email. Please try again later.'
      };
    }

    return {
      success: true,
      message: 'Verification email sent successfully. Please check your inbox.'
    };
  }
}

module.exports = AuthService;
