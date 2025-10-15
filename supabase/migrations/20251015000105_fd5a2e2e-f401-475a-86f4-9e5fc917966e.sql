-- Migrate existing thoughts to posts table
INSERT INTO posts (id, author_id, kind, body, item_type, item_id, rating_percent, is_spoiler, has_spoilers, has_mature, created_at, updated_at)
SELECT 
  id,
  user_id as author_id,
  'thought' as kind,
  text_content as body,
  NULL as item_type,
  NULL as item_id,
  NULL as rating_percent,
  is_spoiler,
  is_spoiler as has_spoilers,
  contains_mature as has_mature,
  created_at,
  created_at as updated_at
FROM thoughts
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE posts.id = thoughts.id);

-- Migrate existing reviews to posts table
INSERT INTO posts (id, author_id, kind, body, item_type, item_id, rating_percent, is_spoiler, has_spoilers, has_mature, created_at, updated_at)
SELECT 
  id,
  user_id as author_id,
  'review' as kind,
  review_text as body,
  NULL as item_type,
  content_id::text as item_id,
  rating as rating_percent,
  is_spoiler,
  is_spoiler as has_spoilers,
  contains_mature as has_mature,
  created_at,
  created_at as updated_at
FROM reviews
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE posts.id = reviews.id);

-- Migrate reactions from thoughts to post_reactions
INSERT INTO post_reactions (user_id, post_id, kind, created_at)
SELECT 
  user_id,
  thought_id as post_id,
  CASE 
    WHEN reaction_type = 'like' THEN 'like'
    WHEN reaction_type = 'dislike' THEN 'dislike'
    ELSE 'like'
  END as kind,
  created_at
FROM reactions
WHERE NOT EXISTS (
  SELECT 1 FROM post_reactions 
  WHERE post_reactions.user_id = reactions.user_id 
  AND post_reactions.post_id = reactions.thought_id
);

-- Update likes/dislikes counts on migrated posts
UPDATE posts SET likes_count = (
  SELECT COUNT(*) FROM post_reactions 
  WHERE post_reactions.post_id = posts.id AND post_reactions.kind = 'like'
);

UPDATE posts SET dislikes_count = (
  SELECT COUNT(*) FROM post_reactions 
  WHERE post_reactions.post_id = posts.id AND post_reactions.kind = 'dislike'
);

-- Update replies count from comments
UPDATE posts SET replies_count = (
  SELECT COUNT(*) FROM comments 
  WHERE comments.thought_id = posts.id
);