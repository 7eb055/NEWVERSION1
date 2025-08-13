-- Create eventfeedback table for storing user feedback and reviews
-- Run this script in your PostgreSQL database

-- First, check if the table exists
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'eventfeedback') THEN
    -- Create the eventfeedback table
    CREATE TABLE eventfeedback (
      feedback_id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
      attendee_id INTEGER NOT NULL REFERENCES attendees(attendee_id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      feedback_text TEXT,
      is_anonymous BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      
      -- Ensure one feedback per attendee per event
      UNIQUE(event_id, attendee_id)
    );

    -- Create indexes for better performance
    CREATE INDEX idx_eventfeedback_event_id ON eventfeedback(event_id);
    CREATE INDEX idx_eventfeedback_attendee_id ON eventfeedback(attendee_id);
    CREATE INDEX idx_eventfeedback_rating ON eventfeedback(rating);
    CREATE INDEX idx_eventfeedback_created_at ON eventfeedback(created_at);

    -- Create trigger to update updated_at timestamp
    CREATE OR REPLACE FUNCTION update_feedback_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_update_feedback_updated_at
      BEFORE UPDATE ON eventfeedback
      FOR EACH ROW
      EXECUTE FUNCTION update_feedback_updated_at();

    RAISE NOTICE 'eventfeedback table created successfully with indexes and triggers';
  ELSE
    RAISE NOTICE 'eventfeedback table already exists';
  END IF;
END $$;

-- Insert some sample feedback data (optional)
-- Make sure to replace the event_id and attendee_id values with actual IDs from your database

-- First, let's check if we have any events and attendees
DO $$
DECLARE
  event_count INTEGER;
  attendee_count INTEGER;
  sample_event_id INTEGER;
  sample_attendee_id INTEGER;
BEGIN
  -- Check if we have events and attendees
  SELECT COUNT(*) INTO event_count FROM events LIMIT 1;
  SELECT COUNT(*) INTO attendee_count FROM attendees LIMIT 1;
  
  IF event_count > 0 AND attendee_count > 0 THEN
    -- Get first event and attendee for sample data
    SELECT event_id INTO sample_event_id FROM events ORDER BY event_id LIMIT 1;
    SELECT attendee_id INTO sample_attendee_id FROM attendees ORDER BY attendee_id LIMIT 1;
    
    -- Insert sample feedback if none exists
    INSERT INTO eventfeedback (event_id, attendee_id, rating, feedback_text, is_anonymous)
    VALUES 
      (sample_event_id, sample_attendee_id, 5, 'Amazing event! Great organization and fantastic speakers.', FALSE)
    ON CONFLICT (event_id, attendee_id) DO NOTHING;
    
    RAISE NOTICE 'Sample feedback data inserted (if not already present)';
  ELSE
    RAISE NOTICE 'No events or attendees found - skipping sample data insertion';
  END IF;
END $$;

-- Verify the table was created
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'eventfeedback' 
ORDER BY ordinal_position;
