-- QUICK DATABASE SCHEMA MIGRATION
-- This will backup existing users and replace the schema with the comprehensive one

-- Step 1: Backup existing users
CREATE TABLE users_backup AS SELECT * FROM users;

-- Step 2: Drop existing tables (in order to avoid foreign key conflicts)
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

-- Step 3: Create the comprehensive schema
-- (Copy the entire content from your "new events old schema.sql" file here)

-- After creating the new schema, migrate the user data:
INSERT INTO users (
    email,
    password,
    role_type,
    is_email_verified,
    created_at,
    updated_at,
    last_login,
    account_status,
    profile_visibility,
    two_factor_enabled,
    is_deleted
)
SELECT 
    email,
    password,
    CASE 
        WHEN role = 'attendee' THEN 'attendee'
        WHEN role = 'organizer' THEN 'organizer' 
        WHEN role = 'admin' THEN 'admin'
        ELSE 'attendee'
    END as role_type,
    true as is_email_verified,
    created_at,
    updated_at,
    last_login,
    'active' as account_status,
    'everyone' as profile_visibility,
    false as two_factor_enabled,
    false as is_deleted
FROM users_backup
WHERE email IS NOT NULL;

-- Create attendee profiles for migrated users
INSERT INTO attendees (
    user_id,
    full_name,
    created_at,
    updated_at
)
SELECT 
    u.user_id,
    COALESCE(ub.name, 'Unknown') as full_name,
    ub.created_at,
    ub.updated_at
FROM users u
JOIN users_backup ub ON u.email = ub.email
WHERE u.role_type = 'attendee';

-- Clean up backup
DROP TABLE users_backup;

-- Success message
SELECT 'Migration completed successfully!' as result;
