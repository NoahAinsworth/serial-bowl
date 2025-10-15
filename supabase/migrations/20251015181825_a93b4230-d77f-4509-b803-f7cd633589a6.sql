-- Allow users to insert edit history for their own posts
CREATE POLICY "Users can insert edit history for own posts"
ON public.post_edit_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.posts
    WHERE posts.id = post_edit_history.post_id
    AND posts.author_id = auth.uid()
  )
);

-- Allow users to insert edit history for their own DMs
CREATE POLICY "Users can insert edit history for own DMs"
ON public.dm_edit_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.dms
    WHERE dms.id = dm_edit_history.dm_id
    AND dms.sender_id = auth.uid()
  )
);