-- Migration script to add missing columns for Settings functionality on production database
-- Run this on Heroku PostgreSQL database

BEGIN;

-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_visibility VARCHAR(20) DEFAULT 'everyone';
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_type VARCHAR(50);

-- Migrate role data to role_type for compatibility
UPDATE users SET role_type = role WHERE role_type IS NULL;

-- Add missing columns to attendees table  
ALTER TABLE attendees ADD COLUMN IF NOT EXISTS notification_preferences TEXT;

-- Set default notification preferences for existing attendees
UPDATE attendees 
SET notification_preferences = '{"email": true, "sms": false, "event_updates": true, "promotions": false}'
WHERE notification_preferences IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.profile_visibility IS 'Controls who can see user profile: everyone, attendees_only, private';
COMMENT ON COLUMN users.two_factor_enabled IS 'Whether two-factor authentication is enabled';
COMMENT ON COLUMN users.password_changed_at IS 'Timestamp of last password change';
COMMENT ON COLUMN attendees.notification_preferences IS 'JSON object storing user notification preferences';

COMMIT;
