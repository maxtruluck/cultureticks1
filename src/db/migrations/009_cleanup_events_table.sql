-- Drop redundant columns and rename others for consistency
ALTER TABLE events 
    DROP COLUMN title,
    DROP COLUMN start_time,
    DROP COLUMN end_time,
    DROP COLUMN location;
