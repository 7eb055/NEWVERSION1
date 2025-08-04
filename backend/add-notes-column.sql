-- Add notes column to eventregistrations table
DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE eventregistrations 
        ADD COLUMN notes TEXT;
    EXCEPTION 
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column notes already exists';
    END;
END $$;
