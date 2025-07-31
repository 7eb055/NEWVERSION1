-- This script directly addresses the specific errors in the database

-- Fix for "column o.organizer_name does not exist"
ALTER TABLE organizers ADD COLUMN organizer_name VARCHAR(255);

-- Initialize organizer_name with values from the associated user, if possible
UPDATE organizers o
SET organizer_name = u.first_name || ' ' || u.last_name
FROM users u
WHERE o.user_id = u.user_id AND (o.organizer_name IS NULL OR o.organizer_name = '');

-- If no user name available, set a default
UPDATE organizers
SET organizer_name = 'Organizer #' || organizer_id
WHERE organizer_name IS NULL OR organizer_name = '';

-- Fix for "column al.log_id does not exist"
-- First drop the potential conflicting constraint
ALTER TABLE attendancelogs DROP CONSTRAINT IF EXISTS attendancelogs_pkey;

-- Add the log_id column if it doesn't exist
ALTER TABLE attendancelogs ADD COLUMN IF NOT EXISTS log_id SERIAL;

-- Make it the primary key
ALTER TABLE attendancelogs ADD PRIMARY KEY (log_id);

-- Add other missing attendance log columns
ALTER TABLE attendancelogs ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMP;
ALTER TABLE attendancelogs ADD COLUMN IF NOT EXISTS scanned_by_user_id INTEGER;
