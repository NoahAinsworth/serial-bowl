-- Add edited_at column to posts table
ALTER TABLE posts ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE;

-- Create post edit history table
CREATE TABLE post_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  previous_body TEXT,
  previous_rating_percent INTEGER,
  edited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on post_edit_history
ALTER TABLE post_edit_history ENABLE ROW LEVEL SECURITY;

-- Users can view edit history of posts they can see
CREATE POLICY "Users can view post edit history"
ON post_edit_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM posts 
    WHERE posts.id = post_edit_history.post_id 
    AND posts.deleted_at IS NULL
  )
);

-- Add edited_at column to dms table
ALTER TABLE dms ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE;

-- Create dm edit history table
CREATE TABLE dm_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dm_id UUID NOT NULL REFERENCES dms(id) ON DELETE CASCADE,
  previous_text_content TEXT NOT NULL,
  edited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on dm_edit_history
ALTER TABLE dm_edit_history ENABLE ROW LEVEL SECURITY;

-- Users can view DM edit history for their own messages
CREATE POLICY "Users can view dm edit history"
ON dm_edit_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM dms 
    WHERE dms.id = dm_edit_history.dm_id 
    AND (dms.sender_id = auth.uid() OR dms.recipient_id = auth.uid())
  )
);