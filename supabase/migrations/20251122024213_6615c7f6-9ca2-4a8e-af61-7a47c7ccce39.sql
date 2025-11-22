-- Fix profile privacy enforcement
DROP POLICY IF EXISTS "Authenticated users can view all basic profile info" ON profiles;

CREATE POLICY "Users can view public profiles or followed profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- User can see their own profile
  auth.uid() = id
  OR
  -- User can see public profiles
  is_private = false
  OR
  -- User can see private profiles if they follow them (accepted follows)
  (is_private = true AND EXISTS (
    SELECT 1 FROM follows
    WHERE follower_id = auth.uid()
      AND following_id = profiles.id
      AND status = 'accepted'
  ))
);

-- Fix review privacy controls to respect profile privacy
DROP POLICY IF EXISTS "Authenticated users can view reviews" ON user_reviews;

CREATE POLICY "Users can view reviews respecting profile privacy"
ON user_reviews
FOR SELECT
TO authenticated
USING (
  -- User can see their own reviews
  auth.uid() = user_id
  OR
  -- User can see reviews from public profiles
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = user_reviews.user_id
      AND profiles.is_private = false
  )
  OR
  -- User can see reviews from private profiles they follow
  EXISTS (
    SELECT 1 FROM profiles
    JOIN follows ON follows.following_id = profiles.id
    WHERE profiles.id = user_reviews.user_id
      AND profiles.is_private = true
      AND follows.follower_id = auth.uid()
      AND follows.status = 'accepted'
  )
);