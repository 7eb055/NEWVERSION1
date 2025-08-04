-- Increase varchar lengths for attendees table
ALTER TABLE attendees ALTER COLUMN full_name TYPE varchar(1000);
ALTER TABLE attendees ALTER COLUMN phone TYPE varchar(100);
ALTER TABLE attendees ALTER COLUMN gender TYPE varchar(100);
ALTER TABLE attendees ALTER COLUMN interests TYPE varchar(2000);
ALTER TABLE attendees ALTER COLUMN emergency_contact_name TYPE varchar(1000);
ALTER TABLE attendees ALTER COLUMN emergency_contact_phone TYPE varchar(100);
ALTER TABLE attendees ALTER COLUMN dietary_restrictions TYPE text;
ALTER TABLE attendees ALTER COLUMN accessibility_needs TYPE text;
ALTER TABLE attendees ALTER COLUMN profile_picture_url TYPE varchar(2000);
ALTER TABLE attendees ALTER COLUMN bio TYPE text;
ALTER TABLE attendees ALTER COLUMN social_media_links TYPE text;
ALTER TABLE attendees ALTER COLUMN notification_preferences TYPE text;
