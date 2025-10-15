-- Ensure user_ratings is the single source of truth for all ratings
-- Add trigger to sync user_ratings into posts.rating_percent when reviews are created

CREATE OR REPLACE FUNCTION sync_rating_to_post()
RETURNS TRIGGER AS $$
DECLARE
  target_post_id uuid;
BEGIN
  -- Find the most recent review post for this item
  SELECT id INTO target_post_id
  FROM posts
  WHERE author_id = NEW.user_id
    AND kind = 'review'
    AND item_type = NEW.item_type
    AND item_id = NEW.item_id
    AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Update it if found
  IF target_post_id IS NOT NULL THEN
    UPDATE posts
    SET rating_percent = NEW.score
    WHERE id = target_post_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_sync_rating_to_post ON user_ratings;
CREATE TRIGGER trg_sync_rating_to_post
  AFTER INSERT OR UPDATE ON user_ratings
  FOR EACH ROW
  EXECUTE FUNCTION sync_rating_to_post();