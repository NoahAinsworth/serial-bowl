-- Add spoiler column to thoughts table
ALTER TABLE public.thoughts
ADD COLUMN is_spoiler boolean NOT NULL DEFAULT false;

-- Add spoiler column to reviews table
ALTER TABLE public.reviews
ADD COLUMN is_spoiler boolean NOT NULL DEFAULT false;