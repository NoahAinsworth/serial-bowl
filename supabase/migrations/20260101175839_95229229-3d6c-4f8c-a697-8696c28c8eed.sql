-- Add missing UPDATE policy for post_reactions table
-- This allows users to update their own reactions (e.g., change from like to dislike)
CREATE POLICY "post_reactions_authenticated_update"
ON public.post_reactions
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());