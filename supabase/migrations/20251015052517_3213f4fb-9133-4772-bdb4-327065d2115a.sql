-- Fix the api_rate_and_review function to ensure item_id is always stored correctly
-- This handles cases where old cached JavaScript might pass incorrect formats

CREATE OR REPLACE FUNCTION public.api_rate_and_review(
  p_item_type text, 
  p_item_id text,
  p_score_any text DEFAULT NULL::text, 
  p_review text DEFAULT NULL::text, 
  p_is_spoiler boolean DEFAULT false
)
RETURNS TABLE(post_id uuid, review_id uuid, rating_score integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_post_id uuid;
  v_review_id uuid;
  v_score int;
  v_final_item_id text;
begin
  if p_item_type not in ('show','season','episode') then
    raise exception 'invalid item_type';
  end if;

  -- Robust cast: null, '', or whitespace => null
  v_score := nullif(trim(p_score_any), '')::int;

  if v_score is not null and (v_score < 0 or v_score > 100) then
    raise exception 'score out of range';
  end if;

  -- IMPORTANT: Ensure item_id is in correct format
  -- If it doesn't contain a colon and it's not a show, it's malformed
  v_final_item_id := p_item_id;
  
  -- Validate format based on type
  if p_item_type = 'season' and position(':' in p_item_id) = 0 then
    raise exception 'Invalid season item_id format. Expected showId:seasonNum, got: %', p_item_id;
  elsif p_item_type = 'episode' and array_length(string_to_array(p_item_id, ':'), 1) != 3 then
    raise exception 'Invalid episode item_id format. Expected showId:seasonNum:episodeNum, got: %', p_item_id;
  end if;

  -- 1) Upsert rating if provided
  if v_score is not null then
    insert into user_ratings(user_id,item_type,item_id,score,source)
    values (auth.uid(), p_item_type, v_final_item_id, v_score, 'manual')
    on conflict (user_id,item_type,item_id) do update
      set score=excluded.score, source='manual', updated_at=now();
  end if;

  -- 2) Save review if text exists
  if p_review is not null and length(trim(p_review)) > 0 then
    insert into user_reviews(user_id, item_type, item_id, body, rating_percent)
    values (auth.uid(), p_item_type, v_final_item_id, p_review, v_score)
    on conflict (user_id, item_type, item_id) do update
      set body = excluded.body, rating_percent = excluded.rating_percent, updated_at = now()
    returning id into v_review_id;

    -- Create a review post
    insert into posts(author_id, kind, body, item_type, item_id, rating_percent, is_spoiler)
    values (auth.uid(), 'review', p_review, p_item_type, v_final_item_id, v_score, p_is_spoiler)
    returning id into v_post_id;
  elsif v_score is not null then
    -- rating-only activity post
    insert into posts(author_id, kind, body, item_type, item_id, rating_percent, is_spoiler)
    values (auth.uid(), 'rating', null, p_item_type, v_final_item_id, v_score, p_is_spoiler)
    returning id into v_post_id;
  end if;

  -- 3) Rollups (episode -> season -> show)
  perform upsert_rollups(auth.uid(), p_item_type, v_final_item_id);

  return query select v_post_id, v_review_id, v_score;
end
$$;