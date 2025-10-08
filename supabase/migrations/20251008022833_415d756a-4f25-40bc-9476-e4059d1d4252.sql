-- Add dislikes tables for thoughts and reviews
CREATE TABLE IF NOT EXISTS public.thought_dislikes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thought_id UUID NOT NULL REFERENCES public.thoughts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(thought_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.review_dislikes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(review_id, user_id)
);

-- Enable RLS
ALTER TABLE public.thought_dislikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_dislikes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for thought_dislikes
CREATE POLICY "Anyone can view dislikes"
  ON public.thought_dislikes FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own dislikes"
  ON public.thought_dislikes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dislikes"
  ON public.thought_dislikes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for review_dislikes
CREATE POLICY "Anyone can view review dislikes"
  ON public.review_dislikes FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own review dislikes"
  ON public.review_dislikes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own review dislikes"
  ON public.review_dislikes FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_thought_dislikes_thought_id ON public.thought_dislikes(thought_id);
CREATE INDEX idx_thought_dislikes_user_id ON public.thought_dislikes(user_id);
CREATE INDEX idx_review_dislikes_review_id ON public.review_dislikes(review_id);
CREATE INDEX idx_review_dislikes_user_id ON public.review_dislikes(user_id);