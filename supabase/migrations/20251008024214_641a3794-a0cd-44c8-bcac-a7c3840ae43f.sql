-- Create reshares table
CREATE TABLE public.reshares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL, -- 'thought' or 'review'
  post_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reshares ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can reshare posts"
  ON public.reshares
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reshares"
  ON public.reshares
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view reshares"
  ON public.reshares
  FOR SELECT
  USING (true);

-- Create index for performance
CREATE INDEX idx_reshares_user_id ON public.reshares(user_id);
CREATE INDEX idx_reshares_post ON public.reshares(post_type, post_id);