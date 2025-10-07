-- Fix chat data security - add RLS policies for authenticated users only

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can create chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Chat sessions are viewable by everyone" ON public.chat_sessions;
DROP POLICY IF EXISTS "Anyone can create chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Chat messages are viewable by everyone" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone can create chat events" ON public.chat_events;
DROP POLICY IF EXISTS "Chat events are viewable by everyone" ON public.chat_events;

-- Add user_id column to chat_sessions to track ownership
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Update existing sessions to be owned by system (will be null for anonymous)
-- New sessions will require user_id

-- Create secure policies for chat_sessions
CREATE POLICY "Users can create own chat sessions"
ON public.chat_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own chat sessions"
ON public.chat_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create secure policies for chat_messages (linked via session)
CREATE POLICY "Users can create messages in own sessions"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_sessions
    WHERE chat_sessions.id = chat_messages.session_id
    AND chat_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view own session messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_sessions
    WHERE chat_sessions.id = chat_messages.session_id
    AND chat_sessions.user_id = auth.uid()
  )
);

-- Create secure policies for chat_events (linked via session)
CREATE POLICY "Users can create events in own sessions"
ON public.chat_events
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_sessions
    WHERE chat_sessions.id = chat_events.session_id
    AND chat_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view own session events"
ON public.chat_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_sessions
    WHERE chat_sessions.id = chat_events.session_id
    AND chat_sessions.user_id = auth.uid()
  )
);

-- Fix security definer views by recreating them without SECURITY DEFINER
DROP VIEW IF EXISTS public.v_posts CASCADE;
DROP VIEW IF EXISTS public.v_post_popularity CASCADE;

-- Recreate v_posts view without SECURITY DEFINER
CREATE VIEW public.v_posts AS
SELECT 
  thoughts.id,
  'thought'::text AS type,
  thoughts.text_content AS text,
  NULL::numeric AS rating,
  thoughts.user_id AS author_id,
  thoughts.content_id AS show_id,
  thoughts.created_at,
  thoughts.moderation_status
FROM thoughts
UNION ALL
SELECT 
  reviews.id,
  'review'::text AS type,
  reviews.review_text AS text,
  NULL::numeric AS rating,
  reviews.user_id AS author_id,
  reviews.content_id AS show_id,
  reviews.created_at,
  'approved'::moderation_status AS moderation_status
FROM reviews;

-- Recreate v_post_popularity view without SECURITY DEFINER
CREATE VIEW public.v_post_popularity AS
SELECT 
  interactions.post_id,
  interactions.post_type,
  interactions.created_at,
  COUNT(*) FILTER (WHERE interactions.interaction_type = 'like') AS likes,
  COUNT(*) FILTER (WHERE interactions.interaction_type = 'dislike') AS dislikes,
  COUNT(*) FILTER (WHERE interactions.interaction_type = 'comment') AS comments,
  COUNT(*) FILTER (WHERE interactions.interaction_type = 'view') AS views,
  COUNT(*) FILTER (WHERE interactions.interaction_type = 'reshare') AS reshares
FROM interactions
GROUP BY interactions.post_id, interactions.post_type, interactions.created_at;