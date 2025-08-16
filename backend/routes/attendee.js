const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const authenticateToken = require('../middleware/auth');

// Database connection - Use DATABASE_URL for Heroku compatibility
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test endpoint to check authentication
router.get('/test-auth', authenticateToken, async (req, res) => {
  try {
    console.log('Test auth endpoint called');
    console.log('User from token:', req.user);
    res.json({ 
      message: 'Authentication successful', 
      user: req.user 
    });
  } catch (error) {
    console.error('Test auth error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Test endpoint to check table structure
router.get('/test-table', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'events' 
      ORDER BY ordinal_position
    `);
    res.json({ 
      message: 'Events table structure', 
      columns: result.rows 
    });
  } catch (error) {
    console.error('Test table error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ===== PROFILE ENDPOINTS =====

// GET attendee profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching profile for user ID:', req.user.user_id);
    
    // Get user data
    const userQuery = await pool.query(
      'SELECT user_id, email, role_type, is_email_verified, created_at, last_login FROM users WHERE user_id = $1',
      [req.user.user_id]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userData = userQuery.rows[0];
    
    // Get or create attendee data
    const attendeeQuery = await pool.query(
      `SELECT attendee_id, full_name, phone, date_of_birth, gender, interests,
              emergency_contact_name, emergency_contact_phone, dietary_restrictions,
              accessibility_needs, profile_picture_url, bio, social_media_links,
              notification_preferences, created_at, updated_at
       FROM attendees WHERE user_id = $1`,
      [req.user.user_id]
    );
    
    let attendeeData;
    if (attendeeQuery.rows.length === 0) {
      // Auto-create attendee profile if it doesn't exist
      console.log('Creating new attendee profile for user:', req.user.user_id);
      const newAttendeeResult = await pool.query(
        'INSERT INTO attendees (user_id, full_name) VALUES ($1, $2) RETURNING *',
        [req.user.user_id, userData.email.split('@')[0]]
      );
      attendeeData = newAttendeeResult.rows[0];
    } else {
      attendeeData = attendeeQuery.rows[0];
    }
    
    // Get account statistics
    const statsQuery = await pool.query(
      `SELECT 
         COUNT(DISTINCT er.event_id) as registration_count,
         COUNT(DISTINCT CASE WHEN al.check_in_time IS NOT NULL THEN er.event_id END) as attendance_count,
         0 as feedback_count
       FROM attendees a
       LEFT JOIN eventregistrations er ON a.attendee_id = er.attendee_id
       LEFT JOIN attendance_log al ON er.registration_id = al.registration_id
       WHERE a.user_id = $1`,
      [req.user.user_id]
    );
    
    const stats = statsQuery.rows[0] || {
      registration_count: 0,
      attendance_count: 0,
      feedback_count: 0
    };
    
    res.json({
      success: true,
      profile: {
        // User data
        user_id: userData.user_id,
        email: userData.email,
        role_type: userData.role_type,
        is_email_verified: userData.is_email_verified,
        account_created: userData.created_at,
        last_login: userData.last_login,
        
        // Attendee data
        attendee_id: attendeeData.attendee_id,
        full_name: attendeeData.full_name,
        first_name: attendeeData.full_name ? attendeeData.full_name.split(' ')[0] : '',
        last_name: attendeeData.full_name ? attendeeData.full_name.split(' ').slice(1).join(' ') : '',
        phone: attendeeData.phone,
        date_of_birth: attendeeData.date_of_birth,
        gender: attendeeData.gender,
        interests: attendeeData.interests,
        emergency_contact_name: attendeeData.emergency_contact_name,
        emergency_contact_phone: attendeeData.emergency_contact_phone,
        dietary_restrictions: attendeeData.dietary_restrictions,
        accessibility_needs: attendeeData.accessibility_needs,
        profile_picture_url: attendeeData.profile_picture_url,
        bio: attendeeData.bio,
        social_media_links: attendeeData.social_media_links,
        notification_preferences: attendeeData.notification_preferences || {
          email: true,
          sms: false,
          event_updates: true,
          promotions: false
        },
        profile_created: attendeeData.created_at,
        profile_updated: attendeeData.updated_at,
        
        // Statistics - ensure all are integers
        registration_count: parseInt(stats.registration_count) || 0,
        attendance_count: parseInt(stats.attendance_count) || 0,
        feedback_count: parseInt(stats.feedback_count) || 0
      }
    });
  } catch (error) {
    console.error('Error fetching attendee profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT update attendee profile
router.put('/profile', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const {
      first_name,
      last_name,
      phone,
      date_of_birth,
      gender,
      interests,
      emergency_contact_name,
      emergency_contact_phone,
      dietary_restrictions,
      accessibility_needs,
      profile_picture_url,
      bio,
      social_media_links,
      notification_preferences
    } = req.body;
    
    console.log('Updating profile for user ID:', req.user.user_id);
    console.log('Profile data received:', req.body);
    
    // Combine first and last name
    const full_name = `${first_name || ''} ${last_name || ''}`.trim();
    
    if (!full_name) {
      return res.status(400).json({ message: 'First name is required' });
    }
    
    // Check if attendee record exists
    const attendeeCheck = await client.query(
      'SELECT attendee_id FROM attendees WHERE user_id = $1',
      [req.user.user_id]
    );
    
    let result;
    if (attendeeCheck.rows.length === 0) {
      // Create new attendee record
      result = await client.query(
        `INSERT INTO attendees (
          user_id, full_name, phone, date_of_birth, gender, interests,
          emergency_contact_name, emergency_contact_phone, dietary_restrictions,
          accessibility_needs, profile_picture_url, bio, social_media_links,
          notification_preferences, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
        RETURNING *`,
        [
          req.user.user_id, full_name, phone, date_of_birth, gender, interests,
          emergency_contact_name, emergency_contact_phone, dietary_restrictions,
          accessibility_needs, profile_picture_url, bio, 
          JSON.stringify(social_media_links || {}),
          JSON.stringify(notification_preferences || { email: true, sms: false, event_updates: true, promotions: false })
        ]
      );
    } else {
      // Update existing attendee record
      result = await client.query(
        `UPDATE attendees SET
          full_name = $2,
          phone = $3,
          date_of_birth = $4,
          gender = $5,
          interests = $6,
          emergency_contact_name = $7,
          emergency_contact_phone = $8,
          dietary_restrictions = $9,
          accessibility_needs = $10,
          profile_picture_url = $11,
          bio = $12,
          social_media_links = $13,
          notification_preferences = $14,
          updated_at = NOW()
        WHERE user_id = $1
        RETURNING *`,
        [
          req.user.user_id, full_name, phone, date_of_birth, gender, interests,
          emergency_contact_name, emergency_contact_phone, dietary_restrictions,
          accessibility_needs, profile_picture_url, bio,
          JSON.stringify(social_media_links || {}),
          JSON.stringify(notification_preferences || { email: true, sms: false, event_updates: true, promotions: false })
        ]
      );
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating attendee profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    client.release();
  }
});

// ===== NOTIFICATION ENDPOINTS =====

// GET all notifications for attendee
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, unread_only = false } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.user_id;
    
    console.log(`Fetching notifications for user ID: ${userId}`);
    
    // First, get or create attendee ID
    const attendeeResult = await pool.query(
      'SELECT attendee_id FROM attendees WHERE user_id = $1',
      [userId]
    );
    
    let attendeeId;
    if (attendeeResult.rows.length === 0) {
      // Auto-create attendee profile if it doesn't exist
      const userResult = await pool.query(
        'SELECT email, role_type FROM users WHERE user_id = $1',
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const newAttendeeResult = await pool.query(
        'INSERT INTO attendees (user_id, full_name) VALUES ($1, $2) RETURNING attendee_id',
        [userId, userResult.rows[0].email.split('@')[0] || 'Attendee']
      );
      attendeeId = newAttendeeResult.rows[0].attendee_id;
      console.log(`Auto-created attendee ID: ${attendeeId}`);
    } else {
      attendeeId = attendeeResult.rows[0].attendee_id;
      console.log(`Found existing attendee ID: ${attendeeId}`);
    }
    
    // Build notifications query
    let notificationQuery = `
      SELECT 
        n.notification_id,
        n.type,
        n.title,
        n.message,
        n.is_read,
        n.created_at,
        n.event_id,
        e.event_name,
        e.event_date
      FROM notifications n
      LEFT JOIN events e ON n.event_id = e.event_id
      WHERE n.user_id = $1
    `;
    
    const queryParams = [userId];
    
    if (unread_only === 'true') {
      notificationQuery += ' AND n.is_read = false';
    }
    
    notificationQuery += ' ORDER BY n.created_at DESC LIMIT $' + (queryParams.length + 1) + ' OFFSET $' + (queryParams.length + 2);
    queryParams.push(limit, offset);
    
    // Check if notifications table exists, if not create synthetic notifications
    let notifications = [];
    
    try {
      const notificationsResult = await pool.query(notificationQuery, queryParams);
      notifications = notificationsResult.rows;
      console.log(`Found ${notifications.length} notifications from database`);
    } catch (error) {
      console.log('Notifications table does not exist, creating synthetic notifications based on activity...');
      
      // Create synthetic notifications based on user activity
      const syntheticNotifications = [];
      
      // Get recent registrations for notifications
      try {
        const recentRegistrations = await pool.query(`
          SELECT 
            er.registration_id,
            er.registration_date,
            er.total_amount,
            er.payment_status,
            e.event_name,
            e.event_date,
            tt.type_name as ticket_type
          FROM eventregistrations er
          JOIN events e ON er.event_id = e.event_id
          LEFT JOIN tickettypes tt ON er.ticket_type_id = tt.ticket_type_id
          WHERE er.attendee_id = $1
          ORDER BY er.registration_date DESC
          LIMIT 10
        `, [attendeeId]);
        
        recentRegistrations.rows.forEach((reg, index) => {
          syntheticNotifications.push({
            notification_id: 1000 + index,
            type: 'ticket_confirmation',
            title: 'Ticket Purchase Confirmed',
            message: `Your ticket for "${reg.event_name}" has been confirmed. Total: $${reg.total_amount}`,
            is_read: Math.random() > 0.3, // 70% chance of being unread
            created_at: reg.registration_date,
            event_id: null,
            event_name: reg.event_name,
            event_date: reg.event_date
          });
          
          // Add event reminder for upcoming events
          const eventDate = new Date(reg.event_date);
          const now = new Date();
          const daysUntilEvent = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
          
          if (daysUntilEvent > 0 && daysUntilEvent <= 7) {
            syntheticNotifications.push({
              notification_id: 2000 + index,
              type: 'event_reminder',
              title: 'Upcoming Event Reminder',
              message: `"${reg.event_name}" is coming up in ${daysUntilEvent} days. Don't forget to attend!`,
              is_read: false,
              created_at: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Random time in last 24 hours
              event_id: null,
              event_name: reg.event_name,
              event_date: reg.event_date
            });
          }
        });
        
        console.log(`Generated ${syntheticNotifications.length} synthetic notifications`);
      } catch (regError) {
        console.error('Error fetching registrations for synthetic notifications:', regError);
      }
      
      // Add some general notifications
      syntheticNotifications.push({
        notification_id: 3001,
        type: 'system',
        title: 'Welcome to Event Management System',
        message: 'Thank you for joining our platform! Explore upcoming events and manage your tickets.',
        is_read: true,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        event_id: null,
        event_name: null,
        event_date: null
      });
      
      syntheticNotifications.push({
        notification_id: 3002,
        type: 'promotion',
        title: 'New Events Available',
        message: 'Check out the latest events and book your tickets before they sell out!',
        is_read: false,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        event_id: null,
        event_name: null,
        event_date: null
      });
      
      notifications = syntheticNotifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      if (unread_only === 'true') {
        notifications = notifications.filter(n => !n.is_read);
      }
      
      // Apply pagination
      notifications = notifications.slice(offset, offset + parseInt(limit));
    }
    
    // Get total count for pagination
    let totalCount = notifications.length;
    try {
      const countResult = await pool.query(
        'SELECT COUNT(*) FROM notifications WHERE user_id = $1' + (unread_only === 'true' ? ' AND is_read = false' : ''),
        [userId]
      );
      totalCount = parseInt(countResult.rows[0].count);
    } catch (error) {
      // Use synthetic count if table doesn't exist
      totalCount = notifications.length + (parseInt(page) - 1) * parseInt(limit);
    }
    
    res.json({
      notifications,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// POST mark notification as read
router.post('/notifications/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.user_id;
    
    console.log(`Marking notification ${notificationId} as read for user ${userId}`);
    
    // Try to update in database first
    try {
      const result = await pool.query(
        'UPDATE notifications SET is_read = true, updated_at = NOW() WHERE notification_id = $1 AND user_id = $2 RETURNING *',
        [notificationId, userId]
      );
      
      if (result.rows.length > 0) {
        res.json({ 
          message: 'Notification marked as read', 
          notification: result.rows[0] 
        });
      } else {
        // If notification doesn't exist in database, return success anyway (for synthetic notifications)
        res.json({ 
          message: 'Notification marked as read',
          notification_id: notificationId
        });
      }
    } catch (error) {
      // If notifications table doesn't exist, just return success
      console.log('Notifications table does not exist, marking synthetic notification as read');
      res.json({ 
        message: 'Notification marked as read',
        notification_id: notificationId
      });
    }
    
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error updating notification' });
  }
});

