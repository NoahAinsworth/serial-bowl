import { supabase } from './supabase';

export interface FeedPost {
  id: string;
  author_id: string;
  kind: 'thought' | 'review' | 'rating';
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
  // Video fields
  video_url?: string | null;
  video_thumbnail_url?: string | null;
  video_duration?: number | null;
  video_file_size?: number | null;
  video_bunny_id?: string | null;
  video_status?: string | null;
  video_embed_url?: string | null;
  author: {
    id: string;
    handle: string;
    avatar_url: string | null;
  };
  userReaction?: 'like' | 'dislike';
}

async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function enrichPosts(posts: any[]): Promise<FeedPost[]> {
  const userId = await getUserId();

  return Promise.all(
    posts.map(async (post) => {
      // Get author profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, handle, avatar_url')
        .eq('id', post.author_id)
        .maybeSingle();

      // Check user's reaction
      let userReaction: 'like' | 'dislike' | undefined;
      if (userId) {
        const { data: reaction } = await supabase
          .from('post_reactions')
          .select('kind')
          .eq('post_id', post.id)
          .eq('user_id', userId)
          .maybeSingle();
        
        if (reaction) {
          userReaction = reaction.kind as 'like' | 'dislike';
        }
      }

      // Get rating from user_ratings if not present
      let ratingToShow = post.rating_percent;
      if (post.kind === 'review' && !ratingToShow && post.item_type && post.item_id) {
        const { data: rating } = await supabase
          .from('user_ratings')
          .select('score')
          .eq('user_id', post.author_id)
          .eq('item_type', post.item_type)
          .eq('item_id', post.item_id)
          .maybeSingle();
        
        if (rating) {
          ratingToShow = rating.score;
        }
      }

      return {
        ...post,
        rating_percent: ratingToShow,
        author: profile || { id: post.author_id, handle: 'Unknown', avatar_url: null },
        userReaction,
      };
    })
  );
}

interface TrendingCursor {
  score: number;
  id: string;
}

/**
 * Trending: Twitter-style velocity-based algorithm
 * - Minimum 30 minutes age
 * - Must have at least 1 engagement
 * - Score based on velocity (engagement/hour) with time decay
 */
export async function getTrending(cursor?: TrendingCursor): Promise<{ posts: FeedPost[]; nextCursor?: TrendingCursor }> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .is('deleted_at', null)
    .neq('kind', 'rating')
    .limit(200);

  if (error) throw error;

  const now = Date.now();
  
  const posts = (data || [])
    .map((post: any) => {
      const ageMs = now - new Date(post.created_at).getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      
      // Don't show posts younger than 30 minutes
      if (ageHours < 0.5) {
        return { ...post, _score: -1 };
      }
      
      const totalEngagement = post.likes_count + post.dislikes_count + post.replies_count;
      
      // Must have at least 1 engagement to trend
      if (totalEngagement === 0) {
        return { ...post, _score: -1 };
      }
      
      // Twitter-style velocity score
      const netScore = (post.likes_count * 2) - (post.dislikes_count * 0.5) + (post.replies_count * 3);
      const velocity = totalEngagement / Math.max(ageHours, 1);
      const timePenalty = Math.pow(ageHours + 2, 1.5);
      
      const score = (netScore + velocity * 10) / timePenalty;
      
      return { ...post, _score: score };
    })
    .filter((p: any) => p._score > 0);

  posts.sort((a: any, b: any) => {
    if (b._score !== a._score) return b._score - a._score;
    return b.id.localeCompare(a.id);
  });

  const filtered = cursor
    ? posts.filter((p: any) => p._score < cursor.score || (p._score === cursor.score && p.id < cursor.id))
    : posts;

  const result = filtered.slice(0, 20);
  const enriched = await enrichPosts(result);

  return {
    posts: enriched,
    nextCursor: result.length === 20
      ? { score: result[19]._score, id: result[19].id }
      : undefined,
  };
}

interface HotTakesCursor {
  controversy: number;
  id: string;
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
    .neq('kind', 'rating') // Exclude rating-only posts from feed
    .limit(200); // Fetch more to filter

  if (error) throw error;

  const posts = (data || [])
    .filter((post: any) => (post.likes_count + post.dislikes_count) >= 5)
    .map((post: any) => {
      const ageHours = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
      const controversy = ((post.likes_count + post.dislikes_count) / Math.max(1, Math.abs(post.likes_count - post.dislikes_count))) / Math.pow(ageHours + 1, 1.1);
      return { ...post, _controversy: controversy };
    });

  posts.sort((a: any, b: any) => {
    if (b._controversy !== a._controversy) return b._controversy - a._controversy;
    return b.id.localeCompare(a.id);
  });

  const filtered = cursor 
    ? posts.filter((p: any) => p._controversy < cursor.controversy || (p._controversy === cursor.controversy && p.id < cursor.id))
    : posts;

  const result = filtered.slice(0, 20);
  const enriched = await enrichPosts(result);

  return {
    posts: enriched,
    nextCursor: result.length === 20 
      ? { controversy: result[19]._controversy, id: result[19].id } 
      : undefined,
  };
}

interface TimeCursor {
  created_at: string;
  id: string;
}

/**
 * Following: posts by followed authors, ordered by created_at desc
 */
export async function getFollowing(cursor?: TimeCursor): Promise<{ posts: FeedPost[]; nextCursor?: TimeCursor }> {
  const userId = await getUserId();
  if (!userId) return { posts: [] };

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
    .neq('kind', 'rating') // Exclude rating-only posts from feed
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  if (cursor) {
    query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
  }

  const { data, error } = await query.limit(20);

  if (error) throw error;

  const enriched = await enrichPosts(data || []);

  return {
    posts: enriched,
    nextCursor: enriched.length === 20 
      ? { created_at: enriched[19].created_at, id: enriched[19].id } 
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
    .neq('kind', 'rating') // Exclude rating-only posts from feed
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  if (cursor) {
    query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
  }

  const { data, error } = await query.limit(20);

  if (error) throw error;

  const enriched = await enrichPosts(data || []);

  return {
    posts: enriched,
    nextCursor: enriched.length === 20 
      ? { created_at: enriched[19].created_at, id: enriched[19].id } 
      : undefined,
  };
}

/**
 * Videos: posts with video attachments (both old uploads and new embeds), ordered by created_at desc
 */
export async function getVideos(cursor?: TimeCursor): Promise<{ posts: FeedPost[]; nextCursor?: TimeCursor }> {
  let query = supabase
    .from('posts')
    .select('*')
    .is('deleted_at', null)
    .or('video_bunny_id.not.is.null,video_embed_url.not.is.null')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  if (cursor) {
    query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
  }

  const { data, error } = await query.limit(20);

  if (error) throw error;

  const enriched = await enrichPosts(data || []);

  return {
    posts: enriched,
    nextCursor: enriched.length === 20 
      ? { created_at: enriched[19].created_at, id: enriched[19].id } 
      : undefined,
  };
}

export async function getForYou(cursor?: TimeCursor) {
  return getNew(cursor);
}
