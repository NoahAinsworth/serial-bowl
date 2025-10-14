-- ENUM for posts
DO $$ BEGIN CREATE TYPE post_kind AS ENUM('thought','review'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Unified ratings ledger
CREATE TABLE IF NOT EXISTS user_ratings(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type text CHECK (item_type IN ('show','season','episode')) NOT NULL,
  item_id bigint NOT NULL,
  score int CHECK (score BETWEEN 1 AND 100) NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, item_type, item_id)
);

-- Enable RLS
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_ratings
CREATE POLICY "Users can view all ratings" ON user_ratings FOR SELECT USING (true);
CREATE POLICY "Users can insert own ratings" ON user_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ratings" ON user_ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ratings" ON user_ratings FOR DELETE USING (auth.uid() = user_id);

-- Ensure posts columns exist
DO $$ BEGIN
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS kind post_kind;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS item_type text CHECK (item_type IN ('show','season','episode'));
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS item_id bigint;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS rating_percent int CHECK (rating_percent BETWEEN 1 AND 100);
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS has_spoilers boolean DEFAULT false;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS has_mature boolean DEFAULT false;
EXCEPTION WHEN OTHERS THEN null; END $$;

-- Content cache (TVDB source of truth)
CREATE TABLE IF NOT EXISTS shows(
  id bigint PRIMARY KEY,
  title text NOT NULL,
  poster_url text,
  dominant_hex text,
  year int,
  metadata jsonb DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS seasons(
  id bigint PRIMARY KEY,
  show_id bigint REFERENCES shows(id) ON DELETE CASCADE,
  season_number int NOT NULL,
  dominant_hex text,
  poster_url text,
  metadata jsonb DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS episodes(
  id bigint PRIMARY KEY,
  show_id bigint REFERENCES shows(id) ON DELETE CASCADE,
  season_id bigint REFERENCES seasons(id) ON DELETE CASCADE,
  season_number int NOT NULL,
  episode_number int NOT NULL,
  title text,
  dominant_hex text,
  metadata jsonb DEFAULT '{}'
);

-- Enable RLS on content tables
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view shows" ON shows FOR SELECT USING (true);
CREATE POLICY "Everyone can view seasons" ON seasons FOR SELECT USING (true);
CREATE POLICY "Everyone can view episodes" ON episodes FOR SELECT USING (true);

-- Conversations and messages
CREATE TABLE IF NOT EXISTS conversations(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_participants(
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  body text,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS message_reads(
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- RLS for DMs
CREATE POLICY "Users can view conversations they participate in" ON conversations FOR SELECT 
USING (EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = conversations.id AND user_id = auth.uid()));

CREATE POLICY "Users can view participants in their conversations" ON conversation_participants FOR SELECT
USING (EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = conversation_participants.conversation_id AND cp.user_id = auth.uid()));

CREATE POLICY "Users can view messages in their conversations" ON messages FOR SELECT
USING (EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()));

CREATE POLICY "Users can send messages to their conversations" ON messages FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()) AND sender_id = auth.uid());

CREATE POLICY "Users can mark messages as read" ON message_reads FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Trigger: keep review % in sync with ratings ledger
CREATE OR REPLACE FUNCTION trg_sync_review_rating()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.kind = 'review' AND NEW.deleted_at IS NULL AND NEW.rating_percent IS NOT NULL) THEN
    INSERT INTO user_ratings(user_id, item_type, item_id, score, updated_at)
    VALUES (NEW.author_id, NEW.item_type, NEW.item_id, NEW.rating_percent, now())
    ON CONFLICT (user_id, item_type, item_id)
    DO UPDATE SET score = EXCLUDED.score, updated_at = now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS t_posts_sync_review_rating ON posts;
CREATE TRIGGER t_posts_sync_review_rating
AFTER INSERT OR UPDATE OF rating_percent, deleted_at ON posts
FOR EACH ROW EXECUTE FUNCTION trg_sync_review_rating();

-- Feed functions already exist, updating them
CREATE OR REPLACE FUNCTION feed_trending_rt(limit_count int DEFAULT 20, cursor_score numeric DEFAULT NULL)
RETURNS TABLE(post_id uuid, score numeric) LANGUAGE sql STABLE AS $$
  WITH base AS (
    SELECT p.id AS post_id,
           EXTRACT(epoch FROM (now()-p.created_at))/3600.0 AS ageH,
           p.likes_count AS likes,
           p.dislikes_count AS dislikes,
           p.replies_count AS comments
    FROM posts p
    WHERE p.deleted_at IS NULL
  )
  SELECT post_id,
         ((likes - dislikes)*1.7 + comments*1.2 + 3) / power(ageH+1, 1.25) AS score
  FROM base
  WHERE (cursor_score IS NULL OR ((likes - dislikes)*1.7 + comments*1.2 + 3) / power(ageH+1, 1.25) < cursor_score)
  ORDER BY score DESC
  LIMIT limit_count;
$$;

CREATE OR REPLACE FUNCTION feed_hot_takes(limit_count int DEFAULT 20, cursor_score numeric DEFAULT NULL)
RETURNS TABLE(post_id uuid, controversy numeric) LANGUAGE sql STABLE AS $$
  WITH base AS (
    SELECT p.id AS post_id,
           EXTRACT(epoch FROM (now()-p.created_at))/3600.0 AS ageH,
           p.likes_count::numeric AS likes,
           p.dislikes_count::numeric AS dislikes
    FROM posts p
    WHERE p.deleted_at IS NULL
  ), scored AS (
    SELECT post_id,
           ((likes+dislikes) / GREATEST(1, ABS(likes - dislikes))) / power(ageH+1, 1.1) AS controversy
    FROM base
    WHERE (likes+dislikes) >= 5
  )
  SELECT post_id, controversy
  FROM scored
  WHERE (cursor_score IS NULL OR controversy < cursor_score)
  ORDER BY controversy DESC
  LIMIT limit_count;
$$;