-- Fix v_posts view to use security_invoker properly
-- The view should be accessed only via edge functions using service role
-- Add RLS policy to ensure it can only be queried by authenticated users via the API

DROP VIEW IF EXISTS v_posts CASCADE;

CREATE VIEW v_posts
WITH (security_invoker=on)
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
  AND (
    -- Public profiles OR user is viewing their own OR user is following
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = t.user_id 
      AND p.is_private = false
    )
    OR t.user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM follows f
      WHERE f.follower_id = auth.uid()
      AND f.following_id = t.user_id
      AND f.status = 'accepted'
    )
  )

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
FROM reviews r
WHERE (
  -- Public profiles OR user is viewing their own OR user is following
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = r.user_id 
    AND p.is_private = false
  )
  OR r.user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM follows f
    WHERE f.follower_id = auth.uid()
    AND f.following_id = r.user_id
    AND f.status = 'accepted'
  )
);