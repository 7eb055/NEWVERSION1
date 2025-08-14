const { Pool } = require('pg');
const EmailService = require('./EmailService');

class NotificationScheduler {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
    
    this.emailService = new EmailService();
    
    // Scheduled intervals (in milliseconds)
    this.CHECK_INTERVAL = 60 * 60 * 1000; // Check every hour
    this.intervals = [];
  }

  // Start the notification scheduler
  start() {
    console.log('🕒 Starting notification scheduler...');
    
    // Check for event reminders every hour
    const reminderInterval = setInterval(() => {
      this.checkEventReminders();
    }, this.CHECK_INTERVAL);
    
    this.intervals.push(reminderInterval);
    
    // Run initial check
    this.checkEventReminders();
  }

  // Stop the notification scheduler
  stop() {
    console.log('🛑 Stopping notification scheduler...');
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
  }

  // Check for events that need reminder emails
  async checkEventReminders() {
    const client = await this.pool.connect();
    try {
      console.log('📧 Checking for event reminders...');
      
      // Get events that are 1, 3, or 7 days away
      const reminderQuery = `
        SELECT DISTINCT e.event_id, e.event_name, e.event_date, e.event_time, e.venue,
               EXTRACT(days FROM (e.event_date - CURRENT_DATE)) as days_until_event
        FROM events e
        JOIN eventregistrations er ON e.event_id = er.event_id
        WHERE e.status = 'published' 
          AND e.event_date > CURRENT_DATE
          AND EXTRACT(days FROM (e.event_date - CURRENT_DATE)) IN (1, 3, 7)
          AND er.payment_status = 'confirmed'
          AND NOT EXISTS (
            SELECT 1 FROM event_reminder_log erl 
            WHERE erl.event_id = e.event_id 
              AND erl.reminder_type = CONCAT(EXTRACT(days FROM (e.event_date - CURRENT_DATE)), '_day')
              AND DATE(erl.sent_at) = CURRENT_DATE
          )
      `;
      
      const eventsResult = await client.query(reminderQuery);
      
      if (eventsResult.rows.length === 0) {
        console.log('📭 No events need reminders at this time');
        return;
      }
      
      for (const event of eventsResult.rows) {
        await this.sendEventReminders(event, client);
      }
      
    } catch (error) {
      console.error('❌ Error checking event reminders:', error);
    } finally {
      client.release();
    }
  }

  // Send reminder emails for a specific event
  async sendEventReminders(event, client) {
    try {
      const daysUntilEvent = parseInt(event.days_until_event);
      console.log(`📅 Sending ${daysUntilEvent}-day reminders for event: ${event.event_name}`);
      
      // Get all registered attendees for this event
      const attendeesQuery = `
        SELECT DISTINCT u.email, u.first_name, u.last_name, u.user_id
        FROM users u
        JOIN attendees a ON u.user_id = a.user_id
        JOIN eventregistrations er ON a.attendee_id = er.attendee_id
        WHERE er.event_id = $1 AND er.payment_status = 'confirmed'
      `;
      
      const attendeesResult = await client.query(attendeesQuery, [event.event_id]);
      
      if (attendeesResult.rows.length === 0) {
        console.log(`📭 No attendees found for event: ${event.event_name}`);
        return;
      }
      
      let sentCount = 0;
      const failures = [];
      
      // Send reminder email to each attendee
      for (const attendee of attendeesResult.rows) {
        try {
          const userName = attendee.first_name ? 
            `${attendee.first_name} ${attendee.last_name || ''}`.trim() : 
            attendee.email;
          
          const eventData = {
            eventId: event.event_id,
            eventName: event.event_name,
            eventDate: new Date(event.event_date).toLocaleDateString(),
            eventTime: event.event_time || 'TBA',
            venue: event.venue || 'TBA'
          };
          
          await this.emailService.sendEventReminderEmail(
            attendee.email, 
            userName, 
            eventData, 
            daysUntilEvent
          );
          
          sentCount++;
          
          // Log the notification to the database (if notifications table exists)
          try {
            await client.query(`
              INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
              VALUES ($1, $2, $3, $4, false, NOW())
            `, [
              attendee.user_id,
              `Event Reminder: ${event.event_name}`,
              `Your event "${event.event_name}" is in ${daysUntilEvent} day${daysUntilEvent !== 1 ? 's' : ''}!`,
              'event_reminder'
            ]);
          } catch (notificationError) {
            // Silently continue if notifications table doesn't exist
          }
          
        } catch (emailError) {
          console.error(`❌ Failed to send reminder email to ${attendee.email}:`, emailError);
          failures.push(attendee.email);
        }
      }
      
      // Log that reminders were sent for this event
      try {
        await client.query(`
          INSERT INTO event_reminder_log (event_id, reminder_type, attendees_notified, sent_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (event_id, reminder_type, DATE(sent_at)) DO NOTHING
        `, [
          event.event_id,
          `${daysUntilEvent}_day`,
          sentCount
        ]);
      } catch (logError) {
        // Create the log table if it doesn't exist
        try {
          await client.query(`
            CREATE TABLE IF NOT EXISTS event_reminder_log (
              log_id SERIAL PRIMARY KEY,
              event_id INTEGER REFERENCES events(event_id),
              reminder_type VARCHAR(20) NOT NULL,
              attendees_notified INTEGER DEFAULT 0,
              sent_at TIMESTAMP DEFAULT NOW(),
              UNIQUE(event_id, reminder_type, DATE(sent_at))
            )
          `);
          
          // Retry the insert
          await client.query(`
            INSERT INTO event_reminder_log (event_id, reminder_type, attendees_notified, sent_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (event_id, reminder_type, DATE(sent_at)) DO NOTHING
          `, [
            event.event_id,
            `${daysUntilEvent}_day`,
            sentCount
          ]);
        } catch (createError) {
          console.error('❌ Failed to create or use event_reminder_log table:', createError);
        }
      }
      
      console.log(`✅ Sent ${sentCount} reminder emails for event: ${event.event_name}`);
      if (failures.length > 0) {
        console.log(`⚠️ Failed to send to ${failures.length} attendees:`, failures);
      }
      
    } catch (error) {
      console.error(`❌ Error sending reminders for event ${event.event_name}:`, error);
    }
  }

  // Manually trigger reminders for testing
  async triggerManualReminder(eventId, daysUntilEvent = 1) {
    const client = await this.pool.connect();
    try {
      const eventQuery = `
        SELECT event_id, event_name, event_date, event_time, venue
        FROM events
        WHERE event_id = $1
      `;
      
      const eventResult = await client.query(eventQuery, [eventId]);
      
      if (eventResult.rows.length === 0) {
        throw new Error('Event not found');
      }
      
      const event = {
        ...eventResult.rows[0],
        days_until_event: daysUntilEvent
      };
      
      await this.sendEventReminders(event, client);
      
      return {
        success: true,
        message: `Manual reminder triggered for event: ${event.event_name}`
      };
      
    } catch (error) {
      console.error('❌ Error triggering manual reminder:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Check notification preferences before sending
  async shouldSendNotification(userId, notificationType) {
    try {
      const preferencesQuery = `
        SELECT notification_preferences
        FROM attendees
        WHERE user_id = $1
      `;
      
      const result = await this.pool.query(preferencesQuery, [userId]);
      
      if (result.rows.length === 0) {
        return true; // Default to sending if no preferences found
      }
      
      const preferences = result.rows[0].notification_preferences || {};
      
      // Check specific notification type preferences
      switch (notificationType) {
      case 'event_reminder':
        return preferences.event_updates !== false;
      case 'marketing':
        return preferences.promotions === true;
      default:
        return preferences.email !== false;
      }
      
    } catch (error) {
      console.error('Error checking notification preferences:', error);
      return true; // Default to sending if check fails
    }
  }
}

module.exports = NotificationScheduler;
