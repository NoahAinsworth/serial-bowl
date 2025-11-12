-- Add video_embed_url column to posts table for embedded video URLs
ALTER TABLE posts ADD COLUMN IF NOT EXISTS video_embed_url TEXT;

-- Add index for video embed queries
CREATE INDEX IF NOT EXISTS idx_posts_video_embed ON posts(video_embed_url) WHERE video_embed_url IS NOT NULL;