-- Fix all function search paths for security hardening
-- This prevents schema injection attacks by ensuring functions only look in the public schema

-- 1. has_role (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

-- 2. exp_decay (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.exp_decay(created timestamp with time zone, half_life_hours double precision)
RETURNS double precision
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  SELECT exp(-ln(2) * extract(epoch from (now() - created)) / (3600 * half_life_hours));
$function$;

-- 3. is_conversation_participant (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
  )
$function$;

-- 4. sync_review_rating (SECURITY DEFINER)
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

-- 5. attention_score (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.attention_score(likes integer, dislikes integer, replies integer, reshares integer, impressions integer, created timestamp with time zone, half_life_hours double precision DEFAULT 12)
RETURNS double precision
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  SELECT (
    (1.0 * COALESCE(likes, 0))
    + (2.0 * COALESCE(replies, 0))
    + (3.0 * COALESCE(reshares, 0))
    + (0.002 * COALESCE(impressions, 0))
    + (-0.6 * COALESCE(dislikes, 0))
  ) * public.exp_decay(created, half_life_hours);
$function$;

-- 6. wilson_lower_bound (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.wilson_lower_bound(likes integer, dislikes integer)
RETURNS double precision
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  WITH s AS (
    SELECT 
      GREATEST(COALESCE(likes, 0) + COALESCE(dislikes, 0), 0) as n, 
      COALESCE(likes, 0)::float as k
  )
  SELECT CASE
    WHEN n = 0 THEN 0
    ELSE
      ((k/n) + (1.96^2)/(2*n) - 1.96*sqrt(((k/n)*(1 - (k/n)) + (1.96^2)/(4*n))/n))
      / (1 + (1.96^2)/n)
  END
  FROM s;
$function$;

-- 7. touch_updated_at (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
begin
  new.updated_at = now();
  return new;
end $function$;

-- 8. sync_post_reaction_counts (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.sync_post_reaction_counts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
begin
  if (tg_op = 'INSERT') then
    if new.kind = 'like' then
      update posts set likes_count = likes_count + 1 where id = new.post_id;
    else
      update posts set dislikes_count = dislikes_count + 1 where id = new.post_id;
    end if;
  elsif (tg_op = 'DELETE') then
    if old.kind = 'like' then
      update posts set likes_count = greatest(likes_count - 1,0) where id = old.post_id;
    else
      update posts set dislikes_count = greatest(dislikes_count - 1,0) where id = old.post_id;
    end if;
  end if;
  return null;
end $function$;

-- 9. api_create_post (SECURITY DEFINER)
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

-- 10. touch_updated_at_generic (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.touch_updated_at_generic()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
begin
  new.updated_at = now();
  return new;
end $function$;

-- 11. detect_mature_content (SECURITY INVOKER)
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

-- 12. compute_season_rollup (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.compute_season_rollup(p_user uuid, p_season_id text)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  with eps as (
    select score from user_ratings
    where user_id = p_user and item_type = 'episode' and item_id like (p_season_id || ':%')
  )
  select case when count(*)=0 then null else round(avg(score))::int end from eps;
$function$;

-- 13. compute_show_rollup (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.compute_show_rollup(p_user uuid, p_show_id text)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  with seas as (
    select score from user_ratings
    where user_id = p_user and item_type = 'season' and item_id like (p_show_id || ':%')
  ),
  eps as (
    select score from user_ratings
    where user_id = p_user and item_type = 'episode' and item_id like (p_show_id || ':%')
  ),
  unioned as (
    select score from seas
    union all
    select score from eps
  )
  select case when count(*)=0 then null else round(avg(score))::int end from unioned;
$function$;

-- 14. upsert_rollups (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.upsert_rollups(p_user uuid, p_item_type text, p_item_id text)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $function$
declare
  v_show_id text;
  v_season_id text;
  v_roll int;
  v_has_manual boolean;
begin
  if p_item_type = 'episode' then
    v_season_id := split_part(p_item_id, ':', 1) || ':' || split_part(p_item_id, ':', 2);
    v_show_id   := split_part(p_item_id, ':', 1);

    -- season rollup
    select exists(select 1 from user_ratings where user_id=p_user and item_type='season' and item_id=v_season_id and source='manual')
      into v_has_manual;
    if not v_has_manual then
      v_roll := compute_season_rollup(p_user, v_season_id);
      if v_roll is not null then
        insert into user_ratings(user_id,item_type,item_id,score,source)
        values (p_user,'season',v_season_id,v_roll,'rollup')
        on conflict (user_id,item_type,item_id) do update
          set score=excluded.score, source='rollup', updated_at=now();
      end if;
    end if;

    -- show rollup
    select exists(select 1 from user_ratings where user_id=p_user and item_type='show' and item_id=v_show_id and source='manual')
      into v_has_manual;
    if not v_has_manual then
      v_roll := compute_show_rollup(p_user, v_show_id);
      if v_roll is not null then
        insert into user_ratings(user_id,item_type,item_id,score,source)
        values (p_user,'show',v_show_id,v_roll,'rollup')
        on conflict (user_id,item_type,item_id) do update
          set score=excluded.score, source='rollup', updated_at=now();
      end if;
    end if;

  elsif p_item_type = 'season' then
    v_show_id := split_part(p_item_id, ':', 1);
    select exists(select 1 from user_ratings where user_id=p_user and item_type='show' and item_id=v_show_id and source='manual')
      into v_has_manual;
    if not v_has_manual then
      v_roll := compute_show_rollup(p_user, v_show_id);
      if v_roll is not null then
        insert into user_ratings(user_id,item_type,item_id,score,source)
        values (p_user,'show',v_show_id,v_roll,'rollup')
        on conflict (user_id,item_type,item_id) do update
          set score=excluded.score, source='rollup', updated_at=now();
      end if;
    end if;
  end if;
end $function$;

-- 15. api_rate_and_review (SECURITY DEFINER)
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

-- 16. auto_detect_mature_content (SECURITY DEFINER)
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

-- 17. feed_recent_popular (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.feed_recent_popular(limit_count integer DEFAULT 20)
RETURNS TABLE(post_id uuid, score numeric)
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  SELECT
    p.id as post_id,
    (p.likes_count - p.dislikes_count)*1.0 + p.replies_count*0.5 as score
  FROM posts p
  WHERE p.deleted_at IS NULL
    AND p.created_at >= now() - interval '72 hours'
  ORDER BY score DESC, p.id
  LIMIT limit_count;
$function$;

-- 18. auto_detect_mature_content_comment (SECURITY DEFINER)
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

-- 19. trg_sync_review_rating (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.trg_sync_review_rating()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
begin
  if (new.kind='review' and new.deleted_at is null and new.rating_percent is not null
      and new.item_type is not null and new.item_id is not null) then
    insert into user_ratings(user_id,item_type,item_id,score,updated_at)
    values (new.author_id,new.item_type,new.item_id,new.rating_percent,now())
    on conflict (user_id,item_type,item_id)
    do update set score = excluded.score, updated_at = now();
  end if;
  return new;
end $function$;

-- 20. trg_sync_review_into_ratings_and_post (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.trg_sync_review_into_ratings_and_post()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
declare
  v_score int;
  v_post_id uuid;
begin
  v_score := new.rating_percent;

  if v_score is not null then
    -- upsert rating row
    insert into user_ratings(user_id,item_type,item_id,score,source)
    values (new.user_id, new.item_type, new.item_id, v_score, 'manual')
    on conflict (user_id,item_type,item_id) do update
      set score=excluded.score, source='manual', updated_at=now();

    -- update the most recent review post for this item by this user
    select id into v_post_id
    from posts
    where author_id = new.user_id
      and kind = 'review'
      and item_type = new.item_type
      and item_id = new.item_id
    order by created_at desc
    limit 1;

    if v_post_id is not null then
      update posts set rating_percent = v_score where id = v_post_id;
    end if;
  end if;

  return new;
end
$function$;

-- 21. feed_trending_rt (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.feed_trending_rt(limit_count integer DEFAULT 20, cursor_score numeric DEFAULT NULL::numeric)
RETURNS TABLE(post_id uuid, score numeric)
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  WITH base AS (
    SELECT p.id AS post_id,
           EXTRACT(epoch FROM (now()-p.created_at))/3600.0 AS ageH,
           p.likes_count AS likes,
           p.dislikes_count AS dislikes,
           p.replies_count AS comments
    FROM posts p
    WHERE p.deleted_at IS NULL
  )
  SELECT post_id,
         ((likes - dislikes)*1.7 + comments*1.2 + 3) / power(ageH+1, 1.25) AS score
  FROM base
  WHERE (cursor_score IS NULL OR ((likes - dislikes)*1.7 + comments*1.2 + 3) / power(ageH+1, 1.25) < cursor_score)
  ORDER BY score DESC
  LIMIT limit_count;
$function$;

-- 22. feed_hot_takes (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.feed_hot_takes(limit_count integer DEFAULT 20, cursor_score numeric DEFAULT NULL::numeric)
RETURNS TABLE(post_id uuid, controversy numeric)
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  WITH base AS (
    SELECT p.id AS post_id,
           EXTRACT(epoch FROM (now()-p.created_at))/3600.0 AS ageH,
           p.likes_count::numeric AS likes,
           p.dislikes_count::numeric AS dislikes
    FROM posts p
    WHERE p.deleted_at IS NULL
  ), scored AS (
    SELECT post_id,
           ((likes+dislikes) / GREATEST(1, ABS(likes - dislikes))) / power(ageH+1, 1.1) AS controversy
    FROM base
    WHERE (likes+dislikes) >= 5
  )
  SELECT post_id, controversy
  FROM scored
  WHERE (cursor_score IS NULL OR controversy < cursor_score)
  ORDER BY controversy DESC
  LIMIT limit_count;
$function$;

-- 23. feed_new (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.feed_new(limit_count integer DEFAULT 20, cursor_ts timestamp with time zone DEFAULT NULL::timestamp with time zone)
RETURNS TABLE(post_id uuid, created_at timestamp with time zone)
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  SELECT id AS post_id, created_at
  FROM posts
  WHERE deleted_at IS NULL
    AND (cursor_ts IS NULL OR created_at < cursor_ts)
  ORDER BY created_at DESC
  LIMIT limit_count;
$function$;

-- 24. feed_following (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.feed_following(uid uuid, limit_count integer DEFAULT 20, cursor_ts timestamp with time zone DEFAULT NULL::timestamp with time zone)
RETURNS TABLE(post_id uuid, created_at timestamp with time zone)
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  SELECT p.id AS post_id, p.created_at
  FROM posts p
  WHERE p.deleted_at IS NULL
    AND p.author_id IN (
      SELECT following_id FROM follows 
      WHERE follower_id = uid AND status = 'accepted'
    )
    AND (cursor_ts IS NULL OR p.created_at < cursor_ts)
  ORDER BY p.created_at DESC
  LIMIT limit_count;
$function$;

-- 25. update_updated_at (SECURITY DEFINER)
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

-- 26. handle_new_user (SECURITY DEFINER)
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