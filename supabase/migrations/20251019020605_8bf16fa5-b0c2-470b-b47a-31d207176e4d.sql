-- PHASE 1.1: Fix RLS Policies - Require Authentication

-- Fix posts table - remove public read, require auth
DROP POLICY IF EXISTS "posts_public_read" ON public.posts;

CREATE POLICY "Authenticated users can view posts"
ON public.posts
FOR SELECT
TO authenticated
USING (deleted_at IS NULL);

-- Fix user_reviews - add authenticated read policy
CREATE POLICY "Authenticated users can view reviews"
ON public.user_reviews
FOR SELECT
TO authenticated
USING (true);

-- Fix user_ratings - add authenticated read policy  
CREATE POLICY "Authenticated users can view ratings"
ON public.user_ratings
FOR SELECT
TO authenticated
USING (true);

-- Fix post_reactions - replace public with authenticated
DROP POLICY IF EXISTS "reactions_public_read" ON public.post_reactions;

CREATE POLICY "Authenticated users can view reactions"
ON public.post_reactions
FOR SELECT
TO authenticated
USING (true);

-- Fix follows - require auth except for user's own relationships
DROP POLICY IF EXISTS "follows_public_read" ON public.follows;

CREATE POLICY "Authenticated users can view accepted follows"
ON public.follows
FOR SELECT
TO authenticated
USING (status = 'accepted' OR follower_id = auth.uid() OR following_id = auth.uid());

-- PHASE 1.2: Fix Database Functions - Add search_path Security

-- Fix handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, handle, bio)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'handle', 'user' || substring(NEW.id::text, 1, 8)),
    ''
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$function$;

-- Fix update_user_binge_points
CREATE OR REPLACE FUNCTION public.update_user_binge_points(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_points RECORD;
  v_old_badge TEXT;
  v_new_badge TEXT;
BEGIN
  SELECT badge_tier INTO v_old_badge
  FROM profiles
  WHERE id = p_user_id;

  SELECT * INTO v_points
  FROM calculate_binge_points(p_user_id);

  v_new_badge := get_badge_tier(v_points.total_points);

  UPDATE profiles
  SET 
    binge_points = v_points.total_points,
    badge_tier = v_new_badge,
    badge_updated_at = CASE 
      WHEN v_old_badge IS DISTINCT FROM v_new_badge THEN NOW()
      ELSE badge_updated_at
    END
  WHERE id = p_user_id;
END;
$function$;

-- Fix update_season_episode_count
CREATE OR REPLACE FUNCTION public.update_season_episode_count(p_season_external_id text, p_episode_count integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO season_episode_counts (external_id, episode_count)
  VALUES (p_season_external_id, p_episode_count)
  ON CONFLICT (external_id) 
  DO UPDATE SET 
    episode_count = p_episode_count,
    updated_at = NOW();
END;
$function$;

-- Fix update_show_counts
CREATE OR REPLACE FUNCTION public.update_show_counts(p_show_external_id text, p_season_count integer, p_total_episode_count integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO show_season_counts (external_id, season_count, total_episode_count)
  VALUES (p_show_external_id, p_season_count, p_total_episode_count)
  ON CONFLICT (external_id)
  DO UPDATE SET
    season_count = p_season_count,
    total_episode_count = p_total_episode_count,
    updated_at = NOW();
END;
$function$;

-- PHASE 5.2: Add Performance Indexes

CREATE INDEX IF NOT EXISTS idx_posts_author_created ON public.posts(author_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_item_type_id ON public.posts(item_type, item_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id) WHERE status = 'accepted';
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id) WHERE status = 'accepted';
CREATE INDEX IF NOT EXISTS idx_user_ratings_user_item ON public.user_ratings(user_id, item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_watched_user_content ON public.watched(user_id, content_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON public.post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_dms_recipient ON public.dms(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dms_sender ON public.dms(sender_id, created_at DESC);