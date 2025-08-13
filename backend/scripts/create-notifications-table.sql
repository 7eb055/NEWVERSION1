-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'system',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    event_id INTEGER REFERENCES events(event_id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}',
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    expires_at TIMESTAMP,
    action_url VARCHAR(500),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notifications_updated_at_trigger
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- Insert some sample notifications for testing
INSERT INTO notifications (user_id, title, message, type, read, event_id, priority) 
SELECT 
    u.user_id,
    CASE 
        WHEN row_number() OVER (PARTITION BY u.user_id ORDER BY u.user_id) % 5 = 1 THEN 'Event Registration Confirmed'
        WHEN row_number() OVER (PARTITION BY u.user_id ORDER BY u.user_id) % 5 = 2 THEN 'Event Reminder'
        WHEN row_number() OVER (PARTITION BY u.user_id ORDER BY u.user_id) % 5 = 3 THEN 'Ticket Purchase Successful'
        WHEN row_number() OVER (PARTITION BY u.user_id ORDER BY u.user_id) % 5 = 4 THEN 'Event Update'
        ELSE 'System Maintenance Notice'
    END as title,
    CASE 
        WHEN row_number() OVER (PARTITION BY u.user_id ORDER BY u.user_id) % 5 = 1 THEN 'Your registration for the upcoming event has been confirmed. Check your email for details.'
        WHEN row_number() OVER (PARTITION BY u.user_id ORDER BY u.user_id) % 5 = 2 THEN 'Don''t forget! Your event starts in 24 hours. Make sure you have your ticket ready.'
        WHEN row_number() OVER (PARTITION BY u.user_id ORDER BY u.user_id) % 5 = 3 THEN 'Your ticket purchase was successful. Payment has been processed and your ticket is ready.'
        WHEN row_number() OVER (PARTITION BY u.user_id ORDER BY u.user_id) % 5 = 4 THEN 'There has been an important update to your registered event. Please check the details.'
        ELSE 'Scheduled system maintenance will occur tonight from 2-4 AM. Some features may be temporarily unavailable.'
    END as message,
    CASE 
        WHEN row_number() OVER (PARTITION BY u.user_id ORDER BY u.user_id) % 5 = 1 THEN 'ticket_confirmation'
        WHEN row_number() OVER (PARTITION BY u.user_id ORDER BY u.user_id) % 5 = 2 THEN 'event_reminder'
        WHEN row_number() OVER (PARTITION BY u.user_id ORDER BY u.user_id) % 5 = 3 THEN 'ticket_confirmation'
        WHEN row_number() OVER (PARTITION BY u.user_id ORDER BY u.user_id) % 5 = 4 THEN 'update'
        ELSE 'system'
    END as type,
    CASE 
        WHEN row_number() OVER (PARTITION BY u.user_id ORDER BY u.user_id) % 3 = 0 THEN TRUE
        ELSE FALSE
    END as read,
    (SELECT event_id FROM events ORDER BY RANDOM() LIMIT 1) as event_id,
    CASE 
        WHEN row_number() OVER (PARTITION BY u.user_id ORDER BY u.user_id) % 4 = 1 THEN 'high'
        WHEN row_number() OVER (PARTITION BY u.user_id ORDER BY u.user_id) % 4 = 2 THEN 'normal'
        ELSE 'normal'
    END as priority
FROM users u
WHERE u.user_id <= (SELECT COUNT(*) FROM users LIMIT 10)
ON CONFLICT DO NOTHING;
