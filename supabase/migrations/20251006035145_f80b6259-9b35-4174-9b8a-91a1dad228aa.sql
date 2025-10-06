-- Create user preferences table
CREATE TABLE IF NOT EXISTS public.user_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  genres jsonb DEFAULT '[]'::jsonb,
  shows jsonb DEFAULT '[]'::jsonb,
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.user_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own prefs" ON public.user_prefs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own prefs" ON public.user_prefs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prefs" ON public.user_prefs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create interactions table (extending reactions)
CREATE TABLE IF NOT EXISTS public.interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL,
  post_type text NOT NULL CHECK (post_type IN ('thought', 'review')),
  interaction_type text NOT NULL CHECK (interaction_type IN ('like', 'dislike', 'reshare', 'comment', 'view')),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create interactions" ON public.interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Interactions viewable by everyone" ON public.interactions
  FOR SELECT USING (true);

-- Create feed scores table
CREATE TABLE IF NOT EXISTS public.feed_scores (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL,
  post_type text NOT NULL CHECK (post_type IN ('thought', 'review')),
  score float NOT NULL,
  reason jsonb DEFAULT '{}'::jsonb,
  computed_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (user_id, post_id, post_type)
);

ALTER TABLE public.feed_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feed scores" ON public.feed_scores
  FOR SELECT USING (auth.uid() = user_id);

-- Create feed impressions table
CREATE TABLE IF NOT EXISTS public.feed_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL,
  post_type text NOT NULL CHECK (post_type IN ('thought', 'review')),
  tab text NOT NULL,
  position int NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.feed_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create impressions" ON public.feed_impressions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_interactions_post ON public.interactions(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_user ON public.interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_created ON public.interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_thoughts_created ON public.thoughts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON public.reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_scores_user_score ON public.feed_scores(user_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_feed_impressions_user ON public.feed_impressions(user_id, created_at DESC);

-- Create unified posts view
CREATE OR REPLACE VIEW v_posts AS
SELECT 
  t.id,
  t.user_id as author_id,
  'thought' as type,
  t.content_id as show_id,
  NULL::numeric as rating,
  t.text_content as text,
  t.created_at,
  t.moderation_status
FROM thoughts t
WHERE t.moderation_status = 'approved'
UNION ALL
SELECT 
  r.id,
  r.user_id as author_id,
  'review' as type,
  r.content_id as show_id,
  rat.rating,
  r.review_text as text,
  r.created_at,
  'approved'::moderation_status as moderation_status
FROM reviews r
LEFT JOIN ratings rat ON rat.user_id = r.user_id AND rat.content_id = r.content_id;

-- Create post popularity view (last 72 hours)
CREATE OR REPLACE VIEW v_post_popularity AS
WITH recent_interactions AS (
  SELECT 
    post_id,
    post_type,
    interaction_type,
    COUNT(*) as count
  FROM interactions
  WHERE created_at > now() - interval '72 hours'
  GROUP BY post_id, post_type, interaction_type
),
thought_reactions AS (
  SELECT
    thought_id as post_id,
    'thought' as post_type,
    reaction_type as interaction_type,
    COUNT(*) as count
  FROM reactions
  WHERE created_at > now() - interval '72 hours'
  GROUP BY thought_id, reaction_type
),
all_interactions AS (
  SELECT * FROM recent_interactions
  UNION ALL
  SELECT * FROM thought_reactions
)
SELECT 
  p.id as post_id,
  p.type as post_type,
  p.created_at,
  COALESCE(SUM(CASE WHEN ai.interaction_type IN ('like') THEN ai.count ELSE 0 END), 0) as likes,
  COALESCE(SUM(CASE WHEN ai.interaction_type IN ('dislike') THEN ai.count ELSE 0 END), 0) as dislikes,
  COALESCE(SUM(CASE WHEN ai.interaction_type IN ('reshare', 'rethink') THEN ai.count ELSE 0 END), 0) as reshares,
  COALESCE(SUM(CASE WHEN ai.interaction_type IN ('comment') THEN ai.count ELSE 0 END), 0) as comments,
  COALESCE(SUM(CASE WHEN ai.interaction_type IN ('view') THEN ai.count ELSE 0 END), 0) as views
FROM v_posts p
LEFT JOIN all_interactions ai ON ai.post_id = p.id AND ai.post_type = p.type
WHERE p.created_at > now() - interval '72 hours'
GROUP BY p.id, p.type, p.created_at;