-- Create notifications table for the attendee profile system
-- This enables persistent notification storage in the database

BEGIN;

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('ticket_confirmation', 'event_reminder', 'system', 'promotion', 'payment_update', 'event_update')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    event_id INTEGER REFERENCES events(event_id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON notifications(event_id);

-- Insert sample notifications for existing users (optional)
-- Uncomment this section if you want to add sample notifications

/*
INSERT INTO notifications (user_id, type, title, message, is_read, created_at) 
SELECT 
    u.user_id,
    'system',
    'Welcome to Event Management System',
    'Thank you for joining our platform! Explore upcoming events and manage your tickets.',
    false,
    NOW() - INTERVAL '1 day'
FROM users u
LEFT JOIN notifications n ON u.user_id = n.user_id
WHERE n.user_id IS NULL  -- Only for users who don't have any notifications yet
LIMIT 10;

INSERT INTO notifications (user_id, type, title, message, is_read, created_at) 
SELECT 
    u.user_id,
    'promotion',
    'New Events Available',
    'Check out the latest events and book your tickets before they sell out!',
    false,
    NOW() - INTERVAL '2 hours'
FROM users u
WHERE u.role_type = 'attendee'
LIMIT 10;
*/

-- Function to automatically create notification when a ticket is purchased
CREATE OR REPLACE FUNCTION create_ticket_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Create notification for ticket purchase
    INSERT INTO notifications (user_id, type, title, message, event_id, created_at)
    SELECT 
        u.user_id,
        'ticket_confirmation',
        'Ticket Purchase Confirmed',
        'Your ticket for "' || e.event_name || '" has been confirmed. Total: $' || NEW.total_amount,
        NEW.event_id,
        NOW()
    FROM attendees a
    JOIN users u ON a.user_id = u.user_id
    JOIN events e ON NEW.event_id = e.event_id
    WHERE a.attendee_id = NEW.attendee_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic ticket notifications
DROP TRIGGER IF EXISTS trigger_create_ticket_notification ON eventregistrations;
CREATE TRIGGER trigger_create_ticket_notification
    AFTER INSERT ON eventregistrations
    FOR EACH ROW
    EXECUTE FUNCTION create_ticket_notification();

COMMIT;

-- Show summary
SELECT 
    'Notifications table and triggers created successfully' as status,
    COUNT(*) as existing_notifications_count
FROM notifications;
