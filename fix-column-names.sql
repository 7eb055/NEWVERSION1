-- Database schema update to fix column naming issue
-- Run this to update existing database

-- First, check if the table exists and what columns it has
\d Users;

-- If the column is named 'email_verified', rename it to 'is_email_verified'
-- If the column doesn't exist, add it

-- Check the final structure
 ALTER TABLE Users RENAME COLUMN email_verified TO is_email_verified;
        RAISE NOTICE 'Renamed email_verified to is_email_verified';
