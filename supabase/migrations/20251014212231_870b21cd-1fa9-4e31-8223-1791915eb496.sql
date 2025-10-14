-- Create feed_new RPC for newest posts
CREATE OR REPLACE FUNCTION feed_new(limit_count int DEFAULT 20, cursor_ts timestamptz DEFAULT NULL)
RETURNS TABLE(post_id uuid, created_at timestamptz) LANGUAGE sql STABLE AS $$
  SELECT id AS post_id, created_at
  FROM posts
  WHERE deleted_at IS NULL
    AND (cursor_ts IS NULL OR created_at < cursor_ts)
  ORDER BY created_at DESC
  LIMIT limit_count;
$$;

-- Create feed_following RPC  
CREATE OR REPLACE FUNCTION feed_following(uid uuid, limit_count int DEFAULT 20, cursor_ts timestamptz DEFAULT NULL)
RETURNS TABLE(post_id uuid, created_at timestamptz) LANGUAGE sql STABLE AS $$
  SELECT p.id AS post_id, p.created_at
  FROM posts p
  WHERE p.deleted_at IS NULL
    AND p.author_id IN (
      SELECT following_id FROM follows 
      WHERE follower_id = uid AND status = 'accepted'
    )
    AND (cursor_ts IS NULL OR p.created_at < cursor_ts)
  ORDER BY p.created_at DESC
  LIMIT limit_count;
$$;