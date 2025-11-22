-- Add UPDATE trigger function for post_reactions to handle like/dislike changes
CREATE OR REPLACE FUNCTION public.sync_post_reaction_counts_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- When reaction kind changes (like ↔ dislike)
  IF old.kind != new.kind THEN
    -- Decrement the old count
    IF old.kind = 'like' THEN
      UPDATE posts SET likes_count = greatest(likes_count - 1, 0) WHERE id = old.post_id;
    ELSE
      UPDATE posts SET dislikes_count = greatest(dislikes_count - 1, 0) WHERE id = old.post_id;
    END IF;
    
    -- Increment the new count
    IF new.kind = 'like' THEN
      UPDATE posts SET likes_count = likes_count + 1 WHERE id = new.post_id;
    ELSE
      UPDATE posts SET dislikes_count = dislikes_count + 1 WHERE id = new.post_id;
    END IF;
  END IF;
  
  RETURN null;
END $$;

-- Create UPDATE trigger on post_reactions
CREATE TRIGGER trg_pr_u
AFTER UPDATE ON public.post_reactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_post_reaction_counts_update();

-- Recalculate all existing likes and dislikes counts to fix historical data
UPDATE posts SET 
  likes_count = (
    SELECT COUNT(*) FROM post_reactions 
    WHERE post_reactions.post_id = posts.id AND post_reactions.kind = 'like'
  ),
  dislikes_count = (
    SELECT COUNT(*) FROM post_reactions 
    WHERE post_reactions.post_id = posts.id AND post_reactions.kind = 'dislike'
  )
WHERE deleted_at IS NULL;