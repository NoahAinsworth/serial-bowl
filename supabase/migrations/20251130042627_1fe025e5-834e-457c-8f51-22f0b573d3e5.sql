-- Backfill bowl scores for all existing ratings
DO $$
DECLARE
  show_record RECORD;
  user_record RECORD;
BEGIN
  -- Calculate global bowl scores for all shows with ratings
  FOR show_record IN 
    SELECT DISTINCT SPLIT_PART(item_id, ':', 1) as show_id
    FROM user_ratings
    WHERE item_type IN ('show', 'season', 'episode')
  LOOP
    PERFORM calculate_global_bowl_score(show_record.show_id);
  END LOOP;

  -- Calculate personal bowl scores for all user+show combinations
  FOR user_record IN
    SELECT DISTINCT user_id, SPLIT_PART(item_id, ':', 1) as show_id
    FROM user_ratings
    WHERE item_type IN ('show', 'season', 'episode')
  LOOP
    PERFORM calculate_personal_bowl_score(user_record.user_id, user_record.show_id);
  END LOOP;
END $$;