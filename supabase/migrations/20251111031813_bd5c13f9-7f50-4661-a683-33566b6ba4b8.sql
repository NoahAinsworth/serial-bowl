-- Add video fields to posts table for video attachments
ALTER TABLE posts 
  ADD COLUMN video_url TEXT,
  ADD COLUMN video_thumbnail_url TEXT,
  ADD COLUMN video_duration INTEGER,
  ADD COLUMN video_file_size BIGINT,
  ADD COLUMN video_bunny_id TEXT,
  ADD COLUMN video_status TEXT CHECK (video_status IN ('uploading', 'processing', 'ready', 'failed'));

-- Add index for video posts queries
CREATE INDEX idx_posts_video_url ON posts(video_url) WHERE video_url IS NOT NULL;

-- Add video storage tracking to profiles
ALTER TABLE profiles
  ADD COLUMN video_storage_used BIGINT DEFAULT 0;