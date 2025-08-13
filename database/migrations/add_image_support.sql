-- Update events table to support both URL and local file images
-- Add columns for better image handling

-- Add new columns if they don't exist
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS image_filename VARCHAR(255),
ADD COLUMN IF NOT EXISTS image_type VARCHAR(50) DEFAULT 'url',
ADD COLUMN IF NOT EXISTS image_size INTEGER,
ADD COLUMN IF NOT EXISTS image_mimetype VARCHAR(100);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_events_image_type ON events(image_type);
CREATE INDEX IF NOT EXISTS idx_events_image_filename ON events(image_filename);

-- Update existing records to set proper image_type
UPDATE events 
SET image_type = 'url' 
WHERE image_url IS NOT NULL AND image_type IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN events.image_url IS 'Either full URL for external images or relative path for local uploads';
COMMENT ON COLUMN events.image_filename IS 'Original filename for uploaded images';
COMMENT ON COLUMN events.image_type IS 'Type of image: url (external) or file (local upload)';
COMMENT ON COLUMN events.image_size IS 'File size in bytes for uploaded images';
COMMENT ON COLUMN events.image_mimetype IS 'MIME type of uploaded images';

-- Example of how the data should look:
-- For URL images:
-- image_url: 'https://example.com/image.jpg'
-- image_type: 'url'
-- image_filename: NULL
-- image_size: NULL
-- image_mimetype: NULL

-- For uploaded files:
-- image_url: '/uploads/events/event-1234567890-image.jpg'
-- image_type: 'file'
-- image_filename: 'event-1234567890-image.jpg'
-- image_size: 1048576
-- image_mimetype: 'image/jpeg'
