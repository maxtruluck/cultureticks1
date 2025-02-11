-- Drop the existing check constraint
ALTER TABLE tickets DROP CONSTRAINT valid_status;

-- Add the new check constraint with 'pending' status
ALTER TABLE tickets ADD CONSTRAINT valid_status 
    CHECK (status IN ('available', 'sold', 'refunded', 'pending'));
