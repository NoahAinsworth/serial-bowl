-- Drop the old trigger that's calling the obsolete calculate_binge_points function
DROP TRIGGER IF EXISTS watched_update_binge_points ON watched;

-- Drop the old functions that are now obsolete
DROP FUNCTION IF EXISTS trigger_update_binge_points();
DROP FUNCTION IF EXISTS update_user_binge_points(uuid);
DROP FUNCTION IF EXISTS calculate_binge_points(uuid);

-- Reset ALL users' binge_points to only what was earned via Earn Points flow
UPDATE profiles 
SET binge_points = (
  SELECT COALESCE(SUM(points_earned), 0) 
  FROM binge_point_logs 
  WHERE user_id = profiles.id
),
binge_score = COALESCE(show_score, 0) + (
  SELECT COALESCE(SUM(points_earned), 0) 
  FROM binge_point_logs 
  WHERE user_id = profiles.id
);