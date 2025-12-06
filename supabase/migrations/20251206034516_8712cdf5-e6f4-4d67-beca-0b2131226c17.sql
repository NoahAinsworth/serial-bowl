-- Add is_reversed column to binge_point_logs
ALTER TABLE binge_point_logs ADD COLUMN IF NOT EXISTS is_reversed BOOLEAN DEFAULT false;

-- Create function to reverse binge points for a specific show
CREATE OR REPLACE FUNCTION reverse_binge_points_for_show(
  p_user_id UUID,
  p_show_id TEXT
) RETURNS void AS $$
DECLARE
  v_points_to_reverse INTEGER;
BEGIN
  -- Calculate total unreversed points for this show
  SELECT COALESCE(SUM(points_earned + COALESCE(season_bonus, 0) + COALESCE(show_bonus, 0)), 0)
  INTO v_points_to_reverse
  FROM binge_point_logs 
  WHERE user_id = p_user_id 
  AND show_id = p_show_id 
  AND is_reversed = false;
  
  -- Subtract points from profile (never go below 0)
  UPDATE profiles 
  SET binge_points = GREATEST(0, COALESCE(binge_points, 0) - v_points_to_reverse)
  WHERE id = p_user_id;
  
  -- Mark logs as reversed
  UPDATE binge_point_logs
  SET is_reversed = true
  WHERE user_id = p_user_id 
  AND show_id = p_show_id 
  AND is_reversed = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;