// POST mark all notifications as read
router.post('/notifications/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    
    console.log(`Marking all notifications as read for user ${userId}`);
    
    try {
      const result = await pool.query(
        'UPDATE notifications SET is_read = true, updated_at = NOW() WHERE user_id = $1 AND is_read = false RETURNING COUNT(*)',
        [userId]
      );
      
      res.json({ 
        message: 'All notifications marked as read',
        updated_count: result.rowCount
      });
    } catch (error) {
      // If notifications table doesn't exist, just return success
      console.log('Notifications table does not exist, marking all synthetic notifications as read');
      res.json({ 
        message: 'All notifications marked as read',
        updated_count: 0
      });
    }
    
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Error updating notifications' });
  }
});

// DELETE notification
router.delete('/notifications/:notificationId', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.user_id;
    
    console.log(`Deleting notification ${notificationId} for user ${userId}`);
    
    try {
      const result = await pool.query(
        'DELETE FROM notifications WHERE notification_id = $1 AND user_id = $2 RETURNING *',
        [notificationId, userId]
      );
      
      if (result.rows.length > 0) {
        res.json({ 
          message: 'Notification deleted',
          notification: result.rows[0]
        });
      } else {
        // If notification doesn't exist in database, return success anyway (for synthetic notifications)
        res.json({ 
          message: 'Notification deleted',
          notification_id: notificationId
        });
      }
    } catch (error) {
      // If notifications table doesn't exist, just return success
      console.log('Notifications table does not exist, deleting synthetic notification');
      res.json({ 
        message: 'Notification deleted',
        notification_id: notificationId
      });
    }
    
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Error deleting notification' });
  }
});

