-- Fix for remaining column name mismatches in server.js
-- These are the queries that are still failing after schema migration

-- Update: All instances in server.js that use 'id' instead of 'user_id'
-- Line 520: DELETE user
-- Line 4335: Check existing user  
-- Line 4236: Login query
-- Line 4435: Resend verification
-- Line 1568: User check in attendee creation
-- Line 492: Role update

-- The server.js still has multiple hardcoded queries using old column names
-- Since we successfully migrated the schema, we need to update the server code

-- These are the SQL patterns that need to be fixed in the server.js file:
-- 1. 'SELECT email FROM users WHERE id = $1' → 'SELECT email FROM users WHERE user_id = $1'
-- 2. 'SELECT id FROM users WHERE email = $1' → 'SELECT user_id FROM users WHERE email = $1'  
-- 3. 'SELECT id as user_id FROM users WHERE email = $1' → 'SELECT user_id FROM users WHERE email = $1'
-- 4. 'DELETE FROM users WHERE id = $1' → 'DELETE FROM users WHERE user_id = $1'
-- 5. 'UPDATE users SET role = $1 WHERE id = $2' → 'UPDATE users SET role_type = $1 WHERE user_id = $2'

-- The comprehensive schema uses:
-- users.user_id (PRIMARY KEY)
-- users.role_type (not 'role')
-- users.email_verification_token
-- users.is_email_verified

-- These column name fixes will be applied via code updates, not SQL
-- This file documents the needed changes for reference
