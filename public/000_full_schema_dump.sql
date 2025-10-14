-- Serial Bowl Full Schema Dump
-- Generated: 2025-01-13

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.content_kind AS ENUM ('show', 'season', 'episode');
CREATE TYPE public.moderation_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.follow_status AS ENUM ('pending', 'accepted', 'rejected');

-- =====================================================
-- TABLES
-- =====================================================

-- Profiles
CREATE TABLE public.profiles (
    id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    handle text NOT NULL,
    bio text,
    avatar_url text,
    is_private boolean NOT NULL DEFAULT false,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE(handle)
);

-- User Roles
CREATE TABLE public.user_roles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role public.app_role NOT NULL DEFAULT 'user'::app_role,
    PRIMARY KEY (id),
    UNIQUE(user_id, role)
);

-- Follows
CREATE TABLE public.follows (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    follower_id uuid NOT NULL,
    following_id uuid NOT NULL,
    status public.follow_status NOT NULL DEFAULT 'accepted'::follow_status,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE(follower_id, following_id)
);

-- Posts
CREATE TABLE public.posts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    author_id uuid NOT NULL,
    kind text DEFAULT 'thought'::text,
    body text,
    item_type text,
    item_id text,
    rating_percent integer,
    is_spoiler boolean DEFAULT false,
    likes_count integer DEFAULT 0,
    dislikes_count integer DEFAULT 0,
    replies_count integer DEFAULT 0,
    reshares_count integer DEFAULT 0,
    impressions_count integer DEFAULT 0,
    reports_count integer DEFAULT 0,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

-- Post Reactions
CREATE TABLE public.post_reactions (
    user_id uuid NOT NULL,
    post_id uuid NOT NULL,
    kind text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (user_id, post_id)
);

-- User Ratings
CREATE TABLE public.user_ratings (
    user_id uuid NOT NULL,
    item_type text NOT NULL,
    item_id text NOT NULL,
    score integer NOT NULL,
    source text DEFAULT 'manual'::text,
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (user_id, item_type, item_id)
);

-- User Reviews
CREATE TABLE public.user_reviews (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    item_type text NOT NULL,
    item_id text NOT NULL,
    body text,
    rating_percent integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

-- Comments
CREATE TABLE public.comments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    thought_id uuid NOT NULL,
    text_content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

-- Comment Likes
CREATE TABLE public.comment_likes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    comment_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE(user_id, comment_id)
);

-- Comment Dislikes
CREATE TABLE public.comment_dislikes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    comment_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE(user_id, comment_id)
);

