-- Add restrictive policies to explicitly deny anonymous access to sensitive tables
-- This provides defense-in-depth even though existing policies already require authentication

-- For profiles: Add a restrictive policy that blocks all anonymous access
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- For dms: Add a restrictive policy that blocks all anonymous access
CREATE POLICY "Block anonymous access to dms"  
ON public.dms
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- For user_prefs: Add a restrictive policy that blocks all anonymous access
CREATE POLICY "Block anonymous access to user_prefs"
ON public.user_prefs
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);