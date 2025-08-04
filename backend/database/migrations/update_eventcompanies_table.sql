-- First, drop existing constraints and indices
ALTER TABLE IF EXISTS eventcompanies DROP CONSTRAINT IF EXISTS eventcompanies_pkey CASCADE;

-- Drop the table and recreate it with new structure
DROP TABLE IF EXISTS eventcompanies;

CREATE TABLE eventcompanies (
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_eventcompanies_organizer_id ON eventcompanies(organizer_id);
CREATE INDEX IF NOT EXISTS idx_eventcompanies_type ON eventcompanies(company_type);
CREATE INDEX IF NOT EXISTS idx_eventcompanies_category ON eventcompanies(category);

-- Create update trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_eventcompanies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_eventcompanies_updated_at_trigger
    BEFORE UPDATE ON eventcompanies
    FOR EACH ROW
    EXECUTE FUNCTION update_eventcompanies_updated_at();
