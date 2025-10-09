-- Fix v_post_popularity view to properly delegate RLS to underlying tables
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
) i ON r.id = i.post_id;