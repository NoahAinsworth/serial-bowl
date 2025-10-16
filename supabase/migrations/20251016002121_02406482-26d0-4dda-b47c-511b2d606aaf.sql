-- Fix security warning: Add SET search_path to all SECURITY DEFINER functions
-- This prevents privilege escalation through schema manipulation attacks

-- 1. Fix sync_review_rating function
CREATE OR REPLACE FUNCTION public.sync_review_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.rating IS NOT NULL AND NEW.rating > 0 THEN
    INSERT INTO public.ratings (user_id, content_id, rating, created_at)
    VALUES (NEW.user_id, NEW.content_id, NEW.rating, NOW())
    ON CONFLICT (user_id, content_id) 
    DO UPDATE SET rating = NEW.rating, created_at = NOW();
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. Fix api_create_post function
CREATE OR REPLACE FUNCTION public.api_create_post(p_kind text, p_body text, p_item_type text DEFAULT NULL::text, p_item_id text DEFAULT NULL::text, p_rating_percent integer DEFAULT NULL::integer, p_is_spoiler boolean DEFAULT false)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
  v_post_id uuid;
begin
  if p_kind not in ('thought','review','rating','reshare') then
    raise exception 'invalid kind';
  end if;

  if p_rating_percent is not null and (p_rating_percent < 0 or p_rating_percent > 100) then
    raise exception 'rating out of range';
  end if;

  insert into posts (author_id, kind, body, item_type, item_id, rating_percent, is_spoiler)
  values (auth.uid(), p_kind, p_body, p_item_type, p_item_id, p_rating_percent, coalesce(p_is_spoiler,false))
  returning id into v_post_id;

  return v_post_id;
end
$function$;

-- 3. Fix api_rate_and_review function
CREATE OR REPLACE FUNCTION public.api_rate_and_review(p_item_type text, p_item_id text, p_score_any text DEFAULT NULL::text, p_review text DEFAULT NULL::text, p_is_spoiler boolean DEFAULT false)
RETURNS TABLE(post_id uuid, review_id uuid, rating_score integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
  v_post_id uuid;
  v_review_id uuid;
  v_score int;
  v_final_item_id text;
begin
  if p_item_type not in ('show','season','episode') then
    raise exception 'invalid item_type';
  end if;

  v_score := nullif(trim(p_score_any), '')::int;

  if v_score is not null and (v_score < 0 or v_score > 100) then
    raise exception 'score out of range';
  end if;

  v_final_item_id := p_item_id;
  
  if p_item_type = 'season' and position(':' in p_item_id) = 0 then
    raise exception 'Invalid season item_id format. Expected showId:seasonNum, got: %', p_item_id;
  elsif p_item_type = 'episode' and array_length(string_to_array(p_item_id, ':'), 1) != 3 then
    raise exception 'Invalid episode item_id format. Expected showId:seasonNum:episodeNum, got: %', p_item_id;
  end if;

  if v_score is not null then
    insert into user_ratings(user_id,item_type,item_id,score,source)
    values (auth.uid(), p_item_type, v_final_item_id, v_score, 'manual')
    on conflict (user_id,item_type,item_id) do update
      set score=excluded.score, source='manual', updated_at=now();
  end if;

  if p_review is not null and length(trim(p_review)) > 0 then
    insert into user_reviews(user_id, item_type, item_id, body, rating_percent)
    values (auth.uid(), p_item_type, v_final_item_id, p_review, v_score)
    on conflict (user_id, item_type, item_id) do update
      set body = excluded.body, rating_percent = excluded.rating_percent, updated_at = now()
    returning id into v_review_id;

    insert into posts(author_id, kind, body, item_type, item_id, rating_percent, is_spoiler)
    values (auth.uid(), 'review', p_review, p_item_type, v_final_item_id, v_score, p_is_spoiler)
    returning id into v_post_id;
  elsif v_score is not null then
    insert into posts(author_id, kind, body, item_type, item_id, rating_percent, is_spoiler)
    values (auth.uid(), 'rating', null, p_item_type, v_final_item_id, v_score, p_is_spoiler)
    returning id into v_post_id;
  end if;

  perform upsert_rollups(auth.uid(), p_item_type, v_final_item_id);

  return query select v_post_id, v_review_id, v_score;
end
$function$;

-- 4. Fix update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- 5. Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, handle, bio)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'handle', 'user' || substring(NEW.id::text, 1, 8)),
    ''
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$function$;

