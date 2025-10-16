-- Remove SECURITY DEFINER views and replace with non-definer versions
-- These views filter by auth.uid() which works with SECURITY INVOKER

-- Drop existing views
DROP VIEW IF EXISTS public.profile_ratings_episodes CASCADE;
DROP VIEW IF EXISTS public.profile_ratings_seasons CASCADE;
DROP VIEW IF EXISTS public.profile_ratings_shows CASCADE;
DROP VIEW IF EXISTS public.profile_reviews CASCADE;

-- Recreate as regular views (SECURITY INVOKER is default)
-- These are safe because they use auth.uid() which only works when user is authenticated
CREATE VIEW public.profile_ratings_episodes
WITH (security_invoker = true)
AS
SELECT 
  item_id,
  score,
  source,
  updated_at
FROM user_ratings
WHERE user_id = auth.uid() 
  AND item_type = 'episode'
ORDER BY updated_at DESC;

CREATE VIEW public.profile_ratings_seasons
WITH (security_invoker = true)
AS
SELECT 
  item_id,
  score,
  source,
  updated_at
FROM user_ratings
WHERE user_id = auth.uid() 
  AND item_type = 'season'
ORDER BY updated_at DESC;

CREATE VIEW public.profile_ratings_shows
WITH (security_invoker = true)
AS
SELECT 
  item_id,
  score,
  source,
  updated_at
FROM user_ratings
WHERE user_id = auth.uid() 
  AND item_type = 'show'
ORDER BY updated_at DESC;

CREATE VIEW public.profile_reviews
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  item_type,
  item_id,
  body,
  rating_percent,
  created_at,
  updated_at
FROM user_reviews
WHERE user_id = auth.uid()
ORDER BY created_at DESC;