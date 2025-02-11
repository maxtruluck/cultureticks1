-- Rename columns in events table
ALTER TABLE events RENAME COLUMN title TO name;
ALTER TABLE events RENAME COLUMN start_time TO start_date;
ALTER TABLE events RENAME COLUMN end_time TO end_date;

-- Add new columns to events table
ALTER TABLE events ADD COLUMN event_type VARCHAR(50);
ALTER TABLE events ADD COLUMN status VARCHAR(20) DEFAULT 'upcoming';
ALTER TABLE events ADD COLUMN image_url TEXT;

-- Create venues table
CREATE TABLE venues (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip VARCHAR(20),
    capacity INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add venue reference to events
ALTER TABLE events ADD COLUMN venue_id INTEGER REFERENCES venues(id);

-- Migrate location data to venues
INSERT INTO venues (name, city, state)
SELECT DISTINCT location, 'San Francisco', 'CA'
FROM events;

-- Update events with venue references
UPDATE events e
SET venue_id = v.id
FROM venues v
WHERE e.location = v.name;

-- Remove old location column
ALTER TABLE events DROP COLUMN location;
