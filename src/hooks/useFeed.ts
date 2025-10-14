import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import * as feedsApi from '@/api/feeds';

interface FeedPost {
  id: string;
  type: 'thought' | 'review';
  user: {
    id: string;
    handle: string;
    avatar_url: string | null;
  };
  content: any;
  text: string;
  is_spoiler?: boolean;
  contains_mature?: boolean;
  mature_reasons?: string[];
  visibility?: string;
  rating: number | null;
  likes: number;
  dislikes: number;
  comments: number;
  rethinks: number;
  userReaction?: 'like' | 'dislike';
  created_at: string;
  score?: number;
}

export function useFeed(feedType: string, contentType: string = 'all') {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFeed();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('feed-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'thoughts'
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
          table: 'reviews'
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
          table: 'reactions'
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
          table: 'comments'
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

      // Use new client-side API
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
          rawPosts = await feedsApi.getForYou();
          break;
        default:
          rawPosts = await feedsApi.getNew();
      }

      // Transform to FeedPost format
      const transformedPosts: FeedPost[] = await Promise.all(
        rawPosts.map(async (post) => {
          // Get user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, handle, avatar_url')
            .eq('id', post.user_id)
            .maybeSingle();

          let likes = 0;
          let dislikes = 0;

          // Count reactions based on post type
          if (post.type === 'thought') {
            const { data: likesData } = await supabase
              .from('reactions')
              .select('id', { count: 'exact', head: true })
              .eq('thought_id', post.id)
              .eq('reaction_type', 'like');
            
            const { data: dislikesData } = await supabase
              .from('thought_dislikes')
              .select('id', { count: 'exact', head: true })
              .eq('thought_id', post.id);

            likes = likesData?.length || 0;
            dislikes = dislikesData?.length || 0;
          } else {
            const { data: likesData } = await supabase
              .from('review_likes')
              .select('id', { count: 'exact', head: true })
              .eq('review_id', post.id);
            
            const { data: dislikesData } = await supabase
              .from('review_dislikes')
              .select('id', { count: 'exact', head: true })
              .eq('review_id', post.id);

            likes = likesData?.length || 0;
            dislikes = dislikesData?.length || 0;
          }

          // Count comments
          const { count: commentsCount } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('thought_id', post.id);

          return {
            id: post.id,
            type: post.type,
            user: profile || { id: post.user_id, handle: 'Unknown', avatar_url: null },
            content: post,
            text: post.type === 'thought' ? post.text_content : post.review_text,
            is_spoiler: post.is_spoiler,
            contains_mature: post.contains_mature,
            rating: post.type === 'review' ? post.rating : null,
            likes,
            dislikes,
            comments: commentsCount || 0,
            rethinks: 0,
            created_at: post.created_at,
          };
        })
      );

      // Filter by content type
      let filtered = transformedPosts;
      if (contentType === 'thoughts') {
        filtered = transformedPosts.filter(p => p.type === 'thought');
      } else if (contentType === 'reviews') {
        filtered = transformedPosts.filter(p => p.type === 'review');
      }

      console.log(`Setting ${filtered.length} posts for ${feedType}`);
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
