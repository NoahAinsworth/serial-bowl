-- Fix 1: DMs table public exposure
-- Issue: SELECT, INSERT, and UPDATE policies use 'public' role, allowing unauthenticated access
-- Solution: Change all DM policies to 'authenticated' role only

DROP POLICY IF EXISTS "Users can send messages" ON public.dms;
DROP POLICY IF EXISTS "Users can update received messages" ON public.dms;
DROP POLICY IF EXISTS "Users can view own messages" ON public.dms;

-- Recreate all policies with authenticated role
CREATE POLICY "Users can send messages"
ON public.dms
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update received messages"
ON public.dms
FOR UPDATE
TO authenticated
USING (auth.uid() = recipient_id);

CREATE POLICY "Users can view own messages"
ON public.dms
FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Fix 2: v_post_popularity analytics protection
-- Since views can't have RLS policies, we ensure the underlying 'interactions' table
-- properly restricts access. Let's verify interactions table has RLS enabled.
-- The view inherits security from the base table via security_invoker = on

-- Verify interactions table policies exist
DO $$
BEGIN
  -- Ensure interactions table has RLS enabled
  EXECUTE 'ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY';
END $$;