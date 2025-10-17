-- Clean up season 0 (specials) entries
DELETE FROM season_episode_counts WHERE external_id LIKE '%:0';