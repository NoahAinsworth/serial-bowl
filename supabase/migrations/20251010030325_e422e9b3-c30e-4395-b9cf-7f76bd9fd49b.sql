-- Add mature content columns to reviews table
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS contains_mature BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mature_reasons TEXT[] DEFAULT '{}';

-- Add mature content columns to thoughts table
ALTER TABLE public.thoughts 
ADD COLUMN IF NOT EXISTS contains_mature BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mature_reasons TEXT[] DEFAULT '{}';