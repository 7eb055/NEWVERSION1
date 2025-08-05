-- Increase the length of qr_code column to store base64 encoded QR codes
ALTER TABLE eventregistrations ALTER COLUMN qr_code SET DATA TYPE TEXT;
ALTER TABLE eventregistrations ALTER COLUMN qr_data SET DATA TYPE TEXT;
