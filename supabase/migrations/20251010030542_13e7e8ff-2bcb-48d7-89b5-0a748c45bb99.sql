-- Allow review_text to be nullable so ratings-only reviews can be saved
ALTER TABLE public.reviews 
ALTER COLUMN review_text DROP NOT NULL;