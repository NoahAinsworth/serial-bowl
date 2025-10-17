-- Updated function to consolidate episode watches into season watch
CREATE OR REPLACE FUNCTION consolidate_episodes_to_season(
  p_user_id uuid,
  p_season_content_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_external_id text;
  v_show_id text;
  v_season_num text;
  v_episode_pattern text;
BEGIN
  -- Get the season's external_id
  SELECT external_id INTO v_external_id
  FROM content
  WHERE id = p_season_content_id AND kind = 'season';
  
  IF v_external_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Handle two formats: "showId-S#" or "showId:#"
  IF v_external_id LIKE '%-%' THEN
    -- Format: showId-S#
    v_show_id := split_part(v_external_id, '-S', 1);
    v_season_num := split_part(v_external_id, '-S', 2);
    v_episode_pattern := v_show_id || '-S' || v_season_num || '-%';
  ELSE
    -- Format: showId:#
    v_show_id := split_part(v_external_id, ':', 1);
    v_season_num := split_part(v_external_id, ':', 2);
    v_episode_pattern := v_show_id || ':' || v_season_num || ':%';
  END IF;
  
  -- Delete individual episode watches that belong to this season
  -- Episodes follow format: showId:seasonNum:episodeNum
  DELETE FROM watched
  WHERE user_id = p_user_id
    AND content_id IN (
      SELECT id FROM content
      WHERE kind = 'episode'
        AND external_src = 'thetvdb'
        AND external_id LIKE v_episode_pattern
    );
END;
$$;