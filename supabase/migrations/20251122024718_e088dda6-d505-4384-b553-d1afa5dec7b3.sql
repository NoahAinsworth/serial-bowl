-- Fix user_ratings RLS policies - remove overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view all ratings" ON user_ratings;
DROP POLICY IF EXISTS "p_user_ratings_select" ON user_ratings;
DROP POLICY IF EXISTS "Users can view ratings" ON user_ratings;

-- Create new privacy-respecting SELECT policy for user_ratings
CREATE POLICY "Users can view own ratings and ratings from followed users"
ON user_ratings
FOR SELECT
TO authenticated
USING (
  -- User can see their own ratings
  auth.uid() = user_id
  OR
  -- User can see ratings from people they follow (accepted follows only)
  user_id IN (
    SELECT following_id 
    FROM follows 
    WHERE follower_id = auth.uid() 
      AND status = 'accepted'
  )
);

-- Fix missing search_path on compute_season_rollup function
DROP FUNCTION IF EXISTS public.compute_season_rollup(uuid, text);
CREATE OR REPLACE FUNCTION public.compute_season_rollup(p_user uuid, p_season_id text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH eps AS (
    SELECT score FROM user_ratings
    WHERE user_id = p_user AND item_type = 'episode' AND item_id LIKE (p_season_id || ':%')
  )
  SELECT CASE WHEN count(*)=0 THEN null ELSE round(avg(score))::int END FROM eps;
$$;

-- Fix missing search_path on compute_show_rollup function
DROP FUNCTION IF EXISTS public.compute_show_rollup(uuid, text);
CREATE OR REPLACE FUNCTION public.compute_show_rollup(p_user uuid, p_show_id text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH seas AS (
    SELECT score FROM user_ratings
    WHERE user_id = p_user AND item_type = 'season' AND item_id LIKE (p_show_id || ':%')
  ),
  eps AS (
    SELECT score FROM user_ratings
    WHERE user_id = p_user AND item_type = 'episode' AND item_id LIKE (p_show_id || ':%')
  ),
  unioned AS (
    SELECT score FROM seas
    UNION ALL
    SELECT score FROM eps
  )
  SELECT CASE WHEN count(*)=0 THEN null ELSE round(avg(score))::int END FROM unioned;
$$;