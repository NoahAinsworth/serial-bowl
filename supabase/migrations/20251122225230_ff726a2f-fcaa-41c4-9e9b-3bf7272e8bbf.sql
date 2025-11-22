-- Migrate comment references from thoughts to posts
-- Update comments to reference post_id instead of thought_id
-- This assumes that post IDs match the original thought IDs (common in migrations)
UPDATE public.comments
SET post_id = thought_id, thought_id = NULL
WHERE thought_id IS NOT NULL 
  AND post_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.posts WHERE posts.id = comments.thought_id
  );