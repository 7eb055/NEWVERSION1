-- Fix for missing registration_status column in eventregistrations table
-- The backend code is looking for er.registration_status but the database has er.status

-- Option 1: Add registration_status column that mirrors status
ALTER TABLE eventregistrations ADD registration_status VARCHAR(50);
UPDATE eventregistrations SET registration_status = status WHERE registration_status IS NULL;

-- Check if the column was added
SELECT 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'eventregistrations' 
    AND column_name IN ('status', 'registration_status');
