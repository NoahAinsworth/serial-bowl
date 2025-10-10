-- 1) Bullet-proof api_rate_and_review function
create or replace function api_rate_and_review(
  p_item_type text,
  p_item_id text,
  p_score_any text default null,
  p_review text default null,
  p_is_spoiler boolean default false
) returns table (post_id uuid, review_id uuid, rating_score int)
language plpgsql security definer set search_path=public as $$
declare
  v_post_id uuid;
  v_review_id uuid;
  v_score int;
begin
  if p_item_type not in ('show','season','episode') then
    raise exception 'invalid item_type';
  end if;

  -- robust cast: null, '', or whitespace => null
  v_score := nullif(trim(p_score_any), '')::int;

  if v_score is not null and (v_score < 0 or v_score > 100) then
    raise exception 'score out of range';
  end if;

  -- 1) Upsert rating if provided
  if v_score is not null then
    insert into user_ratings(user_id,item_type,item_id,score,source)
    values (auth.uid(), p_item_type, p_item_id, v_score, 'manual')
    on conflict (user_id,item_type,item_id) do update
      set score=excluded.score, source='manual', updated_at=now();
  end if;

  -- 2) Save review (if text exists) and mirror rating on the post
  if p_review is not null and length(trim(p_review)) > 0 then
    insert into user_reviews(user_id,item_type,item_id,body,rating_percent)
    values (auth.uid(), p_item_type, p_item_id, p_review, v_score)
    returning id into v_review_id;

    v_post_id := api_create_post('review', p_review, p_item_type, p_item_id, v_score, p_is_spoiler);
  elsif v_score is not null then
    -- rating-only activity post
    v_post_id := api_create_post('rating', null, p_item_type, p_item_id, v_score, p_is_spoiler);
  end if;

  -- 3) Rollups (episode -> season -> show; manual overrides)
  perform upsert_rollups(auth.uid(), p_item_type, p_item_id);

  return query select v_post_id, v_review_id, v_score;
end $$;

revoke all on function api_rate_and_review(text,text,text,text,boolean) from public;
grant execute on function api_rate_and_review(text,text,text,text,boolean) to anon, authenticated;

-- 2) Safety net: sync trigger for reviews
create or replace function trg_sync_review_into_ratings_and_post()
returns trigger language plpgsql as $$
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

  -- also refresh rollups
  perform upsert_rollups(new.user_id, new.item_type, new.item_id);
  return new;
end $$;

drop trigger if exists t_reviews_sync on user_reviews;
create trigger t_reviews_sync
after insert or update on user_reviews
for each row execute procedure trg_sync_review_into_ratings_and_post();

-- 3) Ensure profile views are correct
create or replace view profile_ratings_shows as
select item_id, score, source, updated_at
from user_ratings
where user_id = auth.uid() and item_type = 'show'
order by updated_at desc;

create or replace view profile_ratings_seasons as
select item_id, score, source, updated_at
from user_ratings
where user_id = auth.uid() and item_type = 'season'
order by updated_at desc;

create or replace view profile_ratings_episodes as
select item_id, score, source, updated_at
from user_ratings
where user_id = auth.uid() and item_type = 'episode'
order by updated_at desc;

create or replace view profile_reviews as
select r.*
from user_reviews r
where r.user_id = auth.uid()
order by r.created_at desc;

-- 4) One-time backfill for existing data
-- Copy any review.rating_percent to user_ratings + post cards
with r as (
  select *
  from user_reviews
  where rating_percent is not null
    and created_at > now() - interval '2 days'
)
insert into user_ratings(user_id,item_type,item_id,score,source)
select user_id, item_type, item_id, rating_percent, 'manual' from r
on conflict (user_id,item_type,item_id) do update
  set score=excluded.score, source='manual', updated_at=now();

-- Mirror rating onto latest review post
update posts p
set rating_percent = r.rating_percent
from (
  select distinct on (user_id, item_type, item_id)
         user_id, item_type, item_id, rating_percent
  from user_reviews
  where rating_percent is not null
    and created_at > now() - interval '2 days'
  order by user_id, item_type, item_id, created_at desc
) r
where p.author_id = r.user_id
  and p.kind = 'review'
  and p.item_type = r.item_type
  and p.item_id = r.item_id;