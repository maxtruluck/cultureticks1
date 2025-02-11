-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_status_date ON events(status, start_date) WHERE status = 'upcoming';
CREATE INDEX IF NOT EXISTS idx_tickets_event_status ON tickets(event_id, status) WHERE status = 'available';
CREATE INDEX IF NOT EXISTS idx_tickets_event_type_price ON tickets(event_id, ticket_type, price);
