-- Serialcereal Database Schema
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create app_role enum
create type public.app_role as enum ('admin', 'moderator', 'user');

-- Create content_kind enum
create type public.content_kind as enum ('show', 'season', 'episode');

-- Create moderation_status enum
create type public.moderation_status as enum ('allow', 'shadow', 'queue', 'reject');

-- Users profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null,
  bio text,
  avatar_url text,
  settings jsonb default '{
    "theme": "system",
    "privacy": {
      "private_profile": false,
      "dm_permission": "everyone",
      "comment_permission": "everyone"
    },
    "safety": {
      "hide_spoilers": true,
      "strict_safety": false
    },
    "notifications": {
      "thoughts": true,
      "comments": true,
      "follows": true,
      "dms": true
    }
  }'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- User roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Follows table
create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique (follower_id, following_id),
  check (follower_id != following_id)
);

alter table public.follows enable row level security;

-- Content table (shows, seasons, episodes from TheTVDB)
create table public.content (
  id uuid primary key default gen_random_uuid(),
  external_src text not null default 'thetvdb',
  external_id text not null,
  kind content_kind not null,
  parent_id uuid references public.content(id) on delete cascade,
  title text not null,
  overview text,
  poster_url text,
  air_date date,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (external_src, external_id)
);

alter table public.content enable row level security;

-- Ratings table
create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  content_id uuid references public.content(id) on delete cascade not null,
  rating integer not null check (rating >= 1 and rating <= 10),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, content_id)
);

alter table public.ratings enable row level security;

-- Watches table
create table public.watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  content_id uuid references public.content(id) on delete cascade not null,
  watched_at timestamptz default now(),
  unique (user_id, content_id)
);

alter table public.watches enable row level security;

-- Thoughts table
create table public.thoughts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  content_id uuid references public.content(id) on delete set null,
  text_content text not null check (char_length(text_content) <= 500),
  moderation_status moderation_status default 'allow',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.thoughts enable row level security;

-- Reactions table (likes, dislikes, rethinks)
create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  thought_id uuid references public.thoughts(id) on delete cascade not null,
  reaction_type text not null check (reaction_type in ('like', 'dislike', 'rethink')),
  created_at timestamptz default now(),
  unique (user_id, thought_id, reaction_type)
);

alter table public.reactions enable row level security;

-- Comments table
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  thought_id uuid references public.thoughts(id) on delete cascade not null,
  text_content text not null check (char_length(text_content) <= 500),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.comments enable row level security;

-- DMs table
create table public.dms (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles(id) on delete cascade not null,
  recipient_id uuid references public.profiles(id) on delete cascade not null,
  text_content text not null check (char_length(text_content) <= 1000),
  read boolean default false,
  created_at timestamptz default now(),
  check (sender_id != recipient_id)
);

alter table public.dms enable row level security;

-- Aggregates table for caching scores
create table public.aggregates (
  id uuid primary key default gen_random_uuid(),
  content_id uuid references public.content(id) on delete cascade not null unique,
  votes integer default 0,
  avg_percent numeric(5,2),
  bayes_score numeric(5,2),
  updated_at timestamptz default now()
);

alter table public.aggregates enable row level security;

-- Security definer function for role checking
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, handle, bio)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'handle', 'user' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'bio', '')
  );
  
  -- Give every new user the 'user' role
  insert into public.user_roles (user_id, role)
  values (new.id, 'user');
  
  return new;
end;
$$;

-- Trigger for new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS Policies

-- Profiles: public read, own write
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- User roles: read by owner, write by admins
create policy "Users can view own roles"
  on public.user_roles for select
  using (auth.uid() = user_id);

create policy "Admins can manage roles"
  on public.user_roles for all
  using (public.has_role(auth.uid(), 'admin'));

-- Follows: authenticated users can follow/unfollow
create policy "Anyone can view follows"
  on public.follows for select
  using (true);

create policy "Users can follow others"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- Content: public read, authenticated write
create policy "Content is viewable by everyone"
  on public.content for select
  using (true);

create policy "Authenticated users can create content"
  on public.content for insert
  with check (true);

create policy "Authenticated users can update content"
  on public.content for update
  using (true);

-- Ratings: authenticated users manage own
create policy "Ratings are viewable by everyone"
  on public.ratings for select
  using (true);

create policy "Users can manage own ratings"
  on public.ratings for all
  using (auth.uid() = user_id);

-- Watches: authenticated users manage own
create policy "Users can view own watches"
  on public.watches for select
  using (auth.uid() = user_id);

create policy "Users can manage own watches"
  on public.watches for all
  using (auth.uid() = user_id);

-- Thoughts: public read (if not shadow), authenticated write
create policy "Thoughts are viewable by everyone"
  on public.thoughts for select
  using (moderation_status != 'shadow' or auth.uid() = user_id);

create policy "Users can create thoughts"
  on public.thoughts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own thoughts"
  on public.thoughts for update
  using (auth.uid() = user_id);

create policy "Users can delete own thoughts"
  on public.thoughts for delete
  using (auth.uid() = user_id);

-- Reactions: authenticated users manage own
create policy "Reactions are viewable by everyone"
  on public.reactions for select
  using (true);

create policy "Users can manage own reactions"
  on public.reactions for all
  using (auth.uid() = user_id);

-- Comments: authenticated users can comment
create policy "Comments are viewable by everyone"
  on public.comments for select
  using (true);

create policy "Users can create comments"
  on public.comments for insert
  with check (auth.uid() = user_id);

create policy "Users can update own comments"
  on public.comments for update
  using (auth.uid() = user_id);

create policy "Users can delete own comments"
  on public.comments for delete
  using (auth.uid() = user_id);

-- DMs: sender and recipient only
create policy "Users can view own DMs"
  on public.dms for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "Users can send DMs"
  on public.dms for insert
  with check (auth.uid() = sender_id);

create policy "Recipients can mark DMs as read"
  on public.dms for update
  using (auth.uid() = recipient_id);

-- Aggregates: public read
create policy "Aggregates are viewable by everyone"
  on public.aggregates for select
  using (true);
