-- Add parent_id column to content table for hierarchical relationships
-- (e.g., seasons belong to shows, episodes belong to seasons)
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.content(id) ON DELETE CASCADE;