-- Add missing columns to events table
DO $$ 
BEGIN 
    -- Add name if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'name'
    ) THEN
        ALTER TABLE events ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT 'Untitled Event';
    END IF;

    -- Add description if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'description'
    ) THEN
        ALTER TABLE events ADD COLUMN description TEXT;
    END IF;

    -- Add event_type if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'event_type'
    ) THEN
        ALTER TABLE events ADD COLUMN event_type VARCHAR(50) NOT NULL DEFAULT 'Other';
    END IF;

    -- Add start_date if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'start_date'
    ) THEN
        ALTER TABLE events ADD COLUMN start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- Add end_date if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'end_date'
    ) THEN
        ALTER TABLE events ADD COLUMN end_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- Add venue_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'venue_id'
    ) THEN
        ALTER TABLE events ADD COLUMN venue_id INTEGER REFERENCES venues(id);
    END IF;

    -- Add status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'status'
    ) THEN
        ALTER TABLE events ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'upcoming';
    END IF;

    -- Add image_url if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'image_url'
    ) THEN
        ALTER TABLE events ADD COLUMN image_url TEXT;
    END IF;

    -- Add created_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE events ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- Add updated_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE events ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Add constraints if they don't exist
DO $$ 
BEGIN 
    -- Add status check constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_name = 'events' AND constraint_name = 'valid_event_status'
    ) THEN
        ALTER TABLE events ADD CONSTRAINT valid_event_status 
            CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled'));
    END IF;

    -- Add date check constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_name = 'events' AND constraint_name = 'valid_event_dates'
    ) THEN
        ALTER TABLE events ADD CONSTRAINT valid_event_dates 
            CHECK (end_date >= start_date);
    END IF;
END $$;

-- Add indexes if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_events_dates') THEN
        CREATE INDEX idx_events_dates ON events(start_date, end_date);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_events_venue') THEN
        CREATE INDEX idx_events_venue ON events(venue_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_events_status') THEN
        CREATE INDEX idx_events_status ON events(status);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_events_type') THEN
        CREATE INDEX idx_events_type ON events(event_type);
    END IF;
END $$;
