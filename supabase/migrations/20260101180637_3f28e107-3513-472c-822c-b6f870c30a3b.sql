-- Ensure reaction count columns have safe defaults
ALTER TABLE public.posts
  ALTER COLUMN likes_count SET DEFAULT 0,
  ALTER COLUMN dislikes_count SET DEFAULT 0;

UPDATE public.posts
SET likes_count = COALESCE(likes_count, 0),
    dislikes_count = COALESCE(dislikes_count, 0)
WHERE likes_count IS NULL OR dislikes_count IS NULL;

-- Backfill counts from existing post_reactions
WITH agg AS (
  SELECT
    post_id,
    COUNT(*) FILTER (WHERE kind = 'like') AS likes,
    COUNT(*) FILTER (WHERE kind = 'dislike') AS dislikes
  FROM public.post_reactions
  GROUP BY post_id
)
UPDATE public.posts p
SET likes_count = COALESCE(a.likes, 0),
    dislikes_count = COALESCE(a.dislikes, 0)
FROM agg a
WHERE p.id = a.post_id;

-- Keep counts in sync going forward
DROP TRIGGER IF EXISTS trg_sync_post_reaction_counts ON public.post_reactions;
CREATE TRIGGER trg_sync_post_reaction_counts
AFTER INSERT OR DELETE ON public.post_reactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_post_reaction_counts();

DROP TRIGGER IF EXISTS trg_sync_post_reaction_counts_update ON public.post_reactions;
CREATE TRIGGER trg_sync_post_reaction_counts_update
AFTER UPDATE OF kind ON public.post_reactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_post_reaction_counts_update();
