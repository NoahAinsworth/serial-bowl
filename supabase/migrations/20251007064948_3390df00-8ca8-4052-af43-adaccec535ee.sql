-- Create bot_feedback table for learning system
CREATE TABLE IF NOT EXISTS public.bot_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id UUID NOT NULL,
  question TEXT NOT NULL,
  response TEXT NOT NULL,
  rating INTEGER CHECK (rating IN (1, -1)), -- 1 for thumbs up, -1 for thumbs down
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bot_feedback ENABLE ROW LEVEL SECURITY;

-- Allow users to submit feedback
CREATE POLICY "Users can submit feedback"
  ON public.bot_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own feedback
CREATE POLICY "Users can view own feedback"
  ON public.bot_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_bot_feedback_user_session ON public.bot_feedback(user_id, session_id);
CREATE INDEX idx_bot_feedback_rating ON public.bot_feedback(rating) WHERE rating = 1;