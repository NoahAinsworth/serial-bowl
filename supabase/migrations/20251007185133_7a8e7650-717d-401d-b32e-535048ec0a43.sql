-- Drop the overly permissive policy that allows everyone to see all profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create granular policies that respect privacy settings

-- 1. Users can always view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 2. Authenticated users can view public profiles (is_private = false)
CREATE POLICY "Authenticated users can view public profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_private = false);

-- 3. Authenticated users can view private profiles if they follow the user
CREATE POLICY "Authenticated users can view followed private profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  is_private = true 
  AND EXISTS (
    SELECT 1 FROM public.follows
    WHERE follows.following_id = profiles.id
    AND follows.follower_id = auth.uid()
    AND follows.status = 'accepted'::follow_status
  )
);

-- Note: Unauthenticated users (anon) will not be able to see any profiles
-- This prevents data scraping and protects user privacy