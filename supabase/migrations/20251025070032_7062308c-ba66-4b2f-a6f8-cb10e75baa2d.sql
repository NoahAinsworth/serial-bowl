-- First, check if we have duplicate content entries
-- Delete the newer duplicates, keeping the oldest one
WITH duplicates AS (
  SELECT 
    external_src, 
    external_id, 
    kind,
    MIN(created_at) as first_created
  FROM content
  GROUP BY external_src, external_id, kind
  HAVING COUNT(*) > 1
)
DELETE FROM content c
USING duplicates d
WHERE c.external_src = d.external_src
  AND c.external_id = d.external_id
  AND c.kind = d.kind
  AND c.created_at > d.first_created;

-- Now ensure the unique constraint exists (will fail silently if it already exists)
ALTER TABLE content
DROP CONSTRAINT IF EXISTS content_unique_external;

ALTER TABLE content
ADD CONSTRAINT content_unique_external UNIQUE (external_src, external_id, kind);