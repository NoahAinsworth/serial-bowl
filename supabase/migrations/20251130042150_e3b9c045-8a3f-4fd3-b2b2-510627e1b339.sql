-- ============================================
-- BOWL SCORE SYSTEM: Global + Personal Scores
-- ============================================

-- 1. Create table for global bowl scores (all users combined)
CREATE TABLE IF NOT EXISTS public.show_bowl_scores (
  show_id TEXT PRIMARY KEY,
  bowl_score INTEGER,
  episode_avg NUMERIC,
  episode_count INTEGER DEFAULT 0,
  season_avg NUMERIC,
  season_count INTEGER DEFAULT 0,
  show_avg NUMERIC,
  show_rating_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create table for personal bowl scores (per user)
CREATE TABLE IF NOT EXISTS public.user_show_bowl_scores (
  user_id UUID NOT NULL,
  show_id TEXT NOT NULL,
  bowl_score INTEGER,
  episode_avg NUMERIC,
  episode_count INTEGER DEFAULT 0,
  season_avg NUMERIC,
  season_count INTEGER DEFAULT 0,
  show_rating INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, show_id)
);

-- 3. Enable RLS
ALTER TABLE public.show_bowl_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_show_bowl_scores ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Anyone can view global bowl scores"
  ON public.show_bowl_scores FOR SELECT
  USING (true);

CREATE POLICY "Users can view own personal scores"
  ON public.user_show_bowl_scores FOR SELECT
  USING (auth.uid() = user_id);

