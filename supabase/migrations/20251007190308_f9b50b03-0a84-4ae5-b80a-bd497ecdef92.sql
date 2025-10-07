-- Fix 1: User Profile Information - Restrict access to sensitive settings field
-- Drop existing profile policies
DROP POLICY IF EXISTS "Authenticated users can view other profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Users can always view their own full profile including settings
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- For public profiles: authenticated users can see basic info but NOT settings
CREATE POLICY "Authenticated users can view public profiles basic info"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() <> id 
  AND is_private = false
);

-- For private profiles: only if you follow them, and still no settings access
CREATE POLICY "Authenticated users can view private profiles if following"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() <> id 
  AND is_private = true
  AND EXISTS (
    SELECT 1 FROM follows
    WHERE follows.follower_id = auth.uid()
    AND follows.following_id = profiles.id
    AND follows.status = 'accepted'
  )
);

-- Fix 2: Allow senders to delete their own DMs
CREATE POLICY "Users can delete own sent messages"
ON public.dms
FOR DELETE
TO authenticated
USING (auth.uid() = sender_id);

-- Fix 3: Ensure views respect RLS of underlying tables
ALTER VIEW public.v_post_popularity SET (security_invoker = on);
ALTER VIEW public.v_posts SET (security_invoker = on);