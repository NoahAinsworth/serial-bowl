-- Add parent_id to comments table for threaded replies
ALTER TABLE public.comments
ADD COLUMN parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

CREATE INDEX idx_comments_parent_id ON public.comments(parent_id);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('comment_reply', 'post_reaction', 'follow')),
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read);

-- RLS policies for notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Function to create notification on comment reply
CREATE OR REPLACE FUNCTION public.notify_comment_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_user_id UUID;
BEGIN
  -- Only create notification if this is a reply (has parent_id)
  IF NEW.parent_id IS NOT NULL THEN
    -- Get the user_id of the parent comment
    SELECT user_id INTO v_parent_user_id
    FROM comments
    WHERE id = NEW.parent_id;
    
    -- Don't notify if replying to own comment
    IF v_parent_user_id IS NOT NULL AND v_parent_user_id != NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, comment_id, post_id)
      VALUES (
        v_parent_user_id,
        NEW.user_id,
        'comment_reply',
        NEW.id,
        NEW.post_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to create notification when comment is inserted
CREATE TRIGGER trg_notify_comment_reply
AFTER INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_comment_reply();