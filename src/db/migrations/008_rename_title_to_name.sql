-- Rename title column to name if it exists
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'title'
    ) THEN
        ALTER TABLE events RENAME COLUMN title TO name;
    END IF;
END $$;
