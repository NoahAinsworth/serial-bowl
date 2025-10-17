-- Function to consolidate episode watches into season watch
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
BEGIN
  -- Get the season's external_id to determine which episodes belong to it
  SELECT external_id INTO v_external_id
  FROM content
  WHERE id = p_season_content_id AND kind = 'season';
  
  IF v_external_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Parse show_id and season from external_id (format: showId-S#)
  v_show_id := split_part(v_external_id, '-S', 1);
  v_season_num := split_part(v_external_id, '-S', 2);
  
  -- Delete individual episode watches that belong to this season
  DELETE FROM watched
  WHERE user_id = p_user_id
    AND content_id IN (
      SELECT id FROM content
      WHERE kind = 'episode'
        AND external_src = 'thetvdb'
        AND external_id LIKE v_show_id || '-%'
        AND (metadata->>'season_number')::text = v_season_num
    );
END;
$$;