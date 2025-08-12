# Email Notification System Documentation

## Overview

The Event Management System includes a comprehensive email notification system that handles various types of automated and manual email communications with users. This system is built with modular services and supports multiple notification types.

## Components

### 1. EmailService.js
**Location**: `backend/services/EmailService.js`

The core email service that handles all email sending functionality including:

#### Email Types Supported:
- **Ticket Confirmation**: Sent when users purchase tickets
- **Payment Confirmation**: Sent when payments are processed
- **Event Reminders**: Automated reminders (1, 3, 7 days before events)
- **Event Updates**: Manual notifications about event changes
- **Account Verification**: Email verification for new accounts
- **Password Reset**: Password reset notifications

#### Key Features:
- HTML email templates with responsive design
- Automatic QR code inclusion for tickets
- Customizable branding and styling
- Error handling and retry logic
- Environment-based configuration

### 2. NotificationScheduler.js
**Location**: `backend/services/NotificationScheduler.js`

Automated scheduler that runs background tasks for:

#### Scheduled Tasks:
- **Automatic Event Reminders**: Sends reminders 1, 3, and 7 days before events
- **Preference Checking**: Respects user notification preferences
- **Duplicate Prevention**: Prevents multiple reminders on the same day
- **Failure Tracking**: Logs failed email attempts

#### Features:
- Configurable check intervals (default: every hour)
- Graceful shutdown handling
- Database logging of sent notifications
- Manual trigger capability for testing

### 3. Admin Email Management
**Location**: `backend/routes/admin.js`

Admin interface for managing email notifications:

#### Admin Endpoints:
- `GET /api/admin/email-stats` - Email system statistics
- `POST /api/admin/send-reminder/:eventId` - Manual event reminders
- `POST /api/admin/send-bulk-email` - Bulk email to all users
- `GET /api/admin/email-templates` - Available email templates
- `POST /api/admin/test-email-config` - Test email configuration
- `GET /api/admin/scheduler-status` - Notification scheduler status

## Configuration

### Environment Variables

Add these variables to your `.env` file:

```env
# Email Configuration (Required)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@yourdomain.com

# Optional Configuration
FRONTEND_URL=http://localhost:3000
ENABLE_NOTIFICATIONS=true
TEST_EMAIL=test@example.com

# Production Settings
NODE_ENV=production
```

### Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App Passwords
   - Generate password for "Mail"
   - Use this password in `SMTP_PASSWORD`

3. **Configuration**:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-gmail@gmail.com
   SMTP_PASSWORD=your-16-character-app-password
   FROM_EMAIL=your-gmail@gmail.com
   ```

## Usage

### Automatic Notifications

The system automatically sends emails for:

1. **Ticket Purchase**: When users buy tickets
2. **Payment Confirmation**: When payments are processed
3. **Event Reminders**: 7, 3, and 1 days before events

### Manual Notifications

#### Send Event Reminder (Admin)
```javascript
POST /api/admin/send-reminder/123
{
  "daysUntilEvent": 1
}
```

#### Send Event Update (Admin/Organizer)
```javascript
POST /api/attendee/send-event-update/123
{
  "updateMessage": "Venue has been changed to Main Hall"
}
```

#### Send Bulk Email (Admin)
```javascript
POST /api/admin/send-bulk-email
{
  "subject": "Important Announcement",
  "message": "System maintenance scheduled for tonight...",
  "emailType": "announcement",
  "userRole": "attendee"
}
```

### Testing Email System

Run the test suite to verify email functionality:

```bash
# Test all email functionality
node backend/test-email-system.js

# Or test specific endpoints via API
POST /api/attendee/test-email
{
  "emailType": "ticket_confirmation",
  "recipientEmail": "test@example.com"
}
```

## Email Templates

### Template Structure

All emails follow a consistent structure:
- **Header**: Branded header with event/action type
- **Body**: Main content with user-specific information
- **Action Buttons**: Links to relevant pages
- **Footer**: Contact information and unsubscribe options

### Customization

Templates can be customized by modifying the HTML generation methods in `EmailService.js`:

- `generateTicketConfirmationHTML()`
- `generateEventReminderHTML()`
- `generateEventUpdateHTML()`
- `generatePaymentConfirmationHTML()`

## Database Schema

### Required Tables

```sql
-- Event reminder log (automatically created)
CREATE TABLE event_reminder_log (
  log_id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(event_id),
  reminder_type VARCHAR(20) NOT NULL,
  attendees_notified INTEGER DEFAULT 0,
  sent_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, reminder_type, DATE(sent_at))
);

