-- Add Paystack-specific columns to existing payments table
-- This migration adds the necessary fields for Paystack integration

-- Add new columns for Paystack integration
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS paystack_reference VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS paystack_transaction_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS paystack_access_code VARCHAR(255),
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'GHS',
ADD COLUMN IF NOT EXISTS gateway_response TEXT,
ADD COLUMN IF NOT EXISTS channel VARCHAR(50),
ADD COLUMN IF NOT EXISTS fees_breakdown JSONB,
ADD COLUMN IF NOT EXISTS authorization_code VARCHAR(255),
ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS event_id INTEGER,
ADD COLUMN IF NOT EXISTS user_id INTEGER,
ADD COLUMN IF NOT EXISTS initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add foreign key constraints for new columns
ALTER TABLE payments 
ADD CONSTRAINT IF NOT EXISTS fk_payments_event_id 
FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE;

ALTER TABLE payments 
ADD CONSTRAINT IF NOT EXISTS fk_payments_user_id 
FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_paystack_reference ON payments(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_event_id ON payments(event_id);

-- Add trigger function to update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop existing one first if exists)
DROP TRIGGER IF EXISTS update_payments_updated_at_trigger ON payments;
CREATE TRIGGER update_payments_updated_at_trigger
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

-- Create view for payment summary
CREATE OR REPLACE VIEW payment_summary AS
SELECT 
    p.payment_id,
    p.paystack_reference,
    p.transaction_id,
    p.amount,
    p.currency,
    p.payment_status,
    p.payment_method,
    p.customer_email,
    p.customer_name,
    p.initiated_at,
    p.paid_at,
    p.payment_date,
    e.event_title,
    e.event_date,
    u.full_name as user_name
FROM payments p
LEFT JOIN events e ON p.event_id = e.event_id
LEFT JOIN users u ON p.user_id = u.user_id
ORDER BY p.initiated_at DESC;
