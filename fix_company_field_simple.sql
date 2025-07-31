-- Fix for missing "company" column in organizers table
-- The backend code is looking for o.company but we have o.company_name in the database

-- Add company column that mirrors company_name
ALTER TABLE organizers ADD company VARCHAR(255);

-- Copy values from company_name
UPDATE organizers 
SET company = company_name 
WHERE company IS NULL;

-- Check if the columns we need are now present
SELECT 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'organizers' 
    AND column_name IN ('organizer_name', 'email', 'company');