-- Optional: Notifications table for in-app notifications
CREATE TABLE notifications (
  notification_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'general',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Attendee Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/attendee/test-email` | POST | Test email functionality |
| `/api/attendee/send-event-reminder/:eventId` | POST | Send event reminder |
| `/api/attendee/send-event-update/:eventId` | POST | Send event update |

### Admin Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/email-stats` | GET | Get email statistics |
| `/api/admin/send-reminder/:eventId` | POST | Manual event reminder |
| `/api/admin/send-bulk-email` | POST | Send bulk email |
| `/api/admin/email-templates` | GET | Get email templates |
| `/api/admin/test-email-config` | POST | Test email config |
| `/api/admin/scheduler-status` | GET | Scheduler status |

## Integration with Frontend

### API Service Integration

Add to `src/services/ApiService.js`:

```javascript
// Email management methods
async testEmail(emailType, recipientEmail) {
  return this.post('/attendee/test-email', { emailType, recipientEmail });
}

async sendEventReminder(eventId, daysUntilEvent) {
  return this.post(`/admin/send-reminder/${eventId}`, { daysUntilEvent });
}

async sendBulkEmail(emailData) {
  return this.post('/admin/send-bulk-email', emailData);
}

async getEmailStats() {
  return this.get('/admin/email-stats');
}
```

### React Component Example

```javascript
// Admin Email Management Component
const EmailManagement = () => {
  const [emailStats, setEmailStats] = useState(null);
  
  useEffect(() => {
    loadEmailStats();
  }, []);
  
  const loadEmailStats = async () => {
    try {
      const stats = await ApiService.getEmailStats();
      setEmailStats(stats);
    } catch (error) {
      console.error('Failed to load email stats:', error);
    }
  };
  
  const sendTestEmail = async () => {
    try {
      await ApiService.testEmail('ticket_confirmation', 'test@example.com');
      alert('Test email sent successfully!');
    } catch (error) {
      alert('Failed to send test email');
    }
  };
  
  return (
    <div className="email-management">
      <h2>Email Management</h2>
      <button onClick={sendTestEmail}>Send Test Email</button>
      {/* Email stats display */}
      {emailStats && (
        <div className="email-stats">
          <p>Total Users: {emailStats.total_users}</p>
          <p>Upcoming Events: {emailStats.upcoming_events}</p>
          <p>Events with Registrations: {emailStats.events_with_registrations}</p>
        </div>
      )}
    </div>
  );
};
```

## Troubleshooting

### Common Issues

1. **Emails not sending**:
   - Check SMTP configuration in `.env`
   - Verify Gmail app password (if using Gmail)
   - Check console logs for error messages

2. **Scheduler not running**:
   - Set `ENABLE_NOTIFICATIONS=true` in `.env`
   - Check server logs for scheduler startup messages

3. **Templates not rendering**:
   - Ensure frontend URL is correct in `.env`
   - Check HTML template syntax in EmailService.js

4. **Database errors**:
   - Run database migrations for required tables
   - Check PostgreSQL connection and permissions

### Debugging

Enable debug logging:

```env
DEBUG=email:*
NODE_ENV=development
```

Check logs for detailed error information:

```bash
# Check email sending logs
grep "Email" backend/logs/app.log

# Check scheduler logs
grep "Scheduler" backend/logs/app.log
```

## Security Considerations

1. **Credentials**: Store SMTP credentials securely in environment variables
2. **Rate Limiting**: Implement rate limiting for email sending endpoints
3. **Validation**: Validate email addresses and content before sending
4. **Permissions**: Restrict admin email functions to authorized users only
5. **Logging**: Log email activities for audit purposes

## Performance Optimization

1. **Batch Processing**: Send emails in batches to avoid overwhelming SMTP server
2. **Queue System**: Consider implementing a queue for high-volume email sending
3. **Caching**: Cache frequently used templates
4. **Connection Pooling**: Reuse SMTP connections when possible

## Future Enhancements

1. **Email Templates Editor**: Web-based template editor for admins
2. **Analytics**: Track email open rates and click-through rates
3. **Advanced Scheduling**: More granular scheduling options
4. **Personalization**: Advanced personalization based on user preferences
5. **Multi-language Support**: Internationalization for email content
6. **Email Queuing**: Redis-based queue system for better performance
7. **Webhook Integration**: Integration with external email services

## Monitoring and Maintenance

1. **Health Checks**: Regular email system health checks
2. **Bounce Handling**: Handle bounced emails and invalid addresses
3. **Delivery Tracking**: Track email delivery status
4. **Regular Updates**: Keep email templates and content up to date
5. **Performance Monitoring**: Monitor email sending performance and delivery rates
