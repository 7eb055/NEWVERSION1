-- Align production database schema with code expectations
-- This script adds missing columns and aliases to match what the code expects

BEGIN;

-- Add missing columns to organizers table to match code expectations
ALTER TABLE organizers 
  ADD COLUMN IF NOT EXISTS organizer_id integer;

-- Set organizer_id to match existing id values
UPDATE organizers SET organizer_id = id WHERE organizer_id IS NULL;

-- Add missing columns to organizers table
ALTER TABLE organizers 
  ADD COLUMN IF NOT EXISTS full_name varchar(255),
  ADD COLUMN IF NOT EXISTS company_name varchar(255),
  ADD COLUMN IF NOT EXISTS user_id integer;

-- Copy existing data to new columns
UPDATE organizers SET full_name = name WHERE full_name IS NULL;
UPDATE organizers SET company_name = company WHERE company_name IS NULL;

-- Add missing columns to events table to match code expectations
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS event_id integer,
  ADD COLUMN IF NOT EXISTS event_name varchar(255),
  ADD COLUMN IF NOT EXISTS event_description text,
  ADD COLUMN IF NOT EXISTS event_date timestamp,
  ADD COLUMN IF NOT EXISTS end_date timestamp,
  ADD COLUMN IF NOT EXISTS venue_name varchar(255),
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city varchar(100),
  ADD COLUMN IF NOT EXISTS state varchar(100),
  ADD COLUMN IF NOT EXISTS country varchar(100),
  ADD COLUMN IF NOT EXISTS postal_code varchar(20),
  ADD COLUMN IF NOT EXISTS max_attendees integer,
  ADD COLUMN IF NOT EXISTS current_attendees integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ticket_price decimal(10,2),
  ADD COLUMN IF NOT EXISTS currency varchar(3) DEFAULT 'USD';

-- Set event_id to match existing id values
UPDATE events SET event_id = id WHERE event_id IS NULL;

-- Copy existing data to new columns
UPDATE events SET event_name = title WHERE event_name IS NULL;
UPDATE events SET event_description = description WHERE event_description IS NULL;
UPDATE events SET event_date = date WHERE event_date IS NULL;
UPDATE events SET max_attendees = capacity WHERE max_attendees IS NULL;
UPDATE events SET ticket_price = price WHERE ticket_price IS NULL;

-- Add missing columns to users table to match code expectations
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS user_id integer,
  ADD COLUMN IF NOT EXISTS role_type varchar(50),
  ADD COLUMN IF NOT EXISTS is_email_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verification_token varchar(255),
  ADD COLUMN IF NOT EXISTS password_reset_token varchar(255),
  ADD COLUMN IF NOT EXISTS password_reset_expires timestamp,
  ADD COLUMN IF NOT EXISTS password_hash varchar(255);

-- Set user_id to match existing id values
UPDATE users SET user_id = id WHERE user_id IS NULL;

-- Copy existing data to new columns
UPDATE users SET role_type = role WHERE role_type IS NULL;
UPDATE users SET password_hash = password WHERE password_hash IS NULL;

-- Add missing attendees primary key if it doesn't exist
ALTER TABLE attendees ADD COLUMN IF NOT EXISTS attendee_id serial;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organizers_organizer_id ON organizers(organizer_id);
CREATE INDEX IF NOT EXISTS idx_organizers_user_id ON organizers(user_id);
CREATE INDEX IF NOT EXISTS idx_events_event_id ON events(event_id);
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);

COMMIT;
