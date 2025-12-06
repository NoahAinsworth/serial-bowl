-- Reset ALL users' binge_points and recalculate binge_score and badge_tier
UPDATE profiles 
SET 
  binge_points = (
    SELECT COALESCE(SUM(points_earned), 0) 
    FROM binge_point_logs 
    WHERE user_id = profiles.id
  ),
  binge_score = COALESCE(show_score, 0) + (
    SELECT COALESCE(SUM(points_earned), 0) 
    FROM binge_point_logs 
    WHERE user_id = profiles.id
  ),
  badge_tier = get_badge_tier(
    (COALESCE(show_score, 0) + (
      SELECT COALESCE(SUM(points_earned), 0) 
      FROM binge_point_logs 
      WHERE user_id = profiles.id
    ))::integer
  ),
  badge_updated_at = NOW();