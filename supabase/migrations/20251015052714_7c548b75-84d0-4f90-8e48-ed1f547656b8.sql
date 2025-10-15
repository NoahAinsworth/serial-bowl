-- Add missing foreign key constraint for posts.author_id -> profiles.id
-- This is needed for the posts query to properly join with profiles

ALTER TABLE public.posts 
DROP CONSTRAINT IF EXISTS posts_author_id_fkey;

ALTER TABLE public.posts
ADD CONSTRAINT posts_author_id_fkey 
FOREIGN KEY (author_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;