-- Quick database fix script
-- Run this to ensure the correct column name exists

-- Check what columns exist in Users table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name LIKE '%email%verified%'
ORDER BY column_name;

-- If you see 'email_verified' instead of 'is_email_verified', run this:
-- ALTER TABLE Users RENAME COLUMN email_verified TO is_email_verified;

-- If you don't see any email verification column, run this:
-- ALTER TABLE Users ADD COLUMN is_email_verified BOOLEAN DEFAULT FALSE;

-- Verify the final structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'is_email_verified';
