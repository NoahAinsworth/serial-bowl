-- ==========================================
-- WAVE 1: DATABASE SCHEMA
-- ==========================================

-- 1. Collections tables
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  is_curated BOOLEAN DEFAULT FALSE,
  is_ai_generated BOOLEAN DEFAULT FALSE,
  ai_prompt TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  content_id UUID REFERENCES content(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(collection_id, content_id)
);

-- RLS for collections
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public collections or own collections"
  ON collections FOR SELECT
  USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Users can create own collections"
  ON collections FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own collections"
  ON collections FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own collections"
  ON collections FOR DELETE
  USING (user_id = auth.uid());

-- RLS for collection_items
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view items from visible collections"
  ON collection_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_items.collection_id
      AND (collections.is_public = true OR collections.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can add items to own collections"
  ON collection_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_items.collection_id
      AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items from own collections"
  ON collection_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_items.collection_id
      AND collections.user_id = auth.uid()
    )
  );

-- 2. Watch Party tables
CREATE TABLE watch_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  host_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  show_id TEXT,
  current_season INTEGER DEFAULT 1,
  current_episode INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE watch_party_members (
  party_id UUID REFERENCES watch_parties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  progress_season INTEGER DEFAULT 1,
  progress_episode INTEGER DEFAULT 1,
  binge_points_earned INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (party_id, user_id)
);

CREATE TABLE watch_party_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES watch_parties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  reaction_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for watch_parties
ALTER TABLE watch_parties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view parties they are members of"
  ON watch_parties FOR SELECT
  USING (
    host_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM watch_party_members
      WHERE watch_party_members.party_id = watch_parties.id
      AND watch_party_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create watch parties"
  ON watch_parties FOR INSERT
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "Hosts can update their parties"
  ON watch_parties FOR UPDATE
  USING (host_id = auth.uid());

CREATE POLICY "Hosts can delete their parties"
  ON watch_parties FOR DELETE
  USING (host_id = auth.uid());

-- RLS for watch_party_members
ALTER TABLE watch_party_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members of their parties"
  ON watch_party_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM watch_parties
      WHERE watch_parties.id = watch_party_members.party_id
      AND (
        watch_parties.host_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM watch_party_members wpm
          WHERE wpm.party_id = watch_parties.id
          AND wpm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Hosts can add members to their parties"
  ON watch_party_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM watch_parties
      WHERE watch_parties.id = watch_party_members.party_id
      AND watch_parties.host_id = auth.uid()
    )
  );

CREATE POLICY "Members can update own progress"
  ON watch_party_members FOR UPDATE
  USING (user_id = auth.uid());

-- RLS for watch_party_messages
ALTER TABLE watch_party_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their parties"
  ON watch_party_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM watch_party_members
      WHERE watch_party_members.party_id = watch_party_messages.party_id
      AND watch_party_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can send messages"
  ON watch_party_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM watch_party_members
      WHERE watch_party_members.party_id = watch_party_messages.party_id
      AND watch_party_members.user_id = auth.uid()
    )
  );

-- 3. Enhance custom_lists table
ALTER TABLE custom_lists ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE custom_lists ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE custom_lists ADD COLUMN IF NOT EXISTS ai_prompt TEXT;

-- 4. Enhance list_items table
ALTER TABLE list_items ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;
ALTER TABLE list_items ADD COLUMN IF NOT EXISTS notes TEXT;

-- 5. User subscriptions table (prepared, not enforced)
CREATE TABLE user_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  tier TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON user_subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own subscription"
  ON user_subscriptions FOR UPDATE
  USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_collections_user_id ON collections(user_id);
CREATE INDEX idx_collections_is_public ON collections(is_public);
CREATE INDEX idx_collection_items_collection_id ON collection_items(collection_id);
CREATE INDEX idx_watch_parties_host_id ON watch_parties(host_id);
CREATE INDEX idx_watch_party_members_user_id ON watch_party_members(user_id);
CREATE INDEX idx_watch_party_messages_party_id ON watch_party_messages(party_id);