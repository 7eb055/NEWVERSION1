// Email Service Module
// Handles all email-related operations including verification, password reset, and notifications

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = this.createTransporter();
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  }

  // Create and configure email transporter
  createTransporter() {
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      secure: true,
      logger: true,
      debug: false
    });
  }

  // Test email configuration
  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service is ready');
      return true;
    } catch (error) {
      console.error('❌ Email service configuration error:', error.message);
      return false;
    }
  }

  // Generate verification email template
  generateVerificationEmailHTML(username, verificationUrl) {
    return `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🎉 Event Management System</h1>
          <h2 style="margin: 10px 0 0 0; font-size: 20px; font-weight: 300;">Email Verification</h2>
        </div>
        
        <!-- Body -->
        <div style="padding: 40px 30px; background: #f8f9fa;">
          <h3 style="color: #333; margin-top: 0;">Hello ${username}!</h3>
          
          <p style="color: #555; line-height: 1.6; font-size: 16px;">
            Welcome to our Event Management System! We're excited to have you on board.
          </p>
          
          <p style="color: #555; line-height: 1.6; font-size: 16px;">
            To get started, please verify your email address by clicking the button below:
          </p>
          
          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="display: inline-block; 
                      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 15px 35px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold;
                      font-size: 16px;
                      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
              ✅ Verify Email Address
            </a>
          </div>
          
          <!-- Alternative Link -->
          <div style="margin: 30px 0; padding: 20px; background: #e9ecef; border-radius: 8px;">
            <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">
              <strong>Can't click the button?</strong> Copy and paste this link into your browser:
            </p>
            <p style="word-break: break-all; color: #007bff; font-size: 14px; margin: 0;">
              ${verificationUrl}
            </p>
          </div>
          
          <!-- Important Info -->
          <div style="border-left: 4px solid #ffc107; padding: 15px; background: #fff3cd; border-radius: 0 8px 8px 0; margin: 20px 0;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              <strong>⏰ Important:</strong> This verification link will expire in 24 hours for security reasons.
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.5;">
            If you did not create an account with us, please ignore this email and no action is required.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="padding: 20px; text-align: center; background: #343a40; color: #adb5bd;">
          <p style="margin: 0; font-size: 14px;">
            &copy; ${new Date().getFullYear()} Event Management System. All rights reserved.
          </p>
          <p style="margin: 10px 0 0 0; font-size: 12px;">
            Need help? Contact us at <a href="mailto:support@eventmanagement.com" style="color: #667eea;">support@eventmanagement.com</a>
          </p>
        </div>
      </div>
    `;
  }

  // Generate password reset email template
  generatePasswordResetEmailHTML(username, resetUrl) {
    return `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🔒 Event Management System</h1>
          <h2 style="margin: 10px 0 0 0; font-size: 20px; font-weight: 300;">Password Reset Request</h2>
        </div>
        
        <!-- Body -->
        <div style="padding: 40px 30px; background: #f8f9fa;">
          <h3 style="color: #333; margin-top: 0;">Hello ${username},</h3>
          
          <p style="color: #555; line-height: 1.6; font-size: 16px;">
            We received a request to reset your password. No worries, it happens to the best of us!
          </p>
          
          <p style="color: #555; line-height: 1.6; font-size: 16px;">
            Click the button below to create a new password:
          </p>
          
          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="display: inline-block; 
                      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); 
                      color: white; 
                      padding: 15px 35px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold;
                      font-size: 16px;
                      box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);">
              🔑 Reset My Password
            </a>
          </div>
          
          <!-- Alternative Link -->
          <div style="margin: 30px 0; padding: 20px; background: #e9ecef; border-radius: 8px;">
            <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">
              <strong>Can't click the button?</strong> Copy and paste this link into your browser:
            </p>
            <p style="word-break: break-all; color: #007bff; font-size: 14px; margin: 0;">
              ${resetUrl}
            </p>
          </div>
          
          <!-- Security Warning -->
          <div style="border-left: 4px solid #dc3545; padding: 15px; background: #f8d7da; border-radius: 0 8px 8px 0; margin: 20px 0;">
            <p style="color: #721c24; margin: 0 0 10px 0; font-size: 14px;">
              <strong>🚨 Security Notice:</strong>
            </p>
            <ul style="color: #721c24; margin: 0; padding-left: 20px; font-size: 14px;">
              <li>This reset link will expire in 1 hour</li>
              <li>Never share this link with anyone</li>
              <li>If you didn't request this, ignore this email</li>
            </ul>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.5;">
            If you did not request a password reset, please ignore this email and your password will remain unchanged.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="padding: 20px; text-align: center; background: #343a40; color: #adb5bd;">
          <p style="margin: 0; font-size: 14px;">
            &copy; ${new Date().getFullYear()} Event Management System. All rights reserved.
          </p>
          <p style="margin: 10px 0 0 0; font-size: 12px;">
            Need help? Contact us at <a href="mailto:support@eventmanagement.com" style="color: #ff6b6b;">support@eventmanagement.com</a>
          </p>
        </div>
      </div>
    `;
  }

  // Send verification email
  async sendVerificationEmail(email, token, username) {
    const verificationUrl = `${this.frontendUrl}/verify-email?token=${token}`;
    
    console.log('📧 Sending verification email:', {
      to: email,
      username: username,
      token_length: token.length,
      token_preview: token.substring(0, 8) + '...',
      verification_url: verificationUrl
    });
    
    const mailOptions = {
      from: {
        name: 'Event Management System',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: '✅ Verify Your Email Address - Event Management System',
      html: this.generateVerificationEmailHTML(username, verificationUrl),
      text: `
Hello ${username},

Thank you for signing up for our Event Management System!

Please verify your email address by visiting this link:
${verificationUrl}

This verification link will expire in 24 hours.

If you did not create an account, please ignore this email.

Best regards,
Event Management System Team
      `.trim()
    };

    return await this.sendEmail(mailOptions, 'verification');
  }

  // Send password reset email
  async sendPasswordResetEmail(email, token, username) {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;
    
    console.log('🔒 Sending password reset email:', {
      to: email,
      username: username,
      token_length: token.length,
      token_preview: token.substring(0, 8) + '...',
      reset_url: resetUrl
    });
    
    const mailOptions = {
      from: {
        name: 'Event Management System',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: '🔑 Password Reset Request - Event Management System',
      html: this.generatePasswordResetEmailHTML(username, resetUrl),
      text: `
Hello ${username},

We received a request to reset your password.

Please reset your password by visiting this link:
${resetUrl}

This reset link will expire in 1 hour for security reasons.

If you did not request a password reset, please ignore this email.

Best regards,
Event Management System Team
      `.trim()
    };

    return await this.sendEmail(mailOptions, 'password_reset');
  }

  // Generic email sending method with error handling and retry logic
  async sendEmail(mailOptions, emailType = 'general', retryCount = 0) {
    const maxRetries = 3;
    
    try {
      const result = await this.transporter.sendMail(mailOptions);
      
      console.log(`✅ ${emailType} email sent successfully:`, {
        messageId: result.messageId,
        to: mailOptions.to,
        response: result.response
      });
      
      return {
        success: true,
        messageId: result.messageId,
        response: result.response
      };
      
    } catch (error) {
      console.error(`❌ Error sending ${emailType} email:`, {
        error: error.message,
        code: error.code,
        to: mailOptions.to,
        retry_count: retryCount
      });

      // Retry logic for transient errors
      if (retryCount < maxRetries && this.isRetryableError(error)) {
        console.log(`🔄 Retrying ${emailType} email (attempt ${retryCount + 1}/${maxRetries})`);
        await this.delay(1000 * (retryCount + 1)); // Exponential backoff
        return await this.sendEmail(mailOptions, emailType, retryCount + 1);
      }
      
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  // Check if error is retryable
  isRetryableError(error) {
    const retryableCodes = [
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT'
    ];
    
    return retryableCodes.includes(error.code) || 
           error.responseCode >= 500 ||
           error.message.includes('timeout');
  }

  // Utility method for delays
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Send welcome email after successful verification
  async sendWelcomeEmail(email, username, userRole) {
    const welcomeUrl = `${this.frontendUrl}/login`;
    
    const roleSpecificContent = {
      attendee: {
        emoji: '🎟️',
        title: 'Welcome, Event Attendee!',
        message: 'You can now browse and register for exciting events in your area.',
        nextStep: 'Start exploring events'
      },
      organizer: {
        emoji: '🎪',
        title: 'Welcome, Event Organizer!',
        message: 'You can now create and manage amazing events for your audience.',
        nextStep: 'Create your first event'
      }
    };

    const content = roleSpecificContent[userRole] || roleSpecificContent.attendee;

    const mailOptions = {
      from: {
        name: 'Event Management System',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: `${content.emoji} Welcome to Event Management System!`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center;">
            <h1>${content.emoji} ${content.title}</h1>
          </div>
          <div style="padding: 30px; background: #f8f9fa;">
            <p>Hello ${username},</p>
            <p>🎉 Congratulations! Your email has been verified and your account is now active.</p>
            <p>${content.message}</p>
            <p style="text-align: center;">
              <a href="${welcomeUrl}" style="display: inline-block; background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">
                ${content.nextStep}
              </a>
            </p>
          </div>
        </div>
      `
    };

    return await this.sendEmail(mailOptions, 'welcome');
  }
}

module.exports = EmailService;
