const express = require('express');
const router = express.Router();
const db = require('../db');
const PaystackService = require('../services/PaystackService');
const authenticateToken = require('../middleware/auth');

/**
 * Initialize payment transaction
 */
router.post('/initialize', authenticateToken, async (req, res) => {
  try {
    const { event_id, ticket_type_id, ticket_quantity, customer_email, customer_name: provided_customer_name, customer_phone } = req.body;
    const user_id = req.user.user_id;

    // Validate required fields
    if (!event_id || !ticket_type_id || !ticket_quantity) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: event_id, ticket_type_id, ticket_quantity'
      });
    }

    // Get ticket type details
    const ticketQuery = `
      SELECT tt.*, e.event_name 
      FROM tickettypes tt
      JOIN events e ON tt.event_id = e.event_id
      WHERE tt.ticket_type_id = $1 AND tt.event_id = $2
    `;
    const ticketResult = await db.query(ticketQuery, [ticket_type_id, event_id]);

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket type not found'
      });
    }

    const ticketType = ticketResult.rows[0];
    const totalAmount = parseFloat(ticketType.price) * parseInt(ticket_quantity);

    // Check ticket availability
    const availableTickets = ticketType.quantity_available - (ticketType.quantity_sold || 0);
    if (ticket_quantity > availableTickets) {
      return res.status(400).json({
        success: false,
        message: `Only ${availableTickets} tickets available`
      });
    }

    // Generate unique reference
    const reference = PaystackService.generateReference('EVT');

    // Get user email if not provided
    let email = customer_email;
    let customer_name = provided_customer_name; // Use let so we can reassign it
    
    if (!email) {
      // Get email from users table and name from attendees table if it exists
      const userQuery = 'SELECT email FROM users WHERE user_id = $1';
      const userResult = await db.query(userQuery, [user_id]);
      if (userResult.rows.length > 0) {
        email = userResult.rows[0].email;
        
        // Try to get full name from attendees table
        if (!customer_name) {
          const attendeeQuery = 'SELECT full_name FROM attendees WHERE user_id = $1';
          const attendeeResult = await db.query(attendeeQuery, [user_id]);
          if (attendeeResult.rows.length > 0) {
            customer_name = attendeeResult.rows[0].full_name;
          } else {
            // Fallback to email as name
            customer_name = email;
          }
        }
      }
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Customer email is required'
      });
    }

    // Create payment record
    const paymentQuery = `
      INSERT INTO payments (
        event_id, user_id, paystack_reference, amount, currency,
        customer_email, customer_name, customer_phone, payment_status,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING payment_id
    `;

    const metadata = {
      event_id,
      event_name: ticketType.event_name,
      ticket_type_id,
      ticket_type_name: ticketType.type_name,
      ticket_quantity,
      user_id
    };

    const paymentResult = await db.query(paymentQuery, [
      event_id,
      user_id,
      reference,
      totalAmount,
      'GHS',
      email,
      customer_name || '',
      customer_phone || '',
      'pending',
      JSON.stringify(metadata)
    ]);

    const payment_id = paymentResult.rows[0].payment_id;

    // Initialize Paystack transaction
    const callbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/callback`;
    
    const paystackResponse = await PaystackService.initializeTransaction({
      email,
      amount: totalAmount,
      reference,
      currency: 'GHS',
      callback_url: callbackUrl,
      metadata: {
        ...metadata,
        payment_id,
        custom_fields: [
          {
            display_name: 'Event',
            variable_name: 'event_name',
            value: ticketType.event_name
          },
          {
            display_name: 'Ticket Type',
            variable_name: 'ticket_type',
            value: ticketType.type_name
          }
        ]
      }
    });

    // Update payment record with Paystack data
    await db.query(
      'UPDATE payments SET paystack_access_code = $1 WHERE payment_id = $2',
      [paystackResponse.access_code, payment_id]
    );

    res.json({
      success: true,
      data: {
        payment_id,
        reference,
        authorization_url: paystackResponse.authorization_url,
        access_code: paystackResponse.access_code,
        amount: totalAmount,
        currency: 'GHS',
        event_name: ticketType.event_name,
        ticket_type: ticketType.type_name,
        quantity: ticket_quantity
      }
    });

  } catch (error) {
    console.error('Payment initialization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize payment',
      error: error.message
    });
  }
});

/**
 * Verify payment transaction
 */
router.post('/verify/:reference', authenticateToken, async (req, res) => {
  try {
    const { reference } = req.params;
    const user_id = req.user.user_id;

    // Get payment record
    const paymentQuery = 'SELECT * FROM payments WHERE paystack_reference = $1 AND user_id = $2';
    const paymentResult = await db.query(paymentQuery, [reference, user_id]);

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    const payment = paymentResult.rows[0];

    // Verify with Paystack
    const verification = await PaystackService.verifyTransaction(reference);

    if (verification.success && verification.status === 'success') {
      // Update payment record
      await db.query(`
        UPDATE payments 
        SET 
          payment_status = 'success',
          paid_at = $1,
          verified_at = CURRENT_TIMESTAMP,
          paystack_transaction_id = $2,
          gateway_response = $3,
          channel = $4,
          authorization_code = $5
        WHERE payment_id = $6
      `, [
        verification.paid_at,
        verification.data.id,
        verification.gateway_response,
        verification.channel,
        verification.authorization?.authorization_code || null,
        payment.payment_id
      ]);

      // Create event registration
      const metadata = JSON.parse(payment.metadata);
      
      // Get attendee_id for the user
      const attendeeQuery = 'SELECT attendee_id FROM attendees WHERE user_id = $1';
      const attendeeResult = await db.query(attendeeQuery, [payment.user_id]);
      
      if (attendeeResult.rows.length === 0) {
        throw new Error('Attendee record not found for user');
      }
      
      const attendee_id = attendeeResult.rows[0].attendee_id;

      const registrationQuery = `
        INSERT INTO eventregistrations (
          event_id, attendee_id, ticket_quantity,
          total_amount, payment_status, payment_method, payment_reference,
          registration_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        RETURNING registration_id
      `;

      const registrationResult = await db.query(registrationQuery, [
        payment.event_id,
        attendee_id,
        metadata.ticket_quantity,
        payment.amount,
        'completed',
        verification.channel || 'paystack',
        reference
      ]);

      const registration_id = registrationResult.rows[0].registration_id;

      // Update payment with registration ID
      await db.query(
        'UPDATE payments SET registration_id = $1 WHERE payment_id = $2',
        [registration_id, payment.payment_id]
      );

      // Generate QR code for the registration
      const qrCode = `EVT_${registration_id}_${Date.now()}`;
      await db.query(
        'UPDATE eventregistrations SET qr_code = $1 WHERE registration_id = $2',
        [qrCode, registration_id]
      );

      res.json({
        success: true,
        message: 'Payment verified successfully',
        data: {
          payment_status: 'success',
          registration_id,
          amount: verification.amount,
          currency: verification.currency,
          paid_at: verification.paid_at,
          gateway_response: verification.gateway_response,
          qr_code: qrCode
        }
      });

    } else {
      // Update payment status as failed
      await db.query(
        'UPDATE payments SET payment_status = $1, verified_at = CURRENT_TIMESTAMP WHERE payment_id = $2',
        ['failed', payment.payment_id]
      );

      res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        data: {
          payment_status: verification.status || 'failed'
        }
      });
    }

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message
    });
  }
});

/**
 * Get payment status
 */
router.get('/status/:reference', authenticateToken, async (req, res) => {
  try {
    const { reference } = req.params;
    const user_id = req.user.user_id;

    const query = `
      SELECT 
        p.*,
        er.registration_id,
        er.qr_code,
        e.event_name
      FROM payments p
      LEFT JOIN eventregistrations er ON p.registration_id = er.registration_id
      LEFT JOIN events e ON p.event_id = e.event_id
      WHERE p.paystack_reference = $1 AND p.user_id = $2
    `;

    const result = await db.query(query, [reference, user_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const payment = result.rows[0];
    const metadata = JSON.parse(payment.metadata || '{}');

    res.json({
      success: true,
      data: {
        payment_id: payment.payment_id,
        reference: payment.paystack_reference,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.payment_status,
        event_name: payment.event_name,
        ticket_type: metadata.ticket_type_name,
        quantity: metadata.ticket_quantity,
        registration_id: payment.registration_id,
        qr_code: payment.qr_code,
        initiated_at: payment.initiated_at,
        paid_at: payment.paid_at
      }
    });

  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment status',
      error: error.message
    });
  }
});

/**
 * Paystack webhook endpoint
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const body = req.body.toString();

    // Verify webhook signature
    if (!PaystackService.verifyWebhookSignature(body, signature)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    const event = JSON.parse(body);
    console.log('Paystack webhook received:', event.event);

    // Handle different webhook events
    switch (event.event) {
      case 'charge.success':
        await handleSuccessfulCharge(event.data);
        break;
      case 'charge.failed':
        await handleFailedCharge(event.data);
        break;
      default:
        console.log('Unhandled webhook event:', event.event);
    }

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
});

/**
 * Handle successful charge webhook
 */
async function handleSuccessfulCharge(data) {
  try {
    const reference = data.reference;
    
    // Update payment status
    await db.query(`
      UPDATE payments 
      SET 
        payment_status = 'success',
        paid_at = $1,
        paystack_transaction_id = $2,
        gateway_response = $3,
        channel = $4
      WHERE paystack_reference = $5 AND payment_status = 'pending'
    `, [
      data.paid_at,
      data.id,
      data.gateway_response,
      data.channel,
      reference
    ]);

    console.log('Payment marked as successful:', reference);
  } catch (error) {
    console.error('Error handling successful charge:', error);
  }
}

/**
 * Handle failed charge webhook
 */
async function handleFailedCharge(data) {
  try {
    const reference = data.reference;
    
    // Update payment status
    await db.query(
      'UPDATE payments SET payment_status = $1 WHERE paystack_reference = $2',
      ['failed', reference]
    );

    console.log('Payment marked as failed:', reference);
  } catch (error) {
    console.error('Error handling failed charge:', error);
  }
}

/**
 * Get Paystack public key for frontend
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      public_key: PaystackService.getPublicKey(),
      currency: 'GHS'
    }
  });
});

module.exports = router;
