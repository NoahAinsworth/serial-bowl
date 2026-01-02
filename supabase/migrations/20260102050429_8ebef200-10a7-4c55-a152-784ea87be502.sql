-- Drop the restrictive SELECT policy and create a more permissive one
-- that allows authenticated users to view any user's ratings (for profile viewing)
DROP POLICY IF EXISTS "Users can view own ratings and ratings from followed users" ON public.user_ratings;

-- Create a policy that allows authenticated users to view all ratings
-- This is necessary for viewing ratings on user profile pages
CREATE POLICY "Authenticated users can view all ratings" 
ON public.user_ratings 
FOR SELECT 
USING (auth.uid() IS NOT NULL);