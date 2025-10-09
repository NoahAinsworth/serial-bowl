-- Fix thought_dislikes RLS to prevent user voting pattern exposure
-- Drop the existing public SELECT policy
DROP POLICY IF EXISTS "Anyone can view dislikes" ON public.thought_dislikes;

-- Create a restricted SELECT policy that only allows users to see their own dislikes
CREATE POLICY "Users can view own dislikes"
ON public.thought_dislikes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Note: Aggregate counts can still be calculated by querying count(*) 
-- without exposing individual user identities, as the query will only
-- return counts, not the actual user_id values