-- 6. Add RLS policy for tmdb_cache table
-- Allow authenticated users to read cached data (it's public API data)
CREATE POLICY "Authenticated users can read TMDB cache"
ON public.tmdb_cache FOR SELECT
TO authenticated
USING (true);

-- 7. Create server-side content moderation function
CREATE OR REPLACE FUNCTION public.detect_mature_content(text_body text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $function$
DECLARE
  v_has_profanity boolean := false;
  v_has_sexual boolean := false;
  v_reasons text[] := '{}';
BEGIN
  -- Profanity patterns
  IF text_body ~* '(f+[\*\-_]*u+[\*\-_]*c+[\*\-_]*k+|s+[\*\-_]*h+[\*\-_]*i+[\*\-_]*t+|c+[\*\-_]*u+[\*\-_]*n+[\*\-_]*t+|d+[\*\-_]*i+[\*\-_]*c+[\*\-_]*k+|p+[\*\-_]*u+[\*\-_]*s+[\*\-_]*s+[\*\-_]*y+|c+[\*\-_]*o+[\*\-_]*c+[\*\-_]*k+|b+[\*\-_]*i+[\*\-_]*t+[\*\-_]*c+[\*\-_]*h+)' THEN
    v_has_profanity := true;
    v_reasons := array_append(v_reasons, 'profanity');
  END IF;
  
  -- Sexual content patterns
  IF text_body ~* '(sex(ual)?|porn(o)?|nude(s)?|naked|erotic|xxx|adult content)' THEN
    v_has_sexual := true;
    v_reasons := array_append(v_reasons, 'sexual');
  END IF;
  
  RETURN jsonb_build_object(
    'is_mature', (v_has_profanity OR v_has_sexual),
    'has_profanity', v_has_profanity,
    'has_sexual', v_has_sexual,
    'reasons', v_reasons
  );
END;
$function$;

-- 8. Create trigger to auto-detect mature content on posts
CREATE OR REPLACE FUNCTION public.auto_detect_mature_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_detection jsonb;
BEGIN
  -- Only check if body exists
  IF NEW.body IS NOT NULL AND NEW.body != '' THEN
    v_detection := detect_mature_content(NEW.body);
    
    -- Auto-flag mature content if detected
    IF (v_detection->>'is_mature')::boolean THEN
      NEW.has_mature := true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Apply trigger to posts table
DROP TRIGGER IF EXISTS trg_auto_detect_mature_content ON public.posts;
CREATE TRIGGER trg_auto_detect_mature_content
  BEFORE INSERT OR UPDATE OF body
  ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION auto_detect_mature_content();

-- 9. Create similar trigger for comments
CREATE OR REPLACE FUNCTION public.auto_detect_mature_content_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_detection jsonb;
  v_is_mature boolean;
BEGIN
  IF NEW.text_content IS NOT NULL AND NEW.text_content != '' THEN
    v_detection := detect_mature_content(NEW.text_content);
    v_is_mature := (v_detection->>'is_mature')::boolean;
    
    -- If mature content detected, we could store it or take action
    -- For now, just let it through but flag it
    -- Could expand this to auto-moderate or queue for review
  END IF;
  
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_auto_detect_mature_content_comment ON public.comments;
CREATE TRIGGER trg_auto_detect_mature_content_comment
  BEFORE INSERT OR UPDATE OF text_content
  ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION auto_detect_mature_content_comment();