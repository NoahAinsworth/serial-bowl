-- Create episode_runtimes table to store runtime information
CREATE TABLE IF NOT EXISTS public.episode_runtimes (
  tvdb_id TEXT PRIMARY KEY,
  runtime_minutes INTEGER NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.episode_runtimes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read runtimes
CREATE POLICY "Anyone can view episode runtimes"
  ON public.episode_runtimes FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert runtimes
CREATE POLICY "Authenticated users can insert runtimes"
  ON public.episode_runtimes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create watched_episodes table to track which episodes users have watched
CREATE TABLE IF NOT EXISTS public.watched_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tvdb_id TEXT NOT NULL,
  watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, tvdb_id)
);

-- Enable RLS
ALTER TABLE public.watched_episodes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own watched episodes
CREATE POLICY "Users can view own watched episodes"
  ON public.watched_episodes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own watched episodes
CREATE POLICY "Users can insert own watched episodes"
  ON public.watched_episodes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own watched episodes
CREATE POLICY "Users can delete own watched episodes"
  ON public.watched_episodes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add watch stats columns to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS minutes_watched INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS badge_tier TEXT,
  ADD COLUMN IF NOT EXISTS badge_updated_at TIMESTAMP WITH TIME ZONE;

-- Create function to update user watch stats
CREATE OR REPLACE FUNCTION public.update_user_watch_stats(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_minutes INTEGER;
  v_new_tier TEXT;
BEGIN
  -- Calculate total watch time
  SELECT COALESCE(SUM(r.runtime_minutes), 0)
  INTO v_total_minutes
  FROM watched_episodes we
  JOIN episode_runtimes r ON we.tvdb_id = r.tvdb_id
  WHERE we.user_id = p_user_id;

  -- Determine badge tier
  IF v_total_minutes >= 10000 THEN
    v_new_tier := 'platinum';
  ELSIF v_total_minutes >= 5000 THEN
    v_new_tier := 'gold';
  ELSIF v_total_minutes >= 1000 THEN
    v_new_tier := 'silver';
  ELSIF v_total_minutes >= 100 THEN
    v_new_tier := 'bronze';
  ELSE
    v_new_tier := NULL;
  END IF;

  -- Update profile
  UPDATE profiles
  SET 
    minutes_watched = v_total_minutes,
    badge_tier = v_new_tier,
    badge_updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;