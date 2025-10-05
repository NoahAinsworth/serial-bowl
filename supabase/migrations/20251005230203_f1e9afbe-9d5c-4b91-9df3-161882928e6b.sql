-- Chat session & messages tables
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user','assistant')) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- TVDB caches
CREATE TABLE IF NOT EXISTS tvdb_shows (
  tvdb_id INT PRIMARY KEY,
  name TEXT,
  year INT,
  json JSONB,
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tvdb_episodes (
  tvdb_id INT,
  season INT,
  episode INT,
  json JSONB,
  updated_at TIMESTAMPTZ,
  PRIMARY KEY (tvdb_id, season, episode)
);

-- Analytics (optional)
CREATE TABLE IF NOT EXISTS chat_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  type TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tvdb_shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE tvdb_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies (public read for chatbot)
CREATE POLICY "Chat sessions are viewable by everyone"
  ON chat_sessions FOR SELECT
  USING (true);

CREATE POLICY "Chat messages are viewable by everyone"
  ON chat_messages FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create chat sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can create chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "TVDB shows cache is viewable by everyone"
  ON tvdb_shows FOR SELECT
  USING (true);

CREATE POLICY "TVDB episodes cache is viewable by everyone"
  ON tvdb_episodes FOR SELECT
  USING (true);

CREATE POLICY "Chat events are viewable by everyone"
  ON chat_events FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create chat events"
  ON chat_events FOR INSERT
  WITH CHECK (true);