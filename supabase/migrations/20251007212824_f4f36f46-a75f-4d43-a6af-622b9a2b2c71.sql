-- Add rating column to reviews table to store percentage ratings (1-100)
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 100);

-- Convert any existing ratings from 1-10 scale to 1-100 percentage scale
UPDATE public.ratings 
SET rating = LEAST(100, GREATEST(1, ROUND(rating * 10)))
WHERE rating <= 10;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);
CREATE INDEX IF NOT EXISTS idx_ratings_content_rating ON public.ratings(content_id, rating);

-- Create a trigger to sync review ratings with the ratings table
CREATE OR REPLACE FUNCTION sync_review_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- When a review with a rating is inserted or updated, sync to ratings table
  IF NEW.rating IS NOT NULL AND NEW.rating > 0 THEN
    INSERT INTO public.ratings (user_id, content_id, rating, created_at)
    VALUES (NEW.user_id, NEW.content_id, NEW.rating, NOW())
    ON CONFLICT (user_id, content_id) 
    DO UPDATE SET rating = NEW.rating, created_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER sync_review_rating_trigger
AFTER INSERT OR UPDATE ON public.reviews
FOR EACH ROW
WHEN (NEW.rating IS NOT NULL)
EXECUTE FUNCTION sync_review_rating();