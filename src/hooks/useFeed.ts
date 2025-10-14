import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import * as feedsAPI from '@/api/feeds';

interface FeedPost {
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
  author?: {
    id: string;
    handle: string;
    avatar_url?: string | null;
  };
  user_reaction?: 'like' | 'dislike' | null;
  // Legacy mappings for compatibility
  type?: 'thought' | 'review';
  user?: any;
  text?: string;
  rating?: number | null;
  likes?: number;
  dislikes?: number;
  comments?: number;
  userReaction?: 'like' | 'dislike';
  contains_mature?: boolean;
}

export function useFeed(feedType: 'for-you' | 'following' | 'trending' | 'hot-takes', contentType: string = 'all') {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFeed();

    // Subscribe to real-time updates for posts
    const channel = supabase
      .channel('feed-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts'
        },
        () => {
          loadFeed();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_reactions'
        },
        () => {
          loadFeed();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [feedType, contentType]);

  const loadFeed = async () => {
    try {
      setLoading(true);
      setError(null);

      let feedPosts: feedsAPI.FeedPost[] = [];

      // Call appropriate feed function
      switch (feedType) {
        case 'following':
          feedPosts = await feedsAPI.getFollowing({ limit: 50 });
          break;
        case 'trending':
          feedPosts = await feedsAPI.getTrending({ limit: 50 });
          break;
        case 'hot-takes':
          feedPosts = await feedsAPI.getHotTakes({ limit: 50 });
          break;
        case 'for-you':
        default:
          feedPosts = await feedsAPI.getForYou({ limit: 50 });
          break;
      }

      // Filter by content type if needed
      let filteredPosts = feedPosts;
      if (contentType === 'thoughts') {
        filteredPosts = feedPosts.filter(p => p.kind === 'thought');
      } else if (contentType === 'reviews') {
        filteredPosts = feedPosts.filter(p => p.kind === 'review');
      }

      // Map to legacy format for compatibility with strict type requirements
      const mappedPosts = filteredPosts.map(post => ({
        ...post,
        type: post.kind as 'thought' | 'review',
        user: post.author || { id: post.author_id, handle: 'unknown', avatar_url: null },
        text: post.body || '',
        rating: post.rating_percent || 0,
        likes: post.likes_count || 0,
        dislikes: post.dislikes_count || 0,
        comments: post.replies_count || 0,
        userReaction: post.user_reaction || undefined,
        content: post.body || '',
      }));

      setPosts(mappedPosts);
    } catch (err) {
      console.error('Error loading feed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  return { posts, loading, error, refetch: loadFeed };
}
