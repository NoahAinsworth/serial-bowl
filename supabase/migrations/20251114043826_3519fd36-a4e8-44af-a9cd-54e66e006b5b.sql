-- Remove conflicting old UPDATE policy that was blocking post deletion
DROP POLICY IF EXISTS "posts_author_update" ON posts;