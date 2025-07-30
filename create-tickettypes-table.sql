-- Create tickettypes table if it doesn't exist
CREATE TABLE IF NOT EXISTS tickettypes (
    ticket_type_id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    type_name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    quantity_available INTEGER NOT NULL DEFAULT 0,
    quantity_sold INTEGER DEFAULT 0,
    description TEXT,
    benefits TEXT, -- JSON or comma-separated list of benefits
    is_active BOOLEAN DEFAULT TRUE,
    sales_start_date TIMESTAMP,
    sales_end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_tickettypes_event_id ON tickettypes(event_id);
CREATE INDEX IF NOT EXISTS idx_tickettypes_active ON tickettypes(is_active);

-- Insert sample ticket types for existing events (if any)
-- This will only run if the table is empty
INSERT INTO tickettypes (event_id, type_name, price, quantity_available, description, benefits)
SELECT 
    e.event_id,
    'General Admission' as type_name,
    COALESCE(e.ticket_price, 0) as price,
    COALESCE(e.max_attendees, 100) as quantity_available,
    'Standard event ticket' as description,
    'Event access, Welcome kit' as benefits
FROM events e
WHERE NOT EXISTS (SELECT 1 FROM tickettypes WHERE event_id = e.event_id)
AND e.ticket_price IS NOT NULL
AND e.ticket_price > 0;
