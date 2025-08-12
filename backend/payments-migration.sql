-- Create payments table for Paystack integration (PostgreSQL compatible)
CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    registration_id INTEGER REFERENCES eventregistrations(registration_id) ON DELETE CASCADE,
    event_id INTEGER REFERENCES events(event_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Paystack specific fields
    paystack_reference VARCHAR(255) UNIQUE NOT NULL,
    paystack_transaction_id VARCHAR(255),
    paystack_access_code VARCHAR(255),
    
    -- Payment details
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'GHS',
    payment_method VARCHAR(50),
    payment_status VARCHAR(50) DEFAULT 'pending',
    
    -- Paystack response data
    gateway_response TEXT,
    channel VARCHAR(50),
    fees_breakdown JSONB,
    authorization_code VARCHAR(255),
    
    -- Customer information
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    
    -- Timestamps
    initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP,
    verified_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    metadata JSONB
);

-- Create indexes separately
CREATE INDEX IF NOT EXISTS idx_payments_registration_id ON payments(registration_id);
CREATE INDEX IF NOT EXISTS idx_payments_paystack_reference ON payments(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_event_id ON payments(event_id);

-- Add trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
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
    p.amount,
    p.currency,
    p.payment_status,
    p.payment_method,
    p.customer_email,
    p.customer_name,
    p.initiated_at,
    p.paid_at,
    e.event_title,
    e.event_date,
    u.full_name as user_name
FROM payments p
LEFT JOIN events e ON p.event_id = e.event_id
LEFT JOIN users u ON p.user_id = u.user_id
ORDER BY p.initiated_at DESC;
