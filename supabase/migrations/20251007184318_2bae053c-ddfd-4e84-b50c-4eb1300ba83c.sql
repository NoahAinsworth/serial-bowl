
-- Drop existing views with SECURITY DEFINER
DROP VIEW IF EXISTS public.v_post_popularity CASCADE;
DROP VIEW IF EXISTS public.v_posts CASCADE;

-- Recreate v_posts view without SECURITY DEFINER (defaults to SECURITY INVOKER)
CREATE VIEW public.v_posts AS
SELECT 
  thoughts.id,
  'thought'::text AS type,
  thoughts.text_content AS text,
  NULL::numeric AS rating,
  thoughts.user_id AS author_id,
  thoughts.content_id AS show_id,
  thoughts.created_at,
  thoughts.moderation_status
FROM thoughts
UNION ALL
SELECT 
  reviews.id,
  'review'::text AS type,
  reviews.review_text AS text,
  NULL::numeric AS rating,
  reviews.user_id AS author_id,
  reviews.content_id AS show_id,
  reviews.created_at,
  'approved'::moderation_status AS moderation_status
FROM reviews;

-- Recreate v_post_popularity view without SECURITY DEFINER (defaults to SECURITY INVOKER)
CREATE VIEW public.v_post_popularity AS
SELECT 
  post_id,
  post_type,
  created_at,
  count(*) FILTER (WHERE interaction_type = 'like'::text) AS likes,
  count(*) FILTER (WHERE interaction_type = 'dislike'::text) AS dislikes,
  count(*) FILTER (WHERE interaction_type = 'comment'::text) AS comments,
  count(*) FILTER (WHERE interaction_type = 'view'::text) AS views,
  count(*) FILTER (WHERE interaction_type = 'reshare'::text) AS reshares
FROM interactions
GROUP BY post_id, post_type, created_at;

-- Grant appropriate permissions
GRANT SELECT ON public.v_posts TO authenticated, anon;
GRANT SELECT ON public.v_post_popularity TO authenticated, anon;
