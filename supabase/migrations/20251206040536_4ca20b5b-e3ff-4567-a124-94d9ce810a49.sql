-- Reset daily_points_earned for users who had orphaned binge points cleaned up
-- The daily points tracker should reflect actual earned points
UPDATE profiles
SET daily_points_earned = 0
WHERE id = 'ef294d6f-fbb4-4901-b45d-cf22ac449c99'
AND binge_points = 0
AND daily_points_earned > 0;