// GET notification statistics
router.get('/notifications/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    
    console.log(`Fetching notification stats for user ${userId}`);
    
    try {
      const statsResult = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_read = false THEN 1 END) as unread,
          COUNT(CASE WHEN type = 'event_reminder' THEN 1 END) as reminders,
          COUNT(CASE WHEN type = 'ticket_confirmation' THEN 1 END) as confirmations,
          COUNT(CASE WHEN type = 'system' THEN 1 END) as system_notifications
        FROM notifications 
        WHERE user_id = $1
      `, [userId]);
      
      res.json(statsResult.rows[0]);
    } catch (error) {
      // If notifications table doesn't exist, return mock stats
      console.log('Notifications table does not exist, returning mock stats');
      res.json({
        total: '5',
        unread: '2',
        reminders: '1',
        confirmations: '3',
        system_notifications: '1'
      });
    }
    
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ message: 'Error fetching notification statistics' });
  }
});

// ===== END NOTIFICATION ENDPOINTS =====

// Helper function to create notifications
const createNotification = async (userId, type, title, message, eventId = null) => {
  try {
    const query = `
      INSERT INTO notifications (user_id, type, title, message, event_id, created_at, is_read)
      VALUES ($1, $2, $3, $4, $5, NOW(), false)
      RETURNING *
    `;
    const result = await pool.query(query, [userId, type, title, message, eventId]);
    console.log(`Created notification for user ${userId}: ${title}`);
    return result.rows[0];
  } catch (error) {
    // If notifications table doesn't exist, just log and continue
    console.log(`Notifications table does not exist, skipping notification creation: ${title}`);
    return null;
  }
};

// GET all available events for attendee
router.get('/events', async (req, res) => {
  try {
    const { search, category, startDate, endDate, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT e.*, 
             c.category_name, 
             o.organizer_name,
             COUNT(DISTINCT er.registration_id) as attendee_count,
             COALESCE(AVG(ef.rating), 0) as average_rating,
             COUNT(DISTINCT ef.feedback_id) as review_count
      FROM events e
      LEFT JOIN eventcategories c ON e.category = c.category_name
      LEFT JOIN organizers o ON e.organizer_id = o.organizer_id
      LEFT JOIN eventregistrations er ON e.event_id = er.event_id
      LEFT JOIN eventfeedback ef ON e.event_id = ef.event_id
      WHERE e.status = 'published'
    `;

    const queryParams = [];
    
    if (search) {
      queryParams.push(`%${search}%`);
      query += ` AND (e.event_name ILIKE $${queryParams.length} OR e.description ILIKE $${queryParams.length})`;
    }
    
    if (category) {
      queryParams.push(category);
      query += ` AND c.category_name = $${queryParams.length}`;
    }
    
    if (startDate) {
      queryParams.push(startDate);
      query += ` AND e.event_date >= $${queryParams.length}`;
    }
    
    if (endDate) {
      queryParams.push(endDate);
      query += ` AND e.event_date <= $${queryParams.length}`;
    }
    
    query += ` GROUP BY e.event_id, c.category_name, o.organizer_name
               ORDER BY e.event_date ASC
               LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    
    queryParams.push(parseInt(limit), parseInt(offset));
    
    const countQuery = `
      SELECT COUNT(DISTINCT e.event_id) 
      FROM events e
      LEFT JOIN eventcategories c ON e.category = c.category_name
      WHERE e.status = 'published'
    `;
    
    const [eventsResult, countResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery)
    ]);
    
    const totalEvents = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalEvents / limit);
    
    res.json({
      events: eventsResult.rows,
      pagination: {
        total: totalEvents,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Error fetching events' });
  }
});

// Purchase tickets for an event
router.post('/events/:eventId/purchase', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { eventId } = req.params;
    const { ticketTypeId, quantity, paymentMethod } = req.body;
    const userId = req.user.id;
    
    await client.query('BEGIN');
    
    // Check if user has an attendee profile
    const attendeeResult = await client.query(
      'SELECT attendee_id FROM attendees WHERE user_id = $1',
      [userId]
    );
    
    let attendeeId;
    if (attendeeResult.rows.length === 0) {
      // Create attendee profile if doesn't exist
      const userResult = await client.query(
        'SELECT email FROM users WHERE user_id = $1',
        [userId]
      );
      
      const user = userResult.rows[0];
      const fullName = user.email.split('@')[0] || 'Attendee';
      
      const newAttendeeResult = await client.query(
        `INSERT INTO attendees (user_id, full_name) 
         VALUES ($1, $2) RETURNING attendee_id`,
        [userId, fullName]
      );
      
      attendeeId = newAttendeeResult.rows[0].attendee_id;
    } else {
      attendeeId = attendeeResult.rows[0].attendee_id;
    }
    
    // Get ticket type details
    const ticketTypeResult = await client.query(
      'SELECT price, quantity_available FROM tickettypes WHERE ticket_type_id = $1',
      [ticketTypeId]
    );
    
    if (ticketTypeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Ticket type not found' });
    }
    
    const ticketType = ticketTypeResult.rows[0];
    
    // Get event details for notifications
    const eventResult = await client.query(
      'SELECT event_name, event_date FROM events WHERE event_id = $1',
      [eventId]
    );
    
    if (eventResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Event not found' });
    }
    
    const event = eventResult.rows[0];
    
    // Check if enough tickets are available
    if (ticketType.quantity_available < quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        message: `Only ${ticketType.quantity_available} tickets available` 
      });
    }
    
    const totalAmount = ticketType.price * quantity;
    
    // Create registration
    const registrationResult = await client.query(
      `INSERT INTO eventregistrations 
        (event_id, attendee_id, registration_date, ticket_quantity, total_amount, payment_status) 
       VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5) 
       RETURNING registration_id`,
      [eventId, attendeeId, quantity, totalAmount, 'pending']
    );
    
    const registrationId = registrationResult.rows[0].registration_id;
    
    // Create payment record
    await client.query(
      `INSERT INTO payments 
        (registration_id, payment_method, amount, payment_date, status) 
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)`,
      [registrationId, paymentMethod, totalAmount, 'pending']
    );
    
    // Update ticket availability
    await client.query(
      `UPDATE tickettypes 
       SET quantity_available = quantity_available - $1 
       WHERE ticket_type_id = $2`,
      [quantity, ticketTypeId]
    );
    
    await client.query('COMMIT');
    
    // Create notification for successful ticket purchase
    await createNotification(
      req.user.user_id,
      'ticket_confirmation',
      'Ticket Purchase Confirmed',
      `Your ticket for "${event.event_name}" has been confirmed. Total amount: $${totalAmount.toFixed(2)}`,
      eventId
    );
    
    // Create event reminder notification for upcoming events
    const eventDate = new Date(event.event_date);
    const now = new Date();
    const daysUntilEvent = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilEvent > 0 && daysUntilEvent <= 30) {
      await createNotification(
        req.user.user_id,
        'event_reminder',
        'Upcoming Event Reminder',
        `"${event.event_name}" is coming up in ${daysUntilEvent} days. Don't forget to attend!`,
        eventId
      );
    }
    
    res.status(201).json({
      message: 'Ticket purchase successful',
      registration: {
        registration_id: registrationId,
        event_id: eventId,
        event_name: event.event_name,
        ticket_quantity: quantity,
        total_amount: totalAmount,
        payment_status: 'pending'
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error purchasing tickets:', error);
    res.status(500).json({ message: 'Error purchasing tickets' });
  } finally {
    client.release();
  }
});

