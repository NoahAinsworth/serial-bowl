-- Rename columns to match code expectations

-- Rename comment_text to text_content in comments table
ALTER TABLE public.comments RENAME COLUMN comment_text TO text_content;

-- Rename thought_text to text_content in thoughts table
ALTER TABLE public.thoughts RENAME COLUMN thought_text TO text_content;

-- Fix moderation_status values (code expects 'approved' but uses 'allow')
-- Just ensure the enum is correct - no changes needed as we already have 'approved'