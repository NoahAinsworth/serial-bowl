-- Fix RLS policies: Change from 'public' to 'authenticated' role
-- This reduces attack surface by blocking anonymous access attempts

-- =====================================================
-- 1. POSTS TABLE - Consolidate and fix role
-- =====================================================

-- Drop duplicate/public policies
DROP POLICY IF EXISTS "Authenticated users can view active posts" ON posts;
DROP POLICY IF EXISTS "p_posts_select_all" ON posts;
DROP POLICY IF EXISTS "p_posts_insert_own" ON posts;
DROP POLICY IF EXISTS "posts_author_insert" ON posts;

-- Create consolidated authenticated policies
CREATE POLICY "posts_authenticated_select" 
ON posts FOR SELECT 
TO authenticated 
USING (deleted_at IS NULL);

CREATE POLICY "posts_authenticated_insert" 
ON posts FOR INSERT 
TO authenticated 
WITH CHECK (author_id = auth.uid());

-- Keep existing update and delete (already properly scoped)
-- posts_author_update and posts_author_delete are fine


-- =====================================================
-- 2. POST_REACTIONS TABLE - Consolidate and fix role
-- =====================================================

-- Drop duplicate/public policies
DROP POLICY IF EXISTS "Authenticated users can view reactions" ON post_reactions;
DROP POLICY IF EXISTS "reactions_user_insert" ON post_reactions;
DROP POLICY IF EXISTS "reactions_user_delete" ON post_reactions;

-- Create consolidated authenticated policies
CREATE POLICY "post_reactions_authenticated_select" 
ON post_reactions FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "post_reactions_authenticated_insert" 
ON post_reactions FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "post_reactions_authenticated_delete" 
ON post_reactions FOR DELETE 
TO authenticated 
USING (user_id = auth.uid());

-- Drop remaining old policy
DROP POLICY IF EXISTS "p_pr_delete" ON post_reactions;
DROP POLICY IF EXISTS "p_pr_upsert" ON post_reactions;


-- =====================================================
-- 3. COMMENTS TABLE - Consolidate and fix role
-- =====================================================

-- Drop duplicate/public policies
DROP POLICY IF EXISTS "Authenticated users can view comments" ON comments;
DROP POLICY IF EXISTS "comments_user_insert" ON comments;
DROP POLICY IF EXISTS "comments_user_delete" ON comments;

-- Create consolidated authenticated policies
CREATE POLICY "comments_authenticated_select" 
ON comments FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "comments_authenticated_insert" 
ON comments FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "comments_authenticated_update" 
ON comments FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "comments_authenticated_delete" 
ON comments FOR DELETE 
TO authenticated 
USING (user_id = auth.uid());

-- Drop old policies
DROP POLICY IF EXISTS "Users can create comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;


-- =====================================================
-- 4. FOLLOWS TABLE - Consolidate and fix role
-- =====================================================

-- Drop duplicate/public policies
DROP POLICY IF EXISTS "Authenticated users can view accepted follows" ON follows;
DROP POLICY IF EXISTS "Authenticated users can view accepted follows and own requests" ON follows;
DROP POLICY IF EXISTS "follows_user_insert" ON follows;
DROP POLICY IF EXISTS "follows_user_delete" ON follows;

-- Create consolidated authenticated policies
CREATE POLICY "follows_authenticated_select" 
ON follows FOR SELECT 
TO authenticated 
USING (
  status = 'accepted'::follow_status 
  OR auth.uid() = follower_id 
  OR auth.uid() = following_id
);

CREATE POLICY "follows_authenticated_insert" 
ON follows FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "follows_authenticated_delete" 
ON follows FOR DELETE 
TO authenticated 
USING (auth.uid() = follower_id);

-- Keep existing update policy
-- "Users can update follow requests sent to them" is fine


-- =====================================================
-- 5. WATCHED TABLE - Fix role to authenticated
-- =====================================================

-- Drop and recreate with authenticated role
DROP POLICY IF EXISTS "Users can mark as watched" ON watched;
DROP POLICY IF EXISTS "Users can unmark watched" ON watched;
DROP POLICY IF EXISTS "Users can view own watched" ON watched;

CREATE POLICY "watched_authenticated_select" 
ON watched FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "watched_authenticated_insert" 
ON watched FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "watched_authenticated_delete" 
ON watched FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);


-- =====================================================
-- 6. USER_RATINGS TABLE - Fix role to authenticated
-- =====================================================

-- Drop and recreate with authenticated role
DROP POLICY IF EXISTS "p_user_ratings_insert" ON user_ratings;
DROP POLICY IF EXISTS "p_user_ratings_update" ON user_ratings;

CREATE POLICY "user_ratings_authenticated_select" 
ON user_ratings FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "user_ratings_authenticated_insert" 
ON user_ratings FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_ratings_authenticated_update" 
ON user_ratings FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- =====================================================
-- 7. PROFILES TABLE - Remove duplicate policy
-- =====================================================

DROP POLICY IF EXISTS "profiles_user_update" ON profiles;