const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const pool = require('../db');
const authenticateToken = require('../middleware/auth');
const nodemailer = require('nodemailer');

// Mock email sender for development (replace with actual email service in production)
const mockEmailSender = async (to, subject, html) => {
  console.log(`\n--- EMAIL SENT ---`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Content: ${html.substring(0, 150)}...`);
  console.log(`--- END OF EMAIL ---\n`);
  
  return { messageId: uuidv4() };
};

// Get ticket types for an event
router.get('/events/:eventId/ticket-types', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const query = `
      SELECT 
        ticket_type_id, event_id, type_name, price, 
        quantity_available, quantity_sold, description,
        benefits, is_active, sales_start_date, sales_end_date,
        created_at, updated_at
      FROM tickettypes
      WHERE event_id = $1 AND is_active = true
    `;
    
    const result = await pool.query(query, [eventId]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching ticket types:', err);
    res.status(500).json({ message: 'Server error while fetching ticket types' });
  }
});

// Register for event (purchase ticket)
router.post('/events/:eventId/register', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const { 
      ticket_type_id, 
      quantity, 
      payment_method, 
      total_amount, 
      special_requirements 
    } = req.body;
    
    // Start transaction
    await client.query('BEGIN');
    
    // 1. Get attendee_id from user_id
    const attendeeQuery = `
      SELECT attendee_id FROM attendees WHERE user_id = $1
    `;
    const attendeeResult = await client.query(attendeeQuery, [userId]);
    
    if (attendeeResult.rows.length === 0) {
      return res.status(404).json({ message: 'Attendee not found for this user' });
    }
    
    const attendeeId = attendeeResult.rows[0].attendee_id;
    
    // 2. Get event and ticket information
    const eventQuery = `
      SELECT e.event_name, e.event_date, e.venue_name, tt.type_name, tt.price
      FROM events e
      JOIN tickettypes tt ON e.event_id = tt.event_id
      WHERE e.event_id = $1 AND tt.ticket_type_id = $2
    `;
    const eventResult = await client.query(eventQuery, [eventId, ticket_type_id]);
    
    if (eventResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Event or ticket type not found' });
    }
    
    const eventInfo = eventResult.rows[0];
    
    // 3. Check ticket availability
    const availabilityQuery = `
      SELECT quantity_available, quantity_sold
      FROM tickettypes
      WHERE ticket_type_id = $1
    `;
    const availabilityResult = await client.query(availabilityQuery, [ticket_type_id]);
    
    const available = availabilityResult.rows[0].quantity_available - availabilityResult.rows[0].quantity_sold;
    
    if (available < quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `Only ${available} tickets available` });
    }
    
    // 4. Generate QR code (unique registration code)
    const registrationCode = `event-${eventId}-user-${userId}-${Date.now()}`;
    const qrCodeDataUrl = await QRCode.toDataURL(registrationCode);
    
    // 5. Create registration
    const registrationQuery = `
      INSERT INTO eventregistrations (
        event_id, attendee_id, registration_date, ticket_quantity,
        total_amount, payment_status, payment_method, payment_reference,
        special_requirements, qr_code, status
      ) VALUES ($1, $2, NOW(), $3, $4, 'paid', $5, $6, $7, $8, 'confirmed')
      RETURNING registration_id
    `;
    
    const paymentReference = uuidv4();
    
    const registrationResult = await client.query(registrationQuery, [
      eventId,
      attendeeId,
      quantity,
      total_amount,
      payment_method,
      paymentReference,
      special_requirements || null,
      registrationCode
    ]);
    
    const registrationId = registrationResult.rows[0].registration_id;
    
    // 6. Update ticket type sold count
    const updateTicketQuery = `
      UPDATE tickettypes
      SET quantity_sold = quantity_sold + $1
      WHERE ticket_type_id = $2
    `;
    
    await client.query(updateTicketQuery, [quantity, ticket_type_id]);
    
    // 7. Get user email for notification
    const userQuery = `
      SELECT u.email, a.full_name
      FROM users u
      JOIN attendees a ON u.user_id = a.user_id
      WHERE a.attendee_id = $1
    `;
    
    const userResult = await client.query(userQuery, [attendeeId]);
    const userEmail = userResult.rows[0].email;
    const fullName = userResult.rows[0].full_name;
    
    // Commit transaction
    await client.query('COMMIT');
    
    // 8. Send email notification
    const emailSubject = `Ticket Confirmation: ${eventInfo.event_name}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4a6cf7;">Your Ticket is Confirmed!</h2>
        <p>Hello ${fullName},</p>
        <p>Thank you for purchasing tickets to <strong>${eventInfo.event_name}</strong>.</p>
        
        <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Ticket Details:</h3>
          <p><strong>Event:</strong> ${eventInfo.event_name}</p>
          <p><strong>Date:</strong> ${new Date(eventInfo.event_date).toLocaleDateString()}</p>
          <p><strong>Venue:</strong> ${eventInfo.venue_name}</p>
          <p><strong>Ticket Type:</strong> ${eventInfo.type_name}</p>
          <p><strong>Quantity:</strong> ${quantity}</p>
          <p><strong>Total Paid:</strong> $${total_amount.toFixed(2)}</p>
          <p><strong>Registration ID:</strong> ${registrationId}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <p><strong>Your Ticket QR Code:</strong></p>
          <img src="${qrCodeDataUrl}" alt="Ticket QR Code" style="max-width: 200px;">
          <p style="font-size: 12px; color: #666;">${registrationCode}</p>
        </div>
        
        <p>Please bring this QR code with you to the event for check-in.</p>
        <p>If you have any questions, please contact the event organizer.</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666;">
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    `;
    
    try {
      // In development, log the email rather than sending it
      // In production, use a real email service
      await mockEmailSender(userEmail, emailSubject, emailHtml);
    } catch (emailErr) {
      console.error('Error sending confirmation email:', emailErr);
      // Continue even if email fails
    }
    
    res.status(201).json({
      registration_id: registrationId,
      event_id: eventId,
      event_name: eventInfo.event_name,
      ticket_type: eventInfo.type_name,
      quantity: quantity,
      total_amount: total_amount,
      payment_status: 'paid',
      qr_code: registrationCode,
      created_at: new Date().toISOString()
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error registering for event:', err);
    res.status(500).json({ message: 'Server error while processing registration' });
  } finally {
    client.release();
  }
});

module.exports = router;
