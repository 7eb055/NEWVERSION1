-- Create notifications table for user notifications
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL DEFAULT 'system',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    event_id INTEGER REFERENCES events(event_id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample notifications for testing
INSERT INTO notifications (user_id, type, title, message, is_read) VALUES
(55, 'system', 'Welcome to Event Management System', 'Thank you for joining our platform! Explore upcoming events and manage your tickets.', true),
(55, 'promotion', 'New Events Available', 'Check out the latest events and book your tickets before they sell out!', false)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE notifications IS 'Stores user notifications for events, purchases, reminders, etc.';
COMMENT ON COLUMN notifications.type IS 'Type of notification: system, event_reminder, ticket_confirmation, promotion, etc.';
COMMENT ON COLUMN notifications.title IS 'Short title/subject of the notification';
COMMENT ON COLUMN notifications.message IS 'Full notification message content';
COMMENT ON COLUMN notifications.event_id IS 'Optional reference to related event';
COMMENT ON COLUMN notifications.is_read IS 'Whether the user has read this notification';
