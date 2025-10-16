-- Fix 1: Remove overly permissive profiles policy
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;

-- Fix 2: Create security definer function to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.is_conversation_participant(
  _conversation_id uuid,
  _user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
  )
$$;

-- Fix 3: Update conversation_participants policies to use the helper function
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;

CREATE POLICY "Users can view participants in their conversations"
ON public.conversation_participants FOR SELECT
TO authenticated
USING (public.is_conversation_participant(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "participants_read" ON public.conversation_participants;

-- Fix 4: Update conversations policy to use helper function
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
DROP POLICY IF EXISTS "conversations_participant_read" ON public.conversations;

CREATE POLICY "Users can view conversations they participate in"
ON public.conversations FOR SELECT
TO authenticated
USING (public.is_conversation_participant(id, auth.uid()));

-- Fix 5: Update messages policy to use helper function
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "messages_participant_read" ON public.messages;

CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
TO authenticated
USING (public.is_conversation_participant(conversation_id, auth.uid()));