-- Add missing columns to existing tables

-- Add metadata column to content table (for storing show_id, season_number, episode_number, air_date)
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add settings column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Add is_public column to custom_lists table
ALTER TABLE public.custom_lists ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Rename aggregates table (it should be content_aggregates)
-- This is already correct, so we'll just ensure it exists