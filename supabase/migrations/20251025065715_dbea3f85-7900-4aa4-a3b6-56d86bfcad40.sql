-- First, find and keep only the oldest content entry per external_id + kind combination
-- Delete duplicate entries, keeping the first one created
DELETE FROM content a
USING content b
WHERE a.id > b.id
  AND a.external_id = b.external_id
  AND a.external_src = b.external_src
  AND a.kind = b.kind;

-- Add unique constraint to prevent future duplicates
ALTER TABLE content
ADD CONSTRAINT content_unique_external UNIQUE (external_src, external_id, kind);