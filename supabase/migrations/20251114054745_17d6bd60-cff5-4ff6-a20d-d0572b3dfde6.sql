-- Drop the existing UPDATE policy with incorrect role
DROP POLICY IF EXISTS "Users can update own posts" ON posts;

-- Create new UPDATE policy for authenticated users
CREATE POLICY "Users can update own posts" ON posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id);