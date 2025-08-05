-- Add or modify QR code columns in eventregistrations table
ALTER TABLE eventregistrations ALTER COLUMN qr_code TYPE TEXT;
ALTER TABLE eventregistrations ALTER COLUMN qr_data TYPE TEXT;
ALTER TABLE eventregistrations ADD COLUMN IF NOT EXISTS qr_generated_at TIMESTAMP;
