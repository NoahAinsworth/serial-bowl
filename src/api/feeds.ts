import { supabase } from "@/integrations/supabase/client";

export interface FeedPost {
  id: string;
  author_id: string;
  kind: string;
  body: string | null;
  item_type: string | null;
  item_id: string | null;
  rating_percent: number | null;
  is_spoiler: boolean;
  likes_count: number;
  dislikes_count: number;
  replies_count: number;
  reshares_count: number;
  created_at: string;
  // Hydrated fields
  author?: any;
  user_reaction?: 'like' | 'dislike' | null;
  show_info?: any;
}

interface FeedOptions {
  limit?: number;
  cursorTs?: string;
  cursorScore?: number;
}

/**
 * Hydrate post IDs with full data
 */
async function hydratePosts(postIds: string[]): Promise<FeedPost[]> {
  if (postIds.length === 0) return [];

  const { data: { user } } = await supabase.auth.getUser();

  // Fetch posts with author profiles
  const { data: posts, error } = await supabase
    .from('posts')
    .select(`
      *,
      author:profiles!posts_author_id_fkey(id, handle, avatar_url)
    `)
    .in('id', postIds)
    .is('deleted_at', null);

  if (error) throw error;
  if (!posts) return [];

  // Fetch user reactions if authenticated
  let userReactions: Record<string, string> = {};
  if (user) {
    const { data: reactions } = await supabase
      .from('post_reactions')
      .select('post_id, kind')
      .eq('user_id', user.id)
      .in('post_id', postIds);

    if (reactions) {
      userReactions = reactions.reduce((acc, r) => {
        acc[r.post_id] = r.kind;
        return acc;
      }, {} as Record<string, string>);
    }
  }

  // Maintain order from postIds
  const postsMap = new Map(posts.map(p => [p.id, p]));
  return postIds
    .map(id => postsMap.get(id))
    .filter(Boolean)
    .map(post => ({
      ...post,
      user_reaction: userReactions[post!.id] || null,
    })) as FeedPost[];
}

/**
 * Get posts from users I follow
 */
export async function getFollowing(options: FeedOptions = {}) {
  const { limit = 20, cursorTs } = options;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase.rpc('feed_following' as any, {
    uid: user.id,
    limit_count: limit,
    cursor_ts: cursorTs || null,
  }) as { data: Array<{ post_id: string; created_at: string }> | null; error: any };

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const postIds = data.map((row) => row.post_id);
  return hydratePosts(postIds);
}

/**
 * Get trending posts with real-time scoring
 */
export async function getTrending(options: FeedOptions = {}) {
  const { limit = 20, cursorScore } = options;

  const { data, error } = await supabase.rpc('feed_trending_rt', {
    limit_count: limit,
    cursor_score: cursorScore || null,
  }) as { data: Array<{ post_id: string; score: number }> | null; error: any };

  if (error) throw error;

  // Fallback to recent popular if no results
  if (!data || data.length === 0) {
    const { data: fallback, error: fbError } = await supabase.rpc('feed_recent_popular', {
      limit_count: limit,
    }) as { data: Array<{ post_id: string; score: number }> | null; error: any };
    if (fbError) throw fbError;
    if (!fallback || fallback.length === 0) return [];
    
    const postIds = fallback.map((row) => row.post_id);
    return hydratePosts(postIds);
  }

  const postIds = data.map((row) => row.post_id);
  return hydratePosts(postIds);
}

/**
 * Get hot takes (controversial posts)
 */
export async function getHotTakes(options: FeedOptions = {}) {
  const { limit = 20, cursorScore } = options;

  const { data, error } = await supabase.rpc('feed_hot_takes' as any, {
    limit_count: limit,
    cursor_score: cursorScore || null,
  }) as { data: Array<{ post_id: string; score: number }> | null; error: any };

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const postIds = data.map((row) => row.post_id);
  return hydratePosts(postIds);
}

/**
 * Get newest posts site-wide
 */
export async function getNew(options: FeedOptions = {}) {
  const { limit = 20, cursorTs } = options;

  const { data, error } = await supabase.rpc('feed_new' as any, {
    limit_count: limit,
    cursor_ts: cursorTs || null,
  }) as { data: Array<{ post_id: string; created_at: string }> | null; error: any };

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const postIds = data.map((row) => row.post_id);
  return hydratePosts(postIds);
}

/**
 * Get "For You" feed with boosts
 * Starts from trending, applies client-side personalization
 */
export async function getForYou(options: FeedOptions = {}) {
  const { limit = 20 } = options;
  const { data: { user } } = await supabase.auth.getUser();

  // Start with trending
  let posts = await getTrending({ limit: limit * 2 }); // Get more to filter

  if (!user) return posts.slice(0, limit);

  // Get user's follows
  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)
    .eq('status', 'accepted');

  const followingIds = new Set(follows?.map(f => f.following_id) || []);

  // Get user's recent ratings (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data: recentRatings } = await supabase
    .from('user_ratings')
    .select('item_id, item_type')
    .eq('user_id', user.id)
    .gte('updated_at', thirtyDaysAgo.toISOString());

  const ratedItems = new Set(
    recentRatings?.map(r => `${r.item_type}:${r.item_id}`) || []
  );

  // Apply boosts and diversity penalty
  const scoredPosts = posts.map((post, index) => {
    let boost = 1.0;

    // +10% if from followed user
    if (followingIds.has(post.author_id)) {
      boost *= 1.10;
    }

    // +8% if related to recently rated content
    const itemKey = `${post.item_type}:${post.item_id}`;
    if (ratedItems.has(itemKey)) {
      boost *= 1.08;
    }

    // -20% diversity penalty if same author appears ≥3 times in last 10 items
    const recentPosts = posts.slice(Math.max(0, index - 10), index);
    const authorCount = recentPosts.filter(p => p.author_id === post.author_id).length;
    if (authorCount >= 3) {
      boost *= 0.80;
    }

    return { ...post, _boost: boost };
  });

  // Sort by boost
  scoredPosts.sort((a, b) => b._boost - a._boost);

  // Mix ~70% non-follow / 30% follow
  const following = scoredPosts.filter(p => followingIds.has(p.author_id));
  const nonFollowing = scoredPosts.filter(p => !followingIds.has(p.author_id));

  const result: FeedPost[] = [];
  const targetFollowing = Math.floor(limit * 0.3);
  const targetNonFollowing = limit - targetFollowing;

  result.push(...nonFollowing.slice(0, targetNonFollowing));
  result.push(...following.slice(0, targetFollowing));

  return result.slice(0, limit);
}
