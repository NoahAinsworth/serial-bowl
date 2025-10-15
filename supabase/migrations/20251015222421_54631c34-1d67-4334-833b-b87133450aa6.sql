-- Create message_requests table for pending DM requests
CREATE TABLE public.message_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  UNIQUE(sender_id, recipient_id)
);

-- Enable RLS
ALTER TABLE public.message_requests ENABLE ROW LEVEL SECURITY;

-- Users can send message requests
CREATE POLICY "Users can send message requests"
ON public.message_requests
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Users can view requests they sent
CREATE POLICY "Users can view sent requests"
ON public.message_requests
FOR SELECT
USING (auth.uid() = sender_id);

-- Users can view requests sent to them
CREATE POLICY "Users can view received requests"
ON public.message_requests
FOR SELECT
USING (auth.uid() = recipient_id);

-- Users can update requests sent to them (accept/reject)
CREATE POLICY "Users can update received requests"
ON public.message_requests
FOR UPDATE
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- Add index for faster lookups
CREATE INDEX idx_message_requests_recipient ON public.message_requests(recipient_id, status);
CREATE INDEX idx_message_requests_sender ON public.message_requests(sender_id, status);