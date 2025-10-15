-- Drop the circular triggers that cause infinite recursion

-- Drop trigger that syncs rating changes back to posts (causes loop)
DROP TRIGGER IF EXISTS trg_sync_rating_to_post ON user_ratings;

-- Drop the sync_rating_to_post function as it's no longer needed
DROP FUNCTION IF EXISTS sync_rating_to_post();

-- Drop one of the duplicate triggers on user_reviews (we have two doing the same thing)
DROP TRIGGER IF EXISTS t_reviews_sync ON user_reviews;

-- Keep t_user_reviews_sync which handles the user_reviews -> user_ratings sync
-- Keep t_posts_sync_review_rating which handles posts -> user_ratings sync
-- This creates a one-way flow without circular dependencies