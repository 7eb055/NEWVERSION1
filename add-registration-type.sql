-- Add registration_type column to eventregistrations table if it doesn't exist
BEGIN TRY
    IF NOT EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID('eventregistrations')
        AND name = 'registration_type'
    )
    BEGIN
        ALTER TABLE eventregistrations 
        ADD registration_type VARCHAR(50) DEFAULT 'standard';
    END

    -- Update existing records to have the default value
    UPDATE eventregistrations 
    SET registration_type = 'standard' 
    WHERE registration_type IS NULL;
END TRY
BEGIN CATCH
    PRINT 'Error adding registration_type column: ' + ERROR_MESSAGE();
END CATCH;
