-- Fix increment_show_score to verify caller is modifying their own score
CREATE OR REPLACE FUNCTION public.increment_show_score(p_user_id uuid, p_count integer DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is modifying their own score
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Cannot modify another user''s score';
  END IF;
  
  UPDATE profiles
  SET show_score = COALESCE(show_score, 0) + p_count
  WHERE id = p_user_id;
END;
$$;