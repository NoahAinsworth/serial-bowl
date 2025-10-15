-- Fix ratings table to support 0-100 percentage values
ALTER TABLE public.ratings 
ALTER COLUMN rating TYPE integer USING rating::integer;