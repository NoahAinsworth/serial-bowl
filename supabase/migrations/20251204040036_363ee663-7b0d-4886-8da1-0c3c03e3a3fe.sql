-- Add new columns to profiles table for the revamped Binge Points system
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS show_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS legacy_binge_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_points_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_points_reset_at TIMESTAMPTZ DEFAULT now();

-- Migrate existing binge_points to legacy and reset to 0
UPDATE public.profiles 
SET legacy_binge_points = COALESCE(binge_points, 0),
    binge_points = 0,
    daily_points_earned = 0,
    daily_points_reset_at = now()
WHERE binge_points > 0 OR legacy_binge_points IS NULL;

-- Create binge_point_logs table for tracking earned points
CREATE TABLE IF NOT EXISTS public.binge_point_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points_earned INTEGER NOT NULL DEFAULT 0,
  episode_count INTEGER NOT NULL DEFAULT 0,
  season_bonus INTEGER DEFAULT 0,
  show_bonus INTEGER DEFAULT 0,
  show_id TEXT NOT NULL,
  show_title TEXT,
  logged_at TIMESTAMPTZ DEFAULT now(),
  was_bulk BOOLEAN DEFAULT false,
  anti_cheat_denied BOOLEAN DEFAULT false
);

-- Enable RLS on binge_point_logs
ALTER TABLE public.binge_point_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for binge_point_logs
CREATE POLICY "Users can view own binge point logs"
ON public.binge_point_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own binge point logs"
ON public.binge_point_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create function to increment show_score (called when marking episodes as watched)
CREATE OR REPLACE FUNCTION public.increment_show_score(p_user_id UUID, p_count INTEGER DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET show_score = COALESCE(show_score, 0) + p_count
  WHERE id = p_user_id;
END;
$$;

-- Create function to add binge points with daily cap check
CREATE OR REPLACE FUNCTION public.add_binge_points(
  p_user_id UUID, 
  p_points INTEGER,
  p_daily_cap INTEGER DEFAULT 200
)
RETURNS TABLE(points_added INTEGER, daily_total INTEGER, cap_reached BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_daily INTEGER;
  v_reset_at TIMESTAMPTZ;
  v_points_to_add INTEGER;
  v_new_daily INTEGER;
BEGIN
  -- Get current daily state
  SELECT daily_points_earned, daily_points_reset_at 
  INTO v_current_daily, v_reset_at
  FROM profiles WHERE id = p_user_id;
  
  -- Reset daily counter if new day (UTC)
  IF v_reset_at IS NULL OR v_reset_at::date < now()::date THEN
    v_current_daily := 0;
    UPDATE profiles 
    SET daily_points_earned = 0, daily_points_reset_at = now()
    WHERE id = p_user_id;
  END IF;
  
  -- Calculate how many points can be added
  v_points_to_add := LEAST(p_points, p_daily_cap - v_current_daily);
  v_points_to_add := GREATEST(v_points_to_add, 0);
  
  v_new_daily := v_current_daily + v_points_to_add;
  
  -- Update profile
  UPDATE profiles
  SET binge_points = COALESCE(binge_points, 0) + v_points_to_add,
      daily_points_earned = v_new_daily
  WHERE id = p_user_id;
  
  RETURN QUERY SELECT v_points_to_add, v_new_daily, (v_new_daily >= p_daily_cap);
END;
$$;