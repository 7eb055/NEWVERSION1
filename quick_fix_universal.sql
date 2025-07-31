-- This script directly addresses the specific errors in the database
-- Simplified version without PostgreSQL-specific syntax

-- Fix for "column o.organizer_name does not exist"
ALTER TABLE organizers ADD organizer_name VARCHAR(255);

-- Initialize organizer_name with default values (using CONCAT for compatibility)
UPDATE organizers
SET organizer_name = 'Organizer ID: ' + CAST(organizer_id AS VARCHAR(10))
WHERE organizer_name IS NULL OR organizer_name = '';

-- Fix for "column al.log_id does not exist"
-- First drop the potential conflicting constraint
ALTER TABLE attendancelogs DROP CONSTRAINT IF EXISTS attendancelogs_pkey;

-- Add the log_id column as an identity column
ALTER TABLE attendancelogs ADD log_id INT IDENTITY(1,1);

-- Make it the primary key
ALTER TABLE attendancelogs ADD PRIMARY KEY (log_id);

-- Add other missing attendance log columns
ALTER TABLE attendancelogs ADD check_in_time DATETIME;
ALTER TABLE attendancelogs ADD scanned_by_user_id INT;
