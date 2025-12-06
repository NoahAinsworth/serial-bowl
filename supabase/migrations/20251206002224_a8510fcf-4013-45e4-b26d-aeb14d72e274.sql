-- Drop existing function and recreate with correct parameter name
DROP FUNCTION IF EXISTS public.get_badge_tier(integer);

CREATE OR REPLACE FUNCTION public.get_badge_tier(p_score integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  RETURN CASE
    WHEN p_score >= 10000 THEN 'Ultimate Binger'
    WHEN p_score >= 5000 THEN 'Stream Scholar'
    WHEN p_score >= 2500 THEN 'Series Finisher'
    WHEN p_score >= 1200 THEN 'Season Smasher'
    WHEN p_score >= 500 THEN 'Marathon Madness'
    WHEN p_score >= 150 THEN 'Casual Viewer'
    ELSE 'Pilot Watcher'
  END;
END;
$$;

-- Create trigger function to update badge_tier when binge_score changes
CREATE OR REPLACE FUNCTION public.update_badge_tier_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.badge_tier := get_badge_tier(COALESCE(NEW.binge_score, 0));
  NEW.badge_updated_at := CASE 
    WHEN OLD.badge_tier IS DISTINCT FROM NEW.badge_tier THEN NOW()
    ELSE OLD.badge_updated_at
  END;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS trg_update_badge_tier ON profiles;
CREATE TRIGGER trg_update_badge_tier
BEFORE UPDATE ON profiles
FOR EACH ROW
WHEN (OLD.binge_score IS DISTINCT FROM NEW.binge_score)
EXECUTE FUNCTION update_badge_tier_trigger();

-- Backfill all users' badge_tier based on binge_score
UPDATE profiles
SET badge_tier = get_badge_tier(COALESCE(binge_score, 0)),
    badge_updated_at = NOW();