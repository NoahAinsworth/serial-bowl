-- Update calculate_binge_points to also check for season/show watches directly
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
  -- A season is complete if either:
  -- 1. All episodes in season_episode_counts are watched, OR
  -- 2. The season itself is marked as watched in the watched table
  WITH user_watched_seasons AS (
    -- Get seasons directly marked as watched
    SELECT c.external_id, sec.episode_count
    FROM watched w
    JOIN content c ON c.id = w.content_id
    JOIN season_episode_counts sec ON sec.external_id = c.external_id
    WHERE w.user_id = p_user_id
      AND c.kind = 'season'
  ),
  episode_completed_seasons AS (
    -- Get seasons where all episodes are watched
    SELECT 
      SPLIT_PART(c.external_id, ':', 1) || ':' || SPLIT_PART(c.external_id, ':', 2) as season_id,
      COUNT(*) as watched_count
    FROM watched w
    JOIN content c ON c.id = w.content_id
    WHERE w.user_id = p_user_id
      AND c.kind = 'episode'
    GROUP BY SPLIT_PART(c.external_id, ':', 1) || ':' || SPLIT_PART(c.external_id, ':', 2)
  ),
  all_completed_seasons AS (
    -- Combine both methods
    SELECT external_id as season_id, episode_count
    FROM user_watched_seasons
    UNION
    SELECT ecs.season_id, sec.episode_count
    FROM episode_completed_seasons ecs
    JOIN season_episode_counts sec ON sec.external_id = ecs.season_id
    WHERE ecs.watched_count >= sec.episode_count
  )
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN episode_count BETWEEN 1 AND 6 THEN 5
        WHEN episode_count BETWEEN 7 AND 13 THEN 10
        WHEN episode_count >= 14 THEN 15
        ELSE 0
      END
    ), 0),
    COUNT(*)
  INTO v_season_bonuses, v_completed_seasons
  FROM all_completed_seasons;

  -- Calculate show completion bonuses
  -- A show is complete if either:
  -- 1. All episodes in show_season_counts are watched, OR
  -- 2. The show itself is marked as watched in the watched table
  WITH user_watched_shows AS (
    -- Get shows directly marked as watched
    SELECT c.external_id
    FROM watched w
    JOIN content c ON c.id = w.content_id
    WHERE w.user_id = p_user_id
      AND c.kind = 'show'
  ),
  episode_completed_shows AS (
    -- Get shows where all episodes are watched
    SELECT 
      SPLIT_PART(c.external_id, ':', 1) as show_id,
      COUNT(*) as watched_count
    FROM watched w
    JOIN content c ON c.id = w.content_id
    WHERE w.user_id = p_user_id
      AND c.kind = 'episode'
    GROUP BY SPLIT_PART(c.external_id, ':', 1)
  ),
  all_completed_shows AS (
    -- Combine both methods
    SELECT external_id as show_id
    FROM user_watched_shows
    UNION
    SELECT ecs.show_id
    FROM episode_completed_shows ecs
    JOIN show_season_counts ssc ON ssc.external_id = ecs.show_id
    WHERE ecs.watched_count >= ssc.total_episode_count
  )
  SELECT 
    COUNT(*) * 100,
    COUNT(*)
  INTO v_show_bonuses, v_completed_shows
  FROM all_completed_shows;

  RETURN QUERY SELECT 
    v_episode_points + v_season_bonuses + v_show_bonuses as total_points,
    v_episode_points,
    v_season_bonuses,
    v_show_bonuses,
    v_completed_seasons,
    v_completed_shows;
END;
$$;