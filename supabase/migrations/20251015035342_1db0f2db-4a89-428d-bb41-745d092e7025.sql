-- Add unique constraint to user_ratings for upserts
ALTER TABLE public.user_ratings 
  ADD CONSTRAINT user_ratings_user_item_unique 
  UNIQUE (user_id, item_type, item_id);

-- Add unique constraint to user_reviews for upserts  
ALTER TABLE public.user_reviews 
  ADD CONSTRAINT user_reviews_user_item_unique 
  UNIQUE (user_id, item_type, item_id);