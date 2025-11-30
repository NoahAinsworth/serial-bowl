-- Fix watch_parties.show_id column type and add FK
ALTER TABLE watch_parties 
  ALTER COLUMN show_id TYPE uuid USING show_id::uuid;
  
ALTER TABLE watch_parties
  ADD CONSTRAINT watch_parties_show_id_fkey 
  FOREIGN KEY (show_id) REFERENCES content(id);

-- Fix RLS Policy Recursion on watch_party_members
DROP POLICY IF EXISTS "Users can view members of their parties" ON watch_party_members;

CREATE POLICY "Users can view members of their parties" ON watch_party_members
  FOR SELECT USING (
    user_id = auth.uid() OR 
    party_id IN (SELECT id FROM watch_parties WHERE host_id = auth.uid())
  );

-- Add Missing Foreign Keys to Collections (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'collection_items_collection_id_fkey'
    ) THEN
        ALTER TABLE collection_items
        ADD CONSTRAINT collection_items_collection_id_fkey 
        FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'collection_items_content_id_fkey'
    ) THEN
        ALTER TABLE collection_items
        ADD CONSTRAINT collection_items_content_id_fkey 
        FOREIGN KEY (content_id) REFERENCES content(id);
    END IF;
END $$;