-- Step 1: Fix calculate_binge_points function to correctly count seasons from both direct watches and shows
CREATE OR REPLACE FUNCTION public.calculate_binge_points(p_user_id uuid)
 RETURNS TABLE(total_points integer, episode_points integer, season_bonuses integer, show_bonuses integer, completed_seasons integer, completed_shows integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_episode_points INTEGER := 0;
  v_season_bonuses INTEGER := 0;
  v_show_bonuses INTEGER := 0;
  v_completed_seasons INTEGER := 0;
  v_completed_shows INTEGER := 0;
  v_points_from_shows INTEGER := 0;
  v_points_from_seasons INTEGER := 0;
  v_points_from_episodes INTEGER := 0;
BEGIN
  -- Calculate episode points from watched shows
  SELECT COALESCE(SUM(ssc.total_episode_count), 0)
  INTO v_points_from_shows
  FROM watched w
  JOIN content c ON c.id = w.content_id
  JOIN show_season_counts ssc ON ssc.external_id = c.external_id
  WHERE w.user_id = p_user_id AND c.kind = 'show';

  -- Calculate episode points from watched seasons (not part of watched shows)
  SELECT COALESCE(SUM(sec.episode_count), 0)
  INTO v_points_from_seasons
  FROM watched w
  JOIN content c ON c.id = w.content_id
  JOIN season_episode_counts sec ON sec.external_id = c.external_id
  WHERE w.user_id = p_user_id 
    AND c.kind = 'season'
    AND NOT EXISTS (
      SELECT 1 FROM watched w2
      JOIN content c2 ON c2.id = w2.content_id
      WHERE w2.user_id = p_user_id
        AND c2.kind = 'show'
        AND c2.external_id = SPLIT_PART(c.external_id, ':', 1)
    );

  -- Calculate episode points from individual episodes (not part of watched seasons or shows)
  SELECT COUNT(*)
  INTO v_points_from_episodes
  FROM watched w
  JOIN content c ON c.id = w.content_id
  WHERE w.user_id = p_user_id
    AND c.kind = 'episode'
    AND NOT EXISTS (
      SELECT 1 FROM watched w2
      JOIN content c2 ON c2.id = w2.content_id
      WHERE w2.user_id = p_user_id
        AND c2.kind = 'season'
        AND c2.external_id = SPLIT_PART(c.external_id, ':', 1) || ':' || SPLIT_PART(c.external_id, ':', 2)
    )
    AND NOT EXISTS (
      SELECT 1 FROM watched w2
      JOIN content c2 ON c2.id = w2.content_id
      WHERE w2.user_id = p_user_id
        AND c2.kind = 'show'
        AND c2.external_id = SPLIT_PART(c.external_id, ':', 1)
    );

  v_episode_points := v_points_from_shows + v_points_from_seasons + v_points_from_episodes;

  -- FIXED: Calculate season bonuses from BOTH directly watched seasons AND all seasons within watched shows
  WITH watched_seasons AS (
    -- Get directly watched seasons (not part of watched shows)
    SELECT c.external_id, sec.episode_count
    FROM watched w
    JOIN content c ON c.id = w.content_id
    JOIN season_episode_counts sec ON sec.external_id = c.external_id
    WHERE w.user_id = p_user_id
      AND c.kind = 'season'
      AND NOT EXISTS (
        SELECT 1 FROM watched w2
        JOIN content c2 ON c2.id = w2.content_id
        WHERE w2.user_id = p_user_id
          AND c2.kind = 'show'
          AND c2.external_id = SPLIT_PART(c.external_id, ':', 1)
      )
  ),
  show_seasons AS (
    -- Get ALL seasons from watched shows
    SELECT sec.external_id, sec.episode_count
    FROM watched w
    JOIN content c ON c.id = w.content_id
    JOIN season_episode_counts sec ON SPLIT_PART(sec.external_id, ':', 1) = c.external_id
    WHERE w.user_id = p_user_id
      AND c.kind = 'show'
  ),
  all_bonus_seasons AS (
    SELECT episode_count FROM watched_seasons
    UNION ALL
    SELECT episode_count FROM show_seasons
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
  FROM all_bonus_seasons;

  -- Calculate show bonuses
  SELECT 
    COUNT(*) * 100,
    COUNT(*)
  INTO v_show_bonuses, v_completed_shows
  FROM watched w
  JOIN content c ON c.id = w.content_id
  WHERE w.user_id = p_user_id
    AND c.kind = 'show';

  RETURN QUERY SELECT 
    v_episode_points + v_season_bonuses + v_show_bonuses as total_points,
    v_episode_points,
    v_season_bonuses,
    v_show_bonuses,
    v_completed_seasons,
    v_completed_shows;
END;
$function$;

-- Step 2: Clean up ALL stale data (will require user to re-watch)
DELETE FROM season_episode_counts;
DELETE FROM show_season_counts;