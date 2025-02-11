-- Add locked_at timestamp to tickets table
ALTER TABLE tickets
ADD COLUMN locked_at TIMESTAMP WITH TIME ZONE;
