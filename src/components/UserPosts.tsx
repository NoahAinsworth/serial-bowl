import { useState, useEffect } from 'react';
import { ThoughtCard } from '@/components/ThoughtCard';
import { ReviewCard } from '@/components/ReviewCard';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import * as feedsAPI from '@/api/feeds';

interface UserPostsProps {
  userId?: string;
}

export function UserPosts({ userId }: UserPostsProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadPosts();
    }
  }, [userId]);

  const loadPosts = async () => {
    if (!userId) return;

    try {
      // Use the new feed API to get user posts
      // For now, we'll use getNew and filter by user (not ideal, but works)
      // TODO: Add a getUserPosts function to the feeds API
      const allPosts = await feedsAPI.getNew({ limit: 100 });
      const userPosts = allPosts.filter(p => p.author_id === userId);

      // Map to legacy format
      const mappedPosts = userPosts.map(post => ({
        id: post.id,
        type: post.kind === 'thought' ? 'thought' : 'review',
        user: post.author || {
          id: post.author_id,
          handle: 'unknown',
          avatar_url: null,
        },
        content: post.kind === 'thought' ? post.body : '',
        text: post.body || '',
        rating: post.rating_percent || 0,
        likes: post.likes_count || 0,
        dislikes: post.dislikes_count || 0,
        comments: post.replies_count || 0,
        is_spoiler: post.is_spoiler,
        userReaction: post.user_reaction,
        created_at: post.created_at,
      }));

      setPosts(mappedPosts);
    } catch (err) {
      console.error('Error loading posts:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        No posts yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) =>
        post.type === 'thought' ? (
          <ThoughtCard
            key={post.id}
            thought={post}
            onReactionChange={loadPosts}
            onDelete={loadPosts}
          />
        ) : (
          <ReviewCard
            key={post.id}
            review={post}
            onDelete={loadPosts}
          />
        )
      )}
    </div>
  );
}
