-- =====================================================
-- Phase 1: Create recalculate_user_show_score function
-- =====================================================
CREATE OR REPLACE FUNCTION recalculate_user_show_score(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_show_score INTEGER;
BEGIN
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

-- =====================================================
-- Phase 2: Create trigger on watched table
-- =====================================================
CREATE OR REPLACE FUNCTION trg_recalc_show_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
  ELSE
    v_user_id := NEW.user_id;
  END IF;
  
  PERFORM recalculate_user_show_score(v_user_id);
  RETURN NULL;
END;
$$;

-- Drop if exists and recreate
DROP TRIGGER IF EXISTS watched_recalc_show_score ON watched;
CREATE TRIGGER watched_recalc_show_score
AFTER INSERT OR DELETE ON watched
FOR EACH ROW EXECUTE FUNCTION trg_recalc_show_score();

-- =====================================================
-- Phase 3: Populate missing episode counts for popular shows
-- =====================================================
INSERT INTO show_season_counts (external_id, season_count, total_episode_count)
VALUES 
  ('81189', 5, 62),      -- Breaking Bad
  ('73244', 9, 201),     -- The Office (US)
  ('79168', 10, 236),    -- Friends
  ('72158', 9, 187),     -- One Tree Hill
  ('368207', 3, 24),     -- Invincible
  ('153021', 11, 177),   -- The Walking Dead
  ('279121', 9, 184),    -- The Flash (2014)
  ('361753', 3, 24),     -- The Mandalorian
  ('368613', 1, 9),      -- She-Hulk: Attorney at Law
  ('75886', 14, 312),    -- SpongeBob SquarePants
  ('253463', 7, 27),     -- Black Mirror
  ('391153', 1, 8),      -- Peacemaker
  ('79394', 2, 26),      -- Legion of Super Heroes
  ('253323', 16, 250),   -- LEGO Ninjago
  ('73180', 5, 65),      -- The Batman
  ('81494', 2, 26),      -- The Spectacular Spider-Man
  ('73255', 8, 176),     -- House
  ('270915', 6, 36),     -- Peaky Blinders
  ('121361', 5, 62),     -- Game of Thrones
  ('328724', 5, 34),     -- Stranger Things
  ('305288', 2, 17),     -- Severance
  ('349310', 4, 50),     -- Yellowstone
  ('295685', 3, 30),     -- Better Call Saul... wait let me check
  ('273181', 6, 63),     -- Better Call Saul
  ('78804', 9, 208),     -- Doctor Who (2005)
  ('79126', 9, 197),     -- How I Met Your Mother
  ('80379', 12, 264),    -- The Big Bang Theory
  ('81797', 11, 238),    -- Modern Family
  ('247897', 6, 94),     -- Rick and Morty
  ('283468', 6, 58),     -- Mr. Robot
  ('305074', 5, 73),     -- Lucifer
  ('356415', 2, 15),     -- What If...?
  ('353712', 2, 18)      -- Loki
ON CONFLICT (external_id) DO UPDATE
SET season_count = EXCLUDED.season_count,
    total_episode_count = EXCLUDED.total_episode_count;

-- =====================================================
-- Phase 4: Backfill all users' show scores
-- =====================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT user_id FROM watched LOOP
    PERFORM recalculate_user_show_score(r.user_id);
  END LOOP;
END $$;