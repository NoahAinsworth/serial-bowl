-- Fix security issues on v_posts and v_post_popularity views

-- First, drop and recreate v_post_popularity with proper authentication
DROP VIEW IF EXISTS public.v_post_popularity;

CREATE VIEW public.v_post_popularity
WITH (security_invoker=on)
AS
SELECT 
  t.id as post_id,
  t.created_at,
  'thought' as post_type,
  COALESCE(tl.likes, 0)::bigint as likes,
  COALESCE(td.dislikes, 0)::bigint as dislikes,
  COALESCE(tc.comments, 0)::bigint as comments,
  COALESCE(rs.reshares, 0)::bigint as reshares,
  COALESCE(i.views, 0)::bigint as views
FROM thoughts t
LEFT JOIN (
  SELECT thought_id, COUNT(*) as likes
  FROM reactions
  WHERE reaction_type = 'like'
  GROUP BY thought_id
) tl ON t.id = tl.thought_id
LEFT JOIN (
  SELECT thought_id, COUNT(*) as dislikes
  FROM thought_dislikes
  GROUP BY thought_id
) td ON t.id = td.thought_id
LEFT JOIN (
  SELECT thought_id, COUNT(*) as comments
  FROM comments
  GROUP BY thought_id
) tc ON t.id = tc.thought_id
LEFT JOIN (
  SELECT post_id, COUNT(*) as reshares
  FROM reshares
  WHERE post_type = 'thought'
  GROUP BY post_id
) rs ON t.id = rs.post_id
LEFT JOIN (
  SELECT post_id, COUNT(*) as views
  FROM interactions
  WHERE post_type = 'thought' AND interaction_type = 'view'
  GROUP BY post_id
) i ON t.id = i.post_id
WHERE auth.uid() IS NOT NULL

UNION ALL

SELECT 
  r.id as post_id,
  r.created_at,
  'review' as post_type,
  COALESCE(rl.likes, 0)::bigint as likes,
  COALESCE(rd.dislikes, 0)::bigint as dislikes,
  0::bigint as comments,
  COALESCE(rs.reshares, 0)::bigint as reshares,
  COALESCE(i.views, 0)::bigint as views
FROM reviews r
LEFT JOIN (
  SELECT review_id, COUNT(*) as likes
  FROM review_likes
  GROUP BY review_id
) rl ON r.id = rl.review_id
LEFT JOIN (
  SELECT review_id, COUNT(*) as dislikes
  FROM review_dislikes
  GROUP BY review_id
) rd ON r.id = rd.review_id
LEFT JOIN (
  SELECT post_id, COUNT(*) as reshares
  FROM reshares
  WHERE post_type = 'review'
  GROUP BY post_id
) rs ON r.id = rs.post_id
LEFT JOIN (
  SELECT post_id, COUNT(*) as views
  FROM interactions
  WHERE post_type = 'review' AND interaction_type = 'view'
  GROUP BY post_id
) i ON r.id = i.post_id
WHERE auth.uid() IS NOT NULL;

-- Now fix v_posts view to require authentication and respect RLS
DROP VIEW IF EXISTS public.v_posts;

CREATE VIEW public.v_posts
WITH (security_invoker=on)
AS
SELECT
  t.id,
  t.user_id as author_id,
  'thought' as type,
  t.text_content as text,
  t.content_id as show_id,
  NULL::numeric as rating,
  t.moderation_status,
  t.created_at
FROM thoughts t
WHERE auth.uid() IS NOT NULL

UNION ALL

SELECT
  r.id,
  r.user_id as author_id,
  'review' as type,
  r.review_text as text,
  r.content_id as show_id,
  CASE WHEN r.rating > 0 THEN r.rating ELSE NULL END as rating,
  'approved'::moderation_status as moderation_status,
  r.created_at
FROM reviews r
WHERE auth.uid() IS NOT NULL;