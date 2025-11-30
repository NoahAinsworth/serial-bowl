-- Fix security warnings: Set search_path for bowl score functions

CREATE OR REPLACE FUNCTION calculate_bowl_confidence(
  rating_count INTEGER,
  layer_type TEXT
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF layer_type = 'episode' THEN
    IF rating_count = 0 THEN RETURN 0;
    ELSIF rating_count BETWEEN 1 AND 4 THEN RETURN 0.3;
    ELSIF rating_count BETWEEN 5 AND 19 THEN RETURN 0.6;
    ELSE RETURN 1.0;
    END IF;
  ELSIF layer_type = 'season' THEN
    IF rating_count = 0 THEN RETURN 0;
    ELSIF rating_count BETWEEN 1 AND 4 THEN RETURN 0.5;
    ELSE RETURN 1.0;
    END IF;
  ELSIF layer_type = 'show' THEN
    IF rating_count = 0 THEN RETURN 0;
    ELSIF rating_count BETWEEN 1 AND 2 THEN RETURN 0.5;
    ELSIF rating_count BETWEEN 3 AND 9 THEN RETURN 0.8;
    ELSE RETURN 1.0;
    END IF;
  END IF;
  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_update_bowl_scores()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_show_id TEXT;
  v_user_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_show_id := SPLIT_PART(OLD.item_id, ':', 1);
    v_user_id := OLD.user_id;
  ELSE
    v_show_id := SPLIT_PART(NEW.item_id, ':', 1);
    v_user_id := NEW.user_id;
  END IF;

  PERFORM calculate_global_bowl_score(v_show_id);
  PERFORM calculate_personal_bowl_score(v_user_id, v_show_id);

  RETURN NULL;
END;
$$;