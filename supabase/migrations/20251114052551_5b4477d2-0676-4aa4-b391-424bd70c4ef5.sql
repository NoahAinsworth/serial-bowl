-- Drop the existing UPDATE policy that was blocking soft deletion
DROP POLICY IF EXISTS "Users can update own posts" ON posts;

-- Create new UPDATE policy without WITH CHECK clause
-- This allows users to soft-delete their posts by setting deleted_at
CREATE POLICY "Users can update own posts" ON posts
  FOR UPDATE
  USING (auth.uid() = author_id);