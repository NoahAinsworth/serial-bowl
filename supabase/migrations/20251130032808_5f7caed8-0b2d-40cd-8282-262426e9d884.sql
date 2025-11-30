-- Add foreign key constraints to link message_requests to profiles table
-- This allows proper joins when querying message requests

ALTER TABLE message_requests 
ADD CONSTRAINT message_requests_sender_profile_fkey 
FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE message_requests 
ADD CONSTRAINT message_requests_recipient_profile_fkey 
FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE CASCADE;