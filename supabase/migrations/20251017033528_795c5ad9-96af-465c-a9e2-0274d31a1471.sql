-- Add binge_points column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS binge_points INTEGER DEFAULT 0;

-- Create table to cache episode counts per season
CREATE TABLE IF NOT EXISTS season_episode_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE,
  episode_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table to cache show season/episode counts
CREATE TABLE IF NOT EXISTS show_season_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE,
  season_count INTEGER NOT NULL DEFAULT 0,
  total_episode_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE season_episode_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE show_season_counts ENABLE ROW LEVEL SECURITY;

-- RLS policies for season_episode_counts (read-only for authenticated users)
CREATE POLICY "Authenticated users can view season episode counts"
  ON season_episode_counts FOR SELECT
  TO authenticated
  USING (true);

-- RLS policies for show_season_counts (read-only for authenticated users)
CREATE POLICY "Authenticated users can view show season counts"
  ON show_season_counts FOR SELECT
  TO authenticated
  USING (true);

-- Function to calculate binge points for a user
CREATE OR REPLACE FUNCTION calculate_binge_points(p_user_id uuid)
RETURNS TABLE(
  total_points INTEGER,
  episode_points INTEGER,
  season_bonuses INTEGER,
  show_bonuses INTEGER,
  completed_seasons INTEGER,
  completed_shows INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_episode_points INTEGER := 0;
  v_season_bonuses INTEGER := 0;
  v_show_bonuses INTEGER := 0;
  v_completed_seasons INTEGER := 0;
  v_completed_shows INTEGER := 0;
BEGIN
  -- Count unique episodes watched
  SELECT COUNT(DISTINCT c.id)
  INTO v_episode_points
  FROM watched w
  JOIN content c ON c.id = w.content_id
  WHERE w.user_id = p_user_id
    AND c.kind = 'episode';

  -- Calculate season completion bonuses
  WITH season_progress AS (
    SELECT 
      SPLIT_PART(c.external_id, ':', 1) || ':' || SPLIT_PART(c.external_id, ':', 2) as season_id,
      COUNT(*) as watched_count
    FROM watched w
    JOIN content c ON c.id = w.content_id
    WHERE w.user_id = p_user_id
      AND c.kind = 'episode'
    GROUP BY SPLIT_PART(c.external_id, ':', 1) || ':' || SPLIT_PART(c.external_id, ':', 2)
  ),
  completed_seasons_list AS (
    SELECT 
      sp.season_id,
      sp.watched_count,
      sec.episode_count,
      CASE 
        WHEN sec.episode_count BETWEEN 1 AND 6 THEN 5
        WHEN sec.episode_count BETWEEN 7 AND 13 THEN 10
        WHEN sec.episode_count >= 14 THEN 15
        ELSE 0
      END as bonus
    FROM season_progress sp
    JOIN season_episode_counts sec ON sec.external_id = sp.season_id
    WHERE sp.watched_count >= sec.episode_count
  )
  SELECT 
    COALESCE(SUM(bonus), 0),
    COUNT(*)
  INTO v_season_bonuses, v_completed_seasons
  FROM completed_seasons_list;

  -- Calculate show completion bonuses
  WITH show_progress AS (
    SELECT 
      SPLIT_PART(c.external_id, ':', 1) as show_id,
      COUNT(*) as watched_count
    FROM watched w
    JOIN content c ON c.id = w.content_id
    WHERE w.user_id = p_user_id
      AND c.kind = 'episode'
    GROUP BY SPLIT_PART(c.external_id, ':', 1)
  ),
  completed_shows_list AS (
    SELECT 
      sp.show_id,
      sp.watched_count,
      ssc.total_episode_count
    FROM show_progress sp
    JOIN show_season_counts ssc ON ssc.external_id = sp.show_id
    WHERE sp.watched_count >= ssc.total_episode_count
  )
  SELECT 
    COUNT(*) * 100,
    COUNT(*)
  INTO v_show_bonuses, v_completed_shows
  FROM completed_shows_list;

  RETURN QUERY SELECT 
    v_episode_points + v_season_bonuses + v_show_bonuses as total_points,
    v_episode_points,
    v_season_bonuses,
    v_show_bonuses,
    v_completed_seasons,
    v_completed_shows;
END;
$$;

-- Function to determine badge tier from points
CREATE OR REPLACE FUNCTION get_badge_tier(p_points INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE
    WHEN p_points >= 1200 THEN RETURN 'Ultimate Binger';
    WHEN p_points >= 800 THEN RETURN 'Stream Scholar';
    WHEN p_points >= 500 THEN RETURN 'Series Finisher';
    WHEN p_points >= 300 THEN RETURN 'Season Smasher';
    WHEN p_points >= 150 THEN RETURN 'Marathon Madness';
    WHEN p_points >= 50 THEN RETURN 'Casual Viewer';
    ELSE RETURN 'Pilot Watcher';
  END CASE;
END;
$$;

-- Function to update user's binge points and badge
CREATE OR REPLACE FUNCTION update_user_binge_points(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_points RECORD;
  v_old_badge TEXT;
  v_new_badge TEXT;
BEGIN
  -- Get current badge
  SELECT badge_tier INTO v_old_badge
  FROM profiles
  WHERE id = p_user_id;

  -- Calculate new points
  SELECT * INTO v_points
  FROM calculate_binge_points(p_user_id);

  -- Calculate new badge
  v_new_badge := get_badge_tier(v_points.total_points);

  -- Update profile
  UPDATE profiles
  SET 
    binge_points = v_points.total_points,
    badge_tier = v_new_badge,
    badge_updated_at = CASE 
      WHEN v_old_badge IS DISTINCT FROM v_new_badge THEN NOW()
      ELSE badge_updated_at
    END
  WHERE id = p_user_id;
END;
$$;

-- Function to update season episode count
CREATE OR REPLACE FUNCTION update_season_episode_count(
  p_season_external_id TEXT,
  p_episode_count INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO season_episode_counts (external_id, episode_count)
  VALUES (p_season_external_id, p_episode_count)
  ON CONFLICT (external_id) 
  DO UPDATE SET 
    episode_count = p_episode_count,
    updated_at = NOW();
END;
$$;

-- Function to update show counts
CREATE OR REPLACE FUNCTION update_show_counts(
  p_show_external_id TEXT,
  p_season_count INTEGER,
  p_total_episode_count INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO show_season_counts (external_id, season_count, total_episode_count)
  VALUES (p_show_external_id, p_season_count, p_total_episode_count)
  ON CONFLICT (external_id)
  DO UPDATE SET
    season_count = p_season_count,
    total_episode_count = p_total_episode_count,
    updated_at = NOW();
END;
$$;

-- Trigger function to update binge points when watched changes
CREATE OR REPLACE FUNCTION trigger_update_binge_points()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
    PERFORM update_user_binge_points(COALESCE(NEW.user_id, OLD.user_id));
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger on watched table
DROP TRIGGER IF EXISTS watched_update_binge_points ON watched;
CREATE TRIGGER watched_update_binge_points
AFTER INSERT OR DELETE ON watched
FOR EACH ROW
EXECUTE FUNCTION trigger_update_binge_points();