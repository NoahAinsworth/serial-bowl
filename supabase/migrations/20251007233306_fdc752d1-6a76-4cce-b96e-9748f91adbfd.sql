-- Fix security issue: Require authentication to view reactions
-- This prevents public scraping of user behavior data

-- Drop the existing public policy
DROP POLICY IF EXISTS "Reactions are viewable by everyone" ON public.reactions;

-- Create new policy requiring authentication
CREATE POLICY "Authenticated users can view reactions"
ON public.reactions
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);