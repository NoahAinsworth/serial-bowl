-- Add follow request status to existing follows table
CREATE TYPE follow_status AS ENUM ('pending', 'accepted', 'blocked');

ALTER TABLE follows 
ADD COLUMN status follow_status NOT NULL DEFAULT 'accepted';

-- Add index for querying pending requests
CREATE INDEX idx_follows_status ON follows(following_id, status) WHERE status = 'pending';

-- Add is_private column to profiles
ALTER TABLE profiles 
ADD COLUMN is_private boolean NOT NULL DEFAULT false;

-- Update RLS policy for follows to handle pending requests
DROP POLICY IF EXISTS "Users can view all follows" ON follows;

CREATE POLICY "Users can view accepted follows and own requests"
ON follows FOR SELECT
USING (
  status = 'accepted' 
  OR auth.uid() = follower_id 
  OR auth.uid() = following_id
);

-- Policy for updating follow status (for accepting/declining requests)
CREATE POLICY "Users can update follow requests sent to them"
ON follows FOR UPDATE
USING (auth.uid() = following_id)
WITH CHECK (auth.uid() = following_id);

-- Update profiles RLS to allow users to update their privacy setting
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);