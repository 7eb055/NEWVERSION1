-- Fix for missing columns in attendancelogs table
ALTER TABLE attendancelogs ADD COLUMN IF NOT EXISTS scanned_by_user_id INTEGER;
ALTER TABLE attendancelogs ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMP;
ALTER TABLE attendancelogs ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMP;
ALTER TABLE attendancelogs ADD COLUMN IF NOT EXISTS scan_method VARCHAR(50);
ALTER TABLE attendancelogs ADD COLUMN IF NOT EXISTS event_id INTEGER;

-- Add log_id as a primary key to attendancelogs
ALTER TABLE attendancelogs DROP CONSTRAINT IF EXISTS attendancelogs_pkey;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendancelogs' AND column_name = 'log_id') THEN
        ALTER TABLE attendancelogs ADD COLUMN log_id SERIAL PRIMARY KEY;
    ELSE 
        -- If it exists but is not a primary key, make it one
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'attendancelogs_pkey' 
                      AND table_name = 'attendancelogs') THEN
            ALTER TABLE attendancelogs ADD PRIMARY KEY (log_id);
        END IF;
    END IF;
END $$;

-- Fix for missing ticket_type_id in eventregistrations table
ALTER TABLE eventregistrations ADD COLUMN IF NOT EXISTS ticket_type_id INTEGER;
ALTER TABLE eventregistrations ADD COLUMN IF NOT EXISTS ticket_quantity INTEGER DEFAULT 1;
ALTER TABLE eventregistrations ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE eventregistrations ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE eventregistrations ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE eventregistrations ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255);
ALTER TABLE eventregistrations ADD COLUMN IF NOT EXISTS special_requirements TEXT;
ALTER TABLE eventregistrations ADD COLUMN IF NOT EXISTS qr_code VARCHAR(255);
ALTER TABLE eventregistrations ADD COLUMN IF NOT EXISTS registration_status VARCHAR(50) DEFAULT 'confirmed';
ALTER TABLE eventregistrations ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE eventregistrations ADD COLUMN IF NOT EXISTS registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Make sure required columns exist in events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_name VARCHAR(255);
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_date TIMESTAMP;
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_time TIME;
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_name VARCHAR(255);
ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_address TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_type VARCHAR(100) DEFAULT 'Conference';
ALTER TABLE events ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE events ADD COLUMN IF NOT EXISTS ticket_price NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE events ADD COLUMN IF NOT EXISTS max_attendees INTEGER;

-- Make sure required columns exist in organizers table
-- This seems to be the main issue - creating organizer_name column
ALTER TABLE organizers ADD COLUMN IF NOT EXISTS organizer_name VARCHAR(255);
ALTER TABLE organizers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE organizers ADD COLUMN IF NOT EXISTS company VARCHAR(255);

-- Make sure required columns exist in attendees table
ALTER TABLE attendees ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE attendees ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE attendees ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE attendees ADD COLUMN IF NOT EXISTS gender VARCHAR(10);
ALTER TABLE attendees ADD COLUMN IF NOT EXISTS interests TEXT;
ALTER TABLE attendees ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT;
ALTER TABLE attendees ADD COLUMN IF NOT EXISTS accessibility_needs TEXT;
ALTER TABLE attendees ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255);
ALTER TABLE attendees ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
ALTER TABLE attendees ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
ALTER TABLE attendees ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE attendees ADD COLUMN IF NOT EXISTS social_media_links TEXT;
ALTER TABLE attendees ADD COLUMN IF NOT EXISTS notification_preferences TEXT;

-- Make sure tickettypes table exists with required columns
CREATE TABLE IF NOT EXISTS tickettypes (
    ticket_type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(100),
    price NUMERIC(10,2) DEFAULT 0.00,
    description TEXT,
    event_id INTEGER
);

-- Add foreign key constraints if needed
ALTER TABLE tickettypes 
    ADD CONSTRAINT IF NOT EXISTS tickettypes_event_id_fkey 
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE;

-- Repair any broken data (fill missing organizer names with default values)
UPDATE organizers SET organizer_name = 'Unknown Organizer' WHERE organizer_name IS NULL OR organizer_name = '';

-- Repair events missing names
UPDATE events SET event_name = 'Unnamed Event #' || event_id WHERE event_name IS NULL OR event_name = '';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_logs_registration_id ON attendancelogs(registration_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_event_id ON attendancelogs(event_id);
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);

-- Make sure scanned_by exists or it will cause a foreign key error
ALTER TABLE attendancelogs ADD COLUMN IF NOT EXISTS scanned_by INTEGER;
