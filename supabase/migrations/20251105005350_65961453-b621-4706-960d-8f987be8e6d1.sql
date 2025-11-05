-- Phase 1: Delete duplicates where both 'tvdb' and 'thetvdb' exist for the same content
-- Keep the 'thetvdb' version, delete the 'tvdb' version
DELETE FROM content
WHERE external_src = 'tvdb'
AND EXISTS (
  SELECT 1 FROM content c2
  WHERE c2.external_src = 'thetvdb'
  AND c2.external_id = content.external_id
  AND c2.kind = content.kind
);

-- Phase 2: Update remaining 'tvdb' entries to 'thetvdb'
UPDATE content 
SET external_src = 'thetvdb' 
WHERE external_src = 'tvdb';

-- Phase 3: For seasons, delete old format entries where new format already exists
-- E.g., delete '305288-S1' if '305288:1' already exists
DELETE FROM content
WHERE kind = 'season' 
AND external_id ~ '^\d+-S\d+$'
AND EXISTS (
  SELECT 1 FROM content c2
  WHERE c2.external_src = content.external_src
  AND c2.kind = 'season'
  AND c2.external_id = REGEXP_REPLACE(content.external_id, '^(\d+)-S(\d+)$', '\1:\2')
);

-- Phase 4: Convert remaining old format season IDs to new format
UPDATE content
SET external_id = REGEXP_REPLACE(external_id, '^(\d+)-S(\d+)$', '\1:\2')
WHERE kind = 'season' AND external_id ~ '^\d+-S\d+$';

-- Phase 5: Delete any remaining duplicates (keep oldest)
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY external_src, external_id, kind 
    ORDER BY created_at ASC
  ) as rn
  FROM content
)
DELETE FROM content
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);