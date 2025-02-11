-- Add payment_intent_id to tickets table
ALTER TABLE tickets
ADD COLUMN payment_intent_id VARCHAR(255),
ADD COLUMN payment_status VARCHAR(50) DEFAULT 'pending';

-- Create index on payment_intent_id
CREATE INDEX idx_tickets_payment_intent_id ON tickets(payment_intent_id);

-- Create payments table to track payment history
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    payment_intent_id VARCHAR(255) NOT NULL,
    amount INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'usd',
    status VARCHAR(50) NOT NULL,
    customer_email VARCHAR(255),
    customer_name VARCHAR(255),
    event_id INTEGER REFERENCES events(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
