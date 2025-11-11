import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import * as feedsApi from '@/api/feeds';

export type FeedType = 'trending' | 'hot-takes' | 'following' | 'videos';

interface Cursors {
  trending?: { score: number; id: string };
  'hot-takes'?: { controversy: number; id: string };
  following?: { created_at: string; id: string };
  videos?: { created_at: string; id: string };
}

export function useFeed(feedType: FeedType) {
  const [posts, setPosts] = useState<feedsApi.FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  
  const cursorsRef = useRef<Cursors>({});
  const lastFeedTypeRef = useRef<FeedType>(feedType);
  const loadTimerRef = useRef<NodeJS.Timeout>();

  // Reset when feed type changes
  useEffect(() => {
    if (lastFeedTypeRef.current !== feedType) {
      setPosts([]);
      cursorsRef.current = {};
      setReachedEnd(false);
      lastFeedTypeRef.current = feedType;
    }
  }, [feedType]);

  useEffect(() => {
    loadFeed();

    const channel = supabase
      .channel('feed-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        if (!cursorsRef.current[feedType]) {
          loadFeed();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_reactions' }, () => {
        if (!cursorsRef.current[feedType]) {
          loadFeed();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [feedType]);

  const loadFeed = useCallback(async () => {
    if (loadTimerRef.current) return;

    try {
      setLoading(true);
      setError(null);

      let result: { posts: feedsApi.FeedPost[]; nextCursor?: any };
      
      switch (feedType) {
        case 'following':
          result = await feedsApi.getFollowing();
          break;
        case 'trending':
          result = await feedsApi.getTrending();
          break;
        case 'hot-takes':
          result = await feedsApi.getHotTakes();
          break;
        case 'videos':
        default:
          result = await feedsApi.getVideos();
      }

      setPosts(result.posts);
      cursorsRef.current[feedType] = result.nextCursor;
      setReachedEnd(!result.nextCursor || result.posts.length < 20);
    } catch (err) {
      console.error('Error loading feed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  }, [feedType]);

  const loadMore = useCallback(async () => {
    if (loadingMore || reachedEnd || loading) return;

    // Debounce
    if (loadTimerRef.current) return;
    loadTimerRef.current = setTimeout(() => {
      loadTimerRef.current = undefined;
    }, 500);

    try {
      setLoadingMore(true);

      let result: { posts: feedsApi.FeedPost[]; nextCursor?: any };
      const cursor = cursorsRef.current[feedType];

      switch (feedType) {
        case 'following':
          result = await feedsApi.getFollowing(cursor as any);
          break;
        case 'trending':
          result = await feedsApi.getTrending(cursor as any);
          break;
        case 'hot-takes':
          result = await feedsApi.getHotTakes(cursor as any);
          break;
        case 'videos':
        default:
          result = await feedsApi.getVideos(cursor as any);
      }

      // Dedupe by id
      setPosts(prev => {
        const seen = new Set(prev.map(p => p.id));
        const newPosts = result.posts.filter(p => !seen.has(p.id));
        return [...prev, ...newPosts];
      });

      cursorsRef.current[feedType] = result.nextCursor;
      setReachedEnd(!result.nextCursor || result.posts.length < 20);
    } catch (err) {
      console.error('Error loading more:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [feedType, loadingMore, reachedEnd, loading]);

  return { posts, loading, loadingMore, error, reachedEnd, refetch: loadFeed, loadMore };
}
