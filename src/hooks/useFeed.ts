import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';

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

      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(
        `${env.SUPABASE_URL}/functions/v1/feed-api?tab=${feedType}&contentType=${contentType}`,
        { 
          headers,
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Feed response for ${feedType}:`, data);
      console.log(`Setting ${data.posts?.length || 0} posts`);
      setPosts(data.posts || []);
    } catch (err) {
      console.error('Error loading feed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  return { posts, loading, error, refetch: loadFeed };
}
