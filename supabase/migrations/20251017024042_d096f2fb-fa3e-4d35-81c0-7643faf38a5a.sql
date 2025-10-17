-- Add missing columns to watched_episodes table
ALTER TABLE watched_episodes 
ADD COLUMN IF NOT EXISTS show_id INTEGER,
ADD COLUMN IF NOT EXISTS season_number INTEGER,
ADD COLUMN IF NOT EXISTS episode_number INTEGER;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_watched_episodes_user_show_season_ep 
ON watched_episodes(user_id, show_id, season_number, episode_number);

-- Drop existing constraint if it exists (in case of retry)
DO $$ 
BEGIN
  ALTER TABLE watched_episodes DROP CONSTRAINT IF EXISTS watched_episodes_unique;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

-- Create unique constraint to prevent duplicates
ALTER TABLE watched_episodes 
ADD CONSTRAINT watched_episodes_unique 
UNIQUE (user_id, show_id, season_number, episode_number);