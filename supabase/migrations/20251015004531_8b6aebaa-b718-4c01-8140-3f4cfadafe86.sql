-- SerialBowl v1.6 Database Schema (idempotent)

-- Profiles table
create table if not exists profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null,
  avatar_url text,
  bio text,
  is_private boolean default false,
  settings jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Post kind enum
do $$ begin 
  create type post_kind as enum('thought','review','rating','reshare'); 
exception when duplicate_object then null; 
end $$;

-- Unified posts table
create table if not exists posts(
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  kind post_kind not null,
  body text,
  item_type text check (item_type in ('show','season','episode')),
  item_id bigint,
  rating_percent int check (rating_percent between 0 and 100),
  has_spoilers boolean default false,
  has_mature boolean default false,
  likes_count int default 0,
  dislikes_count int default 0,
  replies_count int default 0,
  reshares_count int default 0,
  impressions_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

-- Post reactions
create table if not exists post_reactions(
  user_id uuid references profiles(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  kind text check (kind in ('like','dislike','emoji_fire','emoji_laugh','emoji_mindblown','emoji_cry','emoji_heart')),
  created_at timestamptz default now(),
  primary key(user_id, post_id, kind)
);

-- Comments
create table if not exists comments(
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

-- Follows
create table if not exists follows(
  follower_id uuid references profiles(id) on delete cascade,
  following_id uuid references profiles(id) on delete cascade,
  status text default 'accepted' check (status in ('pending','accepted','rejected')),
  created_at timestamptz default now(),
  primary key(follower_id, following_id)
);

-- User ratings (single source of truth)
create table if not exists user_ratings(
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  item_type text not null check (item_type in ('show','season','episode')),
  item_id bigint not null,
  score int not null check (score between 0 and 100),
  updated_at timestamptz default now(),
  unique(user_id, item_type, item_id)
);

-- Conversations
create table if not exists conversations(
  id uuid primary key default gen_random_uuid(),
  is_group boolean default false,
  created_at timestamptz default now()
);

-- Conversation participants
create table if not exists conversation_participants(
  conversation_id uuid references conversations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  primary key(conversation_id, user_id)
);

-- Messages
create table if not exists messages(
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  body text,
  post_id uuid references posts(id) on delete set null,
  created_at timestamptz default now(),
  deleted_at timestamptz
);

-- Message reads
create table if not exists message_reads(
  message_id uuid references messages(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  read_at timestamptz default now(),
  primary key(message_id, user_id)
);

-- Trigger: Sync review rating to user_ratings ledger
create or replace function trg_sync_review_rating()
returns trigger language plpgsql as $$
begin
  if (new.kind='review' and new.deleted_at is null and new.rating_percent is not null
      and new.item_type is not null and new.item_id is not null) then
    insert into user_ratings(user_id,item_type,item_id,score,updated_at)
    values (new.author_id,new.item_type,new.item_id,new.rating_percent,now())
    on conflict (user_id,item_type,item_id)
    do update set score = excluded.score, updated_at = now();
  end if;
  return new;
end $$;

drop trigger if exists t_posts_sync_review_rating on posts;
create trigger t_posts_sync_review_rating
after insert or update of rating_percent, deleted_at on posts
for each row execute function trg_sync_review_rating();

-- RLS Policies

-- Posts: public read (non-deleted), authors manage own
alter table posts enable row level security;

create policy "posts_public_read" on posts
  for select using (deleted_at is null);

create policy "posts_author_insert" on posts
  for insert with check (author_id = auth.uid());

create policy "posts_author_update" on posts
  for update using (author_id = auth.uid());

create policy "posts_author_delete" on posts
  for delete using (author_id = auth.uid());

-- Post reactions: public read, users manage own
alter table post_reactions enable row level security;

create policy "reactions_public_read" on post_reactions
  for select using (true);

create policy "reactions_user_insert" on post_reactions
  for insert with check (user_id = auth.uid());

create policy "reactions_user_delete" on post_reactions
  for delete using (user_id = auth.uid());

-- Comments: public read, users manage own
alter table comments enable row level security;

create policy "comments_public_read" on comments
  for select using (true);

create policy "comments_user_insert" on comments
  for insert with check (user_id = auth.uid());

create policy "comments_user_delete" on comments
  for delete using (user_id = auth.uid());

-- User ratings: users read/write only their own
alter table user_ratings enable row level security;

create policy "ratings_user_read" on user_ratings
  for select using (user_id = auth.uid());

create policy "ratings_user_insert" on user_ratings
  for insert with check (user_id = auth.uid());

create policy "ratings_user_update" on user_ratings
  for update using (user_id = auth.uid());

create policy "ratings_user_delete" on user_ratings
  for delete using (user_id = auth.uid());

-- Profiles: public read for basic info
alter table profiles enable row level security;

create policy "profiles_public_read" on profiles
  for select using (true);

create policy "profiles_user_update" on profiles
  for update using (id = auth.uid());

-- Conversations: participants only
alter table conversations enable row level security;

create policy "conversations_participant_read" on conversations
  for select using (exists(
    select 1 from conversation_participants 
    where conversation_id = id and user_id = auth.uid()
  ));

-- Conversation participants: participants only
alter table conversation_participants enable row level security;

create policy "participants_read" on conversation_participants
  for select using (user_id = auth.uid() or exists(
    select 1 from conversation_participants cp
    where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
  ));

-- Messages: participants only
alter table messages enable row level security;

create policy "messages_participant_read" on messages
  for select using (exists(
    select 1 from conversation_participants 
    where conversation_id = messages.conversation_id and user_id = auth.uid()
  ));

create policy "messages_sender_insert" on messages
  for insert with check (sender_id = auth.uid());

-- Message reads: participants only
alter table message_reads enable row level security;

create policy "reads_participant_insert" on message_reads
  for insert with check (user_id = auth.uid());

-- Follows: public read
alter table follows enable row level security;

create policy "follows_public_read" on follows
  for select using (true);

create policy "follows_user_insert" on follows
  for insert with check (follower_id = auth.uid());

create policy "follows_user_delete" on follows
  for delete using (follower_id = auth.uid());