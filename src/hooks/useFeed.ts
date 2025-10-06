import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
  rating: number | null;
  likes: number;
  dislikes: number;
  comments: number;
  rethinks: number;
  created_at: string;
  score?: number;
}

export function useFeed(tab: string) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFeed();
  }, [tab]);

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
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/feed-api?tab=${tab}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
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