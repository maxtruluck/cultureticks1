-- Create events table
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    venue_id INTEGER REFERENCES venues(id),
    status VARCHAR(20) NOT NULL DEFAULT 'upcoming',
    organizer_id INTEGER,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_event_status CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
    CONSTRAINT valid_event_dates CHECK (end_date >= start_date)
);

-- Add indexes for common queries
CREATE INDEX idx_events_dates ON events(start_date, end_date);
CREATE INDEX idx_events_venue ON events(venue_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_type ON events(event_type);