-- 5. Helper function to calculate confidence (0-1) based on count
CREATE OR REPLACE FUNCTION calculate_bowl_confidence(
  rating_count INTEGER,
  layer_type TEXT
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF layer_type = 'episode' THEN
    IF rating_count = 0 THEN RETURN 0;
    ELSIF rating_count BETWEEN 1 AND 4 THEN RETURN 0.3;
    ELSIF rating_count BETWEEN 5 AND 19 THEN RETURN 0.6;
    ELSE RETURN 1.0;
    END IF;
  ELSIF layer_type = 'season' THEN
    IF rating_count = 0 THEN RETURN 0;
    ELSIF rating_count BETWEEN 1 AND 4 THEN RETURN 0.5;
    ELSE RETURN 1.0;
    END IF;
  ELSIF layer_type = 'show' THEN
    IF rating_count = 0 THEN RETURN 0;
    ELSIF rating_count BETWEEN 1 AND 2 THEN RETURN 0.5;
    ELSIF rating_count BETWEEN 3 AND 9 THEN RETURN 0.8;
    ELSE RETURN 1.0;
    END IF;
  END IF;
  RETURN 0;
END;
$$;

-- 6. Calculate global bowl score for a show
CREATE OR REPLACE FUNCTION calculate_global_bowl_score(p_show_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_episode_avg NUMERIC;
  v_episode_count INTEGER;
  v_season_avg NUMERIC;
  v_season_count INTEGER;
  v_show_avg NUMERIC;
  v_show_count INTEGER;
  v_ep_conf NUMERIC;
  v_season_conf NUMERIC;
  v_show_conf NUMERIC;
  v_ep_weight NUMERIC;
  v_season_weight NUMERIC;
  v_show_weight NUMERIC;
  v_total_weight NUMERIC;
  v_bowl_score INTEGER;
BEGIN
  -- Get episode ratings for this show
  SELECT COALESCE(AVG(score), 0), COUNT(*)
  INTO v_episode_avg, v_episode_count
  FROM user_ratings
  WHERE item_type = 'episode'
    AND item_id LIKE p_show_id || ':%';

  -- Get season ratings for this show
  SELECT COALESCE(AVG(score), 0), COUNT(*)
  INTO v_season_avg, v_season_count
  FROM user_ratings
  WHERE item_type = 'season'
    AND item_id LIKE p_show_id || ':%';

  -- Get show ratings
  SELECT COALESCE(AVG(score), 0), COUNT(*)
  INTO v_show_avg, v_show_count
  FROM user_ratings
  WHERE item_type = 'show'
    AND item_id = p_show_id;

  -- Calculate confidence values
  v_ep_conf := calculate_bowl_confidence(v_episode_count, 'episode');
  v_season_conf := calculate_bowl_confidence(v_season_count, 'season');
  v_show_conf := calculate_bowl_confidence(v_show_count, 'show');

  -- Calculate effective weights (base weight × confidence)
  v_ep_weight := 0.50 * v_ep_conf;
  v_season_weight := 0.35 * v_season_conf;
  v_show_weight := 0.15 * v_show_conf;

  -- Total weight for normalization
  v_total_weight := v_ep_weight + v_season_weight + v_show_weight;

  -- Calculate bowl score if we have any ratings
  IF v_total_weight > 0 THEN
    v_bowl_score := ROUND(
      (v_episode_avg * v_ep_weight / v_total_weight) +
      (v_season_avg * v_season_weight / v_total_weight) +
      (v_show_avg * v_show_weight / v_total_weight)
    )::INTEGER;
  ELSE
    v_bowl_score := NULL;
  END IF;

  -- Upsert into show_bowl_scores
  INSERT INTO show_bowl_scores (
    show_id, bowl_score, episode_avg, episode_count,
    season_avg, season_count, show_avg, show_rating_count, updated_at
  )
  VALUES (
    p_show_id, v_bowl_score, v_episode_avg, v_episode_count,
    v_season_avg, v_season_count, v_show_avg, v_show_count, NOW()
  )
  ON CONFLICT (show_id) DO UPDATE SET
    bowl_score = EXCLUDED.bowl_score,
    episode_avg = EXCLUDED.episode_avg,
    episode_count = EXCLUDED.episode_count,
    season_avg = EXCLUDED.season_avg,
    season_count = EXCLUDED.season_count,
    show_avg = EXCLUDED.show_avg,
    show_rating_count = EXCLUDED.show_rating_count,
    updated_at = NOW();
END;
$$;

-- 7. Calculate personal bowl score for a user + show
CREATE OR REPLACE FUNCTION calculate_personal_bowl_score(
  p_user_id UUID,
  p_show_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_episode_avg NUMERIC;
  v_episode_count INTEGER;
  v_season_avg NUMERIC;
  v_season_count INTEGER;
  v_show_rating INTEGER;
  v_ep_conf NUMERIC;
  v_season_conf NUMERIC;
  v_show_conf NUMERIC;
  v_ep_weight NUMERIC;
  v_season_weight NUMERIC;
  v_show_weight NUMERIC;
  v_total_weight NUMERIC;
  v_bowl_score INTEGER;
BEGIN
  -- Get user's episode ratings for this show
  SELECT COALESCE(AVG(score), 0), COUNT(*)
  INTO v_episode_avg, v_episode_count
  FROM user_ratings
  WHERE user_id = p_user_id
    AND item_type = 'episode'
    AND item_id LIKE p_show_id || ':%';

  -- Get user's season ratings for this show
  SELECT COALESCE(AVG(score), 0), COUNT(*)
  INTO v_season_avg, v_season_count
  FROM user_ratings
  WHERE user_id = p_user_id
    AND item_type = 'season'
    AND item_id LIKE p_show_id || ':%';

  -- Get user's show rating
  SELECT score INTO v_show_rating
  FROM user_ratings
  WHERE user_id = p_user_id
    AND item_type = 'show'
    AND item_id = p_show_id
  LIMIT 1;

  -- Calculate confidence values
  v_ep_conf := calculate_bowl_confidence(v_episode_count, 'episode');
  v_season_conf := calculate_bowl_confidence(v_season_count, 'season');
  v_show_conf := calculate_bowl_confidence(CASE WHEN v_show_rating IS NOT NULL THEN 1 ELSE 0 END, 'show');

  -- Calculate effective weights
  v_ep_weight := 0.50 * v_ep_conf;
  v_season_weight := 0.35 * v_season_conf;
  v_show_weight := 0.15 * v_show_conf;

  -- Total weight
  v_total_weight := v_ep_weight + v_season_weight + v_show_weight;

  -- Calculate bowl score if we have any ratings
  IF v_total_weight > 0 THEN
    v_bowl_score := ROUND(
      (v_episode_avg * v_ep_weight / v_total_weight) +
      (v_season_avg * v_season_weight / v_total_weight) +
      (COALESCE(v_show_rating, 0) * v_show_weight / v_total_weight)
    )::INTEGER;
  ELSE
    v_bowl_score := NULL;
  END IF;

  -- Upsert into user_show_bowl_scores
  INSERT INTO user_show_bowl_scores (
    user_id, show_id, bowl_score, episode_avg, episode_count,
    season_avg, season_count, show_rating, updated_at
  )
  VALUES (
    p_user_id, p_show_id, v_bowl_score, v_episode_avg, v_episode_count,
    v_season_avg, v_season_count, v_show_rating, NOW()
  )
  ON CONFLICT (user_id, show_id) DO UPDATE SET
    bowl_score = EXCLUDED.bowl_score,
    episode_avg = EXCLUDED.episode_avg,
    episode_count = EXCLUDED.episode_count,
    season_avg = EXCLUDED.season_avg,
    season_count = EXCLUDED.season_count,
    show_rating = EXCLUDED.show_rating,
    updated_at = NOW();
END;
$$;

-- 8. Trigger function to update bowl scores when ratings change
CREATE OR REPLACE FUNCTION trigger_update_bowl_scores()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_show_id TEXT;
  v_user_id UUID;
BEGIN
  -- Extract show_id from item_id (first segment before ':')
  IF TG_OP = 'DELETE' THEN
    v_show_id := SPLIT_PART(OLD.item_id, ':', 1);
    v_user_id := OLD.user_id;
  ELSE
    v_show_id := SPLIT_PART(NEW.item_id, ':', 1);
    v_user_id := NEW.user_id;
  END IF;

  -- Recalculate global bowl score for this show
  PERFORM calculate_global_bowl_score(v_show_id);

  -- Recalculate personal bowl score for this user + show
  PERFORM calculate_personal_bowl_score(v_user_id, v_show_id);

  RETURN NULL;
END;
$$;

-- 9. Create trigger on user_ratings
DROP TRIGGER IF EXISTS trg_bowl_score_on_rating ON user_ratings;
CREATE TRIGGER trg_bowl_score_on_rating
  AFTER INSERT OR UPDATE OR DELETE ON user_ratings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_bowl_scores();