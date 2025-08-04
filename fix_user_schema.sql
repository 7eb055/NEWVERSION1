-- Fix User Registration Schema Issues
-- This script fixes the database schema to match the backend expectations
-- Run these commands one by one in your PostgreSQL database

-- Step 1: Check your current Users table structure
-- Run this first to see what you currently have:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;

-- Step 2: If your primary key is 'id' instead of 'user_id', rename it:
-- ALTER TABLE Users RENAME COLUMN id TO user_id;

-- Step 3: If your email verification column is 'email_verified' instead of 'is_email_verified', rename it:
-- ALTER TABLE Users RENAME COLUMN email_verified TO is_email_verified;

-- Step 4: Add missing columns for email verification if they don't exist:
-- (Run these only if the columns don't exist)

-- Add is_email_verified column:
ALTER TABLE Users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE;

-- Add email verification token:
ALTER TABLE Users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255);

-- Add email verification token expiration:
ALTER TABLE Users ADD COLUMN IF NOT EXISTS email_verification_token_expires TIMESTAMP;

-- Add email verified timestamp:
ALTER TABLE Users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;

-- Add role_type column (if you have 'role' instead of 'role_type'):
-- ALTER TABLE Users RENAME COLUMN role TO role_type;
-- OR add it if it doesn't exist:
ALTER TABLE Users ADD COLUMN IF NOT EXISTS role_type VARCHAR(20) DEFAULT 'attendee' CHECK (role_type IN ('attendee', 'organizer'));

-- Add password reset columns:
ALTER TABLE Users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);
ALTER TABLE Users ADD COLUMN IF NOT EXISTS password_reset_token_expires TIMESTAMP;

-- Add timestamps:
ALTER TABLE Users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE Users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE Users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Step 5: Create Attendees table if it doesn't exist
CREATE TABLE IF NOT EXISTS Attendees (
    attendee_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(10),
    interests TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    dietary_restrictions TEXT,
    accessibility_needs TEXT,
    profile_picture_url VARCHAR(500),
    bio TEXT,
    social_media_links JSON,
    notification_preferences JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 6: Create Organizers table if it doesn't exist
CREATE TABLE IF NOT EXISTS Organizers (
    organizer_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    company_name VARCHAR(255),
    job_title VARCHAR(255),
    business_address TEXT,
    business_phone VARCHAR(20),
    website_url VARCHAR(500),
    bio TEXT,
    experience_years INTEGER,
    specializations TEXT,
    certifications TEXT,
    social_media_links JSON,
    business_license_number VARCHAR(255),
    tax_id VARCHAR(255),
    profile_picture_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 7: Verify your Users table structure (run this to check):
-- SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;
