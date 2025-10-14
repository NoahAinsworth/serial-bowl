-- Add soft-delete column to posts if missing
ALTER TABLE posts ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Trigger to sync review ratings to user_ratings
CREATE OR REPLACE FUNCTION trg_sync_review_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Only sync if it's a review with a rating and not deleted
  IF (NEW.kind = 'review' AND NEW.rating_percent IS NOT NULL AND NEW.deleted_at IS NULL) THEN
    INSERT INTO user_ratings (user_id, item_type, item_id, score, source, updated_at)
    VALUES (NEW.author_id, NEW.item_type, NEW.item_id, NEW.rating_percent, 'manual', now())
    ON CONFLICT (user_id, item_type, item_id)
    DO UPDATE SET score = EXCLUDED.score, source = 'manual', updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS t_posts_sync_review_rating ON posts;
CREATE TRIGGER t_posts_sync_review_rating
  AFTER INSERT OR UPDATE OF rating_percent, deleted_at ON posts
  FOR EACH ROW EXECUTE FUNCTION trg_sync_review_rating();

-- Real-time trending function (no materialized view dependency)
CREATE OR REPLACE FUNCTION feed_trending_rt(limit_count int DEFAULT 20, cursor_score numeric DEFAULT NULL)
RETURNS TABLE(post_id uuid, score numeric)
LANGUAGE sql STABLE AS $$
  WITH base AS (
    SELECT
      p.id as post_id,
      EXTRACT(epoch FROM (now() - p.created_at))/3600.0 as ageH,
      p.likes_count as likes,
      p.dislikes_count as dislikes,
      p.replies_count as comments
    FROM posts p
    WHERE p.deleted_at IS NULL
  ),
  scored AS (
    SELECT
      post_id,
      ((likes - dislikes)*1.7 + comments*1.2 + 3) / power(ageH + 1, 1.25) as score
    FROM base
  )
  SELECT post_id, score
  FROM scored
  WHERE (cursor_score IS NULL OR score < cursor_score)
  ORDER BY score DESC
  LIMIT limit_count;
$$;

-- Fallback: recent popular posts from last 72 hours
CREATE OR REPLACE FUNCTION feed_recent_popular(limit_count int DEFAULT 20)
RETURNS TABLE(post_id uuid, score numeric)
LANGUAGE sql STABLE AS $$
  SELECT
    p.id as post_id,
    (p.likes_count - p.dislikes_count)*1.0 + p.replies_count*0.5 as score
  FROM posts p
  WHERE p.deleted_at IS NULL
    AND p.created_at >= now() - interval '72 hours'
  ORDER BY score DESC, p.id
  LIMIT limit_count;
$$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_posts_author_kind_created 
  ON posts(author_id, kind, created_at DESC) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_posts_deleted_created 
  ON posts(deleted_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_ratings_user_item 
  ON user_ratings(user_id, item_type, item_id);