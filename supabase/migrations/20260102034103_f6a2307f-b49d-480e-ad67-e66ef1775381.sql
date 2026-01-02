-- Drop existing public profiles policy
DROP POLICY IF EXISTS "Users can view public profiles or followed profiles" ON public.profiles;

-- Create new policy requiring authentication to view profiles
-- Users can see: their own profile, public profiles, or profiles they follow
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid() 
  OR is_private = false 
  OR EXISTS (
    SELECT 1 FROM public.follows 
    WHERE follower_id = auth.uid() 
    AND following_id = profiles.id 
    AND status = 'accepted'
  )
);