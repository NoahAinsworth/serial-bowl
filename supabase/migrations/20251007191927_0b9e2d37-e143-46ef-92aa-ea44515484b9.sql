-- Fix critical security issues with private lists and chat data

-- Fix 1: custom_lists - respect is_public flag and require authentication
DROP POLICY IF EXISTS "Lists are viewable by everyone" ON public.custom_lists;

CREATE POLICY "Public lists viewable by authenticated users"
ON public.custom_lists
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND (is_public = true OR auth.uid() = user_id)
);

-- Fix 2: list_items - only show items from public lists or user's own lists
DROP POLICY IF EXISTS "List items are viewable by everyone" ON public.list_items;

CREATE POLICY "List items viewable based on list privacy"
ON public.list_items
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM custom_lists
    WHERE custom_lists.id = list_items.list_id
    AND (custom_lists.is_public = true OR custom_lists.user_id = auth.uid())
  )
);

-- Fix 3: Add WITH CHECK clauses to chat table INSERT policies
DROP POLICY IF EXISTS "Users can create own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can create messages in own sessions" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can create events in own sessions" ON public.chat_events;

CREATE POLICY "Users can create own chat sessions"
ON public.chat_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can create messages in own sessions"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM chat_sessions
    WHERE chat_sessions.id = chat_messages.session_id
    AND chat_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create events in own sessions"
ON public.chat_events
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM chat_sessions
    WHERE chat_sessions.id = chat_events.session_id
    AND chat_sessions.user_id = auth.uid()
  )
);