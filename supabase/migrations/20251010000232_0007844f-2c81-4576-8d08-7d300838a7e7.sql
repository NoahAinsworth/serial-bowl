-- Drop and recreate v_posts view to work with service role
DROP VIEW IF EXISTS v_posts CASCADE;

CREATE VIEW v_posts
WITH (security_invoker=off)
AS
SELECT 
  t.id,
  'thought'::text AS type,
  t.text_content AS text,
  t.created_at,
  t.moderation_status,
  NULL::numeric AS rating,
  t.content_id AS show_id,
  t.user_id AS author_id
FROM thoughts t
WHERE t.moderation_status = 'approved'

UNION ALL

SELECT 
  r.id,
  'review'::text AS type,
  r.review_text AS text,
  r.created_at,
  'approved'::moderation_status AS moderation_status,
  r.rating,
  r.content_id AS show_id,
  r.user_id AS author_id
FROM reviews r;