-- Create a security definer function to soft delete posts
-- This bypasses RLS and ensures the owner can delete their posts
CREATE OR REPLACE FUNCTION soft_delete_post(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow the author to delete their own post
  UPDATE posts
  SET deleted_at = NOW()
  WHERE id = p_post_id
    AND author_id = auth.uid()
    AND deleted_at IS NULL;
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found or you do not have permission to delete it';
  END IF;
END;
$$;