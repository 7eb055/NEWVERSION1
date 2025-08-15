-- Migration script to replace Heroku schema with comprehensive schema
-- WARNING: This will delete all existing data in dahct0h7n4g77q!
-- 
-- INSTRUCTIONS:
-- 1. Connect to your Heroku database via pgAdmin
-- 2. Open Query Tool
-- 3. Run this script to drop existing tables
-- 4. Then run the "new event.sql" script to create comprehensive schema

-- BACKUP EXISTING USER DATA (IMPORTANT!)
-- First, let's backup your existing users before dropping tables
CREATE TABLE users_backup AS SELECT * FROM users;

-- Step 1: Drop all existing tables (in correct order to handle foreign keys)
DROP TABLE IF EXISTS ticket_types CASCADE;
DROP TABLE IF EXISTS registrations CASCADE;
DROP TABLE IF EXISTS password_resets CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS organizers CASCADE;
DROP TABLE IF EXISTS email_verifications CASCADE;
DROP TABLE IF EXISTS attendees CASCADE;
DROP TABLE IF EXISTS attendee_listings CASCADE;
DROP TABLE IF EXISTS attendance_verifications CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Note: pg_stat_statements tables are system tables and will remain

-- Success message
SELECT 'Schema cleanup completed! Now run the comprehensive schema creation script.' as status;
