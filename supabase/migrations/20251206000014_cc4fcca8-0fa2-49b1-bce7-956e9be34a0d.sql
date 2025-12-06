-- Add binge_score column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS binge_score INTEGER DEFAULT 0;

-- Create function to auto-calculate BingeScore
CREATE OR REPLACE FUNCTION update_binge_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.binge_score := COALESCE(NEW.show_score, 0) + COALESCE(NEW.binge_points, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-update binge_score when show_score or binge_points change
DROP TRIGGER IF EXISTS trg_update_binge_score ON profiles;
CREATE TRIGGER trg_update_binge_score
BEFORE INSERT OR UPDATE OF show_score, binge_points ON profiles
FOR EACH ROW EXECUTE FUNCTION update_binge_score();

-- Backfill binge_score for all existing users
UPDATE profiles 
SET binge_score = COALESCE(show_score, 0) + COALESCE(binge_points, 0);