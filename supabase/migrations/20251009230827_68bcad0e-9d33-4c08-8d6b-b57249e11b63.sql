-- Fix the v_post_popularity view to use SECURITY INVOKER mode
-- This ensures the view respects RLS policies of the querying user

-- Drop and recreate the view with security_invoker enabled
DROP VIEW IF EXISTS v_post_popularity;

CREATE VIEW v_post_popularity
WITH (security_invoker=on)
AS
SELECT 
  post_id,
  post_type,
  created_at,
  likes,
  dislikes,
  comments,
  reshares,
  views
FROM (
  SELECT 
    COALESCE(t.id, r.id) as post_id,
    CASE 
      WHEN t.id IS NOT NULL THEN 'thought'
      ELSE 'review'
    END as post_type,
    COALESCE(t.created_at, r.created_at) as created_at,
    (SELECT COUNT(*) FROM reactions WHERE thought_id = t.id AND reaction_type = 'like') as likes,
    (SELECT COUNT(*) FROM thought_dislikes WHERE thought_id = t.id) as dislikes,
    (SELECT COUNT(*) FROM comments WHERE thought_id = t.id) as comments,
    (SELECT COUNT(*) FROM reshares WHERE post_id = COALESCE(t.id, r.id)) as reshares,
    (SELECT COUNT(*) FROM interactions WHERE post_id = COALESCE(t.id, r.id) AND interaction_type = 'view') as views
  FROM thoughts t
  FULL OUTER JOIN reviews r ON false
  WHERE auth.uid() IS NOT NULL  -- Require authentication
) popularity_data;