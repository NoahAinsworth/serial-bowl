import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PostCard } from '@/components/PostCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface UserPostsProps {
  userId?: string;
}

export function UserPosts({ userId }: UserPostsProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      .neq('kind', 'rating') // Exclude rating-only posts from Posts tab
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
        <div key={post.id} className="relative">
          {/* Post Type Chip */}
          <div className="absolute top-4 right-4 z-10">
            {post.kind === 'thought' && (
              <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/50">
                Thought
              </Badge>
            )}
            {post.kind === 'review' && (
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50">
                Review
              </Badge>
            )}
            {post.kind === 'rating' && (
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-300 border-amber-500/50">
                Rating
              </Badge>
            )}
          </div>
          <PostCard post={post} userHideSpoilers={false} strictSafety={false} />
        </div>
      ))}
    </div>
  );
}
