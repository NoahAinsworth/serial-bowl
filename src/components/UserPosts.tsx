import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PostCard } from '@/components/PostCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

interface UserPostsProps {
  userId?: string;
}

export function UserPosts({ userId }: UserPostsProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userHideSpoilers, setUserHideSpoilers] = useState(true);

  // Load user's spoiler settings
  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.settings) {
            const settings = data.settings as any;
            setUserHideSpoilers(settings?.safety?.hide_spoilers ?? true);
            setStrictSafety(settings?.safety?.strict_safety ?? false);
          }
        });
    }
  }, [user]);

  const [strictSafety, setStrictSafety] = useState(false);

  useEffect(() => {
    if (userId) {
      loadPosts();
    }
  }, [userId]);

  const loadPosts = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_author_id_fkey(id, handle, avatar_url)
      `)
      .eq('author_id', userId)
      .is('deleted_at', null)
      .neq('kind', 'rating') // Exclude rating-only posts, show reviews and thoughts
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setPosts(data);
    }
    
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No posts yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard 
          key={post.id}
          post={{
            ...post,
            user: post.author // Map author to user for PostCard compatibility
          }} 
          userHideSpoilers={userHideSpoilers} 
          strictSafety={strictSafety}
          onDelete={loadPosts}
          onReactionChange={loadPosts}
        />
      ))}
    </div>
  );
}
