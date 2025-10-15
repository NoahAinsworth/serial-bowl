import { supabase, getUserId } from './supabase';

export interface FeedPost {
  id: string;
  author_id: string;
  kind: string;
  body: string | null;
  item_type: string | null;
  item_id: string | null;
  rating_percent: number | null;
  has_spoilers: boolean;
  has_mature: boolean;
  likes_count: number;
  dislikes_count: number;
  replies_count: number;
  reshares_count: number;
  impressions_count: number;
  created_at: string;
  updated_at: string;
}

interface TrendingCursor {
  score: number;
}

interface HotTakesCursor {
  controversy: number;
}

interface TimeCursor {
  created_at: string;
}

/**
 * Trending: score = ((likes - dislikes)*1.7 + replies*1.2 + 3) / power(age_hours+1, 1.25)
 */
export async function getTrending(cursor?: TrendingCursor): Promise<{ posts: FeedPost[]; nextCursor?: TrendingCursor }> {
  let query = supabase
    .from('posts')
    .select('*')
    .is('deleted_at', null);

  if (cursor?.score) {
    // Filter by score < cursor.score
    // We'll need to calculate this client-side or use a database function
    // For now, fetch and filter client-side
  }

  const { data, error } = await query.limit(20);

  if (error) throw error;

  const posts = (data || []).map((post: any) => {
    const ageHours = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
    const score = ((post.likes_count - post.dislikes_count) * 1.7 + post.replies_count * 1.2 + 3) / Math.pow(ageHours + 1, 1.25);
    return { ...post, _score: score };
  });

  // Sort by score descending
  posts.sort((a: any, b: any) => b._score - a._score);

  // Filter by cursor if provided
  const filtered = cursor?.score 
    ? posts.filter((p: any) => p._score < cursor.score)
    : posts;

  const result = filtered.slice(0, 20);

  return {
    posts: result,
    nextCursor: result.length === 20 && result[19]._score 
      ? { score: result[19]._score } 
      : undefined,
  };
}

/**
 * Hot Takes: controversy = ((likes+dislikes)/greatest(1,abs(likes - dislikes))) / power(age_hours+1,1.1)
 * Require >= 5 reactions
 */
export async function getHotTakes(cursor?: HotTakesCursor): Promise<{ posts: FeedPost[]; nextCursor?: HotTakesCursor }> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .is('deleted_at', null)
    .limit(100); // Fetch more to filter

  if (error) throw error;

  const posts = (data || [])
    .filter((post: any) => (post.likes_count + post.dislikes_count) >= 5)
    .map((post: any) => {
      const ageHours = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
      const controversy = ((post.likes_count + post.dislikes_count) / Math.max(1, Math.abs(post.likes_count - post.dislikes_count))) / Math.pow(ageHours + 1, 1.1);
      return { ...post, _controversy: controversy };
    });

  // Sort by controversy descending
  posts.sort((a: any, b: any) => b._controversy - a._controversy);

  // Filter by cursor if provided
  const filtered = cursor?.controversy 
    ? posts.filter((p: any) => p._controversy < cursor.controversy)
    : posts;

  const result = filtered.slice(0, 20);

  return {
    posts: result,
    nextCursor: result.length === 20 && result[19]._controversy 
      ? { controversy: result[19]._controversy } 
      : undefined,
  };
}

/**
 * Following: posts by followed authors, ordered by created_at desc
 */
export async function getFollowing(cursor?: TimeCursor): Promise<{ posts: FeedPost[]; nextCursor?: TimeCursor }> {
  const userId = await getUserId();
  if (!userId) return { posts: [] };

  // Get following IDs
  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
    .eq('status', 'accepted');

  if (!follows || follows.length === 0) return { posts: [] };

  const followingIds = follows.map(f => f.following_id);

  let query = supabase
    .from('posts')
    .select('*')
    .in('author_id', followingIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (cursor?.created_at) {
    query = query.lt('created_at', cursor.created_at);
  }

  const { data, error } = await query.limit(20);

  if (error) throw error;

  const posts = data || [];

  return {
    posts,
    nextCursor: posts.length === 20 && posts[19] 
      ? { created_at: posts[19].created_at } 
      : undefined,
  };
}

/**
 * New: all posts ordered by created_at desc
 */
export async function getNew(cursor?: TimeCursor): Promise<{ posts: FeedPost[]; nextCursor?: TimeCursor }> {
  let query = supabase
    .from('posts')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (cursor?.created_at) {
    query = query.lt('created_at', cursor.created_at);
  }

  const { data, error } = await query.limit(20);

  if (error) throw error;

  const posts = data || [];

  return {
    posts,
    nextCursor: posts.length === 20 && posts[19] 
      ? { created_at: posts[19].created_at } 
      : undefined,
  };
}

export async function getForYou(cursor?: TimeCursor) {
  return getNew(cursor);
}
