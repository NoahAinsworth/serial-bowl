-- Make thought_id nullable to support comments on both thoughts and posts
ALTER TABLE public.comments 
  ALTER COLUMN thought_id DROP NOT NULL;

-- Add constraint: must have exactly one of thought_id or post_id
ALTER TABLE public.comments
  ADD CONSTRAINT comments_require_parent CHECK (
    (thought_id IS NOT NULL AND post_id IS NULL) OR
    (thought_id IS NULL AND post_id IS NOT NULL)
  );