-- Drop the consolidation functions - we don't need them anymore
DROP FUNCTION IF EXISTS consolidate_episodes_to_season(uuid, uuid);
DROP FUNCTION IF EXISTS consolidate_seasons_to_show(uuid, uuid);

-- Create helper function to mark all episodes in a season as watched
CREATE OR REPLACE FUNCTION mark_season_episodes_watched(
  p_user_id uuid,
  p_show_id text,
  p_season_number integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_inserted_count integer := 0;
  v_episode record;
BEGIN
  -- Insert watched entries for all episodes in the season that aren't already watched
  FOR v_episode IN 
    SELECT c.id
    FROM content c
    WHERE c.kind = 'episode'
      AND c.external_src = 'thetvdb'
      AND c.external_id LIKE p_show_id || ':' || p_season_number || ':%'
      AND NOT EXISTS (
        SELECT 1 FROM watched w 
        WHERE w.user_id = p_user_id AND w.content_id = c.id
      )
  LOOP
    INSERT INTO watched (user_id, content_id, watched_at)
    VALUES (p_user_id, v_episode.id, NOW())
    ON CONFLICT (user_id, content_id) DO NOTHING;
    
    v_inserted_count := v_inserted_count + 1;
  END LOOP;
  
  RETURN v_inserted_count;
END;
$$;

-- Create helper function to mark all episodes in a show as watched
CREATE OR REPLACE FUNCTION mark_show_episodes_watched(
  p_user_id uuid,
  p_show_id text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_inserted_count integer := 0;
  v_episode record;
BEGIN
  -- Insert watched entries for all episodes in the show that aren't already watched
  FOR v_episode IN 
    SELECT c.id
    FROM content c
    WHERE c.kind = 'episode'
      AND c.external_src = 'thetvdb'
      AND c.external_id LIKE p_show_id || ':%'
      AND NOT EXISTS (
        SELECT 1 FROM watched w 
        WHERE w.user_id = p_user_id AND w.content_id = c.id
      )
  LOOP
    INSERT INTO watched (user_id, content_id, watched_at)
    VALUES (p_user_id, v_episode.id, NOW())
    ON CONFLICT (user_id, content_id) DO NOTHING;
    
    v_inserted_count := v_inserted_count + 1;
  END LOOP;
  
  RETURN v_inserted_count;
END;
$$;