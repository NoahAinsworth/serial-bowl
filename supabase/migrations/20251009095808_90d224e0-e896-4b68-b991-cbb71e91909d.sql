-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Approved thoughts are viewable by everyone" ON public.thoughts;

-- Create a new policy that respects profile privacy
CREATE POLICY "Approved thoughts viewable based on profile privacy"
ON public.thoughts
FOR SELECT
USING (
  moderation_status = 'approved'::moderation_status
  AND (
    -- User viewing their own thoughts
    auth.uid() = user_id
    OR
    -- Thoughts from public profiles are visible to authenticated users
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = thoughts.user_id
      AND profiles.is_private = false
      AND auth.uid() IS NOT NULL
    )
    OR
    -- Thoughts from private profiles are visible to followers
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = thoughts.user_id
      AND profiles.is_private = true
      AND EXISTS (
        SELECT 1 FROM public.follows
        WHERE follows.follower_id = auth.uid()
        AND follows.following_id = thoughts.user_id
        AND follows.status = 'accepted'::follow_status
      )
    )
  )
);