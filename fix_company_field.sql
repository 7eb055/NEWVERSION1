-- Fix for missing "company" column in organizers table
-- The backend code is looking for o.company but we have o.company_name in the database

-- Option 1: Add company column that mirrors company_name
ALTER TABLE organizers ADD COLUMN IF NOT EXISTS company VARCHAR(255);
UPDATE organizers SET company = company_name WHERE company IS NULL;

-- Option 2 (alternative): We can modify the backend query instead to use company_name
-- In the backend code, replace "o.company as organizer_company" with "o.company_name as organizer_company"

-- Check if the columns we need are now present
SELECT 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'organizers' 
    AND column_name IN ('organizer_name', 'email', 'company');
