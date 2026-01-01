-- Fix user_ratings: Remove overly permissive SELECT policies
-- Keep only the policy that allows users to view their own ratings and ratings from followed users

DROP POLICY IF EXISTS "Users can view all ratings" ON public.user_ratings;
DROP POLICY IF EXISTS "user_ratings_authenticated_select" ON public.user_ratings;
DROP POLICY IF EXISTS "Authenticated users can view ratings" ON public.user_ratings;
DROP POLICY IF EXISTS "ratings_user_read" ON public.user_ratings;

-- Fix tmdb_cache: Remove overly permissive "System can update TMDB cache" policy
-- System operations should use service role key which bypasses RLS entirely
DROP POLICY IF EXISTS "System can update TMDB cache" ON public.tmdb_cache;

-- Keep only proper read-only access for authenticated users on tmdb_cache
-- The existing "Authenticated users can view TMDB cache" policy is fine