// Authentication Routes Module
// Clean, organized route handlers using the service layer

const express = require('express');
const bcrypt = require('bcryptjs');
const AuthService = require('../services/AuthService');
const EmailService = require('../services/EmailService');
const ValidationService = require('../services/ValidationService');
const DatabaseService = require('../services/DatabaseService');

class AuthRoutes {
  constructor(pool) {
    this.router = express.Router();
    this.dbService = new DatabaseService(pool);
    this.emailService = new EmailService();
    this.authService = new AuthService(pool, this.emailService);
    
    this.initializeRoutes();
  }

  initializeRoutes() {
    // Test route
    this.router.get('/health', this.healthCheck.bind(this));
    
    // Authentication routes
    this.router.post('/register', this.register.bind(this));
    this.router.get('/verify-email', this.verifyEmail.bind(this));
    this.router.post('/resend-verification', this.resendVerification.bind(this));
    this.router.post('/login', this.login.bind(this));
    
    // Debug routes (remove in production)
    this.router.get('/debug/verification-stats', this.getVerificationStats.bind(this));
  }

  // Health check endpoint
  async healthCheck(req, res) {
    try {
      const dbHealthy = await this.dbService.testConnection();
      const emailHealthy = await this.emailService.testConnection();
      
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          database: dbHealthy ? 'healthy' : 'unhealthy',
          email: emailHealthy ? 'healthy' : 'unhealthy'
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Health check failed',
        error: error.message
      });
    }
  }

  // User registration endpoint
  async register(req, res) {
    try {
      console.log('=== USER REGISTRATION ATTEMPT ===');
      console.log('Request body:', {
        email: req.body.email,
        role: req.body.role,
        hasPassword: !!req.body.password,
        hasUsername: !!req.body.username
      });

      // Validate input using ValidationService
      const validation = ValidationService.validateSignupData(req.body);
      if (!validation.isValid) {
        console.log('❌ Validation failed:', validation.errors);
        return res.status(400).json({
          success: false,
          message: validation.errors.join(', '),
          errors: validation.errors
        });
      }

      // Use sanitized data
      const signupData = validation.sanitized;
      signupData.password = req.body.password; // Password is not sanitized, just validated
      signupData.phone = req.body.phone; // Add optional fields back

      // Process signup using AuthService
      const result = await this.authService.signup(signupData);

      if (!result.success) {
        console.log('❌ Signup failed:', result.message);
        return res.status(400).json(result);
      }

      console.log('✅ User registered successfully:', {
        user_id: result.data.user.user_id,
        email: result.data.user.email,
        role: result.data.user.role,
        isNewUser: result.data.user.isNewUser
      });

      // Return success response
      res.status(201).json({
        success: true,
        message: result.message,
        user: result.data.user,
        emailSent: result.data.emailSent
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during registration. Please try again later.'
      });
    }
  }

  // Email verification endpoint
  async verifyEmail(req, res) {
    try {
      console.log('=== EMAIL VERIFICATION ATTEMPT ===');
      
      const { token } = req.query;
      
      // Validate token
      const tokenValidation = ValidationService.validateToken(token, 'verification');
      if (!tokenValidation.isValid) {
        console.log('❌ Invalid token format:', tokenValidation.error);
        return res.status(400).json({
          success: false,
          message: tokenValidation.error
        });
      }

      // Process verification using AuthService
      const result = await this.authService.verifyEmail(tokenValidation.sanitized);

      if (!result.success) {
        console.log('❌ Verification failed:', result.message);
        return res.status(400).json(result);
      }

      console.log('✅ Email verified successfully:', {
        user_id: result.data.user.user_id,
        email: result.data.user.email
      });

      // Send welcome email (optional)
      try {
        const userRoles = await this.dbService.getUserRoles(result.data.user.user_id);
        const primaryRole = userRoles.length > 0 ? userRoles[0].role : 'attendee';
        
        await this.emailService.sendWelcomeEmail(
          result.data.user.email,
          userRoles[0]?.full_name || 'User',
          primaryRole
        );
      } catch (emailError) {
        console.warn('Welcome email failed to send:', emailError.message);
        // Don't fail the verification if welcome email fails
      }

      res.json(result);

    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during email verification. Please try again later.'
      });
    }
  }

  // Resend verification email endpoint
  async resendVerification(req, res) {
    try {
      console.log('=== RESEND VERIFICATION REQUEST ===');
      
      const { email } = req.body;
      
      // Validate email
      if (!email || !ValidationService.isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          message: 'Valid email address is required'
        });
      }

      // Process resend using AuthService
      const result = await this.authService.resendVerificationEmail(email.toLowerCase());

      if (!result.success) {
        console.log('❌ Resend verification failed:', result.message);
        return res.status(400).json(result);
      }

      console.log('✅ Verification email resent successfully to:', email);

      res.json(result);

    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while resending verification email. Please try again later.'
      });
    }
  }

  // User login endpoint
  async login(req, res) {
    try {
      console.log('=== USER LOGIN ATTEMPT ===');
      console.log('Login request:', {
        email: req.body.email,
        hasPassword: !!req.body.password,
        timestamp: new Date().toISOString()
      });

      // Validate input
      const validation = ValidationService.validateLoginData(req.body);
      if (!validation.isValid) {
        console.log('❌ Login validation failed:', validation.errors);
        return res.status(400).json({
          success: false,
          message: validation.errors.join(', ')
        });
      }

      const { email, password } = validation.sanitized;

      // Find user
      const user = await this.dbService.findUserByEmail(email);
      if (!user) {
        console.log('❌ User not found:', email);
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check if email is verified
      if (!user.is_email_verified) {
        console.log('❌ Email not verified:', email);
        return res.status(401).json({
          success: false,
          message: 'Please verify your email address before logging in',
          requiresVerification: true
        });
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        console.log('❌ Invalid password for user:', email);
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Get user roles
      const roles = await this.dbService.getUserRoles(user.user_id);
      
      // Update last login
      await this.dbService.updateLastLogin(user.user_id);

      // Generate JWT token
      const userData = {
        user_id: user.user_id,
        email: user.email,
        primary_role: user.role_type,
        roles: roles
      };

      const token = this.authService.generateJWTToken(userData);

      console.log('✅ Login successful:', {
        user_id: user.user_id,
        email: user.email,
        primary_role: user.role_type,
        roles_count: roles.length
      });

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          user_id: user.user_id,
          email: user.email,
          primary_role: user.role_type,
          roles: roles,
          has_multiple_roles: roles.length > 1
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during login. Please try again later.'
      });
    }
  }

  // Debug endpoint to get verification statistics
  async getVerificationStats(req, res) {
    try {
      const { email } = req.query;
      const stats = await this.dbService.getVerificationStats(email);
      
      res.json({
        success: true,
        stats: stats,
        message: email ? `Stats for ${email}` : 'Overall verification stats'
      });
    } catch (error) {
      console.error('Error getting verification stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving verification statistics'
      });
    }
  }

  // Get the router instance
  getRouter() {
    return this.router;
  }
}

module.exports = AuthRoutes;
