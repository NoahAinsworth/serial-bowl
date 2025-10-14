import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import * as feedsApi from '@/api/feeds';

interface FeedPost {
  id: string;
  kind: 'thought' | 'review' | 'rating';
  user: {
    id: string;
    handle: string;
    avatar_url: string | null;
  };
  body: string | null;
  item_type: string | null;
  item_id: string | null;
  rating_percent: number | null;
  is_spoiler: boolean;
  has_spoilers: boolean;
  has_mature: boolean;
  likes_count: number;
  dislikes_count: number;
  replies_count: number;
  reshares_count: number;
  userReaction?: 'like' | 'dislike';
  created_at: string;
}

export function useFeed(feedType: string, contentType: string = 'all') {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFeed();

    // Subscribe to real-time updates on posts table
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

      // Fetch posts using database feed functions
      let rawPosts: any[] = [];
      
      switch (feedType) {
        case 'following':
          rawPosts = await feedsApi.getFollowing();
          break;
        case 'trending':
          rawPosts = await feedsApi.getTrending();
          break;
        case 'hot-takes':
          rawPosts = await feedsApi.getHotTakes();
          break;
        case 'new':
          rawPosts = await feedsApi.getNew();
          break;
        case 'for-you':
        default:
          rawPosts = await feedsApi.getForYou();
      }

      // Get user data and check reactions for each post
      const { data: { user } } = await supabase.auth.getUser();
      
      const transformedPosts: FeedPost[] = await Promise.all(
        rawPosts.map(async (post) => {
          // Get user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, handle, avatar_url')
            .eq('id', post.author_id)
            .maybeSingle();

          // Check user's reaction
          let userReaction: 'like' | 'dislike' | undefined;
          if (user) {
            const { data: reaction } = await supabase
              .from('post_reactions' as any)
              .select('kind')
              .eq('post_id', post.id)
              .eq('user_id', user.id)
              .maybeSingle() as any;
            
            if (reaction) {
              userReaction = reaction.kind as 'like' | 'dislike';
            }
          }

          return {
            id: post.id,
            kind: post.kind,
            user: profile || { id: post.author_id, handle: 'Unknown', avatar_url: null },
            body: post.body,
            item_type: post.item_type,
            item_id: post.item_id,
            rating_percent: post.rating_percent,
            is_spoiler: post.is_spoiler || false,
            has_spoilers: post.has_spoilers || false,
            has_mature: post.has_mature || false,
            likes_count: post.likes_count || 0,
            dislikes_count: post.dislikes_count || 0,
            replies_count: post.replies_count || 0,
            reshares_count: post.reshares_count || 0,
            userReaction,
            created_at: post.created_at,
          };
        })
      );

      // Filter by content type if needed
      let filtered = transformedPosts;
      if (contentType === 'thoughts') {
        filtered = transformedPosts.filter(p => p.kind === 'thought');
      } else if (contentType === 'reviews') {
        filtered = transformedPosts.filter(p => p.kind === 'review');
      }

      setPosts(filtered);
    } catch (err) {
      console.error('Error loading feed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  return { posts, loading, error, refetch: loadFeed };
}
