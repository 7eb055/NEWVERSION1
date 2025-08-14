-- Create companies table if it doesn't exist

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
    company_id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    company_type VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    address TEXT,
    contact_info JSONB NOT NULL,
    description TEXT,
    services TEXT,
    organizer_id INTEGER NOT NULL REFERENCES organizers(organizer_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_name)
);

-- Create index on organizer_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_organizer_id ON companies(organizer_id);

-- Create index on company type for filtering
CREATE INDEX IF NOT EXISTS idx_companies_type ON companies(company_type);

-- Create index on company category for filtering
CREATE INDEX IF NOT EXISTS idx_companies_category ON companies(category);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger only if it doesn't exist
DROP TRIGGER IF EXISTS update_companies_updated_at_trigger ON companies;
CREATE TRIGGER update_companies_updated_at_trigger
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_companies_updated_at();
