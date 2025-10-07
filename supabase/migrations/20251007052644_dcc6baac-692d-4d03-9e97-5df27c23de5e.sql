-- Update existing content entries to add metadata with overview
-- This is a one-time fix for existing shows that have null metadata

-- For now, we'll just add empty overview to existing null metadata entries
-- Users will need to visit the show pages to get the full overview from TVDB

UPDATE content 
SET metadata = jsonb_build_object('overview', '')
WHERE metadata IS NULL 
AND kind = 'show';