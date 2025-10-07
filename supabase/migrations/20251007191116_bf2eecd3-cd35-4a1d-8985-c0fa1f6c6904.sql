-- Comprehensive security fix: Ensure all sensitive tables require authentication
-- This adds explicit auth.uid() IS NOT NULL checks to prevent any anonymous access

-- Fix 1: user_prefs table - change from 'public' to 'authenticated' role
DROP POLICY IF EXISTS "Users can insert own prefs" ON public.user_prefs;
DROP POLICY IF EXISTS "Users can view own prefs" ON public.user_prefs;
DROP POLICY IF EXISTS "Users can update own prefs" ON public.user_prefs;

CREATE POLICY "Users can insert own prefs"
ON public.user_prefs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own prefs"
ON public.user_prefs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own prefs"
ON public.user_prefs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- Fix 2: Add explicit authentication checks to profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view public profiles basic info" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view private profiles if following" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view public profiles basic info"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() <> id 
  AND is_private = false
);

CREATE POLICY "Authenticated users can view private profiles if following"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND auth.uid() <> id 
  AND is_private = true
  AND EXISTS (
    SELECT 1 FROM follows
    WHERE follows.follower_id = auth.uid()
    AND follows.following_id = profiles.id
    AND follows.status = 'accepted'
  )
);

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id AND auth.uid() IS NOT NULL);

-- Fix 3: Add explicit authentication checks to dms policies
DROP POLICY IF EXISTS "Users can send messages" ON public.dms;
DROP POLICY IF EXISTS "Users can update received messages" ON public.dms;
DROP POLICY IF EXISTS "Users can view own messages" ON public.dms;
DROP POLICY IF EXISTS "Users can delete own sent messages" ON public.dms;

CREATE POLICY "Users can send messages"
ON public.dms
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update received messages"
ON public.dms
FOR UPDATE
TO authenticated
USING (auth.uid() = recipient_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own messages"
ON public.dms
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND (auth.uid() = sender_id OR auth.uid() = recipient_id)
);

CREATE POLICY "Users can delete own sent messages"
ON public.dms
FOR DELETE
TO authenticated
USING (auth.uid() = sender_id AND auth.uid() IS NOT NULL);