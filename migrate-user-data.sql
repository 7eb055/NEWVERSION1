-- Data Migration Script: Convert existing user data to new schema format
-- Run this AFTER creating the new schema but BEFORE dropping users_backup table

-- Step 1: Migrate existing users from simple schema to comprehensive schema
-- This maps the old 'id' column to new 'user_id' column and fills in required fields

INSERT INTO users (
    -- Map old columns to new schema
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
    -- Map from backup table (old schema) to new schema
    email,
    password,
    CASE 
        WHEN role = 'attendee' THEN 'attendee'
        WHEN role = 'organizer' THEN 'organizer' 
        WHEN role = 'admin' THEN 'admin'
        ELSE 'attendee'
    END as role_type,
    true as is_email_verified,  -- Assume existing users are verified
    created_at,
    updated_at,
    last_login,
    'active' as account_status,  -- Existing users are active
    'everyone' as profile_visibility,  -- Default visibility
    false as two_factor_enabled,  -- Default 2FA off
    false as is_deleted  -- Existing users not deleted
FROM users_backup
WHERE email IS NOT NULL;

-- Step 2: Create corresponding attendee records for users who were attendees
INSERT INTO attendees (
    user_id,
    full_name,
    phone,
    created_at,
    updated_at
)
SELECT 
    u.user_id,
    COALESCE(ub.name, 'Unknown') as full_name,
    ub.phone,
    ub.created_at,
    ub.updated_at
FROM users u
JOIN users_backup ub ON u.email = ub.email
WHERE u.role_type = 'attendee';

-- Step 3: Clean up backup table (optional - comment out if you want to keep backup)
-- DROP TABLE users_backup;

-- Success message
SELECT 
    (SELECT COUNT(*) FROM users) as migrated_users,
    (SELECT COUNT(*) FROM attendees) as migrated_attendees,
    'Data migration completed successfully!' as status;