-- Custom Lists
CREATE TABLE public.custom_lists (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    is_public boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

-- List Items
CREATE TABLE public.list_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    list_id uuid NOT NULL,
    content_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

-- Direct Messages
CREATE TABLE public.dms (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    sender_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    text_content text NOT NULL,
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

-- Chat Sessions
CREATE TABLE public.chat_sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

-- Chat Messages
CREATE TABLE public.chat_messages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

-- Chat Events
CREATE TABLE public.chat_events (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid,
    type text,
    payload jsonb,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

-- Bot Feedback
CREATE TABLE public.bot_feedback (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    session_id uuid NOT NULL,
    question text NOT NULL,
    response text NOT NULL,
    rating integer,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

-- TVDB Shows Cache
CREATE TABLE public.tvdb_shows (
    tvdb_id integer NOT NULL,
    name text,
    year integer,
    json jsonb,
    updated_at timestamp with time zone,
    PRIMARY KEY (tvdb_id)
);

-- TVDB Episodes Cache
CREATE TABLE public.tvdb_episodes (
    tvdb_id integer NOT NULL,
    season integer NOT NULL,
    episode integer NOT NULL,
    json jsonb,
    updated_at timestamp with time zone,
    PRIMARY KEY (tvdb_id, season, episode)
);

-- TVDB Trending
CREATE TABLE public.tvdb_trending (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    category text NOT NULL,
    tvdb_id integer NOT NULL,
    name text NOT NULL,
    overview text,
    image_url text,
    first_aired text,
    position integer NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

-- User Preferences
CREATE TABLE public.user_prefs (
    user_id uuid NOT NULL,
    shows jsonb DEFAULT '[]'::jsonb,
    genres jsonb DEFAULT '[]'::jsonb,
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (user_id)
);

-- Feed Scores
CREATE TABLE public.feed_scores (
    user_id uuid NOT NULL,
    post_id uuid NOT NULL,
    post_type text NOT NULL,
    score double precision NOT NULL,
    reason jsonb DEFAULT '{}'::jsonb,
    computed_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (user_id, post_id)
);

-- Feed Impressions
CREATE TABLE public.feed_impressions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    post_id uuid NOT NULL,
    post_type text NOT NULL,
    tab text NOT NULL,
    position integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

-- Interactions
CREATE TABLE public.interactions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    post_id uuid NOT NULL,
    post_type text NOT NULL,
    interaction_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

-- Reshares
CREATE TABLE public.reshares (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    post_id uuid NOT NULL,
    post_type text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE(user_id, post_id)
);

-- TMDB Cache
CREATE TABLE public.tmdb_cache (
    cache_key text NOT NULL,
    payload jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (cache_key)
);

-- =====================================================
-- VIEWS
-- =====================================================

CREATE VIEW public.feed_for_you AS
SELECT * FROM posts WHERE deleted_at IS NULL;

CREATE VIEW public.feed_trending AS
SELECT * FROM posts WHERE deleted_at IS NULL;

CREATE VIEW public.feed_following AS
SELECT * FROM posts WHERE deleted_at IS NULL;

CREATE VIEW public.feed_hot_takes AS
SELECT * FROM posts WHERE deleted_at IS NULL;

-- =====================================================
-- FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_post_reaction_counts()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF NEW.kind = 'like' THEN
      UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    ELSE
      UPDATE posts SET dislikes_count = dislikes_count + 1 WHERE id = NEW.post_id;
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    IF OLD.kind = 'like' THEN
      UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
    ELSE
      UPDATE posts SET dislikes_count = GREATEST(dislikes_count - 1, 0) WHERE id = OLD.post_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.api_create_post(
  p_kind text,
  p_body text,
  p_item_type text DEFAULT NULL,
  p_item_id text DEFAULT NULL,
  p_rating_percent integer DEFAULT NULL,
  p_is_spoiler boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_post_id uuid;
BEGIN
  IF p_kind NOT IN ('thought','review','rating','reshare') THEN
    RAISE EXCEPTION 'invalid kind';
  END IF;

  IF p_rating_percent IS NOT NULL AND (p_rating_percent < 0 OR p_rating_percent > 100) THEN
    RAISE EXCEPTION 'rating out of range';
  END IF;

  INSERT INTO posts (author_id, kind, body, item_type, item_id, rating_percent, is_spoiler)
  VALUES (auth.uid(), p_kind, p_body, p_item_type, p_item_id, p_rating_percent, COALESCE(p_is_spoiler, false))
  RETURNING id INTO v_post_id;

  RETURN v_post_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.compute_season_rollup(p_user uuid, p_season_id text)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  WITH eps AS (
    SELECT score FROM user_ratings
    WHERE user_id = p_user AND item_type = 'episode' AND item_id LIKE (p_season_id || ':%')
  )
  SELECT CASE WHEN COUNT(*) = 0 THEN NULL ELSE ROUND(AVG(score))::int END FROM eps;
$$;

CREATE OR REPLACE FUNCTION public.compute_show_rollup(p_user uuid, p_show_id text)
RETURNS integer
LANGUAGE sql
STABLE
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
  SELECT CASE WHEN COUNT(*) = 0 THEN NULL ELSE ROUND(AVG(score))::int END FROM unioned;
$$;

CREATE OR REPLACE FUNCTION public.upsert_rollups(p_user uuid, p_item_type text, p_item_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_show_id text;
  v_season_id text;
  v_roll int;
  v_has_manual boolean;
BEGIN
  IF p_item_type = 'episode' THEN
    v_season_id := split_part(p_item_id, ':', 1) || ':' || split_part(p_item_id, ':', 2);
    v_show_id := split_part(p_item_id, ':', 1);

    SELECT EXISTS(SELECT 1 FROM user_ratings WHERE user_id=p_user AND item_type='season' AND item_id=v_season_id AND source='manual')
      INTO v_has_manual;
    IF NOT v_has_manual THEN
      v_roll := compute_season_rollup(p_user, v_season_id);
      IF v_roll IS NOT NULL THEN
        INSERT INTO user_ratings(user_id,item_type,item_id,score,source)
        VALUES (p_user,'season',v_season_id,v_roll,'rollup')
        ON CONFLICT (user_id,item_type,item_id) DO UPDATE
          SET score=EXCLUDED.score, source='rollup', updated_at=NOW();
      END IF;
    END IF;

    SELECT EXISTS(SELECT 1 FROM user_ratings WHERE user_id=p_user AND item_type='show' AND item_id=v_show_id AND source='manual')
      INTO v_has_manual;
    IF NOT v_has_manual THEN
      v_roll := compute_show_rollup(p_user, v_show_id);
      IF v_roll IS NOT NULL THEN
        INSERT INTO user_ratings(user_id,item_type,item_id,score,source)
        VALUES (p_user,'show',v_show_id,v_roll,'rollup')
        ON CONFLICT (user_id,item_type,item_id) DO UPDATE
          SET score=EXCLUDED.score, source='rollup', updated_at=NOW();
      END IF;
    END IF;

  ELSIF p_item_type = 'season' THEN
    v_show_id := split_part(p_item_id, ':', 1);
    SELECT EXISTS(SELECT 1 FROM user_ratings WHERE user_id=p_user AND item_type='show' AND item_id=v_show_id AND source='manual')
      INTO v_has_manual;
    IF NOT v_has_manual THEN
      v_roll := compute_show_rollup(p_user, v_show_id);
      IF v_roll IS NOT NULL THEN
        INSERT INTO user_ratings(user_id,item_type,item_id,score,source)
        VALUES (p_user,'show',v_show_id,v_roll,'rollup')
        ON CONFLICT (user_id,item_type,item_id) DO UPDATE
          SET score=EXCLUDED.score, source='rollup', updated_at=NOW();
      END IF;
    END IF;
  END IF;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER sync_post_reactions_trigger
  AFTER INSERT OR DELETE ON public.post_reactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_reaction_counts();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_dislikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tvdb_shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tvdb_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tvdb_trending ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reshares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tmdb_cache ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can view public profiles basic info" ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() <> id AND is_private = false);
CREATE POLICY "Authenticated users can view private profiles if following" ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() <> id AND is_private = true AND EXISTS (SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = profiles.id AND status = 'accepted'));

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Posts policies
CREATE POLICY "p_posts_select_all" ON public.posts FOR SELECT USING (true);
CREATE POLICY "p_posts_insert_own" ON public.posts FOR INSERT WITH CHECK (author_id = auth.uid());

-- Post reactions policies
CREATE POLICY "p_pr_select" ON public.post_reactions FOR SELECT USING (true);
CREATE POLICY "p_pr_upsert" ON public.post_reactions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "p_pr_delete" ON public.post_reactions FOR DELETE USING (user_id = auth.uid());

-- User ratings policies
CREATE POLICY "p_user_ratings_select" ON public.user_ratings FOR SELECT USING (true);
CREATE POLICY "p_user_ratings_upsert" ON public.user_ratings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "p_user_ratings_update" ON public.user_ratings FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- User reviews policies
CREATE POLICY "p_user_reviews_select" ON public.user_reviews FOR SELECT USING (true);
CREATE POLICY "p_user_reviews_insert" ON public.user_reviews FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "p_user_reviews_update" ON public.user_reviews FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Follows policies
CREATE POLICY "Authenticated users can view accepted follows and own requests" ON public.follows FOR SELECT USING (auth.uid() IS NOT NULL AND (status = 'accepted' OR auth.uid() = follower_id OR auth.uid() = following_id));
CREATE POLICY "Users can follow others" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);
CREATE POLICY "Users can update follow requests sent to them" ON public.follows FOR UPDATE USING (auth.uid() = following_id) WITH CHECK (auth.uid() = following_id);

-- DMs policies
CREATE POLICY "Users can view own messages" ON public.dms FOR SELECT USING (auth.uid() IS NOT NULL AND (auth.uid() = sender_id OR auth.uid() = recipient_id));
CREATE POLICY "Users can send messages" ON public.dms FOR INSERT WITH CHECK (auth.uid() = sender_id AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can update received messages" ON public.dms FOR UPDATE USING (auth.uid() = recipient_id AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own sent messages" ON public.dms FOR DELETE USING (auth.uid() = sender_id AND auth.uid() IS NOT NULL);

-- Chat policies
CREATE POLICY "Users can view own chat sessions" ON public.chat_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own chat sessions" ON public.chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can view own session messages" ON public.chat_messages FOR SELECT USING (EXISTS (SELECT 1 FROM chat_sessions WHERE id = chat_messages.session_id AND user_id = auth.uid()));
CREATE POLICY "Users can create messages in own sessions" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM chat_sessions WHERE id = chat_messages.session_id AND user_id = auth.uid()));

-- TVDB cache policies
CREATE POLICY "Authenticated users can view TVDB shows cache" ON public.tvdb_shows FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can view TVDB episodes cache" ON public.tvdb_episodes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can view trending shows" ON public.tvdb_trending FOR SELECT USING (auth.uid() IS NOT NULL);

-- User prefs policies
CREATE POLICY "Users can view own prefs" ON public.user_prefs FOR SELECT USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert own prefs" ON public.user_prefs FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own prefs" ON public.user_prefs FOR UPDATE USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- Feed scores policies
CREATE POLICY "Users can view own feed scores" ON public.feed_scores FOR SELECT USING (auth.uid() = user_id);

-- Feed impressions policies
CREATE POLICY "Users can create impressions" ON public.feed_impressions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Interactions policies
CREATE POLICY "Authenticated users can view interactions" ON public.interactions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create interactions" ON public.interactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reshares policies
CREATE POLICY "Authenticated users can view reshares" ON public.reshares FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can reshare posts" ON public.reshares FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reshares" ON public.reshares FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Authenticated users can view comments" ON public.comments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- Comment likes/dislikes policies
CREATE POLICY "Authenticated users can view comment likes" ON public.comment_likes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can like comments" ON public.comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike comments" ON public.comment_likes FOR DELETE USING (auth.uid() = user_id);

-- Custom lists policies
CREATE POLICY "Public lists viewable by authenticated users" ON public.custom_lists FOR SELECT USING (auth.uid() IS NOT NULL AND (is_public = true OR auth.uid() = user_id));
CREATE POLICY "Users can create lists" ON public.custom_lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lists" ON public.custom_lists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own lists" ON public.custom_lists FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- STORAGE
-- =====================================================

-- Storage bucket: avatars (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================================================
-- INDEXES (for performance)
-- =====================================================

CREATE INDEX idx_posts_author_id ON public.posts(author_id);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX idx_posts_item ON public.posts(item_type, item_id);
CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);
CREATE INDEX idx_user_ratings_user_item ON public.user_ratings(user_id, item_type, item_id);
CREATE INDEX idx_user_reviews_user_item ON public.user_reviews(user_id, item_type, item_id);
CREATE INDEX idx_post_reactions_post ON public.post_reactions(post_id);
CREATE INDEX idx_dms_recipient ON public.dms(recipient_id, created_at DESC);
CREATE INDEX idx_dms_sender ON public.dms(sender_id, created_at DESC);

-- =====================================================
-- SCHEMA DUMP COMPLETE
-- =====================================================
