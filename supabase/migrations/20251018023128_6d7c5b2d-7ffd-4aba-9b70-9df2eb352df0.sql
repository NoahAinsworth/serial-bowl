-- Update get_badge_tier function to match frontend thresholds
CREATE OR REPLACE FUNCTION public.get_badge_tier(p_points integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE
    WHEN p_points >= 10000 THEN RETURN 'Ultimate Binger';
    WHEN p_points >= 5000 THEN RETURN 'Stream Scholar';
    WHEN p_points >= 2500 THEN RETURN 'Series Finisher';
    WHEN p_points >= 1200 THEN RETURN 'Season Smasher';
    WHEN p_points >= 500 THEN RETURN 'Marathon Madness';
    WHEN p_points >= 150 THEN RETURN 'Casual Viewer';
    ELSE RETURN 'Pilot Watcher';
  END CASE;
END;
$$;