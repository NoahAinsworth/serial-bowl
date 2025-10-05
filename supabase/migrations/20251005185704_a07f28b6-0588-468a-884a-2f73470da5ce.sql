-- Update schema to match code expectations

-- Rename rating_value to rating in ratings table
ALTER TABLE public.ratings RENAME COLUMN rating_value TO rating;

-- Update the check constraint
ALTER TABLE public.ratings DROP CONSTRAINT IF EXISTS ratings_rating_value_check;
ALTER TABLE public.ratings ADD CONSTRAINT ratings_rating_check CHECK (rating >= 0 AND rating <= 1);

-- Add air_date column to content table (extracted from metadata for easier querying)
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS air_date DATE;

-- Rename content_aggregates to aggregates
ALTER TABLE public.content_aggregates RENAME TO aggregates;

-- Rename message_text to text_content in dms table
ALTER TABLE public.dms RENAME COLUMN message_text TO text_content;