-- CRITICAL SECURITY FIX: Update RLS policies to prevent public data exposure

-- 1. Fix posts table: Ensure deleted posts are hidden from public view
DROP POLICY IF EXISTS "Authenticated users can view posts" ON public.posts;
CREATE POLICY "Authenticated users can view active posts" 
ON public.posts 
FOR SELECT 
TO authenticated
USING (deleted_at IS NULL);

-- 2. Fix comments table: Require authentication to view comments
DROP POLICY IF EXISTS "comments_public_read" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.comments;
CREATE POLICY "Authenticated users can view comments" 
ON public.comments 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 3. Fix user_ratings table: Require authentication to view ratings
DROP POLICY IF EXISTS "Authenticated users can view ratings" ON public.user_ratings;
CREATE POLICY "Authenticated users can view ratings" 
ON public.user_ratings 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 4. Fix user_reviews table: Properly restrict to authenticated users
DROP POLICY IF EXISTS "Authenticated users can view reviews" ON public.user_reviews;
DROP POLICY IF EXISTS "p_user_reviews_select" ON public.user_reviews;
CREATE POLICY "Authenticated users can view reviews" 
ON public.user_reviews 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 5. Fix post_reactions table: Ensure proper authentication requirement
DROP POLICY IF EXISTS "Authenticated users can view reactions" ON public.post_reactions;
DROP POLICY IF EXISTS "p_pr_select" ON public.post_reactions;
CREATE POLICY "Authenticated users can view reactions" 
ON public.post_reactions 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 6. Fix database functions: Add search_path parameter
CREATE OR REPLACE FUNCTION public.feed_recent_popular(limit_count integer DEFAULT 20)
RETURNS TABLE(post_id uuid, score numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT
    p.id as post_id,
    (p.likes_count - p.dislikes_count)*1.0 + p.replies_count*0.5 as score
  FROM posts p
  WHERE p.deleted_at IS NULL
    AND p.created_at >= now() - interval '72 hours'
  ORDER BY score DESC, p.id
  LIMIT limit_count;
$function$;

CREATE OR REPLACE FUNCTION public.auto_detect_mature_content_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_detection jsonb;
  v_is_mature boolean;
BEGIN
  IF NEW.text_content IS NOT NULL AND NEW.text_content != '' THEN
    v_detection := detect_mature_content(NEW.text_content);
    v_is_mature := (v_detection->>'is_mature')::boolean;
  END IF;
  
  RETURN NEW;
END;
$function$;