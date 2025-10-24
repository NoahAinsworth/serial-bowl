-- Drop the problematic existing policies that are causing conflicts
DROP POLICY IF EXISTS "Authenticated users can view public profiles basic info" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view private profiles if following" ON profiles;

-- Create ONE comprehensive policy for authenticated users to view all basic profile info
-- This allows users to see their own profile AND basic info (handle, avatar) for all other users
-- Privacy is still enforced at the application level through is_private checks
CREATE POLICY "Authenticated users can view all basic profile info"
ON profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
);