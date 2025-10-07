-- Create table for caching new/trending shows
CREATE TABLE IF NOT EXISTS public.tvdb_trending (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- 'new' or 'popular'
  tvdb_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  overview TEXT,
  image_url TEXT,
  first_aired TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  position INTEGER NOT NULL, -- for ordering
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX idx_tvdb_trending_category ON public.tvdb_trending(category, position);
CREATE INDEX idx_tvdb_trending_updated ON public.tvdb_trending(updated_at);

-- Enable RLS
ALTER TABLE public.tvdb_trending ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read trending shows
CREATE POLICY "Trending shows are viewable by everyone"
  ON public.tvdb_trending
  FOR SELECT
  USING (true);

-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;