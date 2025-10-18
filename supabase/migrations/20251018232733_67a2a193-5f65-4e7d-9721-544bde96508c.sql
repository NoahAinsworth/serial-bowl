-- Fix existing content entries to use 'thetvdb' instead of 'tvdb'
UPDATE content 
SET external_src = 'thetvdb' 
WHERE external_src = 'tvdb';