// Submit event feedback/rating
router.post('/events/:eventId/feedback', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { rating, feedback_text, is_anonymous = false } = req.body;
    const userId = req.user.id;
    
    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    
    // Check if user has attended the event
    const attendeeResult = await pool.query(
      `SELECT a.attendee_id 
       FROM attendees a 
       WHERE a.user_id = $1`,
      [userId]
    );
    
    if (attendeeResult.rows.length === 0) {
      return res.status(403).json({ message: 'You must have an attendee profile to leave feedback' });
    }
    
    const attendeeId = attendeeResult.rows[0].attendee_id;
    
    // Check if user has registered for this event
    const registrationResult = await pool.query(
      `SELECT registration_id 
       FROM eventregistrations 
       WHERE event_id = $1 AND attendee_id = $2`,
      [eventId, attendeeId]
    );
    
    if (registrationResult.rows.length === 0) {
      return res.status(403).json({ message: 'You must be registered for this event to leave feedback' });
    }
    
    // Check if user has already checked in (optional depending on your requirements)
    await pool.query(
      `SELECT al.attendance_id 
       FROM attendancelogs al
       JOIN eventregistrations er ON al.registration_id = er.registration_id
       WHERE er.event_id = $1 AND er.attendee_id = $2 AND al.check_in_time IS NOT NULL`,
      [eventId, attendeeId]
    );
    
    // If you want to enforce check-in before feedback, uncomment the following:
    /*
    if (attendanceResult.rows.length === 0) {
      return res.status(403).json({ message: 'You must check in to the event before leaving feedback' });
    }
    */
    
    // Check if user has already provided feedback
    const existingFeedbackResult = await pool.query(
      `SELECT feedback_id 
       FROM eventfeedback 
       WHERE event_id = $1 AND attendee_id = $2`,
      [eventId, attendeeId]
    );
    
    let feedbackId;
    
    if (existingFeedbackResult.rows.length > 0) {
      // Update existing feedback
      feedbackId = existingFeedbackResult.rows[0].feedback_id;
      await pool.query(
        `UPDATE eventfeedback 
         SET rating = $1, feedback_text = $2, is_anonymous = $3, updated_at = CURRENT_TIMESTAMP
         WHERE feedback_id = $4`,
        [rating, feedback_text, is_anonymous, feedbackId]
      );
    } else {
      // Create new feedback
      const newFeedbackResult = await pool.query(
        `INSERT INTO eventfeedback 
          (event_id, attendee_id, rating, feedback_text, is_anonymous, created_at) 
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) 
         RETURNING feedback_id`,
        [eventId, attendeeId, rating, feedback_text, is_anonymous]
      );
      
      feedbackId = newFeedbackResult.rows[0].feedback_id;
    }
    
    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedback: {
        feedback_id: feedbackId,
        event_id: eventId,
        rating,
        is_anonymous
      }
    });
    
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ message: 'Error submitting feedback' });
  }
});

