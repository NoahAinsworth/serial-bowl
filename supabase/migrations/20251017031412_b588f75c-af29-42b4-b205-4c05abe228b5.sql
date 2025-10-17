-- Function to consolidate season watches into show watch
CREATE OR REPLACE FUNCTION consolidate_seasons_to_show(
  p_user_id uuid,
  p_show_content_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_external_id text;
  v_show_id text;
BEGIN
  -- Get the show's external_id
  SELECT external_id INTO v_external_id
  FROM content
  WHERE id = p_show_content_id AND kind = 'show';
  
  IF v_external_id IS NULL THEN
    RETURN;
  END IF;
  
  v_show_id := v_external_id;
  
  -- Delete individual season watches that belong to this show
  -- Seasons follow formats: showId-S# or showId:#
  DELETE FROM watched
  WHERE user_id = p_user_id
    AND content_id IN (
      SELECT id FROM content
      WHERE kind = 'season'
        AND external_src = 'thetvdb'
        AND (
          external_id LIKE v_show_id || '-S%'
          OR external_id LIKE v_show_id || ':%'
        )
    );
    
  -- Also delete individual episode watches for this show
  DELETE FROM watched
  WHERE user_id = p_user_id
    AND content_id IN (
      SELECT id FROM content
      WHERE kind = 'episode'
        AND external_src = 'thetvdb'
        AND (
          external_id LIKE v_show_id || '-S%'
          OR external_id LIKE v_show_id || ':%'
        )
    );
END;
$$;