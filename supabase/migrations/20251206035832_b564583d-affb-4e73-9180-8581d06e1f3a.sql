-- Clean up orphaned binge points for all users
-- These are points earned for episodes that were deleted before the reversal code was deployed

-- Step 1: Create a temp table to identify orphaned logs
CREATE TEMP TABLE orphaned_logs AS
SELECT 
  bpl.id,
  bpl.user_id,
  bpl.show_id,
  bpl.points_earned + COALESCE(bpl.season_bonus, 0) + COALESCE(bpl.show_bonus, 0) as total_points
FROM binge_point_logs bpl
WHERE bpl.is_reversed = false
AND NOT EXISTS (
  SELECT 1 FROM watched_episodes we
  WHERE we.user_id = bpl.user_id
  AND we.show_id::text = bpl.show_id
);

-- Step 2: Update profiles to subtract orphaned points
UPDATE profiles p
SET binge_points = GREATEST(0, COALESCE(binge_points, 0) - COALESCE((
  SELECT SUM(total_points) FROM orphaned_logs WHERE user_id = p.id
), 0))
WHERE id IN (SELECT DISTINCT user_id FROM orphaned_logs);

-- Step 3: Mark orphaned logs as reversed
UPDATE binge_point_logs
SET is_reversed = true
WHERE id IN (SELECT id FROM orphaned_logs);

-- Step 4: Clean up temp table
DROP TABLE orphaned_logs;