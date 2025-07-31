-- This script directly addresses the specific errors in the database
-- Basic syntax that should work in most SQL databases

-- Fix for "column o.organizer_name does not exist"
ALTER TABLE organizers ADD organizer_name VARCHAR(255);

-- Initialize organizer_name with default values
UPDATE organizers
SET organizer_name = 'Organizer #' || organizer_id
WHERE organizer_name IS NULL OR organizer_name = '';

-- Fix for "column al.log_id does not exist"
-- First drop the potential conflicting constraint
ALTER TABLE attendancelogs DROP CONSTRAINT IF EXISTS attendancelogs_pkey;

-- Add the log_id column if it doesn't exist
ALTER TABLE attendancelogs ADD log_id SERIAL;

-- Make it the primary key
ALTER TABLE attendancelogs ADD PRIMARY KEY (log_id);

-- Add other missing attendance log columns
ALTER TABLE attendancelogs ADD check_in_time TIMESTAMP;
ALTER TABLE attendancelogs ADD scanned_by_user_id INTEGER;
