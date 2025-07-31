-- Fix for missing email field in organizers table
-- We have two options:

-- Option 1: Add email field to organizers table
ALTER TABLE organizers ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Option 2: Update the BASE_ATTENDEE_QUERY in the backend code
-- Replace o.email with u.email in the query

-- Let's use Option 1 for simplicity
-- Populate the email field from the users table
UPDATE organizers o
SET email = u.email
FROM users u
WHERE o.user_id = u.user_id;

-- Double-check that the organizer_name field was properly added
ALTER TABLE organizers ADD COLUMN IF NOT EXISTS organizer_name VARCHAR(255);

-- Update empty organizer names
UPDATE organizers SET organizer_name = 'Default Organizer' WHERE organizer_name IS NULL OR organizer_name = '';

-- Make sure we don't have duplicate log_id entries in attendancelogs table
DO $$
BEGIN
    -- Check if there are duplicate log_id entries
    IF EXISTS (
        SELECT log_id, COUNT(*) 
        FROM attendancelogs 
        GROUP BY log_id 
        HAVING COUNT(*) > 1
    ) THEN
        -- Drop the primary key constraint if it exists
        ALTER TABLE attendancelogs DROP CONSTRAINT IF EXISTS attendancelogs_pkey;
        
        -- Create a new unique log_id column
        ALTER TABLE attendancelogs DROP COLUMN IF EXISTS log_id CASCADE;
        ALTER TABLE attendancelogs ADD COLUMN log_id SERIAL PRIMARY KEY;
    END IF;
END $$;

-- Add other missing columns from the backend query
ALTER TABLE attendancelogs ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMP;
ALTER TABLE attendancelogs ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMP;
ALTER TABLE attendancelogs ADD COLUMN IF NOT EXISTS scan_method VARCHAR(50);
ALTER TABLE attendancelogs ADD COLUMN IF NOT EXISTS scanned_by_user_id INTEGER;

-- Add company field to organizers if missing
ALTER TABLE organizers ADD COLUMN IF NOT EXISTS company VARCHAR(255);
