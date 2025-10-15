-- Create DM reactions table
CREATE TABLE IF NOT EXISTS public.dm_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dm_id UUID NOT NULL REFERENCES public.dms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dm_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.dm_reactions ENABLE ROW LEVEL SECURITY;

-- Users can view reactions on DMs they're part of
CREATE POLICY "Users can view reactions on their DMs"
  ON public.dm_reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dms
      WHERE dms.id = dm_reactions.dm_id
        AND (dms.sender_id = auth.uid() OR dms.recipient_id = auth.uid())
    )
  );

-- Users can add reactions to DMs they're part of
CREATE POLICY "Users can add reactions to DMs"
  ON public.dm_reactions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.dms
      WHERE dms.id = dm_reactions.dm_id
        AND (dms.sender_id = auth.uid() OR dms.recipient_id = auth.uid())
    )
  );

-- Users can remove their own reactions
CREATE POLICY "Users can remove own reactions"
  ON public.dm_reactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_dm_reactions_dm_id ON public.dm_reactions(dm_id);
CREATE INDEX idx_dm_reactions_user_id ON public.dm_reactions(user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_reactions;