-- A) POSTING SYSTEM

-- Core posts table (safe defaults)
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  kind text check (kind in ('thought','review','rating','reshare')) default 'thought',
  body text,
  item_type text check (item_type in ('show','season','episode')) null,
  item_id text null,
  rating_percent int check (rating_percent between 0 and 100),
  is_spoiler boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- engagement counters
  likes_count int default 0,
  dislikes_count int default 0,
  replies_count int default 0,
  reshares_count int default 0,
  impressions_count int default 0,
  reports_count int default 0
);

-- Update timestamp
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

drop trigger if exists trg_posts_touch on posts;
create trigger trg_posts_touch before update on posts
for each row execute procedure touch_updated_at();

-- RLS
alter table posts enable row level security;

-- Policies: authors can insert their own posts; everyone can read
drop policy if exists p_posts_insert_own on posts;
create policy p_posts_insert_own on posts
for insert with check (author_id = auth.uid());

drop policy if exists p_posts_select_all on posts;
create policy p_posts_select_all on posts
for select using (true);

-- Reaction table + counters
create table if not exists post_reactions (
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  kind text check (kind in ('like','dislike')) not null,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

create or replace function sync_post_reaction_counts() returns trigger as $$
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
end $$ language plpgsql;

drop trigger if exists trg_pr_i on post_reactions;
create trigger trg_pr_i after insert on post_reactions
for each row execute procedure sync_post_reaction_counts();

drop trigger if exists trg_pr_d on post_reactions;
create trigger trg_pr_d after delete on post_reactions
for each row execute procedure sync_post_reaction_counts();

alter table post_reactions enable row level security;

drop policy if exists p_pr_upsert on post_reactions;
create policy p_pr_upsert on post_reactions
for insert with check (user_id = auth.uid());

drop policy if exists p_pr_delete on post_reactions;
create policy p_pr_delete on post_reactions
for delete using (user_id = auth.uid());

drop policy if exists p_pr_select on post_reactions;
create policy p_pr_select on post_reactions
for select using (true);

-- Server function to create a post
create or replace function api_create_post(
  p_kind text,
  p_body text,
  p_item_type text default null,
  p_item_id text default null,
  p_rating_percent int default null,
  p_is_spoiler boolean default false
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
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
end $$;

revoke all on function api_create_post(text, text, text, text, int, boolean) from public;
grant execute on function api_create_post(text, text, text, text, int, boolean) to anon, authenticated;

-- B) RATINGS/REVIEWS SYSTEM

-- Ratings table (source of truth)
create table if not exists user_ratings (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text check (item_type in ('show','season','episode')) not null,
  item_id text not null,
  score int check (score between 0 and 100) not null,
  source text check (source in ('manual','rollup')) default 'manual',
  updated_at timestamptz default now(),
  primary key (user_id, item_type, item_id)
);

-- Reviews table
create table if not exists user_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text check (item_type in ('show','season','episode')) not null,
  item_id text not null,
  body text,
  rating_percent int check (rating_percent between 0 and 100),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Keep updates timestamped
create or replace function touch_updated_at_generic() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

drop trigger if exists trg_user_reviews_touch on user_reviews;
create trigger trg_user_reviews_touch before update on user_reviews
for each row execute procedure touch_updated_at_generic();

alter table user_ratings enable row level security;
alter table user_reviews enable row level security;

-- RLS
drop policy if exists p_user_ratings_upsert on user_ratings;
create policy p_user_ratings_upsert on user_ratings
for insert with check (user_id = auth.uid());

drop policy if exists p_user_ratings_update on user_ratings;
create policy p_user_ratings_update on user_ratings
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists p_user_ratings_select on user_ratings;
create policy p_user_ratings_select on user_ratings
for select using (true);

drop policy if exists p_user_reviews_insert on user_reviews;
create policy p_user_reviews_insert on user_reviews
for insert with check (user_id = auth.uid());

drop policy if exists p_user_reviews_update on user_reviews;
create policy p_user_reviews_update on user_reviews
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists p_user_reviews_select on user_reviews;
create policy p_user_reviews_select on user_reviews
for select using (true);

-- Rollup helpers
create or replace function compute_season_rollup(p_user uuid, p_season_id text)
returns int language sql stable as $$
  with eps as (
    select score from user_ratings
    where user_id = p_user and item_type = 'episode' and item_id like (p_season_id || ':%')
  )
  select case when count(*)=0 then null else round(avg(score))::int end from eps;
$$;

create or replace function compute_show_rollup(p_user uuid, p_show_id text)
returns int language sql stable as $$
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
$$;

create or replace function upsert_rollups(p_user uuid, p_item_type text, p_item_id text)
returns void language plpgsql as $$
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
end $$;

-- Transaction function for rate and review
create or replace function api_rate_and_review(
  p_item_type text,
  p_item_id text,
  p_score int default null,
  p_review text default null,
  p_is_spoiler boolean default false
) returns table (post_id uuid, review_id uuid, rating_score int)
language plpgsql security definer set search_path=public as $$
declare
  v_post_id uuid;
  v_review_id uuid;
begin
  if p_item_type not in ('show','season','episode') then
    raise exception 'invalid item_type';
  end if;

  if p_score is not null and (p_score < 0 or p_score > 100) then
    raise exception 'score out of range';
  end if;

  -- upsert rating if provided
  if p_score is not null then
    insert into user_ratings(user_id,item_type,item_id,score,source)
    values (auth.uid(), p_item_type, p_item_id, p_score, 'manual')
    on conflict (user_id,item_type,item_id) do update
      set score=excluded.score, source='manual', updated_at=now();
  end if;

  -- review save (if body present)
  if p_review is not null and length(trim(p_review)) > 0 then
    insert into user_reviews(user_id,item_type,item_id,body,rating_percent)
    values (auth.uid(), p_item_type, p_item_id, p_review, p_score)
    returning id into v_review_id;

    -- create a review post that links to the item
    v_post_id := api_create_post('review', p_review, p_item_type, p_item_id, p_score, p_is_spoiler);
  elsif p_score is not null then
    -- rating-only activity post (lightweight)
    v_post_id := api_create_post('rating', null, p_item_type, p_item_id, p_score, p_is_spoiler);
  end if;

  -- rollups
  perform upsert_rollups(auth.uid(), p_item_type, p_item_id);

  return query
  select v_post_id, v_review_id, p_score;
end $$;

revoke all on function api_rate_and_review(text,text,int,text,boolean) from public;
grant execute on function api_rate_and_review(text,text,int,text,boolean) to anon, authenticated;

-- Profile views
create or replace view profile_reviews as
select r.*
from user_reviews r
where r.user_id = auth.uid()
order by r.created_at desc;

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