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
    return nodemailer.createTransport({
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

  // ===== EMAIL TEMPLATE GENERATORS =====

  // Generate ticket confirmation email HTML
  generateTicketConfirmationHTML(userName, ticketData) {
    return `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🎫 Ticket Confirmed!</h1>
          <h2 style="margin: 10px 0 0 0; font-size: 20px; font-weight: 300;">Your registration is complete</h2>
        </div>
        
        <!-- Body -->
        <div style="padding: 40px 30px; background: #f8f9fa;">
          <h3 style="color: #333; margin-top: 0;">Hello ${userName}!</h3>
          
          <p style="color: #555; line-height: 1.6; font-size: 16px;">
            Great news! Your ticket purchase for <strong>${ticketData.eventName}</strong> has been confirmed.
          </p>
          
          <!-- Event Details -->
          <div style="background: white; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #10b981;">
            <h4 style="color: #10b981; margin: 0 0 15px 0; font-size: 18px;">📅 Event Details</h4>
            <table style="width: 100%; font-size: 14px;">
              <tr><td style="padding: 5px 0; color: #666; width: 30%;"><strong>Event:</strong></td><td style="padding: 5px 0; color: #333;">${ticketData.eventName}</td></tr>
              <tr><td style="padding: 5px 0; color: #666;"><strong>Date:</strong></td><td style="padding: 5px 0; color: #333;">${ticketData.eventDate}</td></tr>
              <tr><td style="padding: 5px 0; color: #666;"><strong>Time:</strong></td><td style="padding: 5px 0; color: #333;">${ticketData.eventTime || 'TBA'}</td></tr>
              <tr><td style="padding: 5px 0; color: #666;"><strong>Venue:</strong></td><td style="padding: 5px 0; color: #333;">${ticketData.venue || 'TBA'}</td></tr>
              <tr><td style="padding: 5px 0; color: #666;"><strong>Tickets:</strong></td><td style="padding: 5px 0; color: #333;">${ticketData.quantity} × ${ticketData.ticketType}</td></tr>
              <tr><td style="padding: 5px 0; color: #666;"><strong>Total:</strong></td><td style="padding: 5px 0; color: #10b981; font-weight: bold;">GH₵${ticketData.totalAmount}</td></tr>
            </table>
          </div>
          
          <!-- QR Code Section -->
          ${ticketData.qrCode ? `
            <div style="text-align: center; margin: 25px 0; padding: 20px; background: white; border-radius: 12px;">
              <h4 style="color: #333; margin: 0 0 15px 0;">📱 Your Check-in QR Code</h4>
              <div style="display: inline-block; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                <p style="font-family: monospace; font-size: 12px; color: #666; margin: 0;">${ticketData.qrCode}</p>
              </div>
              <p style="font-size: 14px; color: #666; margin: 10px 0 0 0;">Present this QR code at the event for check-in</p>
            </div>
          ` : ''}
          
          <!-- Action Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.frontendUrl}/attendee-dashboard" 
               style="display: inline-block; 
                      background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                      color: white; 
                      padding: 15px 35px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold;
                      font-size: 16px;
                      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
              🎫 View My Tickets
            </a>
          </div>
          
          <!-- Important Notes -->
          <div style="border-left: 4px solid #f59e0b; padding: 15px; background: #fffbeb; border-radius: 0 8px 8px 0; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>📋 Important:</strong> Please arrive at least 15 minutes before the event starts. Bring a valid ID along with your ticket.
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="padding: 20px; text-align: center; background: #343a40; color: #adb5bd;">
          <p style="margin: 0; font-size: 14px;">
            &copy; ${new Date().getFullYear()} Event Management System. All rights reserved.
          </p>
          <p style="margin: 10px 0 0 0; font-size: 12px;">
            Questions? Contact us at <a href="mailto:support@eventmanagement.com" style="color: #10b981;">support@eventmanagement.com</a>
          </p>
        </div>
      </div>
    `;
  }

  // Generate event reminder email HTML
  generateEventReminderHTML(userName, eventData, daysUntilEvent) {
    const urgencyColor = daysUntilEvent <= 1 ? '#ef4444' : daysUntilEvent <= 3 ? '#f59e0b' : '#10b981';
    const urgencyText = daysUntilEvent <= 1 ? 'Tomorrow!' : daysUntilEvent <= 3 ? 'Very Soon!' : 'Coming Up!';
    
    return `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, ${urgencyColor} 0%, ${urgencyColor}dd 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">⏰ Event Reminder</h1>
          <h2 style="margin: 10px 0 0 0; font-size: 20px; font-weight: 300;">${urgencyText}</h2>
        </div>
        
        <!-- Body -->
        <div style="padding: 40px 30px; background: #f8f9fa;">
          <h3 style="color: #333; margin-top: 0;">Hello ${userName}!</h3>
          
          <p style="color: #555; line-height: 1.6; font-size: 16px;">
            This is a friendly reminder that <strong>${eventData.eventName}</strong> is 
            ${daysUntilEvent === 1 ? 'tomorrow' : `in ${daysUntilEvent} days`}!
          </p>
          
          <!-- Countdown -->
          <div style="text-align: center; margin: 25px 0; padding: 20px; background: white; border-radius: 12px; border: 2px solid ${urgencyColor};">
            <h2 style="color: ${urgencyColor}; margin: 0; font-size: 36px;">${daysUntilEvent}</h2>
            <p style="color: #666; margin: 5px 0 0 0; font-size: 18px; font-weight: bold;">
              Day${daysUntilEvent !== 1 ? 's' : ''} to go!
            </p>
          </div>
          
          <!-- Event Details -->
          <div style="background: white; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid ${urgencyColor};">
            <h4 style="color: ${urgencyColor}; margin: 0 0 15px 0; font-size: 18px;">📅 Event Details</h4>
            <table style="width: 100%; font-size: 14px;">
              <tr><td style="padding: 5px 0; color: #666; width: 30%;"><strong>Event:</strong></td><td style="padding: 5px 0; color: #333;">${eventData.eventName}</td></tr>
              <tr><td style="padding: 5px 0; color: #666;"><strong>Date:</strong></td><td style="padding: 5px 0; color: #333;">${eventData.eventDate}</td></tr>
              <tr><td style="padding: 5px 0; color: #666;"><strong>Time:</strong></td><td style="padding: 5px 0; color: #333;">${eventData.eventTime || 'TBA'}</td></tr>
              <tr><td style="padding: 5px 0; color: #666;"><strong>Venue:</strong></td><td style="padding: 5px 0; color: #333;">${eventData.venue || 'TBA'}</td></tr>
            </table>
          </div>
          
          <!-- Action Buttons -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.frontendUrl}/events/${eventData.eventId}" 
               style="display: inline-block; 
                      background: linear-gradient(135deg, ${urgencyColor} 0%, ${urgencyColor}dd 100%); 
                      color: white; 
                      padding: 15px 35px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold;
                      font-size: 16px;
                      margin: 0 10px;
                      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);">
              📍 Event Details
            </a>
            <a href="${this.frontendUrl}/attendee-dashboard" 
               style="display: inline-block; 
                      background: #6b7280; 
                      color: white; 
                      padding: 15px 35px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold;
                      font-size: 16px;
                      margin: 0 10px;
                      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);">
              🎫 My Tickets
            </a>
          </div>
          
          <!-- Preparation Tips -->
          <div style="border-left: 4px solid #3b82f6; padding: 15px; background: #eff6ff; border-radius: 0 8px 8px 0; margin: 20px 0;">
            <h4 style="color: #1d4ed8; margin: 0 0 10px 0;">💡 Preparation Tips:</h4>
            <ul style="color: #1e40af; margin: 0; padding-left: 20px; font-size: 14px;">
              <li>Arrive 15 minutes early for check-in</li>
              <li>Bring a valid ID and your ticket QR code</li>
              <li>Check for any event updates or changes</li>
              <li>Plan your transportation and parking</li>
            </ul>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="padding: 20px; text-align: center; background: #343a40; color: #adb5bd;">
          <p style="margin: 0; font-size: 14px;">
            &copy; ${new Date().getFullYear()} Event Management System. All rights reserved.
          </p>
          <p style="margin: 10px 0 0 0; font-size: 12px;">
            Don't want reminders? <a href="${this.frontendUrl}/settings" style="color: #10b981;">Update your preferences</a>
          </p>
        </div>
      </div>
    `;
  }

  // Generate event update email HTML
  generateEventUpdateHTML(userName, eventData, updateMessage) {
    return `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">📢 Event Update</h1>
          <h2 style="margin: 10px 0 0 0; font-size: 20px; font-weight: 300;">Important Information</h2>
        </div>
        
        <!-- Body -->
        <div style="padding: 40px 30px; background: #f8f9fa;">
          <h3 style="color: #333; margin-top: 0;">Hello ${userName}!</h3>
          
          <p style="color: #555; line-height: 1.6; font-size: 16px;">
            There's an important update regarding <strong>${eventData.eventName}</strong> that you're registered for.
          </p>
          
          <!-- Update Message -->
          <div style="background: white; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #3b82f6;">
            <h4 style="color: #3b82f6; margin: 0 0 15px 0; font-size: 18px;">📝 Update Details</h4>
            <div style="background: #eff6ff; padding: 20px; border-radius: 8px; border: 1px solid #bfdbfe;">
              <p style="color: #1e40af; margin: 0; line-height: 1.6; font-size: 15px;">${updateMessage}</p>
            </div>
          </div>
          
          <!-- Event Details -->
          <div style="background: white; border-radius: 12px; padding: 25px; margin: 25px 0; border: 1px solid #e5e7eb;">
            <h4 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">📅 Event Information</h4>
            <table style="width: 100%; font-size: 14px;">
              <tr><td style="padding: 5px 0; color: #666; width: 30%;"><strong>Event:</strong></td><td style="padding: 5px 0; color: #333;">${eventData.eventName}</td></tr>
              <tr><td style="padding: 5px 0; color: #666;"><strong>Date:</strong></td><td style="padding: 5px 0; color: #333;">${eventData.eventDate}</td></tr>
              <tr><td style="padding: 5px 0; color: #666;"><strong>Time:</strong></td><td style="padding: 5px 0; color: #333;">${eventData.eventTime || 'TBA'}</td></tr>
              <tr><td style="padding: 5px 0; color: #666;"><strong>Venue:</strong></td><td style="padding: 5px 0; color: #333;">${eventData.venue || 'TBA'}</td></tr>
            </table>
          </div>
          
          <!-- Action Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.frontendUrl}/events/${eventData.eventId}" 
               style="display: inline-block; 
                      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); 
                      color: white; 
                      padding: 15px 35px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold;
                      font-size: 16px;
                      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);">
              📍 View Event Details
            </a>
          </div>
          
          <!-- Contact Info -->
          <div style="border-left: 4px solid #10b981; padding: 15px; background: #f0fdf4; border-radius: 0 8px 8px 0; margin: 20px 0;">
            <p style="color: #065f46; margin: 0; font-size: 14px;">
              <strong>📞 Questions?</strong> Contact the event organizer or our support team for assistance.
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="padding: 20px; text-align: center; background: #343a40; color: #adb5bd;">
          <p style="margin: 0; font-size: 14px;">
            &copy; ${new Date().getFullYear()} Event Management System. All rights reserved.
          </p>
          <p style="margin: 10px 0 0 0; font-size: 12px;">
            Questions? Contact us at <a href="mailto:support@eventmanagement.com" style="color: #3b82f6;">support@eventmanagement.com</a>
          </p>
        </div>
      </div>
    `;
  }

  // Generate payment confirmation email HTML
  generatePaymentConfirmationHTML(userName, paymentData) {
    return `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">💳 Payment Confirmed</h1>
          <h2 style="margin: 10px 0 0 0; font-size: 20px; font-weight: 300;">Transaction Successful</h2>
        </div>
        
        <!-- Body -->
        <div style="padding: 40px 30px; background: #f8f9fa;">
          <h3 style="color: #333; margin-top: 0;">Hello ${userName}!</h3>
          
          <p style="color: #555; line-height: 1.6; font-size: 16px;">
            Your payment for <strong>${paymentData.eventName}</strong> has been successfully processed.
          </p>
          
          <!-- Payment Details -->
          <div style="background: white; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #059669;">
            <h4 style="color: #059669; margin: 0 0 15px 0; font-size: 18px;">💰 Payment Details</h4>
            <table style="width: 100%; font-size: 14px;">
              <tr><td style="padding: 5px 0; color: #666; width: 40%;"><strong>Transaction ID:</strong></td><td style="padding: 5px 0; color: #333; font-family: monospace;">${paymentData.transactionId}</td></tr>
              <tr><td style="padding: 5px 0; color: #666;"><strong>Amount:</strong></td><td style="padding: 5px 0; color: #059669; font-weight: bold; font-size: 16px;">GH₵${paymentData.amount}</td></tr>
              <tr><td style="padding: 5px 0; color: #666;"><strong>Payment Method:</strong></td><td style="padding: 5px 0; color: #333;">${paymentData.paymentMethod}</td></tr>
              <tr><td style="padding: 5px 0; color: #666;"><strong>Date:</strong></td><td style="padding: 5px 0; color: #333;">${paymentData.paymentDate}</td></tr>
              <tr><td style="padding: 5px 0; color: #666;"><strong>Status:</strong></td><td style="padding: 5px 0; color: #059669; font-weight: bold;">✅ Confirmed</td></tr>
            </table>
          </div>
          
          <!-- Receipt Section -->
          <div style="background: white; border-radius: 12px; padding: 25px; margin: 25px 0; border: 1px solid #e5e7eb;">
            <h4 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">🧾 Receipt Summary</h4>
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 10px 0; color: #666;"><strong>Item</strong></td><td style="padding: 10px 0; color: #666; text-align: center;"><strong>Qty</strong></td><td style="padding: 10px 0; color: #666; text-align: right;"><strong>Amount</strong></td></tr>
              <tr><td style="padding: 10px 0; color: #333;">${paymentData.eventName}</td><td style="padding: 10px 0; color: #333; text-align: center;">${paymentData.quantity}</td><td style="padding: 10px 0; color: #333; text-align: right;">GH₵${paymentData.amount}</td></tr>
              <tr style="border-top: 2px solid #059669; font-weight: bold;"><td style="padding: 10px 0; color: #059669;">Total</td><td style="padding: 10px 0; color: #059669; text-align: center;">${paymentData.quantity}</td><td style="padding: 10px 0; color: #059669; text-align: right; font-size: 16px;">GH₵${paymentData.amount}</td></tr>
            </table>
          </div>
          
          <!-- Action Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.frontendUrl}/attendee-dashboard" 
               style="display: inline-block; 
                      background: linear-gradient(135deg, #059669 0%, #047857 100%); 
                      color: white; 
                      padding: 15px 35px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold;
                      font-size: 16px;
                      box-shadow: 0 4px 15px rgba(5, 150, 105, 0.3);">
              🎫 View My Tickets
            </a>
          </div>
          
          <!-- Important Note -->
          <div style="border-left: 4px solid #f59e0b; padding: 15px; background: #fffbeb; border-radius: 0 8px 8px 0; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>📋 Note:</strong> Keep this email as your payment receipt. You can also access your tickets anytime from your dashboard.
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="padding: 20px; text-align: center; background: #343a40; color: #adb5bd;">
          <p style="margin: 0; font-size: 14px;">
            &copy; ${new Date().getFullYear()} Event Management System. All rights reserved.
          </p>
          <p style="margin: 10px 0 0 0; font-size: 12px;">
            Need help? Contact us at <a href="mailto:support@eventmanagement.com" style="color: #059669;">support@eventmanagement.com</a>
          </p>
        </div>
      </div>
    `;
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

  // ===== NOTIFICATION EMAIL TEMPLATES =====
  
  // Send ticket confirmation email
  async sendTicketConfirmationEmail(email, userName, ticketData) {
    console.log('📧 Sending ticket confirmation email to:', email);
    
    const mailOptions = {
      from: {
        name: 'Event Management System',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: `🎫 Ticket Confirmation - ${ticketData.eventName}`,
      html: this.generateTicketConfirmationHTML(userName, ticketData)
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Ticket confirmation email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Error sending ticket confirmation email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send event reminder email
  async sendEventReminderEmail(email, userName, eventData, daysUntilEvent) {
    console.log('📧 Sending event reminder email to:', email);
    
    const mailOptions = {
      from: {
        name: 'Event Management System',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: `⏰ Reminder: ${eventData.eventName} in ${daysUntilEvent} day${daysUntilEvent !== 1 ? 's' : ''}`,
      html: this.generateEventReminderHTML(userName, eventData, daysUntilEvent)
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Event reminder email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Error sending event reminder email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send event update notification
  async sendEventUpdateEmail(email, userName, eventData, updateMessage) {
    console.log('📧 Sending event update email to:', email);
    
    const mailOptions = {
      from: {
        name: 'Event Management System',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: `📢 Update: ${eventData.eventName}`,
      html: this.generateEventUpdateHTML(userName, eventData, updateMessage)
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Event update email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Error sending event update email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send payment confirmation email
  async sendPaymentConfirmationEmail(email, userName, paymentData) {
    console.log('📧 Sending payment confirmation email to:', email);
    
    const mailOptions = {
      from: {
        name: 'Event Management System',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: `💳 Payment Confirmed - ${paymentData.eventName}`,
      html: this.generatePaymentConfirmationHTML(userName, paymentData)
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Payment confirmation email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Error sending payment confirmation email:', error);
      return { success: false, error: error.message };
    }
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
