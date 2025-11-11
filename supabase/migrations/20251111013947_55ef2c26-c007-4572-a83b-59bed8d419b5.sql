-- Fix the return type for get_watched_with_show_titles (use correct enum name: content_kind)
DROP FUNCTION IF EXISTS get_watched_with_show_titles(uuid);

CREATE OR REPLACE FUNCTION get_watched_with_show_titles(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  content_id UUID,
  watched_at TIMESTAMP WITH TIME ZONE,
  content_title TEXT,
  content_poster_url TEXT,
  content_external_id TEXT,
  content_kind content_kind,
  content_metadata JSONB,
  show_title TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.user_id,
    w.content_id,
    w.watched_at,
    c.title as content_title,
    c.poster_url as content_poster_url,
    c.external_id as content_external_id,
    c.kind as content_kind,
    c.metadata as content_metadata,
    COALESCE(show.title, c.title) as show_title
  FROM watched w
  JOIN content c ON w.content_id = c.id
  LEFT JOIN content show ON 
    show.external_id = SPLIT_PART(c.external_id, ':', 1) 
    AND show.kind = 'show'
  WHERE w.user_id = p_user_id
  ORDER BY w.watched_at DESC;
END;
$$;

-- Fix the return type for get_watchlist_with_show_titles (use correct enum name: content_kind)
DROP FUNCTION IF EXISTS get_watchlist_with_show_titles(uuid);

CREATE OR REPLACE FUNCTION get_watchlist_with_show_titles(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  content_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  content_title TEXT,
  content_poster_url TEXT,
  content_external_id TEXT,
  content_kind content_kind,
  content_metadata JSONB,
  show_title TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wl.id,
    wl.user_id,
    wl.content_id,
    wl.created_at,
    c.title as content_title,
    c.poster_url as content_poster_url,
    c.external_id as content_external_id,
    c.kind as content_kind,
    c.metadata as content_metadata,
    COALESCE(show.title, c.title) as show_title
  FROM watchlist wl
  JOIN content c ON wl.content_id = c.id
  LEFT JOIN content show ON 
    show.external_id = SPLIT_PART(c.external_id, ':', 1) 
    AND show.kind = 'show'
  WHERE wl.user_id = p_user_id
  ORDER BY wl.created_at DESC;
END;
$$;