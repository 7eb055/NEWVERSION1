-- EXECUTE THIS SQL IN YOUR DATABASE TO FIX THE SETTINGS ERRORS
-- Run this against your 'eventdb' database

-- Add missing columns to Users table
ALTER TABLE Users ADD COLUMN IF NOT EXISTS profile_visibility VARCHAR(20) DEFAULT 'everyone';
ALTER TABLE Users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE Users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;
ALTER TABLE Users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE Users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Add constraint for profile_visibility values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_profile_visibility_check'
    ) THEN
        ALTER TABLE Users ADD CONSTRAINT users_profile_visibility_check 
        CHECK (profile_visibility IN ('everyone', 'attendees_only', 'private'));
    END IF;
END $$;

-- Update password_changed_at for existing users
UPDATE Users 
SET password_changed_at = created_at 
WHERE password_changed_at IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_is_deleted ON Users(is_deleted);
CREATE INDEX IF NOT EXISTS idx_users_profile_visibility ON Users(profile_visibility);

-- Ensure notification_preferences column exists in Attendees table
ALTER TABLE Attendees ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "event_updates": true, "promotions": false}';

-- Add comments for documentation
COMMENT ON COLUMN Users.profile_visibility IS 'Controls who can see user profile: everyone, attendees_only, private';
COMMENT ON COLUMN Users.two_factor_enabled IS 'Whether two-factor authentication is enabled';
COMMENT ON COLUMN Users.password_changed_at IS 'Timestamp of last password change';
COMMENT ON COLUMN Users.is_deleted IS 'Soft delete flag for account deletion';
COMMENT ON COLUMN Users.deleted_at IS 'Timestamp when account was deleted';
