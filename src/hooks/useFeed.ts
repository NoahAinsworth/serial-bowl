import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import * as feedsAPI from '@/api/feeds';

// Legacy format for compatibility with existing card components  
interface LegacyFeedPost {
  id: string;
  type: 'thought' | 'review';
  user: {
    id: string;
    handle: string;
    avatar_url?: string | null;
  };
  content: string;
  text: string;
  rating: number;
  likes: number;
  dislikes: number;
  comments: number;
  is_spoiler?: boolean;
  contains_mature?: boolean;
  userReaction?: 'like' | 'dislike';
  created_at: string;
}

export function useFeed(feedType: 'for-you' | 'following' | 'trending' | 'hot-takes', contentType: string = 'all') {
  const [posts, setPosts] = useState<LegacyFeedPost[]>([]);
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

      // Map to strict legacy format for compatibility
      const mappedPosts: LegacyFeedPost[] = filteredPosts.map(post => ({
        id: post.id,
        type: post.kind as 'thought' | 'review',
        user: post.author || { 
          id: post.author_id, 
          handle: 'unknown', 
          avatar_url: null 
        },
        content: post.body || '',
        text: post.body || '',
        rating: post.rating_percent || 0,
        likes: post.likes_count || 0,
        dislikes: post.dislikes_count || 0,
        comments: post.replies_count || 0,
        is_spoiler: (post as any).has_spoilers || post.is_spoiler || false,
        contains_mature: (post as any).has_mature || false,
        userReaction: post.user_reaction || undefined,
        created_at: post.created_at,
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
