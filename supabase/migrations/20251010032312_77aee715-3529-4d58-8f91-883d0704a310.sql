-- Exponential time decay function
CREATE OR REPLACE FUNCTION public.exp_decay(created timestamptz, half_life_hours float)
RETURNS float AS $$
  SELECT exp(-ln(2) * extract(epoch from (now() - created)) / (3600 * half_life_hours));
$$ LANGUAGE sql STABLE;

-- Main attention score function for ranking
CREATE OR REPLACE FUNCTION public.attention_score(
  likes int, 
  dislikes int, 
  replies int, 
  reshares int, 
  impressions int,
  created timestamptz, 
  half_life_hours float DEFAULT 12
) RETURNS float AS $$
  SELECT (
    (1.0 * COALESCE(likes, 0))
    + (2.0 * COALESCE(replies, 0))
    + (3.0 * COALESCE(reshares, 0))
    + (0.002 * COALESCE(impressions, 0))
    + (-0.6 * COALESCE(dislikes, 0))
  ) * public.exp_decay(created, half_life_hours);
$$ LANGUAGE sql STABLE;

-- Wilson lower bound for quality ranking
CREATE OR REPLACE FUNCTION public.wilson_lower_bound(likes int, dislikes int)
RETURNS float AS $$
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
$$ LANGUAGE sql STABLE;

-- For You feed: Personalized ranked mix with follow boost
CREATE OR REPLACE VIEW public.feed_for_you AS
SELECT DISTINCT ON (p.id)
  p.id,
  p.author_id,
  p.type as post_type,
  p.created_at,
  p.text,
  p.rating,
  p.show_id,
  pop.likes,
  pop.dislikes,
  pop.comments,
  pop.reshares,
  pop.views,
  public.attention_score(
    pop.likes::int, 
    pop.dislikes::int, 
    pop.comments::int, 
    pop.reshares::int, 
    COALESCE(pop.views, 0)::int,
    p.created_at, 
    12
  ) as rank_score
FROM public.v_posts p
LEFT JOIN public.v_post_popularity pop ON pop.post_id = p.id AND pop.post_type = p.type
WHERE p.created_at > now() - interval '72 hours'
  AND p.moderation_status = 'approved'
ORDER BY p.id, rank_score DESC;

-- Following feed: Posts from followed accounts
CREATE OR REPLACE VIEW public.feed_following AS
SELECT DISTINCT ON (p.id)
  p.id,
  p.author_id,
  p.type as post_type,
  p.created_at,
  p.text,
  p.rating,
  p.show_id,
  pop.likes,
  pop.dislikes,
  pop.comments,
  pop.reshares,
  pop.views,
  (0.5 * public.attention_score(
    pop.likes::int, 
    pop.dislikes::int, 
    pop.comments::int, 
    pop.reshares::int, 
    COALESCE(pop.views, 0)::int,
    p.created_at, 
    18
  ) + 0.5 * (extract(epoch from p.created_at)/1e9)) as rank_score
FROM public.v_posts p
LEFT JOIN public.v_post_popularity pop ON pop.post_id = p.id AND pop.post_type = p.type
WHERE p.created_at > now() - interval '7 days'
  AND p.moderation_status = 'approved'
ORDER BY p.id, rank_score DESC;

-- Trending feed: Posts with most likes in last 48 hours
CREATE OR REPLACE VIEW public.feed_trending AS
SELECT DISTINCT ON (p.id)
  p.id,
  p.author_id,
  p.type as post_type,
  p.created_at,
  p.text,
  p.rating,
  p.show_id,
  pop.likes,
  pop.dislikes,
  pop.comments,
  pop.reshares,
  pop.views,
  (
    (1.25 * COALESCE(pop.likes, 0) - 0.2 * COALESCE(pop.dislikes, 0)) 
    * public.exp_decay(p.created_at, 18)
    + 2.0 * public.wilson_lower_bound(pop.likes::int, pop.dislikes::int)
  ) as rank_score
FROM public.v_posts p
LEFT JOIN public.v_post_popularity pop ON pop.post_id = p.id AND pop.post_type = p.type
WHERE p.created_at > now() - interval '48 hours'
  AND p.moderation_status = 'approved'
  AND (COALESCE(pop.likes, 0) + COALESCE(pop.dislikes, 0) + COALESCE(pop.comments, 0)) >= 10
ORDER BY p.id, rank_score DESC;

-- Hot Takes feed: Divisive posts with high engagement on both sides
CREATE OR REPLACE VIEW public.feed_hot_takes AS
SELECT DISTINCT ON (p.id)
  p.id,
  p.author_id,
  p.type as post_type,
  p.created_at,
  p.text,
  p.rating,
  p.show_id,
  pop.likes,
  pop.dislikes,
  pop.comments,
  pop.reshares,
  pop.views,
  (
    (sqrt(GREATEST(COALESCE(pop.likes, 0), 0) * GREATEST(COALESCE(pop.dislikes, 0), 0)) 
    + 0.5 * COALESCE(pop.comments, 0))
    * public.exp_decay(p.created_at, 18)
  ) as rank_score
FROM public.v_posts p
LEFT JOIN public.v_post_popularity pop ON pop.post_id = p.id AND pop.post_type = p.type
WHERE p.created_at > now() - interval '48 hours'
  AND p.moderation_status = 'approved'
  AND (COALESCE(pop.likes, 0) + COALESCE(pop.dislikes, 0)) >= 12
ORDER BY p.id, rank_score DESC;