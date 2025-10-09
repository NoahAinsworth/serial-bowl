-- Fix profiles table RLS policies to properly block anonymous access
-- Remove the conflicting broad restrictive policy and ensure only authenticated users can access profiles

-- Drop the conflicting "Block anonymous access to profiles" policy
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;

-- The existing policies already ensure only authenticated users can access profiles:
-- 1. "Users can view own profile" - requires auth.uid() = id
-- 2. "Authenticated users can view public profiles basic info" - requires auth.uid() IS NOT NULL
-- 3. "Authenticated users can view private profiles if following" - requires auth.uid() IS NOT NULL
-- 4. "Users can insert own profile" - requires auth.uid() = id
-- 5. "Users can update own profile" - requires auth.uid() = id

-- No additional policies needed - the existing policies already enforce:
-- ✓ Anonymous users cannot access any profiles
-- ✓ Authenticated users can view their own profile
-- ✓ Authenticated users can view public profiles (is_private = false)
-- ✓ Authenticated users can view private profiles only if they follow them
-- ✓ Users can only insert/update their own profile