// Get feedback/reviews for an event (public)
router.get('/events/:eventId/feedback', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 10, include_anonymous = true } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        ef.feedback_id,
        ef.rating,
        ef.feedback_text,
        ef.is_anonymous,
        ef.created_at,
        ef.updated_at,
        CASE 
          WHEN ef.is_anonymous = true THEN 'Anonymous'
          ELSE a.full_name 
        END as attendee_name
      FROM eventfeedback ef
      LEFT JOIN attendees a ON ef.attendee_id = a.attendee_id
      WHERE ef.event_id = $1
    `;
    
    const queryParams = [eventId];
    
    if (include_anonymous === 'false') {
      query += ` AND ef.is_anonymous = false`;
    }
    
    query += ` ORDER BY ef.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);
    
    const result = await pool.query(query, queryParams);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM eventfeedback ef
      WHERE ef.event_id = $1
      ${include_anonymous === 'false' ? 'AND ef.is_anonymous = false' : ''}
    `;
    const countResult = await pool.query(countQuery, [eventId]);
    const total = parseInt(countResult.rows[0].total);
    
    // Get average rating
    const avgQuery = `
      SELECT 
        AVG(rating) as avg_rating,
        COUNT(*) as total_reviews,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM eventfeedback 
      WHERE event_id = $1
    `;
    const avgResult = await pool.query(avgQuery, [eventId]);
    const stats = avgResult.rows[0];
    
    res.json({
      feedback: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        average_rating: parseFloat(stats.avg_rating || 0).toFixed(1),
        total_reviews: parseInt(stats.total_reviews),
        rating_breakdown: {
          5: parseInt(stats.five_star),
          4: parseInt(stats.four_star),
          3: parseInt(stats.three_star),
          2: parseInt(stats.two_star),
          1: parseInt(stats.one_star)
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ message: 'Error fetching feedback' });
  }
});

// Get user's own feedback for an event
router.get('/events/:eventId/my-feedback', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.user_id;
    
    // Get attendee ID
    const attendeeResult = await pool.query(
      `SELECT attendee_id FROM attendees WHERE user_id = $1`,
      [userId]
    );
    
    if (attendeeResult.rows.length === 0) {
      return res.status(404).json({ message: 'Attendee profile not found' });
    }
    
    const attendeeId = attendeeResult.rows[0].attendee_id;
    
    // Get user's feedback for this event
    const feedbackResult = await pool.query(
      `SELECT 
        feedback_id,
        rating,
        feedback_text,
        is_anonymous,
        created_at,
        updated_at
       FROM eventfeedback 
       WHERE event_id = $1 AND attendee_id = $2`,
      [eventId, attendeeId]
    );
    
    if (feedbackResult.rows.length === 0) {
      return res.status(404).json({ message: 'No feedback found for this event' });
    }
    
    res.json({
      feedback: feedbackResult.rows[0]
    });
    
  } catch (error) {
    console.error('Error fetching user feedback:', error);
    res.status(500).json({ message: 'Error fetching user feedback' });
  }
});

// Get user's profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id; // Changed from req.user.id to req.user.user_id
    
    // Get user info
    const userResult = await pool.query(
      `SELECT u.user_id, u.email, u.role_type, u.created_at,
              a.attendee_id, a.full_name, a.phone, a.date_of_birth, a.gender, 
              a.interests, a.dietary_restrictions, a.accessibility_needs,
              a.notification_preferences
       FROM users u
       LEFT JOIN attendees a ON u.user_id = a.user_id
       WHERE u.user_id = $1`,
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Get user's registrations count
    const registrationsResult = await pool.query(
      `SELECT COUNT(*) as registration_count
       FROM eventregistrations er
       JOIN attendees a ON er.attendee_id = a.attendee_id
       WHERE a.user_id = $1`,
      [userId]
    );
    
    // Get upcoming events
    const upcomingEventsResult = await pool.query(
      `SELECT e.event_id, e.event_name, e.event_date, e.venue, e.status,
              er.registration_id, er.registration_date, er.payment_status
       FROM events e
       JOIN eventregistrations er ON e.event_id = er.event_id
       JOIN attendees a ON er.attendee_id = a.attendee_id
       WHERE a.user_id = $1 AND e.event_date >= CURRENT_DATE
       ORDER BY e.event_date ASC
       LIMIT 5`,
      [userId]
    );
    
    res.json({
      profile: {
        ...user,
        registration_count: registrationsResult.rows[0].registration_count
      },
      upcoming_events: upcomingEventsResult.rows
    });
    
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Error fetching user profile' });
  }
});

// Update user's profile
router.put('/profile', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { 
      full_name, phone, date_of_birth, gender,
      interests, dietary_restrictions, accessibility_needs,
      notification_preferences
    } = req.body;
    
    await client.query('BEGIN');
    
    // Check if attendee profile exists
    const attendeeResult = await client.query(
      'SELECT attendee_id FROM attendees WHERE user_id = $1',
      [userId]
    );
    
    if (attendeeResult.rows.length === 0) {
      // Create attendee profile
      await client.query(
        `INSERT INTO attendees
          (user_id, full_name, phone, date_of_birth, gender, interests,
           dietary_restrictions, accessibility_needs, notification_preferences)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          userId, 
          full_name,
          phone,
          date_of_birth,
          gender,
          interests,
          dietary_restrictions,
          accessibility_needs,
          notification_preferences ? JSON.stringify(notification_preferences) : null
        ]
      );
    } else {
      // Update attendee profile
      await client.query(
        `UPDATE attendees
         SET full_name = $1, phone = $2, date_of_birth = $3, gender = $4,
             interests = $5, dietary_restrictions = $6, accessibility_needs = $7,
             notification_preferences = $8, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $9`,
        [
          full_name,
          phone,
          date_of_birth,
          gender,
          interests,
          dietary_restrictions,
          accessibility_needs,
          notification_preferences ? JSON.stringify(notification_preferences) : null,
          userId
        ]
      );
    }
    
    await client.query('COMMIT');
    
    res.json({
      message: 'Profile updated successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Error updating user profile' });
  } finally {
    client.release();
  }
});

