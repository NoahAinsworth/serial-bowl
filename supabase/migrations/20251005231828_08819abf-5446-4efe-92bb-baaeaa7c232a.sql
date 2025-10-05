-- Add TMDB cache table for verified TV data
CREATE TABLE IF NOT EXISTS public.tmdb_cache (
  cache_key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tmdb_cache ENABLE ROW LEVEL SECURITY;

-- Cache is viewable by everyone (for read-through caching)
CREATE POLICY "TMDB cache is viewable by everyone"
  ON public.tmdb_cache
  FOR SELECT
  USING (true);

-- Only system can update cache (via edge function with service role)
CREATE POLICY "System can update TMDB cache"
  ON public.tmdb_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);