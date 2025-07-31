-- Comprehensive fix for all attendee listing issues
-- This script addresses all the column mismatches we've encountered

-- 1. Fix organizer_name
ALTER TABLE organizers ADD COLUMN IF NOT EXISTS organizer_name VARCHAR(255);
UPDATE organizers SET organizer_name = full_name WHERE organizer_name IS NULL;

-- 2. Fix email in organizers
ALTER TABLE organizers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
UPDATE organizers o
SET email = u.email
FROM users u
WHERE o.user_id = u.user_id AND o.email IS NULL;

-- 3. Fix company in organizers
ALTER TABLE organizers ADD COLUMN IF NOT EXISTS company VARCHAR(255);
UPDATE organizers SET company = company_name WHERE company IS NULL;

-- 4. Fix registration_status in eventregistrations
ALTER TABLE eventregistrations ADD COLUMN IF NOT EXISTS registration_status VARCHAR(50);
UPDATE eventregistrations SET registration_status = status WHERE registration_status IS NULL;

-- 5. Fix attendancelogs issues
ALTER TABLE attendancelogs DROP CONSTRAINT IF EXISTS attendancelogs_pkey;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendancelogs' AND column_name = 'log_id') THEN
        ALTER TABLE attendancelogs ADD COLUMN log_id SERIAL PRIMARY KEY;
    ELSE 
        ALTER TABLE attendancelogs ADD PRIMARY KEY (log_id);
    END IF;
END $$;
ALTER TABLE attendancelogs ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMP;
ALTER TABLE attendancelogs ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMP;
ALTER TABLE attendancelogs ADD COLUMN IF NOT EXISTS scan_method VARCHAR(50);
ALTER TABLE attendancelogs ADD COLUMN IF NOT EXISTS scanned_by_user_id INTEGER;
ALTER TABLE attendancelogs ADD COLUMN IF NOT EXISTS event_id INTEGER;

-- Verify changes
SELECT 'organizers columns' as table_check, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'organizers'
AND column_name IN ('organizer_name', 'email', 'company')
UNION ALL
SELECT 'eventregistrations columns', column_name, data_type
FROM information_schema.columns
WHERE table_name = 'eventregistrations'
AND column_name IN ('status', 'registration_status')
UNION ALL
SELECT 'attendancelogs columns', column_name, data_type
FROM information_schema.columns
WHERE table_name = 'attendancelogs'
AND column_name IN ('log_id', 'check_in_time', 'check_out_time', 'scan_method', 'scanned_by_user_id', 'event_id');