// Purchase ticket
router.post('/purchase-ticket', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { eventId, ticketTypeId, quantity = 1 } = req.body;
    
    // Check if event exists and is active
    const eventQuery = `
      SELECT event_id, event_name, event_date, status
      FROM events
      WHERE event_id = $1
    `;
    
    const eventResult = await client.query(eventQuery, [eventId]);
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    const event = eventResult.rows[0];
    
    if (event.status !== 'published' && event.status !== 'active') {
      return res.status(400).json({ message: 'Event is not active for registration' });
    }
    
    if (new Date(event.event_date) < new Date()) {
      return res.status(400).json({ message: 'Cannot register for past events' });
    }
    
    // Check if ticket type exists
    const ticketTypeQuery = `
      SELECT ticket_type_id, price, quantity_available
      FROM tickettypes
      WHERE ticket_type_id = $1 AND event_id = $2
    `;
    
    const ticketTypeResult = await client.query(ticketTypeQuery, [ticketTypeId, eventId]);
    
    if (ticketTypeResult.rows.length === 0) {
      return res.status(404).json({ message: 'Ticket type not found' });
    }
    
    const ticketType = ticketTypeResult.rows[0];
    
    // Check if enough tickets are available
    if (ticketType.quantity_available < quantity) {
      return res.status(400).json({ message: 'Not enough tickets available' });
    }
    
    // Get attendee ID
    const attendeeQuery = `
      SELECT attendee_id FROM attendees WHERE user_id = $1
    `;
    
    const attendeeResult = await client.query(attendeeQuery, [userId]);
    
    let attendeeId;
    if (attendeeResult.rows.length === 0) {
      // Create attendee profile if doesn't exist
      const userQuery = `
        SELECT email FROM users WHERE user_id = $1
      `;
      
      const userResult = await client.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const user = userResult.rows[0];
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
      
      const createAttendeeQuery = `
        INSERT INTO attendees (user_id, full_name)
        VALUES ($1, $2)
        RETURNING attendee_id
      `;
      
      const newAttendeeResult = await client.query(createAttendeeQuery, [userId, fullName]);
      attendeeId = newAttendeeResult.rows[0].attendee_id;
    } else {
      attendeeId = attendeeResult.rows[0].attendee_id;
    }
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Update available quantity
    const updateTicketQuery = `
      UPDATE tickettypes
      SET quantity_available = quantity_available - $1
      WHERE ticket_type_id = $2
    `;
    
    await client.query(updateTicketQuery, [quantity, ticketTypeId]);
    
    // Generate QR code data
    const qrData = JSON.stringify({
      event_id: eventId,
      event_name: event.event_name,
      attendee_id: attendeeId,
      timestamp: new Date().toISOString()
    });
    
    // Create registration
    const totalAmount = ticketType.price * quantity;
    const registerQuery = `
      INSERT INTO eventregistrations (
        event_id, attendee_id, registration_date, ticket_quantity, 
        total_amount, payment_status, qr_code
      ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6)
      RETURNING registration_id
    `;
    
    const registerResult = await client.query(registerQuery, [
      eventId, attendeeId, quantity, totalAmount, 'confirmed', qrData
    ]);
    
    const registrationId = registerResult.rows[0].registration_id;
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Email notifications temporarily disabled
    console.log('Email notifications are currently disabled');
    // TODO: Re-enable email notifications when needed:
    // - Ticket confirmation email
    // - Payment confirmation email
    
    res.status(201).json({
      message: 'Ticket purchased successfully',
      registration: {
        registration_id: registrationId,
        event_id: eventId,
        ticket_quantity: quantity,
        total_amount: totalAmount,
        payment_status: 'confirmed'
      }
    });
    
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Error purchasing ticket:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// Get attendee's tickets
router.get('/tickets', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    console.log('Fetching tickets for user ID:', userId);
    
    // First, get the attendee_id from the attendees table
    const attendeeResult = await pool.query(
      'SELECT attendee_id FROM attendees WHERE user_id = $1',
      [userId]
    );
    
    let attendeeId;
    if (attendeeResult.rows.length === 0) {
      console.log('No attendee profile found, creating one...');
      // Create attendee profile if doesn't exist
      const userResult = await pool.query(
        'SELECT email FROM users WHERE user_id = $1',
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const user = userResult.rows[0];
      const fullName = user.email.split('@')[0] || 'Attendee';
      
      // Use UPSERT to handle race conditions
      const newAttendeeResult = await pool.query(
        `INSERT INTO attendees (user_id, full_name) 
         VALUES ($1, $2) 
         ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name
         RETURNING attendee_id`,
        [userId, fullName]
      );
      
      attendeeId = newAttendeeResult.rows[0].attendee_id;
      console.log('Auto-created attendee ID:', attendeeId);
    } else {
      attendeeId = attendeeResult.rows[0].attendee_id;
      console.log('Found existing attendee ID:', attendeeId);
    }
    
    // Now get all the tickets/registrations for this attendee with enhanced information
    const ticketsResult = await pool.query(
      `SELECT er.registration_id, er.event_id, er.registration_date, 
              er.ticket_quantity, er.total_amount, er.payment_status,
              er.check_in_status, er.check_in_time, er.qr_code, er.status,
              e.event_name, e.event_date, e.event_time, e.end_time,
              e.venue_name, e.venue_address, e.image_url, e.description,
              tt.type_name as ticket_type_name, tt.price as ticket_price,
              o.full_name as organizer_name, o.company_name,
              CASE 
                WHEN al.check_in_time IS NOT NULL THEN true 
                ELSE false 
              END as checked_in,
              CASE 
                WHEN ef.feedback_id IS NOT NULL THEN true 
                ELSE false 
              END as has_feedback
       FROM eventregistrations er
       JOIN events e ON er.event_id = e.event_id
       JOIN organizers o ON e.organizer_id = o.organizer_id
       LEFT JOIN tickettypes tt ON er.ticket_type_id = tt.ticket_type_id
       LEFT JOIN attendancelogs al ON er.registration_id = al.registration_id
       LEFT JOIN eventfeedback ef ON e.event_id = ef.event_id AND ef.attendee_id = er.attendee_id
       WHERE er.attendee_id = $1
       ORDER BY e.event_date DESC`,
      [attendeeId]
    );
    
    console.log(`Found ${ticketsResult.rows.length} tickets for attendee ${attendeeId}`);
    
    // Generate QR codes for tickets that don't have them or have invalid QR codes
    const QRCode = require('qrcode');
    const processedTickets = await Promise.all(
      ticketsResult.rows.map(async (ticket) => {
        // Check if QR code is missing or not a valid data URL
        const needsQRGeneration = !ticket.qr_code || !ticket.qr_code.startsWith('data:image/');
        
        if (needsQRGeneration) {
          try {
            console.log(`Generating QR code for registration ${ticket.registration_id}. Current QR:`, ticket.qr_code);
            
            // Create QR code data
            const qrData = {
              registration_id: ticket.registration_id,
              event_id: ticket.event_id,
              event_name: ticket.event_name,
              attendee_id: attendeeId,
              event_date: ticket.event_date,
              ticket_type: ticket.ticket_type_name || 'General'
            };
            
            // Generate QR code as data URL (base64 image)
            const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
              width: 200,
              margin: 2,
              color: {
                dark: '#000',
                light: '#FFF'
              }
            });
            
            console.log(`Generated QR code for registration ${ticket.registration_id}. Length: ${qrCodeDataURL.length}, Preview: ${qrCodeDataURL.substring(0, 50)}...`);
            
            // Update the database with the generated QR code
            await pool.query(
              'UPDATE eventregistrations SET qr_code = $1 WHERE registration_id = $2',
              [qrCodeDataURL, ticket.registration_id]
            );
            
            console.log(`Successfully updated QR code in database for registration ${ticket.registration_id}`);
            
            // Return ticket with new QR code
            return { ...ticket, qr_code: qrCodeDataURL };
          } catch (error) {
            console.error(`Error generating QR code for registration ${ticket.registration_id}:`, error);
            return ticket; // Return original ticket if QR generation fails
          }
        } else {
          console.log(`QR code already exists for registration ${ticket.registration_id}. Length: ${ticket.qr_code.length}`);
        }
        return ticket; // Return ticket as-is if QR code already exists and is valid
      })
    );
    
    res.json(processedTickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ message: 'Error fetching tickets' });
  }
});

