-- Fix add_binge_points to verify caller matches target user
CREATE OR REPLACE FUNCTION public.add_binge_points(p_user_id uuid, p_points integer, p_daily_cap integer DEFAULT 200)
RETURNS TABLE(points_added integer, daily_total integer, cap_reached boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_daily INTEGER;
  v_reset_at TIMESTAMPTZ;
  v_points_to_add INTEGER;
  v_new_daily INTEGER;
BEGIN
  -- Security check: verify caller is modifying their own data
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: can only modify own binge points';
  END IF;

  -- Get current daily state
  SELECT daily_points_earned, daily_points_reset_at 
  INTO v_current_daily, v_reset_at
  FROM profiles WHERE id = p_user_id;
  
  -- Reset daily counter if new day (UTC)
  IF v_reset_at IS NULL OR v_reset_at::date < now()::date THEN
    v_current_daily := 0;
    UPDATE profiles 
    SET daily_points_earned = 0, daily_points_reset_at = now()
    WHERE id = p_user_id;
  END IF;
  
  -- Calculate how many points can be added
  v_points_to_add := LEAST(p_points, p_daily_cap - v_current_daily);
  v_points_to_add := GREATEST(v_points_to_add, 0);
  
  v_new_daily := v_current_daily + v_points_to_add;
  
  -- Update profile
  UPDATE profiles
  SET binge_points = COALESCE(binge_points, 0) + v_points_to_add,
      daily_points_earned = v_new_daily
  WHERE id = p_user_id;
  
  RETURN QUERY SELECT v_points_to_add, v_new_daily, (v_new_daily >= p_daily_cap);
END;
$$;

-- Fix reverse_binge_points_for_show to verify caller matches target user
CREATE OR REPLACE FUNCTION public.reverse_binge_points_for_show(p_user_id uuid, p_show_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points_to_reverse INTEGER;
BEGIN
  -- Security check: verify caller is modifying their own data
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: can only modify own binge points';
  END IF;

  -- Calculate total unreversed points for this show
  SELECT COALESCE(SUM(points_earned + COALESCE(season_bonus, 0) + COALESCE(show_bonus, 0)), 0)
  INTO v_points_to_reverse
  FROM binge_point_logs 
  WHERE user_id = p_user_id 
  AND show_id = p_show_id 
  AND is_reversed = false;
  
  -- Subtract points from profile (never go below 0)
  UPDATE profiles 
  SET binge_points = GREATEST(0, COALESCE(binge_points, 0) - v_points_to_reverse)
  WHERE id = p_user_id;
  
  -- Mark logs as reversed
  UPDATE binge_point_logs
  SET is_reversed = true
  WHERE user_id = p_user_id 
  AND show_id = p_show_id 
  AND is_reversed = false;
END;
$$;

-- Fix recalculate_user_show_score to verify caller matches target user
CREATE OR REPLACE FUNCTION public.recalculate_user_show_score(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_show_score INTEGER;
BEGIN
  -- Security check: verify caller is modifying their own data
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: can only recalculate own show score';
  END IF;

  WITH user_episode_totals AS (
    -- 1) Episodes from watched SHOWS
    SELECT COALESCE(SUM(ssc.total_episode_count), 0) AS episodes
    FROM watched w
    JOIN content c ON c.id = w.content_id AND c.kind = 'show'
    LEFT JOIN show_season_counts ssc ON ssc.external_id = c.external_id
    WHERE w.user_id = p_user_id

    UNION ALL

    -- 2) Episodes from watched SEASONS (not in watched shows)
    SELECT COALESCE(SUM(sec.episode_count), 0) AS episodes
    FROM watched w
    JOIN content c ON c.id = w.content_id AND c.kind = 'season'
    LEFT JOIN season_episode_counts sec ON sec.external_id = c.external_id
    WHERE w.user_id = p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM watched w2
        JOIN content c2 ON c2.id = w2.content_id AND c2.kind = 'show'
        WHERE w2.user_id = w.user_id
          AND c2.external_id = SPLIT_PART(c.external_id, ':', 1)
      )

    UNION ALL

    -- 3) Individual EPISODES (not in watched seasons or shows)
    SELECT COUNT(*)::bigint AS episodes
    FROM watched w
    JOIN content c ON c.id = w.content_id AND c.kind = 'episode'
    WHERE w.user_id = p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM watched w2
        JOIN content c2 ON c2.id = w2.content_id AND c2.kind = 'season'
        WHERE w2.user_id = w.user_id
          AND c2.external_id = SPLIT_PART(c.external_id, ':', 1) || ':' || SPLIT_PART(c.external_id, ':', 2)
      )
      AND NOT EXISTS (
        SELECT 1 FROM watched w2
        JOIN content c2 ON c2.id = w2.content_id AND c2.kind = 'show'
        WHERE w2.user_id = w.user_id
          AND c2.external_id = SPLIT_PART(c.external_id, ':', 1)
      )
  )
  SELECT COALESCE(SUM(episodes), 0)::integer INTO v_new_show_score
  FROM user_episode_totals;

  -- Update profile
  UPDATE profiles
  SET show_score = v_new_show_score,
      binge_score = v_new_show_score + COALESCE(binge_points, 0)
  WHERE id = p_user_id;

  RETURN v_new_show_score;
END;
$$;