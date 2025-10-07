-- Fix profiles table public exposure
-- The issue: INSERT and UPDATE policies are set to 'public' role, allowing unauthenticated access
-- Solution: Change these policies to 'authenticated' role only

-- Drop existing INSERT and UPDATE policies
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Recreate INSERT policy with authenticated role only
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Recreate UPDATE policy with authenticated role only
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);