// Get attendee's notifications
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    // Simplified placeholder for notifications
    // In a real implementation, you would query a notifications table
    const mockNotifications = [
      {
        id: 1,
        type: 'event_reminder',
        title: 'Upcoming Event',
        message: 'You have an event coming up in 2 days',
        is_read: false,
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        type: 'ticket_purchased',
        title: 'Ticket Confirmation',
        message: 'Your ticket purchase was successful',
        is_read: true,
        created_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      }
    ];
    
    res.json(mockNotifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// Cancel a ticket/registration
router.delete('/tickets/:registrationId', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { registrationId } = req.params;
    const userId = req.user.user_id;
    
    await client.query('BEGIN');
    
    // Get attendee_id for this user
    const attendeeResult = await client.query(
      'SELECT attendee_id FROM attendees WHERE user_id = $1',
      [userId]
    );
    
    if (attendeeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Attendee profile not found' });
    }
    
    const attendeeId = attendeeResult.rows[0].attendee_id;
    
    // Check if the registration belongs to this attendee and get event details
    const registrationResult = await client.query(
      `SELECT er.*, e.event_date, tt.quantity_available, er.ticket_quantity 
       FROM eventregistrations er
       JOIN events e ON er.event_id = e.event_id
       LEFT JOIN tickettypes tt ON er.ticket_type_id = tt.ticket_type_id
       WHERE er.registration_id = $1 AND er.attendee_id = $2`,
      [registrationId, attendeeId]
    );
    
    if (registrationResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Registration not found or does not belong to you' });
    }
    
    const registration = registrationResult.rows[0];
    
    // Check if event has already passed
    if (new Date(registration.event_date) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Cannot cancel tickets for past events' });
    }
    
    // Check if already checked in
    if (registration.check_in_status) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Cannot cancel tickets after check-in' });
    }
    
    // Update ticket availability if there's a ticket type
    if (registration.ticket_type_id) {
      await client.query(
        `UPDATE tickettypes 
         SET quantity_available = quantity_available + $1 
         WHERE ticket_type_id = $2`,
        [registration.ticket_quantity, registration.ticket_type_id]
      );
    }
    
    // Mark registration as cancelled instead of deleting it
    await client.query(
      `UPDATE eventregistrations 
       SET status = 'cancelled', payment_status = 'refunded' 
       WHERE registration_id = $1`,
      [registrationId]
    );
    
    await client.query('COMMIT');
    
    res.json({ 
      message: 'Ticket cancelled successfully',
      registration_id: registrationId 
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error cancelling ticket:', error);
    res.status(500).json({ message: 'Error cancelling ticket' });
  } finally {
    client.release();
  }
});

// ===== EMAIL NOTIFICATION ENDPOINTS (TEMPORARILY DISABLED) =====

// Send event reminder emails (Admin/Organizer endpoint) - DISABLED
router.post('/send-event-reminder/:eventId', authenticateToken, async (req, res) => {
  try {
    res.status(503).json({ 
      message: 'Email notifications are temporarily disabled',
      status: 'disabled',
      note: 'This feature will be re-enabled in a future update'
    });
  } catch (error) {
    console.error('Error in disabled endpoint:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send event update notification - DISABLED
router.post('/send-event-update/:eventId', authenticateToken, async (req, res) => {
  try {
    res.status(503).json({ 
      message: 'Email notifications are temporarily disabled',
      status: 'disabled',
      note: 'This feature will be re-enabled in a future update'
    });
  } catch (error) {
    console.error('Error in disabled endpoint:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Test email functionality - DISABLED
router.post('/test-email', authenticateToken, async (req, res) => {
  try {
    res.status(503).json({ 
      message: 'Email notifications are temporarily disabled',
      status: 'disabled',
      note: 'This feature will be re-enabled in a future update'
    });
  } catch (error) {
    console.error('Error in disabled endpoint:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
