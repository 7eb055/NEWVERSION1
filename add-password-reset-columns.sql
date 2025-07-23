-- Add password reset functionality to Users table
-- PostgreSQL script to add password reset columns

-- Add password_reset_token column if it doesn't exist
ALTER TABLE Users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);

-- Add password_reset_token_expires column if it doesn't exist  
ALTER TABLE Users ADD COLUMN IF NOT EXISTS password_reset_token_expires TIMESTAMP;

-- Optional: Add index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON Users(password_reset_token);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('password_reset_token', 'password_reset_token_expires')
ORDER BY column_name;
